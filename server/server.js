/**
 * Node.js 后端 —— 在自有 VPS 上替代 Cloudflare Worker。
 *
 * 职责（与 worker.ts 对齐）：
 *   OPTIONS /api/*         → CORS 预检
 *   POST   /api/search     → Bangumi 搜索代理（角色 / 人物）
 *   POST   /api/save       → 保存评选结果到 SQLite
 *   GET    /api/vndb-image → VNDB 图片代理
 *   /healthz               → 健康检查
 *
 * 静态资源由 nginx 托管，本服务只处理 /api/* 与健康检查。
 * 由 nginx 反向代理把 /api/* 转发到本服务（默认 127.0.0.1:3000）。
 */

import http from 'node:http'
import crypto from 'node:crypto'
import { URL } from 'node:url'

// ----------------------------- 配置 -----------------------------
const PORT = Number(process.env.PORT) || 3000
const BANGUMI_UA =
    process.env.BANGUMI_PROXY_UA ||
    'AnimeGrid/1.0 (https://github.com/ywh555hhh/anime-role-grid)'
// 上游请求超时（ms）
const UPSTREAM_TIMEOUT = 12000
// SQLite 数据库文件路径
const DB_PATH = process.env.DB_PATH || '/app/data/anime-grid.db'

// 是否启用保存功能（不配 DB 时设 false，save 端点直接返回 200 但不落库）
const SAVE_ENABLED = process.env.SAVE_ENABLED !== 'false'

// ----------------------------- 数据库 -----------------------------
let db = null
if (SAVE_ENABLED) {
    try {
        // 动态导入：未安装 better-sqlite3 或不启用 save 时不会阻断启动
        const { default: Database } = await import('better-sqlite3')
        db = new Database(DB_PATH)
        db.pragma('journal_mode = WAL')
        db.exec(`
            CREATE TABLE IF NOT EXISTS saves (
                id TEXT PRIMARY KEY,
                template_id TEXT NOT NULL,
                custom_title TEXT,
                user_hash TEXT,
                device_type TEXT,
                referer TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );
            CREATE TABLE IF NOT EXISTS save_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                save_id TEXT NOT NULL,
                slot_index INTEGER NOT NULL,
                slot_label TEXT NOT NULL,
                character_name TEXT NOT NULL,
                img_url TEXT,
                FOREIGN KEY(save_id) REFERENCES saves(id)
            );
            CREATE INDEX IF NOT EXISTS idx_saves_template ON saves(template_id);
            CREATE INDEX IF NOT EXISTS idx_saves_user ON saves(user_hash);
            CREATE INDEX IF NOT EXISTS idx_items_char ON save_items(character_name);
            CREATE INDEX IF NOT EXISTS idx_items_label ON save_items(slot_label);
        `)
        console.log(`[db] SQLite ready at ${DB_PATH}`)
    } catch (e) {
        console.warn(`[db] 初始化失败，save 功能将静默跳过: ${e.message}`)
        db = null
    }
}

// ----------------------------- 工具函数 -----------------------------
function cors() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
}

function json(data, status = 200, extraHeaders = {}) {
    return {
        status,
        headers: { 'Content-Type': 'application/json', ...cors(), ...extraHeaders },
        body: JSON.stringify(data),
    }
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = ''
        req.on('data', (c) => {
            raw += c
            // 防止过大请求体
            if (raw.length > 1e6) req.destroy()
        })
        req.on('end', () => resolve(raw))
        req.on('error', () => resolve(''))
    })
}

function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    return fetch(url, { ...options, signal: controller.signal }).finally(() =>
        clearTimeout(timer)
    )
}

function getDeviceType(userAgent) {
    if (!userAgent) return 'Unknown'
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) return 'Mobile'
    return 'Desktop'
}

function generateUserHash(ip) {
    const SALT = 'anime-grid-privacy-salt-v1'
    return crypto.createHash('sha256').update(ip + SALT).digest('hex')
}

