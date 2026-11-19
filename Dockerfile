# 课时16：前端容器化（多阶段构建）
# 阶段一：用 Node 构建静态产物；阶段二：只保留 Nginx + dist，镜像更小。

FROM node:20-alpine AS builder
WORKDIR /app

# 容器里不需要 Electron 二进制，跳过下载可显著加快 npm ci
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package*.json ./
RUN npm ci

COPY . .

# 容器内前端与后端同源，API 走 Nginx 反向代理的 /api
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:stable-alpine

# 自定义 Nginx 配置：SPA 回退、/api 反向代理、静态资源缓存
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
