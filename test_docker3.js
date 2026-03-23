const { SandboxModule } = require('./modules/sandbox');

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
    
    console.log('Executing Python code...');
    const result = await sandbox.execute(`
print("Hello from Docker Sandbox")
x = 42
y = 100
print(f"Result: {x + y}")
`, 'python', 30000);
    
    console.log('\n=== Result ===');
    console.log('Success:', result.success);
    console.log('Exit code:', result.exitCode);
    console.log('Duration:', result.duration, 'ms');
    console.log('Killed:', result.killed);
    console.log('Stdout:', result.stdout);
    console.log('Stderr:', result.stderr);
    
    await sandbox.destroy();
    console.log('\nDone');
}

test().catch(e => {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
});
