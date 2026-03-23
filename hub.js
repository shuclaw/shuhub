/**
 * Hub - ShuHub 模块化框架核心 (v2)
 * 
 * 整合所有模块，提供统一入口
 * 
 * 模块列表 (20个):
 * - 核心: BaseModule
 * - 数据: Memory, Storage, Cache
 * - 业务: Intent, Routing, Workflow, Approval, Safety
 * - 执行: Agent, Connector, Sandbox, DMZ Agent
 * - 入口: Assistant (小智)
 * - 基础设施: Config, Logger, RateLimit, Auth, MessageBus, Monitor, Ports, Exporter
 */

const { BaseModule } = require('./base');

// 核心
const { ConfigModule } = require('./modules/config');
const { LoggerModule } = require('./modules/logger');
const { MessageBusModule } = require('./modules/messagebus');
const { MonitorModule } = require('./modules/monitor');

// 数据
const { MemoryModule } = require('./modules/memory');
const { StorageModule } = require('./modules/storage');
const { CacheModule } = require('./modules/cache');

// 业务
const { IntentModule } = require('./modules/intent');
const { RoutingModule } = require('./modules/routing');
const { WorkflowModule } = require('./modules/workflow');
const { ApprovalModule } = require('./modules/approval');
const { SafetyModule } = require('./modules/safety');

// 执行
const { AgentModule } = require('./modules/agent');
const { ToolModule } = require('./modules/tool');
const { ConnectorModule } = require('./modules/connector');
const { SandboxModule } = require('./modules/sandbox');
const { DMZAgentModule } = require('./modules/dmz_agent');

// 入口
const { AssistantModule } = require('./modules/assistant');

// 基础设施
const { RateLimitModule } = require('./modules/ratelimit');
const { AuthModule } = require('./modules/auth');
const { PortsModule } = require('./modules/ports');
const { ExporterModule } = require('./modules/exporter');

class Hub extends BaseModule {
    constructor(config = {}) {
        super('Hub');
        
        // 核心模块
        this.config = new ConfigModule();
        this.logger = new LoggerModule();
        this.messageBus = new MessageBusModule();
        this.monitor = new MonitorModule();
        
        // 数据模块
        this.memory = new MemoryModule();
        this.storage = new StorageModule();
        this.cache = new CacheModule();
        
        // 业务模块
        this.intent = new IntentModule();
        this.routing = new RoutingModule();
        this.workflow = new WorkflowModule();
        this.approval = new ApprovalModule();
        this.safety = new SafetyModule();
        
        // 执行模块
        this.agent = new AgentModule();
        this.tool = new ToolModule();
        this.connector = new ConnectorModule();
        this.sandbox = new SandboxModule();
        this.dmzAgent = new DMZAgentModule();
        
        // 入口模块
        this.assistant = new AssistantModule();
        
        // 基础设施模块
        this.rateLimit = new RateLimitModule();
        this.auth = new AuthModule();
        this.ports = new PortsModule();
        this.exporter = new ExporterModule();
        
        // LLM 配置
        this.llm = config.llm;
        
        // 引用引用 (交叉引用)
        this._crossReferences = {};
    }
    
