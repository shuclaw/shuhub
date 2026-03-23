/**
 * Tool Module
 * 工具模块 - 工具注册与调用
 */

const { BaseModule } = require('../base');

class ToolModule extends BaseModule {
    constructor() {
        super('Tool');
        this.tools = new Map();      // name -> toolDef
        this.middlewares = [];       // 中间件
    }
    
    async init(config) {
        await super.init(config);
        
        // 注册内置工具
        this.registerBuiltInTools();
        
        console.log(`[Tool] Initialized with ${this.tools.size} tools`);
    }
    
    /**
     * 注册工具
     */
    register(toolDef) {
        if (!toolDef.name) {
            throw new Error('Tool must have a name');
        }
        
        this.tools.set(toolDef.name, {
            name: toolDef.name,
            description: toolDef.description || '',
            params: toolDef.params || [],
            handler: toolDef.handler,
            middlewares: toolDef.middlewares || [],
            metadata: toolDef.metadata || {}
        });
        
        this.emit('register', { name: toolDef.name });
        console.log(`[Tool] Registered: ${toolDef.name}`);
    }
    
    /**
     * 注册内置工具
     */
    registerBuiltInTools() {
        // Web Search
        this.register({
            name: 'web_search',
            description: '网络搜索',
            params: ['query'],
            handler: async ({ query }) => {
                // 实现搜索逻辑
                return { results: [] };
            }
        });
        
        // File Read
        this.register({
            name: 'file_read',
            description: '读取文件',
            params: ['path'],
            handler: async ({ path }) => {
                const fs = require('fs').promises;
                return { content: await fs.readFile(path, 'utf8') };
            }
        });
        
        // File Write
        this.register({
            name: 'file_write',
            description: '写入文件',
            params: ['path', 'content'],
            handler: async ({ path, content }) => {
                const fs = require('fs').promises;
                await fs.writeFile(path, content);
                return { success: true };
            }
        });
    }
    
    /**
     * 调用工具
     */
    async call(name, params, context = {}) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool not found: ${name}`);
        }
        
        // 验证参数
        this.validateParams(tool.params, params);
        
        // 执行中间件
        let processedParams = { ...params };
        for (const mw of this.middlewares) {
            processedParams = await mw(processedParams, context);
        }
        
        // 执行中间件 (tool level)
        for (const mw of tool.middlewares) {
            processedParams = await mw(processedParams, context);
        }
        
        // 调用处理器
        const startTime = Date.now();
        try {
            const result = await tool.handler(processedParams, context);
            
            this.emit('call', {
                tool: name,
                params: processedParams,
                duration: Date.now() - startTime,
                success: true
            });
            
            return result;
        } catch (err) {
            this.emit('error', { tool: name, error: err.message });
            throw err;
        }
    }
    
    /**
     * 验证参数
     */
    validateParams(expected, actual) {
        const missing = expected.filter(p => !(p in actual));
        if (missing.length > 0) {
            throw new Error(`Missing params: ${missing.join(', ')}`);
        }
    }
    
    /**
     * 添加中间件
     */
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }
    
    /**
     * 列出所有工具
     */
    list() {
        return Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            params: t.params
        }));
    }
    
    /**
     * 获取工具定义
     */
    get(name) {
        return this.tools.get(name);
    }
    
    /**
     * 移除工具
     */
    remove(name) {
        const removed = this.tools.delete(name);
        if (removed) {
            this.emit('remove', { name });
        }
        return removed;
    }
    
    status() {
        return {
            ...super.status(),
            tools: this.tools.size,
            middlewares: this.middlewares.length
        };
    }
}

module.exports = { ToolModule };
