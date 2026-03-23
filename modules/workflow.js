/**
 * Workflow Module
 * 工作流模块 - 任务编排
 */

const { BaseModule } = require('../base');

class WorkflowModule extends BaseModule {
    constructor() {
        super('Workflow');
        this.steps = new Map(); // workflowId -> steps
        this.activeTasks = new Map(); // taskId -> task state
        this.maxIterations = 10;
        this.coolingTime = 5000;
        
        // 防循环状态
        this.userLastMessage = new Map(); // userId -> timestamp
        this.agentLastTask = new Map(); // agentId -> timestamp
    }
    
    async init(config) {
        await super.init(config);
        this.maxIterations = config.maxIterations || 10;
        this.coolingTime = config.coolingTime || 5000;
    }
    
    /**
     * 处理任务
     */
    async process(userId, message, context = {}) {
        const startTime = Date.now();
        
        // 1. 冷却检查
        const cooldownResult = this.checkCooldowns(userId, context.agentId);
        if (cooldownResult.blocked) {
            return {
                type: 'cooldown',
                reason: cooldownResult.reason,
                retryAfter: cooldownResult.retryAfter
            };
        }
        
        // 2. 创建任务
        const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const task = {
            id: taskId,
            userId,
            message,
            context,
            status: 'created',
            steps: [],
            createdAt: startTime,
            iterations: (this.activeTasks.get(userId)?.iterations || 0) + 1
        };
        
        this.activeTasks.set(userId, task);
        
        // 3. 规划任务
        const plan = await this.plan(message, context);
        task.steps = plan.steps;
        
        // 4. 执行任务
        const result = await this.execute(task);
        
        // 5. 更新冷却
        this.updateCooldowns(userId, context.agentId);
        
        // 6. 记录到记忆
        if (context.memory) {
            await context.memory.store(context.agentId || userId, message, {
                tags: [context.intent?.category, 'task'],
                metadata: { taskId, result }
            });
        }
        
        return {
            type: 'task',
            taskId,
            plan: plan.steps,
            result,
            elapsed: Date.now() - startTime,
            iterations: task.iterations
        };
    }
    
    /**
     * 规划任务
     */
    async plan(message, context = {}) {
        const steps = [
            {
                step: 1,
                action: 'understand',
                description: '理解任务需求',
                agent: 'system'
            },
            {
                step: 2,
                action: 'route',
                description: `路由到 ${context.agentId || '合适的Agent'}`,
                agent: context.agentId
            },
            {
                step: 3,
                action: 'execute',
                description: '执行具体任务',
                agent: context.agentId
            },
            {
                step: 4,
                action: 'respond',
                description: '返回结果',
                agent: 'system'
            }
        ];
        
        return {
            steps,
            estimatedTime: this.estimateTime(steps)
        };
    }
    
    /**
     * 估算时间
     */
    estimateTime(steps) {
        const baseTimePerStep = {
            understand: 100,
            route: 50,
            execute: 3000,
            respond: 500
        };
        
        const total = steps.reduce((sum, step) => {
            return sum + (baseTimePerStep[step.action] || 1000);
        }, 0);
        
        if (total < 1000) return '< 1秒';
        if (total < 5000) return '1-5秒';
        if (total < 30000) return '5-30秒';
        return '> 30秒';
    }
    
    /**
     * 执行任务
     */
    async execute(task) {
        task.status = 'running';
        
        const results = [];
        for (const step of task.steps) {
            const stepResult = await this.executeStep(step, task);
            results.push(stepResult);
            
            if (stepResult.status === 'failed') {
                task.status = 'failed';
                break;
            }
        }
        
        if (task.status !== 'failed') {
            task.status = 'completed';
        }
        
        this.activeTasks.delete(task.userId);
        
        return {
            status: task.status,
            steps: results,
            completedAt: Date.now()
        };
    }
    
    /**
     * 执行单个步骤
     */
    async executeStep(step, task) {
        const startTime = Date.now();
        
        try {
            let result;
            
            switch (step.action) {
                case 'understand':
                    result = { understanding: '任务已理解' };
                    break;
                    
                case 'route':
                    result = { routedTo: step.agent };
                    break;
                    
                case 'execute':
                    // 调用 Agent 执行
                    result = await this.callAgent(step.agent, task);
                    break;
                    
                case 'respond':
                    result = { response: '任务完成' };
                    break;
                    
                default:
                    result = { message: `执行了 ${step.action}` };
            }
            
            return {
                step: step.step,
                action: step.action,
                status: 'completed',
                result,
                elapsed: Date.now() - startTime
            };
            
        } catch (err) {
            return {
                step: step.step,
                action: step.action,
                status: 'failed',
                error: err.message,
                elapsed: Date.now() - startTime
            };
        }
    }
    
    /**
     * 调用 Agent
     */
    async callAgent(agentId, task) {
        // 实际通过 MessageBus 或直接调用
        if (this.messageBus) {
            const response = await this.messageBus.publish(`agent:${agentId}`, {
                type: 'task',
                task: task.message,
                context: task.context
            });
            return { response };
        }
        
        return { message: `Agent ${agentId} 执行完成` };
    }
    
    /**
     * 设置 MessageBus
     */
    setMessageBus(bus) {
        this.messageBus = bus;
    }
    
    /**
     * 设置 Memory
     */
    setMemory(memory) {
        this.memory = memory;
    }
    
    /**
     * 检查冷却
     */
    checkCooldowns(userId, agentId) {
        const now = Date.now();
        
        // 用户冷却
        const userLast = this.userLastMessage.get(userId);
        if (userLast && now - userLast < this.coolingTime) {
            return {
                blocked: true,
                reason: 'user_cooldown',
                retryAfter: this.coolingTime - (now - userLast)
            };
        }
        
        // Agent 冷却
        if (agentId) {
            const agentLast = this.agentLastTask.get(agentId);
            if (agentLast && now - agentLast < this.coolingTime) {
                return {
                    blocked: true,
                    reason: 'agent_cooldown',
                    retryAfter: this.coolingTime - (now - agentLast)
                };
            }
        }
        
        return { blocked: false };
    }
    
    /**
     * 更新冷却时间
     */
    updateCooldowns(userId, agentId) {
        const now = Date.now();
        this.userLastMessage.set(userId, now);
        if (agentId) {
            this.agentLastTask.set(agentId, now);
        }
    }
    
    /**
     * 获取任务状态
     */
    getTaskStatus(userId) {
        return this.activeTasks.get(userId);
    }
    
    /**
     * 取消任务
     */
    cancelTask(taskId) {
        for (const [userId, task] of this.activeTasks) {
            if (task.id === taskId) {
                task.status = 'cancelled';
                this.activeTasks.delete(userId);
                return true;
            }
        }
        return false;
    }
    
    status() {
        return {
            ...super.status(),
            activeTasks: this.activeTasks.size,
            maxIterations: this.maxIterations,
            coolingTime: this.coolingTime
        };
    }
}

module.exports = { WorkflowModule };
