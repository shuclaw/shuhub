/**
 * Config Module
 * 配置模块 - 统一配置管理
 */

const { BaseModule } = require('../base');
const fs = require('fs').promises;
const path = require('path');

class ConfigModule extends BaseModule {
    constructor() {
        super('Config');
        this.config = {};
        this.configPath = null;
        this.watchers = new Map();
    }
    
    async init(config) {
        await super.init(config);
        this.configPath = config.path || './config.yaml';
        await this.load();
        
        // 监听文件变化
        if (config.watch) {
            this.watch();
        }
    }
    
    async load() {
        try {
            const content = await fs.readFile(this.configPath, 'utf8');
            this.config = this.parseYAML(content);
            console.log(`[Config] Loaded ${Object.keys(this.config).length} config keys`);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.warn(`[Config] Load failed: ${err.message}`);
            }
            this.config = {};
        }
    }
    
    parseYAML(content) {
        // 简单 YAML 解析
        const lines = content.split('\n');
        const result = {};
        let currentSection = result;
        const stack = [result];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const indent = line.match(/^(\s*)/)[1].length;
            
            if (trimmed.includes(':')) {
                const [key, ...valueParts] = trimmed.split(':');
                const keyName = key.trim();
                const value = valueParts.join(':').trim();
                
                // 栈调整到对应层级
                while (stack.length > indent / 2 + 1) {
                    stack.pop();
                }
                currentSection = stack[stack.length - 1];
                
                if (value) {
                    currentSection[keyName] = this.parseValue(value);
                } else {
                    currentSection[keyName] = {};
                    stack.push(currentSection[keyName]);
                }
            }
        }
        
        return result;
    }
    
    parseValue(value) {
        // 尝试解析为不同类型
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (!isNaN(value) && value !== '') return Number(value);
        
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        
        return value;
    }
    
    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    set(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current)) {
                current[k] = {};
            }
            current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
        this.emit('change', { key, value });
    }
    
    getAll() {
        return { ...this.config };
    }
    
    async reload() {
        await this.load();
        this.emit('reload', this.config);
    }
    
    watch() {
        const watchPath = path.dirname(this.configPath);
        const watchFile = path.basename(this.configPath);
        
        fs.watch(watchPath, (eventType, filename) => {
            if (filename === watchFile && eventType === 'change') {
                this.reload();
            }
        });
    }
    
    status() {
        return {
            name: this.name,
            initialized: this.initialized,
            configKeys: Object.keys(this.config).length
        };
    }
}

module.exports = { ConfigModule };
