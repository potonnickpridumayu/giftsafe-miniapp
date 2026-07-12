import { useEffect, useState } from 'react'

// Корзина маркета: в localStorage лежат только id лотов, сами данные лота
// всегда берём свежими из /listings (цена могла смениться, лот — продаться).
const KEY = 'rubuy_cart_v1'
const EVENT = 'rubuy-cart-change'

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function write(ids) {
  localStorage.setItem(KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event(EVENT))
}

export const getCartIds = read

export function toggleCart(id) {
  const ids = read()
  write(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
}

export function removeFromCart(id) {
  write(read().filter(x => x !== id))
}

export function pruneCart(validIds) {
  const valid = new Set(validIds)
  const ids = read()
  const kept = ids.filter(x => valid.has(x))
  if (kept.length !== ids.length) write(kept)
  return ids.length - kept.length // сколько лотов «протухло»
}

// Реактивный список id в корзине — обновляется из любого места приложения
export function useCartIds() {
  const [ids, setIds] = useState(read)
  useEffect(() => {
    const onChange = () => setIds(read())
    window.addEventListener(EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])
  return ids
}
