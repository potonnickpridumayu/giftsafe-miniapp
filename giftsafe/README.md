# GiftSafe Mini App

Telegram Mini App — маркет NFT-подарков. Аналог MRKT/Portals с комиссией 2.5% и без азартных игр.

## Стек
- **Фронтенд**: React + Vite + React Router
- **API**: Vercel Serverless Functions (Node.js)
- **Бот**: Python + aiogram 3 (отдельный репозиторий)

## Деплой на Vercel

### 1. Залить на GitHub
```bash
git init
git add .
git commit -m "init giftsafe miniapp"
git remote add origin https://github.com/ВАШ_USERNAME/giftsafe-miniapp.git
git push -u origin main
```

### 2. Подключить к Vercel
- Открыть vercel.com → New Project → Import репозиторий
- Framework: Vite (определится автоматически)
- Добавить переменные окружения:
  - `TELEGRAM_BOT_TOKEN` — токен вашего бота
  - `MINIAPP_URL` — URL задеплоенного сайта (после деплоя)

### 3. Подключить Mini App к боту

После деплоя (получите URL вида `https://giftsafe-miniapp.vercel.app`):

**Вариант A: через @BotFather (рекомендуется)**
```
/newapp — создать Web App
URL: https://giftsafe-miniapp.vercel.app
```

**Вариант B: через кнопку в боте (уже настроено в webhook.js)**
Команда /start отправляет кнопку с `web_app.url`

### 4. Установить webhook для бота
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://giftsafe-miniapp.vercel.app/api/webhook
```

### 5. Настроить MenuButton (кнопка в интерфейсе чата)
```
https://api.telegram.org/bot<TOKEN>/setChatMenuButton
Body: {"menu_button": {"type": "web_app", "text": "Маркет", "web_app": {"url": "https://giftsafe-miniapp.vercel.app"}}}
```

## Локальная разработка
```bash
npm install
npm run dev
# Открыть http://localhost:3000
# В браузере работает без Telegram (мок-данные)
```

## Архитектура
```
giftsafe/
├── src/
│   ├── pages/          # Market, Auctions, Portfolio, Profile, Sell, ListingDetail
│   ├── components/     # NavBar, GiftCard
│   ├── hooks/          # useTelegram
│   ├── api/            # client.js (fetch + mock data)
│   └── styles/         # global.css
├── api/                # Vercel Serverless Functions
│   ├── listings.js     # GET/POST /api/listings
│   └── webhook.js      # POST /api/webhook (Telegram бот)
├── vercel.json
└── index.html
```
