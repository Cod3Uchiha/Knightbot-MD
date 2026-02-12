const axios = require('axios')

const pairCodeApiBase = process.env.PAIRCODE_API_URL || 'https://knight-bot-paircode.onrender.com'
const requestTimeoutMs = Number(process.env.PAIRCODE_TIMEOUT_MS || 10000)
const retryCount = Number(process.env.PAIRCODE_RETRIES || 2)

function normalizePhoneNumber(input = '') {
    return String(input).replace(/[^0-9]/g, '')
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPairCode(number) {
    const normalized = normalizePhoneNumber(number)

    if (!normalized || normalized.length < 6 || normalized.length > 20) {
        const err = new Error('Invalid number. Use international format with country code.')
        err.statusCode = 400
        throw err
    }

    let lastError = null

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        try {
            const response = await axios.get(`${pairCodeApiBase}/code`, {
                params: { number: normalized },
                timeout: requestTimeoutMs,
            })

            const code = response?.data?.code
            if (!code || code === 'Service Unavailable') {
                const err = new Error('Pair code service is unavailable. Please try again later.')
                err.statusCode = 502
                throw err
            }

            return { number: normalized, code }
        } catch (error) {
            lastError = error

            if (attempt < retryCount) {
                await delay(250 * (attempt + 1))
                continue
            }
        }
    }

    const err = new Error(lastError?.message || 'Failed to generate code right now. Please try again.')
    err.statusCode = lastError?.statusCode || 502
    throw err
}

module.exports = {
    fetchPairCode,
    normalizePhoneNumber,
}
