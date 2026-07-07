import { useNavigate } from 'react-router-dom'
import TgGiftSticker from './TgGiftSticker'
import GramIcon from './GramIcon'

const RARITY_COLORS = {
  Common: '#a390a0',
  Rare: '#7f9df5',
  Epic: '#c084f0',
  Legendary: '#f0b47e',
}

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

export default function GiftCard({ item, onClick }) {
  const rarityColor = RARITY_COLORS[item.rarity] || '#a390a0'

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', padding: 12 }}
    >
      {/* Gift Preview */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: `radial-gradient(circle at 40% 35%, ${rarityColor}2e, var(--bg-card-hover))`,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        marginBottom: 10,
        border: `1px solid ${rarityColor}30`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <TgGiftSticker image={item.image_full || item.image_url} stickerId={item.tg_sticker} backdrop={item.tg_backdrop} fallback={item.emoji} />
        </div>
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 14,
          opacity: 0.5,
        }}>{item.symbol}</span>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
          }}>
            {item.name}
          </span>
          {item.number && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
              {String(item.number).startsWith('#') ? item.number : `#${item.number}`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="price price-sm">{item.price} <GramIcon size={12} /></span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {timeAgo(item.listed_at)}
          </span>
        </div>
      </div>
    </div>
  )
}