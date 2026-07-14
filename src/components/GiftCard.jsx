import { IconMessageDollar, IconShoppingCartPlus, IconCheck } from '@tabler/icons-react'
import GramIcon from './GramIcon'
import TgGiftSticker from './TgGiftSticker'
import { giftAccentColor } from '../api/client'
import { fmtGram } from '../utils/format'

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

export default function GiftCard({ item, onClick, onOffer, onCartToggle, inCart, onBuy, buyBusy }) {
  const rarityColor = giftAccentColor(item.gift_id ?? item.id)

  return (
    <div className="poster-card" onClick={onClick}>
      <div className="poster-art" style={{
        background: `radial-gradient(circle at 35% 25%, ${rarityColor}33, var(--bg-card-hover) 72%)`,
      }}>
        {item.tg_sticker
          ? <TgGiftSticker
              image={item.image_full || item.image_url}
              stickerId={item.tg_sticker}
              backdrop={item.tg_backdrop}
              fallback={item.emoji}
              interactive={false}
            />
          : item.image_full || item.image_url
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

        {onCartToggle && (
          <button
            className={`poster-cart-btn${inCart ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onCartToggle(item) }}
            aria-label={inCart ? 'Убрать из корзины' : 'В корзину'}
          >
            {inCart ? <IconCheck size={13} stroke={2.5} /> : <IconShoppingCartPlus size={13} stroke={2} />}
          </button>
        )}
      </div>

      <div className="poster-info">
        <div className="poster-name-line">
          <span className="poster-name">{item.name}</span>
          <span className="poster-num">
            {item.number
              ? (String(item.number).startsWith('#') ? item.number : `#${item.number}`)
              : timeAgo(item.listed_at)}
          </span>
        </div>
        {/* Цена в инфо-строке дублирует кнопку «Купить за N» — прячем, когда
            кнопка есть; на своих лотах (без кнопки) цена остаётся */}
        {item.price != null
          ? (!onBuy && <div className="poster-price" style={{ flexShrink: 0 }}>{fmtGram(item.price)} <GramIcon size={9} /></div>)
          : <div className="poster-sub" style={{ color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
              {item.owner ? `@${item.owner}` : 'На обмен'}
            </div>}
      </div>

      {onBuy && (
        <div style={{ padding: '5px 6px 6px' }}>
          <button
            className="btn btn-primary"
            style={{
              width: '100%', minWidth: 0, padding: '7px 6px',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
              letterSpacing: 0.3,
            }}
            disabled={buyBusy}
            onClick={(e) => { e.stopPropagation(); onBuy(item) }}
          >
            {buyBusy ? '⏳' : <>{fmtGram(item.price)} <GramIcon size={12} /></>}
          </button>
        </div>
      )}
    </div>
  )
}
