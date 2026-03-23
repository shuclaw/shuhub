// Test Intent v2 - 优化后的意图分类
const { IntentModule } = require('./modules/intent.js');

async function test() {
    console.log('='.repeat(50));
    console.log('Intent Module v2 Test');
    console.log('='.repeat(50));
    
    const intent = new IntentModule();
    await intent.init({});
    
    console.log('\n规则统计:', intent.getStats());
    console.log('已加载规则:', intent.rules.length);
    
    const testCases = [
        '帮我写一个用户登录的代码',
        '发现一个SQL注入漏洞',
        '设计一个logo',
        '我要申请服务器资源',
        '这个订单什么时候发货',
        '帮我审计一下这段代码',
        '做一个用户界面UI',
        '客服在吗',
        '帮我优化一下算法',
        '这个功能需要审批'
    ];
    
    console.log('\n测试结果:');
    console.log('-'.repeat(50));
    
    for (const text of testCases) {
        const result = await intent.classify(text);
        console.log(`\n输入: "${text}"`);
        console.log(`分类: ${result.category}`);
        console.log(`置信度: ${(result.confidence * 100).toFixed(0)}%`);
        console.log(`分数: ${result.score.toFixed(2)}`);
        console.log(`耗时: ${result.elapsed}ms`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 测试完成');
    console.log('='.repeat(50));
    
    process.exit(0);
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
