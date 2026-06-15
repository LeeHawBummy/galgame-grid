/**
 * Cloudflare Worker 入口 —— 同时托管前端静态资源与 /api/* 后端路由。
 *
 * 适配「新版 Workers + Static Assets」项目类型（经典 Pages 项目会自动部署
 * functions/ 目录，但新版 Workers 不会，故在此统一处理）。
 *
 * 路由：
 *   OPTIONS /api/*        → CORS 预检
 *   POST   /api/search    → Bangumi 搜索代理（角色 / 人物）
 *   POST   /api/save      → 保存评选结果到 D1
 *   GET    /api/vndb-image → VNDB 图片代理
 *   其它                  → env.ASSETS.fetch(request) 托管静态前端
 */

interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const { pathname } = url;

        // 仅拦截 /api/* 路由，其余交给静态资源
        if (!pathname.startsWith('/api/')) {
            return env.ASSETS.fetch(request);
        }

        // CORS 预检
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: cors() });
        }

        try {
            if (pathname === '/api/search' && request.method === 'POST') {
                return handleSearch(request);
            }
            if (pathname === '/api/save' && request.method === 'POST') {
                return handleSave(request, env);
            }
            if (pathname === '/api/vndb-image' && request.method === 'GET') {
                return handleVndbImage(request);
            }

            // 未知 /api 路由
            return json({ error: 'Not found' }, 404);
        } catch (err: any) {
            return json({ error: err?.message || String(err) }, 500);
        }
    },
} satisfies ExportedHandler<Env>;

/* ----------------------------- /api/search ----------------------------- */

async function handleSearch(request: Request): Promise<Response> {
    let body: any;
    try {
        body = await request.json();
    } catch (e: any) {
        return json({ error: 'Invalid JSON in request body: ' + (e?.message || String(e)) }, 400);
    }

    // 带 searchMode 的为 Bangumi 请求；否则按原 VNDB 逻辑转发
    if (body.searchMode) {
        const { searchMode, ...bangumiPayload } = body; // 剥离 searchMode，其余转发给 Bangumi

        // 选择正确的 Bangumi 端点
        let targetUrl = 'https://api.bgm.tv/v0/search/characters'; // 默认角色
        if (searchMode === 'subject') {
            targetUrl = 'https://api.bgm.tv/v0/search/subjects';
        } else if (searchMode === 'person') {
            targetUrl = 'https://api.bgm.tv/v0/search/persons';
        }

        // 透传客户端的鉴权头
        const authHeader = request.headers.get('Authorization');

        let response: Response;
        try {
            response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                    // 固定 User-Agent 以满足 Bangumi 合规要求
                    'User-Agent': 'AnimeGrid/1.0 (https://github.com/ywh555hhh/anime-role-grid)',
                },
                body: JSON.stringify(bangumiPayload),
                // 12s 超时，避免上游慢响应拖垮 Worker
                signal: AbortSignal.timeout(12000),
            });
        } catch (e: any) {
            const msg = e?.name === 'TimeoutError' || /timeout|abort/i.test(e?.message || '')
                ? '搜索上游 (Bangumi) 响应超时，请稍后重试'
                : `搜索上游请求失败: ${e?.message || String(e)}`;
            return json({ error: msg }, 502);
        }

        // Bangumi 出错时可能返回非 JSON，安全透传
        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: 'Upstream returned non-JSON response', raw: text };
        }

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    // 原 VNDB 游戏搜索逻辑（保持向后兼容）
    const { keyword, page = 1, results = 25 } = body;
    if (!keyword) {
        return json({ results: [] });
    }

    const vndbBody = {
        filters: ['search', '=', keyword],
        page,
        results,
        fields: 'id,title,released,rating,platforms,image.url',
    };

    const res = await fetch('https://api.vndb.org/kana/vn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'anime-role-grid (proxy)' },
        body: JSON.stringify(vndbBody),
    });

    const text = await res.text();
    return new Response(text, {
        status: res.status,
        headers: { ...cors(), 'Content-Type': 'application/json' },
    });
}

/* ------------------------------ /api/save ------------------------------ */

interface SaveRequest {
    templateId: string;
    customTitle?: string;
    items: Array<{
        label: string;
        imgUrl?: string;
        character?: { name: string; image?: string };
    }>;
}

async function handleSave(request: Request, env: Env): Promise<Response> {
    const body = (await request.json()) as SaveRequest;
    const { templateId, customTitle, items } = body;

    if (!templateId || !Array.isArray(items)) {
        return json({ error: 'Invalid payload' }, 400);
    }

    // 1. 收集元数据
    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent');
    const referer = request.headers.get('Referer');

    // 2. 计算隐私数据
    const userHash = await generateUserHash(ip);
    const deviceType = getDeviceType(userAgent);

    // 3. 生成 ID
    const saveId = crypto.randomUUID();

    // 4. 准备数据库操作
    const statements = [];

    statements.push(
        env.DB.prepare(
            'INSERT INTO saves (id, template_id, custom_title, user_hash, device_type, referer) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(saveId, templateId, customTitle || null, userHash, deviceType, referer || null)
    );

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.character && item.character.name) {
            const imgUrl = item.imgUrl || item.character.image || null;
            statements.push(
                env.DB.prepare(
                    'INSERT INTO save_items (save_id, slot_index, slot_label, character_name, img_url) VALUES (?, ?, ?, ?, ?)'
                ).bind(saveId, i, item.label, item.character.name, imgUrl)
            );
        }
    }

    if (statements.length > 0) {
        await env.DB.batch(statements);
    }

    return json({ success: true, id: saveId });
}

function getDeviceType(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) return 'Mobile';
    return 'Desktop';
}

async function generateUserHash(ip: string): Promise<string> {
    const SALT = 'anime-grid-privacy-salt-v1';
    const msgBuffer = new TextEncoder().encode(ip + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* --------------------------- /api/vndb-image --------------------------- */

async function handleVndbImage(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url || !url.startsWith('https://')) {
        return new Response('Invalid image url', { status: 400 });
    }

    const res = await fetch(url, {
        headers: {
            // VNDB 对 UA / Referer 敏感
            'User-Agent': 'anime-role-grid (image proxy)',
            'Referer': 'https://vndb.org/',
        },
    });

    if (!res.ok || !res.body) {
        return new Response('Image fetch failed', { status: res.status });
    }

    return new Response(res.body, {
        headers: {
            'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

/* ------------------------------- helpers ------------------------------- */

function cors(): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

function json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors() },
    });
}
