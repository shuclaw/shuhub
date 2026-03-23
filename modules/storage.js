/**
 * Storage Module
 * 存储模块 - 统一持久化存储
 */

const { BaseModule } = require('../base');

class StorageModule extends BaseModule {
    constructor() {
        super('Storage');
        this.providers = new Map();  // type -> provider instance
        this.defaultProvider = null;
    }
    
    async init(config) {
        await super.init(config);
        
        // 初始化存储提供者
        if (config.providers) {
            for (const [name, providerConfig] of Object.entries(config.providers)) {
                await this.addProvider(name, providerConfig);
            }
        }
        
        // 默认使用 postgres
        if (!this.defaultProvider && this.providers.has('postgres')) {
            this.defaultProvider = 'postgres';
        }
        
        console.log(`[Storage] Initialized with ${this.providers.size} providers`);
    }
    
    /**
     * 添加存储提供者
     */
    async addProvider(name, config) {
        let provider;
        
        switch (config.type) {
            case 'memory':
                provider = new MemoryStorageProvider();
                break;
            case 'postgres':
                provider = new PostgresStorageProvider();
                break;
            case 'redis':
                provider = new RedisStorageProvider();
                break;
            case 'file':
                provider = new FileStorageProvider();
                break;
            case 's3':
                provider = new S3StorageProvider();
                break;
            default:
                throw new Error(`Unknown storage type: ${config.type}`);
        }
        
        await provider.init(config);
        this.providers.set(name, provider);
        
        if (config.default || !this.defaultProvider) {
            this.defaultProvider = name;
        }
        
        console.log(`[Storage] Added provider: ${name} (${config.type})`);
    }
    
    /**
     * 获取提供者
     */
    getProvider(name) {
        return this.providers.get(name || this.defaultProvider);
    }
    
    /**
     * 保存
     */
    async save(key, value, options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider) {
            throw new Error('No storage provider available');
        }
        return await provider.save(key, value, options);
    }
    
    /**
     * 加载
     */
    async load(key, options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider) {
            throw new Error('No storage provider available');
        }
        return await provider.load(key, options);
    }
    
    /**
     * 查询
     */
    async query(query, options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider) {
            throw new Error('No storage provider available');
        }
        return await provider.query(query, options);
    }
    
    /**
     * 删除
     */
    async delete(key, options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider) {
            throw new Error('No storage provider available');
        }
        return await provider.delete(key, options);
    }
    
    /**
     * 列出 keys
     */
    async list(pattern = '*', options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider) {
            throw new Error('No storage provider available');
        }
        return await provider.list(pattern, options);
    }
    
    /**
     * 获取统计
     */
    async stats(options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider || !provider.stats) {
            return { available: false };
        }
        return await provider.stats(options);
    }
    
    status() {
        return {
            ...super.status(),
            providers: Array.from(this.providers.keys()),
            default: this.defaultProvider
        };
    }
}

/**
 * Memory 存储提供者 (测试用)
 */
class MemoryStorageProvider {
    async init(config) {
        this.data = new Map();
        this.ttl = config.ttl || 0;  // 0 = 永不过期
    }

    async save(key, value, metadata = {}) {
        const expireAt = this.ttl > 0 ? Date.now() + this.ttl : 0;
        this.data.set(key, { value, metadata, expireAt });
        return key;
    }

    async load(key) {
        const item = this.data.get(key);
        if (!item) return null;
        if (item.expireAt && Date.now() > item.expireAt) {
            this.data.delete(key);
            return null;
        }
        return item.value;
    }

    async delete(key) {
        return this.data.delete(key);
    }

    async search(query) {
        const results = [];
        for (const [key, item] of this.data) {
            if (JSON.stringify(item.value).includes(query)) {
                results.push({ key, value: item.value, metadata: item.metadata });
            }
        }
        return results;
    }

    async health() {
        return { provider: 'MemoryStorageProvider', status: 'healthy' };
    }

    async destroy() {
        this.data.clear();
    }
}

/**
 * PostgreSQL 存储提供者
 */
class PostgresStorageProvider {
    async init(config) {
        const { Pool } = require('pg');
        this.pool = new Pool(config);
        this.table = config.table || 'storage';
        
        // 创建表
        const client = await this.pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS ${this.table} (
                    key VARCHAR(255) PRIMARY KEY,
                    value JSONB NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
        } finally {
            client.release();
        }
    }
    
    async save(key, value, options = {}) {
        const client = await this.pool.connect();
        try {
            await client.query(`
                INSERT INTO ${this.table} (key, value, metadata, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
            `, [key, JSON.stringify(value), JSON.stringify(options.metadata || {})]);
            
            return { key, saved: true };
        } finally {
            client.release();
        }
    }
    
