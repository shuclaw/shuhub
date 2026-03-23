/**
 * Connector Module - 外部Agent连接器
 * 
 * 支持多种类型的外部Agent连接：
 * - OpenClaw: OpenClaw Bot API
 * - REST: 标准REST API
 * - Telegram: Telegram Bot
 * - WebSocket: WebSocket实时通信
 * 
 * 支持错误回退到本地Sandbox
 */

const { BaseModule } = require('../base');

class ConnectorModule extends BaseModule {
    constructor() {
        super('Connector');
        this.agents = new Map();  // agentId -> { config, client, options }
        this.clients = new Map();  // agentId -> client
        this.sandbox = null;  // 回退用的Sandbox
        this.logger = console;
    }
    
    /**
     * 设置Sandbox（用于错误回退）
     */
    setSandbox(sandbox) {
        this.sandbox = sandbox;
    }
    
    async init(config) {
        await super.init(config);
        
        // 加载连接器配置
        this.connectors = config.connectors || [];
        this.fallbackEnabled = config.fallbackToSandbox !== false;
        
        for (const connector of this.connectors) {
            try {
                await this.register(connector);
            } catch (err) {
                this.logger.warn(`[Connector] Failed to register ${connector.id}: ${err.message}`);
            }
        }
        
        this.logger.log(`[Connector] Initialized ${this.agents.size} agents (fallback: ${this.fallbackEnabled})`);
    }
    
    /**
     * 注册外部Agent
     */
    async register(config) {
        const { id, type, endpoint, apiKey, botToken, timeout, retry, ...options } = config;
        
        if (!id || !type) {
            throw new Error('Connector requires id and type');
        }
        
        let client;
        
        switch (type) {
            case 'openclaw':
            case 'bot':
                client = new OpenClawClient(endpoint, apiKey, botToken);
                break;
            case 'rest':
                client = new RESTClient(endpoint, apiKey);
                break;
            case 'telegram':
                client = new TelegramClient(botToken);
                break;
            case 'websocket':
            case 'ws':
                client = new WSClient(endpoint, apiKey);
                break;
            case 'local':
                // 本地模式，不建立连接
                this.agents.set(id, { config, client: null, options });
                this.logger.log(`[Connector] Registered: ${id} (local)`);
                return;
            default:
                throw new Error(`Unknown connector type: ${type}`);
        }
        
        await client.connect();
        
        this.agents.set(id, { config, client, options, timeout: timeout || 30000, retry: retry || 0 });
        this.clients.set(id, client);
        
        this.logger.log(`[Connector] Registered: ${id} (${type})`);
    }
    
    /**
     * 调用Agent（带重试和回退）
     */
    async call(agentId, message, options = {}) {
        const agent = this.agents.get(agentId);
        
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        
        // 本地Agent，回退到Sandbox
        if (!agent.client) {
            return await this.fallbackToSandbox(agentId, message, options);
        }
        
        const startTime = Date.now();
        let lastError;
        
        // 重试逻辑
        const maxRetry = options.retry || agent.retry || 0;
        for (let attempt = 0; attempt <= maxRetry; attempt++) {
            try {
                const result = await agent.client.send(message, {
                    timeout: options.timeout || agent.timeout,
                    ...options
                });
                
                this.logger.log(`[Connector] ✓ ${agentId} (attempt ${attempt + 1})`);
                
                return {
                    success: true,
                    agent: agentId,
                    result,
                    duration: Date.now() - startTime,
                    attempt: attempt + 1
                };
                
            } catch (err) {
                lastError = err;
                this.logger.warn(`[Connector] ✗ ${agentId} (attempt ${attempt + 1}): ${err.message}`);
                
                if (attempt < maxRetry) {
                    await this.delay(1000 * (attempt + 1));  // 指数退避
                }
            }
        }
        
        // 所有重试都失败，尝试回退
        if (this.fallbackEnabled) {
            this.logger.warn(`[Connector] ${agentId} failed, falling back to Sandbox`);
            return await this.fallbackToSandbox(agentId, message, options);
        }
        
        return {
            success: false,
            agent: agentId,
            error: lastError.message,
            duration: Date.now() - startTime,
            attempts: maxRetry + 1
        };
    }
    
    /**
     * 回退到Sandbox执行
     */
    async fallbackToSandbox(agentId, message, options = {}) {
        if (!this.sandbox) {
            return {
                success: false,
                agent: agentId,
                error: 'Sandbox not available',
                fallback: false
            };
        }
        
        const startTime = Date.now();
        
        try {
            // 简单代码执行
            const code = `
(async () => {
    const message = ${JSON.stringify(message)};
    // 这里应该是Agent的处理逻辑
    return { response: \`[本地模式] 已收到消息: \${message}\`, agent: '${agentId}' };
})();
            `;
            
            const result = await this.sandbox.execute(code, 'javascript', options.timeout || 10000);
            
            return {
                success: true,
                agent: agentId,
                result: result.output,
                duration: Date.now() - startTime,
                fallback: true
            };
            
        } catch (err) {
            return {
                success: false,
                agent: agentId,
                error: err.message,
                duration: Date.now() - startTime,
                fallback: true
            };
        }
    }
    
