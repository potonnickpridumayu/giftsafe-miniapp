import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAdjustments, IconShoppingCart, IconActivity } from '@tabler/icons-react'
import GiftCard from '../components/GiftCard'
import AppHeader from '../components/AppHeader'
import EmptyState, { IlloListing } from '../components/EmptyState'
import StateCard, { IlloError, IlloSearch } from '../components/MarketStates'
import { LoadingScreen, IconSuccess, MiniSpin, BtnShimmer } from '../components/StatusIcons'
import { showResult } from '../components/ResultSheet'
import { WarnIcon } from '../components/WarnIcon'
import FiltersSheet from '../components/FiltersSheet'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { fmtGram } from '../utils/format'
import { useCartIds, toggleCart } from '../utils/cart'
import { getCached, setCached } from '../utils/dataCache'
import { useMarketFilters, marketFiltersActive, resetMarketFilters } from '../utils/marketFilters'

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
  const { haptic, user, showConfirm } = useTelegram()
  const [search, setSearch] = useState('')
  // Чип-фильтр по коллекции (визуальный, поверх общих фильтров)
  const [collection, setCollection] = useState(null)
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
    // Оффер — это предложение цены НИЖЕ текущей: платить больше цены лота
    // бессмысленно (можно просто купить). Не даём отправить такой оффер.
    if (amount >= offerTarget.price) {
      setOfferError(`Оффер больше цены лота (${fmtGram(offerTarget.price)} Gram)`)
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
          showResult({ icon: 'purchase', title: 'Куплено!', sub: `${item.name} уже в вашем портфеле` })
          load()
        } catch (e) {
          haptic('heavy')
          showResult({ icon: 'error', title: 'Не удалось купить', sub: e.message || 'Попробуйте ещё раз' })
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
      // не трогаем стейт, если данные не изменились — иначе автоопрос
      // перерисовывал бы сетку каждые 15 с впустую
      setListings(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data)
      setCached('listings', data)
    } catch (e) {
      // при живом кэше не роняем экран в ошибку — показываем старые данные
      if (!getCached('listings')) setError(e.message || 'Не удалось загрузить маркет')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Автообновление: тихий рефетч раз в 15 с, чтобы проданные/снятые лоты
  // пропадали у всех открывших маркет, а не только после ручного перехода.
  // Пока приложение свёрнуто (document.hidden) — не опрашиваем.
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load() }, 15000)
    return () => clearInterval(id)
  }, [load])

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

  // Коллекции для чипов — уникальные имена/коллекции из текущих лотов
  const collections = useMemo(
    () => [...new Set(listings.map(l => l.collection_name || l.name).filter(Boolean))],
    [listings],
  )
  const floor = listings.length
    ? fmtGram(Math.min(...listings.map(l => l.price).filter(p => p != null)))
    : '—'

  const items = useMemo(() => {
    let list = [...listings]
    if (collection) list = list.filter(i => (i.collection_name || i.name) === collection)
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
  }, [listings, search, filters, collection])

  const filtersActive = marketFiltersActive(filters)

  return (
    <div className="rd-page">
      <AppHeader wordmark>
        <button className="rd-iconbtn" onClick={() => { haptic('light'); navigate('/history') }} aria-label="Активность маркета">
          <IconActivity size={18} stroke={1.9} />
        </button>
        <button className="rd-iconbtn" onClick={() => { haptic('light'); navigate('/cart') }} aria-label="Корзина">
          <IconShoppingCart size={18} stroke={1.9} />
          {cartIds.length > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: '#ff4d6f', color: '#fff', fontSize: 10, fontWeight: 800,
              lineHeight: '16px', textAlign: 'center', boxShadow: '0 0 0 2px #0c0710',
            }}>{cartIds.length}</span>
          )}
        </button>
      </AppHeader>

      <div className="rd-body">
        {/* Поиск + кнопка фильтров */}
        <div className="rd-searchrow">
          <input
            className="rd-search"
            placeholder="Поиск подарков..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            onClick={() => { haptic('light'); setShowFilters(true) }}
            className={`rd-sqbtn${filtersActive ? ' active' : ''}`}
            aria-label="Фильтры"
          >
            <IconAdjustments size={20} stroke={1.9} />
          </button>
        </div>

        {/* Чипы коллекций */}
        {collections.length > 0 && (
          <div className="rd-chips" style={{ marginTop: 12 }}>
            <button className={`rd-fchip${!collection ? ' active' : ''}`} onClick={() => { haptic('light'); setCollection(null) }}>Все</button>
            {collections.map(c => (
              <button key={c} className={`rd-fchip${collection === c ? ' active' : ''}`} onClick={() => { haptic('light'); setCollection(c) }}>{c}</button>
            ))}
          </div>
        )}

        {/* Полоса статистики */}
        <div className="rd-statstrip" style={{ marginTop: 12 }}>
          <span>Флор <b>{floor}</b> <img src="/ruby-gem-256.png" width={17} height={17} className="rd-gem" alt="" /></span>
          <span>Листинги <b>{listings.length}</b></span>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <LoadingScreen text="Загружаем маркет…" />
          ) : error ? (
            <StateCard illo={<IlloError />} title="Ошибка загрузки" sub={error} cta="Повторить" onCta={() => { haptic('medium'); load() }} />
          ) : listings.length === 0 ? (
            <EmptyState
              illo={<IlloListing />}
              title="Пока нет объявлений"
              sub="Будьте первым — выставьте свой подарок!"
              cta="+ Выставить подарок"
              onCta={() => { haptic('medium'); navigate('/sell') }}
            />
          ) : items.length === 0 ? (
            <StateCard illo={<IlloSearch />} title="Ничего не найдено" sub="Попробуйте изменить фильтры или поисковый запрос." />
          ) : (
            <div className="rd-grid">
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
        </div>
      </div>{/* /rd-body */}

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
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconSuccess size={90} /></div>
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
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, whiteSpace: 'nowrap' }}>
                  Оффер должен составлять хотя бы 50% от текущей цены подарка
                </div>
                {offerError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>
                    <WarnIcon size={18} /> {offerError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, position: 'relative', overflow: 'hidden', gap: 8 }} onClick={submitOffer} disabled={offerBusy}>
                    {offerBusy ? <><BtnShimmer /><MiniSpin size={16} /> Отправляем…</> : 'Отправить'}
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

      {/* Filters bottom sheet — общий с Историей маркета */}
      <FiltersSheet open={showFilters} onClose={() => setShowFilters(false)} options={attrOptions} haptic={haptic} />
    </div>
  )
}
