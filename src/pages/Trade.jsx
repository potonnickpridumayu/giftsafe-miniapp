import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconHistory } from '@tabler/icons-react'
import AppHeader from '../components/AppHeader'
import EmptyState, { IlloSwap } from '../components/EmptyState'
import { LoadingScreen } from '../components/StatusIcons'
import StateCard, { IlloError } from '../components/MarketStates'
import { api, fragmentImage, giftAccentColor } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { getCached, setCached } from '../utils/dataCache'

function giftWord(n) {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return 'подарков'
  if (b === 1) return 'подарок'
  if (b >= 2 && b <= 4) return 'подарка'
  return 'подарков'
}

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

  const lotRow = (item) => {
    const rarityColor = giftAccentColor(item.gift_id ?? item.id)
    const img = item.image_full || item.image_url || fragmentImage(item.name, item.number, item.nft_address)
    const numLabel = item.giftCount > 1
      ? `${item.giftCount} ${giftWord(item.giftCount)}`
      : (item.number ? (String(item.number).startsWith('#') ? item.number : `#${item.number}`) : 'Лот')
    return (
      <div key={item.id} className="rd-lot" onClick={() => { haptic('light'); navigate(`/trade/${item.id}`) }}>
        <div className="rd-lot-art" style={{ background: `radial-gradient(circle at 40% 30%, ${rarityColor}66, ${rarityColor}22 75%)` }}>
          <span className="rd-lot-dot" />
          {img ? <img src={img} alt="" /> : (item.emoji || '🎁')}
        </div>
        <div className="rd-lot-main">
          <div className="rd-lot-name">{item.name || `${item.giftCount} ${giftWord(item.giftCount)}`}</div>
          <div className="rd-lot-sub">{numLabel} · в обмене</div>
        </div>
        <button
          className="rd-lot-btn"
          onClick={(e) => { e.stopPropagation(); haptic('light'); navigate(`/trade/${item.id}`) }}
        >
          Открыть
        </button>
      </div>
    )
  }

  return (
    <div className="rd-page">
      <AppHeader title="Обмен">
        <span className="rd-chip">{trades.length} в обмене</span>
        <button className="rd-iconbtn" onClick={() => { haptic('light'); navigate('/history') }} aria-label="Активность">
          <IconHistory size={18} stroke={1.9} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trades.map(lotRow)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
