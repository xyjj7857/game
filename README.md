<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e8afd652-9633-41ac-944f-e01b0f8c1452

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Ubuntu 服务器 Docker 部署 (端口 3335)

本项目已配置生产级多阶段构建 Dockerfile 及 docker-compose 配置。

### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 启动容器（后台运行）
docker compose up -d --build

# 2. 查看容器状态
docker compose ps

# 3. 停止容器
docker compose down
```

### 方式二：使用原生 Docker 命令

```bash
# 1. 构建镜像
docker build -t binance-trading-system .

# 2. 运行容器（暴露 3335 端口）
docker run -d -p 3335:3335 --name binance-trading-system --restart unless-stopped binance-trading-system
```

部署完成后，在浏览器访问 `http://<您的服务器IP>:3335` 即可使用。
