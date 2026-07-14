import { useEffect, useState } from 'react'

// Общие фильтры Маркета и Истории маркета: выставил на одной странице —
// действуют и на другой. Живут в памяти на время сессии (SPA-навигация
// состояние не сбрасывает), в хранилище не пишем.
export const EMPTY_MARKET_FILTERS = {
  sort: 'new',           // new | price_asc | price_desc
  number: '',
  priceMin: '',
  priceMax: '',
  model: '',
  backdropName: '',
  symbolName: '',
}

let state = { ...EMPTY_MARKET_FILTERS }
const EVENT = 'rubuy-market-filters'

export function getMarketFilters() {
  return state
}

export function setMarketFilters(patch) {
  state = { ...state, ...patch }
  window.dispatchEvent(new Event(EVENT))
}

export function resetMarketFilters() {
  state = { ...EMPTY_MARKET_FILTERS }
  window.dispatchEvent(new Event(EVENT))
}

export function marketFiltersActive(f = state) {
  return f.sort !== 'new'
    || Object.entries(f).some(([k, v]) => k !== 'sort' && v !== '')
}

// Реактивное состояние фильтров — обновляется из любого места приложения
export function useMarketFilters() {
  const [f, setF] = useState(state)
  useEffect(() => {
    const onChange = () => setF(state)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])
  return f
}
