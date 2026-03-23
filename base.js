/**
 * TeamHub Modularity Framework
 * 
 * 模块化 Agent 框架
 * 
 * 设计原则：
 * 1. 每个模块单一职责
 * 2. 接口统一，灵活替换
 * 3. 配置驱动，即插即用
 */

const { EventEmitter } = require('events');

/**
 * 基础模块类
 * 所有模块都继承此类
 */
class BaseModule extends EventEmitter {
    constructor(name) {
        super();
        this.name = name;
        this.initialized = false;
        this._moduleConfig = {};
    }
    
    async init(config) {
        this._moduleConfig = config || {};
        this.initialized = true;
        this.emit('init', { module: this.name });
    }
    
    async destroy() {
        this.removeAllListeners();
        this.initialized = false;
    }
    
    async health() {
        return {
            module: this.name,
            status: this.initialized ? 'healthy' : 'uninitialized'
        };
    }
    
    status() {
        return {
            name: this.name,
            initialized: this.initialized
        };
    }
}

module.exports = { BaseModule };
