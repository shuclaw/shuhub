# TeamHub 模块化框架

> 🔧 可拼接的 Agent 协作系统 - 企业级私有化部署方案

## 完整模块列表 (19个)

| 模块 | 文件 | 说明 |
|------|------|------|
| **核心** |||
| BaseModule | base.js | 基类 |
| Hub | hub.js | 核心调度器 |
| **数据** |||
| Memory | modules/memory.js | 记忆存储 + 向量检索 |
| Storage | modules/storage.js | 多Provider存储 |
| Cache | modules/cache.js | Redis缓存层 |
| **业务** |||
| Intent | modules/intent.js | 意图分类 |
| Routing | modules/routing.js | 智能路由 |
| Workflow | modules/workflow.js | 工作流引擎 |
| Approval | modules/approval.js | 审批工作流 |
| **执行** |||
| Agent | modules/agent.js | Agent管理 |
| Connector | modules/connector.js | 外部Agent连接器 |
| Sandbox | modules/sandbox.js | 代码执行隔离 |
| DMZ Agent | modules/dmz_agent.js | 安全上网隔离 |
| **入口** |||
| Assistant | modules/assistant.js | 小智前台 |
| **基础设施** |||
| Config | modules/config.js | YAML配置 |
| Logger | modules/logger.js | 结构化日志 |
| RateLimit | modules/ratelimit.js | 限流器 |
| Auth | modules/auth.js | 认证/多租户 |
| MessageBus | modules/messagebus.js | 消息总线 |
| Monitor | modules/monitor.js | 监控告警 |
| Ports | modules/ports.js | 端口配置 |
| Exporter | modules/exporter.js | 文件导出 |

## 快速启动

```bash
# 开发模式
npm install
node server.js

# Docker 部署
docker-compose up -d
```

## 配置

```yaml
# config.yaml
assistant:
  name: "小智"
  model: "qwen2.5-0.5B"
  
ports:
  api: 3001
  openclaw: 18789
  
agents:
  - id: "openclaw"
    type: "openclaw"
    endpoint: "http://localhost:18789"
```

## API

| 接口 | 方法 | 说明 |
|------|------|------|
| /health | GET | 健康检查 |
| /status | GET | 系统状态 |
| /ports | GET | 端口配置 |
| /tasks | POST | 发送任务 |
| /assistant/chat | POST | 小智对话 |
| /approval/pending | GET | 待审批 |
| /approval/approve | POST | 批准 |
| /exporter/stats | GET | 导出统计 |

## License

Proprietary - 红鼠实验室
