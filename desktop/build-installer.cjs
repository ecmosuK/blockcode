const path = require('node:path');
const { build, Platform } = require('electron-builder');

build({
  targets: Platform.WINDOWS.createTarget('nsis'),
  config: {
    directories: {
      output: path.resolve(__dirname, '..', 'Downloads')
    }
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
