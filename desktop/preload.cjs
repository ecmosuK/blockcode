const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blockCodeDesktop', {
  ensureBuildService: () => ipcRenderer.invoke('ensure-build-service'),
  onBuildServiceStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('build-service-status', listener);
    return () => ipcRenderer.removeListener('build-service-status', listener);
  },
  getToolchainStatus: () => ipcRenderer.invoke('get-toolchain-status'),
  retryToolchainSetup: () => ipcRenderer.invoke('retry-toolchain-setup'),
  repairToolchain: () => ipcRenderer.invoke('repair-toolchain'),
  cancelToolchainSetup: () => ipcRenderer.invoke('cancel-toolchain-setup'),
  onToolchainStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('toolchain-status', listener);
    return () => ipcRenderer.removeListener('toolchain-status', listener);
  },
  newProject: () => ipcRenderer.invoke('new-project'),
  openProject: () => ipcRenderer.invoke('open-project'),
  saveProject: (contents, saveAs) =>
    ipcRenderer.invoke('save-project', contents, Boolean(saveAs)),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  }
});