    /**
     * 初始化所有模块
     */
    async init(config = {}) {
        await super.init(config || {});
        
        // 初始化配置 (最先)
        if (config.config) {
            await this.config.init(config.config);
        }
        
        // 初始化日志
        if (config.logger) {
            await this.logger.init(config.logger);
        } else {
            // 默认配置
            await this.logger.init({ level: 'info', format: 'text' });
        }
        
        // 初始化消息总线
        if (config.messageBus) {
            await this.messageBus.init(config.messageBus);
        }
        
        // 初始化监控
        if (config.monitor) {
            await this.monitor.init(config.monitor);
        }
        
        // 初始化缓存
        if (config.cache) {
            await this.cache.init(config.cache);
        }
        
        // 初始化存储 (在缓存之后，因为缓存可能依赖)
        if (config.storage) {
            await this.storage.init(config.storage);
        }
        
        // 初始化记忆 (依赖 storage)
        if (config.memory) {
            await this.memory.init({
                ...config.memory,
                storage: this.storage
            });
        }
        
        // 初始化意图分类
        if (config.intent) {
            await this.intent.init(config.intent);
        }
        
        // 初始化工具 (在其他业务模块之后)
        if (config.tool) {
            await this.tool.init(config.tool);
        }
        
        // 初始化路由
        if (config.routing) {
            await this.routing.init(config.routing);
        }
        
        // 初始化工作流 (依赖 memory)
        if (config.workflow) {
            await this.workflow.init(config.workflow);
            this.workflow.setMessageBus(this.messageBus);
            this.workflow.setMemory(this.memory);
        }
        
        // 初始化 Agent (依赖 memory, tool)
        if (config.agent) {
            await this.agent.init({
                ...config.agent,
                llm: this.llm || config.agent.llm
            });
        }
        
        // 初始化 DMZ Agent
        if (config.dmzAgent) {
            await this.dmzAgent.init(config.dmzAgent);
            this.dmzAgent.setStorageModule(this.storage);
        }
        
        // 初始化 Sandbox
        if (config.sandbox) {
            await this.sandbox.init(config.sandbox);
        }
        
        // 初始化审批 (依赖 storage)
        if (config.approval) {
            await this.approval.init(config.approval);
        }
        
        // 初始化安全模块
        if (config.safety) {
            await this.safety.init(config.safety);
        }
        
        // 初始化导出器
        if (config.exporter) {
            await this.exporter.init(config.exporter);
            this.exporter.setRedis(this._getRedis());
        }
        
        // 初始化连接器
        if (config.connector) {
            await this.connector.init(config.connector);
        }
        
        // 初始化端口配置
        if (config.ports) {
            await this.ports.init(config.ports);
        }
        
        // 初始化限流
        if (config.rateLimit) {
            await this.rateLimit.init(config.rateLimit);
        }
        
        // 初始化认证
        if (config.auth) {
            await this.auth.init(config.auth);
        }
        
        // 初始化小智前台 (依赖 intent, routing)
        if (config.assistant) {
            await this.assistant.init(config.assistant);
        }
        
        // 设置交叉引用
        this._setupCrossReferences();
        
        // 注册默认工具
        this.registerDefaultTools();
        
        // 记录启动
        this.monitor.recordMetric('hub.started', Date.now());
        
        this.logger.info('[Hub] All modules initialized');
    }
    
    /**
     * 设置交叉引用
     */
    _setupCrossReferences() {
        // Cache 需要 Redis
        if (this.cache && this._redis) {
            // cache 已自行连接 Redis
        }
        
        // Exporter 需要 Redis
        if (this.exporter && this._redis) {
            this.exporter.setRedis(this._redis);
        }
        
        // DMZ Agent 需要 approval
        if (this.dmzAgent && this.approval) {
            this.dmzAgent.setApprovalModule(this.approval);
        }
    }
    
    /**
     * 获取 Redis 实例 (如果有)
     */
    _getRedis() {
        // 从 cache 模块获取
        if (this.cache && this.cache.client) {
            return this.cache.client;
        }
        return null;
    }
    
    /**
     * 注册默认工具
     */
    registerDefaultTools() {
        // 记忆工具
        this.tool.register({
            name: 'memory_search',
            description: '搜索记忆',
            params: ['query', 'agentId'],
            handler: async ({ query, agentId }) => {
                return await this.memory.search(query, { agentId });
            }
        });
        
        this.tool.register({
            name: 'memory_store',
            description: '存储记忆',
            params: ['agentId', 'content'],
            handler: async ({ agentId, content }) => {
                return await this.memory.store(agentId, content);
            }
        });
        
        // 路由工具
        this.tool.register({
            name: 'route_task',
            description: '路由任务到 Agent',
            params: ['intent'],
            handler: async ({ intent }) => {
                return await this.routing.route(intent);
            }
        });
        
        // 意图分类工具
        this.tool.register({
            name: 'classify_intent',
            description: '分类消息意图',
            params: ['message'],
            handler: async ({ message }) => {
                return await this.intent.classify(message);
            }
        });
        
        // 存储工具
        this.tool.register({
            name: 'storage_save',
            description: '保存数据到存储',
            params: ['key', 'value'],
            handler: async ({ key, value }) => {
                return await this.storage.save(key, value);
            }
        });
        
        this.tool.register({
            name: 'storage_load',
            description: '从存储加载数据',
            params: ['key'],
            handler: async ({ key }) => {
                return await this.storage.load(key);
            }
        });
        
        this.logger.info('[Hub] Default tools registered');
    }
    
