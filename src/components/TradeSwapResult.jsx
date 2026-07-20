import { useEffect, useRef, useState } from 'react'
import { fragmentImage } from '../api/client'
import { IconSwap } from './StatusIcons'

// Визуал для всплывающего окна «Обмен принят»: подарки владельца слева и
// подарки контрагента справа меняются местами по дуге, между ними крутятся
// стрелки обмена. Ширина растёт с числом подарков (ряды становятся длиннее).
//
// Анимацию рядов гоняем через Web Animations API (element.animate), а НЕ через
// CSS @keyframes с var(--dx): var() внутри keyframes некоторые WebView (iOS
// Telegram) не интерполируют — окно всплывало бы, но подарки стояли на месте.
// WAPI берёт готовые пиксельные значения и работает везде.

function GiftRow({ gifts, thumb, innerRef }) {
  return (
    <div ref={innerRef} style={{ display: 'flex', gap: 6, alignItems: 'center', zIndex: 1 }}>
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const l = leftRef.current, r = rightRef.current
    if (!l || !r) return
    // Расстояние между центрами рядов. offsetLeft/offsetWidth не зависят от
    // CSS-transform, поэтому меряются корректно даже после старта анимации.
    const dx = (r.offsetLeft + r.offsetWidth / 2) - (l.offsetLeft + l.offsetWidth / 2)
    if (!dx) { setReady(true); return }
    const opts = { duration: 2200, iterations: Infinity, easing: 'ease-in-out' }
    // Левый ряд уходит вправо (на слот правого) и обратно; в момент встречи в
    // центре поднимается вверх, правый — вниз, чтобы не столкнуться.
    const la = l.animate([
      { transform: 'translate(0px,0px)' },
      { transform: `translate(${dx * 0.5}px,-34px)`, offset: 0.25 },
      { transform: `translate(${dx}px,0px)`, offset: 0.5 },
      { transform: `translate(${dx * 0.5}px,34px)`, offset: 0.75 },
      { transform: 'translate(0px,0px)' },
    ], opts)
    const ra = r.animate([
      { transform: 'translate(0px,0px)' },
      { transform: `translate(${-dx * 0.5}px,34px)`, offset: 0.25 },
      { transform: `translate(${-dx}px,0px)`, offset: 0.5 },
      { transform: `translate(${-dx * 0.5}px,-34px)`, offset: 0.75 },
      { transform: 'translate(0px,0px)' },
    ], opts)
    setReady(true)
    return () => { la.cancel(); ra.cancel() }
  }, [leftGifts, rightGifts])

  const maxPer = Math.max(leftGifts.length, rightGifts.length)
  const thumb = maxPer >= 4 ? 34 : maxPer === 3 ? 40 : 48

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 64, height: 120, marginBottom: 10, maxWidth: '100%',
      visibility: ready ? 'visible' : 'hidden',
    }}>
      <GiftRow gifts={leftGifts} thumb={thumb} innerRef={leftRef} />

      {/* крутящиеся стрелки обмена — в центре, под рядами */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 0,
        animation: 'stSpin 2.4s linear infinite', filter: 'drop-shadow(0 0 10px rgba(138,120,224,.6))',
      }}>
        <IconSwap size={40} color="#9d8be8" spin={false} />
      </div>

      <GiftRow gifts={rightGifts} thumb={thumb} innerRef={rightRef} />
    </div>
  )
}
