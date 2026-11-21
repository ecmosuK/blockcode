// Tests for the installer build wrapper. electron-builder and its platform
// API are mocked so the test never launches a real NSIS build.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron-builder', () => ({
  build: jest.fn(),
  Platform: {
    WINDOWS: {
      createTarget: jest.fn((name) => `target:${name}`)
    }
  }
}));

const { build, Platform } = require('electron-builder');
const { main, installerName } = require('./build-installer.cjs');

describe('build-installer main', () => {
  let tempRoot;
  let logSpy;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blockcode-build-'));
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  function makeBuildWriteInstaller(name = installerName) {
    build.mockImplementation(async ({ config }) => {
      const staging = config.directories.output;
      fs.mkdirSync(staging, { recursive: true });
      fs.writeFileSync(path.join(staging, name), 'installer-bytes');
    });
  }

  it('builds the NSIS installer and copies it into the downloads folder', async () => {
    makeBuildWriteInstaller();
    const downloads = path.join(tempRoot, 'Downloads');

    const destination = await main({ downloads });

    expect(build).toHaveBeenCalledTimes(1);
    expect(Platform.WINDOWS.createTarget).toHaveBeenCalledWith('nsis');
    expect(fs.readFileSync(destination, 'utf8')).toBe('installer-bytes');
    expect(fs.readFileSync(path.join(downloads, installerName), 'utf8')).toBe('installer-bytes');
  });

  it('derives the downloads folder from the provided root', async () => {
    makeBuildWriteInstaller();

    const destination = await main({ root: tempRoot });

    expect(destination).toBe(path.join(tempRoot, 'Downloads', installerName));
  });

  it('honours a custom installer name', async () => {
    makeBuildWriteInstaller('custom-setup.exe');

    const destination = await main({ root: tempRoot, installerName: 'custom-setup.exe' });

    expect(path.basename(destination)).toBe('custom-setup.exe');
    expect(fs.existsSync(destination)).toBe(true);
  });

  it('throws when electron-builder did not produce the installer', async () => {
    build.mockResolvedValue(undefined);

    await expect(main({ root: tempRoot })).rejects.toThrow(/installer was not created/i);
  });

  it('cleans up the staging directory even after a failure', async () => {
    const stagingDirs = [];
    build.mockImplementation(async ({ config }) => {
      stagingDirs.push(config.directories.output);
      throw new Error('builder exploded');
    });

    await expect(main({ root: tempRoot })).rejects.toThrow(/builder exploded/);
    expect(stagingDirs).toHaveLength(1);
    expect(fs.existsSync(stagingDirs[0])).toBe(false);
  });

  it('exports the default installer name', () => {
    expect(installerName).toBe('blockcode setup.exe');
  });
});
