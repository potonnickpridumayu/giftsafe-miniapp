const BASE = 'https://nftmarketbot-production.up.railway.app/api'

async function request(path, options = {}) {
  const tg = window.Telegram?.WebApp
  const headers = {
    'Content-Type': 'application/json',
    ...(tg?.initData ? { 'X-Telegram-Init-Data': tg.initData } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
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

function normalizeListing(x) {
  return {
    id: x.listing_id,
    gift_id: x.gift_id,
    name: x.gift_name,
    collection: x.collection_name,   // бывш. "model" в моках
    number: x.gift_number,           // напр. "#999"
    emoji: RARITY_EMOJI[x.rarity] || '🎁',
    image_url: x.image_url || '',
    rarity: x.rarity,
    price: x.price_ton,
    seller: x.seller_username,
    seller_id: x.seller_id,
    views: x.views,
    description: x.description,
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

  // Auctions — TODO: нормализовать под реальный ответ, когда увидим /api/auctions
  getAuctions: async () => {
    const res = await request('/auctions')
    return toArray(res, 'auctions')
  },
  placeBid: (id, amount) =>
    request(`/auctions/${id}/bid`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Portfolio — TODO: нормализовать под реальный ответ
  getPortfolio: async () => {
    const res = await request('/portfolio')
    return toArray(res, 'portfolio')
  },

  // Profile
  getProfile: () => request('/profile'),

  // Sell
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),

  // Escrow deposit
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