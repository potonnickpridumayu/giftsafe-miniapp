import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAdjustments } from '@tabler/icons-react'
import GiftCard from '../components/GiftCard'
import BrandLogo from '../components/BrandLogo'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

function plural(n) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'подарок'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'подарка'
  return 'подарков'
}

const SORTS = [
  { label: 'Новые', value: 'new' },
  { label: 'Дешевле', value: 'price_asc' },
  { label: 'Дороже', value: 'price_desc' },
]

// Атрибуты подарка (модель/фон/символ) лежат JSON-строкой в tg_backdrop
function giftAttrs(item) {
  if (!item.tg_backdrop) return {}
  try { return JSON.parse(item.tg_backdrop) } catch { return {} }
}

const EMPTY_FILTERS = {
  number: '',
  priceMin: '',
  priceMax: '',
  model: '',
  backdropName: '',
  symbolName: '',
}

export default function Market() {
  const navigate = useNavigate()
  const { haptic, user } = useTelegram()
  const [search, setSearch] = useState('')
  const [collection, setCollection] = useState('Все')
  const [sort, setSort] = useState('new')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setOfferError(`Минимум ${min.toFixed(2)} GRAM (50% цены)`)
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getListings()
      setListings(data)
    } catch (e) {
      setError(e.message || 'Не удалось загрузить маркет')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Чипы коллекций и варианты атрибутов собираются из реальных лотов
  const collections = useMemo(() => {
    const names = [...new Set(listings.map(l => l.collection || l.name).filter(Boolean))]
    return ['Все', ...names]
  }, [listings])

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
    if (collection !== 'Все') list = list.filter(i => (i.collection || i.name) === collection)
    const numQ = filters.number.replace('#', '').trim()
    if (numQ) list = list.filter(i => String(i.number || '').replace('#', '').includes(numQ))
    const pmin = parseFloat(String(filters.priceMin).replace(',', '.'))
    const pmax = parseFloat(String(filters.priceMax).replace(',', '.'))
    if (!isNaN(pmin)) list = list.filter(i => i.price >= pmin)
    if (!isNaN(pmax)) list = list.filter(i => i.price <= pmax)
    if (filters.model) list = list.filter(i => giftAttrs(i).model_name === filters.model)
    if (filters.backdropName) list = list.filter(i => giftAttrs(i).backdrop_name === filters.backdropName)
    if (filters.symbolName) list = list.filter(i => giftAttrs(i).symbol_name === filters.symbolName)
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    else list.sort((a, b) => b.listed_at - a.listed_at)
    return list
  }, [listings, search, collection, sort, filters])

  const filtersActive = sort !== 'new'
    || Object.entries(filters).some(([, v]) => v !== '')

  const setF = (patch) => setFilters(f => ({ ...f, ...patch }))

  const sheetSection = (title) => (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '16px 0 8px', fontWeight: 600, letterSpacing: 0.5 }}>
      {title}
    </div>
  )

  const attrChips = (options, current, key) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o}
          onClick={() => { haptic('light'); setF({ [key]: current === o ? '' : o }) }}
          className={`chip${current === o ? ' active' : ''}`}
        >
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <BrandLogo />
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {loading ? 'Загрузка…' : `${listings.length} ${plural(listings.length)}`}
        </p>
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

      {/* Collection chips */}
      {collections.length > 2 && (
        <div className="chips-row">
          {collections.map(c => (
            <button
              key={c}
              onClick={() => { haptic('light'); setCollection(c) }}
              className={`chip${collection === c ? ' active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

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
                  {offerTarget.name}{offerTarget.number ? ` ${offerTarget.number}` : ''} · цена лота {offerTarget.price} GRAM
                </div>
                <input
                  className="input"
                  value={offerAmount}
                  onChange={e => { setOfferAmount(e.target.value.replace(/[^\d.,]/g, '')); setOfferError(null) }}
                  placeholder={`От ${(offerTarget.price * 0.5).toFixed(2)} GRAM`}
                  inputMode="decimal"
                  disabled={offerBusy}
                  style={{ fontSize: 13, marginBottom: 8 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Минимум 50% цены лота — {(offerTarget.price * 0.5).toFixed(2)} GRAM
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

      {/* Filters bottom sheet */}
      {showFilters && (
        <div
          onClick={() => setShowFilters(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,3,4,0.7)',
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Фильтры</span>
              <button
                onClick={() => setShowFilters(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {sheetSection('НОМЕР ПОДАРКА')}
            <input
              className="input"
              placeholder="# 33824"
              inputMode="numeric"
              value={filters.number}
              onChange={e => setF({ number: e.target.value.replace(/[^\d#]/g, '') })}
            />

            {sheetSection('СОРТИРОВАТЬ ПО')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SORTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => { haptic('light'); setSort(s.value) }}
                  className={`chip${sort === s.value ? ' active' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {sheetSection('ЦЕНА')}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="От"
                inputMode="decimal"
                value={filters.priceMin}
                onChange={e => setF({ priceMin: e.target.value.replace(/[^\d.,]/g, '') })}
              />
              <input
                className="input"
                placeholder="До"
                inputMode="decimal"
                value={filters.priceMax}
                onChange={e => setF({ priceMax: e.target.value.replace(/[^\d.,]/g, '') })}
              />
            </div>

            {attrOptions.models.length > 0 && (
              <>
                {sheetSection('МОДЕЛЬ')}
                {attrChips(attrOptions.models, filters.model, 'model')}
              </>
            )}

            {attrOptions.backdrops.length > 0 && (
              <>
                {sheetSection('ФОН')}
                {attrChips(attrOptions.backdrops, filters.backdropName, 'backdropName')}
              </>
            )}

            {attrOptions.symbols.length > 0 && (
              <>
                {sheetSection('СИМВОЛ')}
                {attrChips(attrOptions.symbols, filters.symbolName, 'symbolName')}
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => { haptic('light'); setFilters(EMPTY_FILTERS); setSort('new'); setCollection('Все') }}
              >
                Очистить всё
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={() => { haptic('medium'); setShowFilters(false) }}
              >
                Показать результаты
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
