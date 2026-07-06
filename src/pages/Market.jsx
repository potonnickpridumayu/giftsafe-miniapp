import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GiftCard from '../components/GiftCard'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

const FILTERS = ['Все', 'Legendary', 'Epic', 'Rare', 'Common']

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

export default function Market() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Все')
  const [sort, setSort] = useState('new')
  const [showFilters, setShowFilters] = useState(false)

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const items = useMemo(() => {
    let list = [...listings]
    if (search) list = list.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))
    if (filter !== 'Все') list = list.filter(i => i.rarity === filter)
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    else list.sort((a, b) => b.listed_at - a.listed_at)
    return list
  }, [listings, search, filter, sort])

  const filtersActive = filter !== 'Все' || sort !== 'new'

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          Rubuy <span style={{
            background: 'linear-gradient(135deg, var(--gold-light), var(--gold))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Маркет</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
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
          style={{ flexShrink: 0, padding: '0 16px', fontSize: 17 }}
          aria-label="Фильтры"
        >
          ⚙︎
        </button>
      </div>

      {/* Quick rarity chips (как в макете) */}
      <div className="chips-row">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { haptic('light'); setFilter(f) }}
            className={`chip${filter === f ? ' active' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

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
          <div className="empty-desc">Будь первым — выставь свой подарок!</div>
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
          gap: 12,
        }}>
          {items.map(item => (
            <GiftCard
              key={item.id}
              item={item}
              onClick={() => { haptic('light'); navigate(`/listing/${item.id}`) }}
            />
          ))}
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
            background: 'rgba(8,5,12,0.7)',
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Фильтры</span>
              <button
                onClick={() => setShowFilters(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>РЕДКОСТЬ</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => { haptic('light'); setFilter(f) }}
                  className={`chip${filter === f ? ' active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>СОРТИРОВКА</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
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

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => { haptic('light'); setFilter('Все'); setSort('new') }}
              >
                Сбросить
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={() => { haptic('medium'); setShowFilters(false) }}
              >
                Показать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}