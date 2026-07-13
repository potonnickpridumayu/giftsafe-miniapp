import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api, fragmentImage, giftAccentColor } from '../api/client'
import { IconPencil } from '@tabler/icons-react'
import GramIcon from '../components/GramIcon'
import TgGiftSticker from '../components/TgGiftSticker'
import BrandLogo from '../components/BrandLogo'
import WalletButton from '../components/WalletButton'
import { fmtGram } from '../utils/format'

const API_BASE = 'https://nftmarketbot-production.up.railway.app'

async function apiCall(path, options = {}) {
  const initData = window.Telegram?.WebApp?.initData || ''
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Ошибка ${res.status}`)
  return data
}

const FEE_RATE = 0.03
const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4

// Карточки теперь в 2 колонки (как на маркете) — узко для двух кнопок в
// ряд, поэтому кнопки действий идут в столбик, каждая на всю ширину.
const rowBtnStyle = {
  width: '100%', minWidth: 0, fontSize: 12, padding: '8px 6px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
}
const ellipsisStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

function GiftCard({ gift, onWithdrawn, onListed, onStartTrade, haptic }) {
  const [panel, setPanel] = useState(null)
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    if (panel && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [panel])

  const rarityColor = giftAccentColor(gift.gift_id)
  const onChain = Boolean(gift.nft_address)
  const isTgGift = Boolean(gift.tg_owned_gift_id)
  const canTrade = onChain || isTgGift

  const priceNum = parseFloat(String(price).replace(',', '.')) || 0
  const youGet = round4(priceNum - priceNum * FEE_RATE)

  const togglePanel = (name) => {
    haptic('light')
    setError('')
    setPanel(p => (p === name ? null : name))
  }

  const withdraw = async () => {
    const to = address.trim()
    if (!isTgGift && !to) { setError('Укажите адрес кошелька'); return }
    setBusy(true)
    setError('')
    try {
      await apiCall(`/api/gifts/${gift.gift_id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify(isTgGift ? {} : { to_address: to }),
      })
      haptic('medium')
      onWithdrawn(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const delist = async () => {
    setBusy(true)
    setError('')
    try {
      await api.withdrawListing(gift.listing_id)
      haptic('medium')
      setBusy(false)
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const sell = async () => {
    if (!(priceNum > 0)) { setError('Укажите цену в GRAM больше нуля'); return }
    setBusy(true)
    setError('')
    try {
      await api.createListing({ gift_id: gift.gift_id, price: priceNum, description: '' })
      haptic('medium')
      setBusy(false)
      setPanel(null)
      setPrice('')
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const cancelTrade = async () => {
    setBusy(true)
    setError('')
    try {
      await api.cancelTrade(gift.trade_id)
      haptic('medium')
      setBusy(false)
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const savePrice = async () => {
    const p = parseFloat(String(newPrice).replace(',', '.'))
    if (!p || p <= 0) { setError('Введите цену больше нуля'); return }
    setBusy(true)
    setError('')
    try {
      await api.changePrice(gift.listing_id, p)
      haptic('medium')
      setBusy(false)
      setPanel(null)
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ padding: 8 }}>
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', borderRadius: 'var(--radius-md)', marginBottom: 8,
      }}>
        <div className="poster-art" style={{
          background: `radial-gradient(circle at 35% 25%, ${rarityColor}33, var(--bg-card-hover) 72%)`,
        }}>
          <TgGiftSticker
            image={fragmentImage(gift.gift_name, gift.gift_number, gift.nft_address) || gift.image_url}
            stickerId={gift.tg_sticker}
            backdrop={gift.tg_backdrop}
            pad="17%"
          />
          <div className="poster-gem" style={{ background: rarityColor, boxShadow: `0 0 8px ${rarityColor}` }} />
          {gift.on_sale ? (
            <div className="poster-ribbon">НА ПРОДАЖЕ</div>
          ) : gift.on_trade ? (
            <div className="poster-ribbon" style={{ background: 'var(--blue)' }}>В ОБМЕНЕ</div>
          ) : null}
        </div>

        <div className="poster-info">
          <div className="poster-name-line">
            <span className="poster-name">{gift.gift_name}</span>
            {gift.gift_number && <span className="poster-num">#{gift.gift_number}</span>}
          </div>
          {gift.on_sale && gift.price_ton != null && (
            <div className="poster-price" style={{ flexShrink: 0 }}>{fmtGram(gift.price_ton)} <GramIcon size={9} /></div>
          )}
        </div>
      </div>

      {canTrade && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gift.on_sale ? (
              <>
                <button
                  className="btn btn-ghost"
                  style={rowBtnStyle}
                  onClick={() => { setNewPrice(String(gift.price_ton ?? '')); togglePanel('editPrice') }}
                >
                  <IconPencil size={12} stroke={2} style={{ flexShrink: 0 }} />
                  <span style={ellipsisStyle}>{panel === 'editPrice' ? 'Скрыть' : 'Изменить цену'}</span>
                </button>
                <button
                  className="btn btn-ghost"
                  style={rowBtnStyle}
                  disabled={busy}
                  onClick={delist}
                >
                  <span style={ellipsisStyle}>{busy ? '⏳' : 'Снять с продажи'}</span>
                </button>
              </>
            ) : gift.on_trade ? (
              <button
                className="btn btn-ghost"
                style={rowBtnStyle}
                disabled={busy}
                onClick={cancelTrade}
              >
                <span style={ellipsisStyle}>{busy ? '⏳' : 'Снять с обмена'}</span>
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  style={rowBtnStyle}
                  onClick={() => togglePanel('sell')}
                >
                  <span style={ellipsisStyle}>{panel === 'sell' ? 'Скрыть' : 'Продать'}</span>
                </button>
                <button
                  className="btn btn-ghost"
                  style={rowBtnStyle}
                  onClick={() => { haptic('light'); onStartTrade(gift.gift_id) }}
                >
                  <span style={ellipsisStyle}>Обменять</span>
                </button>
                {/* Вывод доступен только для свободного подарка — на продаже/в
                    обмене он заблокирован на бэке, поэтому кнопку не показываем */}
                <button
                  className="btn btn-ghost"
                  style={rowBtnStyle}
                  onClick={() => togglePanel('withdraw')}
                >
                  {panel === 'withdraw' ? 'Скрыть' : 'Вывести'}
                </button>
              </>
            )}
        </div>
      )}

      {panel === null && error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</div>
      )}

      {panel === 'editPrice' && (
        <div ref={panelRef} style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
          scrollMarginBottom: 'calc(var(--nav-h) + 20px + var(--safe-bottom))',
        }}>
          <input
            className="input"
            value={newPrice}
            onChange={e => { setNewPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Новая цена в GRAM"
            inputMode="decimal"
            disabled={busy}
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy || !(parseFloat(String(newPrice).replace(',', '.')) > 0)}
            onClick={savePrice}
          >
            {busy ? 'Сохраняем…' : 'Сохранить цену'}
          </button>
        </div>
      )}

      {panel === 'sell' && (
        <div ref={panelRef} style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
          scrollMarginBottom: 'calc(var(--nav-h) + 20px + var(--safe-bottom))',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Лот появится на маркете. Комиссия {Math.round(FEE_RATE * 100)}%
            {priceNum > 0 ? <> — вы получите {fmtGram(youGet)} <GramIcon size={11} /></> : ''}.
          </div>
          <input
            className="input"
            value={price}
            onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Укажите цену в GRAM"
            inputMode="decimal"
            disabled={busy}
            style={{ fontSize: 12, marginBottom: 8 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy || !(priceNum > 0)}
            onClick={sell}
          >
            {busy ? 'Выставляем…' : 'Выставить на продажу'}
          </button>
        </div>
      )}

      {panel === 'withdraw' && isTgGift && (
        <div ref={panelRef} style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
          scrollMarginBottom: 'calc(var(--nav-h) + 20px + var(--safe-bottom))',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            twentop автоматически отправит подарок на ваш Telegram аккаунт.
            <br />
            Комиссия за передачу — <span style={{ color: 'var(--money-1)', fontWeight: 700 }}>0.25 <GramIcon size={11} /></span>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy}
            onClick={withdraw}
          >
            {busy ? 'Отправляем…' : 'Вернуть в Telegram'}
          </button>
        </div>
      )}

      {panel === 'withdraw' && !isTgGift && (
        <div ref={panelRef} style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
          scrollMarginBottom: 'calc(var(--nav-h) + 20px + var(--safe-bottom))',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            NFT уйдёт на указанный TON-адрес. Проверьте адрес перед отправкой.
          </div>
          <input
            className="input"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Адрес вашего TON-кошелька"
            disabled={busy}
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy}
            onClick={withdraw}
          >
            {busy ? 'Отправляем…' : 'Вывести на кошелёк'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Portfolio() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [gifts, setGifts] = useState(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | sale | trade | free

  const [tradePicker, setTradePicker] = useState(false)
  const [tradeSelected, setTradeSelected] = useState(() => new Set())
  const [tradeNote, setTradeNote] = useState('')
  const [tradeBusy, setTradeBusy] = useState(false)
  const [tradeError, setTradeError] = useState('')
  const tradePickerRef = useRef(null)

  useEffect(() => {
    if (tradePicker && tradePickerRef.current) {
      tradePickerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [tradePicker])

  const load = useCallback(async () => {
    try {
      const data = await apiCall('/api/portfolio')
      setGifts(data.gifts || [])
    } catch (e) {
      setError(e.message)
      setGifts([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onWithdrawn = (giftId) => {
    setGifts(prev => prev.filter(g => g.gift_id !== giftId))
  }

  const onListed = () => {
    haptic('light')
    load()
  }

  const onSaleCount = (gifts || []).filter(g => g.on_sale).length
  const onTradeCount = (gifts || []).filter(g => g.on_trade).length
  const tradeableGifts = (gifts || []).filter(g => !g.on_sale && !g.on_trade)

  // Порядок в сетке: сначала на продаже, потом в обмене, потом свободные
  const statusRank = (g) => (g.on_sale ? 0 : g.on_trade ? 1 : 2)
  const visibleGifts = (gifts || [])
    .filter(g => statusFilter === 'all'
      || (statusFilter === 'sale' && g.on_sale)
      || (statusFilter === 'trade' && g.on_trade)
      || (statusFilter === 'free' && !g.on_sale && !g.on_trade))
    .sort((a, b) => statusRank(a) - statusRank(b))

  const STATUS_FILTERS = [
    { label: 'Все', value: 'all' },
    { label: 'На продаже', value: 'sale' },
    { label: 'В обмене', value: 'trade' },
    { label: 'Свободные', value: 'free' },
  ]

  const openTradePicker = (giftId) => {
    setTradeError('')
    setTradeSelected(giftId ? new Set([giftId]) : new Set())
    setTradePicker(true)
  }

  const toggleTradeGift = (giftId) => {
    haptic('light')
    setTradeSelected(prev => {
      const next = new Set(prev)
      if (next.has(giftId)) next.delete(giftId)
      else next.add(giftId)
      return next
    })
  }

  const submitTrade = async () => {
    if (tradeSelected.size === 0) return
    setTradeBusy(true)
    setTradeError('')
    try {
      await api.createTrade(Array.from(tradeSelected), tradeNote)
      haptic('medium')
      setTradePicker(false)
      setTradeSelected(new Set())
      setTradeNote('')
      load()
    } catch (e) {
      setTradeError(e.message || 'Не удалось выставить на обмен')
      haptic('heavy')
    } finally {
      setTradeBusy(false)
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 16,
        }}>
          <BrandLogo />
          <WalletButton />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Подарков', value: gifts === null ? '…' : gifts.length },
            { label: 'На продаже', value: gifts === null ? '…' : onSaleCount },
            { label: 'В обмене', value: gifts === null ? '…' : onTradeCount },
          ].map(stat => (
            <div key={stat.label} className="stat-tile">
              <div className="stat-tile-value">{stat.value}</div>
              <div className="stat-tile-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-dark-glow btn-full"
          onClick={() => { haptic('medium'); navigate('/sell') }}
        >
          + Добавить подарок
        </button>

        {(gifts || []).length > 0 && (
          <div className="chips-row" style={{ marginTop: 12, flexWrap: 'nowrap', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { haptic('light'); setStatusFilter(f.value) }}
                className={`chip${statusFilter === f.value ? ' active' : ''}`}
                style={{ padding: '7px 10px', fontSize: 12, flexShrink: 0 }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {tradePicker && (
          <div ref={tradePickerRef} className="card" style={{ padding: '14px 16px', marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              Выберите подарки для обмена {tradeSelected.size > 0 ? `(${tradeSelected.size})` : ''}
            </div>
            {tradeableGifts.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Нет свободных подарков (все на продаже/в обмене).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
                {tradeableGifts.map(g => (
                  <div
                    key={g.gift_id}
                    onClick={() => toggleTradeGift(g.gift_id)}
                    className="card"
                    style={{
                      padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      border: tradeSelected.has(g.gift_id) ? '1px solid var(--gold)' : '1px solid var(--border)',
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
                    {tradeSelected.has(g.gift_id) && <span style={{ color: 'var(--gold)' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}

            <input
              className="input"
              value={tradeNote}
              onChange={e => setTradeNote(e.target.value)}
              placeholder="Комментарий (необязательно)"
              disabled={tradeBusy}
              style={{ fontSize: 13, marginBottom: 8 }}
            />
            {tradeError && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{tradeError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary" style={{ flex: 1 }}
                disabled={tradeBusy || tradeSelected.size === 0}
                onClick={submitTrade}
              >
                {tradeBusy ? 'Выставляем…' : `Выставить${tradeSelected.size > 0 ? ` (${tradeSelected.size})` : ''}`}
              </button>
              <button
                className="btn btn-ghost" style={{ flex: 1 }}
                disabled={tradeBusy}
                onClick={() => setTradePicker(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {gifts === null ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Загружаем портфель…</div>
        </div>
      ) : gifts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💼</div>
          <div className="empty-title">Портфель пуст</div>
          <div className="empty-desc">
            {error ? `Не удалось загрузить: ${error}` : 'Добавьте свой подарок или купите на маркете'}
          </div>
        </div>
      ) : visibleGifts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Таких подарков нет</div>
          <div className="empty-desc">Попробуйте другой фильтр</div>
        </div>
      ) : (
        <div style={{ columnCount: 2, columnGap: 9 }}>
          {visibleGifts.map(gift => (
            <div key={gift.gift_id} style={{ breakInside: 'avoid', marginBottom: 9 }}>
              <GiftCard gift={gift} onWithdrawn={onWithdrawn} onListed={onListed} onStartTrade={openTradePicker} haptic={haptic} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}