const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  savePdf: () => ipcRenderer.invoke('report:pdf'),
}));
