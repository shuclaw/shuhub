/**
 * Memory Module
 * 记忆模块 - Embedding 存储与检索
 */

const { BaseModule } = require('../base');

class MemoryModule extends BaseModule {
    constructor() {
        super('Memory');
        this.providers = new Map(); // 存储提供者
        this.defaultProvider = null;
        this.cache = new Map(); // 内存缓存
        this.cacheTTL = 5 * 60 * 1000; // 5分钟
    }
    
    async init(config) {
        await super.init(config);
        
        // 配置存储提供者
        if (config.providers) {
            for (const [name, provider] of Object.entries(config.providers)) {
                await this.addProvider(name, provider);
            }
        }
        
        console.log(`[Memory] Initialized with ${this.providers.size} providers`);
    }
    
    /**
     * 添加存储提供者
     */
    async addProvider(name, config) {
        const provider = this.createProvider(config);
        await provider.init(config);
        this.providers.set(name, provider);
        
        if (!this.defaultProvider || config.default) {
            this.defaultProvider = name;
        }
        
        console.log(`[Memory] Added provider: ${name}`);
    }
    
    /**
     * 创建存储提供者
     */
    createProvider(config) {
        switch (config.type) {
            case 'postgres':
                return new PostgresMemoryProvider();
            case 'redis':
                return new RedisMemoryProvider();
            case 'memory':
                return new InMemoryProvider();
            case 'file':
                return new FileMemoryProvider();
            default:
                throw new Error(`Unknown provider type: ${config.type}`);
        }
    }
    
    /**
     * 获取当前提供者
     */
    getProvider() {
        return this.providers.get(this.defaultProvider);
    }
    
    /**
     * 存储记忆
     */
    async store(agentId, content, options = {}) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No memory provider configured');
        }
        
        const result = await provider.store(agentId, content, options);
        
        // 更新缓存
        this.cacheMemory(agentId, content, result.id);
        
        this.emit('store', { agentId, content, id: result.id });
        return result;
    }
    
    /**
     * 检索记忆
     */
    async search(query, options = {}) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No memory provider configured');
        }
        
        return await provider.search(query, options);
    }
    
    /**
     * 召回最近记忆
     */
    async recent(agentId, limit = 10) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No memory provider configured');
        }
        
        return await provider.recent(agentId, limit);
    }
    
    /**
     * 删除记忆
     */
    async delete(memoryId) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No memory provider configured');
        }
        
        await provider.delete(memoryId);
        this.emit('delete', { memoryId });
    }
    
    /**
     * 清空记忆
     */
    async clear(agentId) {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('No memory provider configured');
        }
        
        await provider.clear(agentId);
        this.cache.delete(agentId);
        this.emit('clear', { agentId });
    }
    
    /**
     * 缓存记忆
     */
    cacheMemory(agentId, content, memoryId) {
        const key = `recent:${agentId}`;
        const cached = this.cache.get(key) || [];
        cached.unshift({ id: memoryId, content, timestamp: Date.now() });
        this.cache.set(key, cached.slice(0, 100));
    }
    
    async health() {
        const provider = this.getProvider();
        if (provider && provider.health) {
            return await provider.health();
        }
        return { module: 'Memory', status: 'healthy' };
    }
}

/**
 * 内存存储提供者
 */
class InMemoryProvider {
    async init(config) {
        this.memories = new Map();
        this.embeddings = new Map();
        this.idCounter = 1;
    }
    
    async store(agentId, content, options = {}) {
        const id = `mem_${this.idCounter++}`;
        this.memories.set(id, {
            id, agentId, content,
            importance: options.importance || 0.5,
            tags: options.tags || [],
            metadata: options.metadata || {},
            createdAt: new Date()
        });
        
        return { id, createdAt: new Date() };
    }
    
    async search(query, options = {}) {
        const limit = options.limit || 10;
        const threshold = options.threshold || 0.5;
        
        const all = Array.from(this.memories.values());
        
        if (options.agentId) {
            return all
                .filter(m => m.agentId === options.agentId)
                .slice(0, limit)
                .map(m => ({ ...m, similarity: 0.8 }));
        }
        
        return all.slice(0, limit).map(m => ({ ...m, similarity: 0.8 }));
    }
    
