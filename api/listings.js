import crypto from 'crypto'

function verifyTelegramData(initData, botToken) {
  if (!initData || !botToken) return null
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    params.delete('hash')
    const dataStr = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const checkHash = crypto.createHmac('sha256', secretKey).update(dataStr).digest('hex')
    if (checkHash !== hash) return null
    return JSON.parse(params.get('user') || 'null')
  } catch { return null }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const initData = req.headers['x-telegram-init-data'] || ''
  const user = verifyTelegramData(initData, process.env.TELEGRAM_BOT_TOKEN)

  if (req.method === 'GET') {
    // TODO: подключить SQLite/PostgreSQL
    return res.json({ listings: [], total: 0, page: 1 })
  }

  if (req.method === 'POST') {
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    const { gift_id, price } = req.body
    if (!gift_id || !price) return res.status(400).json({ error: 'Missing fields' })
    // TODO: сохранить в БД
    return res.json({ ok: true, listing_id: Date.now() })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
