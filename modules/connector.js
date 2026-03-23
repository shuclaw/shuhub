/**
 * Connector Module - 外部Agent连接器
 */

const { BaseModule } = require('../base');

class ConnectorModule extends BaseModule {
    constructor() {
        super('Connector');
        this.agents = new Map();  // agentId -> config
        this.clients = new Map();  // agentId -> client
    }
    
    async init(config) {
        await super.init(config);
        
        // 加载连接器配置
        this.connectors = config.connectors || [];
        
        for (const connector of this.connectors) {
            await this.register(connector);
        }
        
        console.log(`[Connector] Initialized ${this.agents.size} agents`);
    }
    
    /**
     * 注册外部Agent
     */
    async register(config) {
        const { id, type, endpoint, apiKey, ...options } = config;
        
        let client;
        
        switch (type) {
            case 'openclaw':
                client = new OpenClawClient(endpoint, apiKey);
                break;
            case 'rest':
                client = new RESTClient(endpoint, apiKey);
                break;
            case 'websocket':
                client = new WSClient(endpoint, apiKey);
                break;
            case 'crewai':
                client = new CrewAIClient(endpoint, apiKey);
                break;
            default:
                throw new Error(`Unknown connector type: ${type}`);
        }
        
        await client.connect();
        
        this.agents.set(id, { config, client, options });
        this.clients.set(id, client);
        
        console.log(`[Connector] Registered: ${id} (${type})`);
    }
    
    /**
     * 调用Agent
     */
    async call(agentId, message, options = {}) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        
        const startTime = Date.now();
        
        try {
            const result = await agent.client.send(message, {
                timeout: options.timeout || 30000,
                ...options
            });
            
            return {
                success: true,
                agent: agentId,
                result,
                duration: Date.now() - startTime
            };
            
        } catch (err) {
            return {
                success: false,
                agent: agentId,
                error: err.message,
                duration: Date.now() - startTime
            };
        }
    }
    
    /**
     * 批量调用多个Agent
     */
    async broadcast(message, agentIds = null) {
        const targets = agentIds || Array.from(this.agents.keys());
        
        const results = await Promise.all(
            targets.map(id => this.call(id, message))
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
                connected: agent.client.isConnected()
            };
        }
        
        const status = {};
        for (const [id, agent] of this.agents) {
            status[id] = {
                ...agent.config,
                connected: agent.client.isConnected()
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
    
    async health() {
        const connected = Array.from(this.clients.values())
            .filter(c => c.isConnected()).length;
        
        return {
            module: 'Connector',
            status: connected > 0 ? 'healthy' : 'degraded',
            total: this.agents.size,
            connected
        };
    }
    
    async destroy() {
        for (const client of this.clients.values()) {
            await client.disconnect();
        }
        this.agents.clear();
        this.clients.clear();
    }
}

// ==================== Client 实现 ====================

class OpenClawClient {
    constructor(endpoint, apiKey) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.connected = false;
    }
    
    async connect() {
        // 简单连接测试
        try {
            const res = await fetch(`${this.endpoint}/health`);
            this.connected = res.ok;
        } catch {
            this.connected = false;
        }
    }
    
    async send(message, options) {
        const res = await fetch(`${this.endpoint}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({ message }),
            signal: AbortSignal.timeout(options.timeout)
        });
        
        if (!res.ok) throw new Error(`OpenClaw error: ${res.status}`);
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
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({ input: message }),
            signal: AbortSignal.timeout(options.timeout)
        });
        
        if (!res.ok) throw new Error(`REST error: ${res.status}`);
        return await res.json();
    }
    
    isConnected() { return this.connected; }
    async disconnect() {}
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
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            
            this.ws.onopen = () => { this.connected = true; resolve(); };
            this.ws.onerror = reject;
            this.ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                const resolver = this.pending.get(data.id);
                if (resolver) {
                    resolver(data);
                    this.pending.delete(data.id);
                }
            };
        });
    }
    
    async send(message, options) {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36);
            
            this.ws.send(JSON.stringify({ id, message }));
            
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error('Timeout'));
            }, options.timeout || 30000);
            
            this.pending.set(id, (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        });
    }
    
    isConnected() { return this.ws?.readyState === WebSocket.OPEN; }
    
    async disconnect() {
        this.ws?.close();
    }
}

class CrewAIClient extends RESTClient {
    // CrewAI 兼容接口
}

module.exports = { ConnectorModule, OpenClawClient, RESTClient, WSClient };
