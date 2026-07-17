// Фирменные статусы/лоадеры вместо эмодзи (⌛ ✅ 🎉 📤 🔄) — перенос 1:1 из
// дизайн-хендоффа design_handoff_status_icons (ре-дизайн ruby). Цвета, размеры
// и тайминги финальные — захардкожены нарочно. Keyframes st* в global.css.
import { useState } from 'react'
import gem from '../assets/gem.png'

const ACC = '#FA4A66'
const OK = '#3DDC84'

// ── Брендовый спиннер: дуга-градиент + пульсирующий гем в центре ──
export function Spinner({ size = 88, thick = 6, gem: withGem = true }) {
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${thick}px), #000 calc(100% - ${thick}px + 1px))`
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '999px',
        background: `conic-gradient(from 0deg, transparent 0%, ${ACC} 70%, #ff8ba0 100%)`,
        WebkitMask: mask, mask,
        animation: 'stSpin 1s linear infinite',
      }} />
      {withGem && size >= 48 && (
        <img src={gem} alt="" style={{
          position: 'absolute', left: '50%', top: '50%', width: size * 0.42, height: size * 0.42,
          margin: `-${size * 0.21}px 0 0 -${size * 0.21}px`,
          animation: 'stPulse 1.6s ease-in-out infinite',
          filter: `drop-shadow(0 0 ${size * 0.12}px ${ACC}88)`,
        }} />
      )}
    </div>
  )
}

// Экран «Загрузка…» — спиннер + подпись (внутри .empty-state)
export function LoadingScreen({ text = 'Загрузка…' }) {
  return (
    <div className="empty-state" style={{ gap: 26 }}>
      <Spinner size={88} />
      <div style={{ fontSize: 17, fontWeight: 600, color: '#8f868c' }}>{text}</div>
    </div>
  )
}

// ── Успех: рисующийся чек в кольце + расходящаяся волна ──
export function IconSuccess({ size = 110 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '999px', border: `3px solid ${OK}`,
        animation: 'stRingIn 2.2s ease-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '999px',
        background: `radial-gradient(circle, ${OK}26 0%, ${OK}0d 60%, transparent 75%)`,
        boxShadow: `inset 0 0 0 3px ${OK}`, animation: 'stPop .5s cubic-bezier(.3,1.6,.5,1) both',
      }} />
      <svg viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path
          d="M17 29 L25 37 L40 20" fill="none" stroke={OK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={40} strokeDashoffset={40} style={{ animation: 'stDraw .45s .25s ease-out forwards' }}
        />
      </svg>
    </div>
  )
}

// ── Куплено: гем + конфетти-взрыв в фирменных цветах ──
export function IconPurchase({ size = 120 }) {
  const parts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
    const a = (i / 12) * Math.PI * 2
    const d = 46 + (i % 3) * 14
    const colors = [ACC, '#ff8ba0', '#F4EEF1', OK]
    const c = colors[i % 4]
    const w = i % 3 === 0 ? 10 : 6, h = i % 3 === 0 ? 4 : 6
    return (
      <div
        key={i}
        style={{
          position: 'absolute', left: '50%', top: '50%', width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2,
          background: c, borderRadius: i % 2 ? '999px' : '2px',
          '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 14}px`, '--rr': `${(i % 2 ? 1 : -1) * 220}deg`,
          animation: `stConf 1.6s ${i * 0.04}s cubic-bezier(.2,.7,.4,1) infinite`,
        }}
      />
    )
  })
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: size, height: size, transform: 'translate(-50%,-50%)',
        borderRadius: '999px', background: `radial-gradient(circle, ${ACC}2b 0%, transparent 65%)`,
        animation: 'stGlow 2s ease-in-out infinite',
      }} />
      {parts}
      <img src={gem} alt="" style={{
        position: 'absolute', left: '50%', top: '50%', width: size * 0.5, height: size * 0.5,
        margin: `-${size * 0.25}px 0 0 -${size * 0.25}px`,
        animation: 'stPop .5s cubic-bezier(.3,1.6,.5,1) both, stFloat 2.6s .5s ease-in-out infinite',
        filter: `drop-shadow(0 6px 18px ${ACC}88)`,
      }} />
    </div>
  )
}

