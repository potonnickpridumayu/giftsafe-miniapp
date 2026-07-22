import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

// Значок «Активность маркета» — эквалайзер. В покое статичен; когда на маркете
// происходит новое событие (продажа / листинг / обмен / изменение цены), на
// несколько секунд «оживает» — столбики пляшут и подсвечиваются рубином.
//
// Базовую метку времени храним на уровне модуля: одновременно смонтирован лишь
// один экземпляр (шапка активной вкладки), а при переходах между вкладками
// метка переживает перемонтирование, чтобы не проигрывать анимацию повторно.
let lastEventTs = null

const ACTIVE_MS = 6000     // сколько «горит» после события
const POLL_MS = 20000      // как часто опрашиваем ленту (маркет-история публичная)

export default function MarketActivityIcon({ size = 22 }) {
  const [active, setActive] = useState(false)
  const offTimer = useRef(null)

  useEffect(() => {
    let alive = true

    const check = async () => {
      if (document.hidden) return
      try {
        const items = await api.getMarketHistory()
        if (!alive || !items?.length) return
        let newest = 0
        for (const it of items) {
          const ts = new Date(it.completed_at).getTime() || 0
          if (ts > newest) newest = ts
        }
        if (lastEventTs === null) { lastEventTs = newest; return } // первый заход — только запоминаем
        if (newest > lastEventTs) {
          lastEventTs = newest
          setActive(true)
          clearTimeout(offTimer.current)
          offTimer.current = setTimeout(() => { if (alive) setActive(false) }, ACTIVE_MS)
        }
      } catch { /* 401 / нет сети — тихо ждём следующего тика */ }
    }

    check()
    const id = setInterval(check, POLL_MS)
    return () => { alive = false; clearInterval(id); clearTimeout(offTimer.current) }
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
