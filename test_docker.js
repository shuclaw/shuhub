const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function test() {
    console.log('Testing Docker...');
    
    // Test sudo docker
    console.log('1. Testing sudo docker info...');
    try {
        const { stdout } = await exec('sudo docker info 2>&1 | head -3');
        console.log('OK:', stdout.trim());
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    // Test code execution
    console.log('\n2. Testing Docker run...');
    const code = 'print("Hello from Docker")';
    const args = ['docker', 'run', '--rm', '--network', 'none', '--memory', '128m', 'python:3.11-slim', 'python3', '-c', code];
    console.log('Command: sudo', args.join(' '));
    
    return new Promise((resolve) => {
        const proc = spawn('sudo', args);
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        
        proc.on('close', (code) => {
            console.log('Exit code:', code);
            console.log('Stdout:', stdout.trim());
            console.log('Stderr:', stderr.trim());
            resolve();
        });
        
        proc.on('error', (err) => {
            console.log('Error:', err.message);
            resolve();
        });
        
        setTimeout(() => {
            proc.kill();
            console.log('Timeout');
            resolve();
        }, 30000);
    });
}

test();
