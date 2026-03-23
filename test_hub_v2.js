// Test Hub v2 - 集成测试
const { Hub } = require('./hub.js');

async function test() {
    console.log('Creating Hub...');
    const hub = new Hub();
    
    console.log('\nModules in Hub:');
    const modules = Object.keys(hub).filter(k => !k.startsWith('_') && typeof hub[k] !== 'function');
    modules.forEach(m => console.log(`  - ${m}`));
    
    console.log('\nInitializing Hub...');
    await hub.init({
        logger: { level: 'info', format: 'text' },
        config: { configDir: './config' },
        messageBus: {},
        monitor: {},
        memory: { provider: 'memory' },
        storage: { provider: 'memory' },
        intent: { rules: [] },
        routing: { agents: [] },
        workflow: {},
        tool: {},
        agent: {},
        ports: {},
        assistant: { enabled: false },
        rateLimit: {},
        auth: { tenants: [] },
        approval: {},
        safety: {},
        exporter: { root: '/tmp/exports' },
        cache: {},
        connector: { connectors: [] },
        sandbox: { provider: 'subprocess' },
        dmzAgent: { enabled: false }
    });
    
    console.log('\nHub initialized!');
    
    console.log('\nHealth check:');
    const health = await hub.health();
    console.log(`Status: ${health.status}`);
    console.log('Modules:');
    for (const [name, status] of Object.entries(health.modules)) {
        console.log(`  ${name}: ${typeof status === 'object' ? status.status || status.module : status}`);
    }
    
    console.log('\nTest complete!');
    await hub.destroy();
    process.exit(0);
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
