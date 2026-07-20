import { useEffect, useRef, useState } from 'react'
import { fragmentImage } from '../api/client'
import { IconSwap, OwnerAvatar } from './StatusIcons'

// Визуал для всплывающего окна «Обмен принят»: подарки владельца слева и
// подарки контрагента справа ОДИН РАЗ меняются местами по дуге и замирают в
// новом положении — обмен завершён. Стрелки в центре стоят на месте и
// крутятся только пока подарки летят, потом останавливаются насовсем
// (по явному требованию пользователя — без бесконечного цикла).
//
// Анимация — через Web Animations API (element.animate) с готовыми px:
// var() внутри CSS @keyframes некоторые WebView (iOS Telegram) не
// интерполируют, подарки стояли бы на месте.

const SWAP_MS = 1400

function GiftRow({ gifts, thumb, innerRef }) {
  return (
    <div ref={innerRef} style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
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

// Шапка стороны: аватарка + ник. Стоит НАД подарками и не участвует в
// анимации — подписи отмечают, чья это сторона, а подарки летают под ними.
function SideHead({ user }) {
  if (!user?.username && !user?.name) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
      <OwnerAvatar username={user.username} name={user.name} photoUrl={user.photoUrl} userId={user.userId} size={22} />
      <span style={{
        fontSize: 12, fontWeight: 700, color: '#F5F2F4', maxWidth: 110,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        @{user.username || user.name}
      </span>
    </div>
  )
}

export default function TradeSwapResult({ leftGifts = [], rightGifts = [], leftUser, rightUser }) {
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const arrowRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const l = leftRef.current, r = rightRef.current, arrow = arrowRef.current
    if (!l || !r) return
    // Расстояние между центрами рядов. offsetLeft/offsetWidth не зависят от
    // CSS-transform, поэтому меряются корректно и после старта анимации.
    const dx = (r.offsetLeft + r.offsetWidth / 2) - (l.offsetLeft + l.offsetWidth / 2)
    if (!dx) { setReady(true); return }
    const opts = { duration: SWAP_MS, iterations: 1, easing: 'ease-in-out', fill: 'forwards' }
    // Один пролёт: левый ряд по верхней дуге на место правого, правый — по
    // нижней навстречу. fill:forwards оставляет их в обменянном положении.
    const la = l.animate([
      { transform: 'translate(0px,0px)' },
      { transform: `translate(${dx * 0.5}px,-34px)`, offset: 0.5 },
      { transform: `translate(${dx}px,0px)` },
    ], opts)
    const ra = r.animate([
      { transform: 'translate(0px,0px)' },
      { transform: `translate(${-dx * 0.5}px,34px)`, offset: 0.5 },
      { transform: `translate(${-dx}px,0px)` },
    ], opts)
    // Стрелки: стоят на месте, крутятся ровно пока летят подарки (2 оборота),
    // и останавливаются вместе с ними — обмен завершён.
    const aa = arrow?.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }],
      { duration: SWAP_MS, iterations: 1, easing: 'ease-in-out', fill: 'forwards' },
    )
    setReady(true)
    return () => { la.cancel(); ra.cancel(); aa?.cancel() }
  }, [leftGifts, rightGifts])

  const maxPer = Math.max(leftGifts.length, rightGifts.length)
  const thumb = maxPer >= 4 ? 34 : maxPer === 3 ? 40 : 48

  const hasHeads = !!(leftUser || rightUser)

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 64, height: hasHeads ? 150 : 120, marginBottom: 10, maxWidth: '100%',
      visibility: ready ? 'visible' : 'hidden',
    }}>
      <div>
        <SideHead user={leftUser} />
        <GiftRow gifts={leftGifts} thumb={thumb} innerRef={leftRef} />
      </div>

      {/* стрелки обмена — в центре, под рядами (на уровне подарков) */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 0,
        marginTop: hasHeads ? 15 : 0,
        filter: 'drop-shadow(0 0 10px rgba(138,120,224,.6))',
      }}>
        <div ref={arrowRef} style={{ display: 'flex' }}>
          <IconSwap size={40} color="#9d8be8" spin={false} />
        </div>
      </div>

      <div>
        <SideHead user={rightUser} />
        <GiftRow gifts={rightGifts} thumb={thumb} innerRef={rightRef} />
      </div>
    </div>
  )
}
