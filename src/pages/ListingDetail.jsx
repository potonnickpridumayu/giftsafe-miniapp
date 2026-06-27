import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MOCK } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

const RARITY_COLORS = {
  Common: '#8888aa', Rare: '#5e9cf5', Epic: '#a855f7', Legendary: '#d4af37',
}

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic, showConfirm, user } = useTelegram()
  const [buying, setBuying] = useState(false)
  const [bought, setBought] = useState(false)

  const item = MOCK.listings.find(l => l.id === Number(id))
  if (!item) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">❓</div>
        <div className="empty-title">Лот не найден</div>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Назад</button>
      </div>
    </div>
  )

  const rarityColor = RARITY_COLORS[item.rarity]
  const fee = Math.round(item.price * 0.025)
  const total = item.price

  const handleBuy = () => {
    haptic('medium')
    showConfirm(
      `Купить «${item.name}» за ⭐ ${item.price}?`,
      (ok) => {
        if (!ok) return
        setBuying(true)
        setTimeout(() => { setBuying(false); setBought(true) }, 1500)
      }
    )
  }

  const isOwnListing = user?.id === item.seller_id

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
        <span>{item.emoji}</span>
        <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 24, opacity: 0.4 }}>{item.symbol}</span>
        <span className="badge" style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: `${rarityColor}22`, color: rarityColor, border: `1px solid ${rarityColor}40`,
        }}>
          {item.rarity}
        </span>
      </div>

      {/* Title */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {item.name}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Модель: {item.model} · Фон: {item.backdrop}
      </p>

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
          <span style={{ fontSize: 13, fontWeight: 600 }}>⭐ {item.price}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Комиссия GiftSafe (2.5%)</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>⭐ {fee}</span>
        </div>
        <div className="divider" style={{ margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>Итого</span>
          <span className="price price-md">⭐ {total}</span>
        </div>
      </div>

      {/* Buy button */}
      {bought ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Куплено!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Подарок добавлен в ваш портфель</p>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => navigate('/portfolio')}>
            Перейти в портфель
          </button>
        </div>
      ) : isOwnListing ? (
        <button className="btn btn-ghost btn-full" disabled>
          Это ваш лот
        </button>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={handleBuy}
          disabled={buying}
          style={{ fontSize: 15, padding: '14px', boxShadow: 'var(--gold-glow)' }}
        >
          {buying ? '⏳ Обработка...' : `Купить за ⭐ ${total}`}
        </button>
      )}
    </div>
  )
}
