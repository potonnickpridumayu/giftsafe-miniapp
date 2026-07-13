import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GiftCard from '../components/GiftCard'
import BrandLogo from '../components/BrandLogo'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { getCached, setCached } from '../utils/dataCache'

export default function Trade() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  // Стартуем из кэша (предзагружен на сплэше) — вкладка открывается мгновенно
  const [trades, setTrades] = useState(() => getCached('trades') || [])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(() => !getCached('trades'))
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!getCached('trades')) setLoading(true)
    setError(null)
    try {
      const data = await api.getTrades()
      setTrades(data)
      setCached('trades', data)
    } catch (e) {
      if (!getCached('trades')) setError(e.message || 'Не удалось загрузить обмен')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const items = search
    ? trades.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))
    : trades

  const giftsTotal = trades.reduce((sum, t) => sum + (t.giftCount || 1), 0)

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <BrandLogo />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div className="stat-tile">
          <div className="stat-tile-value">{loading ? '…' : trades.length}</div>
          <div className="stat-tile-label">Лотов на обмен</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">{loading ? '…' : giftsTotal}</div>
          <div className="stat-tile-label">Подарков</div>
        </div>
      </div>

      <button
        className="btn btn-dark-glow btn-full"
        onClick={() => { haptic('medium'); navigate('/portfolio') }}
        style={{ marginBottom: 16 }}
      >
        + Выставить на обмен
      </button>

      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Поиск подарков..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Загружаем обмен…</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Ошибка загрузки</div>
          <div className="empty-desc">{error}</div>
          <button className="btn btn-primary" onClick={() => { haptic('medium'); load() }} style={{ marginTop: 12 }}>
            Повторить
          </button>
        </div>
      ) : trades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔄</div>
          <div className="empty-title">Пока нет подарков на обмен</div>
          <div className="empty-desc">Выставьте свой подарок на обмен в Портфеле — предлагайте и принимайте обмены (возможна доплата в GRAM).</div>
          <button
            className="btn btn-primary"
            onClick={() => { haptic('medium'); navigate('/portfolio') }}
            style={{ marginTop: 14 }}
          >
            Перейти в Портфель
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Ничего не найдено</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {items.map(item => (
            <GiftCard
              key={item.id}
              item={item}
              onClick={() => { haptic('light'); navigate(`/trade/${item.id}`) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
