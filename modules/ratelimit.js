/**
 * RateLimit Module - 限流器
 */

const { BaseModule } = require('../base');

class RateLimitModule extends BaseModule {
    constructor() {
        super('RateLimit');
        this.limits = new Map();
        this.requests = new Map();
    }
    
    async init(config) {
        await super.init(config);
        
        // 默认限制
        this.defaults = {
            window: config.window || 60000,      // 窗口时间(ms)
            max: config.max || 100,               // 最大请求数
            keyPrefix: config.keyPrefix || 'rl:'  // Redis key前缀
        };
        
        // 各端点限制
        this.endpoints = config.endpoints || {
            '/api/tasks': { window: 60000, max: 10 },
            '/api/sandbox': { window: 60000, max: 5 },
            '/api/memory': { window: 60000, max: 50 },
            '/health': { window: 60000, max: 100 }
        };
        
        console.log('[RateLimit] Initialized');
    }
    
    /**
     * 检查限流
     */
    async check(key, endpoint = 'default') {
        const config = this.endpoints[endpoint] || this.defaults;
        const now = Date.now();
        const windowStart = now - config.window;
        
        // 获取该key的请求记录
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const record = this.requests.get(key);
        
        // 清理过期记录
        const validRequests = record.filter(t => t > windowStart);
        this.requests.set(key, validRequests);
        
        // 检查限制
        if (validRequests.length >= config.max) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: validRequests[0] + config.window,
                retryAfter: Math.ceil((validRequests[0] + config.window - now) / 1000)
            };
        }
        
        // 记录请求
        validRequests.push(now);
        
        return {
            allowed: true,
            remaining: config.max - validRequests.length,
            resetAt: now + config.window
        };
    }
    
    /**
     * Express 中间件
     */
    middleware(endpoint) {
        return async (req, res, next) => {
            const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
            const result = await this.check(key, endpoint);
            
            res.set({
                'X-RateLimit-Remaining': result.remaining,
                'X-RateLimit-Reset': result.resetAt
            });
            
            if (!result.allowed) {
                res.set('Retry-After', result.retryAfter);
                return res.status(429).json({
                    error: 'Too Many Requests',
                    retryAfter: result.retryAfter
                });
            }
            
            next();
        };
    }
    
    /**
     * 获取状态
     */
    getStatus() {
        const stats = {};
        for (const [key, record] of this.requests) {
            stats[key] = record.length;
        }
        return stats;
    }
    
    async health() {
        return {
            module: 'RateLimit',
            status: 'healthy',
            activeKeys: this.requests.size
        };
    }
    
    destroy() {
        this.requests.clear();
    }
}

module.exports = { RateLimitModule };
