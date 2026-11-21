const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, Platform } = require('electron-builder');

async function main(options = {}) {
  const root = options.root || path.resolve(__dirname, '..');
  const downloads = options.downloads || path.join(root, 'Downloads');
  const installerName = options.installerName || 'blockcode setup.exe';

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'blockcode-installer-'));
  try {
    await build({
      targets: Platform.WINDOWS.createTarget('nsis'),
      config: {
        directories: {
          output: staging
        }
      }
    });

    const source = path.join(staging, installerName);
    if (!fs.existsSync(source)) {
      throw new Error(`The installer was not created: ${source}`);
    }

    fs.mkdirSync(downloads, { recursive: true });
    const destination = path.join(downloads, installerName);
    fs.copyFileSync(source, destination);
    console.log(`Installer written to ${destination}`);
    return destination;
  } finally {
    try {
      fs.rmSync(staging, { recursive: true, force: true });
    } catch {
      /* the temporary build folder can be cleaned up later */
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { main, installerName: 'blockcode setup.exe' };
