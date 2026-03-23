/**
 * Preload script - 安全暴露 IPC 到渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
    getStatus: () => ipcRenderer.invoke('get-status'),
    testApi: (cfg) => ipcRenderer.invoke('test-api', cfg),
    chat: (data) => ipcRenderer.invoke('chat', data)
});
