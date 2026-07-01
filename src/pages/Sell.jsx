import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

// Должна совпадать с FEE_RATE в ListingDetail.jsx, "Комиссия 3%" в Market.jsx
// и MARKET_FEE на бэкенде. Весь маркет работает в TON, не в Stars.
const FEE_RATE = 0.03

const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4

// Принимаем ссылку вида https://t.me/nft/SakuraFlower-33824
function looksLikeGiftUrl(v) {
  return /t\.me\/nft\/[\w-]+/i.test(v.trim())
}

export default function Sell() {
  const navigate = useNavigate()
  const { haptic, showConfirm } = useTelegram()

  const [giftUrl, setGiftUrl] = useState('')
  const [price, setPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null) // { listing_id, gift_name } из ответа

  const priceNum = parseFloat(String(price).replace(',', '.')) || 0
  const fee = round4(priceNum * FEE_RATE)
  const youGet = round4(priceNum - fee)

  const urlOk = looksLikeGiftUrl(giftUrl)
  const priceOk = priceNum > 0
  const canSubmit = urlOk && priceOk && !submitting

  const handleSubmit = () => {
    if (!urlOk) {
      setError('Вставьте ссылку на подарок из Telegram (t.me/nft/...)')
      haptic('heavy')
      return
    }
    if (!priceOk) {
      setError('Укажите цену в TON больше нуля')
      haptic('heavy')
      return
    }

    haptic('medium')
    showConfirm(
      `Выставить подарок за ${priceNum} TON? Вы получите ${youGet} TON.`,
      async (ok) => {
        if (!ok) return
        setSubmitting(true)
        setError(null)
        try {
          // Бэкенд должен принять ссылку/слаг, распарсить гифт, создать запись
          // в gifts (add_gift) и вернуть созданный листинг.
          const res = await api.createListing({
            gift_url: giftUrl.trim(),
            price: priceNum,
            description: '',
          })
          setDone(res || {})
          haptic('light')
        } catch (e) {
          setError(e.message || 'Не удалось выставить лот')
          haptic('heavy')
        } finally {
          setSubmitting(false)
        }
      }
    )
  }

  if (done) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
            Подарок выставлен!
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            {done.gift_name ? `«${done.gift_name}» ` : ''}теперь в маркете. При покупке TON придёт вам на баланс.
          </p>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 20 }}
            onClick={() => { haptic('light'); navigate('/') }}
          >
            В маркет
          </button>
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 8 }}
            onClick={() => { setDone(null); setGiftUrl(''); setPrice('') }}
          >
            Выставить ещё
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Выставить <span style={{ color: 'var(--gold)' }}>подарок</span>
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Заполните данные подарка
      </p>

      {/* Gift URL */}
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        ID подарка из Telegram <span style={{ color: 'var(--gold)' }}>*</span>
      </label>
      <input
        className="input"
        placeholder="https://t.me/nft/SakuraFlower-33824"
        value={giftUrl}
        onChange={e => { setGiftUrl(e.target.value); setError(null) }}
        style={{ marginBottom: 6 }}
      />
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
        Откройте подарок в Telegram → Поделиться → Скопировать ссылку
      </p>

      {/* Price in TON */}
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Цена в TON <span style={{ color: 'var(--gold)' }}>*</span>
      </label>
      <input
        className="input"
        type="text"
        inputMode="decimal"
        placeholder="10.2"
        value={price}
        onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError(null) }}
        style={{ marginBottom: 20 }}
      />

      {/* Breakdown */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Цена покупателя</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{priceNum || 0} TON</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Комиссия GiftSafe ({Math.round(FEE_RATE * 100)}%)
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>− {fee} TON</span>
        </div>
        <div className="divider" style={{ margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>Вы получите</span>
          <span className="price price-md">{youGet} TON</span>
        </div>
      </div>

      {/* Escrow note */}
      <div style={{
        padding: '12px 14px',
        marginBottom: 20,
        background: 'rgba(94,156,245,0.08)',
        border: '1px solid rgba(94,156,245,0.25)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 13,
        color: '#5e9cf5',
        lineHeight: 1.5,
      }}>
        🔒 После выставления подарок уходит в эскроу GiftSafe. При отказе покупателя — возвращается вам.
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 12, border: '1px solid #f5555540', color: '#ff6b6b', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <button
        className="btn btn-primary btn-full"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{ fontSize: 15, padding: '14px', boxShadow: canSubmit ? 'var(--gold-glow)' : 'none', opacity: canSubmit ? 1 : 0.5 }}
      >
        {submitting ? '⏳ Выставляем…' : 'Выставить на продажу'}
      </button>
    </div>
  )
}
