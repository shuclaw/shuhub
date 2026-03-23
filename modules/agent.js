/**
 * Agent Module
 * Agent 模块 - 智能体执行器
 */

const { BaseModule } = require('../base');

class AgentModule extends BaseModule {
    constructor() {
        super('Agent');
        this.agents = new Map();       // id -> agent instance
        this.llm = null;
    }
    
    async init(config) {
        await super.init(config);
        
        // LLM 配置
        this.llm = config.llm || {
            url: 'http://localhost:1234/v1/chat/completions',
            model: 'qwen2.5-coder-7b-instruct'
        };
        
        // 注册 Agent
        if (config.agents) {
            for (const [id, agentConfig] of Object.entries(config.agents)) {
                this.register(id, agentConfig);
            }
        }
        
        console.log(`[Agent] Initialized with ${this.agents.size} agents`);
    }
    
    /**
     * 注册 Agent
     */
    register(id, config) {
        const agent = {
            id,
            name: config.name || id,
            role: config.role || 'general',
            skills: config.skills || [],
            status: 'offline',
            currentTask: null,
            memory: [],
            config: config
        };
        
        this.agents.set(id, agent);
        this.emit('register', { id, name: agent.name });
        console.log(`[Agent] Registered: ${agent.name} (${id})`);
        
        return agent;
    }
    
    /**
     * 设置 Agent 在线状态
     */
    setOnline(id) {
        const agent = this.agents.get(id);
        if (agent) {
            agent.status = 'online';
            this.emit('status', { id, status: 'online' });
        }
    }
    
    /**
     * 设置 Agent 离线状态
     */
    setOffline(id) {
        const agent = this.agents.get(id);
        if (agent) {
            agent.status = 'offline';
            agent.currentTask = null;
            this.emit('status', { id, status: 'offline' });
        }
    }
    
    /**
     * 执行 Agent 任务
     */
    async run(id, task, context = {}) {
        const agent = this.agents.get(id);
        if (!agent) {
            throw new Error(`Agent not found: ${id}`);
        }
        
        if (agent.status !== 'online') {
            throw new Error(`Agent ${agent.name} is not online`);
        }
        
        agent.currentTask = task;
        this.emit('start', { id, task });
        
        try {
            // 1. 思考
            const thought = await this.think(agent, task, context);
            
            // 2. 行动
            const action = await this.act(agent, thought, context);
            
            agent.currentTask = null;
            this.emit('complete', { id, result: action });
            
            return {
                status: 'success',
                agent: agent.name,
                thought,
                action,
                elapsed: Date.now() - (context.startTime || Date.now())
            };
        } catch (err) {
            agent.currentTask = null;
            this.emit('error', { id, error: err.message });
            return {
                status: 'error',
                agent: agent.name,
                error: err.message
            };
        }
    }
    
    /**
     * Agent 思考
     */
    async think(agent, task, context) {
        const memories = context.memories || [];
        
        // 构建提示
        const prompt = this.buildPrompt(agent, task, memories);
        
        // 调用 LLM
        const response = await this.callLLM(prompt);
        
        return response;
    }
    
    /**
     * Agent 行动
     */
    async act(agent, thought, context) {
        // 根据思考结果执行工具
        if (context.tools && context.tools.length > 0) {
            const results = [];
            for (const toolCall of context.tools) {
                if (context.toolModule) {
                    const result = await context.toolModule.call(toolCall.name, toolCall.params);
                    results.push(result);
                }
            }
            return { thought, actions: results };
        }
        
        return { thought };
    }
    
    /**
     * 构建提示词
     */
    buildPrompt(agent, task, memories) {
        const memoryContext = memories.length > 0
            ? `\n相关记忆：\n${memories.map(m => `- ${m.content}`).join('\n')}`
            : '';
        
        return `你是 ${agent.name}，角色是 ${agent.role}。
技能：${agent.skills.join(', ') || '无'}

${memoryContext}

任务：${task}

请思考并执行任务。`;
    }
    
    /**
     * 调用 LLM
     */
    async callLLM(prompt) {
        const axios = require('axios');
        
        try {
            const response = await axios.post(this.llm.url, {
                model: this.llm.model,
                messages: [
                    { role: 'system', content: '你是一个有帮助的AI助手。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.7
            }, { timeout: 60000 });
            
            return response.data.choices[0].message.content;
        } catch (err) {
            console.error('[Agent] LLM call failed:', err.message);
            return '抱歉，LLM 调用失败';
        }
    }
    
    /**
     * 获取 Agent 信息
     */
    getAgent(id) {
        return this.agents.get(id);
    }
    
    /**
     * 获取所有在线 Agent
     */
    getOnlineAgents() {
        return Array.from(this.agents.values()).filter(a => a.status === 'online');
    }
    
    /**
     * 获取所有 Agent
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    
    status() {
        const agents = this.getAllAgents();
        return {
            ...super.status(),
            total: agents.length,
            online: agents.filter(a => a.status === 'online').length,
            offline: agents.filter(a => a.status === 'offline').length,
            busy: agents.filter(a => a.currentTask !== null).length
        };
    }
}

module.exports = { AgentModule };
