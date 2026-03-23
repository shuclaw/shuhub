/**
 * Exporter Module - 文件导出与组织
 */

const { BaseModule } = require('../base');
const fs = require('fs').promises;
const path = require('path');

class ExporterModule extends BaseModule {
    constructor() {
        super('Exporter');
        this.root = null;
    }
    
    async init(config) {
        await super.init(config);
        
        this.root = config.root || '/data/teamhub/exports';
        this.categories = config.categories || this.getDefaultCategories();
        this.cleanup = config.cleanup;
        
        // 创建目录结构
        await this.ensureDirectories();
        
        console.log(`[Exporter] Root: ${this.root}`);
    }
    
    getDefaultCategories() {
        return [
            { name: 'code', label: '代码开发', agents: ['凌刻'] },
            { name: 'security', label: '安全审计', agents: ['岩甲'] },
            { name: 'design', label: '设计创作', agents: ['小绘'] },
            { name: 'ops', label: '运营推广', agents: ['布土拨'] },
            { name: 'management', label: '管理审批', agents: ['鼠爪'] }
        ];
    }
    
    /**
     * 创建目录结构
     */
    async ensureDirectories() {
        const dirs = [
            this.root,
            `${this.root}/memory/agent`,
            `${this.root}/memory/category`,
            `${this.root}/memory/user_pref`,
            `${this.root}/materials/templates`,
            `${this.root}/materials/cases`,
            `${this.root}/materials/assets`,
            `${this.root}/production/drafts`,
            `${this.root}/production/completed`,
            `${this.root}/production/archived`
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }
    
    /**
     * 导出文件
     */
    async export(agentId, content, metadata = {}) {
        const {
            category = 'general',
            subcategory = 'default',
            filename,
            format = 'txt'
        } = metadata;
        
        // 生成文件名
        const name = filename || this.generateFileName(agentId, category, subcategory);
        const timestamp = Date.now();
        const fullName = `${timestamp}_${name}.${format}`;
        
        // 确定路径
        const categoryDir = this.getCategoryDir(category, agentId);
        const fullPath = path.join(categoryDir, fullName);
        
        // 写入文件
        await fs.writeFile(fullPath, content);
        
        // 更新 Redis 状态
        await this.updateAgentStatus(agentId, category, subcategory, '进行中');
        
        return {
            path: fullPath,
            relativePath: path.relative(this.root, fullPath),
            filename: fullName,
            category,
            subcategory,
            agentId,
            timestamp
        };
    }
    
    /**
     * 生成文件名
     */
    generateFileName(agentId, category, subcategory) {
        const parts = [agentId, category];
        if (subcategory) parts.push(subcategory);
        return parts.join('_');
    }
    
    /**
     * 获取分类目录
     */
    getCategoryDir(category, agentId = null) {
        if (agentId) {
            return `${this.root}/memory/agent/${agentId}`;
        }
        return `${this.root}/memory/category/${category}`;
    }
    
    /**
     * 完成文件
     */
    async complete(filePath, metadata = {}) {
        const filename = path.basename(filePath);
        const completedPath = `${this.root}/production/completed/${filename}`;
        
        await fs.rename(filePath, completedPath);
        
        // 更新状态
        await this.updateAgentStatus(
            metadata.agentId || 'unknown',
            metadata.category || 'unknown',
            metadata.subcategory || 'unknown',
            '已完成'
        );
        
        return completedPath;
    }
    
    /**
     * 更新Agent状态 (Redis)
     */
    async updateAgentStatus(agentId, category, subcategory, status) {
        // 依赖 Redis 模块
        if (this.redis) {
            const key = `agent:status:${agentId}`;
            const value = `${category}-${subcategory}-${status}`;
            await this.redis.set(key, value, { EX: 86400 });
        }
    }
    
    /**
     * 设置Redis引用
     */
    setRedis(redis) {
        this.redis = redis;
    }
    
    /**
     * 归档旧文件
     */
    async archive(olderThanDays = 30) {
        const completedDir = `${this.root}/production/completed`;
        const archivedDir = `${this.root}/production/archived`;
        
        const files = await fs.readdir(completedDir);
        const now = Date.now();
        const cutoff = olderThanDays * 24 * 60 * 60 * 1000;
        
        const archived = [];
        for (const file of files) {
            const filePath = path.join(completedDir, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtimeMs > cutoff) {
                await fs.rename(filePath, path.join(archivedDir, file));
                archived.push(file);
            }
        }
        
        return archived;
    }
    
    /**
     * 清理草稿
     */
    async cleanupDrafts(olderThanDays = 7) {
        const draftsDir = `${this.root}/production/drafts`;
        
        const files = await fs.readdir(draftsDir);
        const now = Date.now();
        const cutoff = olderThanDays * 24 * 60 * 60 * 1000;
        
        const deleted = [];
        for (const file of files) {
            const filePath = path.join(draftsDir, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtimeMs > cutoff) {
                await fs.unlink(filePath);
                deleted.push(file);
            }
        }
        
        return deleted;
    }
    
    /**
     * 获取统计
     */
    async getStats() {
        const stats = {
            total: 0,
            byCategory: {},
            byStatus: {
                drafts: 0,
                completed: 0,
                archived: 0
            }
        };
        
        const dirs = [
            { path: `${this.root}/production/drafts`, key: 'drafts' },
            { path: `${this.root}/production/completed`, key: 'completed' },
            { path: `${this.root}/production/archived`, key: 'archived' }
        ];
        
        for (const dir of dirs) {
            try {
                const files = await fs.readdir(dir.path);
                stats.byStatus[dir.key] = files.length;
                stats.total += files.length;
            } catch {}
        }
        
        return stats;
    }
    
    async health() {
        return {
            module: 'Exporter',
            status: 'healthy',
            root: this.root,
            categories: this.categories.length
        };
    }
    
    destroy() {}
}

module.exports = { ExporterModule };
