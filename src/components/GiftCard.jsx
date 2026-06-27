import { useNavigate } from 'react-router-dom'

const RARITY_COLORS = {
  Common: '#8888aa',
  Rare: '#5e9cf5',
  Epic: '#a855f7',
  Legendary: '#d4af37',
}

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

export default function GiftCard({ item, onClick }) {
  const rarityColor = RARITY_COLORS[item.rarity] || '#8888aa'

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', padding: 14 }}
    >
      {/* Gift Preview */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: `radial-gradient(circle at 40% 35%, ${rarityColor}22, var(--bg-card))`,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        marginBottom: 10,
        border: `1px solid ${rarityColor}22`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <span>{item.emoji}</span>
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 14,
          opacity: 0.5,
        }}>{item.symbol}</span>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {item.name}
          </span>
          <span className="badge" style={{
            background: `${rarityColor}18`,
            color: rarityColor,
            border: `1px solid ${rarityColor}30`,
            fontSize: 9,
            padding: '2px 6px',
          }}>
            {item.rarity}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="price price-sm">⭐ {item.price}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {timeAgo(item.listed_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