// ----------------------------- 路由处理 -----------------------------
async function handleSearch(req, res, bodyText) {
    let body
    try {
        body = JSON.parse(bodyText)
    } catch (e) {
        return json({ error: 'Invalid JSON in request body: ' + e.message }, 400)
    }

    // 带 searchMode 的为 Bangumi 请求
    if (body.searchMode) {
        const { searchMode, ...bangumiPayload } = body

        let targetUrl = 'https://api.bgm.tv/v0/search/characters'
        if (searchMode === 'subject') targetUrl = 'https://api.bgm.tv/v0/search/subjects'
        else if (searchMode === 'person') targetUrl = 'https://api.bgm.tv/v0/search/persons'

        const authHeader = req.headers['authorization']

        let response
        try {
            response = await fetchWithTimeout(
                targetUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: authHeader || '',
                        'User-Agent': BANGUMI_UA,
                    },
                    body: JSON.stringify(bangumiPayload),
                },
                UPSTREAM_TIMEOUT
            )
        } catch (e) {
            const msg =
                e.name === 'AbortError' || /timeout|abort/i.test(e.message || '')
                    ? '搜索上游 (Bangumi) 响应超时，请稍后重试'
                    : `搜索上游请求失败: ${e.message || e}`
            return json({ error: msg }, 502)
        }

        const text = await response.text()
        let data
        try {
            data = JSON.parse(text)
        } catch {
            data = { error: 'Upstream returned non-JSON response', raw: text }
        }
        return json(data, response.status)
    }

    // 原 VNDB 游戏搜索逻辑
    const { keyword, page = 1, results = 25 } = body
    if (!keyword) return json({ results: [] })

    const vndbBody = {
        filters: ['search', '=', keyword],
        page,
        results,
        fields: 'id,title,released,rating,platforms,image.url',
    }

    const resp = await fetchWithTimeout(
        'https://api.vndb.org/kana/vn',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'anime-role-grid (proxy)' },
            body: JSON.stringify(vndbBody),
        },
        UPSTREAM_TIMEOUT
    )
    const text = await resp.text()
    return { status: resp.status, headers: { ...cors(), 'Content-Type': 'application/json' }, body: text }
}

function handleSave(req, res, bodyText) {
    if (!db) {
        // 未启用数据库：前端是 fire-and-forget，返回成功即可
        return json({ success: true, id: null, note: 'save disabled' })
    }

    let body
    try {
        body = JSON.parse(bodyText)
    } catch (e) {
        return json({ error: 'Invalid JSON' }, 400)
    }

    const { templateId, customTitle, items } = body
    if (!templateId || !Array.isArray(items)) {
        return json({ error: 'Invalid payload' }, 400)
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '0.0.0.0'
    const userAgent = req.headers['user-agent']
    const referer = req.headers['referer']
    const userHash = generateUserHash(ip)
    const deviceType = getDeviceType(userAgent)
    const saveId = crypto.randomUUID()

    const tx = db.transaction(() => {
        db.prepare(
            'INSERT INTO saves (id, template_id, custom_title, user_hash, device_type, referer) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(saveId, templateId, customTitle || null, userHash, deviceType, referer || null)

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.character && item.character.name) {
                const imgUrl = item.imgUrl || item.character.image || null
                db.prepare(
                    'INSERT INTO save_items (save_id, slot_index, slot_label, character_name, img_url) VALUES (?, ?, ?, ?, ?)'
                ).run(saveId, i, item.label, item.character.name, imgUrl)
            }
        }
    })
    try {
        tx()
        return json({ success: true, id: saveId })
    } catch (e) {
        console.error('[save] 失败:', e.message)
        return json({ error: e.message }, 500)
    }
}

async function handleVndbImage(req, res, parsedUrl) {
    const url = parsedUrl.searchParams.get('url')
    if (!url || !url.startsWith('https://')) {
        return { status: 400, headers: cors(), body: 'Invalid image url' }
    }
    try {
        const upstream = await fetchWithTimeout(
            url,
            {
                headers: {
                    'User-Agent': 'anime-role-grid (image proxy)',
                    Referer: 'https://vndb.org/',
                },
            },
            UPSTREAM_TIMEOUT
        )
        if (!upstream.ok || !upstream.body) {
            return { status: upstream.status, headers: cors(), body: 'Image fetch failed' }
        }
        const buf = Buffer.from(await upstream.arrayBuffer())
        return {
            status: 200,
            headers: {
                'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
                ...cors(),
            },
            body: buf,
        }
    } catch (e) {
        return { status: 500, headers: cors(), body: e.message || String(e) }
    }
}

// ----------------------------- HTTP 服务 -----------------------------
const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const { pathname } = parsedUrl

    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.writeHead(200, cors())
        return res.end()
    }

    // 健康检查
    if (pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ ok: true, db: !!db }))
    }

    // 仅处理 /api/*
    if (!pathname.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'Not found' }))
    }

    try {
        let result
        if (pathname === '/api/search' && req.method === 'POST') {
            result = await handleSearch(req, res, await readBody(req))
        } else if (pathname === '/api/save' && req.method === 'POST') {
            result = handleSave(req, res, await readBody(req))
        } else if (pathname === '/api/vndb-image' && req.method === 'GET') {
            result = await handleVndbImage(req, res, parsedUrl)
        } else {
            result = json({ error: 'Not found' }, 404)
        }

        // 统一写回响应
        res.writeHead(result.status, result.headers)
        res.end(result.body)
    } catch (err) {
        console.error('[server] 未捕获错误:', err)
        res.writeHead(500, { 'Content-Type': 'application/json', ...cors() })
        res.end(JSON.stringify({ error: err.message || String(err) }))
    }
})

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] galgame-grid API listening on :${PORT} (save=${SAVE_ENABLED ? 'on' : 'off'})`)
})
