import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api, fragmentImage, giftAccentColor } from '../api/client'
import { IconPencil, IconChevronDown } from '@tabler/icons-react'
import MarketActivityIcon from '../components/MarketActivityIcon'
import GramIcon from '../components/GramIcon'
import TgGiftSticker from '../components/TgGiftSticker'
import AppHeader from '../components/AppHeader'
import WalletButton from '../components/WalletButton'
import EmptyState, { IlloCase } from '../components/EmptyState'
import { LoadingScreen, MiniSpinAccent } from '../components/StatusIcons'
import StateCard, { IlloSearch } from '../components/MarketStates'
import { showResult } from '../components/ResultSheet'
import { fmtGram } from '../utils/format'
import { MAX_PRICE_ERROR, overMaxPrice } from '../utils/limits'
import { getCached, setCached } from '../utils/dataCache'

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

// Скролл к раскрывшейся панели. Нативный scrollTo({behavior:'smooth'}) в
// Telegram WebView иногда срабатывает мгновенным прыжком — анимируем сами
// через rAF, это гарантированно плавно на любом клиенте.
let _scrollRaf = null
function animateScrollTo(targetY, duration = 450) {
  if (_scrollRaf) cancelAnimationFrame(_scrollRaf)
  const startY = window.scrollY
  const delta = targetY - startY
  if (Math.abs(delta) < 2) return
  const t0 = performance.now()
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const step = now => {
    const p = Math.min(1, (now - t0) / duration)
    window.scrollTo(0, startY + delta * ease(p))
    _scrollRaf = p < 1 ? requestAnimationFrame(step) : null
  }
  _scrollRaf = requestAnimationFrame(step)
}

// Панель оказывается в верхней части экрана (не прячется под клавиатурой);
// offset — отступ от верха, плюс --tg-top в fullscreen.
function scrollToPanel(el, offset = 90) {
  if (!el) return
  const tgTop = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--tg-top')
  ) || 0
  const top = el.getBoundingClientRect().top + window.scrollY - tgTop - offset
  animateScrollTo(Math.max(top, 0))
}

