const { fetchPairCode, normalizePhoneNumber } = require('../lib/pair-code-service')

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function createPanelPage({ code = '', error = '', phone = '' } = {}) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Knight Bot Pair Code</title>
  <style>
    :root{color-scheme:dark}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px}
    .card{width:100%;max-width:540px;background:#111827;border:1px solid #334155;border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.3)}
    h1{margin:0 0 8px;font-size:1.5rem}
    p{color:#94a3b8;margin:0 0 16px}
    input,button{width:100%;padding:12px;border-radius:10px;border:1px solid #334155;font-size:1rem;box-sizing:border-box}
    input{background:#0b1220;color:#e2e8f0;margin-bottom:12px}
    button{background:#2563eb;color:#fff;border:none;font-weight:700;cursor:pointer}
    .result{margin-top:16px;padding:14px;border-radius:10px;background:#0b1220;border:1px solid #334155}
    .error{border-color:#ef4444;color:#fda4af}
    .code{font-size:1.4rem;letter-spacing:.1em;font-weight:700;color:#86efac;text-align:center}
    .steps{margin-top:12px;font-size:.95rem;color:#cbd5e1}
    .hint{margin-top:8px;font-size:.85rem;color:#94a3b8}
  </style>
</head>
<body>
  <main class="card">
    <h1>Connect Knight Bot</h1>
    <p>Enter your WhatsApp number (country code included, no + sign), then use the generated code in Linked Devices.</p>
    <form method="GET" action="/">
      <input name="number" required placeholder="e.g. 14155552671" value="${escapeHtml(phone)}" pattern="[0-9]{6,20}" />
      <button type="submit">Generate Pair Code</button>
    </form>
    <div class="hint">Status endpoint: <code>/health</code></div>
    ${error ? `<div class="result error">${escapeHtml(error)}</div>` : ''}
    ${code ? `<div class="result"><div class="code">${escapeHtml(code)}</div><div class="steps">Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead → Enter this code.</div></div>` : ''}
  </main>
</body>
</html>`
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, max-age=0')

    const number = normalizePhoneNumber(req.query?.number || '')

    let code = ''
    let error = ''

    if (number) {
        try {
            const result = await fetchPairCode(number)
            code = result.code
        } catch (err) {
            error = err.message || 'Failed to generate code right now. Please try again.'
        }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(createPanelPage({ code, error, phone: number }))
}
