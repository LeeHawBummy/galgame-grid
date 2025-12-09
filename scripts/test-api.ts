import 'dotenv/config'

const accessToken = process.env.VITE_BANGUMI_ACCESS_TOKEN
const userAgent = process.env.VITE_BANGUMI_USER_AGENT

console.log('Testing Bangumi API...')
console.log('User Agent:', userAgent)
console.log('Access Token Present:', !!accessToken)

async function testSearch(keyword: string) {
    try {
        const res = await fetch('https://api.bgm.tv/v0/search/characters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': userAgent || 'test-script',
            },
            body: JSON.stringify({
                keyword,
                filter: {
                    type: [1], // Character
                }
            }),
        })

        console.log('Response Status:', res.status)

        if (!res.ok) {
            console.error('Error Body:', await res.text())
            return
        }

        const data = await res.json()
        console.log('Search Results for:', keyword)
        console.log(JSON.stringify(data, null, 2))
    } catch (error) {
        console.error('Fetch Error:', error)
    }
}

testSearch('Saber')
