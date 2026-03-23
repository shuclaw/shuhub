/**
 * Routing Module
 * 路由模块 - 任务分发
 */

const { BaseModule } = require('../base');

class RoutingModule extends BaseModule {
    constructor() {
        super('Routing');
        this.rules = [];
        this.agents = new Map(); // agentId -> { name, skills, status, load }
        this.loadBalanceStrategy = 'round_robin';
        this.roundRobinCounters = new Map();
    }
    
    async init(config) {
        await super.init(config);
        
        // 加载路由规则
        if (config.rules) {
            for (const rule of config.rules) {
                this.addRule(rule);
            }
        }
        
        // 加载 Agent 列表
        if (config.agents) {
            for (const [id, agent] of Object.entries(config.agents)) {
                this.registerAgent(id, agent);
            }
        }
        
        this.loadBalanceStrategy = config.loadBalance || 'round_robin';
        
        console.log(`[Routing] Initialized with ${this.rules.length} rules, ${this.agents.size} agents`);
    }
    
    /**
     * 添加路由规则
     */
    addRule(rule) {
        this.rules.push({
            pattern: new RegExp(rule.pattern, rule.flags || 'i'),
            category: rule.category || rule.pattern,
            agents: rule.agents, // 数组，如 ['凌刻', '岩甲']
            priority: rule.priority || 0,
            condition: rule.condition // 可选的条件函数
        });
        
        // 按优先级排序
        this.rules.sort((a, b) => b.priority - a.priority);
    }
    
    /**
     * 注册 Agent
     */
    registerAgent(agentId, config) {
        this.agents.set(agentId, {
            id: agentId,
            name: config.name || agentId,
            role: config.role,
            skills: config.skills || [],
            status: config.status || 'online',
            load: 0,
            lastAssigned: 0
        });
    }
    
    /**
     * 更新 Agent 状态
     */
    updateAgentStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.status = status;
        }
    }
    
    /**
     * 增加 Agent 负载
     */
    incrementLoad(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.load++;
            agent.lastAssigned = Date.now();
        }
    }
    
    /**
     * 减少 Agent 负载
     */
    decrementLoad(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.load = Math.max(0, agent.load - 1);
        }
    }
    
    /**
     * 路由意图到 Agent
     */
    async route(intent) {
        // 1. 根据意图找对应 Agents
        let targetAgents = this.findAgentsByIntent(intent);
        
        if (targetAgents.length === 0) {
            // 默认路由到第一个在线 Agent
            targetAgents = this.getOnlineAgents();
        }
        
        if (targetAgents.length === 0) {
            throw new Error('No available agents');
        }
        
        // 2. 负载均衡选择
        const selectedAgent = this.selectAgent(targetAgents);
        
        // 3. 增加负载
        this.incrementLoad(selectedAgent.id);
        
        return selectedAgent;
    }
    
    /**
     * 根据意图查找 Agents
     */
    findAgentsByIntent(intent) {
        const category = intent.category || intent.type;
        
        // 精确匹配
        for (const rule of this.rules) {
            if (rule.category === category) {
                const matchedAgents = rule.agents
                    .map(name => this.findAgentByName(name))
                    .filter(a => a && a.status === 'online');
                
                if (matchedAgents.length > 0) {
                    return matchedAgents;
                }
            }
        }
        
        // 默认返回所有在线
        return this.getOnlineAgents();
    }
    
    /**
     * 按名字查找 Agent
     */
    findAgentByName(name) {
        for (const agent of this.agents.values()) {
            if (agent.name === name || agent.id === name) {
                return agent;
            }
        }
        return null;
    }
    
    /**
     * 获取所有在线 Agents
     */
    getOnlineAgents() {
        return Array.from(this.agents.values()).filter(a => a.status === 'online');
    }
    
    /**
     * 负载均衡选择
     */
    selectAgent(agents) {
        switch (this.loadBalanceStrategy) {
            case 'round_robin':
                return this.roundRobinSelect(agents);
            case 'least_loaded':
                return this.leastLoadedSelect(agents);
            case 'random':
                return this.randomSelect(agents);
            default:
                return agents[0];
        }
    }
    
    /**
     * 轮询选择
     */
    roundRobinSelect(agents) {
        const key = agents.map(a => a.id).sort().join(',');
        const counter = this.roundRobinCounters.get(key) || 0;
        const selected = agents[counter % agents.length];
        this.roundRobinCounters.set(key, counter + 1);
        return selected;
    }
    
    /**
     * 最小负载选择
     */
    leastLoadedSelect(agents) {
        return agents.reduce((min, agent) => 
            agent.load < min.load ? agent : min
        );
    }
    
    /**
     * 随机选择
     */
    randomSelect(agents) {
        return agents[Math.floor(Math.random() * agents.length)];
    }
    
    /**
     * 获取规则
     */
    getRules() {
        return this.rules.map(r => ({
            pattern: r.pattern.toString(),
            category: r.category,
            agents: r.agents,
            priority: r.priority
        }));
    }
    
    /**
     * 获取所有 Agents
     */
    getAgents() {
        return Array.from(this.agents.values());
    }
    
    status() {
        return {
            ...super.status(),
            rules: this.rules.length,
            agents: this.agents.size,
            online: this.getOnlineAgents().length
        };
    }
}

module.exports = { RoutingModule };
