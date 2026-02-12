module.exports = function handler(req, res) {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(200).send({
        ok: true,
        service: 'knightbot-vercel-pair-panel',
        uptimeHint: 'Use multiple Vercel regions + retries in pair-code upstream for reliability.',
    })
}