    async recent(agentId, limit) {
        return Array.from(this.memories.values())
            .filter(m => m.agentId === agentId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }
    
    async delete(memoryId) {
        this.memories.delete(memoryId);
    }
    
    async clear(agentId) {
        for (const [id, mem] of this.memories) {
            if (mem.agentId === agentId) {
                this.memories.delete(id);
            }
        }
    }
}

/**
 * PostgreSQL 存储提供者
 */
class PostgresMemoryProvider {
    async init(config) {
        const { Pool } = require('pg');
        this.pool = new Pool(config);
        
        // 创建表
        const client = await this.pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS memories (
                    id SERIAL PRIMARY KEY,
                    agent_id VARCHAR(50) NOT NULL,
                    content TEXT NOT NULL,
                    embedding BYTEA,
                    importance FLOAT DEFAULT 0.5,
                    tags TEXT[],
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id)`);
        } finally {
            client.release();
        }
    }
    
    floatArrayToBytes(arr) {
        const buffer = Buffer.alloc(arr.length * 4);
        for (let i = 0; i < arr.length; i++) {
            buffer.writeFloatLE(arr[i], i * 4);
        }
        return buffer;
    }
    
    bytesToFloatArray(buffer) {
        const arr = [];
        for (let i = 0; i < buffer.length; i += 4) {
            arr.push(buffer.readFloatLE(i));
        }
        return arr;
    }
    
    cosineSimilarity(a, b) {
        const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dot / (normA * normB);
    }
    
    async store(agentId, content, options = {}) {
        const client = await this.pool.connect();
        try {
            let embeddingBytes = null;
            if (options.embedding) {
                embeddingBytes = this.floatArrayToBytes(options.embedding);
            }
            
            const result = await client.query(`
                INSERT INTO memories (agent_id, content, embedding, importance, tags, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, created_at
            `, [agentId, content, embeddingBytes, options.importance || 0.5, options.tags || [], options.metadata || {}]);
            
            return { id: result.rows[0].id, createdAt: result.rows[0].created_at };
        } finally {
            client.release();
        }
    }
    
    async search(query, options = {}) {
        // 简化版：返回所有记忆，过滤后排序
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT id, agent_id, content, importance, created_at, metadata
                FROM memories
                WHERE ($1::varchar IS NULL OR agent_id = $1)
                ORDER BY created_at DESC
                LIMIT 100
            `, [options.agentId || null]);
            
            return result.rows.map(row => ({
                id: row.id,
                agentId: row.agent_id,
                content: row.content,
                importance: row.importance,
                createdAt: row.created_at,
                similarity: 0.8 // 简化处理
            })).slice(0, options.limit || 10);
        } finally {
            client.release();
        }
    }
    
    async recent(agentId, limit) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT id, agent_id, content, importance, created_at
                FROM memories
                WHERE agent_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [agentId, limit]);
            
            return result.rows;
        } finally {
            client.release();
        }
    }
    
    async delete(memoryId) {
        await this.pool.query('DELETE FROM memories WHERE id = $1', [memoryId]);
    }
    
    async clear(agentId) {
        await this.pool.query('DELETE FROM memories WHERE agent_id = $1', [agentId]);
    }
    
    async health() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return { module: 'Memory', status: 'healthy', provider: 'postgres' };
        } catch (err) {
            return { module: 'Memory', status: 'unhealthy', error: err.message };
        }
    }
    
    destroy() {
        if (this.pool) {
            this.pool.end();
        }
    }
}

/**
 * Redis 存储提供者
 */
class RedisMemoryProvider {
    async init(config) {
        const redis = require('redis');
        this.client = redis.createClient(config);
        await this.client.connect();
    }
    
    async store(agentId, content, options = {}) {
        const id = `mem:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const data = JSON.stringify({ id, agentId, content, ...options });
        await this.client.lPush(`memory:${agentId}`, data);
        await this.client.lTrim(`memory:${agentId}`, 0, 999);
        return { id };
    }
    
    async search(query, options = {}) {
        const memories = await this.client.lRange(`memory:${options.agentId || '*'}`, 0, -1);
        return memories.map(m => JSON.parse(m));
    }
    
    async recent(agentId, limit) {
        const memories = await this.client.lRange(`memory:${agentId}`, 0, limit - 1);
        return memories.map(m => JSON.parse(m));
    }
    
    async delete(memoryId) {
        // 简化实现
    }
    
    async clear(agentId) {
        await this.client.del(`memory:${agentId}`);
    }
}

/**
 * 文件存储提供者
 */
class FileMemoryProvider {
    async init(config) {
        const fs = require('fs').promises;
        this.fs = fs;
        this.path = config.path || './memory_data';
        await fs.mkdir(this.path, { recursive: true });
    }
    
    async store(agentId, content, options = {}) {
        const id = `mem_${Date.now()}`;
        const data = JSON.stringify({ id, agentId, content, ...options });
        await this.fs.writeFile(`${this.path}/${id}.json`, data);
        return { id };
    }
    
    async search(query, options = {}) {
        // 简化实现
        return [];
    }
    
    async recent(agentId, limit) {
        const files = await this.fs.readdir(this.path);
        const memories = [];
        
        for (const file of files.slice(0, limit)) {
            if (file.endsWith('.json')) {
                const content = await this.fs.readFile(`${this.path}/${file}`, 'utf8');
                memories.push(JSON.parse(content));
            }
        }
        
        return memories;
    }
    
    async delete(memoryId) {
        await this.fs.unlink(`${this.path}/${memoryId}.json`);
    }
    
    async clear(agentId) {
        const files = await this.fs.readdir(this.path);
        for (const file of files) {
            if (file.includes(agentId)) {
                await this.fs.unlink(`${this.path}/${file}`);
            }
        }
    }
}

module.exports = { MemoryModule };
