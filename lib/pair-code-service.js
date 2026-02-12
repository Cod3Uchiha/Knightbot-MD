const axios = require('axios')
const { generatePairCodeWithBaileys } = require('./local-pair-code')

const pairCodeApiBase = process.env.PAIRCODE_API_URL || 'https://knight-bot-paircode.onrender.com'
const pairCodeApiEndpoint = process.env.PAIRCODE_API_ENDPOINT || ''
const requestTimeoutMs = Number(process.env.PAIRCODE_TIMEOUT_MS || 10000)
const retryCount = Number(process.env.PAIRCODE_RETRIES || 2)
const pairCodeSource = (process.env.PAIRCODE_SOURCE || 'baileys').toLowerCase() // baileys | provider

function normalizePhoneNumber(input = '') {
    return String(input).replace(/[^0-9]/g, '')
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPairCodeUrl(number) {
    const endpointTemplate = pairCodeApiEndpoint || pairCodeApiBase

    if (endpointTemplate.includes('{number}')) {
        return endpointTemplate.replace('{number}', encodeURIComponent(number))
    }

    const url = new URL(endpointTemplate)
    if (!url.pathname.endsWith('/code')) {
        url.pathname = `${url.pathname.replace(/\/$/, '')}/code`
    }
    url.searchParams.set('number', number)
    return url.toString()
}

async function fetchViaProvider(normalized) {
    let lastError = null

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        try {
            const response = await axios.get(buildPairCodeUrl(normalized), {
                timeout: requestTimeoutMs,
            })

            const code = response?.data?.code
            if (!code || code === 'Service Unavailable') {
                const err = new Error('Pair code service is unavailable. Please try again later.')
                err.statusCode = 502
                throw err
            }

            return code
        } catch (error) {
            lastError = error
            if (attempt < retryCount) await delay(250 * (attempt + 1))
        }
    }

    const upstreamStatus = lastError?.response?.status
    let message = lastError?.message || 'Failed to generate code right now. Please try again.'

    if (upstreamStatus === 403) {
        message = 'Pair code provider blocked this request (403). Configure PAIRCODE_API_URL or PAIRCODE_API_ENDPOINT with a working provider URL.'
    } else if (upstreamStatus === 404) {
        message = 'Pair code provider endpoint not found (404). Ensure PAIRCODE_API_URL is base URL or set PAIRCODE_API_ENDPOINT (example: https://domain.tld/code?number={number}).'
    }

    const err = new Error(message)
    err.statusCode = lastError?.statusCode || upstreamStatus || 502
    throw err
}

async function fetchPairCode(number) {
    const normalized = normalizePhoneNumber(number)

    if (!normalized || normalized.length < 6 || normalized.length > 20) {
        const err = new Error('Invalid number. Use international format with country code.')
        err.statusCode = 400
        throw err
    }

    if (pairCodeSource === 'provider') {
        const code = await fetchViaProvider(normalized)
        return { number: normalized, code }
    }

    try {
        const code = await generatePairCodeWithBaileys(normalized, Number(process.env.BAILEYS_PAIR_TIMEOUT_MS || 45000))
        return { number: normalized, code }
    } catch (baileysError) {
        // Fallback to provider if configured and Baileys fails
        try {
            const code = await fetchViaProvider(normalized)
            return { number: normalized, code }
        } catch (providerError) {
            const err = new Error(`Failed via Baileys and provider fallback. Baileys: ${baileysError.message}. Provider: ${providerError.message}`)
            err.statusCode = providerError.statusCode || 502
            throw err
        }
    }
}

module.exports = {
    fetchPairCode,
    normalizePhoneNumber,
}
