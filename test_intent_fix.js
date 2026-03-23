// Test Intent Fix
const { IntentModule } = require('./modules/intent.js');

async function test() {
    const intent = new IntentModule();
    await intent.init({
        rules: [
            { pattern: /代码|编程|开发/, intent: 'code', category: '技术开发' },
            { pattern: /安全|漏洞|审计/, intent: 'security', category: '安全运维' },
            { pattern: /设计|UI|界面/, intent: 'design', category: '创意设计' }
        ]
    });
    
    console.log('测试意图分类:');
    
    const result1 = await intent.classify('帮我写一个用户登录的代码');
    console.log('输入: "帮我写一个用户登录的代码"');
    console.log('结果:', JSON.stringify(result1, null, 2));
    
    const result2 = await intent.classify('发现一个安全漏洞');
    console.log('\n输入: "发现一个安全漏洞"');
    console.log('结果:', JSON.stringify(result2, null, 2));
    
    process.exit(0);
}

test();
