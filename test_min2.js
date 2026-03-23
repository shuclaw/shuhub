const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function test() {
    const sandbox = require('./modules/sandbox');
    const DockerSandbox = sandbox.DockerSandbox;
    
    console.log('Creating DockerSandbox directly...');
    const ds = new DockerSandbox();
    
    await ds.init({
        image: 'python:3.11-slim',
        network: false,
        memory: '128m',
        timeout: 30000
    });
    
    // Write test code
    const codeFile = path.join(os.tmpdir(), 'direct_test.py');
    await fs.writeFile(codeFile, 'print(42+100)', 'utf-8');
    console.log('Code file:', codeFile);
    
    // Check file permissions
    const stats = await fs.stat(codeFile);
    console.log('File mode:', stats.mode.toString(8));
    
    // Build the exact same command
    const volumes = [`${codeFile}:/code/file.py`];
    const args = [
        'run', '--rm',
        '--network', 'none',
        '--memory', '128m',
        '--memory-swappiness', '0',
        '--pids-limit', '50',
        '--user', '1000:1000'
    ];
    volumes.forEach(v => args.push('-v', v));
    args.push('python:3.11-slim');
    const runner = { cmd: 'python3', args: ['/code/file.py'] };
    runner.args.forEach(arg => args.push(arg));
    
    console.log('\nCommand: sudo docker', args.join(' '));
    
    // Execute
    return new Promise((resolve) => {
        const startTime = Date.now();
        const proc = spawn('sudo', ['docker'].concat(args));
        let stdout = '', stderr = '';
        
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        
        proc.on('close', async (code) => {
            console.log('\nExit code:', code);
            console.log('Stdout:', stdout.trim());
            console.log('Stderr:', stderr.trim());
            console.log('Duration:', Date.now() - startTime, 'ms');
            await fs.unlink(codeFile).catch(()=>{});
            resolve();
        });
        
        proc.on('error', (err) => {
            console.log('Error:', err.message);
            resolve();
        });
        
        setTimeout(() => { proc.kill(); resolve(); }, 30000);
    });
}

test().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
