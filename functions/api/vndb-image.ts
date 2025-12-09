export const onRequestGet = async ({ request }: any) => {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url || !url.startsWith('https://')) {
    return new Response('Invalid image url', { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        // ✅ VNDB 对 UA / Referer 敏感
        'User-Agent': 'anime-role-grid (image proxy)',
        'Referer': 'https://vndb.org/',
      },
    })

    if (!res.ok || !res.body) {
      return new Response('Image fetch failed', { status: res.status })
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e: any) {
    return new Response(e.message, { status: 500 })
  }
}
