import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

// Значок «Активность маркета» — эквалайзер. В покое статичен; когда на маркете
// происходит новое событие (продажа / листинг / обмен / изменение цены), на
// несколько секунд «оживает» — столбики пляшут и подсвечиваются рубином.
//
// Состояние ГЛОБАЛЬНОЕ (уровень модуля), а не в экземпляре: значок стоит в шапке
// каждой вкладки, и при переходе Маркет→Обмен→… старый экземпляр
// размонтируется, новый монтируется. Если держать `active` в useState, анимация
// обрывалась бы на каждом переходе и «жила» бы только там, где её застало
// событие. Поэтому единый опрос ленты + общий дедлайн `activeUntil`, на который
// подписаны все смонтированные значки — анимация переживает переход между
// вкладками и идёт на любой из них.

const ACTIVE_MS = 6000   // сколько «горит» после события
const POLL_MS = 20000    // как часто опрашиваем ленту (маркет-история публичная)

let lastEventTs = null   // самое свежее известное событие (baseline)
let activeUntil = 0      // до какого момента (Date.now) анимация активна
const listeners = new Set()
let pollStarted = false

function notify() { for (const fn of listeners) fn() }

async function poll() {
  if (document.hidden) return
  try {
    const items = await api.getMarketHistory()
    if (!items?.length) return
    let newest = 0
    for (const it of items) {
      const ts = new Date(it.completed_at).getTime() || 0
      if (ts > newest) newest = ts
    }
    if (lastEventTs === null) { lastEventTs = newest; return } // первый заход — только запоминаем
    if (newest > lastEventTs) {
      lastEventTs = newest
      activeUntil = Date.now() + ACTIVE_MS
      notify()
    }
  } catch { /* 401 / нет сети — тихо ждём следующего тика */ }
}

// Опрос запускаем один раз на весь жизненный цикл приложения (значок всегда
// смонтирован в шапке текущей вкладки), поэтому интервал не чистим.
function ensurePolling() {
  if (pollStarted) return
  pollStarted = true
  poll()
  setInterval(poll, POLL_MS)
}

export default function MarketActivityIcon({ size = 22 }) {
  const [active, setActive] = useState(() => Date.now() < activeUntil)
  const offTimer = useRef(null)

  useEffect(() => {
    ensurePolling()
    const sync = () => {
      const remaining = activeUntil - Date.now()
      clearTimeout(offTimer.current)
      if (remaining > 0) {
        setActive(true)
        offTimer.current = setTimeout(() => setActive(false), remaining)
      } else {
        setActive(false)
      }
    }
    listeners.add(sync)
    sync() // при монтировании подхватываем ещё идущую анимацию (переход между вкладками)
    return () => { listeners.delete(sync); clearTimeout(offTimer.current) }
  }, [])

  return (
    <svg
      className={`mkt-eq${active ? ' on' : ''}`}
      viewBox="0 0 24 24" width={size} height={size}
      fill="currentColor" aria-hidden="true"
    >
      <rect className="eqb eqb1" x="3.4"  y="9"   width="2.8" height="9"   rx="1.4" />
      <rect className="eqb eqb2" x="8.6"  y="6"   width="2.8" height="12"  rx="1.4" />
      <rect className="eqb eqb3" x="13.8" y="9.5" width="2.8" height="8.5" rx="1.4" />
      <rect className="eqb eqb4" x="18.6" y="5"   width="2.8" height="13"  rx="1.4" />
    </svg>
  )
}
