import type { BgmSubjectSearchResultItem, BgmCharacterSearchResultItem, BgmPersonSearchResultItem } from '~/types'

// 从环境变量中获取敏感信息
const accessToken = import.meta.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = import.meta.env.VITE_BANGUMI_USER_AGENT

export class SearchError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SearchError'
    }
}

export async function useBgmSearch(
  keyword: string,
  offset = 0,
  type: 'character' | 'person' | 'game' = 'character',
  year?: string
): Promise<(BgmCharacterSearchResultItem | BgmSubjectSearchResultItem | BgmPersonSearchResultItem)[]> {

  if (!keyword) return []

  if (type === 'character' || type === 'person') {
    // 使用 Bangumi API 搜索角色/人物
    const isCharacter = type === 'character'
    const searchMode = isCharacter ? 'character' : 'person'
    
    
    // 使用同源代理 API。
    // 生产环境由 Cloudflare Pages Function (functions/api/search.ts) 接管；
    // 本地开发由 Vite dev server 代理转发 (见 vite.config.ts 的 server.proxy)。
    // 这样避免了硬编码 localhost:8787（需要单独启动 wrangler pages dev）。
    const finalUrl = '/api/search'

    // 检查凭证是否存在
    if (!accessToken || !userAgent || accessToken === 'your_real_bangumi_access_token_here') {
        throw new SearchError('请在 .env 文件中配置正确的 Bangumi Access Token 和 User Agent。')
    }

    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        keyword,
        filter: { type: [1] }, // Character API uses type 1 for chars
        offset,
        limit: 20,
        searchMode, // Tell proxy which API to use
      }),
    })

    if (!res.ok) {
      if (res.status === 401) {
        throw new SearchError('API 认证失败 (401)。请检查 Access Token 是否过期或无效。')
      }
      if (res.status === 405 || res.status === 404) {
        // 代理端点不存在：本地未启动 functions，或生产环境 Pages Functions 未部署
        throw new SearchError('搜索代理不可用 (代理端点未部署)。本地请运行 `npm run dev:functions`，生产请确认 Cloudflare Pages Functions 已部署 functions/api 目录。')
      }
      throw new SearchError(`API 请求失败: ${res.status} ${res.statusText}`)
    }

    const result = await res.json()
    const items = (result.data || []) as (BgmCharacterSearchResultItem | BgmPersonSearchResultItem)[]
    
    return items
  } else {
    // 使用 VNDB API 搜索游戏 (保持原有逻辑不变)
    const filters = year
        ? [
            'and',
            ['search', '=', keyword],
            ['released', '>=', `${year}-01-01`],
            ['released', '<=', `${year}-12-31`],
          ]
        : ['search', '=', keyword]
    const body = {
      filters, // ✅ kana 推荐用 = 搜索
      page: Math.floor(offset / 25) + 1,
      results: 25,
      fields: 'id,title,released,rating,platforms,image.url'
    }

    const res = await fetch('https://api.vndb.org/kana/vn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'anime-role-grid',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`VNDB API ${res.status}: ${text}`)
    }

    const data = await res.json()

    return (data.results ?? []).map((item: any): BgmSubjectSearchResultItem => ({
      id: Number(item.id.replace('v', '')),
      name: item.title,
      name_cn: item.alttitle ?? item.title,
      date: item.released,
      platform: item.platforms?.[0] ?? 'PC',
      type: 1,
      score: typeof item.rating === 'number'
        ? item.rating / 10
        : undefined,
      images: {
        small: item.image?.url ?? '',
        medium: item.image?.url ?? '',
        large: item.image?.url ?? '',
        grid: item.image?.url ?? '',
        common: item.image?.url ?? '',
      },
    }))
  }
}
