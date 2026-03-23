# ShuHub Manager

Windows 桌面管理工具，用于配置和管理 ShuHub 服务。

## 功能

- 📊 仪表盘 - 查看系统状态
- ⚙️ API配置 - 配置阿里云/MiniMax API密钥
- 💬 测试聊天 - 测试API是否正常工作
- 💾 本地保存 - 配置保存在本地

## 安装

```bash
npm install
npm start
```

## 打包成 exe

```bash
npm install electron-builder -g
npm run dist
```

打包后的文件在 `dist/` 目录。

## 使用前准备

1. 确保 ShuHub 服务已启动（默认 localhost:3001）
2. 打开 Manager
3. 在"API配置"页面填写你的 API Key
4. 测试连接
5. 开始使用

## 配置保存位置

Windows: `%APPDATA%/shuhub-manager/config.json`
