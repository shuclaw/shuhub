/**
 * API Gateway Server - 独立部署的智能路由服务
 * 
 * 提供 REST API 接口给所有 Agent 使用
 * 
 * 端口: 3099
 * 访问: http://localhost:3099
 */

const http = require('http');
const url = require('url');

// 导入API网关
const { APIGatewayModule } = require('./modules/apigateway');

// 创建网关实例
const gateway = new APIGatewayModule();

// 初始化
async function init() {
    await gateway.init({
        apis: {
            ali_coding: {
                name: "阿里云 Coding",
                url: "https://coding.dashscope.aliyuncs.com/v1",
                key: process.env.ALI_API_KEY || 'sk-sp-03a50066a0a9491387fa3257e600030c',
                models: ["qwen3-coder-plus", "qwen3-coder-next", "qwen3.5-plus", "qwen3-max"],
                type: "complex",
                costPer1K: 0.1,
                timeout: 30000
            },
            minimax: {
                name: "MiniMax",
                url: "https://api.minimax.chat/v1",
                key: process.env.MINIMAX_API_KEY || '',
                models: ["MiniMax-M2.5"],
                type: "balanced",
                costPer1K: 0.05,
                timeout: 20000
            },
            local: {
                name: "LM Studio (本地)",
                url: process.env.LM_STUDIO_URL || "http://192.168.50.47:1234/v1",
                key: "local",
                models: ["qwen2.5-coder-7b-instruct", "text-embedding-nomic-embed-text-v1.5"],
                type: "fast",
                costPer1K: 0,
                timeout: 30000
            }
        },
        redis: {
            host: process.env.REDIS_HOST || '172.18.0.3',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || 'redis_kEdWHE'
        },
        pg: {
            host: process.env.PG_HOST || '172.18.0.4',
            port: parseInt(process.env.PG_PORT || '5432'),
            user: process.env.PG_USER || 'user_ifTDmA',
            password: process.env.PG_PASSWORD || 'password_YajPDs',
            database: 'postgres'
        }
    });
    
    console.log('[API Gateway Server] Initialized');
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
    // CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // 记录请求
    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
    
    try {
        // 路由
        if (pathname === '/v1/chat/completions' && req.method === 'POST') {
            await handleChat(req, res);
        }
        else if (pathname === '/v1/models' && req.method === 'GET') {
            await handleModels(req, res);
        }
        else if (pathname === '/status' && req.method === 'GET') {
            await handleStatus(req, res);
        }
        else if (pathname === '/stats' && req.method === 'GET') {
            await handleStats(req, res);
        }
        else if (pathname === '/health' && req.method === 'GET') {
            await handleHealth(req, res);
        }
        else if (pathname === '/config' && req.method === 'GET') {
            await handleConfig(req, res);
        }
        else if (pathname === '/report' && req.method === 'GET') {
            await handleReport(req, res);
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } catch (err) {
        console.error('[Error]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
});

/**
 * POST /v1/chat/completions - 聊天完成
 */
async function handleChat(req, res) {
    const body = await readBody(req);
    const { model, messages, temperature, max_tokens, stream } = body;
    
    if (!model || !messages) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'model and messages are required' }));
        return;
    }
    
    const startTime = Date.now();
    
    try {
        const result = await gateway.chat(model, messages, {
            temperature,
            max_tokens,
            type: 'qa'
        });
        
        // 返回OpenAI兼容格式
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            id: result.requestId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: result.content
                },
                finish_reason: 'stop'
            }],
            usage: result.usage || {},
            _gateway: {
                api: result.api,
                cached: result.cached,
                latency: result.latency
            }
        }));
        
    } catch (err) {
        res.writeHead(err.message.includes('RATE_LIMIT') ? 429 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: {
                message: err.message,
                type: 'api_error'
            }
        }));
    }
}

/**
 * GET /v1/models - 获取可用模型
 */
async function handleModels(req, res) {
    const status = gateway.getStatus();
    const models = [];
    
    for (const [name, api] of Object.entries(status.apis)) {
        for (const model of api.models) {
            models.push({
                id: model,
                object: 'model',
                owned_by: api.name,
                status: api.status
            });
        }
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        object: 'list',
        data: models
    }));
}

/**
 * GET /status - 获取API状态
 */
async function handleStatus(req, res) {
    const status = gateway.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
}

/**
 * GET /stats - 获取统计
 */
async function handleStats(req, res) {
    const report = await gateway.getReport(7);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report, null, 2));
}

/**
 * GET /health - 健康检查
 */
async function handleHealth(req, res) {
    const health = await gateway.health();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
}

/**
 * GET /config - 获取配置 (不包含key)
 */
async function handleConfig(req, res) {
    const status = gateway.getStatus();
    const config = {
        apis: {},
        stats: status.stats
    };
    
    for (const [name, api] of Object.entries(status.apis)) {
        config.apis[name] = {
            name: api.name,
            type: api.type,
            models: api.models,
            status: api.status
        };
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config, null, 2));
}

/**
 * GET /report - 获取报表
 */
async function handleReport(req, res) {
    const days = parseInt(url.parse(req.url, true).query.days || '7');
    const report = await gateway.getReport(days);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report, null, 2));
}

/**
 * 读取请求体
 */
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// 启动服务器
const PORT = parseInt(process.env.APIGATEWAY_PORT || '3099');

init().then(() => {
    server.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log(`API Gateway Server running on port ${PORT}`);
        console.log('='.repeat(50));
        console.log('\nEndpoints:');
        console.log(`  POST /v1/chat/completions - 聊天完成`);
        console.log(`  GET  /v1/models          - 可用模型`);
        console.log(`  GET  /status             - API状态`);
        console.log(`  GET  /stats              - 统计数据`);
        console.log(`  GET  /health             - 健康检查`);
        console.log(`  GET  /config             - 网关配置`);
        console.log(`  GET  /report?days=7      - 使用报表`);
        console.log('\nExample:');
        console.log(`  curl -X POST http://localhost:${PORT}/v1/chat/completions \\`);
        console.log(`    -H "Content-Type: application/json" \\`);
        console.log(`    -d '{"model":"qwen3-coder-plus","messages":[{"role":"user","content":"Hello"}]}'`);
        console.log('='.repeat(50));
    });
}).catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await gateway.destroy();
    server.close();
    process.exit(0);
});
