import { useEffect, useState } from 'react'
import { IconPurchase, IconSuccess, IconReturn } from './StatusIcons'

// Глобальная нижняя шторка результата действия (покупка/оффер/снятие) —
// плавно выезжает снизу, как «Предложение отправлено!». Императивный вызов
// showResult(...) из любого места, компонент монтируется один раз в App.
// Заменяет tg.showAlert (системный текст снизу) для action-результатов.
let openListener = null

// opts: { icon: 'purchase'|'success'|'return'|'error', title, sub, onClose }
export function showResult(opts) {
  if (openListener) openListener(opts)
}

const ICONS = { purchase: IconPurchase, success: IconSuccess, return: IconReturn }

// Красный кружок с «!» для ошибок — в пару к зелёному чеку успеха
function IconErrorBig({ size = 90 }) {
  const ACC = '#FA4A66'
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '999px',
        background: `radial-gradient(circle, ${ACC}22 0%, ${ACC}0d 60%, transparent 75%)`,
        boxShadow: `inset 0 0 0 3px ${ACC}`, animation: 'stPop .5s cubic-bezier(.3,1.6,.5,1) both',
      }} />
      <svg viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M28 16 v16" stroke={ACC} strokeWidth={5} strokeLinecap="round" />
        <circle cx={28} cy={40} r={2.8} fill={ACC} />
      </svg>
    </div>
  )
}

export default function ResultSheet() {
  const [req, setReq] = useState(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    openListener = (opts) => { setClosing(false); setReq(opts) }
    return () => { openListener = null }
  }, [])

  if (!req) return null

  const close = () => {
    setClosing(true)
    // ждём проигрыша выходной CSS-анимации, потом размонтируем
    setTimeout(() => { setReq(null); setClosing(false); req.onClose?.() }, 240)
  }

  const isError = req.icon === 'error'
  const Icon = ICONS[req.icon] || IconPurchase

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 320,
        background: 'rgba(5,3,4,0.7)',
        display: 'flex', alignItems: 'flex-end',
        animation: closing ? 'rsFadeOut 0.24s ease forwards' : 'rsFadeIn 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, margin: '0 auto',
          background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          padding: '28px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          textAlign: 'center',
          animation: closing
            ? 'rsSlideDown 0.24s ease forwards'
            : 'rsSlideUp 0.28s cubic-bezier(.2,.8,.3,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          {isError ? <IconErrorBig size={90} /> : <Icon size={90} />}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: '#F5F2F4' }}>
          {req.title}
        </div>
        {req.sub && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>
            {req.sub}
          </div>
        )}
        <button className="btn btn-ghost btn-full" style={{ marginTop: 20 }} onClick={close}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
