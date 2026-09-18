# ==========================================
# 阶段 1: 依赖安装与前端打包构建
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制 package.json 利用 Docker 缓存层
COPY package.json package-lock.json* ./

# 安装构建依赖
RUN npm install

# 复制项目源代码
COPY . .

# 执行打包编译，生成 dist 目录
RUN npm run build

# ==========================================
# 阶段 2: 生产级 Nginx 轻量运行镜像
# ==========================================
FROM nginx:alpine

# 复制 Nginx 配置文件（默认监听 3335 端口与 SPA 路由支持）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 将构建好的静态文件复制到 Nginx 托管目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 声明暴露端口 3335
EXPOSE 3335

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
