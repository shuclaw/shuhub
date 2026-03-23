# ShuHub Frontend - Docker 镜像

FROM nginx:alpine

# 复制静态文件
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
