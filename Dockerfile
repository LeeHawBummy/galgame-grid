# ===== 多阶段构建：前端构建 → 运行时（nginx + node 后端） =====
# 设计要点：
#   - 前端密钥通过 --build-arg 注入（Vite 构建时硬编码进产物）
#   - 运行时镜像不含源码、不含前端 node_modules
#   - nginx 托管静态资源 + 反代 node 后端

# ---------------- 第一阶段：构建前端 ----------------
FROM node:22-alpine AS frontend-build
WORKDIR /build

# 先拷依赖清单，利用 docker 层缓存
COPY package.json package-lock.json* ./
# 本机环境可能带 NODE_ENV=production，构建期需要 devDependencies
RUN npm ci --include=dev || npm install --include=dev

# 拷源码
COPY . .

# 通过 build-arg 注入 Vite 环境变量（默认空值，部署时用 --build-arg 覆盖）
ARG VITE_BANGUMI_ACCESS_TOKEN=""
ARG VITE_BANGUMI_USER_AGENT=""
ARG VITE_VNDB_API_KEY=""
ARG VITE_APP_TITLE="年度Galgame大赏"
ARG VITE_APP_DESCRIPTION="Galgame年度评选生成器"
ENV VITE_BANGUMI_ACCESS_TOKEN=$VITE_BANGUMI_ACCESS_TOKEN \
    VITE_BANGUMI_USER_AGENT=$VITE_BANGUMI_USER_AGENT \
    VITE_VNDB_API_KEY=$VITE_VNDB_API_KEY \
    VITE_APP_TITLE=$VITE_APP_TITLE \
    VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION \
    NODE_ENV=production

RUN npm run build

# ---------------- 第二阶段：后端依赖 ----------------
FROM node:22-alpine AS backend-deps
WORKDIR /app/server
# better-sqlite3 需要编译，装构建工具
RUN apk add --no-cache python3 make g++
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# ---------------- 第三阶段：运行时 ----------------
FROM node:22-alpine AS runtime
WORKDIR /app

# 后端：拷依赖与代码
COPY --from=backend-deps /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/
COPY server/server.js ./server/

# 前端：拷构建产物（nginx 容器会挂载，这里也留一份备份/单容器可用）
# 单容器模式下用 node 自带的静态托管；compose 模式下由 nginx 托管
COPY --from=frontend-build /build/dist ./public

# 数据卷挂载点（SQLite 数据库文件）
RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV PORT=3000 \
    DB_PATH=/app/data/anime-grid.db \
    SAVE_ENABLED=true \
    NODE_ENV=production

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.js"]
