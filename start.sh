#!/bin/bash
# TeamHub 一键启动脚本
# 用法: ./start.sh [memory|postgres|all]

set -e

VERSION="${VERSION:-latest}"
COMPOSE_MODE="${1:-memory}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          TeamHub 一键启动 (v1.0.0)                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 拉取预构建镜像 (如果有registry)
# IMAGE="registry.example.com/teamhub:$VERSION"
IMAGE="teamhub-modular:latest"

case "$COMPOSE_MODE" in
    memory)
        echo "📦 启动模式: 内存模式 (快速启动)"
        ;;
    postgres)
        echo "📦 启动模式: PostgreSQL 持久化"
        ;;
    all)
        echo "📦 启动模式: 全功能 (PostgreSQL + Redis)"
        ;;
    *)
        echo "用法: $0 [memory|postgres|all]"
        exit 1
        ;;
esac

echo ""
echo "1️⃣  检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "   ❌ Docker 未安装"
    exit 1
fi
echo "   ✅ Docker 已安装: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"

echo ""
echo "2️⃣  检查端口..."
for PORT in 3001; do
    if lsof -i :$PORT &> /dev/null; then
        echo "   ⚠️  端口 $PORT 已被占用"
    else
        echo "   ✅ 端口 $PORT 可用"
    fi
done

echo ""
echo "3️⃣  构建镜像..."
docker build -t $IMAGE . --no-cache

echo ""
echo "4️⃣  启动容器..."
docker run -d \
    --name teamhub \
    --restart unless-stopped \
    -p 3001:3001 \
    -p 18789:18789 \
    -e LLM_URL="${LLM_URL:-http://192.168.50.47:1234/v1/chat/completions}" \
    -e LLM_MODEL="${LLM_MODEL:-qwen2.5-coder-7b-instruct}" \
    -e MEMORY_TYPE="${MEMORY_TYPE:-memory}" \
    -e STORAGE_TYPE="${STORAGE_TYPE:-memory}" \
    -e SANDBOX_TYPE="${SANDBOX_TYPE:-docker}" \
    -e DMZ_INTERNET="${DMZ_INTERNET:-true}" \
    -v teamhub-data:/data \
    -v /var/run/docker.sock:/var/run/docker.sock \
    $IMAGE

echo ""
echo "5️⃣  等待服务启动..."
sleep 3

echo ""
echo "6️⃣  健康检查..."
for i in {1..10}; do
    if curl -sf http://localhost:3001/health &> /dev/null; then
        echo "   ✅ 服务启动成功!"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "   ❌ 服务启动超时"
        docker logs teamhub
        exit 1
    fi
    sleep 1
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    ✅ 启动完成!                        ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  REST API:   http://localhost:3001                    ║"
echo "║  WebSocket:  ws://localhost:3001                     ║"
echo "║  健康检查:   http://localhost:3001/health            ║"
echo "║  状态:       http://localhost:3001/status            ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  日志:       docker logs -f teamhub                   ║"
echo "║  停止:       docker stop teamhub                      ║"
echo "║  卸载:       docker rm teamhub && ./start.sh          ║"
echo "╚══════════════════════════════════════════════════════════╝"
