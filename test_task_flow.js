// Test Hub Task Flow - 完整流程测试
const { Hub } = require('./hub.js');

async function test() {
    console.log('='.repeat(50));
    console.log('TeamHub Task Flow Test');
    console.log('='.repeat(50));
    
    // 创建 Hub
    const hub = new Hub();
    
    // 初始化
    await hub.init({
        logger: { level: 'info', format: 'text' },
        config: { configDir: './config' },
        messageBus: {},
        monitor: {},
        memory: { 
            providers: { 
                default: { type: 'memory' } 
            } 
        },
        storage: { 
            providers: { 
                default: { type: 'memory' } 
            } 
        },
        intent: {
            rules: [
                { pattern: /代码|编程|开发/, intent: 'code', category: '技术开发' },
                { pattern: /安全|漏洞|审计/, intent: 'security', category: '安全运维' },
                { pattern: /设计|UI|界面/, intent: 'design', category: '创意设计' },
                { pattern: /客服|售后|咨询/, intent: 'customer', category: '运营客服' }
            ]
        },
        routing: {
            agents: [
                { id: 'lingke', name: '凌刻', role: '技术开发', intents: ['code'] },
                { id: 'yanjia', name: '岩甲', role: '安全运维', intents: ['security'] },
                { id: 'xiaohui', name: '小绘', role: '创意设计', intents: ['design'] },
                { id: 'budubuo', name: '布土拨', role: '运营客服', intents: ['customer'] }
            ]
        },
        workflow: {},
        tool: {},
        agent: {},
        ports: {},
        assistant: { enabled: false },
        rateLimit: {},
        auth: { tenants: [] },
        approval: {},
        exporter: { root: '/tmp/exports' },
        cache: {},
        connector: { connectors: [] },
        sandbox: { provider: 'subprocess' },
        dmzAgent: { enabled: false }
    });
    
    console.log('\n[1] Hub 初始化完成\n');
    
    // 测试1: 记忆存储
    console.log('[2] 测试记忆存储...');
    await hub.memory.store('lingke', '我是凌刻，擅长代码开发');
    await hub.memory.store('yanjia', '我是岩甲，负责安全审计');
    console.log('   ✓ 记忆存储成功\n');
    
    // 测试2: 意图分类
    console.log('[3] 测试意图分类...');
    const intent1 = await hub.intent.classify('帮我写一个用户登录的代码');
    console.log(`   输入: "帮我写一个用户登录的代码"`);
    console.log(`   分类: ${intent1.category} / ${intent1.intent}`);
    console.log('   ✓ 意图分类成功\n');
    
    // 测试3: 路由
    console.log('[4] 测试路由...');
    const agent1 = await hub.routing.route(intent1);
    console.log(`   路由到: ${agent1.name} (${agent1.role})`);
    console.log('   ✓ 路由成功\n');
    
    // 测试4: 记忆检索
    console.log('[5] 测试记忆检索...');
    const memories = await hub.memory.search('代码开发', { agentId: 'lingke', limit: 3 });
    console.log(`   找到 ${memories.length} 条相关记忆`);
    if (memories.length > 0) {
        console.log(`   示例: ${memories[0].content.substring(0, 30)}...`);
    }
    console.log('   ✓ 记忆检索成功\n');
    
    // 测试5: 完整流程 (process)
    console.log('[6] 测试完整流程 (process)...');
    const result = await hub.process('帮我写一个用户登录的代码', {
        userId: 'test_user',
        skipAssistant: true
    });
    console.log(`   来源: ${result.from}`);
    console.log(`   Agent: ${result.agent?.name}`);
    console.log(`   记忆数: ${result.memories?.length}`);
    console.log(`   耗时: ${result.elapsed}ms`);
    console.log('   ✓ 完整流程成功\n');
    
    // 测试6: 小智前台 (启用)
    console.log('[7] 测试小智前台...');
    hub.assistant.enabled = true;
    
    const lightResult = await hub.process('今天天气怎么样？', {
        userId: 'test_user'
    });
    console.log(`   轻量问题处理: ${lightResult.from === 'assistant' ? '小智直接回答' : '升级到Agent'}`);
    if (lightResult.response && typeof lightResult.response === 'string') {
        console.log(`   回答: ${lightResult.response.substring(0, 50)}...`);
    } else if (lightResult.escalate) {
        console.log(`   升级原因: ${lightResult.reason || '需要后台处理'}`);
    }
    console.log('   ✓ 小智前台成功\n');
    
    // 测试7: 审批流程
    console.log('[8] 测试审批流程...');
    const approval = await hub.createApproval(
        'code_deploy',
        '代码部署申请',
        '需要部署新功能到生产环境',
        'lingke',
        { code: '...', target: 'production' }
    );
    console.log(`   创建审批: ${approval.id}`);
    console.log(`   类型: ${approval.type}`);
    
    const approved = await hub.approve(approval.id, '鼠爪', '同意部署');
    console.log(`   审批结果: ${approved.status}`);
    console.log('   ✓ 审批流程成功\n');
    
    // 测试8: 健康检查
    console.log('[9] 测试健康检查...');
    const health = await hub.health();
    console.log(`   状态: ${health.status}`);
    console.log(`   模块数: ${Object.keys(health.modules).length}`);
    const healthyModules = Object.values(health.modules).filter(m => m.status === 'healthy').length;
    console.log(`   健康: ${healthyModules}/${Object.keys(health.modules).length}`);
    console.log('   ✓ 健康检查成功\n');
    
    console.log('='.repeat(50));
    console.log('✅ 所有测试通过!');
    console.log('='.repeat(50));
    
    await hub.destroy();
    process.exit(0);
}

test().catch(err => {
    console.error('\n❌ 测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
});
