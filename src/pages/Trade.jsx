import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconActivity } from '@tabler/icons-react'
import AppHeader from '../components/AppHeader'
import GiftCard from '../components/GiftCard'
import EmptyState, { IlloSwap } from '../components/EmptyState'
import { LoadingScreen } from '../components/StatusIcons'
import StateCard, { IlloError } from '../components/MarketStates'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { getCached, setCached } from '../utils/dataCache'

export default function Trade() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  // Стартуем из кэша (предзагружен на сплэше) — вкладка открывается мгновенно
  const [trades, setTrades] = useState(() => getCached('trades') || [])
  const [loading, setLoading] = useState(() => !getCached('trades'))
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!getCached('trades')) setLoading(true)
    setError(null)
    try {
      const data = await api.getTrades()
      setTrades(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data)
      setCached('trades', data)
    } catch (e) {
      if (!getCached('trades')) setError(e.message || 'Не удалось загрузить обмен')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load() }, 15000)
    return () => clearInterval(id)
  }, [load])

  const giftsTotal = trades.reduce((sum, t) => sum + (t.giftCount || 1), 0)

  const goPortfolioTrade = () => { haptic('medium'); navigate('/portfolio', { state: { openTradePicker: true } }) }

  return (
    <div className="rd-page">
      <AppHeader title="Обмен">
        <span className="rd-chip">{trades.length} в обмене</span>
        <button className="rd-iconbtn" onClick={() => { haptic('light'); navigate('/history') }} aria-label="Активность маркета">
          <IconActivity size={18} stroke={1.9} />
        </button>
      </AppHeader>

      <div className="rd-body">
        <div className="rd-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="rd-stat">
            <div className="rd-stat-value">{loading ? '…' : trades.length}</div>
            <div className="rd-stat-label">Лотов на обмен</div>
          </div>
          <div className="rd-stat">
            <div className="rd-stat-value">{loading ? '…' : giftsTotal}</div>
            <div className="rd-stat-label">Подарков</div>
          </div>
        </div>

        <button className="rd-cta rd-cta--outline" style={{ marginTop: 12 }} onClick={goPortfolioTrade}>
          + Выставить на обмен
        </button>

        {loading ? (
          <div style={{ marginTop: 12 }}><LoadingScreen text="Загружаем обмен…" /></div>
        ) : error ? (
          <div style={{ marginTop: 12 }}>
            <StateCard illo={<IlloError />} title="Ошибка загрузки" sub={error} cta="Повторить" onCta={() => { haptic('medium'); load() }} />
          </div>
        ) : trades.length === 0 ? (
          <div style={{ marginTop: 12 }}>
            <EmptyState
              illo={<IlloSwap />}
              title="Пока нет подарков на обмен"
              sub="Выставьте свой подарок на обмен в Портфеле — предлагайте и принимайте обмены (возможна доплата в Gram)"
              cta="Перейти в Портфель"
              onCta={goPortfolioTrade}
            />
          </div>
        ) : (
          <>
            <div className="rd-seclabel" style={{ margin: '18px 2px 10px' }}>Лоты на обмен</div>
            <div className="rd-grid">
              {trades.map(item => (
                <GiftCard
                  key={item.id}
                  item={item}
                  onClick={() => { haptic('light'); navigate(`/trade/${item.id}`) }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