    /**
     * 处理用户消息 (主入口)
     * 
     * @param {string} message - 用户消息
     * @param {object} context - 上下文 { userId, sessionId, skipAssistant }
     * @returns {object} 处理结果
     */
    async process(message, context = {}) {
        const startTime = Date.now();
        
        try {
            // 0. 限流检查
            if (this.rateLimit) {
                const key = context.userId || context.ip || 'anonymous';
                const limit = await this.rateLimit.check(key, context.endpoint || 'default');
                if (!limit.allowed) {
                    return {
                        error: 'rate_limited',
                        message: '请求过于频繁，请稍后再试',
                        retryAfter: limit.retryAfter
                    };
                }
            }
            
            // 1. 小智前台处理 (可选)
            let skipAssistant = context.skipAssistant || false;
            let assistantResult = null;
            
            if (this.assistant && !skipAssistant) {
                assistantResult = await this.assistant.process(message, context);
                
                // 如果小智可以直接回答
                if (!assistantResult.escalate) {
                    return {
                        from: 'assistant',
                        response: assistantResult.response,
                        elapsed: Date.now() - startTime
                    };
                }
                
                // 小智认为需要升级，继续
                message = assistantResult.message || message;
            }
            
            // 2. 意图分类
            const intent = await this.intent.classify(message, context);
            
            // 3. 路由到 Agent
            const agent = await this.routing.route(intent);
            
            // 4. 记忆检索
            const memories = await this.memory.search(message, {
                agentId: agent.id,
                limit: 5
            });
            
            // 5. 工作流执行
            const result = await this.workflow.process(context.userId || 'unknown', message, {
                intent,
                agentId: agent.id,
                agent,
                memories,
                memory: this.memory,
                llm: this.llm,
                toolModule: this.tool
            });
            
            // 记录指标
            this.monitor.recordMetric('hub.process', 1, {
                intent: intent.category,
                agent: agent.name
            });
            
            return {
                from: 'agent',
                intent,
                agent,
                memories,
                result,
                elapsed: Date.now() - startTime
            };
            
        } catch (err) {
            this.logger.error('Process failed', { error: err.message, stack: err.stack });
            await this.monitor.alert('error', 'Process failed', { error: err.message });
            throw err;
        }
    }
    
    /**
     * 发送消息
     */
    async send(toAgent, message) {
        await this.messageBus.publish(`agent:${toAgent}`, message);
    }
    
    /**
     * 订阅消息
     */
    async subscribe(agentId, handler) {
        return await this.messageBus.subscribe(`agent:${agentId}`, handler);
    }
    
    /**
     * 发布广播
     */
    async broadcast(message) {
        await this.messageBus.broadcast(message);
    }
    
    /**
     * 注册工具
     */
    registerTool(toolDef) {
        this.tool.register(toolDef);
    }
    
    /**
     * 调用工具
     */
    async callTool(name, params) {
        return await this.tool.call(name, params);
    }
    
    /**
     * 注册 Agent
     */
    registerAgent(id, config) {
        return this.agent.register(id, config);
    }
    
    /**
     * 设置 Agent 在线
     */
    setAgentOnline(id) {
        this.agent.setOnline(id);
        this.routing.updateAgentStatus(id, 'online');
    }
    
    /**
     * 设置 Agent 离线
     */
    setAgentOffline(id) {
        this.agent.setOffline(id);
        this.routing.updateAgentStatus(id, 'offline');
    }
    
    /**
     * 执行 Agent 任务
     */
    async runAgent(agentId, task, context = {}) {
        return await this.agent.run(agentId, task, {
            ...context,
            toolModule: this.tool,
            memory: this.memory
        });
    }
    
    // ==================== 审批相关 ====================
    
    /**
     * 创建审批请求
     */
    async createApproval(type, title, description, requester, data = {}) {
        if (!this.approval) {
            throw new Error('Approval module not initialized');
        }
        return await this.approval.createRequest({ type, title, description, requester, data });
    }
    
    /**
     * 批准
     */
    async approve(approvalId, approver, comment = '') {
        if (!this.approval) {
            throw new Error('Approval module not initialized');
        }
        return await this.approval.approve(approvalId, approver, comment);
    }
    
    /**
     * 拒绝
     */
    async reject(approvalId, approver, reason = '') {
        if (!this.approval) {
            throw new Error('Approval module not initialized');
        }
        return await this.approval.reject(approvalId, approver, reason);
    }
    
    /**
     * 获取待审批列表
     */
    getPendingApprovals(approver = null) {
        if (!this.approval) return [];
        return this.approval.getPending(approver);
    }
    
    // ==================== DMZ 相关 ====================
    
    /**
     * DMZ: 下载文件
     */
    async downloadFile(url, filename) {
        return await this.dmzAgent.downloadFile(url, filename);
    }
    
    /**
     * DMZ: 审批通过
     */
    async approveDownload(taskId, options = {}) {
        return await this.dmzAgent.approve(taskId, options);
    }
    
    /**
     * DMZ: 审批拒绝
     */
    async rejectDownload(taskId, reason) {
        return await this.dmzAgent.reject(taskId, reason);
    }
    
    // ==================== 连接器相关 ====================
    
    /**
     * 调用外部 Agent
     */
    async callExternalAgent(agentId, message, options = {}) {
        if (!this.connector) {
            throw new Error('Connector module not initialized');
        }
        return await this.connector.call(agentId, message, options);
    }
    
