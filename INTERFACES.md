# ShuHub 模块接口文档

> ShuHub 核心模块接口定义

## 模块列表

### 核心调度层

#### 1. IntentModule - 意图分类

```javascript
class IntentModule {
  /**
   * 分类用户消息
   * @param {string} message - 用户消息
   * @returns {Promise<{id, category, confidence, intent}>}
   */
  async classify(message) {
    return {
      id: 'code',           // 意图ID
      category: '技术开发',  // 分类名称
      confidence: 0.85,     // 置信度 0-1
      intent: 'intent_code'  // 意图标识
    };
  }
}
```

**内置意图规则：**
| ID | 类别 | 关键词 |
|----|------|--------|
| code | 技术开发 | 代码, 编程, debug, 修bug |
| design | 创意设计 | 设计, UI, 图, 画 |
| ops | 运营客服 | 推广, 客服, 回复 |
| security | 安全运维 | 安全, 漏洞, 防火墙 |
| general | 通用问答 | 你好, 问问, 随便 |

---

#### 2. RoutingModule - 智能路由

```javascript
class RoutingModule {
  /**
   * 根据意图路由到目标Agent
   * @param {object} intentResult - IntentModule.classify() 的结果
   * @returns {Promise<{agent, reason, priority}>}
   */
  async route(intentResult) {
    return {
      agent: 'lingke',      // 目标Agent名称
      reason: '技术开发类问题', // 路由原因
      priority: 10          // 优先级 1-10
    };
  }
}
```

**Agent映射规则：**
| Intent | Agent | 说明 |
|---------|-------|------|
| code | lingke | 技术开发 |
| design | xiaohui | 创意设计 |
| ops | bufu | 运营客服 |
| security | yanjia | 安全运维 |
| general | hub | 总调度 |

---

#### 3. WorkflowModule - 工作流引擎

```javascript
class WorkflowModule {
  /**
   * 创建工作流任务
   * @param {object} task - 任务对象
   * @returns {Promise<{taskId, status, steps}>}
   */
  async create(task) {
    return {
      taskId: 'task_xxx',  // 任务ID
      status: 'pending',    // pending/running/completed/failed
      steps: []             // 工作流步骤
    };
  }

  /**
   * 获取任务状态
   * @param {string} taskId
   * @returns {Promise<{taskId, status, result}>}
   */
  async status(taskId) {}

  /**
   * 完成工作流
   * @param {string} taskId
   * @param {object} result
   */
  async complete(taskId, result) {}
}
```

---

### 数据层

#### 4. MemoryModule - 记忆存储

```javascript
class MemoryModule {
  /**
   * 初始化
   * @param {object} config - {pgConfig, redisConfig}
   */
  async init(config) {}

  /**
   * 存储记忆
   * @param {string} key
   * @param {object} value
   */
  async store(key, value) {}

  /**
   * 搜索记忆（向量检索）
   * @param {string} query
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async search(query, limit = 5) {}

  /**
   * 获取记忆
   * @param {string} key
   */
  async get(key) {}

  /**
   * 删除记忆
   * @param {string} key
   */
  async delete(key) {}
}
```

---

#### 5. StorageModule - 数据持久化

```javascript
class StorageModule {
  /**
   * 初始化
   * @param {object} config - {pgConfig, type}
   */
  async init(config) {}

  /**
   * 保存数据
   * @param {string} key
   * @param {object} data
   */
  async save(key, data) {}

  /**
   * 加载数据
   * @param {string} key
   * @returns {Promise<object>}
   */
  async load(key) {}

  /**
   * 删除数据
   * @param {string} key
   */
  async delete(key) {}

  /**
   * 列出所有key
   * @param {string} prefix
   * @returns {Promise<Array<string>>}
   */
  async list(prefix) {}
}
```

---

#### 6. MonitorModule - 监控告警

```javascript
class MonitorModule {
  /**
   * 初始化
   * @param {object} config - {redisConfig, pgConfig}
   */
  async init(config) {}

  /**
   * 记录指标
   * @param {string} metric - 指标名称
   * @param {number} value - 值
   * @param {object} tags - 标签
   */
  async record(metric, value, tags) {}

  /**
   * 获取指标
   * @param {string} metric
   * @param {object} query
   */
  async get(metric, query) {}

  /**
   * 发送告警
   * @param {string} level - info/warn/error
   * @param {string} message
   * @param {object} data
   */
  async alert(level, message, data) {}

  /**
   * 健康检查
   * @returns {Promise<{status, details}>}
   */
  async health() {}
}
```

---

### 执行层

#### 7. APIGatewayModule - 多API管理

```javascript
class APIGatewayModule {
  /**
   * 初始化
   * @param {object} config - {apis, redis, pg}
   */
  async init(config) {}

  /**
   * 聊天完成
   * @param {string} model
   * @param {Array} messages
   * @param {object} options
   * @returns {Promise<{content, usage, model, cached}>}
   */
  async chat(model, messages, options) {}

  /**
   * 获取状态
   * @returns {object}
   */
  getStatus() {}

  /**
   * 健康检查
   * @returns {Promise<object>}
   */
  async health() {}

  /**
   * 获取报表
   * @param {number} days
   */
  async getReport(days) {}

  /**
   * 销毁
   */
  async destroy() {}
}
```

---

#### 8. SandboxModule - 执行隔离

```javascript
class SandboxModule {
  /**
   * 初始化
   * @param {object} config - {type, timeout}
   */
  async init(config) {}

  /**
   * 执行代码
   * @param {string} code
   * @param {string} language - javascript/python
   * @param {object} options
   * @returns {Promise<{stdout, stderr, output, error, exitCode}>}
   */
  async execute(code, language, options) {}

  /**
   * 健康检查
   */
  async health() {}
}
```

---

### Hub 主调度器

```javascript
class Hub {
  /**
   * 初始化所有模块
   */
  async init(config) {}

  /**
   * 处理用户消息
   * @param {string} message
   * @param {object} context
   * @returns {Promise<object>}
   */
  async process(message, context) {}

  /**
   * 健康检查
   */
  async health() {}

  /**
   * 销毁
   */
  async destroy() {}
}
```

**流程：**
```
用户消息
   ↓
Intent.classify(message) → {id, category, confidence}
   ↓
Routing.route(intent) → {agent, reason}
   ↓
Connector.execute(agent, task) → 调用外部Agent或本地Sandbox
   ↓
Workflow.complete(taskId, result)
   ↓
返回结果给用户
```

---

## 使用示例

```javascript
const { Hub } = require('./hub');

const hub = new Hub();
await hub.init({
  // 配置...
});

// 处理消息
const result = await hub.process('帮我写一个登录函数', {
  userId: 'user_123',
  sessionId: 'session_xxx'
});

console.log(result);
// { success: true, response: '...', agent: 'lingke' }
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| INTENT_CLASSIFY_ERROR | 意图分类失败 |
| ROUTING_NO_MATCH | 没有匹配的路由 |
| AGENT_TIMEOUT | Agent执行超时 |
| SANDBOX_ERROR | 沙箱执行错误 |
| STORAGE_ERROR | 存储错误 |
| MEMORY_ERROR | 记忆错误 |
