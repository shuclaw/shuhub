# TeamHub - 生产级镜像
FROM node:18-alpine

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    docker-cli \
    su-exec \
    && rm -rf /var/cache/apk/*

# Node.js 依赖
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev 2>/dev/null || npm install --production

# 框架代码
COPY . .

# 目录权限
RUN mkdir -p /data/dmz/downloads /data/logs && \
    chown -R node:node /app /data

USER node

EXPOSE 3001

CMD ["node", "server.js"]
