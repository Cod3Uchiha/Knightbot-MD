const fs = require('fs')
const os = require('os')
const path = require('path')
const pino = require('pino')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys')

async function generatePairCodeWithBaileys(number, timeoutMs = 45000) {
    const tempSessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knightbot-pair-'))
    let sock
    let timeout

    try {
        const { state } = await useMultiFileAuthState(tempSessionDir)
        const { version } = await fetchLatestBaileysVersion()

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['KnightBot Pair API', 'Chrome', '1.0.0'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
            },
            markOnlineOnConnect: false,
            syncFullHistory: false,
            defaultQueryTimeoutMs: timeoutMs,
            connectTimeoutMs: timeoutMs,
        })

        await new Promise((resolve) => setTimeout(resolve, 1500))

        const codePromise = sock.requestPairingCode(number)
        const timeoutPromise = new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Timed out while requesting pair code from WhatsApp.')), timeoutMs)
        })

        let code = await Promise.race([codePromise, timeoutPromise])
        code = code?.match(/.{1,4}/g)?.join('-') || code

        if (!code) {
            throw new Error('WhatsApp did not return a pairing code. Please try again.')
        }

        return code
    } finally {
        if (timeout) clearTimeout(timeout)
        try {
            if (sock?.ws) sock.ws.close()
            if (sock?.end) sock.end()
        } catch (e) {
            // noop
        }
        fs.rmSync(tempSessionDir, { recursive: true, force: true })
    }
}

module.exports = {
    generatePairCodeWithBaileys,
}
