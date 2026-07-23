const BASE = 'https://nftmarketbot-production.up.railway.app/api'

async function request(path, options = {}) {
  const tg = window.Telegram?.WebApp
  const headers = {
    'Content-Type': 'application/json',
    ...(tg?.initData ? { 'X-Telegram-Init-Data': tg.initData } : {}),
    ...options.headers,
  }
  let res
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    // fetch бросает TypeError "Failed to fetch" при сетевом сбое:
    // нет связи, сервер перезапускается (деплой), VPN моргнул и т.п.
    const err = new Error('Нет связи с сервером. Попробуйте ещё раз')
    err.network = true
    throw err
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try { const j = await res.json(); if (j?.detail) detail = j.detail } catch {}
    const err = new Error(detail)
    err.status = res.status
    throw err
  }
  return res.json()
}

// --- Нормализация: приводим ответ API к форме, которую ждут страницы ---

// эмодзи-заглушка, пока у гифтов нет картинок (image_url пустой)
const RARITY_EMOJI = {
  Legendary: '👑',
  Epic: '💎',
  Rare: '🔮',
  Common: '🎁',
}

// Точка-акцент над карточкой подарка: раньше бралась из строкового item.rarity
// ("Legendary" и т.п.), которое бэкенд никогда не присылает (было только в
// моках) — все точки были одного серого цвета. И попытка вывести цвет из
// реальных rarity_per_mille (model/backdrop/symbol) на практике тоже не дала
// заметного разброса. Экспериментальный вариант: стабильный (не мигающий на
// каждый рендер) псевдослучайный цвет из 8 штук — хэш от id самого подарка.
const ACCENT_PALETTE = [
  '#f0b47e', '#c084f0', '#7f9df5', '#a390a0',
  '#ff5c7c', '#3ddc84', '#ff6b5e', '#4fd1c5',
]
export function giftAccentColor(id) {
  const s = String(id || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length]
}

// Слаг подарка: nft_address, а если пусто (Rubuy Bank) — из имени и номера.
export function giftSlug(name, number, nftAddress) {
  const num = String(number || '').replace(/[#\s]/g, '')
  return nftAddress || ((name && num) ? `${String(name).replace(/\s+/g, '')}-${num}` : '')
}
// Официальный рендер подарка (фон+узор+стикер) от Telegram/Fragment.
export function fragmentImage(name, number, nftAddress) {
  const slug = giftSlug(name, number, nftAddress)
  return slug ? `https://nft.fragment.com/gift/${slug.toLowerCase()}.medium.jpg` : ''
}

function normalizeListing(x) {
  const _slug = giftSlug(x.gift_name, x.gift_number, x.nft_address)
  return {
    id: x.listing_id,
    gift_id: x.gift_id,
    name: x.gift_name,
    collection: x.collection_name,   // бывш. "model" в моках
    number: x.gift_number,           // напр. "#999"
    emoji: RARITY_EMOJI[x.rarity] || '🎁',
    image_url: x.image_url || '',
    tg_sticker: x.tg_sticker || '',
    tg_thumb: x.tg_thumb || '',
    tg_backdrop: x.tg_backdrop || '',
    rarity: x.rarity,
    price: x.price_ton,
    nft_address: x.nft_address || '',
    gift_link: _slug ? `https://t.me/nft/${_slug}` : '',
    image_full: fragmentImage(x.gift_name, x.gift_number, x.nft_address),
    seller: x.seller_username,
    seller_id: x.seller_id,
    views: x.views,
    description: x.description,
    status: x.status,
    listed_at: x.created_at ? new Date(x.created_at).getTime() : Date.now(),
  }
}

// Обогащает подарок из "сырого" ответа бэка (json_agg-объект) удобными
// клиентскими полями — слаг, полная картинка, ссылка на Telegram.
function normalizeGift(g) {
  const _slug = giftSlug(g.gift_name, g.gift_number, g.nft_address)
  return {
    ...g,
    name: g.gift_name,
    number: g.gift_number,
    collection: g.collection_name,
    emoji: RARITY_EMOJI[g.rarity] || '🎁',
    gift_link: _slug ? `https://t.me/nft/${_slug}` : '',
    image_full: fragmentImage(g.gift_name, g.gift_number, g.nft_address),
  }
}

function normalizeTrade(x) {
  const gifts = (x.gifts || []).map(normalizeGift)
  const first = gifts[0] || {}
  return {
    id: x.trade_id,
    gifts,
    giftCount: gifts.length,
    // поля первого подарка — чтобы карточки/списки, ждущие один подарок
    // (сетка обмена, бейджи), продолжали работать без переделки
    gift_id: first.gift_id,
    name: gifts.length > 1 ? `${first.name} +${gifts.length - 1}` : first.name,
    collection: first.collection,
    number: first.number,
    emoji: first.emoji || '🎁',
    image_url: first.image_url || '',
    tg_sticker: first.tg_sticker || '',
    tg_thumb: first.tg_thumb || '',
    tg_backdrop: first.tg_backdrop || '',
    rarity: first.rarity,
    note: x.note || '',
    nft_address: first.nft_address || '',
    gift_link: first.gift_link || '',
    image_full: first.image_full || '',
    owner: x.owner_username,
    owner_name: x.owner_name,
    owner_id: x.owner_id,
    status: x.status,
    listed_at: x.created_at ? new Date(x.created_at).getTime() : Date.now(),
  }
}

// на случай, если ответ обёрнут в {listings: [...]} / {items: [...]} / просто массив
function toArray(res, key) {
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res[key])) return res[key]
  if (res && Array.isArray(res.items)) return res.items
  return []
}

