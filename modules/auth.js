/**
 * Auth Module - 认证/多租户
 */

const { BaseModule } = require('../base');
const crypto = require('crypto');

class AuthModule extends BaseModule {
    constructor() {
        super('Auth');
        this.tenants = new Map();
        this.apiKeys = new Map();
    }
    
    async init(config) {
        await super.init(config);
        
        // 加载租户
        this.tenantsConfig = config.tenants || [];
        for (const tenant of this.tenantsConfig) {
            this.tenants.set(tenant.id, tenant);
        }
        
        // API Key 前缀隔离
        this.keyPrefix = config.keyPrefix || 'th_';
        
        console.log(`[Auth] Initialized with ${this.tenants.size} tenants`);
    }
    
    /**
     * 验证 API Key
     */
    async validateKey(apiKey) {
        if (!apiKey || !apiKey.startsWith(this.keyPrefix)) {
            return null;
        }
        
        // 从缓存或数据库验证
        if (this.apiKeys.has(apiKey)) {
            return this.apiKeys.get(apiKey);
        }
        
        // 查找租户
        for (const [tenantId, tenant] of this.tenants) {
            if (tenant.apiKey === apiKey) {
                const keyData = {
                    tenantId,
                    tenant,
                    scope: tenant.scope || ['*']
                };
                this.apiKeys.set(apiKey, keyData);
                return keyData;
            }
        }
        
        return null;
    }
    
    /**
     * 验证请求
     */
    async authenticate(req) {
        // 从 header 获取 API Key
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!apiKey) {
            return { authenticated: false, error: 'No API key provided' };
        }
        
        const keyData = await this.validateKey(apiKey);
        
        if (!keyData) {
            return { authenticated: false, error: 'Invalid API key' };
        }
        
        return {
            authenticated: true,
            tenantId: keyData.tenantId,
            tenant: keyData.tenant,
            scope: keyData.scope
        };
    }
    
    /**
     * 中间件
     */
    middleware(options = {}) {
        return async (req, res, next) => {
            if (options.exclude && options.exclude.includes(req.path)) {
                return next();
            }
            
            const auth = await this.authenticate(req);
            
            if (!auth.authenticated) {
                return res.status(401).json({ error: auth.error });
            }
            
            // 附加到请求
            req.tenant = auth.tenant;
            req.tenantId = auth.tenantId;
            req.scope = auth.scope;
            
            next();
        };
    }
    
    /**
     * 生成 API Key
     */
    generateKey(prefix = '') {
        const random = crypto.randomBytes(32).toString('hex');
        return `${this.keyPrefix}${prefix}${random}`;
    }
    
    /**
     * 检查租户配额
     */
    async checkQuota(tenantId, resource) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant) return false;
        
        const quota = tenant.quotas?.[resource];
        if (!quota) return true;  // 无限制
        
        // 检查使用量
        const used = await this.getUsage(tenantId, resource);
        return used < quota.limit;
    }
    
    /**
     * 获取使用量
     */
    async getUsage(tenantId, resource) {
        // 从 Redis 或数据库获取
        // 简化实现
        return 0;
    }
    
    async health() {
        return {
            module: 'Auth',
            status: 'healthy',
            tenants: this.tenants.size
        };
    }
    
    destroy() {
        this.tenants.clear();
        this.apiKeys.clear();
    }
}

module.exports = { AuthModule };
