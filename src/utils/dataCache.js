import { api } from '../api/client'

// Кэш данных вкладок в памяти: страница рендерится мгновенно из кэша,
// свежие данные подтягиваются фоном. prefetchAll() дёргается на старте,
// пока висит сплэш — к первому экрану всё уже загружено.
const store = new Map()

export const getCached = (key) => store.get(key)
export const setCached = (key, value) => { store.set(key, value) }

let prefetchPromise = null
export function prefetchAll() {
  if (!prefetchPromise) {
    prefetchPromise = Promise.allSettled([
      api.getListings().then(d => setCached('listings', d)),
      api.getTrades().then(d => setCached('trades', d)),
      // вне Telegram (нет initData) портфель вернёт 401 — allSettled это глотает
      api.getMyGifts().then(d => setCached('portfolio', d)),
    ])
  }
  return prefetchPromise
}
