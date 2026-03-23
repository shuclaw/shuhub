const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function testDockerSandbox() {
    const code = `print("Hello from Docker Sandbox")
x = 42
y = 100
print(f"Result: {x + y}")
`;
    
    const language = 'python';
    const image = 'python:3.11-slim';
    const memory = '128m';
    const timeout = 30000;
    
    // Write code to temp file
    const workDir = os.tmpdir();
    const ext = { python: 'py', javascript: 'js', bash: 'sh' }[language] || 'txt';
    const codeFile = path.join(workDir, `test_${Date.now()}.${ext}`);
    await fs.writeFile(codeFile, code, 'utf-8');
    console.log('Code file:', codeFile);
    
    // Build docker args
    const args = [
        'run', '--rm',
        '--network', 'none',
        '--memory', memory,
        '--memory-swappiness', '0',
        '--pids-limit', '50'
    ];
    
    // Mount code file
    args.push('-v', `${codeFile}:/code/file.${ext}:ro`);
    
    // Image and command
    args.push(image, `python3 /code/file.${ext}`);
    
    console.log('Docker args:', args);
    
    // Execute
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
        console.log('Spawning: sudo docker', args.join(' '));
        
        const proc = spawn('sudo', ['docker'].concat(args), { timeout });
        let stdout = '';
        let stderr = '';
        let killed = false;

        const timer = setTimeout(() => {
            killed = true;
            proc.kill('SIGKILL');
            console.log('Killed by timeout');
        }, timeout);

        proc.stdout.on('data', d => { stdout += d; process.stdout.write(d); });
        proc.stderr.on('data', d => { stderr += d; process.stderr.write(d); });

        proc.on('close', async (code) => {
            console.log(`\nClose event: code=${code}, killed=${killed}`);
            clearTimeout(timer);
            try { await fs.unlink(codeFile); } catch (e) {}
            
            console.log('Duration:', Date.now() - startTime, 'ms');
            console.log('Success:', code === 0 && !killed);
            resolve();
        });

        proc.on('error', async (err) => {
            console.log('\nError event:', err.message);
            clearTimeout(timer);
            try { await fs.unlink(codeFile); } catch (e) {}
            reject(err);
        });
    });
}

testDockerSandbox()
    .then(() => { console.log('\nTest completed'); process.exit(0); })
    .catch(e => { console.error('\nTest failed:', e.message); process.exit(1); });
