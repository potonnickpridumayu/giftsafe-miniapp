import { useEffect, useRef, useState } from 'react'
import { fragmentImage } from '../api/client'
import { IconSwap } from './StatusIcons'

// Визуал для всплывающего окна «Обмен принят»: подарки владельца слева и
// подарки контрагента справа меняются местами по дуге, между ними крутятся
// стрелки обмена. Ширина растёт с числом подарков (ряды становятся длиннее).

function GiftRow({ gifts, thumb }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {gifts.map((g, i) => {
        const src = fragmentImage(g.gift_name, g.gift_number, g.nft_address)
        return (
          <div key={i} style={{
            width: thumb, height: thumb, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
            background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {src
              ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: Math.round(thumb * 0.46) }}>🎁</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function TradeSwapResult({ leftGifts = [], rightGifts = [] }) {
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const [dx, setDx] = useState(0)

  // Расстояние между центрами рядов. offsetLeft/offsetWidth не зависят от
  // CSS-transform, поэтому меряется корректно даже во время анимации.
  useEffect(() => {
    const measure = () => {
      const l = leftRef.current, r = rightRef.current
      if (!l || !r) return
      setDx((r.offsetLeft + r.offsetWidth / 2) - (l.offsetLeft + l.offsetWidth / 2))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [leftGifts, rightGifts])

  const maxPer = Math.max(leftGifts.length, rightGifts.length)
  const thumb = maxPer >= 4 ? 34 : maxPer === 3 ? 40 : 48

  const swayStyle = (name) => (dx ? {
    '--dx': `${dx}px`,
    animation: `${name} 2.2s ease-in-out infinite`,
    zIndex: 1,
  } : { zIndex: 1 })

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 64, height: 120, marginBottom: 10, maxWidth: '100%',
    }}>
      <div ref={leftRef} style={swayStyle('tsSwapL')}>
        <GiftRow gifts={leftGifts} thumb={thumb} />
      </div>

      {/* крутящиеся стрелки обмена — в центре, под рядами */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 0,
        animation: 'stSpin 2.4s linear infinite', filter: 'drop-shadow(0 0 10px rgba(138,120,224,.6))',
      }}>
        <IconSwap size={40} color="#9d8be8" spin={false} />
      </div>

      <div ref={rightRef} style={swayStyle('tsSwapR')}>
        <GiftRow gifts={rightGifts} thumb={thumb} />
      </div>
    </div>
  )
}
