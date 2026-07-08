import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api, fragmentImage } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import TgGiftSticker from '../components/TgGiftSticker'
import GramIcon from '../components/GramIcon'
import { fmtGram } from '../utils/format'

const RARITY_COLORS = {
  Common: '#8888aa', Rare: '#5e9cf5', Epic: '#a855f7', Legendary: '#d4af37',
}

// Комиссия площадки — та же, что и на Маркете (MARKET_FEE на бэкенде),
// берётся только с доплаты при принятии оффера.
const FEE_RATE = 0.03

export default function TradeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic, showConfirm, user, openLink } = useTelegram()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const [picking, setPicking] = useState(false)
  const [myGifts, setMyGifts] = useState(null)
  const [selectedGiftIds, setSelectedGiftIds] = useState(() => new Set())
  const [topUp, setTopUp] = useState('')
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState(null)
  const [proposed, setProposed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api.getTrade(id)
      setItem(data)
    } catch (e) {
      setLoadError(e.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const openPicker = async () => {
    haptic('light')
    setProposeError(null)
    setPicking(true)
    if (myGifts === null) {
      try {
        const gifts = await api.getMyGifts()
        setMyGifts(gifts.filter(g => !g.on_sale && !g.on_trade))
      } catch {
        setMyGifts([])
      }
    }
  }

  const topUpNum = parseFloat(String(topUp).replace(',', '.')) || 0
  const topUpFee = topUpNum * FEE_RATE

  const toggleGift = (giftId) => {
    haptic('light')
    setSelectedGiftIds(prev => {
      const next = new Set(prev)
      if (next.has(giftId)) next.delete(giftId)
      else next.add(giftId)
      return next
    })
  }

  const handlePropose = async () => {
    if (selectedGiftIds.size === 0) return
    haptic('medium')
    setProposing(true)
    setProposeError(null)
    const topUpNum = parseFloat(String(topUp).replace(',', '.')) || 0
    try {
      await api.proposeTradeOffer(item.id, Array.from(selectedGiftIds), topUpNum)
      setProposed(true)
      setPicking(false)
    } catch (e) {
      setProposeError(e.message || 'Не удалось отправить предложение')
      haptic('heavy')
    } finally {
      setProposing(false)
    }
  }

  const handleCancel = () => {
    haptic('medium')
    showConfirm(
      `Снять «${item.name}» с обмена? Подарок останется в вашем портфеле.`,
      async (ok) => {
        if (!ok) return
        setCancelling(true)
        setCancelError(null)
        try {
          await api.cancelTrade(item.id)
          setCancelled(true)
        } catch (e) {
          setCancelError(e.message || 'Не удалось снять лот')
          haptic('heavy')
        } finally {
          setCancelling(false)
        }
      }
    )
  }

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
        <button className="btn btn-ghost" onClick={() => navigate('/trade')} style={{ marginTop: 12 }}>
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
  const soldOut = item.status && item.status !== 'active'
  const isOwnTrade = user?.id === item.owner_id

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      {item.giftCount <= 1 ? (
        <>
          <div style={{
            width: '100%', aspectRatio: '1', maxWidth: 280, margin: '0 auto 24px',
            background: `radial-gradient(circle at 40% 35%, ${rarityColor}33, var(--bg-card))`,
            borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 80, border: `1px solid ${rarityColor}33`, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <TgGiftSticker image={item.image_full || item.image_url} stickerId={item.tg_sticker} backdrop={item.tg_backdrop} fallback={item.emoji} autoPlay />
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: item.gift_link ? 10 : 20 }}>
            {item.name} {item.number ? <span style={{ fontWeight: 500 }}>{item.number}</span> : null}
          </h2>

          {item.gift_link && (
            <button
              onClick={() => { haptic('light'); openLink(item.gift_link) }}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)' }}
            >
              🔗 Посмотреть подарок в Telegram
            </button>
          )}

          {(attrs.model_name || attrs.backdrop_name || attrs.symbol_name) && (
            <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
              {[
                ['Модель', attrs.model_name, attrs.model_rarity],
                ['Фон', attrs.backdrop_name, attrs.backdrop_rarity],
                ['Символ', attrs.symbol_name, attrs.symbol_rarity],
              ].filter(([, v]) => v).map(([label, value, rarity], i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {value}
                    {rarity != null && (
                      <span style={{ color: 'var(--gold)', fontWeight: 600, marginLeft: 6 }}>{(rarity / 10).toFixed(1)}%</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            {item.giftCount} подарка на обмен
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.gifts.map(g => (
              <div
                key={g.gift_id}
                className="card"
                style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: g.gift_link ? 'pointer' : 'default' }}
                onClick={g.gift_link ? () => { haptic('light'); openLink(g.gift_link) } : undefined}
              >
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card-hover)' }}>
                  <img src={g.image_full || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {g.name}{g.number ? ` #${g.number}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar">👤</div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Владелец</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>@{item.owner}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge-muted">🔄 На обмен</span>
        </div>
      </div>

      {item.note && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          {item.note}
        </div>
      )}

      {proposed ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Предложение отправлено!</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Владелец увидит его в Профиле → Офферы
          </p>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => navigate('/trade')}>
            К списку обменов
          </button>
        </div>
      ) : isOwnTrade ? (
        cancelled ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📤</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Лот снят с обмена</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Подарок остался в вашем портфеле
            </p>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => navigate('/portfolio')}>
              В портфель
            </button>
          </div>
        ) : (
          <>
            {cancelError && (
              <div className="card" style={{ padding: '10px 14px', marginBottom: 12, border: '1px solid #f5555540', color: '#ff6b6b', fontSize: 13 }}>
                ⚠️ {cancelError}
              </div>
            )}
            <button className="btn btn-ghost btn-full" onClick={handleCancel} disabled={cancelling || soldOut}>
              {cancelling ? '⏳ Снимаем...' : soldOut ? 'Лот неактивен' : 'Снять с обмена'}
            </button>
          </>
        )
      ) : soldOut ? (
        <button className="btn btn-ghost btn-full" disabled>
          Лот уже обменян
        </button>
      ) : picking ? (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            Выберите подарки для обмена {selectedGiftIds.size > 0 ? `(${selectedGiftIds.size})` : ''}
          </div>
          {myGifts === null ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка…</div>
          ) : myGifts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Нет свободных подарков для обмена (все на продаже/в обмене, либо портфель пуст).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {myGifts.map(g => (
                <div
                  key={g.gift_id}
                  onClick={() => toggleGift(g.gift_id)}
                  className="card"
                  style={{
                    padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    border: selectedGiftIds.has(g.gift_id) ? '1px solid var(--gold)' : '1px solid var(--border)',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card-hover)' }}>
                    <img
                      src={fragmentImage(g.gift_name, g.gift_number, g.nft_address) || g.image_url}
                      alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.gift_name}{g.gift_number ? ` #${g.gift_number}` : ''}
                  </div>
                  {selectedGiftIds.has(g.gift_id) && <span style={{ color: 'var(--gold)' }}>✓</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Доплата (GRAM, необязательно)</div>
          <input
            className="input"
            value={topUp}
            onChange={e => setTopUp(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
            inputMode="decimal"
            style={{ fontSize: 13, marginBottom: topUpNum > 0 ? 4 : 10 }}
          />
          {topUpNum > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Комиссия площадки {Math.round(FEE_RATE * 100)}% ({fmtGram(topUpFee)} <GramIcon size={10} />) с доплаты —
              владелец лота получит {fmtGram(topUpNum - topUpFee)} <GramIcon size={10} />
            </div>
          )}

          {proposeError && (
            <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 10 }}>⚠️ {proposeError}</div>
          )}
          {myGifts && myGifts.length > 0 && selectedGiftIds.size === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Сначала выберите один или несколько подарков выше
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePropose} disabled={proposing || selectedGiftIds.size === 0}>
              {proposing ? '⏳ Отправляем...' : `Предложить${selectedGiftIds.size > 0 ? ` (${selectedGiftIds.size})` : ''}`}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPicking(false)} disabled={proposing}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={openPicker}
          style={{ fontSize: 15, padding: '14px', boxShadow: 'var(--gold-glow)' }}
        >
          🔄 Предложить обмен
        </button>
      )}
    </div>
  )
}
