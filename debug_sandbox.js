const { SandboxModule } = require('./modules/sandbox');
const { spawn } = require('child_process');

async function test() {
    console.log('Creating SandboxModule...');
    const sandbox = new SandboxModule();
    
    console.log('Initializing Docker sandbox...');
    await sandbox.init({
        provider: 'docker',
        config: {
            image: 'python:3.11-slim',
            network: false,
            memory: '128m',
            cpu: '0.5',
            timeout: 30000
        }
    });
    
    // Print the actual docker command that will be executed
    console.log('\nCode to execute: print("test")');
    console.log('Image:', sandbox.provider.image);
    console.log('Memory:', sandbox.provider.memory);
    console.log('Network:', sandbox.provider.network);
    console.log('User:', '1000:1000');
    
    // Manually run docker with same options
    const code = 'print("test")';
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const workDir = os.tmpdir();
    const codeFile = path.join(workDir, `debug_${Date.now()}.py`);
    await fs.writeFile(codeFile, code, 'utf-8');
    
    const args = [
        'docker', 'run', '--rm',
        '--network', 'none',
        '--memory', '128m',
        '--memory-swappiness', '0',
        '--pids-limit', '50',
        '--user', '1000:1000',
        '-v', `${codeFile}:/code/file.py`,
        'python:3.11-slim', 'python3', '/code/file.py'
    ];
    
    console.log('\nActual command: sudo', args.join(' '));
    
    // Execute
    const startTime = Date.now();
    return new Promise((resolve) => {
        const proc = spawn('sudo', args);
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        
        proc.on('close', async (code) => {
            console.log('\nExit code:', code);
            console.log('Stdout:', stdout.trim());
            console.log('Stderr:', stderr.trim());
            try { await fs.unlink(codeFile); } catch {}
            resolve();
        });
        
        proc.on('error', (err) => {
            console.log('Error:', err.message);
            resolve();
        });
        
        setTimeout(() => { proc.kill(); resolve(); }, 30000);
    });
}

test().then(() => {
    console.log('\nDone');
    process.exit(0);
}).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
