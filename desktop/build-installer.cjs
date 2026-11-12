const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, Platform } = require('electron-builder');

const root = path.resolve(__dirname, '..');
const downloads = path.join(root, 'Downloads');
const installerName = 'blockcode setup.exe';

async function main() {
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
  } finally {
    try {
      fs.rmSync(staging, { recursive: true, force: true });
    } catch {
      /* the temporary build folder can be cleaned up later */
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
