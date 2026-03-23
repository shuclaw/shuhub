/**
 * Connector Module 测试
 */
const { ConnectorModule } = require('./modules/connector');

async function test() {
    console.log('==================================================');
    console.log('Connector Module Test');
    console.log('==================================================\n');

    // 1. 初始化
    console.log('[1] 初始化 Connector...');
    const connector = new ConnectorModule();
    const { SandboxModule } = require('./modules/sandbox');
    const sandbox = new SandboxModule();
    await sandbox.init({ provider: 'subprocess' });
    connector.setSandbox(sandbox);
    
    await connector.init({
        connectors: [
            { id: 'test-local', type: 'local' }
        ],
        fallbackToSandbox: true
    });
    console.log('✓ Connector 初始化完成\n');

    // 2. 测试状态
    console.log('[2] 测试 getStatus()...');
    const status = connector.getStatus();
    console.log('状态:', JSON.stringify(status, null, 2));
    console.log('✓\n');

    // 3. 测试健康检查
    console.log('[3] 测试 health()...');
    const health = await connector.health();
    console.log('健康:', JSON.stringify(health, null, 2));
    console.log('✓\n');

    // 4. 测试本地Agent调用（会回退到Sandbox）
    console.log('[4] 测试 call() - 本地Agent...');
    try {
        const result = await connector.call('test-local', '你好');
        console.log('结果:', JSON.stringify(result, null, 2));
        console.log('✓\n');
    } catch (err) {
        console.log('错误:', err.message);
    }

    // 5. 测试不存在的Agent
    console.log('[5] 测试 call() - 不存在的Agent...');
    try {
        await connector.call('not-exist', '你好');
    } catch (err) {
        console.log('预期错误:', err.message);
        console.log('✓\n');
    }

    // 6. 清理
    console.log('[6] 清理...');
    await connector.destroy();
    console.log('✓\n');

    console.log('==================================================');
    console.log('✅ 测试完成');
    console.log('==================================================');
    process.exit(0);
}

test().catch(err => {
    console.error('测试失败:', err);
    process.exit(1);
});
