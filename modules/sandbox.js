/**
 * Sandbox Module - 可插拔代码执行隔离环境
 * 
 * 支持的 Provider:
 * - subprocess: 本地子进程隔离 (轻量)
 * - docker: Docker 容器隔离 (生产级)
 * - remote: 远程 API 执行 (无服务器)
 */

const { BaseModule } = require('../base');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// ============ 子进程沙箱 Provider ============

class SubprocessSandbox {
    constructor() {
        this.type = 'subprocess';
    }

    async init(config) {
        this.maxMemory = config.maxMemory || '256m';
        this.timeout = config.timeout || 30000;
        this.allowedLanguages = config.allowedLanguages || ['python', 'javascript', 'bash'];
        this.tempDir = config.tempDir || os.tmpdir();
    }

    async execute(code, language, timeout = this.timeout) {
        if (!this.allowedLanguages.includes(language)) {
            throw new Error(`Language ${language} not allowed. Allowed: ${this.allowedLanguages.join(', ')}`);
        }

        const startTime = Date.now();
        const workDir = this.tempDir;
        const outputFile = path.join(workDir, `sandbox_${Date.now()}.${this._getExt(language)}`);
        
        await fs.writeFile(outputFile, code, 'utf-8');

        return new Promise((resolve, reject) => {
            const runner = this._getRunner(language, outputFile);
            let stdout = '';
            let stderr = '';
            let killed = false;

            const proc = spawn(runner.cmd, runner.args, {
                cwd: workDir,
                env: { ...process.env, HOME: workDir },
                timeout
            });

            const timer = setTimeout(() => {
                killed = true;
                proc.kill('SIGKILL');
            }, timeout);

            proc.stdout.on('data', d => stdout += d);
            proc.stderr.on('data', d => stderr += d);

            proc.on('close', async (code) => {
                clearTimeout(timer);
                try { await fs.unlink(outputFile); } catch {}
                
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
                try { await fs.unlink(outputFile); } catch {}
                reject(err);
            });
        });
    }

    _getRunner(language, file) {
        switch (language) {
            case 'python':
                return { cmd: 'python3', args: [file] };
            case 'javascript':
                return { cmd: 'node', args: [file] };
            case 'bash':
                return { cmd: 'bash', args: [file] };
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
    }

    _getExt(language) {
        return { python: 'py', javascript: 'js', bash: 'sh' }[language] || 'txt';
    }

    async health() {
        return { provider: 'SubprocessSandbox', status: 'healthy' };
    }

    destroy() {}
}

// ============ Docker 沙箱 Provider ============

class DockerSandbox {
    constructor() {
        this.type = 'docker';
    }

    async init(config) {
        this.image = config.image || 'python:3.11-slim';
        this.network = config.network !== undefined ? config.network : false;
        this.memory = config.memory || '512m';
        this.cpu = config.cpu || '0.5';
        this.timeout = config.timeout || 60000;
        this.volumes = config.volumes || [];
    }

