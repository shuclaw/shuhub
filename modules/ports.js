/**
 * Ports Module - 端口配置管理
 * 所有端口统一配置，模块化
 */

const { BaseModule } = require('../base');

class PortsModule extends BaseModule {
    constructor() {
        super('Ports');
        
        // 默认端口配置
        this.defaults = {
            // 对外服务 (可配置)
            api: {
                port: parseInt(process.env.PORT || 3001),
                protocol: ['http', 'websocket'],
                description: 'REST API + WebSocket 主入口',
                healthPath: '/health'
            },
            openclaw: {
                port: parseInt(process.env.OPENCLAW_PORT || 18789),
                protocol: ['http'],
                description: 'OpenClaw Gateway',
                host: process.env.OPENCLAW_HOST || 'localhost'
            },
            admin: {
                port: parseInt(process.env.ADMIN_PORT || 3002),
                protocol: ['http'],
                description: '管理后台'
            },
            
            // 内部服务 (通常不暴露)
            sandbox: {
                port: parseInt(process.env.SANDBOX_PORT || 3003),
                protocol: ['http'],
                description: 'Sandbox 代码执行服务',
                internal: true  // 不对外暴露
            },
            
            // 数据库
            postgres: {
                host: process.env.PG_HOST || '172.18.0.4',
                port: parseInt(process.env.PG_PORT || 5432),
                user: process.env.PG_USER || 'user_ifTDmA',
                password: process.env.PG_PASSWORD || 'password_YajPDs',
                database: process.env.PG_DB || 'postgres',
                description: 'PostgreSQL'
            },
            redis: {
                host: process.env.REDIS_HOST || '172.18.0.3',
                port: parseInt(process.env.REDIS_PORT || 6379),
                password: process.env.REDIS_PASSWORD || 'redis_kEdWHE',
                description: 'Redis'
            },
            
            // LLM 服务
            lmStudio: {
                host: process.env.LM_STUDIO_HOST || '192.168.50.47',
                port: parseInt(process.env.LM_STUDIO_PORT || 1234),
                description: 'LM Studio (本地模型)',
                model: process.env.LM_STUDIO_MODEL || 'qwen2.5-coder-7b-instruct'
            },
            ollama: {
                host: process.env.OLLAMA_HOST || 'localhost',
                port: parseInt(process.env.OLLAMA_PORT || 11434),
                description: 'Ollama'
            }
        };
        
        this.ports = {};
    }
    
    async init(config) {
        await super.init(config);
        
        // 合并配置
        const userConfig = config || {};
        this.ports = this.loadPorts(userConfig);
        
        console.log('[Ports] Initialized');
        this.logPorts();
    }
    
    /**
     * 加载端口配置
     */
    loadPorts(config) {
        const ports = {};
        
        for (const [key, defaultVal] of Object.entries(this.defaults)) {
            if (defaultVal.internal) {
                // 内部服务只从环境变量读取
                ports[key] = { ...defaultVal };
            } else {
                // 对外服务可配置
                ports[key] = {
                    ...defaultVal,
                    ...(config[key] || {})
                };
            }
        }
        
        return ports;
    }
    
    /**
     * 获取端口配置
     */
    get(name) {
        return this.ports[name];
    }
    
    /**
     * 获取连接 URL
     */
    getUrl(name) {
        const p = this.ports[name];
        if (!p) return null;
        
        if (p.host) {
            return `${p.host}:${p.port}`;
        }
        return `localhost:${p.port}`;
    }
    
    /**
     * 获取 HTTP URL
     */
    getHttpUrl(name) {
        const p = this.ports[name];
        if (!p) return null;
        return `http://${p.host || 'localhost'}:${p.port}`;
    }
    
    /**
     * 获取 WebSocket URL
     */
    getWsUrl(name) {
        const p = this.ports[name];
        if (!p || !p.protocol.includes('websocket')) return null;
        return `ws://${p.host || 'localhost'}:${p.port}`;
    }
    
    /**
     * 打印端口信息
     */
    logPorts() {
        const protocolStr = (p) => Array.isArray(p.protocol) ? p.protocol.join('+') : p.protocol;
        
        console.log('\n[Ports] 配置:');
        
        console.log('\n  对外服务:');
        for (const [name, p] of Object.entries(this.ports)) {
            if (!p.internal) {
                const url = p.host ? `${p.host}:${p.port}` : `:${p.port}`;
                console.log(`    ${name}: ${url} (${protocolStr(p)}) - ${p.description}`);
            }
        }
        
        console.log('\n  内部服务:');
        for (const [name, p] of Object.entries(this.ports)) {
            if (p.internal) {
                console.log(`    ${name}: ${p.host}:${p.port} (内部)`);
            }
        }
        
        console.log('\n  数据库:');
        console.log(`    postgres: ${this.ports.postgres.host}:${this.ports.postgres.port}`);
        console.log(`    redis: ${this.ports.redis.host}:${this.ports.redis.port}`);
        
        console.log('\n  LLM 服务:');
        console.log(`    lmStudio: ${this.ports.lmStudio.host}:${this.ports.lmStudio.port} (${this.ports.lmStudio.model})`);
        console.log(`    ollama: ${this.ports.ollama.host}:${this.ports.ollama.port}`);
        console.log('');
    }
    
    /**
     * 健康检查
     */
    async health() {
        const checks = {};
        let healthy = true;
        
        // 检查端口占用
        for (const [name, p] of Object.entries(this.ports)) {
            if (!p.internal) {
                const inUse = await this.isPortInUse(p.port);
                checks[name] = {
                    port: p.port,
                    inUse,
                    status: inUse ? 'warning' : 'available'
                };
            }
        }
        
        return {
            module: 'Ports',
            status: healthy ? 'healthy' : 'degraded',
            ports: checks
        };
    }
    
    /**
     * 检查端口是否被占用
     */
    async isPortInUse(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.once('error', () => {
                resolve(true);  // 端口被占用
            });
            
            server.once('listening', () => {
                server.close();
                resolve(false);  // 端口可用
            });
            
            server.listen(port, '0.0.0.0');
        });
    }
    
    /**
     * 获取所有端口配置 (用于调试)
     */
    status() {
        return {
            ...super.status(),
            ports: this.ports,
            urls: {
                api: this.getHttpUrl('api'),
                websocket: this.getWsUrl('api'),
                openclaw: this.getHttpUrl('openclaw'),
                sandbox: this.getHttpUrl('sandbox'),
                admin: this.getHttpUrl('admin')
            }
        };
    }
    
    destroy() {}
}

module.exports = { PortsModule };