    /**
     * 批量调用多个Agent
     */
    async broadcast(message, agentIds = null) {
        const targets = agentIds || Array.from(this.agents.keys());
        
        const results = await Promise.all(
            targets.map(id => this.call(id, message).catch(err => ({
                success: false,
                agent: id,
                error: err.message
            })))
        );
        
        return results;
    }
    
    /**
     * 获取Agent状态
     */
    getStatus(agentId = null) {
        if (agentId) {
            const agent = this.agents.get(agentId);
            if (!agent) return null;
            return {
                id: agentId,
                ...agent.config,
                connected: agent.client?.isConnected?.() ?? false,
                local: !agent.client
            };
        }
        
        const status = {};
        for (const [id, agent] of this.agents) {
            status[id] = {
                ...agent.config,
                connected: agent.client?.isConnected?.() ?? false,
                local: !agent.client
            };
        }
        return status;
    }
    
    /**
     * 断开连接
     */
    async disconnect(agentId) {
        const client = this.clients.get(agentId);
        if (client) {
            await client.disconnect();
            this.clients.delete(agentId);
            this.agents.delete(agentId);
        }
    }
    
    /**
     * 健康检查
     */
    async health() {
        const connected = Array.from(this.clients.values())
            .filter(c => c.isConnected()).length;
        
        return {
            module: 'Connector',
            status: this.agents.size > 0 ? 'healthy' : 'degraded',
            total: this.agents.size,
            connected,
            fallbackEnabled: this.fallbackEnabled
        };
    }
    
    /**
     * 销毁
     */
    async destroy() {
        for (const client of this.clients.values()) {
            try {
                await client.disconnect();
            } catch {}
        }
        this.agents.clear();
        this.clients.clear();
    }
    
    /**
     * 延迟
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==================== Client 实现 ====================

class OpenClawClient {
    constructor(endpoint, apiKey, botToken) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.botToken = botToken;
        this.connected = false;
    }
    
    async connect() {
        try {
            // 尝试连接健康检查
            const url = this.endpoint || 'http://localhost:18789';
            const res = await fetch(`${url}/health`);
            this.connected = res.ok;
        } catch {
            this.connected = false;
        }
    }
    
    async send(message, options) {
        const url = this.endpoint || 'http://localhost:18789';
        
        const res = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
                ...(this.botToken && { 'X-Bot-Token': this.botToken })
            },
            body: JSON.stringify({ message }),
            signal: AbortSignal.timeout(options.timeout || 30000)
        });
        
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`OpenClaw error ${res.status}: ${text}`);
        }
        
        return await res.json();
    }
    
    isConnected() { return this.connected; }
    async disconnect() { this.connected = false; }
}

class RESTClient {
    constructor(endpoint, apiKey) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.connected = true;
    }
    
    async connect() {}
    
    async send(message, options) {
        const res = await fetch(`${this.endpoint}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
            },
            body: JSON.stringify({ input: message }),
            signal: AbortSignal.timeout(options.timeout || 30000)
        });
        
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST error ${res.status}: ${text}`);
        }
        
        return await res.json();
    }
    
    isConnected() { return this.connected; }
    async disconnect() {}
}

class TelegramClient {
    constructor(botToken) {
        this.botToken = botToken;
        this.apiUrl = `https://api.telegram.org/bot${botToken}`;
        this.offset = 0;
        this.connected = false;
    }
    
    async connect() {
        try {
            const res = await fetch(`${this.apiUrl}/getMe`);
            const data = await res.json();
            this.connected = data.ok;
        } catch {
            this.connected = false;
        }
    }
    
    async send(message, options) {
        // 发送消息到Telegram
        const res = await fetch(`${this.apiUrl}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: options.chatId || 0,
                text: typeof message === 'string' ? message : JSON.stringify(message)
            }),
            signal: AbortSignal.timeout(options.timeout || 30000)
        });
        
        if (!res.ok) throw new Error(`Telegram error: ${res.status}`);
        return await res.json();
    }
    
    async getUpdates() {
        const res = await fetch(`${this.apiUrl}/getUpdates?offset=${this.offset}&timeout=30`);
        const data = await res.json();
        if (data.ok) {
            const updates = data.result || [];
            if (updates.length > 0) {
                this.offset = updates[updates.length - 1].update_id + 1;
            }
            return updates;
        }
        return [];
    }
    
    isConnected() { return this.connected; }
    async disconnect() { this.connected = false; }
}

class WSClient {
    constructor(endpoint, apiKey) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.ws = null;
        this.pending = new Map();
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.endpoint, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
            });
            
            this.ws.onopen = () => { this.connected = true; resolve(); };
            this.ws.onerror = (e) => { this.connected = false; reject(e); };
            this.ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const resolver = this.pending.get(data.id);
                    if (resolver) {
                        resolver(data);
                        this.pending.delete(data.id);
                    }
                } catch {}
            };
        });
    }
    
    async send(message, options) {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            
            this.ws.send(JSON.stringify({ id, message }));
            
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error('WebSocket timeout'));
            }, options.timeout || 30000);
            
            this.pending.set(id, (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });
    }
    
    isConnected() { return this.ws?.readyState === WebSocket.OPEN; }
    
    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

module.exports = { ConnectorModule, OpenClawClient, RESTClient, TelegramClient, WSClient };
