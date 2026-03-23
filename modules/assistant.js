/**
 * Assistant Module - 小智前台 (轻量对话入口)
 */

const { BaseModule } = require('../base');

class AssistantModule extends BaseModule {
    constructor() {
        super('Assistant');
        this.name = '小智';
        this.model = null;
        this.enabled = true;
        this.personality = null;
    }
    
    async init(config) {
        await super.init(config);
        
        this.enabled = config.enabled !== false;
        this.name = config.name || '小智';
        this.personality = config.personality || {
            greeting: '你好！我是小智，有什么可以帮你的？',
            farewell: '再见！有需要随时叫我~'
        };
        
        // 模型配置
        this.model = {
            url: config.model?.url || process.env.LLM_URL || 'http://192.168.50.47:1234/v1/chat/completions',
            model: config.model?.model || 'qwen2.5-0.5B',
            maxTokens: config.model?.maxTokens || 512,
            timeout: config.model?.timeout || 5000
        };
        
        // 可处理的轻量任务
        this.lightTasks = [
            '客服', '问答', '闲聊', '陪伴', '提醒', 
            '天气', '日期', '简单转换', 'FAQ'
        ];
        
        // 需要升级的关键词
        this.escalateKeywords = [
            '分析', '报告', '代码', '设计', '开发',
            '审计', '规划', '方案', '文档', 'PPT'
        ];
        
        console.log(`[Assistant] ${this.name} initialized (${this.model.model})`);
    }
    
    /**
     * 处理用户消息
     */
    async process(userMessage, context = {}) {
        if (!this.enabled) {
            // 跳过小智，直连后台
            return { skip: true };
        }
        
        console.log(`[${this.name}] Processing: ${userMessage.substring(0, 50)}...`);
        
        // 1. 判断是否需要升级
        const needEscalate = this.shouldEscalate(userMessage);
        
        if (needEscalate) {
            // 需要升级到后台 Agent
            return {
                escalate: true,
                intent: await this.extractIntent(userMessage),
                reason: 'complex_task',
                message: `这个问题比较专业，我来帮你找到合适的专家...`
            };
        }
        
        // 2. 小智能处理的，直接回答
        const response = await this.generateResponse(userMessage, context);
        
        return {
            escalate: false,
            response,
            from: this.name
        };
    }
    
    /**
     * 判断是否需要升级
     */
    shouldEscalate(text) {
        for (const keyword of this.escalateKeywords) {
            if (text.includes(keyword)) return true;
        }
        return false;
    }
    
    /**
     * 提取意图
     */
    async extractIntent(text) {
        // 简化实现，实际应该调用 intent 模块
        return text.substring(0, 50);
    }
    
    /**
     * 生成回复 (调用小模型)
     */
    async generateResponse(userMessage, context) {
        try {
            const response = await fetch(`${this.model.url}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model.model,
                    messages: [
                        { role: 'system', content: this.buildSystemPrompt() },
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: this.model.maxTokens
                }),
                signal: AbortSignal.timeout(this.model.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`LLM error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices?.[0]?.message?.content || '抱歉，我没理解你的意思。';
            
        } catch (err) {
            console.error(`[${this.name}] Error:`, err.message);
            // 出错时也升级到后台
            return {
                escalate: true,
                error: err.message
            };
        }
    }
    
    /**
     * 构建系统提示
     */
    buildSystemPrompt() {
        return `你是${this.name}，一个友好的AI助手。

特点：
- 亲切、善解人意
- 擅长客服问答、情感陪伴
- 简单问题直接回答
- 复杂问题引导给专业Agent

当用户提出简单问题时，直接回答。
当用户提出专业问题（如代码、安全、设计等）时，说："这个问题比较专业，我来帮你找到合适的专家..."`;
    }
    
    /**
     * 获取状态
     */
    status() {
        return {
            ...super.status(),
            name: this.name,
            enabled: this.enabled,
            model: this.model.model
        };
    }
    
    async health() {
        return {
            module: 'Assistant',
            status: 'healthy',
            name: this.name,
            enabled: this.enabled
        };
    }
    
    destroy() {}
}

module.exports = { AssistantModule };
