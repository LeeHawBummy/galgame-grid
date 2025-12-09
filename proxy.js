import express from 'express'
import fetch from 'node-fetch'

const app = express()
const PORT = 5174

app.get('/proxy/vndb', async (req, res) => {
    try {
        const url = req.query.url  // 去掉 "as string"
        if (!url) return res.status(400).send('Missing URL')

        const response = await fetch(url)
        if (!response.ok) return res.status(502).send('Failed to fetch image')

        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'public, max-age=3600')

        response.body.pipe(res)
    } catch (err) {
        console.error(err)
        res.status(500).send('Internal Server Error')
    }
})

app.listen(PORT, () => {
    console.log(`VNDB image proxy running on http://localhost:${PORT}`)
})
