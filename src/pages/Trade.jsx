import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function Trade() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [trades, setTrades] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTrades()
      setTrades(data)
    } catch (e) {
      setError(e.message || 'Не удалось загрузить обмен')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const items = search
    ? trades.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))
    : trades

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <BrandLogo />
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {loading ? 'Загрузка…' : `${trades.length} ${plural(trades.length)} на обмен`}
        </p>
      </div>

      <button
        className="btn btn-primary btn-full"
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
