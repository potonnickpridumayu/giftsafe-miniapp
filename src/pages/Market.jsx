import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAdjustments, IconShoppingCart, IconHistory } from '@tabler/icons-react'
import GiftCard from '../components/GiftCard'
import BrandLogo from '../components/BrandLogo'
import FiltersSheet from '../components/FiltersSheet'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { fmtGram } from '../utils/format'
import { useCartIds, toggleCart } from '../utils/cart'
import { getCached, setCached } from '../utils/dataCache'
import { useMarketFilters, marketFiltersActive } from '../utils/marketFilters'

function plural(n) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'подарок'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'подарка'
  return 'подарков'
}

// Атрибуты подарка (модель/фон/символ) лежат JSON-строкой в tg_backdrop
function giftAttrs(item) {
  if (!item.tg_backdrop) return {}
  try { return JSON.parse(item.tg_backdrop) } catch { return {} }
}

export default function Market() {
  const navigate = useNavigate()
  const { haptic, user, showConfirm, showAlert } = useTelegram()
  const [search, setSearch] = useState('')
  // Фильтры и сортировка общие с Историей маркета (utils/marketFilters)
  const filters = useMarketFilters()
  const [showFilters, setShowFilters] = useState(false)

  // Стартуем из кэша (предзагружен на сплэше) — маркет открывается мгновенно,
  // свежие данные подтягиваются фоном
  const [listings, setListings] = useState(() => getCached('listings') || [])
  const [loading, setLoading] = useState(() => !getCached('listings'))
  const [error, setError] = useState(null)

  const cartIds = useCartIds()

  const [offerTarget, setOfferTarget] = useState(null)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)
  const [offerError, setOfferError] = useState(null)
  const [offerSent, setOfferSent] = useState(false)

  const openOffer = (item) => {
    haptic('light')
    setOfferTarget(item)
    setOfferAmount('')
    setOfferError(null)
    setOfferSent(false)
  }

  const submitOffer = async () => {
    const amount = parseFloat(String(offerAmount).replace(',', '.'))
    const min = offerTarget.price * 0.5
    if (!amount || amount < min) {
      setOfferError(`Минимум ${fmtGram(min)} Gram (50% цены)`)
      return
    }
    haptic('medium')
    setOfferBusy(true)
    setOfferError(null)
    try {
      await api.proposeListingOffer(offerTarget.id, amount)
      setOfferSent(true)
    } catch (e) {
      setOfferError(e.message || 'Не удалось отправить предложение')
      haptic('heavy')
    } finally {
      setOfferBusy(false)
    }
  }

  // Быстрая покупка прямо с карточки, без захода на страницу лота
  const [buyingId, setBuyingId] = useState(null)
  const quickBuy = (item) => {
    haptic('medium')
    showConfirm(
      `Купить «${item.name}» за ${fmtGram(item.price)} Gram?`,
      async (ok) => {
        if (!ok) return
        setBuyingId(item.id)
        try {
          await api.buyListing(item.id)
          haptic('medium')
          showAlert(`🎉 Куплено! ${item.name} уже в вашем портфеле`)
          load()
        } catch (e) {
          haptic('heavy')
          showAlert(`⚠️ ${e.message || 'Не удалось совершить покупку'}`)
        } finally {
          setBuyingId(null)
        }
      }
    )
  }

  const load = useCallback(async () => {
    if (!getCached('listings')) setLoading(true)
    setError(null)
    try {
      const data = await api.getListings()
      setListings(data)
      setCached('listings', data)
    } catch (e) {
      // при живом кэше не роняем экран в ошибку — показываем старые данные
      if (!getCached('listings')) setError(e.message || 'Не удалось загрузить маркет')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Варианты атрибутов для фильтров собираются из реальных лотов
  const attrOptions = useMemo(() => {
    const models = new Set(), backdrops = new Set(), symbols = new Set()
    for (const l of listings) {
      const a = giftAttrs(l)
      if (a.model_name) models.add(a.model_name)
      if (a.backdrop_name) backdrops.add(a.backdrop_name)
      if (a.symbol_name) symbols.add(a.symbol_name)
    }
    return { models: [...models], backdrops: [...backdrops], symbols: [...symbols] }
  }, [listings])

  const items = useMemo(() => {
    let list = [...listings]
    if (search) list = list.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))
    const numQ = filters.number.replace('#', '').trim()
    if (numQ) list = list.filter(i => String(i.number || '').replace('#', '').includes(numQ))
    const pmin = parseFloat(String(filters.priceMin).replace(',', '.'))
    const pmax = parseFloat(String(filters.priceMax).replace(',', '.'))
    if (!isNaN(pmin)) list = list.filter(i => i.price >= pmin)
    if (!isNaN(pmax)) list = list.filter(i => i.price <= pmax)
    if (filters.model) list = list.filter(i => giftAttrs(i).model_name === filters.model)
    if (filters.backdropName) list = list.filter(i => giftAttrs(i).backdrop_name === filters.backdropName)
    if (filters.symbolName) list = list.filter(i => giftAttrs(i).symbol_name === filters.symbolName)
    if (filters.sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (filters.sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    else list.sort((a, b) => b.listed_at - a.listed_at)
    return list
  }, [listings, search, filters])

  const filtersActive = marketFiltersActive(filters)

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <BrandLogo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {loading ? 'Загрузка…' : `${listings.length} ${plural(listings.length)}`}
          </p>
          <button
            onClick={() => { haptic('light'); navigate('/history') }}
            aria-label="История сделок"
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <IconHistory size={22} stroke={1.8} />
          </button>
          <button
            onClick={() => { haptic('light'); navigate('/cart') }}
            aria-label="Корзина"
            style={{
              position: 'relative', background: 'none', border: 'none',
              color: 'var(--text-primary)', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <IconShoppingCart size={22} stroke={1.8} />
            {cartIds.length > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -5,
                minWidth: 16, height: 16, borderRadius: 999, padding: '0 4px',
                background: 'var(--gold)', color: '#fff5f7',
                fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
              }}>
                {cartIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search + filter button */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Поиск подарков..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => { haptic('light'); setShowFilters(true) }}
          className={`chip${filtersActive ? ' active' : ''}`}
          style={{ flexShrink: 0, padding: '0 14px' }}
          aria-label="Фильтры"
        >
          <IconAdjustments size={19} stroke={1.8} />
        </button>
      </div>

      {/* Чипы коллекций убраны (2026-07-14): вернём одной строкой,
          когда появятся коллекции NFT/модели и т.д. */}

      {/* Content */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Загружаем маркет…</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Ошибка загрузки</div>
          <div className="empty-desc">{error}</div>
          <button
            className="btn btn-primary"
            onClick={() => { haptic('medium'); load() }}
            style={{ marginTop: 12 }}
          >
            Повторить
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">Пока нет объявлений</div>
          <div className="empty-desc">Будьте первым — выставьте свой подарок!</div>
          <button
            className="btn btn-primary"
            onClick={() => { haptic('medium'); navigate('/sell') }}
            style={{ marginTop: 14 }}
          >
            + Выставить подарок
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Ничего не найдено</div>
          <div className="empty-desc">Попробуйте изменить фильтры</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 9,
        }}>
          {items.map(item => (
            <GiftCard
              key={item.id}
              item={item}
              onClick={() => { haptic('light'); navigate(`/listing/${item.id}`) }}
              onOffer={item.seller_id !== user?.id ? openOffer : undefined}
              onCartToggle={item.seller_id !== user?.id ? (it) => { haptic('light'); toggleCart(it.id) } : undefined}
              inCart={cartIds.includes(item.id)}
              onBuy={item.seller_id !== user?.id ? quickBuy : undefined}
              buyBusy={buyingId === item.id}
            />
          ))}
        </div>
      )}

      {/* Предложить цену */}
      {offerTarget && (
        <div
          onClick={() => setOfferTarget(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,3,4,0.7)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
              border: '1px solid var(--border)', borderBottom: 'none',
              padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
              maxWidth: 480, margin: '0 auto',
            }}
          >
            {offerSent ? (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Предложение отправлено!</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  Продавец увидит его в Профиле → Офферы
                </p>
                <button className="btn btn-ghost btn-full" style={{ marginTop: 16 }} onClick={() => setOfferTarget(null)}>
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                  Предложить цену
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  {offerTarget.name}{offerTarget.number ? ` ${offerTarget.number}` : ''} · цена лота {fmtGram(offerTarget.price)} Gram
                </div>
                <input
                  className="input"
                  value={offerAmount}
                  onChange={e => { setOfferAmount(e.target.value.replace(/[^\d.,]/g, '')); setOfferError(null) }}
                  placeholder={`От ${fmtGram(offerTarget.price * 0.5)} Gram`}
                  inputMode="decimal"
                  disabled={offerBusy}
                  style={{ fontSize: 13, marginBottom: 8 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Минимум 50% цены лота — {fmtGram(offerTarget.price * 0.5)} Gram
                </div>
                {offerError && (
                  <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 10 }}>⚠️ {offerError}</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitOffer} disabled={offerBusy}>
                    {offerBusy ? '⏳ Отправляем...' : 'Отправить'}
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setOfferTarget(null)} disabled={offerBusy}>
                    Отмена
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sell FAB — только когда есть объявления */}
      {listings.length > 0 && (
        <div style={{ position: 'fixed', right: 16, bottom: 84, zIndex: 50 }}>
          <button
            className="btn btn-primary"
            onClick={() => { haptic('medium'); navigate('/sell') }}
            style={{
              borderRadius: '50%',
              width: 58,
              height: 58,
              padding: 0,
              fontSize: 26,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      )}


      {/* Filters bottom sheet — общий с Историей маркета */}
      <FiltersSheet open={showFilters} onClose={() => setShowFilters(false)} options={attrOptions} haptic={haptic} />
    </div>
  )
}
