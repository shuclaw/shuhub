/**
 * Safety Module Test
 */

const { SafetyModule, SafetyError } = require('./modules/safety');

async function test() {
    console.log('🧪 Testing Safety Module\n');
    
    const safety = new SafetyModule();
    await safety.init({});
    
    const tests = [
        {
            name: 'Normal file read',
            fn: () => safety.checkFileOperation('read', './workspace/test.js', 'test'),
            shouldPass: true
        },
        {
            name: 'Forbidden path',
            fn: () => safety.checkFileOperation('read', '/etc/passwd', 'test'),
            shouldPass: false
        },
        {
            name: 'Dangerous command',
            fn: () => safety.checkCommand('rm -rf /', 'test'),
            shouldPass: false
        },
        {
            name: 'Forbidden network',
            fn: () => safety.checkNetworkRequest('http://192.168.1.1', 'test'),
            shouldPass: false
        },
        {
            name: 'Allowed network',
            fn: () => safety.checkNetworkRequest('https://api.openai.com/v1/chat', 'test'),
            shouldPass: false  // not in whitelist by default
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            test.fn();
            if (test.shouldPass) {
                console.log(`✅ ${test.name}`);
                passed++;
            } else {
                console.log(`❌ ${test.name} (should be blocked)`);
                failed++;
            }
        } catch (err) {
            if (!test.shouldPass && err instanceof SafetyError) {
                console.log(`✅ ${test.name} (blocked: ${err.code})`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: ${err.message}`);
                failed++;
            }
        }
    }
    
    console.log(`\n📊 Results: ${passed}/${tests.length} passed`);
    
    // Export report
    const report = safety.exportReport();
    console.log(`\n📋 Audit: ${report.stats.total} ops, ${report.stats.blocked} blocked`);
    
    return failed === 0;
}

test().then(ok => process.exit(ok ? 0 : 1));
