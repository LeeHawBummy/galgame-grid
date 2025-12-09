export const onRequestOptions = async () => {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
};

export const onRequestPost = async ({ request }: any) => {
  try {
    let body;
    try {
      const text = await request.text();
      console.log('Request body text:', text);
      body = JSON.parse(text);
      console.log('Parsed body:', body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body: ' + e.message }),
        { status: 400, headers: cors() }
      );
    }
    
    // Check if this is a Bangumi search request
    if (body.searchMode) {
      // Handle Bangumi API requests
      const { searchMode, ...bangumiPayload } = body; // Extract searchMode, leave the rest for Bangumi

      // Determine correct endpoint
      // Default to characters if not specified or invalid (safety fallback)
      let targetUrl = 'https://api.bgm.tv/v0/search/characters';

      if (searchMode === 'subject') {
          targetUrl = 'https://api.bgm.tv/v0/search/subjects';
      } else if (searchMode === 'person') {
          targetUrl = 'https://api.bgm.tv/v0/search/persons';
      }

      // Get client's auth header
      const authHeader = request.headers.get('Authorization');

      // Forward to Bangumi
      const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || '',
              // Use a fixed User-Agent for proxy to ensure compliance
              'User-Agent': 'AnimeGrid/1.0 (https://github.com/ywh555hhh/anime-role-grid)',
          },
          body: JSON.stringify(bangumiPayload),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
          status: response.status,
          headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*', // Allow CORS
          },
      });
    } else {
      // Handle VNDB API requests (original logic)
      const { keyword, page = 1, results = 25 } = body

      if (!keyword) {
        return new Response(
          JSON.stringify({ results: [] }),
          { status: 200, headers: cors() }
        )
      }

      const vndbBody = {
        filters: ['search', '=', keyword], // ✅ 关键修正点
        page,
        results,
        fields: 'id,title,released,rating,platforms,image.url'
      }

      const res = await fetch('https://api.vndb.org/kana/vn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'anime-role-grid (proxy)',
        },
        body: JSON.stringify(vndbBody),
      })

      const text = await res.text()
      //console.log('VNDB raw response:', text)  // ✅ 加这个看看返回原始数据

      return new Response(text, {
        status: res.status,
        headers: {
          ...cors(),
          'Content-Type': 'application/json',
        },
      })
    }

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: cors() }
    )
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
