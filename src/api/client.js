import axios from 'axios';
import WebApp from '@twa-dev/sdk';

// В продакшене замени на URL твоего бэкенда
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Автоматически добавляем Telegram initData для аутентификации
api.interceptors.request.use(config => {
  config.headers['X-Telegram-Init-Data'] = WebApp.initData || '';
  return config;
});

// ── Market ──────────────────────────────────────────────────────────────────
export const getListings = (offset = 0) =>
  api.get(`/api/listings?offset=${offset}`).then(r => r.data);

export const getListing = (id) =>
  api.get(`/api/listings/${id}`).then(r => r.data);

export const buyListing = (listingId) =>
  api.post(`/api/listings/${listingId}/buy`).then(r => r.data);

export const createListing = (data) =>
  api.post('/api/listings', data).then(r => r.data);

export const cancelListing = (id) =>
  api.delete(`/api/listings/${id}`).then(r => r.data);

// ── Auctions ─────────────────────────────────────────────────────────────────
export const getAuctions = (offset = 0) =>
  api.get(`/api/auctions?offset=${offset}`).then(r => r.data);

export const getAuction = (id) =>
  api.get(`/api/auctions/${id}`).then(r => r.data);

export const placeBid = (auctionId, amount) =>
  api.post(`/api/auctions/${auctionId}/bid`, { amount }).then(r => r.data);

export const buyoutAuction = (auctionId) =>
  api.post(`/api/auctions/${auctionId}/buyout`).then(r => r.data);

export const createAuction = (data) =>
  api.post('/api/auctions', data).then(r => r.data);

// ── Portfolio ─────────────────────────────────────────────────────────────────
export const getPortfolio = () =>
  api.get('/api/portfolio').then(r => r.data);

export const getTransactions = () =>
  api.get('/api/transactions').then(r => r.data);

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = () =>
  api.get('/api/profile').then(r => r.data);

export const getRefLink = () =>
  api.get('/api/referral').then(r => r.data);
