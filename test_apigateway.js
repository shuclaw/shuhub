/**
 * Test APIGateway Module
 */

const { APIGatewayModule } = require('./modules/apigateway.js');

async function test() {
    console.log('='.repeat(50));
    console.log('APIGateway Module Test');
    console.log('='.repeat(50));
    
    // 创建网关
    const gateway = new APIGatewayModule();
    
    await gateway.init({
        apis: {
            ali_coding: {
                name: "阿里云 Coding",
                url: "https://coding.dashscope.aliyuncs.com/v1",
                key: "sk-sp-03a50066a0a9491387fa3257e600030c",
                models: ["qwen3-coder-plus"],
                type: "complex",
                costPer1K: 0.1
            },
            local: {
                name: "LM Studio (本地)",
                url: "http://192.168.50.47:1234/v1",
                key: "local",
                models: ["qwen2.5-coder-7b-instruct"],
                type: "fast",
                costPer1K: 0
            }
        },
        redis: {
            host: '172.18.0.3',
            port: 6379,
            password: 'redis_kEdWHE'
        },
        pg: {
            host: '172.18.0.4',
            port: 5432,
            user: 'user_ifTDmA',
            password: 'password_YajPDs',
            database: 'postgres'
        }
    });
    
    console.log('\n[1] 网关初始化完成');
    console.log('状态:', JSON.stringify(gateway.getStatus(), null, 2));
    
    // 测试复杂度评估
    console.log('\n[2] 测试复杂度评估');
    const tests = [
        { model: 'qwen3-coder-plus', msg: '你好' },
        { model: 'qwen3-coder-plus', msg: '帮我写一个登录函数' },
        { model: 'qwen3-coder-plus', msg: '帮我分析一下这个Python代码的bug并给出修复方案' }
    ];
    
    for (const t of tests) {
        const complexity = gateway.assessComplexity(t.model, [
            { role: 'user', content: t.msg }
        ]);
        console.log(`  "${t.msg.substring(0, 20)}..." → ${complexity}`);
    }
    
    // 测试实际调用 (用阿里云)
    console.log('\n[3] 测试实际API调用');
    try {
        const result = await gateway.chat(
            'qwen3-coder-plus',
            [{ role: 'user', content: '用一句话介绍JavaScript' }],
            { type: 'qa' }
        );
        console.log('  成功!');
        console.log('  模型:', result.model);
        console.log('  API:', result.api);
        console.log('  延迟:', result.latency, 'ms');
        console.log('  成本:', result.cost, '元');
        console.log('  回答:', result.content.substring(0, 50) + '...');
    } catch (err) {
        console.log('  错误:', err.message);
    }
    
    // 测试缓存 (第二次调用应该命中缓存)
    console.log('\n[4] 测试缓存 (第二次调用)');
    try {
        const result = await gateway.chat(
            'qwen3-coder-plus',
            [{ role: 'user', content: '用一句话介绍JavaScript' }],
            { type: 'qa' }
        );
        console.log('  成功! 缓存命中:', result.cached);
    } catch (err) {
        console.log('  错误:', err.message);
    }
    
    // 最终状态
    console.log('\n[5] 最终状态');
    console.log(JSON.stringify(gateway.getStatus(), null, 2));
    
    await gateway.destroy();
    console.log('\n测试完成!');
    process.exit(0);
}

test().catch(err => {
    console.error('测试失败:', err);
    process.exit(1);
});
