const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { ToolchainManager, killProcessTree } = require('./toolchain.cjs');

app.setName('BlockCode');

const appRoot = path.resolve(app.getAppPath());
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

let server;
let mainWindow;
let buildServiceProcess;
let buildServiceStarting;
let appUrl;
let currentProjectPath;
let updateState = { status: 'idle' };
let updateAvailable = false;
let updateDownloaded = false;

const MAX_PROJECT_BYTES = 64 * 1024 * 1024;

const toolchainManifestPath = app.isPackaged
  ? path.join(process.resourcesPath, 'toolchain-manifest.json')
  : path.join(appRoot, 'tools', 'toolchain-manifest.json');
const toolchainResourcesRoot = app.isPackaged ? process.resourcesPath : appRoot;

const toolchain = new ToolchainManager({
  resourcesRoot: toolchainResourcesRoot,
  appRoot,
  manifestPath: toolchainManifestPath,
  onStatus: publishToolchainStatus
});

function isAppFrame(event) {
  return event.senderFrame === event.sender.mainFrame &&
    appUrl && event.senderFrame.url.startsWith(appUrl);
}

function startStaticServer() {
  server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.resolve(appRoot, `.${requestedPath}`);
    const relativePath = path.relative(appRoot, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      response.writeHead(404).end('Not found');
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }

      response.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Content-Length': stats.size,
        'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff'
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      fs.createReadStream(filePath).pipe(response);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(`http://127.0.0.1:${server.address().port}/`);
    });
  });
}

function publishBuildServiceStatus(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('build-service-status', { message });
  }
}

function publishToolchainStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('toolchain-status', status);
  }
}

function readIdfEnvironment(idfPath, toolsPath, pythonEnvPath) {
  const exportScript = path.join(idfPath, 'export.bat');
  if (!fs.existsSync(exportScript)) throw new Error(`ESP-IDF activation script not found: ${exportScript}`);
  const command = `call "${exportScript}" >nul && set`;
  const child = require('node:child_process').spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${command}"`], {
    encoding: 'utf8',
    windowsHide: true,
    windowsVerbatimArguments: true,
    env: {
      ...process.env,
      IDF_TOOLS_PATH: toolsPath,
      ...(pythonEnvPath ? { IDF_PYTHON_ENV_PATH: pythonEnvPath } : {})
    }
  });
  if (child.error) throw child.error;
  if (child.status !== 0) {
    throw new Error('Could not activate ESP-IDF:\n' + (child.stderr || child.stdout || '').trim().slice(-3000));
  }
  const idfEnv = {};
  child.stdout.split(/\r?\n/).forEach((line) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match && /^(PATH|IDF_PATH|IDF_TOOLS_PATH|IDF_PYTHON_ENV_PATH|ESP_ROM_ELF_DIR|ESP_IDF_VERSION)$/.test(match[1])) {
      idfEnv[match[1]] = match[2];
    }
  });
  const pythonEnv = pythonEnvPath || idfEnv.IDF_PYTHON_ENV_PATH;
  if (pythonEnv) idfEnv.IDF_PYTHON_ENV_PATH = pythonEnv;
  const python = pythonEnv && path.join(pythonEnv, 'Scripts', 'python.exe');
  if (!idfEnv.PATH || !python || !fs.existsSync(python)) {
    throw new Error('ESP-IDF activated, but its Python environment could not be located. Reinstall ESP-IDF and retry.');
  }
  return { python, env: { ...process.env, ...idfEnv } };
}

function managedRoot() {
  const localAppData = process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local');
  return path.join(localAppData, 'BlockCode');
}

async function buildServicePaths() {
  const root = app.isPackaged
    ? path.join(process.resourcesPath, 'blockcode-build-service')
    : appRoot;
  const script = path.join(root, 'tools', 'build-service.py');
  if (!fs.existsSync(script) || !fs.existsSync(path.join(root, 'watch-elf-app'))) {
    throw new Error('The bundled watch build files are missing. Reinstall BlockCode.');
  }

  if (process.env.IDF_PATH) {
    const idfPath = process.env.IDF_PATH;
    const toolsPath = process.env.IDF_TOOLS_PATH || 'C:\\Espressif';
    const pythonEnvPath = process.env.IDF_PYTHON_ENV_PATH || null;
    if (!fs.existsSync(path.join(idfPath, 'tools', 'idf.py'))) {
      throw new Error(`The configured ESP-IDF installation was not found: ${idfPath}`);
    }
    const idfEnvironment = readIdfEnvironment(idfPath, toolsPath, pythonEnvPath);
    return {
      python: idfEnvironment.python,
      script,
      env: {
        ...idfEnvironment.env,
        IDF_PATH: idfPath,
        IDF_TOOLS_PATH: toolsPath,
        IDF_PYTHON_ENV_PATH: idfEnvironment.env.IDF_PYTHON_ENV_PATH,
        ESP_IDF_VERSION: process.env.ESP_IDF_VERSION || idfEnvironment.env.ESP_IDF_VERSION || '6.1',
        PYTHONUTF8: '1',
        IDF_CCACHE_ENABLE: '1',
        BLOCKCODE_BUILD_CACHE: process.env.BLOCKCODE_BUILD_CACHE ||
          path.join(managedRoot(), 'build-cache', 'dev')
      }
    };
  }

  let environment;
  try {
    environment = await toolchain.ensure({ reason: 'build' });
  } catch (error) {
    if (error && error.cancelled) {
      throw new Error(
        'The watch build tools are not set up yet. Finish the watch build tools setup, then build again.'
      );
    }
    throw new Error(
      `The watch build tools are not ready.\n\n${error.message || error}\n\n` +
      'Use Retry setup or Repair build tools to finish the setup.'
    );
  }

  const buildEnvironment = toolchain.getBuildEnvironment(environment);
  return {
    python: buildEnvironment.python,
    script,
    env: {
      ...buildEnvironment.env,
      BLOCKCODE_BUILD_CACHE: process.env.BLOCKCODE_BUILD_CACHE ||
        path.join(toolchain.getPaths().managedRoot, 'build-cache', environment.toolchainId)
    }
  };
}

