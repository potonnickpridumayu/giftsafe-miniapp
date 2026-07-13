import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, giftSlug, fragmentImage } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import GramIcon from '../components/GramIcon'
import { fmtGram } from '../utils/format'

// Единый стиль рамок ленты — как у истории в Профиле
const CARD_BORDER = '1px solid rgba(255, 255, 255, 0.16)'

function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

// Строка подарка с миниатюрой; тап → официальная страница t.me/nft
function GiftRow({ gift, haptic, openLink, size = 34 }) {
  const slug = giftSlug(gift.gift_name, gift.gift_number, gift.nft_address)
  const thumb = fragmentImage(gift.gift_name, gift.gift_number, gift.nft_address)
  const link = slug ? `https://t.me/nft/${slug}` : ''
  return (
    <div
      onClick={link ? () => { haptic('light'); openLink(link) } : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: link ? 'pointer' : 'default' }}
    >
      <div style={{
        width: size, height: size, borderRadius: 'var(--radius-md)', overflow: 'hidden',
        flexShrink: 0, background: 'var(--bg-card-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: size / 2 }}>🎁</span>}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {gift.gift_name}{gift.gift_number ? ` #${gift.gift_number}` : ''}
      </div>
    </div>
  )
}

export default function MarketHistory() {
  const navigate = useNavigate()
  const { haptic, openLink } = useTelegram()
  const [items, setItems] = useState(null) // null = загрузка
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMarketHistory()
      .then(setItems)
      .catch(e => { setError(e.message || 'Не удалось загрузить историю'); setItems([]) })
  }, [])

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
        История сделок
      </h2>

      {items === null ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Загружаем историю…</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Ошибка загрузки</div>
          <div className="empty-desc">{error}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">Сделок пока не было</div>
          <div className="empty-desc">Здесь появятся продажи и обмены маркета</div>
        </div>
      ) : items.map((it, i) => {
        if (it.kind === 'trade') {
          const left = it.offered_gifts || []
          const right = it.target_gifts || []
          return (
            <div key={`t${i}`} className="card" style={{ padding: '10px 16px', marginBottom: 6, border: CARD_BORDER }}>
              <div style={{ fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontWeight: 600, color: '#8a7fd6' }}>🔄 Обмен</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {fmtDate(it.completed_at)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {left.map((g, j) => <GiftRow key={`l${j}`} gift={g} haptic={haptic} openLink={openLink} />)}
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', margin: '5px 0' }}>
                ⇅
                {it.top_up_ton > 0 && (
                  <span> · доплата {fmtGram(it.top_up_ton)} <GramIcon size={9} /></span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {right.map((g, j) => <GiftRow key={`r${j}`} gift={g} haptic={haptic} openLink={openLink} />)}
              </div>
            </div>
          )
        }
        return (
          <div key={i} className="card" style={{
            padding: '10px 16px', marginBottom: 6, border: CARD_BORDER,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <GiftRow gift={it} haptic={haptic} openLink={openLink} size={40} />
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--gold)' }}>Продажа</span>
                {' · '}{fmtDate(it.completed_at)}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0,
              color: 'var(--money-1, var(--gold))',
            }}>
              {fmtGram(it.amount_ton)} <GramIcon size={11} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
