import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GiftCard from '../components/GiftCard'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

const FILTERS = ['Все', 'Legendary', 'Epic', 'Rare', 'Common']
const SORTS = [
  { label: 'Дешевле', value: 'price_asc' },
  { label: 'Дороже', value: 'price_desc' },
  { label: 'Новые', value: 'new' },
]

export default function Market() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Все')
  const [sort, setSort] = useState('new')

  // данные с бэкенда
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

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          Rubuy <span style={{ color: 'var(--gold)' }}>Маркет</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {loading ? 'Загрузка…' : `${listings.length} подарков`} • Комиссия 3%
        </p>
      </div>

      {/* Search */}
      <input
        className="input"
        placeholder="🔍 Поиск подарков..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { haptic('light'); setFilter(f) }}
            className="btn btn-sm"
            style={{
              flexShrink: 0,
              background: filter === f ? 'var(--gold-dim)' : 'var(--bg-card)',
              color: filter === f ? 'var(--gold)' : 'var(--text-secondary)',
              border: `1px solid ${filter === f ? 'rgba(212,175,55,0.3)' : 'var(--border)'}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SORTS.map(s => (
          <button
            key={s.value}
            onClick={() => { haptic('light'); setSort(s.value) }}
            style={{
              flex: 1,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 500,
              background: sort === s.value ? 'var(--bg-card-hover)' : 'transparent',
              color: sort === s.value ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${sort === s.value ? 'var(--border)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {s.label}
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
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Ничего не найдено</div>
          <div className="empty-desc">Попробуйте другой запрос</div>
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

      {/* Sell button */}
      <div style={{ position: 'fixed', right: 16, bottom: 80, zIndex: 50 }}>
        <button
          className="btn btn-primary"
          onClick={() => { haptic('medium'); navigate('/sell') }}
          style={{
            borderRadius: 50,
            width: 52,
            height: 52,
            padding: 0,
            fontSize: 22,
            boxShadow: 'var(--gold-glow)',
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}