    /**
     * 广播到外部 Agent
     */
    async broadcastToExternal(message, agentIds = null) {
        if (!this.connector) {
            throw new Error('Connector module not initialized');
        }
        return await this.connector.broadcast(message, agentIds);
    }
    
    // ==================== 导出相关 ====================
    
    /**
     * 导出文件
     */
    async exportFile(agentId, content, metadata = {}) {
        if (!this.exporter) {
            throw new Error('Exporter module not initialized');
        }
        return await this.exporter.export(agentId, content, metadata);
    }
    
    /**
     * 完成导出
     */
    async completeExport(filePath, metadata = {}) {
        if (!this.exporter) {
            throw new Error('Exporter module not initialized');
        }
        return await this.exporter.complete(filePath, metadata);
    }
    
    // ==================== 缓存相关 ====================
    
    /**
     * 缓存获取
     */
    async cacheGet(key) {
        if (!this.cache) return null;
        return await this.cache.get(key);
    }
    
    /**
     * 缓存设置
     */
    async cacheSet(key, value, ttl) {
        if (!this.cache) return;
        await this.cache.set(key, value, ttl);
    }
    
    // ==================== 健康检查 ====================
    
    /**
     * 健康检查
     */
    async health() {
        const moduleNames = [
            'config', 'logger', 'messageBus', 'monitor',
            'cache', 'storage', 'memory',
            'intent', 'routing', 'workflow', 'approval',
            'agent', 'connector', 'sandbox', 'dmzAgent',
            'assistant', 'rateLimit', 'auth', 'ports', 'exporter'
        ];
        
        const results = {};
        let healthyCount = 0;

        for (const name of moduleNames) {
            const mod = this[name];
            try {
                if (mod && typeof mod.health === 'function') {
                    results[name] = await mod.health();
                    if (results[name].status === 'healthy') healthyCount++;
                } else if (mod && typeof mod.status === 'function') {
                    results[name] = mod.status();
                    if (results[name].initialized || results[name].status === 'healthy') healthyCount++;
                } else {
                    results[name] = { status: 'unknown' };
                }
            } catch (err) {
                results[name] = { status: 'error', error: err.message };
            }
        }

        return {
            module: 'Hub',
            status: healthyCount === moduleNames.length ? 'healthy' : 'degraded',
            modules: results
        };
    }
    
    /**
     * 获取状态
     */
    status() {
        const getModuleStatus = (mod) => {
            if (!mod) return { status: 'unknown' };
            if (typeof mod.status === 'function') return mod.status();
            if (typeof mod.status === 'object') return mod.status;
            return { status: 'unknown' };
        };
        
        return {
            ...super.status(),
            modules: {
                config: getModuleStatus(this.config),
                logger: getModuleStatus(this.logger),
                messageBus: getModuleStatus(this.messageBus),
                monitor: getModuleStatus(this.monitor),
                cache: getModuleStatus(this.cache),
                storage: getModuleStatus(this.storage),
                memory: getModuleStatus(this.memory),
                intent: getModuleStatus(this.intent),
                routing: getModuleStatus(this.routing),
                workflow: getModuleStatus(this.workflow),
                approval: getModuleStatus(this.approval),
                safety: getModuleStatus(this.safety),
                agent: getModuleStatus(this.agent),
                connector: getModuleStatus(this.connector),
                sandbox: getModuleStatus(this.sandbox),
                dmzAgent: getModuleStatus(this.dmzAgent),
                assistant: getModuleStatus(this.assistant),
                rateLimit: getModuleStatus(this.rateLimit),
                auth: getModuleStatus(this.auth),
                ports: getModuleStatus(this.ports),
                exporter: getModuleStatus(this.exporter)
            }
        };
    }
    
    /**
     * 执行沙箱代码
     */
    async runSandbox(code, language, timeout) {
        return await this.sandbox.execute(code, language, timeout);
    }
    
    /**
     * 销毁
     */
    async destroy() {
        const modules = [
            'assistant', 'approval', 'connector', 'exporter',
            'ratelimit', 'auth', 'ports', 'cache',
            'sandbox', 'workflow', 'routing', 'intent', 'tool',
            'memory', 'agent', 'storage', 'messageBus', 'monitor',
            'logger', 'config'
        ];
        
        for (const name of modules) {
            const mod = this[name];
            if (mod && typeof mod.destroy === 'function') {
                try {
                    await mod.destroy();
                } catch (err) {
                    console.warn(`[Hub] Failed to destroy ${name}:`, err.message);
                }
            }
        }
        
        await super.destroy();
    }
}

module.exports = { Hub };