function GiftCard({ gift, onWithdrawn, onListed, onStartTrade, haptic }) {
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState(null)
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    if (panel && panelRef.current) {
      scrollToPanel(panelRef.current)
    }
  }, [panel])

  const rarityColor = giftAccentColor(gift.gift_id)
  const onChain = Boolean(gift.nft_address)
  const isTgGift = Boolean(gift.tg_owned_gift_id)
  const canTrade = onChain || isTgGift

  const priceNum = parseFloat(String(price).replace(',', '.')) || 0
  const youGet = round4(priceNum - priceNum * FEE_RATE)
  const newPriceNum = parseFloat(String(newPrice).replace(',', '.')) || 0
  const newYouGet = round4(newPriceNum - newPriceNum * FEE_RATE)

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
      showResult({ icon: 'success', title: 'Вывод отправлен', sub: isTgGift ? 'Подарок скоро придёт в Telegram' : 'NFT отправлен на кошелёк' })
      onWithdrawn(gift.gift_id)
    } catch (e) {
      showResult({ icon: 'error', title: 'Не удалось вывести', sub: e.message })
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
      showResult({ icon: 'return', title: 'Лот снят', sub: 'Подарок снова в вашем портфеле' })
      onListed(gift.gift_id)
    } catch (e) {
      showResult({ icon: 'error', title: 'Не удалось снять лот', sub: e.message })
      setBusy(false)
    }
  }

  const sell = async () => {
    if (!(priceNum > 0)) { setError('Укажите цену в Gram больше нуля'); return }
    if (overMaxPrice(priceNum)) { setError(MAX_PRICE_ERROR); return }
    setBusy(true)
    setError('')
    try {
      await api.createListing({ gift_id: gift.gift_id, price: priceNum, description: '' })
      haptic('medium')
      setBusy(false)
      setPanel(null)
      setPrice('')
      showResult({ icon: 'success', title: 'Выставлено на продажу', sub: 'Подарок теперь на маркете' })
      onListed(gift.gift_id)
    } catch (e) {
      showResult({ icon: 'error', title: 'Не удалось выставить', sub: e.message })
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
      showResult({ icon: 'return', title: 'Снято с обмена', sub: 'Подарок остался в вашем портфеле' })
      onListed(gift.gift_id)
    } catch (e) {
      showResult({ icon: 'error', title: 'Не удалось снять с обмена', sub: e.message })
      setBusy(false)
    }
  }

  const savePrice = async () => {
    const p = parseFloat(String(newPrice).replace(',', '.'))
    if (!p || p <= 0) { setError('Введите цену больше нуля'); return }
    if (overMaxPrice(p)) { setError(MAX_PRICE_ERROR); return }
    setBusy(true)
    setError('')
    try {
      await api.changePrice(gift.listing_id, p)
      haptic('medium')
      setBusy(false)
      setPanel(null)
      showResult({ icon: 'success', title: 'Цена изменена', sub: `Новая цена — ${fmtGram(p)} Gram` })
      onListed(gift.gift_id)
    } catch (e) {
      showResult({ icon: 'error', title: 'Не удалось изменить цену', sub: e.message })
      setBusy(false)
    }
  }

  return (
    <div
      className="rd-card"
      style={{ cursor: 'pointer' }}
      onClick={() => { haptic('light'); if (expanded) setPanel(null); setExpanded(v => !v) }}
    >
      <div className="rd-card-art" style={{ background: `radial-gradient(circle at 40% 30%, ${rarityColor}59, ${rarityColor}1f 75%)` }}>
        <TgGiftSticker
          image={fragmentImage(gift.gift_name, gift.gift_number, gift.nft_address) || gift.image_url}
          stickerId={gift.tg_sticker}
          backdrop={gift.tg_backdrop}
        />
        <span className="rd-pill rd-pill-num">#{gift.gift_number}</span>
        {gift.on_sale ? (
          <span className="rd-pill rd-pill-status rd-pill-sale">На продаже</span>
        ) : gift.on_trade ? (
          <span className="rd-pill rd-pill-status rd-pill-trade">В обмене</span>
        ) : (
          <span className="rd-pill rd-pill-status rd-pill-free">Свободен</span>
        )}
      </div>

      <div className="rd-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="rd-card-name" style={{ flex: 1, minWidth: 0 }}>{gift.gift_name}</div>
          <IconChevronDown
            size={16}
            style={{ flexShrink: 0, color: 'var(--rd-dim-2)', transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </div>

        {expanded && <div onClick={e => e.stopPropagation()}>
        {gift.on_sale && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 800, color: '#fff', margin: '8px 0 2px' }}>
            {fmtGram(gift.price_ton)} <GramIcon size={17} />
          </div>
        )}

        {canTrade && (
          gift.on_sale ? (
            <>
              <button className="rd-act rd-act--glass" onClick={() => { setNewPrice(String(gift.price_ton ?? '')); togglePanel('editPrice') }}>
                <IconPencil size={13} stroke={2} /> {panel === 'editPrice' ? 'Скрыть' : 'Изменить цену'}
              </button>
              <button className="rd-act rd-act--glass" disabled={busy} onClick={delist}>
                {busy ? <MiniSpinAccent size={15} /> : 'Снять с продажи'}
              </button>
            </>
          ) : gift.on_trade ? (
            <button className="rd-act rd-act--glass" disabled={busy} onClick={cancelTrade}>
              {busy ? <MiniSpinAccent size={15} /> : 'Снять с обмена'}
            </button>
          ) : (
            <>
              <button className="rd-act rd-act--ruby" onClick={() => togglePanel('sell')}>
                {panel === 'sell' ? 'Скрыть' : 'Продать'}
              </button>
              <button className="rd-act rd-act--glass" onClick={() => { haptic('light'); onStartTrade(gift.gift_id) }}>
                Обменять
              </button>
              <button className="rd-act rd-act--glass" onClick={() => togglePanel('withdraw')}>
                {panel === 'withdraw' ? 'Скрыть' : 'Вывести'}
              </button>
            </>
          )
        )}

      {panel === null && error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</div>
      )}

      {panel === 'editPrice' && (
        <div ref={panelRef} style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
          scrollMarginBottom: 'calc(var(--nav-h) + 20px + var(--safe-bottom))',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Комиссия {Math.round(FEE_RATE * 100)}%
            {newPriceNum > 0 ? <> — вы получите <span style={{ color: 'var(--money-1)', fontWeight: 700 }}>{fmtGram(newYouGet)} <GramIcon size={16} /></span></> : ''}.
          </div>
          <input
            className="input"
            value={newPrice}
            onChange={e => { setNewPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Новая цена в Gram"
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
            {priceNum > 0 ? <> — вы получите {fmtGram(youGet)} <GramIcon size={16} /></> : ''}.
          </div>
          <input
            className="input"
            value={price}
            onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Укажите цену в Gram"
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
            Комиссия за передачу — <span style={{ color: 'var(--money-1)', fontWeight: 700 }}>0.25 <GramIcon size={16} /></span>
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
      </div>}
      </div>{/* /rd-card-body */}
    </div>
  )
}

export default function Portfolio() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  // null = ещё не грузили (спиннер); из кэша сплэша стартуем сразу с данными
  const [gifts, setGifts] = useState(() => getCached('portfolio') ?? null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | sale | trade | free

  // Раньше пикер раскрывался аккордеоном в потоке страницы + скролл к нему
  // отдельной JS rAF-анимацией — два аниматора одновременно дёргали layout
  // (max-height реflow + scrollTo каждый кадр) и на реальном устройстве это
  // читалось как лаги/дёрганье. Теперь это шторка снизу (как ConfirmSheet/
  // FiltersSheet) — фиксированный оверлей поверх страницы, скроллить страницу
  // не нужно вообще, анимируется только transform (GPU, без reflow).
  const [tradePicker, setTradePicker] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [tradeSelected, setTradeSelected] = useState(() => new Set())
  const [tradeNote, setTradeNote] = useState('')
  const [tradeBusy, setTradeBusy] = useState(false)
  const [tradeError, setTradeError] = useState('')

  useEffect(() => {
    if (!tradePicker) return
    const id = requestAnimationFrame(() => setPickerVisible(true))
    return () => cancelAnimationFrame(id)
  }, [tradePicker])

  const closeTradePicker = () => {
    setPickerVisible(false)
    setTimeout(() => setTradePicker(false), 250)
  }

  const load = useCallback(async () => {
    try {
      const data = await apiCall('/api/portfolio')
      // не трогаем стейт, если данные не изменились — как в Market.jsx
      setGifts(prev => JSON.stringify(prev) === JSON.stringify(data.gifts || []) ? prev : (data.gifts || []))
      setCached('portfolio', data.gifts || [])
    } catch (e) {
      // при живом кэше не затираем показанные подарки пустотой
      if (getCached('portfolio') === undefined) {
        setError(e.message)
        setGifts([])
      }
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Тихое автообновление раз в 15 с — проданные/принятые в обмен подарки
  // пропадают без ручного перехода между страницами (как в Market.jsx)
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load() }, 15000)
    return () => clearInterval(id)
  }, [load])

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
    { label: 'Свободные', value: 'free' },
    { label: 'На продаже', value: 'sale' },
    { label: 'В обмене', value: 'trade' },
  ]

  const openTradePicker = (giftId) => {
    setTradeError('')
    setTradeSelected(giftId ? new Set([giftId]) : new Set())
    setTradePicker(true)
  }

  // «+ Выставить на обмен» со вкладки Обмен ведёт сюда с флагом — сразу
  // открываем пикер, а флаг затираем, чтобы он не срабатывал при возврате.
  const location = useLocation()
  useEffect(() => {
    if (location.state?.openTradePicker) {
      openTradePicker()
      navigate('.', { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      closeTradePicker()
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
    <div className="rd-page">
      <AppHeader title="Портфель">
        <WalletButton />
        <button className="rd-iconbtn" onClick={() => { haptic('light'); navigate('/history') }} aria-label="Активность маркета">
          <MarketActivityIcon size={20} />
        </button>
      </AppHeader>

      <div className="rd-body">
        <div className="rd-stats" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[
            { label: 'Подарков', value: gifts === null ? '…' : gifts.length },
            { label: 'На продаже', value: gifts === null ? '…' : onSaleCount },
            { label: 'В обмене', value: gifts === null ? '…' : onTradeCount },
          ].map(stat => (
            <div key={stat.label} className="rd-stat">
              <div className="rd-stat-value">{stat.value}</div>
              <div className="rd-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <button className="rd-cta rd-cta--outline" style={{ marginTop: 12 }} onClick={() => { haptic('medium'); navigate('/sell') }}>
          + Добавить подарок
        </button>

        {(gifts || []).length > 0 && (
          <div className="rd-chips" style={{ marginTop: 12 }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { haptic('light'); setStatusFilter(f.value) }}
                className={`rd-fchip${statusFilter === f.value ? ' active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {gifts === null ? (
            <LoadingScreen text="Загружаем портфель…" />
          ) : gifts.length === 0 ? (
            <EmptyState
              illo={<IlloCase />}
              title="Портфель пуст"
              sub={error ? `Не удалось загрузить: ${error}` : 'Добавьте свой подарок или купите на маркете'}
            />
          ) : visibleGifts.length === 0 ? (
            <StateCard illo={<IlloSearch />} title="Таких подарков нет" sub="Попробуйте другой фильтр" />
          ) : (
            <div style={{ columnCount: 2, columnGap: 10 }}>
              {visibleGifts.map(gift => (
                <div key={gift.gift_id} style={{ breakInside: 'avoid', marginBottom: 10 }}>
                  <GiftCard gift={gift} onWithdrawn={onWithdrawn} onListed={onListed} onStartTrade={openTradePicker} haptic={haptic} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>{/* /rd-body */}

      {tradePicker && (
        <div
          onClick={closeTradePicker}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,3,4,0.7)',
            opacity: pickerVisible ? 1 : 0,
            transition: 'opacity .25s ease',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '20px 20px 0 0',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
              maxWidth: 480,
              margin: '0 auto',
              maxHeight: '80vh',
              overflowY: 'auto',
              transform: pickerVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform .3s ease',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              Выберите подарки для обмена {tradeSelected.size > 0 ? `(${tradeSelected.size})` : ''}
            </div>
            {gifts === null ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Загружаем подарки…
              </div>
            ) : tradeableGifts.length === 0 ? (
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
                onClick={closeTradePicker}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}