// ── Лот снят: фирменный кейс, стрелка ныряет внутрь ──
export function IconReturn({ size = 110 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 72 72" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="rtCase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a2f42" />
            <stop offset="1" stopColor="#241c2b" />
          </linearGradient>
        </defs>
        {/* кейс */}
        <rect x={10} y={34} width={52} height={30} rx={10} fill="url(#rtCase)" stroke="#4a3d52" strokeWidth={2} />
        {/* прорезь */}
        <rect x={22} y={31} width={28} height={7} rx={3.5} fill="#0d0b10" stroke={`${ACC}66`} strokeWidth={1.5} />
        {/* гем-защёлка */}
        <rect x={32.4} y={46} width={8} height={8} rx={2} transform="rotate(45 36 50)" fill={ACC} />
      </svg>
      {/* стрелка вниз (в кейс) */}
      <svg viewBox="0 0 72 72" width={size} height={size} style={{ position: 'absolute', inset: 0, animation: 'stArrowIn 1.8s ease-in-out infinite' }}>
        <g stroke={ACC} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M36 8 V24" />
          <path d="M28 17 L36 25 L44 17" />
        </g>
      </svg>
    </div>
  )
}

// ── Значок обмена: два полукруга-стрелки, мягкое вращение ──
export function IconSwap({ size = 18, color = '#fff', spin = true }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={spin ? { animation: 'stSwapOrbit 6s linear infinite', flexShrink: 0 } : { flexShrink: 0 }}>
      <g stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M4.5 9.5 A8 8 0 0 1 19 7.5" />
        <path d="M19.5 2.5 L19 7.5 L14 7" />
        <path d="M19.5 14.5 A8 8 0 0 1 5 16.5" />
        <path d="M4.5 21.5 L5 16.5 L10 17" />
      </g>
    </svg>
  )
}

// ── Мини-спиннер для кнопок в ожидании (вместо ⏳) ──
export function MiniSpin({ color = '#fff', track = 'rgba(255,255,255,.3)', size = 18 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '999px', boxSizing: 'border-box',
      border: `2.5px solid ${track}`, borderTopColor: color, animation: 'stSpin .8s linear infinite',
      flexShrink: 0, verticalAlign: 'middle',
    }} />
  )
}

// Мини-спиннер в акцентных цветах — для ghost/outline кнопок
export function MiniSpinAccent({ size = 18 }) {
  return <MiniSpin color={ACC} track={`${ACC}33`} size={size} />
}

// Бегущий шиммер-блик для filled-кнопок в ожидании.
// Родитель должен иметь position:relative и overflow:hidden.
export function BtnShimmer() {
  return (
    <span style={{
      position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%',
      background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.18), transparent)',
      animation: 'stShimmer 1.4s linear infinite', pointerEvents: 'none',
    }} />
  )
}

// ── Бейдж-чек (из тоста «Куплено: …») — и для инлайн-статусов с ✅ ──
export function CheckBadge({ size = 30 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-block' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: `${OK}1f`, boxShadow: `inset 0 0 0 2px ${OK}` }} />
      <svg viewBox="0 0 30 30" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M9 15.5 L13.5 20 L21 11" fill="none" stroke={OK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// ── Аватар владельца: реальная Telegram-аватарка в градиентном кольце.
// fallback='gem' (по умолчанию, «Владелец» на странице обмена) или
// fallback='letter' — первая буква ника (карточка входящего оффера) ──
export function OwnerAvatar({ username, size = 52, fallback = 'gem' }) {
  const [failed, setFailed] = useState(false)
  const url = username ? `https://t.me/i/userpic/320/${username}.jpg` : null
  return (
    <div style={{
      position: 'relative', width: size, height: size, flexShrink: 0, borderRadius: '999px',
      padding: 2.5, boxSizing: 'border-box',
      background: `conic-gradient(from 200deg, ${ACC}, #ff8ba0, ${ACC}44, ${ACC})`,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '999px', background: '#1a1420', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {url && !failed
          ? <img src={url} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
          : fallback === 'letter'
            ? <span style={{ fontSize: size * 0.42, fontWeight: 700, color: '#F5F2F4' }}>{(username || '?')[0].toUpperCase()}</span>
            : <img src={gem} alt="" style={{ width: size * 0.46, height: size * 0.46 }} />}
      </div>
    </div>
  )
}

// ── Чип «Обмен»/«На обмен» с IconSwap ──
export function Chip({ icon, label, filled, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999,
        whiteSpace: 'nowrap', flexShrink: 0,
        background: filled ? `linear-gradient(160deg, ${ACC}, #e02547)` : '#1a1420',
        border: filled ? 'none' : `1px solid ${ACC}44`,
        color: '#fff', fontSize: 14, fontWeight: 600, cursor: onClick ? 'pointer' : 'default',
        boxShadow: filled ? `0 6px 16px -6px ${ACC}aa` : 'none',
        ...style,
      }}
    >
      {icon}
      {label}
    </div>
  )
}
