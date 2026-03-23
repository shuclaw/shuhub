/**
 * Module Interfaces
 * 
 * 定义所有模块的标准接口
 */

/**
 * Memory Module Interface
 * 记忆模块接口
 */
class IMemory {
    /**
     * 存储记忆
     * @param {string} agentId - Agent ID
     * @param {string} content - 记忆内容
     * @param {object} options - 可选参数 { tags, importance, metadata }
     * @returns {Promise<{id, createdAt}>}
     */
    async store(agentId, content, options) {}
    
    /**
     * 检索记忆
     * @param {string} query - 查询内容
     * @param {object} options - 可选参数 { agentId, teamId, limit, threshold }
     * @returns {Promise<Array<{id, content, similarity}>>}
     */
    async search(query, options) {}
    
    /**
     * 召回最近记忆
     * @param {string} agentId - Agent ID
     * @param {number} limit - 返回数量
     * @returns {Promise<Array>}
     */
    async recent(agentId, limit) {}
    
    /**
     * 删除记忆
     * @param {string} memoryId - 记忆 ID
     */
    async delete(memoryId) {}
    
    /**
     * 清空记忆
     * @param {string} agentId - Agent ID
     */
    async clear(agentId) {}
}

/**
 * Intent Module Interface
 * 意图分类模块接口
 */
class IIntent {
    /**
     * 分类意图
     * @param {string} message - 用户消息
     * @param {object} context - 上下文
     * @returns {Promise<{type, category, confidence, entities}>}
     */
    async classify(message, context) {}
    
    /**
     * 提取实体
     * @param {string} message - 用户消息
     * @returns {Promise<object>}
     */
    async extractEntities(message) {}
}

/**
 * Tool Module Interface
 * 工具模块接口
 */
class ITool {
    /**
     * 注册工具
     * @param {object} toolDef - 工具定义 { name, description, params, handler }
     */
    async register(toolDef) {}
    
    /**
     * 调用工具
     * @param {string} name - 工具名称
     * @param {object} params - 工具参数
     * @returns {Promise<any>}
     */
    async call(name, params) {}
    
    /**
     * 列出所有工具
     * @returns {Promise<Array>}
     */
    async list() {}
    
    /**
     * 获取工具定义
     * @param {string} name - 工具名称
     * @returns {object}
     */
    async get(name) {}
}

/**
 * Routing Module Interface
 * 路由模块接口
 */
class IRouting {
    /**
     * 添加路由规则
     * @param {object} rule - 规则 { pattern, agents, priority }
     */
    async addRule(rule) {}
    
    /**
     * 路由到 Agent
     * @param {object} intent - 意图结果
     * @returns {Promise<string>} - Agent ID
     */
    async route(intent) {}
    
    /**
     * 获取路由规则
     * @returns {Array}
     */
    async getRules() {}
}

/**
 * Workflow Module Interface
 * 工作流模块接口
 */
class IWorkflow {
    /**
     * 处理任务
     * @param {string} userId - 用户 ID
     * @param {string} message - 消息
     * @param {object} context - 上下文
     * @returns {Promise<object>}
     */
    async process(userId, message, context) {}
    
    /**
     * 规划任务
     * @param {string} message - 消息
     * @param {object} intent - 意图
     * @returns {Promise<{steps, estimatedTime}>}
     */
    async plan(message, intent) {}
    
    /**
     * 执行任务
     * @param {object} plan - 计划
     * @returns {Promise<object>}
     */
    async execute(plan) {}
}

/**
 * Agent Module Interface
 * Agent 模块接口
 */
class IAgent {
    /**
     * 运行 Agent
     * @param {object} task - 任务
     * @returns {Promise<object>}
     */
    async run(task) {}
    
    /**
     * 思考
     * @param {string} message - 消息
     * @param {object} memory - 记忆上下文
     * @returns {Promise<string>}
     */
    async think(message, memory) {}
    
    /**
     * 行动
     * @param {string} action - 行动
     * @param {object} params - 参数
     * @returns {Promise<object>}
     */
    async act(action, params) {}
}

/**
 * Storage Module Interface
 * 存储模块接口
 */
class IStorage {
    /**
     * 保存
     * @param {string} key - 键
     * @param {any} value - 值
     * @param {object} options - 可选参数
     */
    async save(key, value, options) {}
    
    /**
     * 加载
     * @param {string} key - 键
     * @returns {Promise<any>}
     */
    async load(key) {}
    
    /**
     * 查询
     * @param {object} query - 查询条件
     * @returns {Promise<Array>}
     */
    async query(query) {}
    
    /**
     * 删除
     * @param {string} key - 键
     */
    async delete(key) {}
}

/**
 * Config Module Interface
 * 配置模块接口
 */
class IConfig {
    /**
     * 获取配置
     * @param {string} key - 配置键
     * @param {any} defaultValue - 默认值
     * @returns {any}
     */
    get(key, defaultValue) {}
    
    /**
     * 设置配置
     * @param {string} key - 配置键
     * @param {any} value - 配置值
     */
    set(key, value) {}
    
    /**
     * 重载配置
     */
    async reload() {}
    
    /**
     * 获取所有配置
     * @returns {object}
     */
    getAll() {}
}

/**
 * MessageBus Module Interface
 * 消息总线接口
 */
class IMessageBus {
    /**
     * 发布消息
     * @param {string} channel - 频道
     * @param {object} message - 消息
     */
    async publish(channel, message) {}
    
    /**
     * 订阅消息
     * @param {string} channel - 频道
     * @param {function} handler - 处理函数
     */
    async subscribe(channel, handler) {}
    
    /**
     * 取消订阅
     * @param {string} channel - 频道
     * @param {function} handler - 处理函数
     */
    async unsubscribe(channel, handler) {}
    
    /**
     * 广播
     * @param {object} message - 消息
     */
    async broadcast(message) {}
}

/**
 * Monitor Module Interface
 * 监控模块接口
 */
class IMonitor {
    /**
     * 健康检查
     * @returns {Promise<object>}
     */
    async health() {}
    
    /**
     * 获取指标
     * @returns {Promise<object>}
     */
    async metrics() {}
    
    /**
     * 发送告警
     * @param {string} level - 级别 error/warning/info
     * @param {string} message - 消息
     * @param {object} data - 数据
     */
    async alert(level, message, data) {}
}

module.exports = {
    IMemory,
    IIntent,
    ITool,
    IRouting,
    IWorkflow,
    IAgent,
    IStorage,
    IConfig,
    IMessageBus,
    IMonitor
};
