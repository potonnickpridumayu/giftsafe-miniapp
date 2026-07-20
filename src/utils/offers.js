// Глобальный счётчик ВХОДЯЩИХ офферов — для бейджа на вкладке «Профиль» в
// нижней навигации. Живёт в модуле (как cart/marketFilters): NavBar его
// опрашивает и подписывается, Profile обновляет точечно после действий, чтобы
// бейдж гас сразу, не дожидаясь следующего тика поллера.
let incoming = 0
const subs = new Set()

export function getIncomingOffers() {
  return incoming
}

export function setIncomingOffers(n) {
  const v = Number(n) || 0
  if (v === incoming) return
  incoming = v
  subs.forEach((fn) => { try { fn(v) } catch { /* подписчик отвалился */ } })
}

export function subscribeOffers(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}
