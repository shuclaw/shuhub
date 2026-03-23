# ShuHub

> 普通人也能打造自己的 Agent 团队

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 是什么

ShuHub 是一个模块化的 AI Agent 协作框架，让你像组建团队一样组建 AI Agent 集群。

```
你 → 小智(前台) → Hub(调度) → Agent团队(凌刻/岩甲/小绘/布土拨)
```

## 核心模块

| 模块 | 说明 |
|------|------|
| Intent | 意图分类，理解用户想做什么 |
| Routing | 智能路由，分发任务到对的Agent |
| Workflow | 工作流引擎，管理任务流程 |
| Memory | 记忆存储，Agent越用越聪明 |
| Storage | 数据持久化，数据不会丢 |
| Monitor | 监控告警，随时掌握系统状态 |
| APIGateway | 多API管理，智能切换降成本 |
| Sandbox | 代码执行隔离，安全运行第三方代码 |

## 快速开始

```bash
# 克隆
git clone https://github.com/shuclaw/shuhub.git
cd shuhub

# 安装依赖
npm install

# 启动
npm start
```

## 开发文档

- [接口文档](INTERFACES.md) - 模块接口定义
- [框架文档](FRAMEWORK.md) - 架构设计

## 技术栈

- Node.js 18+
- Redis (缓存/消息队列)
- PostgreSQL (数据持久化)
- Docker (容器化部署)

## 开源协议

MIT License

---

**ShuHub - 让每个人都能拥有自己的 AI 团队**
