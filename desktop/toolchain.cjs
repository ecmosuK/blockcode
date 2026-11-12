'use strict';

const { net } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');

const TOOLCHAIN_ID = 'esp-idf-6.1-esp32s3';
const IDF_VERSION = '6.1';
const TARGET = 'esp32s3';
const GIB = 1024 ** 3;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(0)} KB`;
  if (value < GIB) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / GIB).toFixed(2)} GB`;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

async function removeFile(filePath) {
  try {
    await fsp.rm(filePath, { force: true });
  } catch {
    /* best effort */
  }
}

async function removeTree(target) {
  if (!fs.existsSync(target)) return;
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await fsp.rm(target, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await delay(300);
    }
  }
  throw lastError;
}

function safeReaddir(directory) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function getFreeBytes(directory) {
  try {
    const stats = fs.statfsSync(directory);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch {
    return null;
  }
}

function abortError() {
  const error = new Error('Watch build tool setup was cancelled.');
  error.name = 'AbortError';
  error.cancelled = true;
  return error;
}

function cancelledError() {
  const error = new Error('Watch build tool setup was cancelled. Choose Retry setup to continue.');
  error.name = 'AbortError';
  error.cancelled = true;
  return error;
}

function isAbortError(error) {
  return Boolean(error) && (error.name === 'AbortError' || error.cancelled === true);
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const handle = await fsp.open(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let position = 0;
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    return { sha256: hash.digest('hex'), size: position };
  } finally {
    await handle.close();
  }
}

function killProcessTree(child) {
  if (!child || child.killed || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    try {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore'
      });
      killer.once('error', () => {
        try {
          child.kill();
        } catch {
          /* best effort */
        }
      });
    } catch {
      try {
        child.kill();
      } catch {
        /* best effort */
      }
    }
    return;
  }
  try {
    child.kill('SIGKILL');
  } catch {
    /* best effort */
  }
}

