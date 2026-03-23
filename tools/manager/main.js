/**
 * ShuHub Manager - Windows 管理工具
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;

const DEFAULT_CONFIG = {
    apis: {
        aliyun: {
            name: '阿里云',
            url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            key: '',
            models: ['qwen-plus', 'qwen-plus-32k', 'qwen-max']
        },
        minimax: {
            name: 'MiniMax',
            url: 'https://api.minimax.chat/v1',
            key: '',
            models: ['MiniMax-M2.5-highspeed']
        }
    },
    server: { host: 'localhost', port: 3001 }
};

let config = { ...DEFAULT_CONFIG };

function loadConfig() {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    try {
        if (fs.existsSync(configPath)) {
            const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            config = { ...DEFAULT_CONFIG, ...saved };
        }
    } catch (e) {
        console.log('Load config failed:', e.message);
    }
    return config;
}

function saveConfig(newConfig) {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    config = { ...config, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'ShuHub Manager'
    });
    mainWindow.loadFile('index.html');
}

function apiRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(data); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

const https = require('https');

// IPC handlers
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (event, newConfig) => { saveConfig(newConfig); return true; });

ipcMain.handle('get-status', async () => {
    try {
        const url = `http://${config.server.host}:${config.server.port}/status`;
        const data = await apiRequest(url, { method: 'GET' });
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('test-api', async (event, apiConfig) => {
    try {
        const url = `${apiConfig.url}/models`;
        const data = await apiRequest(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiConfig.key}` }
        });
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('chat', async (event, { model, message }) => {
    try {
        const url = `http://${config.server.host}:${config.server.port}/v1/chat/completions`;
        const data = await apiRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: message }] })
        });
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

app.whenReady().then(() => {
    loadConfig();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
