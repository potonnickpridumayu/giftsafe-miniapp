import { useEffect, useState } from 'react'

// Внутреннее подтверждение вместо системного tg.showConfirm: шторка снизу
// в стиле приложения. Открывается из useTelegram().showConfirm — сигнатура
// (msg, cb) сохранена, поэтому все существующие вызовы работают как раньше.
let openListener = null

export function requestConfirm(message, cb) {
  if (openListener) openListener({ message, cb })
  else cb(window.confirm(message)) // компонент ещё не смонтирован — крайний случай
}

export default function ConfirmSheet() {
  const [req, setReq] = useState(null)

  useEffect(() => {
    openListener = setReq
    return () => { openListener = null }
  }, [])

  if (!req) return null

  const answer = (ok) => {
    setReq(null)
    req.cb(ok)
  }

  return (
    <div
      onClick={() => answer(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(5,3,4,0.7)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          padding: '22px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 480, margin: '0 auto',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.45, marginBottom: 18,
        }}>
          {req.message}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => answer(true)}>
            Подтвердить
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => answer(false)}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
