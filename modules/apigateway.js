/**
 * API Gateway Module - 智能路由 + 多API聚合
 * 
 * 功能:
 * - 多API配置/故障切换
 * - 智能路由/复杂度判断
 * - 缓存去重
 * - 熔断器/限流
 * - 成本统计
 * - 告警通知
 */

const { BaseModule } = require('../base');
const crypto = require('crypto');

class APIGatewayModule extends BaseModule {
    constructor() {
        super('APIGateway');
        
        // API 配置
        this.apis = new Map();
        this.redis = null;
        this.pg = null;
        
        // 熔断器状态
        this.circuits = new Map();
        
        // 请求队列
        this.requestQueue = [];
        this.processing = 0;
        
        // 统计数据
        this.stats = {
            total: 0,
            cacheHit: 0,
            errors: 0,
            cost: 0,
            byAPI: new Map(),
            byModel: new Map()
        };
    }
    
    async init(config) {
        await super.init(config);
        
        // 加载API配置
        this.apisConfig = config.apis || this.getDefaultAPIs();
        for (const [name, cfg] of Object.entries(this.apisConfig)) {
            this.apis.set(name, {
                ...cfg,
                name,
                failures: 0,
                status: 'healthy',
                lastSuccess: Date.now(),
                lastFailure: null,
                circuitOpen: false,
                circuitOpenedAt: null
            });
        }
        
        // 初始化数据库连接
        await this.initDatabases(config);
        
        // 缓存TTL配置
        this.cacheTTL = config.cacheTTL || {
            intent: 300,
            qa: 600,
            code: 0,
            embedding: 3600
        };
        
        // 并发控制
        this.maxConcurrency = config.maxConcurrency || 10;
        this.maxQueue = config.maxQueue || 50;
        
        // 成本控制
        this.costLimit = config.costLimit || {
            daily: 100,
            warnAt: 0.8,
            degradeAt: 0.95
        };
        
        // 初始化熔断器
        for (const [name] of this.apis) {
            this.circuits.set(name, {
                failures: 0,
                lastFailure: null,
                state: 'closed', // closed, open, half-open
                successes: 0
            });
        }
        
        console.log(`[APIGateway] Initialized ${this.apis.size} APIs`);
    }
    
    getDefaultAPIs() {
        return {
            ali_coding: {
                name: "阿里云 Coding",
                url: "https://coding.dashscope.aliyuncs.com/v1",
                key: process.env.ALI_API_KEY || '',
                models: ["qwen3-coder-plus", "qwen3-coder-next"],
                type: "complex",
                maxConcurrency: 5,
                timeout: 30000,
                costPer1K: 0.1
            },
            ali_light: {
                name: "阿里云 轻量",
                url: "https://dashscope.aliyuncs.com/v1",
                key: process.env.ALI_API_KEY || '',
                models: ["qwen3.5-plus", "qwen3.5"],
                type: "simple",
                maxConcurrency: 10,
                timeout: 15000,
                costPer1K: 0.02
            },
            minimax: {
                name: "MiniMax",
                url: "https://api.minimax.chat/v1",
                key: process.env.MINIMAX_API_KEY || '',
                models: ["MiniMax-M2.5"],
                type: "balanced",
                maxConcurrency: 8,
                timeout: 20000,
                costPer1K: 0.05
            },
            local: {
                name: "LM Studio (本地)",
                url: process.env.LM_STUDIO_URL || "http://192.168.50.47:1234/v1",
                key: "local",
                models: ["qwen2.5-coder-7b-instruct"],
                type: "fast",
                maxConcurrency: 3,
                timeout: 30000,
                costPer1K: 0
            }
        };
    }
    
    async initDatabases(config) {
        // Redis 连接 (用于缓存和队列)
        if (config.redis) {
            const redis = require('redis');
            this.redis = redis.createClient({
                socket: {
                    host: config.redis.host || '172.18.0.3',
                    port: config.redis.port || 6379
                },
                password: config.redis.password || 'redis_kEdWHE'
            });
            this.redis.on('error', (err) => console.error('[APIGateway] Redis error:', err.message));
            await this.redis.connect();
            console.log('[APIGateway] Redis connected');
        }
        
        // PostgreSQL 连接 (用于存储统计)
        if (config.pg) {
            const { Client } = require('pg');
            this.pg = new Client({
                host: config.pg.host || '172.18.0.4',
                port: config.pg.port || 5432,
                user: config.pg.user || 'user_ifTDmA',
                password: config.pg.password || 'password_YajPDs',
                database: config.pg.database || 'postgres'
            });
            await this.pg.connect();
            await this.initTables();
            console.log('[APIGateway] PostgreSQL connected');
        }
    }
    
