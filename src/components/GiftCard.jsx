import { IconMessageDollar, IconShoppingCartPlus, IconCheck } from '@tabler/icons-react'
import TgGiftSticker from './TgGiftSticker'
import { MiniSpin } from './StatusIcons'
import { giftAccentColor } from '../api/client'
import { fmtGram } from '../utils/format'

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

// PNG-гем вплотную к числу (≈1.2× кегля). Из assets/ruby-gem-256.png.
function Gem({ size = 17 }) {
  return <img src="/ruby-gem-256.png" width={size} height={size} className="rd-gem" alt="" />
}

export default function GiftCard({ item, onClick, onOffer, onCartToggle, inCart, onBuy, buyBusy }) {
  const rarityColor = giftAccentColor(item.gift_id ?? item.id)
  // Свой лот на маркете: цена есть, а кнопки «Купить» нет.
  const isOwnListing = item.price != null && !onBuy
  const num = item.number
    ? (String(item.number).startsWith('#') ? item.number : `#${item.number}`)
    : timeAgo(item.listed_at)

  return (
    <div className="rd-card" onClick={onClick}>
      <div className="rd-card-art" style={{
        background: `radial-gradient(circle at 40% 30%, ${rarityColor}59, ${rarityColor}1f 75%)`,
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

        <span className="rd-pill rd-pill-num">{num}</span>

        {item.giftCount > 1 && (
          <span className="rd-pill" style={{ top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
            ×{item.giftCount}
          </span>
        )}

        {onOffer && (
          <button
            className="rd-artbtn offer"
            onClick={(e) => { e.stopPropagation(); onOffer(item) }}
            aria-label="Предложить цену"
          >
            <IconMessageDollar size={14} stroke={2} />
          </button>
        )}
        {onCartToggle && (
          <button
            className={`rd-artbtn cart${inCart ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onCartToggle(item) }}
            aria-label={inCart ? 'Убрать из корзины' : 'В корзину'}
          >
            {inCart ? <IconCheck size={14} stroke={2.5} /> : <IconShoppingCartPlus size={14} stroke={2} />}
          </button>
        )}
      </div>

      <div className="rd-card-body">
        <div className="rd-card-name">{item.name}</div>

        {onBuy && (
          <button
            className="rd-buy"
            disabled={buyBusy}
            onClick={(e) => { e.stopPropagation(); onBuy(item) }}
          >
            {buyBusy ? <MiniSpin size={18} /> : <>{fmtGram(item.price)} <Gem size={24} /></>}
          </button>
        )}
        {isOwnListing && (
          <div className="rd-ownplate">
            <span className="rd-ownlabel">Ваш лот</span>
            {fmtGram(item.price)} <Gem size={16} />
          </div>
        )}
      </div>
    </div>
  )
}
