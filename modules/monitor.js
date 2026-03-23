/**
 * Monitor Module
 * 监控模块 - 健康检查、指标、告警
 */

const { BaseModule } = require('../base');

class MonitorModule extends BaseModule {
    constructor() {
        super('Monitor');
        this.metrics = new Map();     // metric name -> { value, timestamp }
        this.alerts = [];             // 告警历史
        this.alertHandlers = [];       // 告警处理函数
        this.historyLimit = 1000;      // 历史记录上限
    }
    
    async init(config) {
        await super.init(config);
        
        this.historyLimit = config.historyLimit || 1000;
        this.alertThreshold = config.alertThreshold || {
            memory_usage: 90,
            cpu_usage: 95,
            error_rate: 0.05
        };
        
        // 注册默认告警处理器
        this.registerAlertHandler(this.defaultAlertHandler.bind(this));
        
        console.log('[Monitor] Initialized');
    }
    
    /**
     * 记录指标
     */
    recordMetric(name, value, tags = {}) {
        this.metrics.set(name, {
            value,
            tags,
            timestamp: Date.now(),
            count: (this.metrics.get(name)?.count || 0) + 1
        });
        
        this.emit('metric', { name, value, tags });
    }
    
    /**
     * 获取指标
     */
    getMetric(name) {
        return this.metrics.get(name);
    }
    
    /**
     * 获取所有指标
     */
    getAllMetrics() {
        const result = {};
        for (const [name, metric] of this.metrics) {
            result[name] = metric;
        }
        return result;
    }
    
    /**
     * 健康检查
     */
    async health() {
        const health = {
            module: 'Monitor',
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: Date.now()
        };
        
        // 检查告警阈值
        const memUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
        if (memUsage > this.alertThreshold.memory_usage) {
            await this.alert('warning', 'High memory usage', { usage: memUsage });
            health.status = 'degraded';
        }
        
        return health;
    }
    
    /**
     * 发送告警
     */
    async alert(level, message, data = {}) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            level,  // error, warning, info
            message,
            data,
            timestamp: Date.now()
        };
        
        this.alerts.unshift(alert);
        
        // 限制历史记录
        if (this.alerts.length > this.historyLimit) {
            this.alerts.pop();
        }
        
        this.emit('alert', alert);
        
        // 执行告警处理函数
        for (const handler of this.alertHandlers) {
            try {
                await handler(alert);
            } catch (err) {
                console.error('[Monitor] Alert handler error:', err.message);
            }
        }
        
        return alert;
    }
    
    /**
     * 注册告警处理器
     */
    registerAlertHandler(handler) {
        this.alertHandlers.push(handler);
    }
    
    /**
     * 默认告警处理器
     */
    async defaultAlertHandler(alert) {
        console.log(`[Monitor] Alert [${alert.level}]: ${alert.message}`, alert.data);
        
        // 根据级别处理
        if (alert.level === 'error') {
            // 错误级别：发送 Webhook 或通知
            if (this.webhook) {
                await this.sendWebhook(alert);
            }
        }
    }
    
    /**
     * 设置 Webhook
     */
    setWebhook(url) {
        this.webhook = url;
    }
    
    /**
     * 发送 Webhook
     */
    async sendWebhook(alert) {
        if (!this.webhook) return;
        
        const axios = require('axios');
        try {
            await axios.post(this.webhook, alert, { timeout: 5000 });
        } catch (err) {
            console.error('[Monitor] Webhook failed:', err.message);
        }
    }
    
    /**
     * 获取告警历史
     */
    getAlertHistory(limit = 50) {
        return this.alerts.slice(0, limit);
    }
    
    /**
     * 获取错误统计
     */
    getErrorStats() {
        const errors = this.alerts.filter(a => a.level === 'error');
        const warnings = this.alerts.filter(a => a.level === 'warning');
        
        return {
            total: this.alerts.length,
            errors: errors.length,
            warnings: warnings.length,
            info: this.alerts.length - errors.length - warnings.length
        };
    }
    
    /**
     * 指标统计
     */
    getStats() {
        const stats = {
            metrics: this.metrics.size,
            alerts: this.alerts.length,
            alertHandlers: this.alertHandlers.length,
            errorStats: this.getErrorStats()
        };
        
        return stats;
    }
    
    /**
     * 清除历史告警
     */
    clearHistory() {
        this.alerts = [];
        this.emit('clear');
    }
    
    status() {
        return {
            ...super.status(),
            ...this.getStats()
        };
    }
}

module.exports = { MonitorModule };
