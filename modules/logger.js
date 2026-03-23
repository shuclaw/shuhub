/**
 * Logger Module - 结构化日志
 */

const { BaseModule } = require('../base');

class LoggerModule extends BaseModule {
    constructor() {
        super('Logger');
        this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
        this.currentLevel = 'info';
    }
    
    async init(config) {
        await super.init(config);
        this.level = config.level || process.env.LOG_LEVEL || 'info';
        this.format = config.format || 'json';  // json / text
        this.outputs = config.outputs || ['console'];  // console / file / syslog
        
        console.log(`[Logger] Initialized at ${this.level} level`);
    }
    
    formatMessage(level, message, meta = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            module: this.name,
            ...meta
        };
        
        if (this.format === 'json') {
            return JSON.stringify(entry);
        }
        return `[${entry.timestamp}] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    }
    
    error(message, meta) { if (this.levels[this.level] >= 0) console.error(this.formatMessage('error', message, meta)); }
    warn(message, meta) { if (this.levels[this.level] >= 1) console.warn(this.formatMessage('warn', message, meta)); }
    info(message, meta) { if (this.levels[this.level] >= 2) console.log(this.formatMessage('info', message, meta)); }
    debug(message, meta) { if (this.levels[this.level] >= 3) console.log(this.formatMessage('debug', message, meta)); }
    
    // 请求日志
    logRequest(req) {
        this.info('HTTP Request', {
            method: req.method,
            path: req.path,
            ip: req.ip
        });
    }
    
    // 错误日志
    logError(err, context = {}) {
        this.error(err.message, {
            stack: err.stack,
            ...context
        });
    }
    
    async health() {
        return { module: 'Logger', status: 'healthy', level: this.level };
    }
    
    destroy() {}
}

module.exports = { LoggerModule };
