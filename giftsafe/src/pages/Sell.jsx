import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'

export default function Sell() {
  const navigate = useNavigate()
  const { haptic, showAlert } = useTelegram()
  const [price, setPrice] = useState('')
  const [giftId, setGiftId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const fee = price ? Math.round(Number(price) * 0.025) : 0
  const youGet = price ? Number(price) - fee : 0

  const handleSubmit = () => {
    if (!giftId || !price || Number(price) <= 0) {
      showAlert('Заполните все поля')
      return
    }
    haptic('medium')
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setDone(true) }, 1500)
  }

  if (done) return (
    <div className="page">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Лот выставлен!
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Подарок появится на маркете после модерации
        </div>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          На маркет
        </button>
      </div>
    </div>
  )

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 20, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        Выставить на продажу
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Заполните данные подарка
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
            ID подарка из Telegram *
          </label>
          <input
            className="input"
            placeholder="Например: 5170233102089322756"
            value={giftId}
            onChange={e => setGiftId(e.target.value)}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Откройте подарок в Telegram → Поделиться → Скопировать ссылку
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
            Цена в Звёздах ⭐ *
          </label>
          <input
            className="input"
            type="number"
            placeholder="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            min="1"
          />
        </div>

        {price && Number(price) > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Цена покупателя</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>⭐ {price}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Комиссия GiftSafe (2.5%)</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>−⭐ {fee}</span>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Вы получите</span>
              <span className="price price-sm" style={{ fontSize: 16 }}>⭐ {youGet}</span>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(94,156,245,0.08)', border: '1px solid rgba(94,156,245,0.15)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 12, color: 'var(--blue)', lineHeight: 1.6 }}>
          🔒 После выставления подарок уходит в эскроу GiftSafe. При отказе покупателя — возвращается вам.
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ marginTop: 4, padding: 14, fontSize: 15, boxShadow: 'var(--gold-glow)' }}
        >
          {submitting ? '⏳ Публикация...' : 'Выставить на продажу'}
        </button>
      </div>
    </div>
  )
}
