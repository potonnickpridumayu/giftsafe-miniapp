import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api, giftAccentColor } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import TgGiftSticker from '../components/TgGiftSticker'
import GramIcon from '../components/GramIcon'
import { fmtGram, fmtPercent } from '../utils/format'

// Должна совпадать с MARKET_FEE на бэкенде и цифрой в Market.jsx.
// Итоговая комиссия всё равно приходит в ответе покупки — это лишь предпросмотр.
const FEE_RATE = 0.03

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic, showConfirm, user, openLink } = useTelegram()

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

  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [priceError, setPriceError] = useState(null)

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

  const rarityColor = giftAccentColor(item.gift_id ?? item.id)
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
      `Купить «${item.name}» за ${fmtGram(item.price)} Gram?`,
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

  const handleSavePrice = async () => {
    const p = parseFloat(String(newPrice).replace(',', '.'))
    if (!p || p <= 0) {
      setPriceError('Введите цену больше нуля')
      return
    }
    haptic('light')
    setSavingPrice(true)
    setPriceError(null)
    try {
      await api.changePrice(item.id, p)
      setEditingPrice(false)
      await load()
    } catch (e) {
      setPriceError(e.message || 'Не удалось изменить цену')
      haptic('heavy')
    } finally {
      setSavingPrice(false)
    }
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
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <TgGiftSticker image={item.image_full || item.image_url} stickerId={item.tg_sticker} backdrop={item.tg_backdrop} fallback={item.emoji} />
        </div>
      </div>

      {/* Title */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: item.gift_link ? 10 : 20 }}>
        {item.name} {item.number ? <span style={{ fontWeight: 500 }}>{item.number}</span> : null}
      </h2>

      {/* Ссылка на сам подарок в Telegram */}
      {item.gift_link && (
        <button
          onClick={() => { haptic('light'); openLink(item.gift_link) }}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)' }}
        >
          🔗 Посмотреть подарок в Telegram
        </button>
      )}

      {/* Атрибуты подарка */}
      {(attrs.model_name || attrs.backdrop_name || attrs.symbol_name) && (
        <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
          {[
            ['Модель', attrs.model_name, attrs.model_rarity],
            ['Фон', attrs.backdrop_name, attrs.backdrop_rarity],
            ['Символ', attrs.symbol_name, attrs.symbol_rarity],
          ].filter(([, v]) => v).map(([label, value, rarity], i, arr) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: i < arr.length - 1 ? 10 : 0,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {value}
                {rarity != null && (
                  <span style={{ color: 'var(--gold)', fontWeight: 600, marginLeft: 6 }}>
                    {fmtPercent(rarity)}%
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Price breakdown */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Цена</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtGram(item.price)} <GramIcon size={16} style={{ verticalAlign: '-3px' }} /></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Комиссия ruby ({Math.round(FEE_RATE * 100)}%)</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmtGram(fee)} <GramIcon size={16} style={{ verticalAlign: '-3px' }} /></span>
        </div>
        <div className="divider" style={{ margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>Итого</span>
          <span className="price price-md">{fmtGram(total)} <GramIcon size={18} style={{ verticalAlign: '-4px' }} /></span>
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
              Подарок снова в вашем портфеле
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

            {editingPrice ? (
              <div className="card" style={{ padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Новая цена (Gram)</div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder={String(item.price)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 15, marginBottom: 10 }}
                />
                {(() => {
                  const p = parseFloat(String(newPrice).replace(',', '.')) || 0
                  const youGet = +(p - p * FEE_RATE).toFixed(4)
                  return (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Комиссия {Math.round(FEE_RATE * 100)}%
                      {p > 0 ? <> — вы получите <span style={{ color: 'var(--money-1)', fontWeight: 700 }}>{fmtGram(youGet)} <GramIcon size={11} /></span></> : ''}.
                    </div>
                  )
                })()}
                {priceError && (
                  <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 10 }}>⚠️ {priceError}</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSavePrice} disabled={savingPrice}>
                    {savingPrice ? '⏳ Сохраняем...' : 'Сохранить'}
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setEditingPrice(false); setPriceError(null) }} disabled={savingPrice}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-full"
                style={{ marginBottom: 12 }}
                onClick={() => { setNewPrice(String(item.price)); setPriceError(null); setEditingPrice(true) }}
                disabled={soldOut}
              >
                Изменить цену
              </button>
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
          {buying ? '⏳ Обработка...' : <>Купить за {fmtGram(total)} <GramIcon size={18} style={{ verticalAlign: '-4px' }} /></>}
        </button>
      )}
    </div>
  )
}