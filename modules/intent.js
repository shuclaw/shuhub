/**
 * Intent Module v2
 * 意图分类模块 - 智能意图理解
 * 
 * 支持:
 * - 多模式匹配 (关键词/后缀/正则/语义)
 * - 权重评分
 * - 同义词支持
 * - LLM fallback
 * - 学习优化
 */

const { BaseModule } = require('../base');

class IntentModule extends BaseModule {
    constructor() {
        super('Intent');
        this.rules = [];
        this.categories = new Map();
        this.classifiers = new Map();
        this.learning = new Map();  // 从历史学习
        this.cache = new Map();
    }
    
    async init(config) {
        await super.init(config);
        
        // 加载规则
        if (config.rules) {
            for (const rule of config.rules) {
                this.addRule(rule);
            }
        }
        
        // 加载分类器
        if (config.classifiers) {
            for (const [name, cfg] of Object.entries(config.classifiers)) {
                this.classifiers.set(name, this.createClassifier(name, cfg));
            }
        }
        
        // 默认规则 (如果没有配置)
        if (this.rules.length === 0) {
            this.loadDefaultRules();
        }
        
        console.log(`[Intent] Loaded ${this.rules.length} rules, ${this.categories.size} categories`);
    }
    
    /**
     * 添加规则
     */
    addRule(rule) {
        const processedRule = {
            id: rule.id || rule.category,
            category: rule.category,
            priority: rule.priority || 0,
            patterns: (rule.patterns || []).map(p => ({
                type: p.type || 'keyword',
                value: p.value,
                weight: p.weight || 1.0
            })),
            examples: rule.examples || [],
            metadata: rule.metadata || {}
        };
        
        this.rules.push(processedRule);
        
        // 按优先级排序
        this.rules.sort((a, b) => b.priority - a.priority);
        
        return this;
    }
    
    /**
     * 加载默认规则
     */
    loadDefaultRules() {
        this.addRule({
            id: 'code',
            category: '技术开发',
            priority: 10,
            patterns: [
                { type: 'keyword', value: '代码', weight: 1.0 },
                { type: 'keyword', value: '编程', weight: 1.0 },
                { type: 'keyword', value: '开发', weight: 0.8 },
                { type: 'keyword', value: '写代码', weight: 1.0 },
                { type: 'keyword', value: '函数', weight: 0.6 },
                { type: 'keyword', value: '算法', weight: 0.7 },
                { type: 'keyword', value: '调试', weight: 0.8 },
                { type: 'keyword', value: 'bug', weight: 0.9 },
                { type: 'keyword', value: '接口', weight: 0.6 },
                { type: 'suffix', value: '.py', weight: 0.5 },
                { type: 'suffix', value: '.js', weight: 0.5 },
                { type: 'suffix', value: '.java', weight: 0.5 }
            ]
        });
        
        this.addRule({
            id: 'security',
            category: '安全运维',
            priority: 20,
            patterns: [
                { type: 'keyword', value: '漏洞', weight: 1.0 },
                { type: 'keyword', value: '安全', weight: 0.9 },
                { type: 'keyword', value: '注入', weight: 1.0 },
                { type: 'keyword', value: 'XSS', weight: 1.0 },
                { type: 'keyword', value: 'CSRF', weight: 1.0 },
                { type: 'keyword', value: '审计', weight: 0.8 },
                { type: 'keyword', value: '权限', weight: 0.6 },
                { type: 'keyword', value: '渗透', weight: 1.0 },
                { type: 'keyword', value: '加密', weight: 0.7 },
                { type: 'keyword', value: '认证', weight: 0.6 }
            ]
        });
        
        this.addRule({
            id: 'design',
            category: '创意设计',
            priority: 10,
            patterns: [
                { type: 'keyword', value: '设计', weight: 1.0 },
                { type: 'keyword', value: 'UI', weight: 1.0 },
                { type: 'keyword', value: '界面', weight: 0.9 },
                { type: 'keyword', value: '海报', weight: 0.8 },
                { type: 'keyword', value: '图标', weight: 0.8 },
                { type: 'keyword', value: 'logo', weight: 1.0 },
                { type: 'keyword', value: '配色', weight: 0.9 },
                { type: 'keyword', value: '字体', weight: 0.7 },
                { type: 'keyword', value: '排版', weight: 0.8 }
            ]
        });
        
        this.addRule({
            id: 'ops',
            category: '运营客服',
            priority: 10,
            patterns: [
                { type: 'keyword', value: '客服', weight: 1.0 },
                { type: 'keyword', value: '售后', weight: 1.0 },
                { type: 'keyword', value: '咨询', weight: 0.8 },
                { type: 'keyword', value: '退款', weight: 1.0 },
                { type: 'keyword', value: '投诉', weight: 1.0 },
                { type: 'keyword', value: '订单', weight: 0.7 },
                { type: 'keyword', value: '发货', weight: 0.8 },
                { type: 'keyword', value: '优惠', weight: 0.8 },
                { type: 'keyword', value: '活动', weight: 0.7 }
            ]
        });
        
        this.addRule({
            id: 'management',
            category: '管理审批',
            priority: 15,
            patterns: [
                { type: 'keyword', value: '审批', weight: 1.0 },
                { type: 'keyword', value: '申请', weight: 0.8 },
                { type: 'keyword', value: '批准', weight: 1.0 },
                { type: 'keyword', value: '拒绝', weight: 0.9 },
                { type: 'keyword', value: '资源', weight: 0.6 },
                { type: 'keyword', value: '分配', weight: 0.7 },
                { type: 'keyword', value: '调度', weight: 0.8 }
            ]
        });
    }
    