    async load(key, options = {}) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT value FROM ${this.table} WHERE key = $1`,
                [key]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return result.rows[0].value;
        } finally {
            client.release();
        }
    }
    
    async query(query, options = {}) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT key, value, metadata FROM ${this.table} WHERE value @> $1`,
                [JSON.stringify(query)]
            );
            
            return result.rows.map(r => ({
                key: r.key,
                value: r.value,
                metadata: r.metadata
            }));
        } finally {
            client.release();
        }
    }
    
    async delete(key, options = {}) {
        const client = await this.pool.connect();
        try {
            await client.query(`DELETE FROM ${this.table} WHERE key = $1`, [key]);
            return { key, deleted: true };
        } finally {
            client.release();
        }
    }
    
    async list(pattern, options = {}) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT key FROM ${this.table} WHERE key LIKE $1`,
                [pattern.replace('*', '%')]
            );
            return result.rows.map(r => r.key);
        } finally {
            client.release();
        }
    }
}

/**
 * Redis 存储提供者
 */
class RedisStorageProvider {
    async init(config) {
        // 懒加载 redis
        const redis = require('redis');
        this.client = redis.createClient(config);
        await this.client.connect();
        this.prefix = config.prefix || 'storage:';
    }
    
    async save(key, value, options = {}) {
        const fullKey = this.prefix + key;
        await this.client.set(fullKey, JSON.stringify(value));
        
        if (options.ttl) {
            await this.client.expire(fullKey, options.ttl);
        }
        
        return { key, saved: true };
    }
    
    async load(key, options = {}) {
        const fullKey = this.prefix + key;
        const value = await this.client.get(fullKey);
        return value ? JSON.parse(value) : null;
    }
    
    async query(query, options = {}) {
        // Redis 不支持复杂查询，返回所有匹配的 key
        const keys = await this.client.keys(this.prefix + '*');
        const results = [];
        
        for (const key of keys) {
            const value = await this.client.get(key);
            const parsed = JSON.parse(value);
            
            let match = true;
            for (const [k, v] of Object.entries(query)) {
                if (parsed[k] !== v) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                results.push({
                    key: key.replace(this.prefix, ''),
                    value: parsed
                });
            }
        }
        
        return results;
    }
    
    async delete(key, options = {}) {
        await this.client.del(this.prefix + key);
        return { key, deleted: true };
    }
    
    async list(pattern, options = {}) {
        const keys = await this.client.keys(this.prefix + pattern.replace('*', '*'));
        return keys.map(k => k.replace(this.prefix, ''));
    }
}

/**
 * 文件存储提供者
 */
class FileStorageProvider {
    async init(config) {
        const fs = require('fs').promises;
        this.fs = fs;
        this.path = config.path || './storage';
        await fs.mkdir(this.path, { recursive: true });
    }
    
    async save(key, value, options = {}) {
        const filePath = `${this.path}/${key}.json`;
        await this.fs.writeFile(filePath, JSON.stringify(value, null, 2));
        return { key, saved: true };
    }
    
    async load(key, options = {}) {
        const filePath = `${this.path}/${key}.json`;
        try {
            const content = await this.fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }
    
    async query(query, options = {}) {
        // 文件系统不支持复杂查询
        return [];
    }
    
    async delete(key, options = {}) {
        const filePath = `${this.path}/${key}.json`;
        try {
            await this.fs.unlink(filePath);
            return { key, deleted: true };
        } catch {
            return { key, deleted: false };
        }
    }
    
    async list(pattern, options = {}) {
        const files = await this.fs.readdir(this.path);
        const regex = new RegExp(pattern.replace('*', '.*'));
        return files.filter(f => regex.test(f)).map(f => f.replace('.json', ''));
    }
}

/**
 * S3 存储提供者
 */
class S3StorageProvider {
    async init(config) {
        // S3 实现暂缺，需要 @aws-sdk/client-s3
        this.bucket = config.bucket;
        this.prefix = config.prefix || '';
        console.warn('[Storage] S3 provider not fully implemented');
    }
    
    async save(key, value, options = {}) {
        // TODO: 实现 S3 上传
        return { key, saved: false, error: 'S3 not implemented' };
    }
    
    async load(key, options = {}) {
        return null;
    }
    
    async query(query, options = {}) {
        return [];
    }
    
    async delete(key, options = {}) {
        return { key, deleted: false };
    }
    
    async list(pattern, options = {}) {
        return [];
    }
}

module.exports = { StorageModule };
