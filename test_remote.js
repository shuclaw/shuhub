const { SandboxModule } = require('./modules/sandbox');

async function test() {
    console.log('=== Remote Sandbox Test ===\n');
    
    const sandbox = new SandboxModule();
    await sandbox.init({
        provider: 'remote',
        config: {
            endpoint: 'http://localhost:3099',
            timeout: 30000
        }
    });
    
    console.log('RemoteSandbox initialized\n');
    
    // Test Python
    console.log('1. Testing Python execution...');
    const pyResult = await sandbox.execute(`
x = 42
y = 100
result = x + y
print(f"Python: {x} + {y} = {result}")
`, 'python', 30000);
    console.log(`   Success: ${pyResult.success}`);
    console.log(`   Output: ${pyResult.stdout}`);
    console.log(`   Duration: ${pyResult.duration}ms\n`);
    
    // Test JavaScript
    console.log('2. Testing JavaScript execution...');
    const jsResult = await sandbox.execute(`
const x = 42, y = 100;
console.log(\`JavaScript: \${x} + \${y} = \${x + y}\`);
`, 'javascript', 30000);
    console.log(`   Success: ${jsResult.success}`);
    console.log(`   Output: ${jsResult.stdout}`);
    console.log(`   Duration: ${jsResult.duration}ms\n`);
    
    // Test Health
    console.log('3. Health check...');
    const health = await sandbox.health();
    console.log(`   Status: ${health.status}`);
    console.log(`   Provider: ${health.provider}`);
    
    await sandbox.destroy();
    console.log('\n=== Test Complete ===');
}

test().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
