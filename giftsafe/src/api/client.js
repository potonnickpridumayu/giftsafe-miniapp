const BASE = '/api'

async function request(path, options = {}) {
  const tg = window.Telegram?.WebApp
  const headers = {
    'Content-Type': 'application/json',
    ...(tg?.initData ? { 'X-Telegram-Init-Data': tg.initData } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  // Market
  getListings: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/listings${q ? '?' + q : ''}`)
  },
  getListing: (id) => request(`/listings/${id}`),
  buyListing: (id) => request(`/listings/${id}/buy`, { method: 'POST' }),

  // Auctions
  getAuctions: () => request('/auctions'),
  placeBid: (id, amount) => request(`/auctions/${id}/bid`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Portfolio
  getPortfolio: () => request('/portfolio'),

  // Profile
  getProfile: () => request('/profile'),

  // Sell
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
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
