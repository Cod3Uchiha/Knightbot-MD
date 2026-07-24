const { fetchPairCode } = require('../lib/pair-code-service')

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store, max-age=0')

    try {
        const number = req.query?.number || ''
        const result = await fetchPairCode(number)
        return res.status(200).send({ ok: true, ...result })
    } catch (err) {
        return res.status(err.statusCode || 502).send({
            ok: false,
            error: err.message || 'Failed to generate code right now. Please try again.',
        })
    }
}
