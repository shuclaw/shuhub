/**
 * Remote Sandbox 测试服务器
 * 模拟远程代码执行服务
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const PORT = 3099;

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', provider: 'RemoteSandbox-Test' }));
        return;
    }
    
    // Execute
    if (req.url === '/execute' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const trimmed = body.trim();
                console.log('[RemoteSandbox] Raw body length:', body.length, 'trimmed length:', trimmed.length);
                console.log('[RemoteSandbox] Raw body first 50 chars:', JSON.stringify(body.substring(0, 50)));
                const data = JSON.parse(trimmed);
                const { code, language, timeout = 30000 } = data;
                console.log(`[RemoteSandbox] Executing ${language} code (${code.length} chars)...`);
                
                const result = await executeCode(code, language, timeout);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('[RemoteSandbox] Error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message, stdout: '', stderr: err.stack }));
            }
        });
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
});

async function executeCode(code, language, timeout) {
    const startTime = Date.now();
    const workDir = os.tmpdir();
    const ext = { python: 'py', javascript: 'js', bash: 'sh' }[language] || 'txt';
    const codeFile = path.join(workDir, `remote_${Date.now()}.${ext}`);
    
    await fs.writeFile(codeFile, code, 'utf-8');
    
    const runners = {
        python: { cmd: 'python3', args: [codeFile] },
        javascript: { cmd: 'node', args: [codeFile] },
        bash: { cmd: 'bash', args: [codeFile] }
    };
    
    const runner = runners[language];
    if (!runner) {
        throw new Error(`Unsupported language: ${language}`);
    }
    
    return new Promise((resolve) => {
        const proc = spawn(runner.cmd, runner.args, { timeout });
        let stdout = '', stderr = '';
        let killed = false;
        
        const timer = setTimeout(() => {
            killed = true;
            proc.kill('SIGKILL');
        }, timeout);
        
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        
        proc.on('close', async (code) => {
            clearTimeout(timer);
            try { await fs.unlink(codeFile); } catch {}
            
            resolve({
                success: code === 0 && !killed,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: code,
                duration: Date.now() - startTime,
                killed
            });
        });
        
        proc.on('error', async (err) => {
            clearTimeout(timer);
            try { await fs.unlink(codeFile); } catch {}
            resolve({
                success: false,
                stdout: '',
                stderr: err.message,
                exitCode: -1,
                duration: Date.now() - startTime,
                killed: false
            });
        });
    });
}

server.listen(PORT, () => {
    console.log(`[RemoteSandbox] Test server running on http://localhost:${PORT}`);
    console.log(`[RemoteSandbox] Execute endpoint: POST http://localhost:${PORT}/execute`);
    console.log(`[RemoteSandbox] Health endpoint: GET http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
});