export const api = {
  // Market
  getReferralStats: () => request('/referral/stats'),
  getListings: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await request(`/listings${q ? '?' + q : ''}`)
    return toArray(res, 'listings').map(normalizeListing)
  },
  getListing: async (id) => {
    const res = await request(`/listings/${id}`)
    // detail может прийти как объект или как {listing: {...}}
    return normalizeListing(res.listing || res)
  },
  buyListing: (id) => request(`/listings/${id}/buy`, { method: 'POST' }),
  // Публичная лента последних сделок маркета (продажи + обмены, анонимно)
  getMarketHistory: async () => {
    const res = await request('/market/history')
    return res.history || []
  },
  changePrice: (id, price) =>
    request(`/listings/${id}/price`, { method: 'POST', body: JSON.stringify({ price }) }),

  // Офферы по цене на лоты Маркета (мин. 50% цены — проверяется на бэкенде)
  proposeListingOffer: (listingId, amount_ton) =>
    request(`/listings/${listingId}/offer`, { method: 'POST', body: JSON.stringify({ amount_ton }) }),
  getMyListingOffers: () => request('/listings/offers/mine'),
  acceptListingOffer: (offerId) => request(`/listings/offers/${offerId}/accept`, { method: 'POST' }),
  declineListingOffer: (offerId) => request(`/listings/offers/${offerId}/decline`, { method: 'POST' }),
  cancelListingOffer: (offerId) => request(`/listings/offers/${offerId}/cancel`, { method: 'POST' }),

  // Обмен
  getTrades: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await request(`/trades${q ? '?' + q : ''}`)
    return toArray(res, 'trades').map(normalizeTrade)
  },
  getTrade: async (id) => {
    const res = await request(`/trades/${id}`)
    return normalizeTrade(res.trade || res)
  },
  createTrade: (gift_ids, note = '') =>
    request('/trades', { method: 'POST', body: JSON.stringify({ gift_ids, note }) }),
  cancelTrade: (id) => request(`/trades/${id}`, { method: 'DELETE' }),
  proposeTradeOffer: (tradeId, offered_gift_ids, top_up_ton = 0) =>
    request(`/trades/${tradeId}/offer`, {
      method: 'POST', body: JSON.stringify({ offered_gift_ids, top_up_ton }),
    }),
  getMyTradeOffers: () => request('/trades/offers/mine'),
  // Завершённые обмены, которые ещё не показывали анимацией (сервер сразу
  // помечает их показанными — повторно не придут).
  getUnseenSwaps: () => request('/trades/swaps/unseen'),
  acceptTradeOffer: (offerId) => request(`/trades/offers/${offerId}/accept`, { method: 'POST' }),
  declineTradeOffer: (offerId) => request(`/trades/offers/${offerId}/decline`, { method: 'POST' }),
  cancelTradeOffer: (offerId) => request(`/trades/offers/${offerId}/cancel`, { method: 'POST' }),

  // Ордеры (заявки на покупку)
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: async () => {
    const res = await request('/orders')
    return toArray(res, 'orders')
  },
  getMyOrders: async () => {
    const res = await request('/orders/mine')
    return toArray(res, 'orders')
  },
  getOrdersForGift: async (giftId) => {
    const res = await request(`/orders/for-gift/${giftId}`)
    return toArray(res, 'orders')
  },
  fulfillOrder: (orderId, giftId) =>
    request(`/orders/${orderId}/fulfill`, { method: 'POST', body: JSON.stringify({ gift_id: giftId }) }),
  cancelOrder: (orderId) => request(`/orders/${orderId}/cancel`, { method: 'POST' }),

  // Portfolio
  getMyGifts: async () => {
    const res = await request('/portfolio')
    return res.gifts || []
  },

  // Profile
  getProfile: () => request('/profile'),

  // Sell
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),

  // Escrow deposit
  // Адрес сейфа берём с бэкенда перед каждым пополнением и НИКОГДА не зашиваем
  // в код: раньше он был константой в Profile.jsx, бэкенд переехал на mainnet,
  // а фронт продолжил слать деньги на старый адрес.
  getEscrowAddress: () => request('/escrow/address'),
  createDepositIntent: () => request('/escrow/deposit-intent', { method: 'POST' }),
  getDepositStatus: () => request('/escrow/deposit-intent'),
  withdrawListing: (id) => request(`/escrow/withdraw/${id}`, { method: 'POST' }),

  // TON balance withdrawal
  withdrawBalance: (to_address, amount) =>
    request('/balance/withdraw', { method: 'POST', body: JSON.stringify({ to_address, amount }) }),
}

