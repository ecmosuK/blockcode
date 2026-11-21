// Integration tests for ToolchainManager.prepareArchive / downloadFile.
// The Electron network layer is mocked so we can assert how many bytes are
// requested, whether Range resume is used, and when the downloader refuses to
// transfer a stale manifest.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  net: { fetch: jest.fn() }
}));

const { net } = require('electron');
const { ToolchainManager } = require('./toolchain.cjs');

const ARCHIVE_URL = 'https://example.test/archive.zst';
const PAYLOAD = Buffer.from('0123456789');
const SHA = crypto.createHash('sha256').update(PAYLOAD).digest('hex');

function responseFromBody(body, init = {}) {
  return new Response(body, init);
}

function headResponse(size) {
  return new Response(null, {
    status: 200,
    headers: { 'content-length': String(size) }
  });
}

function getResponse(bytes, { status = 200, rangeStart = 0 } = {}) {
  return responseFromBody(bytes, {
    status,
    headers: {
      'content-length': String(bytes.length),
      ...(status === 206
        ? { 'content-range': `bytes ${rangeStart}-${rangeStart + bytes.length - 1}/${PAYLOAD.length}` }
        : {})
    }
  });
}

describe('ToolchainManager archive download', () => {
  let tempRoot;
  let manifestPath;
  let manager;
  let statfsSpy;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blockcode-dl-'));
    process.env.LOCALAPPDATA = tempRoot;
    delete process.env.BLOCKCODE_TOOLCHAIN_ARCHIVE;

    manifestPath = path.join(tempRoot, 'toolchain-manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        toolchainId: 'esp-idf-6.1-esp32s3',
        toolchainVersion: '6.1-esp32s3-1',
        idfVersion: '6.1',
        target: 'esp32s3',
        archive: { url: ARCHIVE_URL, size: PAYLOAD.length, sha256: SHA, format: 'zst' },
        eim: {
          version: '0.20.1',
          url: 'https://example.test/eim.exe',
          size: 1,
          sha256: 'a'.repeat(64)
        }
      })
    );

    manager = new ToolchainManager({
      resourcesRoot: path.join(tempRoot, 'resources'),
      appRoot: tempRoot,
      manifestPath
    });

    statfsSpy = jest.spyOn(fs, 'statfsSync').mockReturnValue({ bavail: 1e9, bsize: 4096 });
    net.fetch.mockReset();
  });

  afterEach(() => {
    statfsSpy.mockRestore();
    delete process.env.LOCALAPPDATA;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('rejects a stale manifest before requesting any archive bytes', async () => {
    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length + 5);
      return getResponse(PAYLOAD);
    });

    const pinned = manager.readPinnedManifest();

    await expect(manager.prepareArchive(pinned)).rejects.toThrow(/out of date|manifest/i);

    const getCalls = net.fetch.mock.calls.filter(([, init]) => init && init.method !== 'HEAD');
    expect(getCalls).toHaveLength(0);
  });

  it('downloads the archive once and verifies its hash', async () => {
    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length);
      return getResponse(PAYLOAD);
    });

    const pinned = manager.readPinnedManifest();
    const result = await manager.prepareArchive(pinned);

    expect(result.downloaded).toBe(true);
    expect(result.sha256).toBe(SHA);
    expect(fs.readFileSync(result.path)).toEqual(PAYLOAD);
    expect(fs.existsSync(`${result.path}.part`)).toBe(false);
  });

  it('resumes an interrupted download from the partial offset with a Range request', async () => {
    const archiveName = path.basename(new URL(ARCHIVE_URL).pathname);
    const downloadRoot = path.join(tempRoot, 'BlockCode', 'downloads');
    fs.mkdirSync(downloadRoot, { recursive: true });
    fs.writeFileSync(path.join(downloadRoot, `${archiveName}.part`), PAYLOAD.subarray(0, 4));

    let getInit = null;
    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length);
      getInit = init;
      return getResponse(PAYLOAD.subarray(4), { status: 206, rangeStart: 4 });
    });

    const pinned = manager.readPinnedManifest();
    const result = await manager.prepareArchive(pinned);

    expect(getInit.headers).toEqual({ Range: 'bytes=4-' });
    expect(result.downloaded).toBe(true);
    expect(fs.readFileSync(result.path)).toEqual(PAYLOAD);
  });

  it('reuses a verified local archive without any GET request', async () => {
    const archiveName = path.basename(new URL(ARCHIVE_URL).pathname);
    const downloadRoot = path.join(tempRoot, 'BlockCode', 'downloads');
    fs.mkdirSync(downloadRoot, { recursive: true });
    const destination = path.join(downloadRoot, archiveName);
    fs.writeFileSync(destination, PAYLOAD);

    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length);
      return getResponse(PAYLOAD);
    });

    const pinned = manager.readPinnedManifest();
    const result = await manager.prepareArchive(pinned);

    expect(result.downloaded).toBe(false);
    expect(result.path).toBe(destination);
    const getCalls = net.fetch.mock.calls.filter(([, init]) => init && init.method !== 'HEAD');
    expect(getCalls).toHaveLength(0);
  });

  it('keeps the partial file when a download ends early so a retry can resume', async () => {
    const archiveName = path.basename(new URL(ARCHIVE_URL).pathname);
    const downloadRoot = path.join(tempRoot, 'BlockCode', 'downloads');

    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length);
      return getResponse(PAYLOAD.subarray(0, 6));
    });

    const pinned = manager.readPinnedManifest();
    await expect(manager.prepareArchive(pinned)).rejects.toThrow(/incomplete/i);

    const partPath = path.join(downloadRoot, `${archiveName}.part`);
    expect(fs.existsSync(partPath)).toBe(true);
    expect(fs.readFileSync(partPath)).toEqual(PAYLOAD.subarray(0, 6));

    // A retry resumes from byte 6 and completes.
    let retryRange = null;
    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length);
      retryRange = init.headers && init.headers.Range;
      return getResponse(PAYLOAD.subarray(6), { status: 206, rangeStart: 6 });
    });

    const result = await manager.prepareArchive(pinned);
    expect(retryRange).toBe('bytes=6-');
    expect(fs.readFileSync(result.path)).toEqual(PAYLOAD);
  });

  it('restarts cleanly when the server ignores a Range request', async () => {
    const archiveName = path.basename(new URL(ARCHIVE_URL).pathname);
    const downloadRoot = path.join(tempRoot, 'BlockCode', 'downloads');
    fs.mkdirSync(downloadRoot, { recursive: true });
    fs.writeFileSync(path.join(downloadRoot, `${archiveName}.part`), PAYLOAD.subarray(0, 4));

    net.fetch.mockImplementation(async (_url, init = {}) => {
      if (init.method === 'HEAD') return headResponse(PAYLOAD.length);
      // Ignores the requested Range and sends the whole body with status 200.
      return getResponse(PAYLOAD, { status: 200 });
    });

    const pinned = manager.readPinnedManifest();
    const result = await manager.prepareArchive(pinned);

    expect(fs.readFileSync(result.path)).toEqual(PAYLOAD);
  });
});