function runProcess(file, args, options = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    if (options.timeoutMs) {
      timer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* best effort */
        }
      }, options.timeoutMs);
    }
    child.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });
    child.once('error', (error) => {
      finish({ code: -1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.once('exit', (code, signal) => {
      finish({ code, signal, stdout, stderr });
    });
  });
}

function findLatestDirectory(root) {
  const entries = safeReaddir(root).filter((entry) => entry.isDirectory());
  if (!entries.length) return null;
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return path.join(root, entries[entries.length - 1].name);
}

function findVersionedFile(toolsPath, toolName, relativeParts, fileName) {
  const root = path.join(toolsPath, toolName);
  if (!fs.existsSync(root)) return null;

  const direct = path.join(root, ...relativeParts, fileName);
  if (fs.existsSync(direct)) return direct;

  const versions = safeReaddir(root).filter((entry) => entry.isDirectory());
  versions.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (let index = versions.length - 1; index >= 0; index -= 1) {
    const candidate = path.join(root, versions[index].name, ...relativeParts, fileName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function findBuildTools(toolsPath) {
  const xtensaGcc = findVersionedFile(
    toolsPath,
    'xtensa-esp-elf',
    ['xtensa-esp-elf', 'bin'],
    'xtensa-esp32s3-elf-gcc.exe'
  );
  const cmake = findVersionedFile(toolsPath, 'cmake', ['bin'], 'cmake.exe');
  const ninja = findVersionedFile(toolsPath, 'ninja', [], 'ninja.exe');
  const ccache = findVersionedFile(toolsPath, 'ccache', [], 'ccache.exe');
  const espRomElfDir = findLatestDirectory(path.join(toolsPath, 'esp-rom-elfs'));
  return { xtensaGcc, cmake, ninja, ccache, espRomElfDir };
}

function resolvePythonPath(pythonValue, toolsPath) {
  const candidates = [];

  if (pythonValue) {
    const resolved = path.resolve(String(pythonValue));
    if (resolved.toLowerCase().endsWith('.exe')) {
      candidates.push({ pythonPath: resolved, envPath: path.dirname(path.dirname(resolved)) });
    } else {
      candidates.push({ envPath: resolved, pythonPath: path.join(resolved, 'Scripts', 'python.exe') });
    }
  }

  const roots = [path.join(toolsPath, 'python'), path.join(toolsPath, 'python_env')];
  for (const root of roots) {
    for (const entry of safeReaddir(root)) {
      if (!entry.isDirectory()) continue;
      const versionDirectory = path.join(root, entry.name);
      candidates.push({
        envPath: path.join(versionDirectory, 'venv'),
        pythonPath: path.join(versionDirectory, 'venv', 'Scripts', 'python.exe')
      });
      candidates.push({
        envPath: versionDirectory,
        pythonPath: path.join(versionDirectory, 'Scripts', 'python.exe')
      });
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.pythonPath)) return candidate;
  }
  return null;
}

function findIdfPath(toolchainRoot) {
  const directCandidates = [
    path.join(toolchainRoot, 'v6.1', 'esp-idf'),
    path.join(toolchainRoot, 'esp-idf')
  ];
  for (const candidate of directCandidates) {
    if (fs.existsSync(path.join(candidate, 'tools', 'idf.py'))) return candidate;
  }
  for (const entry of safeReaddir(toolchainRoot)) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(toolchainRoot, entry.name, 'esp-idf');
    if (fs.existsSync(path.join(candidate, 'tools', 'idf.py'))) return candidate;
  }
  return null;
}

class ToolchainManager {
  constructor({ resourcesRoot, appRoot, manifestPath, onStatus }) {
    this.resourcesRoot = resourcesRoot;
    this.appRoot = appRoot;
    this.pinnedManifestPath = manifestPath;
    this.onStatus = typeof onStatus === 'function' ? onStatus : () => {};

    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    this.managedRoot = path.join(localAppData, 'BlockCode');
    this.toolchainRoot = path.join(this.managedRoot, 'toolchains', TOOLCHAIN_ID);
    this.downloadRoot = path.join(this.managedRoot, 'downloads');
    this.environmentPath = path.join(this.managedRoot, 'build-environment.json');
    this.statePath = path.join(this.managedRoot, 'toolchain-state.json');
    this.logPath = path.join(this.managedRoot, 'toolchain.log');

    this.current = null;
    this.abortController = null;
    this.child = null;
    this.cancelled = false;
    this.status = {
      phase: 'idle',
      message: '',
      percent: null,
      setup: true,
      canCancel: false,
      canRetry: false
    };
  }

  getPaths() {
    return {
      toolchainId: TOOLCHAIN_ID,
      managedRoot: this.managedRoot,
      toolchainRoot: this.toolchainRoot,
      downloadRoot: this.downloadRoot,
      environmentPath: this.environmentPath,
      logPath: this.logPath
    };
  }

  getStatus() {
    return { ...this.status, ...this.getPaths() };
  }

  setStatus(patch) {
    this.status = {
      ...this.status,
      ...patch,
      setup: true,
      updatedAt: new Date().toISOString()
    };
    try {
      this.onStatus(this.getStatus());
    } catch {
      /* the window may be closing */
    }
    return this.status;
  }

  readPinnedManifest() {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(this.pinnedManifestPath, 'utf8'));
    } catch (error) {
      throw new Error(
        `The bundled watch toolchain manifest is missing or invalid (${this.pinnedManifestPath}): ${error.message}`
      );
    }
    if (!manifest || manifest.schemaVersion !== 1 || manifest.toolchainId !== TOOLCHAIN_ID ||
        manifest.idfVersion !== IDF_VERSION || manifest.target !== TARGET ||
        !manifest.archive || typeof manifest.archive.url !== 'string' ||
        !manifest.eim || typeof manifest.eim.url !== 'string') {
      throw new Error('The bundled watch toolchain manifest is incomplete. Reinstall BlockCode.');
    }
    return manifest;
  }

  readEnvironment() {
    const manifest = readJson(this.environmentPath);
    if (!manifest || manifest.schemaVersion !== 2 || manifest.toolchainId !== TOOLCHAIN_ID ||
        manifest.idfVersion !== IDF_VERSION || manifest.target !== TARGET) {
      return null;
    }
    if (typeof manifest.idfPath !== 'string' || typeof manifest.toolsPath !== 'string' ||
        typeof manifest.pythonEnvPath !== 'string' || typeof manifest.pythonPath !== 'string') {
      return null;
    }
    if (!fs.existsSync(path.join(manifest.idfPath, 'tools', 'idf.py'))) return null;
    if (!fs.existsSync(manifest.pythonPath)) return null;
    if (!fs.existsSync(manifest.toolsPath)) return null;
    return manifest;
  }

  isReady() {
    return this.readEnvironment() !== null;
  }

  ensure(options = {}) {
    const existing = this.readEnvironment();
    if (existing) {
      if (this.status.phase !== 'ready') {
        const readyStatus = {
          phase: 'ready',
          message: 'Watch build tools are ready.',
          percent: 100,
          canCancel: false,
          canRetry: false,
          error: null
        };
        if (options.quiet) {
          this.status = {
            ...this.status,
            ...readyStatus,
            setup: true,
            updatedAt: new Date().toISOString()
          };
        } else {
          this.setStatus(readyStatus);
        }
      }
      return Promise.resolve(existing);
    }

    if (this.current) return this.current;

    this.cancelled = false;
    this.abortController = new AbortController();
    const promise = this.run(options).finally(() => {
      if (this.current === promise) this.current = null;
      this.abortController = null;
      this.child = null;
    });
    this.current = promise;
    return promise;
  }

  retry() {
    this.cancelled = false;
    return this.ensure({ reason: 'retry' });
  }

  cancel() {
    if (!this.current) return false;
    this.cancelled = true;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        /* best effort */
      }
    }
    if (this.child) killProcessTree(this.child);
    this.setStatus({
      phase: 'cancelled',
      message: 'Watch build tool setup was cancelled. Choose Retry setup to continue.',
      percent: null,
      canCancel: false,
      canRetry: true,
      error: null
    });
    return true;
  }

  async repair() {
    if (this.current) {
      this.cancel();
      try {
        await this.current;
      } catch {
        /* the cancelled setup is expected to fail */
      }
    }

    this.cancelled = false;
    this.setStatus({
      phase: 'checking',
      message: 'Removing the installed watch build tools…',
      percent: null,
      canCancel: true,
      canRetry: false,
      error: null
    });
    await removeTree(this.toolchainRoot);
    await removeFile(this.environmentPath);
    await removeFile(this.statePath);
    return this.ensure({ reason: 'repair' });
  }

  async run({ reason = 'manual' } = {}) {
    try {
      this.setStatus({
        phase: 'checking',
        message: 'Checking watch build tools…',
        percent: null,
        canCancel: true,
        canRetry: false,
        error: null,
        reason
      });

      const pinned = this.readPinnedManifest();
      const archive = await this.prepareArchive(pinned);
      if (this.cancelled) throw abortError();

      const eimCli = await this.prepareEimCli(pinned);
      if (this.cancelled) throw abortError();

      await this.installArchive(pinned, archive, eimCli);
      if (this.cancelled) throw abortError();

      this.setStatus({
        phase: 'validating',
        message: 'Checking the installed build tools…',
        percent: null,
        canCancel: false,
        canRetry: false
      });
      const environment = await this.resolveAndValidate(pinned);
      writeJsonAtomic(this.environmentPath, environment);

      if (archive.downloaded && process.env.BLOCKCODE_KEEP_TOOLCHAIN_ARCHIVE !== '1') {
        await removeFile(archive.path);
      }

      writeJsonAtomic(this.statePath, {
        schemaVersion: 1,
        toolchainId: TOOLCHAIN_ID,
        installedAt: environment.installedAt,
        archiveSha256: archive.sha256,
        archiveUrl: pinned.archive.url,
        eimVersion: pinned.eim.version || null,
        environment
      });

      this.setStatus({
        phase: 'ready',
        message: 'Watch build tools are ready.',
        percent: 100,
        canCancel: false,
        canRetry: false,
        error: null
      });
      return environment;
    } catch (error) {
      if (this.cancelled || isAbortError(error)) {
        const cancelled = cancelledError();
        this.setStatus({
          phase: 'cancelled',
          message: cancelled.message,
          percent: null,
          canCancel: false,
          canRetry: true,
          error: null
        });
        throw cancelled;
      }
      const message = error && error.message ? error.message : String(error);
      this.setStatus({
        phase: 'error',
        message,
        percent: null,
        canCancel: false,
        canRetry: true,
        error: message
      });
      throw error;
    }
  }

  async prepareArchive(pinned) {
    const override = process.env.BLOCKCODE_TOOLCHAIN_ARCHIVE;
    if (override) {
      const archivePath = path.resolve(override);
      if (!fs.existsSync(archivePath)) {
        throw new Error(`BLOCKCODE_TOOLCHAIN_ARCHIVE does not exist: ${archivePath}`);
      }
      this.setStatus({ phase: 'verifying', message: 'Verifying the local toolchain archive…', percent: null });
      const info = await hashFile(archivePath);
      const expected = pinned.archive.sha256;
      if (expected && info.sha256 !== String(expected).toLowerCase()) {
        throw new Error('The toolchain archive at BLOCKCODE_TOOLCHAIN_ARCHIVE failed its integrity check.');
      }
      return { path: archivePath, sha256: info.sha256, downloaded: false };
    }

    fs.mkdirSync(this.downloadRoot, { recursive: true });
    const archiveName = path.basename(new URL(pinned.archive.url).pathname) || `${TOOLCHAIN_ID}.zst`;
    const destination = path.join(this.downloadRoot, archiveName);

    if (fs.existsSync(destination)) {
      const stats = await fsp.stat(destination);
      const sizeMatches = !pinned.archive.size || stats.size === Number(pinned.archive.size);
      if (sizeMatches) {
        this.setStatus({ phase: 'verifying', message: 'Verifying the downloaded toolchain…', percent: null });
        const info = await hashFile(destination);
        const hashMatches = !pinned.archive.sha256 || info.sha256 === String(pinned.archive.sha256).toLowerCase();
        if (hashMatches) {
          return { path: destination, sha256: info.sha256, downloaded: false };
        }
      }
      await removeFile(destination);
    }

    this.checkDiskSpace(pinned.archive.size);
    const info = await this.downloadFile({
      url: pinned.archive.url,
      destination,
      expectedSize: pinned.archive.size,
      expectedSha256: pinned.archive.sha256,
      label: 'ESP-IDF 6.1 and ESP32-S3 tools'
    });
    return { path: destination, sha256: info.sha256, downloaded: true };
  }

  checkDiskSpace(size) {
    fs.mkdirSync(this.downloadRoot, { recursive: true });
    const free = getFreeBytes(this.downloadRoot);
    if (free == null) return;
    const required = Number(size || 0) * 3 + 4 * GIB;
    if (free < required) {
      throw new Error(
        'Not enough disk space for the watch build tools. ' +
        `About ${formatBytes(required)} free is needed on ${path.parse(this.downloadRoot).root}; ` +
        `only ${formatBytes(free)} is available. Free some space and choose Retry setup.`
      );
    }
  }

  async prepareEimCli(pinned) {
    const candidates = [
      path.join(this.resourcesRoot, 'blockcode-build-service', 'eim-cli.exe'),
      path.join(this.resourcesRoot, 'eim-cli.exe'),
      path.join(this.appRoot, 'tools', 'eim-cli.exe')
    ];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      const info = await hashFile(candidate);
      if (!pinned.eim.sha256 || info.sha256 === String(pinned.eim.sha256).toLowerCase()) {
        return candidate;
      }
    }

    const toolsRoot = path.join(this.managedRoot, 'tools');
    fs.mkdirSync(toolsRoot, { recursive: true });
    const destination = path.join(toolsRoot, `eim-cli-${pinned.eim.version || 'pinned'}.exe`);
    if (fs.existsSync(destination)) {
      const info = await hashFile(destination);
      if (!pinned.eim.sha256 || info.sha256 === String(pinned.eim.sha256).toLowerCase()) {
        return destination;
      }
      await removeFile(destination);
    }

    this.checkDiskSpace(pinned.eim.size || 0);
    await this.downloadFile({
      url: pinned.eim.url,
      destination,
      expectedSize: pinned.eim.size,
      expectedSha256: pinned.eim.sha256,
      label: 'the ESP-IDF installer'
    });
    return destination;
  }

  async downloadFile({ url, destination, expectedSize, expectedSha256, label }) {
    const partPath = `${destination}.part`;
    await removeFile(partPath);

    const signal = this.abortController ? this.abortController.signal : undefined;
    const total = Number(expectedSize) || 0;
    this.setStatus({
      phase: 'downloading',
      message: `Downloading ${label}…`,
      percent: 0,
      bytesReceived: 0,
      bytesTotal: total || null,
      canCancel: true,
      canRetry: false,
      error: null
    });

    let response;
    try {
      response = await net.fetch(url, { signal, redirect: 'follow' });
    } catch (error) {
      if (this.cancelled || isAbortError(error)) throw abortError();
      throw new Error(`Could not download ${label}: ${error.message || error}`);
    }
    if (!response.ok || !response.body) {
      throw new Error(`Could not download ${label}: the server returned HTTP ${response.status}.`);
    }

    const contentLength = Number(response.headers.get('content-length')) || total;
    const hash = crypto.createHash('sha256');
    let received = 0;
    let lastUpdate = 0;
    const handle = await fsp.open(partPath, 'w');

    try {
      for await (const chunk of Readable.fromWeb(response.body)) {
        if (this.cancelled || (signal && signal.aborted)) throw abortError();
        const buffer = Buffer.from(chunk);
        hash.update(buffer);
        let offset = 0;
        while (offset < buffer.length) {
          const { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset);
          offset += bytesWritten;
        }
        received += buffer.length;

        const now = Date.now();
        if (now - lastUpdate > 200) {
          lastUpdate = now;
          const percent = contentLength
            ? Math.min(99, Math.floor((received / contentLength) * 100))
            : null;
          this.setStatus({
            phase: 'downloading',
            message: `Downloading ${label}… ${formatBytes(received)}` +
              (contentLength ? ` of ${formatBytes(contentLength)}` : ''),
            percent,
            bytesReceived: received,
            bytesTotal: contentLength || null
          });
        }
      }
    } catch (error) {
      await handle.close().catch(() => {});
      await removeFile(partPath);
      if (this.cancelled || isAbortError(error)) throw abortError();
      throw new Error(`The download of ${label} failed: ${error.message || error}`);
    }

    await handle.close();
    const sha256 = hash.digest('hex');

    if (expectedSize && received !== Number(expectedSize)) {
      await removeFile(partPath);
      throw new Error(
        `The download of ${label} is incomplete (${formatBytes(received)} of ${formatBytes(expectedSize)}). ` +
        'Check your internet connection and choose Retry setup.'
      );
    }
    if (expectedSha256 && sha256 !== String(expectedSha256).toLowerCase()) {
      await removeFile(partPath);
      throw new Error(`The downloaded ${label} archive failed its integrity check. Choose Retry setup.`);
    }

    await fsp.rename(partPath, destination);
    this.setStatus({
      phase: 'verifying',
      message: `Verified ${label}.`,
      percent: 100,
      bytesReceived: received,
      bytesTotal: contentLength || received
    });
    return { sha256, size: received };
  }

  async installArchive(pinned, archive, eimCli) {
    this.setStatus({
      phase: 'installing',
      message: 'Installing ESP-IDF 6.1 and the ESP32-S3 build tools… This can take several minutes.',
      percent: null,
      canCancel: true,
      canRetry: false,
      error: null
    });

    await removeTree(this.toolchainRoot);
    fs.mkdirSync(this.toolchainRoot, { recursive: true });
    fs.mkdirSync(this.managedRoot, { recursive: true });

    const toolsRoot = path.join(this.toolchainRoot, 'tools');
    const distRoot = path.join(this.toolchainRoot, 'dist');
    fs.mkdirSync(toolsRoot, { recursive: true });
    fs.mkdirSync(distRoot, { recursive: true });

    const args = [
      'install',
      '--path', this.toolchainRoot,
      '--tool-install-folder-name', toolsRoot,
      '--tool-download-folder-name', distRoot,
      '--esp-idf-json-path', toolsRoot,
      '--activation-script-path-override', toolsRoot,
      '--use-local-archive', archive.path,
      '--target', TARGET,
      '--non-interactive', 'true',
      '--install-all-prerequisites', 'true',
      '--cleanup', 'true',
      '--do-not-track', 'true',
      '--create-bat-activation-script', 'true',
      '--log-file', this.logPath
    ];

    const logStream = fs.createWriteStream(this.logPath, { flags: 'w' });
    let tail = '';
    let lastMessageAt = 0;

    const child = spawn(eimCli, args, {
      cwd: this.toolchainRoot,
      env: { ...process.env, PYTHONUTF8: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    this.child = child;

    const onOutput = (data) => {
      const text = data.toString('utf8');
      logStream.write(text);
      tail = (tail + text).slice(-12000);
      const now = Date.now();
      if (now - lastMessageAt < 350) return;
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last) return;
      lastMessageAt = now;
      this.setStatus({
        phase: 'installing',
        message: `Installing watch build tools… ${last.slice(0, 180)}`
      });
    };
    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);

    const result = await new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      child.once('error', (error) => finish({ code: -1, error }));
      child.once('exit', (code, signal) => finish({ code, signal }));
    });

    logStream.end();
    this.child = null;

    if (this.cancelled) throw abortError();
    if (result.error) {
      throw new Error(`Could not start the ESP-IDF installer: ${result.error.message}`);
    }
    if (result.code !== 0) {
      const detail = tail.trim().split(/\r?\n/).slice(-14).join('\n');
      throw new Error(
        `The ESP-IDF installer failed (exit ${result.code ?? result.signal}).` +
        (detail ? `\n\n${detail}` : '') +
        `\n\nSetup details: ${this.logPath}`
      );
    }
  }

  async resolveAndValidate(pinned) {
    const candidates = [
      path.join(this.toolchainRoot, 'tools', 'eim_idf.json'),
      path.join(this.toolchainRoot, 'eim_idf.json'),
      path.join(this.managedRoot, 'eim_idf.json')
    ];

    let eimConfig = null;
    for (const candidate of candidates) {
      eimConfig = readJson(candidate);
      if (eimConfig) break;
    }

    const installations = Array.isArray(eimConfig && eimConfig.idfInstalled)
      ? eimConfig.idfInstalled
      : [];
    const hasIdf = (entry) => fs.existsSync(path.join(String(entry.path || ''), 'tools', 'idf.py'));

    let installation = installations.find((entry) => {
      const idfPath = String(entry.path || '');
      return /(^|[\\/])v?6\.1([\\/]|$)/.test(idfPath) && hasIdf(entry);
    });
    if (!installation) installation = installations.find(hasIdf);

    if (!installation) {
      const fallbackIdfPath = findIdfPath(this.toolchainRoot);
      if (!fallbackIdfPath) {
        throw new Error(
          'The ESP-IDF installer finished, but ESP-IDF 6.1 was not found in the toolchain folder. ' +
          'Choose Retry setup or Repair build tools.'
        );
      }
      installation = {
        path: fallbackIdfPath,
        idfToolsPath: path.join(this.toolchainRoot, 'tools')
      };
    }

    const idfPath = path.resolve(String(installation.path));
    const toolsPath = path.resolve(String(installation.idfToolsPath || path.join(this.toolchainRoot, 'tools')));
    const python = resolvePythonPath(installation.python, toolsPath);
    if (!python) {
      throw new Error(
        'The ESP-IDF installer finished, but its Python environment was not found. ' +
        'Choose Retry setup or Repair build tools.'
      );
    }

    const environment = {
      schemaVersion: 2,
      toolchainId: TOOLCHAIN_ID,
      toolchainVersion: pinned.toolchainVersion || `${IDF_VERSION}-${TARGET}-1`,
      idfVersion: IDF_VERSION,
      target: TARGET,
      idfPath,
      toolsPath,
      pythonEnvPath: python.envPath,
      pythonPath: python.pythonPath,
      activationScript: installation.activationScript || null,
      archiveSha256: pinned.archive.sha256 ? String(pinned.archive.sha256).toLowerCase() : null,
      installedAt: new Date().toISOString()
    };

    await this.validateEnvironment(environment);
    return environment;
  }

  async validateEnvironment(environment) {
    if (!fs.existsSync(path.join(environment.idfPath, 'tools', 'idf.py'))) {
      throw new Error('The installed ESP-IDF 6.1 files are incomplete. Choose Repair build tools.');
    }
    if (!fs.existsSync(environment.pythonPath)) {
      throw new Error('The installed ESP-IDF Python environment is incomplete. Choose Repair build tools.');
    }

    const tools = findBuildTools(environment.toolsPath);
    if (!tools.xtensaGcc) {
      throw new Error(
        'The ESP32-S3 compiler (xtensa-esp32s3-elf-gcc) was not installed. ' +
        'Choose Retry setup or Repair build tools.'
      );
    }
    if (!tools.cmake) {
      throw new Error('CMake was not installed with the watch build tools. Choose Repair build tools.');
    }
    if (!tools.ninja) {
      throw new Error('Ninja was not installed with the watch build tools. Choose Repair build tools.');
    }

    environment.xtensaGccPath = tools.xtensaGcc;
    environment.cmakePath = tools.cmake;
    environment.ninjaPath = tools.ninja;
    environment.ccachePath = tools.ccache || null;
    environment.espRomElfDir = tools.espRomElfDir || null;

    const serialCheck = await runProcess(
      environment.pythonPath,
      ['-c', 'import serial; print(serial.VERSION)'],
      { env: this.buildEnvironmentVars(environment), timeoutMs: 60000 }
    );
    if (serialCheck.code !== 0) {
      throw new Error(
        'The installed Python environment is missing pyserial, which is needed to list and upload to the watch. ' +
        'Choose Repair build tools.'
      );
    }
  }

  buildEnvironmentVars(environment) {
    const pathParts = [];
    const add = (directory) => {
      if (directory && fs.existsSync(directory)) pathParts.push(directory);
    };

    add(environment.xtensaGccPath ? path.dirname(environment.xtensaGccPath) : null);
    add(environment.cmakePath ? path.dirname(environment.cmakePath) : null);
    add(environment.ninjaPath ? path.dirname(environment.ninjaPath) : null);
    add(environment.ccachePath ? path.dirname(environment.ccachePath) : null);
    add(path.join(environment.pythonEnvPath, 'Scripts'));
    add(path.join(environment.toolsPath, 'idf-exe'));

    const env = {
      ...process.env,
      PATH: [...new Set(pathParts), process.env.PATH || ''].filter(Boolean).join(path.delimiter),
      IDF_PATH: environment.idfPath,
      IDF_TOOLS_PATH: environment.toolsPath,
      IDF_PYTHON_ENV_PATH: environment.pythonEnvPath,
      ESP_IDF_VERSION: environment.idfVersion || IDF_VERSION,
      PYTHONUTF8: '1',
      IDF_CCACHE_ENABLE: '1'
    };
    if (environment.espRomElfDir) env.ESP_ROM_ELF_DIR = environment.espRomElfDir;
    return env;
  }

  getBuildEnvironment(environment) {
    return {
      python: environment.pythonPath,
      env: this.buildEnvironmentVars(environment),
      toolchainId: environment.toolchainId,
      idfPath: environment.idfPath,
      toolsPath: environment.toolsPath,
      pythonEnvPath: environment.pythonEnvPath
    };
  }
}

module.exports = {
  ToolchainManager,
  TOOLCHAIN_ID,
  IDF_VERSION,
  TARGET,
  formatBytes,
  killProcessTree
};