// Mock data for dev (когда нет бэкенда)
export const MOCK = {
  listings: [
    { id: 1, name: 'Durov\'s Cap', emoji: '🎩', rarity: 'Legendary', price: 250, model: 'Cap', backdrop: 'Gold', symbol: '⭐', seller: 'cryptowhale', seller_id: 111, listed_at: Date.now() - 3600000 },
    { id: 2, name: 'Plush Pepe', emoji: '🐸', rarity: 'Epic', price: 85, model: 'Pepe', backdrop: 'Green', symbol: '💎', seller: 'nftcollector', seller_id: 222, listed_at: Date.now() - 7200000 },
    { id: 3, name: 'Loot Bag', emoji: '🎒', rarity: 'Rare', price: 42, model: 'Bag', backdrop: 'Purple', symbol: '🌙', seller: 'giftmaster', seller_id: 333, listed_at: Date.now() - 86400000 },
    { id: 4, name: 'Diamond Ring', emoji: '💍', rarity: 'Legendary', price: 500, model: 'Ring', backdrop: 'Crystal', symbol: '🔷', seller: 'richguy', seller_id: 444, listed_at: Date.now() - 10800000 },
    { id: 5, name: 'Cake Slice', emoji: '🎂', rarity: 'Common', price: 12, model: 'Cake', backdrop: 'Pink', symbol: '🎀', seller: 'bakery', seller_id: 555, listed_at: Date.now() - 172800000 },
    { id: 6, name: 'Magic Wand', emoji: '🪄', rarity: 'Epic', price: 130, model: 'Wand', backdrop: 'Dark', symbol: '✨', seller: 'wizard99', seller_id: 666, listed_at: Date.now() - 43200000 },
  ],
  auctions: [
    { id: 1, name: 'Cosmic Cat', emoji: '🐱', rarity: 'Legendary', current_bid: 320, min_bid: 340, ends_at: Date.now() + 7200000, bids_count: 14, top_bidder: 'cryptowhale' },
    { id: 2, name: 'Golden Trophy', emoji: '🏆', rarity: 'Epic', current_bid: 95, min_bid: 100, ends_at: Date.now() + 3600000, bids_count: 7, top_bidder: 'collector' },
    { id: 3, name: 'Dragon Egg', emoji: '🥚', rarity: 'Legendary', current_bid: 750, min_bid: 800, ends_at: Date.now() + 86400000, bids_count: 31, top_bidder: 'whaleking' },
  ],
  portfolio: [
    { id: 1, name: 'Durov\'s Cap', emoji: '🎩', rarity: 'Legendary', estimated: 280, bought_for: 250 },
    { id: 2, name: 'Lucky Clover', emoji: '🍀', rarity: 'Rare', estimated: 38, bought_for: 30 },
    { id: 3, name: 'Fire Heart', emoji: '❤️‍🔥', rarity: 'Epic', estimated: 95, bought_for: 80 },
  ],
}