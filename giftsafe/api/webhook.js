// api/webhooks/telegram.js
// Этот endpoint получает обновления от Telegram бота
// Деплоится на Vercel, URL прописывается в setWebhook

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, callback_query } = req.body || {}

  // Обработка /start — открыть Mini App
  if (message?.text?.startsWith('/start')) {
    await sendMessage(message.chat.id, {
      text: '🎁 <b>GiftSafe</b> — маркет NFT-подарков Telegram\n\nНизкие комиссии · Безопасный эскроу · Без азартных игр',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{
          text: '🏪 Открыть маркет',
          web_app: { url: process.env.MINIAPP_URL || 'https://giftsafe.vercel.app' }
        }]]
      }
    })
  }

  res.status(200).json({ ok: true })
}

async function sendMessage(chatId, params) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...params })
  })
}
