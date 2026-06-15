# VPS 自托管部署指南（Docker）

本方案完全脱离 Cloudflare，在你的云服务器上用 Docker 运行：
- **nginx** 托管前端静态资源 + 反向代理 `/api`
- **Node 后端**（`server/server.js`）处理 Bangumi 搜索代理、保存统计、图片代理
- **SQLite** 替代 Cloudflare D1，存评选结果统计

架构：
```
浏览器 → :8080 nginx ──┬── 静态资源 dist/
                       └── /api/* → backend:3000 (Node)
                                       ├── 转发 Bangumi/VNDB
                                       └── SQLite (./data/anime-grid.db)
```

---

## 前置要求

- 一台 Linux VPS（Ubuntu/Debian/CentOS 均可，1 核 1G 足够）
- 已安装 **Docker** 和 **Docker Compose**（v2）
  - 一键安装：`curl -fsSL https://get.docker.com | sh`
- 服务器**能访问外网**（需要请求 `api.bgm.tv`、`api.vndb.org`）
- 准备好凭证：
  - Bangumi Access Token：https://next.bgm.tv/demo/access-token
  - VNDB API Key（可选）：https://vndb.org/u/tokens

---

## 部署步骤

### 1. 拉取代码

```bash
git clone https://github.com/LeeHawBummy/galgame-grid.git
cd galgame-grid
```

### 2. 配置环境变量

```bash
cp .env.deploy.example .env.deploy
vi .env.deploy   # 填入你的凭证
```

重点填写（其余有默认值）：
- `VITE_BANGUMI_ACCESS_TOKEN` — 必填，否则搜索报 401
- `VITE_BANGUMI_USER_AGENT` — 必填，Bangumi 强制要求
- `VITE_VNDB_API_KEY` — VNDB 游戏搜索用，不用 VNDB 可留空
- `PUBLIC_PORT` — 对外端口，默认 8080

### 3. 构建并启动

```bash
docker compose --env-file .env.deploy up -d --build
```

首次构建约 3–5 分钟（要编译前端 + better-sqlite3 原生模块）。

### 4. 验证

```bash
# 容器状态
docker compose ps

# 后端健康检查
curl http://127.0.0.1:8080/healthz
# 应返回: {"ok":true,"db":true}

# 前端首页
curl -I http://127.0.0.1:8080/
# 应返回: HTTP/1.1 200

# 查日志
docker compose logs -f backend
docker compose logs -f nginx
```

浏览器访问 `http://你的服务器IP:8080` 即可使用。

---

## 配置 HTTPS（强烈推荐）

搜索请求带 Bangumi token，务必上 HTTPS。推荐用 Caddy 自动签证，或宿主 nginx 反代。

### 方案 A：用 Caddy 自动 HTTPS（最省事）

新增 `Caddyfile`（假设域名 `grid.example.com`）：
```
grid.example.com {
    reverse_proxy localhost:8080
}
```
```bash
# 装 Caddy 后
caddy start
```
Caddy 会自动申请并续期 Let's Encrypt 证书，把 8080 反代到 443。

### 方案 B：宿主机已有 nginx

在宿主机 nginx 加一个 server 块反代到 `127.0.0.1:8080`，证书用 certbot 申请。

> 用 HTTPS 后，把 compose 的端口改成只监听本地：
> `ports: ["127.0.0.1:8080:80"]`，避免 8080 直接暴露。

---

## 日常运维

| 操作 | 命令 |
|------|------|
| 查看状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f` |
| 重启服务 | `docker compose restart` |
| 停止 | `docker compose down` |
| 更新代码 | `git pull && docker compose --env-file .env.deploy up -d --build` |
| 修改环境变量 | 改 `.env.deploy` 后必须 `--build` 重新构建（VITE 变量在构建期注入） |

### 数据备份

评选结果统计存在 `./data/anime-grid.db`，定期备份：
```bash
cp ./data/anime-grid.db ./data/backup-$(date +%F).db
```

---

## 常见问题

**Q: 搜索提示「搜索上游 (Bangumi) 响应超时」**
A: 服务器无法访问 `api.bgm.tv`。在国内 VPS 上常见，需确保服务器能直连或配代理。在服务器上测：`curl -I https://api.bgm.tv`。

**Q: 搜索提示 401**
A: `VITE_BANGUMI_ACCESS_TOKEN` 填错或过期。注意 token 是在**前端构建时**注入的，改了 `.env.deploy` 后必须加 `--build` 重新构建。

**Q: 不需要统计保存功能**
A: 在 `.env.deploy` 设 `SAVE_ENABLED=false`，后端不连数据库，`/api/save` 直接返回成功，生成图片功能不受影响。

**Q: 想换端口**
A: 改 `.env.deploy` 里的 `PUBLIC_PORT`，`docker compose down && up -d` 即可（不用 rebuild）。

**Q: 内存占用**
A: 整套约 80–120MB（nginx ~10MB + node ~60MB + sqlite）。1G 内存 VPS 绰绰有余。

---

## 文件清单

```
galgame-grid/
├── Dockerfile              # 后端镜像（前端构建 + Node 运行时）
├── Dockerfile.nginx        # nginx 镜像（内含前端产物）
├── docker-compose.yml      # 编排：backend + nginx
├── .env.deploy.example     # 环境变量模板
├── .dockerignore
├── nginx/
│   └── default.conf        # nginx 配置（静态 + /api 反代）
└── server/
    ├── server.js           # Node 后端（Bangumi/save/vndb 代理）
    └── package.json        # 后端依赖（better-sqlite3）
```
