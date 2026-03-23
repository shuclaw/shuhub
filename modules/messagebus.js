/**
 * MessageBus Module
 * 消息总线 - 模块间通信
 */

const { BaseModule } = require('../base');

class MessageBusModule extends BaseModule {
    constructor() {
        super('MessageBus');
        this.channels = new Map(); // channel -> Set<handler>
        this.messageHistory = new Map(); // channel -> recent messages
        this.maxHistory = 100;
    }
    
    async init(config) {
        await super.init(config);
        this.maxHistory = config.maxHistory || 100;
    }
    
    /**
     * 发布消息到频道
     */
    async publish(channel, message) {
        const handlers = this.channels.get(channel);
        if (!handlers || handlers.size === 0) {
            return;
        }
        
        const wrappedMessage = {
            channel,
            data: message,
            timestamp: Date.now()
        };
        
        // 存储历史
        this.addToHistory(channel, wrappedMessage);
        
        // 分发消息
        for (const handler of handlers) {
            try {
                await handler(wrappedMessage);
            } catch (err) {
                console.error(`[MessageBus] Handler error on ${channel}:`, err.message);
            }
        }
        
        this.emit('message', wrappedMessage);
    }
    
    /**
     * 订阅频道
     */
    async subscribe(channel, handler) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        
        this.channels.get(channel).add(handler);
        console.log(`[MessageBus] Subscribed to: ${channel}`);
        
        return () => this.unsubscribe(channel, handler);
    }
    
    /**
     * 取消订阅
     */
    async unsubscribe(channel, handler) {
        const handlers = this.channels.get(channel);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.channels.delete(channel);
            }
        }
    }
    
    /**
     * 广播到所有订阅者
     */
    async broadcast(message) {
        for (const channel of this.channels.keys()) {
            await this.publish(channel, message);
        }
    }
    
    /**
     * 添加到历史记录
     */
    addToHistory(channel, message) {
        if (!this.messageHistory.has(channel)) {
            this.messageHistory.set(channel, []);
        }
        
        const history = this.messageHistory.get(channel);
        history.push(message);
        
        if (history.length > this.maxHistory) {
            history.shift();
        }
    }
    
    /**
     * 获取频道历史
     */
    getHistory(channel, limit = 50) {
        const history = this.messageHistory.get(channel) || [];
        return history.slice(-limit);
    }
    
    /**
     * 获取频道订阅数
     */
    getSubscriberCount(channel) {
        return this.channels.get(channel)?.size || 0;
    }
    
    /**
     * 获取统计
     */
    getStats() {
        return {
            channels: this.channels.size,
            totalSubscribers: Array.from(this.channels.values()).reduce((sum, s) => sum + s.size, 0),
            channelStats: Array.from(this.channels.keys()).map(ch => ({
                channel: ch,
                subscribers: this.getSubscriberCount(ch),
                historySize: this.messageHistory.get(ch)?.length || 0
            }))
        };
    }
    
    /**
     * 清除频道
     */
    async clearChannel(channel) {
        this.channels.delete(channel);
        this.messageHistory.delete(channel);
    }
    
    status() {
        return {
            ...super.status(),
            ...this.getStats()
        };
    }
}

module.exports = { MessageBusModule };
