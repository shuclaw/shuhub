/**
 * TeamHub Server - HTTP + WebSocket API
 * 
 * 提供统一的 REST API 和 WebSocket 接口
 * 
 * 端口配置:
 * - 3001: REST API + WebSocket
 * - 18789: OpenClaw Gateway
 * - 3002: 管理后台
 * - 3003: Sandbox (内部)
 */

const { Hub } = require('./hub');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.PORT || 3001);

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           TeamHub Modular Framework Server              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // 初始化 Hub (端口配置会在 init 时加载)
    const hub = new Hub({
        llm: {
            url: process.env.LLM_URL || 'http://192.168.50.47:1234/v1/chat/completions',
            model: process.env.LLM_MODEL || 'qwen2.5-coder-7b-instruct'
        }
    });
    
    // 加载配置
    await hub.init({
        config: { path: './config.yaml' },
        messageBus: { maxHistory: 100 },
        monitor: { historyLimit: 100 },
        memory: {
            providers: {
                default: { 
                    type: process.env.MEMORY_TYPE || 'memory',
                    ...(process.env.MEMORY_TYPE === 'postgres' ? {
                        host: process.env.PG_HOST || '172.18.0.4',
                        port: parseInt(process.env.PG_PORT || '5432'),
                        user: process.env.PG_USER || 'user_ifTDmA',
                        password: process.env.PG_PASSWORD || 'password_YajPDs',
                        database: process.env.PG_DB || 'postgres'
                    } : {})
                }
            }
        },
        intent: {
            rules: [
                { pattern: '代码|开发|debug|编程', category: 'code', agents: ['凌刻'], priority: 2 },
                { pattern: '安全|审计|漏洞|入侵', category: 'security', agents: ['岩甲'], priority: 2 },
                { pattern: '设计|UI|素材|图片', category: 'design', agents: ['小绘'], priority: 2 },
                { pattern: '运营|推广|增长|营销', category: 'ops', agents: ['布土拨'], priority: 2 },
                { pattern: '审批|总览|管理', category: 'management', agents: ['鼠爪'], priority: 1 }
            ]
        },
        routing: {
            agents: {
                lingke: { name: '凌刻', role: '技术', skills: ['nodejs', 'python'], status: 'online' },
                yanjia: { name: '岩甲', role: '安全', skills: ['security', 'audit'], status: 'online' },
                xiaohui: { name: '小绘', role: '设计', skills: ['ui', 'design'], status: 'online' },
                bufu: { name: '布土拨', role: '运营', skills: ['marketing', 'growth'], status: 'online' },
                shuzhua: { name: '鼠爪', role: '总指挥', skills: ['management'], status: 'online' }
            }
        },
        workflow: { maxIterations: 10, coolingTime: 1000 },
        storage: {
            providers: {
                default: { 
                    type: process.env.STORAGE_TYPE || 'memory',
                    ...(process.env.STORAGE_TYPE === 'postgres' ? {
                        host: process.env.PG_HOST || '172.18.0.4',
                        port: parseInt(process.env.PG_PORT || '5432'),
                        user: process.env.PG_USER || 'user_ifTDmA',
                        password: process.env.PG_PASSWORD || 'password_YajPDs',
                        database: process.env.PG_DB || 'postgres'
                    } : {})
                }
            }
        },
        sandbox: {
            provider: process.env.SANDBOX_TYPE || 'subprocess',
            config: {
                image: process.env.SANDBOX_IMAGE || 'python:3.11-slim',
                network: false,
                memory: process.env.SANDBOX_MEMORY || '256m'
            }
        },
        dmzAgent: {
            enabled: true,
            internet_access: process.env.DMZ_INTERNET !== 'false',
            can_write_db: false,
            require_approval: true,
            local_storage: process.env.DMZ_PATH || '/data/dmz/downloads'
        },
        // 端口配置
        ports: {
            api: { port: parseInt(process.env.PORT || 3001) },
            openclaw: { port: parseInt(process.env.OPENCLAW_PORT || 18789) },
            admin: { port: parseInt(process.env.ADMIN_PORT || 3002) }
        }
    });
    
    console.log('[Server] Hub initialized successfully\n');
    
    // Express App
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    
    // ==================== REST API ====================
    
    // 健康检查
    app.get('/health', async (req, res) => {
        try {
            const health = await hub.health();
            res.json({ ok: health.status === 'healthy', ...health });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // 状态
    app.get('/status', (req, res) => {
        res.json(hub.status());
    });
    
    // 端口配置
    app.get('/ports', (req, res) => {
        try {
            res.json(hub.ports ? hub.ports.status() : { error: 'Ports not initialized' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    
    // 发送消息/任务
    app.post('/tasks', async (req, res) => {
        try {
            const { message, userId, options } = req.body;
            const result = await hub.process(message, { userId, ...options });
            res.json({ ok: true, ...result });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // 意图分类
    app.post('/intent/classify', async (req, res) => {
        try {
            const { text } = req.body;
            const intent = await hub.intent.classify(text);
            res.json({ ok: true, ...intent });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // 路由
    app.post('/routing/route', async (req, res) => {
        try {
            const { category, context } = req.body;
            const agent = await hub.routing.route({ category, context });
            res.json({ ok: true, agent });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // 记忆存储
    app.post('/memory/store', async (req, res) => {
        try {
            const { agentId, content, metadata } = req.body;
            const result = await hub.memory.store(agentId, content, metadata);
            res.json({ ok: true, id: result });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // 记忆搜索
    app.post('/memory/search', async (req, res) => {
        try {
            const { query, agentId, limit } = req.body;
            const results = await hub.memory.search(query, { agentId, limit });
            res.json({ ok: true, results });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // 存储操作
    app.post('/storage/save', async (req, res) => {
        try {
            const { key, value, options } = req.body;
            await hub.storage.save(key, value, options);
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    app.get('/storage/load/:key', async (req, res) => {
        try {
            const value = await hub.storage.load(req.params.key);
            res.json({ ok: true, value });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // Sandbox 执行
    app.post('/sandbox/execute', async (req, res) => {
        try {
            const { code, language, timeout } = req.body;
            const result = await hub.sandbox.execute(code, language, timeout);
            res.json({ ok: true, ...result });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // DMZ 审批列表
    app.get('/dmz/pending', (req, res) => {
        const pending = hub.dmzAgent.getPendingApprovals();
        res.json({ ok: true, pending });
    });
    
    // DMZ 审批
    app.post('/dmz/approve', async (req, res) => {
        try {
            const { fileId, moveToDb } = req.body;
            await hub.dmzAgent.approve(fileId, moveToDb);
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    app.post('/dmz/reject', async (req, res) => {
        try {
            const { fileId } = req.body;
            await hub.dmzAgent.reject(fileId);
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
    
    // ==================== WebSocket ====================
    
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });
    
    const clients = new Map();
    
    wss.on('connection', (ws, req) => {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        clients.set(clientId, { ws, subscriptions: new Set() });
        console.log(`[WS] Client connected: ${clientId}`);
        
        ws.send(JSON.stringify({ type: 'connected', clientId }));
        
        ws.on('message', async (data) => {
            try {
                const msg = JSON.parse(data.toString());
                
                switch (msg.type) {
                    case 'subscribe':
                        // 订阅频道
                        const client = clients.get(clientId);
                        if (client) client.subscriptions.add(msg.channel);
                        ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }));
                        break;
                        
                    case 'task':
                        // 异步任务
                        const result = await hub.process(msg.message, { userId: clientId });
                        ws.send(JSON.stringify({ 
                            type: 'task_result', 
                            taskId: msg.taskId,
                            ...result 
                        }));
                        break;
                        
                    default:
                        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
                }
            } catch (err) {
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
            }
        });
        
        ws.on('close', () => {
            clients.delete(clientId);
            console.log(`[WS] Client disconnected: ${clientId}`);
        });
    });
    
    // 广播消息给订阅者
    hub.messageBus.subscribe('broadcast', (msg) => {
        const message = JSON.stringify({ type: 'broadcast', ...msg });
        for (const [id, client] of clients) {
            if (client.subscriptions.has(msg.channel || 'default')) {
                client.ws.send(message);
            }
        }
    });
    
    // 启动
    server.listen(PORT, () => {
        const portInfo = hub.ports ? hub.ports.get('api') : { port: PORT };
        console.log(`[Server] HTTP + WebSocket listening on port ${portInfo.port}`);
        console.log(`[Server] Health: http://localhost:${PORT}/health`);
        console.log(`[Server] API docs: http://localhost:${PORT}/status\n`);
    });
    
    // 优雅关闭
    process.on('SIGTERM', async () => {
        console.log('\n[Server] Shutting down...');
        await hub.destroy();
        server.close();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('[Server] Fatal error:', err);
    process.exit(1);
});
