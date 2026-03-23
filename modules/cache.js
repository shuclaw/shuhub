/**
 * Cache Module - Redis缓存层
 */

const { BaseModule } = require('../base');

class CacheModule extends BaseModule {
    constructor() {
        super('Cache');
        this.client = null;
        this.defaultTTL = 300; // 5分钟
    }
    
    async init(config) {
        await super.init(config);
        
        const redis = require('redis');
        this.client = redis.createClient({
            socket: {
                host: config.host || process.env.REDIS_HOST || '172.18.0.3',
                port: config.port || parseInt(process.env.REDIS_PORT || '6379')
            },
            password: config.password || process.env.REDIS_PASSWORD || 'redis_kEdWHE'
        });
        
        this.client.on('error', (err) => this.error = err);
        await this.client.connect();
        
        this.defaultTTL = config.defaultTTL || 300;
        console.log(`[Cache] Connected to Redis`);
    }
    
    /**
     * 获取缓存
     */
    async get(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }
    
    /**
     * 设置缓存
     */
    async set(key, value, ttl = this.defaultTTL) {
        await this.client.setEx(key, ttl, JSON.stringify(value));
    }
    
    /**
     * 删除缓存
     */
    async del(key) {
        await this.client.del(key);
    }
    
    /**
     * 模式删除
     */
    async delPattern(pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
        return keys.length;
    }
    
    /**
     * 缓存记忆 (加速检索)
     */
    async cacheMemory(agentId, query, results, ttl = 600) {
        const key = `cache:memory:${agentId}:${this.hash(query)}`;
        await this.set(key, results, ttl);
    }
    
    /**
     * 缓存意图分类结果
     */
    async cacheIntent(text, intent, ttl = 300) {
        const key = `cache:intent:${this.hash(text)}`;
        await this.set(key, intent, ttl);
    }
    
    /**
     * 简单hash
     */
    hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        }
        return Math.abs(h).toString(36);
    }
    
    async health() {
        try {
            await this.client.ping();
            return { module: 'Cache', status: 'healthy', provider: 'redis' };
        } catch (err) {
            return { module: 'Cache', status: 'unhealthy', error: err.message };
        }
    }
    
    async destroy() {
        if (this.client) await this.client.quit();
    }
}

module.exports = { CacheModule };