    /**
     * 分类意图
     */
    async classify(message, context = {}) {
        // 1. 缓存检查
        const cacheKey = `${message}:${context.userId || 'anon'}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const startTime = Date.now();
        const scores = {};
        
        // 2. 规则评分
        for (const rule of this.rules) {
            const score = this.calculateScore(message, rule);
            if (score > 0) {
                scores[rule.category] = (scores[rule.category] || 0) + score * rule.priority / 10;
            }
        }
        
        // 3. 分类器评分
        for (const [name, classifier] of this.classifiers) {
            try {
                const result = await classifier.classify(message, context);
                if (result.category && result.confidence) {
                    scores[result.category] = (scores[result.category] || 0) + result.confidence;
                }
            } catch (err) {
                console.warn(`[Intent] Classifier ${name} failed:`, err.message);
            }
        }
        
        // 4. 学习增强 (如果有历史)
        const learnedScore = this.getLearnedScore(message);
        if (learnedScore) {
            scores[learnedScore.category] = (scores[learnedScore.category] || 0) + learnedScore.confidence * 0.3;
        }
        
        // 5. 选择最高分
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        
        let result;
        if (sorted.length > 0 && sorted[0][1] > 0) {
            // 计算置信度：基于分数和第二名差距
            const topScore = sorted[0][1];
            const secondScore = sorted[1]?.[1] || 0;
            const scoreDiff = topScore - secondScore;
            
            // 基础置信度 = 0.5 + 分数相关的部分
            let confidence = 0.5 + Math.min(topScore * 0.1, 0.3);
            
            // 如果明显高于第二名，增加置信度
            if (scoreDiff > 1) {
                confidence = Math.min(confidence + 0.15, 0.95);
            }
            
            result = {
                type: 'classified',
                category: sorted[0][0],
                confidence: Math.min(confidence, 0.95),
                score: topScore,
                allScores: Object.fromEntries(sorted.slice(0, 5)),
                elapsed: Date.now() - startTime
            };
        } else {
            result = {
                type: 'unknown',
                category: 'other',
                confidence: 0,
                score: 0,
                allScores: {},
                elapsed: Date.now() - startTime
            };
        }
        
        // 6. 缓存结果 (5分钟)
        this.cache.set(cacheKey, result);
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        
        this.emit('classify', { message, result });
        return result;
    }
    
    /**
     * 计算消息对规则的匹配分数
     */
    calculateScore(message, rule) {
        let totalWeight = 0;
        let matchedWeight = 0;
        
        for (const pattern of rule.patterns) {
            totalWeight += pattern.weight;
            let matched = false;
            
            switch (pattern.type) {
                case 'keyword':
                    if (message.includes(pattern.value)) {
                        matched = true;
                    }
                    break;
                    
                case 'suffix':
                    if (message.includes(pattern.value)) {
                        matched = true;
                    }
                    break;
                    
                case 'regex':
                    if (new RegExp(pattern.value).test(message)) {
                        matched = true;
                    }
                    break;
                    
                case 'prefix':
                    if (message.startsWith(pattern.value)) {
                        matched = true;
                    }
                    break;
            }
            
            if (matched) {
                matchedWeight += pattern.weight;
            }
        }
        
        // 返回匹配权重占比
        if (totalWeight > 0) {
            return matchedWeight / totalWeight;
        }
        
        return 0;
    }
    
    /**
     * 从学习历史获取增强分数
     */
    getLearnedScore(message) {
        // 简化实现
        const normalized = message.toLowerCase();
        for (const [pattern, data] of this.learning) {
            if (normalized.includes(pattern)) {
                return data;
            }
        }
        return null;
    }
    
    /**
     * 学习 (记录正确分类)
     */
    learn(message, category, correct) {
        const normalized = message.toLowerCase().substring(0, 50);
        
        if (correct) {
            this.learning.set(normalized, {
                category,
                confidence: 0.9,
                count: (this.learning.get(normalized)?.count || 0) + 1
            });
        }
    }
    
    /**
     * 创建分类器
     */
    createClassifier(name, config) {
        switch (name) {
            case 'llm':
                return new LLMClassifier(config);
            case 'rule':
                return new RuleClassifier(this.rules);
            default:
                return null;
        }
    }
    
    /**
     * 获取统计
     */
    getStats() {
        return {
            rules: this.rules.length,
            categories: this.categories.size,
            classifiers: this.classifiers.size,
            cacheSize: this.cache.size,
            learnedPatterns: this.learning.size
        };
    }
    
    async health() {
        return {
            module: 'Intent',
            status: 'healthy',
            rules: this.rules.length,
            categories: this.categories.size
        };
    }
}

/**
 * LLM 分类器
 */
class LLMClassifier {
    constructor(config) {
        this.url = config.url;
        this.model = config.model;
        this.categories = config.categories || ['技术开发', '安全运维', '创意设计', '运营客服', '管理审批'];
        this.timeout = config.timeout || 10000;
    }
    
    async classify(message, context) {
        if (!this.url) {
            return null;
        }
        
        const axios = require('axios');
        
        try {
            const response = await axios.post(this.url, {
                model: this.model,
                messages: [
                    { 
                        role: 'system', 
                        content: `你是一个意图分类器。判断用户消息属于哪个类别：${this.categories.join(', ')}
回复格式：{"category": "类别名", "confidence": 0.9}`
                    },
                    { role: 'user', content: message }
                ],
                max_tokens: 50,
                temperature: 0.1
            }, { timeout: this.timeout });
            
            const content = response.data.choices?.[0]?.message?.content;
            const parsed = JSON.parse(content || '{}');
            
            return {
                category: parsed.category || 'other',
                confidence: parsed.confidence || 0.5
            };
        } catch (err) {
            console.warn('[Intent] LLM classify failed:', err.message);
            return null;
        }
    }
}

/**
 * 规则分类器 (兼容旧接口)
 */
class RuleClassifier {
    constructor(rules) {
        this.rules = rules;
    }
    
    async classify(message, context) {
        for (const rule of this.rules) {
            if (rule.patterns?.some(p => message.includes(p.value))) {
                return {
                    category: rule.category,
                    confidence: 0.8
                };
            }
        }
        return { category: 'other', confidence: 0.3 };
    }
}

module.exports = { IntentModule };
