# TeamHub 模块化框架 - 架构文档

> 版本: v2
> 目标: 企业级 AI Agent 协作框架

## 核心定位

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   小智 (轻量前台) ───→ Hub (协调) ───→ Agent 团队         │
│                                                             │
│   用户 → 小智 → 意图分类 → 路由 → Agent → 结果            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 模块矩阵 (19个)

### 核心层
| 模块 | 文件 | 职责 |
|------|------|------|
| BaseModule | base.js | 基类 |
| Hub | hub.js | 主调度器 |

### 数据层
| 模块 | 文件 | 职责 |
|------|------|------|
| Memory | modules/memory.js | 记忆存储 + 向量检索 |
| Storage | modules/storage.js | 多 Provider 存储 |
| Cache | modules/cache.js | Redis 缓存层 |

### 业务层
| 模块 | 文件 | 职责 |
|------|------|------|
| Intent | modules/intent.js | 意图分类 (v2) |
| Routing | modules/routing.js | 智能路由 |
| Workflow | modules/workflow.js | 工作流引擎 |
| Approval | modules/approval.js | 审批工作流 |

### 执行层
| 模块 | 文件 | 职责 |
|------|------|------|
| Agent | modules/agent.js | Agent 管理 |
| Connector | modules/connector.js | 外部 Agent 连接器 |
| Sandbox | modules/sandbox.js | 代码执行隔离 |
| DMZ Agent | modules/dmz_agent.js | 安全上网隔离 |

### 入口层
| 模块 | 文件 | 职责 |
|------|------|------|
| Assistant | modules/assistant.js | 小智前台 |

### 基础设施层
| 模块 | 文件 | 职责 |
|------|------|------|
| Config | modules/config.js | YAML 配置 |
| Logger | modules/logger.js | 结构化日志 |
| RateLimit | modules/ratelimit.js | 限流器 |
| Auth | modules/auth.js | 认证/多租户 |
| MessageBus | modules/messagebus.js | 消息总线 |
| Monitor | modules/monitor.js | 监控告警 |
| Ports | modules/ports.js | 端口配置 |
| Exporter | modules/exporter.js | 文件导出 |

## 防循环设计

```
❌ 危险模式
Agent A → Agent B → Agent A → ... (循环)

✅ 安全模式
用户 → 小智 → Hub → Agent → 结果 → 用户
                 ↑
              深度=1
```

### 原则
1. **单向流** - 请求进来，结果出去，中间不循环
2. **深度限制** - Hub 直接调用 Agent，不链式
3. **结果返回** - Agent 不能直接调其他 Agent

## 意图分类 v2

```javascript
{
    id: 'code',
    category: '技术开发',
    priority: 10,
    patterns: [
        { type: 'keyword', value: '代码', weight: 1.0 },
        { type: 'keyword', value: '编程', weight: 1.0 },
        { type: 'suffix', value: '.py', weight: 0.5 }
    ]
}
```

### 支持的模式类型
- `keyword` - 关键词匹配
- `suffix` - 文件后缀
- `regex` - 正则表达式
- `prefix` - 前缀匹配

## DMZ Agent 隔离

```
┌─────────────────────────────────────────────┐
│                                             │
│   DMZ Agent (可上网)                       │
│   ├── 下载文件 → 本地存储                   │
│   ├── 禁止直接写数据库                      │
│   └── 需要人工审批才能移入DB                │
│                                             │
└─────────────────────────────────────────────┘
```

## 小智前台

```javascript
// 模式1: 有小智
frontend: { enabled: true, agent: "xiaozhi" }

// 模式2: 无小智 (直连后台)
frontend: { enabled: false }
```

## 端口配置

| 端口 | 服务 | 说明 |
|------|------|------|
| 3001 | API | REST + WebSocket |
| 18789 | OpenClaw | Gateway |
| 3002 | Admin | 管理后台 |
| 3003 | Sandbox | 内部执行 |

## 待讨论问题

1. **模块划分** - 合理？有遗漏？
2. **安全** - 还有什么没考虑到的？
3. **性能** - 可以怎么优化？
4. **扩展性** - 如何支持新类型 Agent？

## 代码位置

- VM: `/tmp/teamhub-modular-v2/`
- 本地: `C:\Users\admin\.openclaw\workspace\teamhub-modular\`
