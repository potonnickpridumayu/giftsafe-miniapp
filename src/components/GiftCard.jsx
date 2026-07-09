import { IconMessageDollar } from '@tabler/icons-react'
import GramIcon from './GramIcon'
import { giftAccentColor } from '../api/client'

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

export default function GiftCard({ item, onClick, onOffer }) {
  const rarityColor = giftAccentColor(item.gift_id ?? item.id)

  return (
    <div className="poster-card" onClick={onClick}>
      <div className="poster-art" style={{
        background: `radial-gradient(circle at 35% 25%, ${rarityColor}33, var(--bg-card-hover) 72%)`,
      }}>
        {item.image_full || item.image_url
          ? <img src={item.image_full || item.image_url} alt={item.name} />
          : item.emoji}

        <div className="poster-gem" style={{ background: rarityColor, boxShadow: `0 0 8px ${rarityColor}` }} />

        {item.giftCount > 1 && (
          <span style={{
            position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 700,
            background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 999,
            padding: '2px 7px', zIndex: 1,
          }}>
            ×{item.giftCount}
          </span>
        )}

        {onOffer && (
          <button
            className="poster-offer-btn"
            onClick={(e) => { e.stopPropagation(); onOffer(item) }}
            aria-label="Предложить цену"
          >
            <IconMessageDollar size={13} stroke={2} />
          </button>
        )}
      </div>

      <div className="poster-info">
        <div className="poster-name">{item.name}</div>
        <div className="poster-meta-line">
          <span className="poster-num">
            {item.number
              ? (String(item.number).startsWith('#') ? item.number : `#${item.number}`)
              : timeAgo(item.listed_at)}
          </span>
          {item.price != null
            ? <div className="poster-price">{item.price} <GramIcon size={11} /></div>
            : <div className="poster-sub" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {item.owner ? `@${item.owner}` : 'На обмен'}
              </div>}
        </div>
      </div>
    </div>
  )
}
