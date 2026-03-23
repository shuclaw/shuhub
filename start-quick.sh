#!/bin/bash
# TeamHub 最简启动 (不构建，直接用 Node 直接运行)
# 用于开发测试

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          TeamHub 快速启动 (开发模式)                    ║"
echo "╚══════════════════════════════════════════════════════════╝"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# 安装依赖 (如果需要)
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 安装依赖..."
    npm install
fi

# 设置默认环境
export LLM_URL="${LLM_URL:-http://192.168.50.47:1234/v1/chat/completions}"
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder-7b-instruct}"
export MEMORY_TYPE="${MEMORY_TYPE:-memory}"
export STORAGE_TYPE="${STORAGE_TYPE:-memory}"
export SANDBOX_TYPE="${SANDBOX_TYPE:-subprocess}"
export PORT="${PORT:-3001}"

echo ""
echo "🔧 配置:"
echo "   LLM: $LLM_URL"
echo "   Model: $LLM_MODEL"
echo "   Memory: $MEMORY_TYPE"
echo "   Sandbox: $SANDBOX_TYPE"
echo "   Port: $PORT"

echo ""
echo "🚀 启动服务..."
echo ""

node server.js