    async execute(code, language, timeout = this.timeout) {
        const startTime = Date.now();
        const workDir = os.tmpdir();
        const codeFile = path.join(workDir, `code_${Date.now()}.${this._getExt(language)}`);
        
        await fs.writeFile(codeFile, code, 'utf-8');

        const volumes = [
            `${codeFile}:/code/file.${this._getExt(language)}`
        ];
        this.volumes.forEach(v => volumes.push(v));

        const args = [
            'run', '--rm',
            '--network', this.network ? 'bridge' : 'none',
            '--memory', this.memory,
            '--cpus', this.cpu,
            '--memory-swappiness', '0',
            '--pids-limit', '50',
            '--user', '1000:1000'
        ];
        
        volumes.forEach(v => args.push('-v', v));
        args.push(this.image);
        const runner = this._getRunner(language);
        args.push(runner.cmd);
        runner.args.forEach(arg => args.push(arg));

        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let killed = false;

            const proc = spawn('sudo', ['docker'].concat(args), { timeout });

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
                reject(err);
            });
        });
    }

    _getRunner(language) {
        switch (language) {
            case 'python': return { cmd: 'python3', args: ['/code/file.py'] };
            case 'javascript': return { cmd: 'node', args: ['/code/file.js'] };
            case 'bash': return { cmd: 'bash', args: ['/code/file.sh'] };
            default: throw new Error(`Unsupported language: ${language}`);
        }
    }

    _getExt(language) {
        return { python: 'py', javascript: 'js', bash: 'sh' }[language] || 'txt';
    }

    async health() {
        return new Promise((resolve) => {
            const proc = spawn('sudo', ['docker', 'info']);
            proc.on('close', (code) => {
                resolve({ provider: 'DockerSandbox', status: code === 0 ? 'healthy' : 'unhealthy' });
            });
            proc.on('error', () => {
                resolve({ provider: 'DockerSandbox', status: 'unhealthy', error: 'Docker not available' });
            });
        });
    }

    destroy() {}
}

// ============ 远程沙箱 Provider ============

class RemoteSandbox {
    constructor() {
        this.type = 'remote';
    }

    async init(config) {
        this.endpoint = config.endpoint;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 60000;
    }

    async execute(code, language, timeout = this.timeout) {
        const startTime = Date.now();

        const response = await fetch(`${this.endpoint}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({ code, language, timeout }),
            signal: AbortSignal.timeout(timeout)
        });

        if (!response.ok) {
            throw new Error(`Remote sandbox error: ${response.status}`);
        }

        const result = await response.json();
        return {
            ...result,
            duration: Date.now() - startTime
        };
    }

    async health() {
        try {
            const response = await fetch(`${this.endpoint}/health`, {
                signal: AbortSignal.timeout(5000)
            });
            return { provider: 'RemoteSandbox', status: response.ok ? 'healthy' : 'unhealthy' };
        } catch (err) {
            return { provider: 'RemoteSandbox', status: 'unhealthy', error: err.message };
        }
    }

    destroy() {}
}

// ============ Sandbox Module ============

class SandboxModule extends BaseModule {
    constructor() {
        super('Sandbox');
        this.provider = null;
        this.stats = { executed: 0, success: 0, failed: 0 };
    }

    async init(config) {
        await super.init(config);
        
        const { provider = 'subprocess', config: providerConfig = {} } = config;
        
        switch (provider) {
            case 'subprocess':
                this.provider = new SubprocessSandbox();
                break;
            case 'docker':
                this.provider = new DockerSandbox();
                break;
            case 'remote':
                this.provider = new RemoteSandbox();
                break;
            default:
                throw new Error(`Unknown sandbox provider: ${provider}`);
        }

        await this.provider.init(providerConfig);
        console.log(`[Sandbox] Initialized with ${provider} provider`);
    }

    /**
     * 执行代码
     * @param {string} code - 代码内容
     * @param {string} language - 语言: python/javascript/bash
     * @param {number} timeout - 超时(ms)
     */
    async execute(code, language, timeout) {
        this.stats.executed++;
        
        try {
            const result = await this.provider.execute(code, language, timeout);
            
            if (result.success) {
                this.stats.success++;
            } else {
                this.stats.failed++;
            }
            
            return result;
        } catch (err) {
            this.stats.failed++;
            throw err;
        }
    }

    /**
     * 健康检查
     */
    async health() {
        const providerHealth = await this.provider.health();
        return {
            module: 'Sandbox',
            status: providerHealth.status === 'healthy' ? 'healthy' : 'degraded',
            provider: providerHealth.provider || this.provider.type,
            stats: this.stats
        };
    }

    destroy() {
        if (this.provider) {
            this.provider.destroy();
        }
    }
}

module.exports = { SandboxModule, SubprocessSandbox, DockerSandbox, RemoteSandbox };