    async initTables() {
        await this.pg.query(`
            CREATE TABLE IF NOT EXISTS api_gateway_stats (
                id SERIAL PRIMARY KEY,
                api_name VARCHAR(64),
                model VARCHAR(64),
                request_count INTEGER DEFAULT 0,
                cache_hit INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                total_cost DECIMAL(10,4) DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                avg_latency INTEGER DEFAULT 0,
                date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(api_name, model, date)
            )
        `);
        
        await this.pg.query(`
            CREATE TABLE IF NOT EXISTS api_gateway_logs (
                id SERIAL PRIMARY KEY,
                request_id VARCHAR(64),
                api_name VARCHAR(64),
                model VARCHAR(64),
                prompt TEXT,
                response TEXT,
                latency INTEGER,
                status VARCHAR(32),
                error TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await this.pg.query(`
            CREATE TABLE IF NOT EXISTS api_gateway_alerts (
                id SERIAL PRIMARY KEY,
                alert_type VARCHAR(64),
                api_name VARCHAR(64),
                message TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP
            )
        `);
    }
    
    /**
     * 主入口：发送请求
     */
    async chat(model, messages, options = {}) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        try {
            // 1. 检查队列
            if (this.requestQueue.length >= this.maxQueue) {
                throw new Error('QUEUE_FULL: Request queue is full, please try again later');
            }
            
            // 2. 复杂度判断
            const complexity = this.assessComplexity(model, messages);
            
            // 3. 检查缓存
            const cacheKey = this.getCacheKey(model, messages);
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                this.stats.cacheHit++;
                return {
                    ...cached,
                    cached: true,
                    latency: 0
                };
            }
            
            // 4. 路由选择API
            const api = this.selectAPI(model, complexity);
            
            // 5. 执行请求
            const result = await this.executeWithCircuitBreaker(api, model, messages, options);
            
            // 6. 缓存结果 (包含元数据)
            if (result && this.cacheTTL[options.type || 'qa'] > 0) {
                const cacheData = {
                    content: result.content,
                    usage: result.usage,
                    cost: result.cost,
                    model: result.model,
                    api: api.name,
                    cachedAt: Date.now()
                };
                await this.setCache(cacheKey, cacheData, this.cacheTTL[options.type || 'qa']);
            }
            
            // 7. 记录统计
            await this.recordStats(api.name, model, result, startTime);
            
            // 8. 返回结果
            return {
                requestId,
                ...result,
                api: api.name,
                cached: false,
                latency: Date.now() - startTime
            };
            
        } catch (err) {
            await this.handleError(requestId, err);
            throw err;
        }
    }
    
    /**
     * 复杂度评估
     */
    assessComplexity(model, messages) {
        // 1. 内容判断 (最重要)
        const lastMessage = messages[messages.length - 1]?.content || '';
        const text = typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage);
        
        // 简单特征
        const simplePatterns = [
            /^[^\w]{0,20}$/,  // 很短
            /^(是|好|嗯|对|ok|yes|no)$/i,
            /天气|时间|日期|你好|再见/i
        ];
        
        // 复杂特征
        const complexPatterns = [
            /代码|开发|编程|函数|算法|bug/i,
            /分析|报告|研究|设计|方案/i,
            /\.py$|\.js$|\.java$|\.go$/i,
            /帮我|请|生成|创建|实现/i
        ];
        
        // 先检查内容
        for (const p of simplePatterns) {
            if (p.test(text)) return 'simple';
        }
        
        let complexScore = 0;
        for (const p of complexPatterns) {
            if (p.test(text)) complexScore++;
        }
        
        if (complexScore >= 2 || text.length > 200) {
            return 'complex';
        }
        
        // 2. 模型本身判断 (兜底)
        if (model.includes('coder') || model.includes('max')) {
            return 'complex';
        }
        if (model.includes('0.5B') || model.includes('1.5B') || model.includes('lite')) {
            return 'simple';
        }
        
        return 'medium';
    }
    
    /**
     * 选择API
     */
    selectAPI(model, complexity) {
        // 1. 按模型选择
        for (const [name, api] of this.apis) {
            if (api.models.includes(model)) {
                // 检查熔断器
                if (this.isCircuitOpen(name)) {
                    continue;
                }
                return api;
            }
        }
        
        // 2. 按复杂度选择
        const typeMap = {
            'simple': 'fast',
            'medium': 'simple',
            'complex': 'complex'
        };
        
        const targetType = typeMap[complexity] || 'balanced';
        
        for (const [name, api] of this.apis) {
            if (api.type === targetType && !this.isCircuitOpen(name)) {
                return api;
            }
        }
        
        // 3. 降级到任何可用的
        for (const [name, api] of this.apis) {
            if (!this.isCircuitOpen(name)) {
                return api;
            }
        }
        
        throw new Error('NO_API_AVAILABLE: All APIs are unavailable');
    }
    
    /**
     * 检查熔断器
     */
    isCircuitOpen(name) {
        const circuit = this.circuits.get(name);
        if (!circuit) return false;
        
        if (circuit.state === 'closed') return false;
        
        if (circuit.state === 'open') {
            // 检查是否超时
            if (Date.now() - circuit.openedAt > 60000) {
                circuit.state = 'half-open';
                return false;
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 执行请求 (带熔断器)
     */
    async executeWithCircuitBreaker(api, model, messages, options) {
        const requestId = `req_${Date.now()}`;
        
        try {
            this.processing++;
            const result = await this.executeRequest(api, model, messages, options);
            
            // 成功
            this.recordSuccess(api.name);
            return result;
            
        } catch (err) {
            this.recordFailure(api.name);
            throw err;
        } finally {
            this.processing--;
        }
    }
    
    /**
     * 执行实际请求
     */
    async executeRequest(api, model, messages, options = {}) {
        const url = `${api.url}/chat/completions`;
        
        const body = {
            model: model,
            messages: messages,
            ...(options.stream && { stream: true }),
            ...(options.temperature && { temperature: options.temperature }),
            ...(options.max_tokens && { max_tokens: options.max_tokens })
        };
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), api.timeout || 30000);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.key}`
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                const error = await response.text();
                
                // 限流
                if (response.status === 429) {
                    this.recordFailure(api.name);
                    throw new Error(`RATE_LIMIT: ${error}`);
                }
                
                // 服务错误
                if (response.status >= 500) {
                    this.recordFailure(api.name);
                    throw new Error(`API_ERROR: ${response.status}`);
                }
                
                throw new Error(`REQUEST_FAILED: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 计算成本
            const tokens = data.usage?.total_tokens || 0;
            const cost = (tokens / 1000) * (api.costPer1K || 0);
            this.stats.cost += cost;
            
            return {
                content: data.choices?.[0]?.message?.content || '',
                usage: data.usage,
                cost: cost,
                model: data.model
            };
            
        } catch (err) {
            clearTimeout(timeout);
            
            if (err.name === 'AbortError') {
                throw new Error('TIMEOUT: Request timeout');
            }
            
            throw err;
        }
    }
    
    /**
     * 熔断器 - 记录成功
     */
    recordSuccess(apiName) {
        const circuit = this.circuits.get(apiName);
        if (!circuit) return;
        
        circuit.failures = 0;
        circuit.lastFailure = null;
        
        if (circuit.state === 'half-open') {
            circuit.state = 'closed';
            circuit.successes = 0;
            console.log(`[APIGateway] Circuit closed: ${apiName}`);
        }
    }
    
    /**
     * 熔断器 - 记录失败
     */
    recordFailure(apiName) {
        const circuit = this.circuits.get(apiName);
        if (!circuit) return;
        
        circuit.failures++;
        circuit.lastFailure = Date.now();
        
        // 阈值: 5次失败
        if (circuit.failures >= 5) {
            circuit.state = 'open';
            circuit.openedAt = Date.now();
            console.log(`[APIGateway] Circuit opened: ${apiName}`);
            
            // 记录告警
            this.recordAlert('CIRCUIT_OPEN', apiName, `API ${apiName} circuit breaker opened`);
        }
    }
    
    /**
     * 获取缓存Key
     */
    getCacheKey(model, messages) {
        const content = JSON.stringify(messages);
        const hash = this.hashText(content);
        return `cache:chat:${model}:${hash}`;
    }
    
    /**
     * 简单hash
     */
    hashText(text) {
        return crypto.createHash('sha256').update(text).digest('hex').substring(0, 32);
    }
    
    /**
     * 从缓存获取
     */
    async getFromCache(key) {
        if (!this.redis) return null;
        
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                this.stats.cacheHit++;
                return JSON.parse(cached);
            }
        } catch (err) {
            console.warn('[APIGateway] Cache get error:', err.message);
        }
        
        return null;
    }
    
    /**
     * 设置缓存
     */
    async setCache(key, value, ttl) {
        if (!this.redis) return;
        
        try {
            await this.redis.setEx(key, ttl, JSON.stringify(value));
        } catch (err) {
            console.warn('[APIGateway] Cache set error:', err.message);
        }
    }
    
    /**
     * 记录统计到数据库
     */
    async recordStats(apiName, model, result, startTime) {
        if (!this.pg) return;
        
        this.stats.total++;
        
        const latency = Date.now() - startTime;
        const tokens = result?.usage?.total_tokens || 0;
        const cost = result?.cost || 0;
        
        try {
            await this.pg.query(`
                INSERT INTO api_gateway_stats (api_name, model, request_count, cache_hit, error_count, total_cost, total_tokens, avg_latency, date)
                VALUES ($1, $2, 1, 0, 0, $3, $4, $5, CURRENT_DATE)
            `, [apiName, model, cost, tokens, latency]);
        } catch (err) {
            // 忽略重复键错误
            if (!err.message.includes('duplicate')) {
                console.error('[APIGateway] Stats record error:', err.message);
            }
        }
    }
    
    /**
     * 记录错误
     */
    async handleError(requestId, err) {
        this.stats.errors++;
        
        // 记录错误日志
        console.error(`[APIGateway] ${requestId} Error:`, err.message);
        
        // 记录到数据库
        if (this.pg) {
            try {
                await this.pg.query(`
                    INSERT INTO api_gateway_logs (request_id, status, error, created_at)
                    VALUES ($1, 'error', $2, NOW())
                `, [requestId, err.message]);
            } catch (e) {}
        }
        
        // 检查是否需要告警
        if (err.message.includes('RATE_LIMIT')) {
            await this.recordAlert('RATE_LIMIT', 'unknown', 'API rate limit hit');
        }
        if (err.message.includes('NO_API_AVAILABLE')) {
            await this.recordAlert('NO_API', 'all', 'All APIs unavailable');
        }
    }
    
    /**
     * 记录告警
     */
    async recordAlert(type, apiName, message) {
        console.warn(`[APIGateway] ALERT [${type}] ${apiName}: ${message}`);
        
        if (this.pg) {
            try {
                await this.pg.query(`
                    INSERT INTO api_gateway_alerts (alert_type, api_name, message)
                    VALUES ($1, $2, $3)
                `, [type, apiName, message]);
            } catch (e) {}
        }
    }
    
    /**
     * 获取API状态
     */
    getStatus() {
        const apis = {};
        for (const [name, api] of this.apis) {
            const circuit = this.circuits.get(name);
            apis[name] = {
                name: api.name,
                type: api.type,
                models: api.models,
                status: this.isCircuitOpen(name) ? 'circuit_open' : 'healthy',
                circuitState: circuit?.state || 'closed',
                failures: circuit?.failures || 0,
                lastFailure: api.lastFailure
            };
        }
        
        return {
            apis,
            stats: {
                total: this.stats.total,
                cacheHit: this.stats.cacheHit,
                cacheRate: this.stats.total > 0 ? (this.stats.cacheHit / this.stats.total * 100).toFixed(1) + '%' : '0%',
                errors: this.stats.errors,
                cost: this.stats.cost.toFixed(4),
                queue: this.requestQueue.length,
                processing: this.processing
            }
        };
    }
    
    /**
     * 获取统计报表
     */
    async getReport(days = 7) {
        if (!this.pg) {
            return { error: 'Database not connected' };
        }
        
        try {
            const result = await this.pg.query(`
                SELECT 
                    api_name,
                    SUM(request_count) as total_requests,
                    SUM(cache_hit) as total_cache_hits,
                    SUM(total_cost) as total_cost,
                    SUM(total_tokens) as total_tokens,
                    AVG(avg_latency) as avg_latency
                FROM api_gateway_stats
                WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
                GROUP BY api_name
                ORDER BY total_requests DESC
            `);
            
            return {
                period: `${days} days`,
                apis: result.rows
            };
        } catch (err) {
            return { error: err.message };
        }
    }
    
    /**
     * 健康检查
     */
    async health() {
        const healthyAPIs = [];
        const unhealthyAPIs = [];
        
        for (const [name, api] of this.apis) {
            if (this.isCircuitOpen(name)) {
                unhealthyAPIs.push(name);
            } else {
                healthyAPIs.push(name);
            }
        }
        
        return {
            module: 'APIGateway',
            status: unhealthyAPIs.length === 0 ? 'healthy' : 'degraded',
            healthyAPIs: healthyAPIs.length,
            unhealthyAPIs: unhealthyAPIs.length,
            redis: this.redis ? 'connected' : 'disconnected',
            postgres: this.pg ? 'connected' : 'disconnected',
            queueSize: this.requestQueue.length,
            processing: this.processing
        };
    }
    
    /**
     * 销毁
     */
    async destroy() {
        if (this.redis) await this.redis.quit();
        if (this.pg) await this.pg.end();
    }
}

module.exports = { APIGatewayModule };