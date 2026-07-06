import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import TgGiftSticker from '../components/TgGiftSticker'
import GramIcon from '../components/GramIcon'

const RARITY_COLORS = {
  Common: '#8888aa', Rare: '#5e9cf5', Epic: '#a855f7', Legendary: '#d4af37',
}

// Должна совпадать с MARKET_FEE на бэкенде и цифрой в Market.jsx.
// Итоговая комиссия всё равно приходит в ответе покупки — это лишь предпросмотр.
const FEE_RATE = 0.03

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic, showConfirm, user } = useTelegram()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [buying, setBuying] = useState(false)
  const [bought, setBought] = useState(false)
  const [buyError, setBuyError] = useState(null)
  const [result, setResult] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)
  const [withdrawError, setWithdrawError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api.getListing(id)
      setItem(data)
    } catch (e) {
      setLoadError(e.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <div className="empty-title">Загрузка…</div>
      </div>
    </div>
  )

  if (loadError || !item) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">❓</div>
        <div className="empty-title">{loadError ? 'Ошибка' : 'Лот не найден'}</div>
        {loadError && <div className="empty-desc">{loadError}</div>}
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginTop: 12 }}>
          ← Назад
        </button>
      </div>
    </div>
  )

  const rarityColor = RARITY_COLORS[item.rarity] || '#8888aa'
  let attrs = {}
  if (item.tg_backdrop) {
    try { attrs = JSON.parse(item.tg_backdrop) } catch { /* без атрибутов */ }
  }
  const fee = +(item.price * FEE_RATE).toFixed(4)
  const total = item.price
  const soldOut = item.status && item.status !== 'active'
  const isOwnListing = user?.id === item.seller_id

  const handleBuy = () => {
    haptic('medium')
    showConfirm(
      `Купить «${item.name}» за ${item.price} GRAM?`,
      async (ok) => {
        if (!ok) return
        setBuying(true)
        setBuyError(null)
        try {
          const res = await api.buyListing(item.id)
          setResult(res)
          setBought(true)
        } catch (e) {
          setBuyError(e.message || 'Не удалось совершить покупку')
          haptic('heavy')
        } finally {
          setBuying(false)
        }
      }
    )
  }

  const handleWithdraw = () => {
    haptic('medium')
    showConfirm(
      `Снять «${item.name}» с продажи? Подарок останется в вашем портфеле.`,
      async (ok) => {
        if (!ok) return
        setWithdrawing(true)
        setWithdrawError(null)
        try {
          await api.withdrawListing(item.id)
          setWithdrawn(true)
        } catch (e) {
          setWithdrawError(e.message || 'Не удалось снять лот')
          haptic('heavy')
        } finally {
          setWithdrawing(false)
        }
      }
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

      {/* Gift Preview */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        maxWidth: 280,
        margin: '0 auto 24px',
        background: `radial-gradient(circle at 40% 35%, ${rarityColor}33, var(--bg-card))`,
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 80,
        border: `1px solid ${rarityColor}33`,
        position: 'relative',
      }}>
        {item.tg_thumb
          ? <div style={{ position: 'absolute', inset: 0 }}>
              <TgGiftSticker thumbId={item.tg_thumb} stickerId={item.tg_sticker} backdrop={item.tg_backdrop} fallback={item.emoji} />
            </div>
          : item.image_url
            ? <img src={item.image_url} alt={item.name} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            : <span>{item.emoji}</span>}
      </div>

      {/* Title */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {item.name} {item.number ? <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{item.number}</span> : null}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Коллекция: {item.collection || '—'}
      </p>

      {/* Атрибуты подарка */}
      {(attrs.model_name || attrs.backdrop_name || attrs.symbol_name) && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
          {[
            ['Модель', attrs.model_name],
            ['Фон', attrs.backdrop_name],
            ['Символ', attrs.symbol_name],
          ].filter(([, v]) => v).map(([label, value], i, arr) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: i < arr.length - 1 ? 10 : 0,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Seller */}
      <div className="card" style={{ padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar">👤</div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Продавец</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>@{item.seller}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge-muted">✓ Проверен</span>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Цена</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{item.price} <GramIcon size={12} /></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Комиссия Rubuy ({Math.round(FEE_RATE * 100)}%)</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fee} <GramIcon size={12} /></span>
        </div>
        <div className="divider" style={{ margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>Итого</span>
          <span className="price price-md">{total} <GramIcon size={13} /></span>
        </div>
      </div>

      {/* Buy error */}
      {buyError && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 12, border: '1px solid #f5555540', color: '#ff6b6b', fontSize: 13 }}>
          ⚠️ {buyError}
        </div>
      )}

      {/* Buy button */}
      {bought ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Куплено!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {result?.gift_name || item.name} добавлен в ваш портфель
          </p>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => navigate('/portfolio')}>
            Перейти в портфель
          </button>
        </div>
      ) : isOwnListing ? (
        withdrawn ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📤</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Лот снят</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Подарок остался в вашем портфеле — можно перевыставить или вывести
            </p>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => navigate('/portfolio')}>
              В портфель
            </button>
          </div>
        ) : (
          <>
            {withdrawError && (
              <div className="card" style={{ padding: '10px 14px', marginBottom: 12, border: '1px solid #f5555540', color: '#ff6b6b', fontSize: 13 }}>
                ⚠️ {withdrawError}
              </div>
            )}
            <button
              className="btn btn-ghost btn-full"
              onClick={handleWithdraw}
              disabled={withdrawing || soldOut}
            >
              {withdrawing ? '⏳ Снимаем...' : soldOut ? 'Лот неактивен' : 'Снять с продажи'}
            </button>
          </>
        )
      ) : soldOut ? (
        <button className="btn btn-ghost btn-full" disabled>
          Лот уже продан
        </button>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={handleBuy}
          disabled={buying}
          style={{ fontSize: 15, padding: '14px', boxShadow: 'var(--gold-glow)' }}
        >
          {buying ? '⏳ Обработка...' : <>Купить за {total} <GramIcon size={14} /></>}
        </button>
      )}
    </div>
  )
}