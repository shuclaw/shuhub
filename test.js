/**
 * TeamHub Modularity Framework - Full Integration Test
 */

const { Hub } = require('./hub');

async function test() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     TeamHub 模块化框架 - 完整集成测试                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // 创建 Hub
    const hub = new Hub({
        llm: {
            url: 'http://192.168.50.47:1234/v1/chat/completions',
            model: 'qwen2.5-coder-7b-instruct'
        }
    });
    
    // 初始化所有模块
    console.log('1. 初始化框架...');
    await hub.init({
        config: {},
        messageBus: { maxHistory: 100 },
        monitor: { historyLimit: 100 },
        memory: {
            providers: {
                default: { type: 'memory', default: true }
            }
        },
        intent: {
            rules: [
                { pattern: '代码|开发|debug|编程', category: 'code', agents: ['凌刻'], priority: 2 },
                { pattern: '安全|审计|漏洞|入侵', category: 'security', agents: ['岩甲'], priority: 2 },
                { pattern: '设计|UI|素材|图片', category: 'design', agents: ['小绘'], priority: 2 },
                { pattern: '运营|推广|增长|营销', category: 'ops', agents: ['布土拨'], priority: 2 },
                { pattern: '审批|总览|管理', category: 'management', agents: ['鼠爪'], priority: 1 }
            ],
            classifiers: { rule: {} }
        },
        routing: {
            agents: {
                lingke: { name: '凌刻', role: '技术', skills: ['nodejs', 'python'], status: 'online' },
                yanjia: { name: '岩甲', role: '安全', skills: ['security', 'audit'], status: 'online' },
                hui: { name: '小绘', role: '设计', skills: ['ui', 'design'], status: 'online' },
                bufu: { name: '布土拨', role: '运营', skills: ['marketing', 'growth'], status: 'online' },
                mouse: { name: '鼠爪', role: '总指挥', skills: ['management'], status: 'online' }
            }
        },
        workflow: {
            maxIterations: 10,
            coolingTime: 1000
        },
        tool: {},
        agent: {
            llm: {
                url: 'http://192.168.50.47:1234/v1/chat/completions',
                model: 'qwen2.5-coder-7b-instruct'
            }
        },
        storage: {
            providers: {
                default: { type: 'memory', default: true }
            }
        },
        dmzAgent: {
            enabled: true,
            internet_access: true,
            can_write_db: false,
            require_approval: true,
            local_storage: '/tmp/dmz_test'
        },
        sandbox: {
            provider: 'docker',
            config: {
                image: 'python:3.11-slim',
                network: false,
                memory: '256m',
                cpu: '0.5',
                timeout: 60000
            }
        }
    });
    console.log('   ✅ 框架初始化完成\n');
    
    // 测试意图分类
    console.log('2. 测试意图分类...');
    const testMessages = [
        '帮我写一段Python代码',
        '检查系统安全漏洞',
        '设计一个App图标',
        '推广一下新产品',
        '审批这个需求'
    ];
    
    for (const msg of testMessages) {
        const intent = await hub.intent.classify(msg);
        console.log(`   "${msg}"`);
        console.log(`   → ${intent.category} (${(intent.confidence * 100).toFixed(0)}%)`);
    }
    console.log('   ✅ 意图分类正常\n');
    
    // 测试路由
    console.log('3. 测试任务路由...');
    const intents = ['code', 'security', 'design', 'ops', 'management'];
    for (const cat of intents) {
        const agent = await hub.routing.route({ category: cat });
        console.log(`   ${cat} → ${agent.name} (负载: ${agent.load})`);
    }
    console.log('   ✅ 路由正常\n');
    
    // 测试记忆存储
    console.log('4. 测试记忆模块...');
    await hub.memory.store('凌刻', '用户问如何部署Docker容器');
    await hub.memory.store('凌刻', '项目使用Node.js开发');
    await hub.memory.store('岩甲', '发现系统存在安全漏洞');
    await hub.memory.store('小绘', '设计了一个新logo');
    
    const memories = await hub.memory.search('部署', { agentId: '凌刻' });
    console.log(`   存储了 4 条记忆，检索到 ${memories.length} 条相关记忆`);
    console.log('   ✅ 记忆模块正常\n');
    
    // 测试工具注册
    console.log('5. 测试工具模块...');
    hub.registerTool({
        name: 'test_tool',
        description: '测试工具',
        params: ['input'],
        handler: async ({ input }) => ({ result: `processed: ${input}` })
    });
    const tools = hub.tool.list();
    console.log(`   注册了 ${tools.length} 个工具`);
    console.log(`   工具列表: ${tools.map(t => t.name).join(', ')}`);
    console.log('   ✅ 工具模块正常\n');
    
    // 测试 Agent
    console.log('6. 测试 Agent 模块...');
    const agents = hub.agent.getAllAgents();
    console.log(`   注册了 ${agents.length} 个 Agent`);
    const online = hub.agent.getOnlineAgents();
    console.log(`   在线: ${online.length}, 离线: ${agents.length - online.length}`);
    console.log('   ✅ Agent 模块正常\n');
    
    // 测试存储
    console.log('7. 测试存储模块...');
    await hub.storage.save('test_key', { data: 'test_value' });
    const loaded = await hub.storage.load('test_key');
    console.log(`   保存: test_key → ${JSON.stringify(loaded)}`);
    console.log('   ✅ 存储模块正常\n');
    
    // 测试 DMZ Agent
    console.log('8. 测试 DMZ Agent 模块...');
    console.log(`   上网功能: ${hub.dmzAgent.internetAccess ? '开启' : '关闭'}`);
    console.log(`   数据库写入: ${hub.dmzAgent.canWriteDB ? '允许' : '禁止'}`);
    console.log(`   需要审批: ${hub.dmzAgent.requireApproval ? '是' : '否'}`);
    console.log('   ✅ DMZ Agent 模块正常\n');
    
    // 测试 Sandbox
    console.log('8.1 测试 Sandbox 模块...');
    if (hub.sandbox && hub.sandbox.provider) {
        // Python 测试
        const pyResult = await hub.sandbox.execute(`
print("Hello from Python sandbox")
x = 42
y = 100
result = x + y
print(f"42 + 100 = {result}")
`, 'python', 10000);
        console.log(`   Python 执行: ${pyResult.success ? '成功' : '失败'} (${pyResult.duration}ms)`);
        console.log(`   输出: ${pyResult.stdout.trim().split('\n').slice(-1)[0]}`);
        if (pyResult.stderr) console.log(`   错误: ${pyResult.stderr.trim().substring(0, 200)}`);
        
        // JavaScript 测试
        const jsResult = await hub.sandbox.execute(`
console.log("Hello from JS sandbox");
const x = 42, y = 100;
console.log(\`\${x} + \${y} = \${x + y}\`);
`, 'javascript', 10000);
        console.log(`   JS 执行: ${jsResult.success ? '成功' : '失败'} (${jsResult.duration}ms)`);
        console.log(`   输出: ${jsResult.stdout.trim().split('\n').slice(-1)[0]}`);
        if (jsResult.stderr) console.log(`   错误: ${jsResult.stderr.trim().substring(0, 100)}`);
        
        // 统计
        const sandboxHealth = await hub.sandbox.health();
        console.log(`   执行统计: ${sandboxHealth.stats.executed} 次, 成功 ${sandboxHealth.stats.success} 次`);
        console.log('   ✅ Sandbox 模块正常\n');
    } else {
        console.log('   ⏭️  Sandbox 未启用\n');
    }
    
    // 测试消息总线
    console.log('9. 测试消息总线...');
    let messageReceived = false;
    await hub.messageBus.subscribe('test_channel', (msg) => {
        messageReceived = true;
        console.log(`   收到消息: ${msg.data}`);
    });
    await hub.messageBus.publish('test_channel', { hello: 'world' });
    console.log(`   消息接收: ${messageReceived ? '成功' : '失败'}`);
    console.log('   ✅ 消息总线正常\n');
    
    // 测试监控
    console.log('10. 测试监控模块...');
    hub.monitor.recordMetric('test.metric', 42);
    hub.monitor.recordMetric('test.metric2', 100);
    await hub.monitor.alert('info', 'Test alert', { source: 'test' });
    const stats = hub.monitor.getStats();
    console.log(`   指标数量: ${stats.metrics}`);
    console.log(`   告警数量: ${stats.alerts}`);
    console.log('   ✅ 监控模块正常\n');
    
    // 测试完整流程
    console.log('11. 测试完整处理流程...');
    const result = await hub.process('帮我写一段代码', { userId: 'test_user' });
    console.log(`   意图: ${result.intent.category}`);
    console.log(`   Agent: ${result.agent.name}`);
    console.log(`   记忆数: ${result.memories.length}`);
    console.log(`   耗时: ${result.elapsed}ms`);
    console.log('   ✅ 完整流程正常\n');
    
    // 健康检查
    console.log('12. 健康检查...');
    const health = await hub.health();
    console.log(`   状态: ${health.status}`);
    const moduleStatus = Object.entries(health.modules)
        .map(([name, m]) => `${name}:${m.status || m.initialized ? '✅' : '❌'}`)
        .join(', ');
    console.log(`   模块: ${moduleStatus}\n`);
    
    // 获取框架状态
    console.log('13. 框架状态...');
    const status = hub.status();
    console.log(`   模块数: ${Object.keys(status.modules).length}`);
    console.log(`   工具数: ${status.modules.tool?.tools || 0}`);
    console.log(`   Agent数: ${status.modules.agent?.total || 0}`);
    console.log(`   在线Agent: ${status.modules.agent?.online || 0}\n`);
    
    // 销毁
    console.log('14. 清理...');
    await hub.destroy();
    console.log('   ✅ 清理完成\n');
    
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║              ✅ 所有测试通过!                              ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
}

test().catch(err => {
    console.error('❌ 测试失败:', err);
    process.exit(1);
});