async function buildServiceIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:8765/health', {
      signal: AbortSignal.timeout(1000)
    });
    if (!response.ok) return false;
    const health = await response.json();
    return health.ok === true && health.target === 'esp32s3';
  } catch {
    return false;
  }
}

async function startBuildService() {
  if (await buildServiceIsReady()) return;
  const { python, script, env } = await buildServicePaths();
  const logDirectory = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  const logPath = path.join(logDirectory, 'build-service.log');
  const logFd = fs.openSync(logPath, 'w');
  let startupOutput = '';
  let spawnError;

  try {
    const child = spawn(python, [script], {
      cwd: path.dirname(path.dirname(script)),
      env,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true
    });
    buildServiceProcess = child;
    child.on('error', (error) => {
      spawnError = error;
      startupOutput += error.message;
    });
    child.on('exit', (code, signal) => {
      if (buildServiceProcess === child) buildServiceProcess = null;
      if (code !== 0 && code !== null) {
        startupOutput += `Build service exited with code ${code}.`;
      } else if (signal) {
        startupOutput += `Build service exited (${signal}).`;
      }
    });

    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (await buildServiceIsReady()) return;
      if (spawnError) {
        throw new Error(`Could not launch the watch build service: ${spawnError.message}`);
      }
      if (child.exitCode !== null || child.signalCode !== null) {
        const detail = startupOutput || fs.readFileSync(logPath, 'utf8').slice(-2000);
        if (/address already in use|only one usage of each socket address/i.test(detail)) {
          throw new Error('Port 8765 is in use by another app. Close it and retry.');
        }
        throw new Error(
          'Could not start the watch build service. Check the watch build tools setup and ' +
          `${logPath}${detail ? `\n\n${detail}` : ''}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`The watch build service did not start in time. See ${logPath}`);
  } finally {
    fs.closeSync(logFd);
  }
}

function stopBuildService() {
  const child = buildServiceProcess;
  buildServiceProcess = null;
  buildServiceStarting = null;
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, 5000);
    child.once('exit', finish);
    killProcessTree(child);
  });
}

ipcMain.handle('ensure-build-service', async (event) => {
  if (!isAppFrame(event)) {
    throw new Error('The build service can only be started by the BlockCode app.');
  }
  if (!process.env.IDF_PATH) {
    await toolchain.ensure({ reason: 'build', quiet: true });
  }
  if (!buildServiceStarting) {
    buildServiceStarting = startBuildService().finally(() => {
      buildServiceStarting = null;
    });
  }
  await buildServiceStarting;
  publishBuildServiceStatus('');
  return true;
});

ipcMain.handle('get-toolchain-status', (event) => {
  if (!isAppFrame(event)) throw new Error('Build tool status is only available to BlockCode.');
  return toolchain.getStatus();
});

ipcMain.handle('retry-toolchain-setup', async (event) => {
  if (!isAppFrame(event)) throw new Error('Build tools can only be set up by BlockCode.');
  try {
    await toolchain.retry();
  } catch {
    /* the failure is already published as a toolchain status */
  }
  return toolchain.getStatus();
});

ipcMain.handle('repair-toolchain', async (event) => {
  if (!isAppFrame(event)) throw new Error('Build tools can only be repaired by BlockCode.');
  await stopBuildService();
  try {
    await toolchain.repair();
  } catch {
    /* the failure is already published as a toolchain status */
  }
  return toolchain.getStatus();
});

ipcMain.handle('cancel-toolchain-setup', (event) => {
  if (!isAppFrame(event)) throw new Error('Build tools can only be managed by BlockCode.');
  return toolchain.cancel();
});

ipcMain.handle('new-project', (event) => {
  if (!isAppFrame(event)) throw new Error('Project files can only be managed by BlockCode.');
  currentProjectPath = null;
  if (mainWindow) mainWindow.setTitle('BlockCode');
});

ipcMain.handle('open-project', async (event) => {
  if (!isAppFrame(event)) throw new Error('Project files can only be managed by BlockCode.');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'BlockCode projects', extensions: ['blockcode'] },
      { name: 'JSON files', extensions: ['json'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;

  const projectPath = result.filePaths[0];
  const stats = await fs.promises.stat(projectPath);
  if (!stats.isFile() || stats.size > MAX_PROJECT_BYTES) {
    throw new Error('Project file is too large to open (maximum 64 MiB).');
  }
  const contents = await fs.promises.readFile(projectPath, 'utf8');
  let project;
  try {
    project = JSON.parse(contents);
  } catch {
    throw new Error('This project file is not valid JSON.');
  }
  if (!project || project.format !== 'blockcode-project' || project.version !== 1) {
    throw new Error('This is not a supported BlockCode project file.');
  }
  currentProjectPath = projectPath;
  if (mainWindow) mainWindow.setTitle(`${path.basename(projectPath)} - BlockCode`);
  return { contents };
});

ipcMain.handle('save-project', async (event, contents, saveAs) => {
  if (!isAppFrame(event)) throw new Error('Project files can only be managed by BlockCode.');
  if (typeof contents !== 'string' || Buffer.byteLength(contents, 'utf8') > MAX_PROJECT_BYTES) {
    throw new Error('Project data is too large to save (maximum 64 MiB).');
  }

  let projectPath = saveAs ? null : currentProjectPath;
  if (!projectPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'Untitled.blockcode',
      filters: [{ name: 'BlockCode projects', extensions: ['blockcode'] }]
    });
    if (result.canceled || !result.filePath) return null;
    projectPath = result.filePath;
    if (!path.extname(projectPath)) projectPath += '.blockcode';
  }

  await fs.promises.writeFile(projectPath, contents, 'utf8');
  currentProjectPath = projectPath;
  if (mainWindow) mainWindow.setTitle(`${path.basename(projectPath)} - BlockCode`);
  return { saved: true };
});

function publishUpdateState(status, details = {}) {
  updateState = { status, ...details };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', updateState);
  }
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => publishUpdateState('checking'));
  autoUpdater.on('update-available', (info) => {
    updateAvailable = true;
    publishUpdateState('available', { version: info.version });
  });
  autoUpdater.on('update-not-available', (info) => {
    updateAvailable = false;
    publishUpdateState('not-available', {
      currentVersion: app.getVersion(),
      version: info.version
    });
  });
  autoUpdater.on('download-progress', (progress) => {
    publishUpdateState('downloading', { percent: Math.floor(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    publishUpdateState('downloaded', { version: info.version });
  });
  autoUpdater.on('error', (error) => {
    publishUpdateState('error', { message: error.message || 'Update check failed.' });
  });
}

ipcMain.handle('check-for-updates', async (event) => {
  if (!isAppFrame(event)) throw new Error('Updates can only be checked from BlockCode.');
  if (!app.isPackaged) {
    publishUpdateState('error', { message: 'Updates are available in the installed app.' });
    return false;
  }
  if (updateDownloaded) return true;
  try {
    await autoUpdater.checkForUpdates();
    return true;
  } catch (error) {
    publishUpdateState('error', { message: error.message || 'Update check failed.' });
    return false;
  }
});

ipcMain.handle('download-update', async (event) => {
  if (!isAppFrame(event)) throw new Error('Updates can only be downloaded from BlockCode.');
  if (!app.isPackaged || !updateAvailable) {
    throw new Error('There is no update available to download.');
  }
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (error) {
    publishUpdateState('error', { message: error.message || 'Update download failed.' });
    return false;
  }
});

ipcMain.handle('install-update', (event) => {
  if (!isAppFrame(event)) throw new Error('Updates can only be installed from BlockCode.');
  if (!app.isPackaged || !updateDownloaded) {
    throw new Error('Download an update before installing it.');
  }
  autoUpdater.quitAndInstall();
  return true;
});

async function createWindow() {
  appUrl = await startStaticServer();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== appUrl && !url.startsWith(appUrl)) event.preventDefault();
  });

  mainWindow.webContents.session.on('will-download', (event, item) => {
    item.pause();
    dialog.showSaveDialog(mainWindow, {
      defaultPath: item.getFilename()
    }).then(({ canceled, filePath }) => {
      if (canceled || !filePath) {
        item.cancel();
      } else {
        item.setSavePath(filePath);
        item.resume();
      }
    });
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  configureAutoUpdater();
  await createWindow();
  if (!process.env.IDF_PATH && (app.isPackaged || process.env.BLOCKCODE_TOOLCHAIN_AUTO_SETUP === '1')) {
    toolchain.ensure({ reason: 'startup', quiet: true }).catch(() => {
      /* failures are published through the toolchain status channel */
    });
  }
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((error) => {
      publishUpdateState('error', { message: error.message || 'Update check failed.' });
    });
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (server) server.close();
  if (buildServiceProcess) killProcessTree(buildServiceProcess);
  toolchain.cancel();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
