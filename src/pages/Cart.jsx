import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconTrash, IconShoppingCart } from '@tabler/icons-react'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { fmtGram } from '../utils/format'
import { useCartIds, removeFromCart, pruneCart } from '../utils/cart'
import GramIcon from '../components/GramIcon'
import { LoadingScreen, MiniSpin, BtnShimmer, CheckBadge } from '../components/StatusIcons'
import StateCard, { IlloError } from '../components/MarketStates'
import WarnBanner from '../components/WarnIcon'

function lotPlural(n) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'лот'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'лота'
  return 'лотов'
}

export default function Cart() {
  const navigate = useNavigate()
  const { haptic, showConfirm } = useTelegram()
  const cartIds = useCartIds()

  const [listings, setListings] = useState(null) // все активные лоты маркета
  const [error, setError] = useState(null)
  const [staleCount, setStaleCount] = useState(0)
  const [buying, setBuying] = useState(false)
  const [buyReport, setBuyReport] = useState(null) // { ok: [...names], fail: [{name, reason}] }

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.getListings()
      setListings(data)
      // лоты, которых больше нет на маркете (проданы/сняты) — выкидываем;
      // счётчик накапливаем, чтобы повторная загрузка не стёрла надпись
      const pruned = pruneCart(data.map(l => l.id))
      if (pruned > 0) setStaleCount(prev => prev + pruned)
    } catch (e) {
      setError(e.message || 'Не удалось загрузить корзину')
      setListings([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const items = (listings || []).filter(l => cartIds.includes(l.id))
  const total = items.reduce((s, l) => s + (l.price || 0), 0)

  const buyAll = () => {
    if (items.length === 0) return
    haptic('medium')
    showConfirm(
      `Купить ${items.length} шт. за ${fmtGram(total)} Gram?`,
      async (ok) => {
        if (!ok) return
        setBuying(true)
        setBuyReport(null)
        const report = { ok: [], fail: [] }
        // Покупаем по одному — каждая покупка атомарна на бэке; при нехватке
        // баланса часть купится, остальное останется в корзине с причиной.
        for (const item of items) {
          try {
            await api.buyListing(item.id)
            report.ok.push(item.name)
            removeFromCart(item.id)
          } catch (e) {
            report.fail.push({ name: item.name, reason: e.message || 'не удалось' })
          }
        }
        haptic(report.fail.length ? 'heavy' : 'medium')
        setBuyReport(report)
        setBuying(false)
        load()
      }
    )
  }

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Корзина{items.length > 0 ? ` (${items.length})` : ''}
      </h1>

      {staleCount > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          {staleCount === 1
            ? '1 лот из корзины уже продан или снят'
            : `${staleCount} ${lotPlural(staleCount)} из корзины уже проданы или сняты`}
        </div>
      )}

      {buyReport && (
        <div style={{ marginBottom: 14 }}>
          {/* Тост «Куплено: …» из дизайн-хендоффа status_icons */}
          {buyReport.ok.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '14px 18px', borderRadius: 18, background: '#100d14',
              border: '1px solid #3DDC8444', boxShadow: '0 12px 30px -12px #3DDC8455',
              marginBottom: buyReport.fail.length > 0 ? 8 : 0,
            }}>
              <CheckBadge size={30} />
              <span style={{ fontSize: 15.5, fontWeight: 600, color: '#F5F2F4' }}>
                Куплено: <span style={{ color: '#ffb84d' }}>{buyReport.ok.join(', ')}</span>
              </span>
            </div>
          )}
          {buyReport.fail.map(f => (
            <WarnBanner key={f.name} style={{ marginBottom: 4, fontSize: 13 }}>
              {f.name}: {f.reason}
            </WarnBanner>
          ))}
        </div>
      )}

      {listings === null ? (
        <LoadingScreen text="Загружаем…" />
      ) : error ? (
        <StateCard
          illo={<IlloError />}
          title="Ошибка загрузки"
          sub={error}
          cta="Повторить"
          onCta={() => { haptic('medium'); load() }}
        />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><IconShoppingCart size={44} stroke={1.5} /></div>
          <div className="empty-title">Корзина пуста</div>
          <div className="empty-desc">Добавляйте подарки с маркета кнопкой корзины на карточке</div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { haptic('medium'); navigate('/') }}>
            На маркет
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {items.map(item => (
              <div
                key={item.id}
                className="card"
                onClick={() => { haptic('light'); navigate(`/listing/${item.id}`) }}
                style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {item.image_full || item.image_url
                    ? <img src={item.image_full || item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : item.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}{item.number ? ` ${String(item.number).startsWith('#') ? item.number : `#${item.number}`}` : ''}
                  </div>
                  <div className="money-text" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    {fmtGram(item.price)} <GramIcon size={20} />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); haptic('light'); removeFromCart(item.id) }}
                  aria-label="Убрать из корзины"
                  style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                    background: 'none', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconTrash size={15} stroke={1.8} />
                </button>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Итого</span>
              <span className="price price-md">{fmtGram(total)} <GramIcon size={24} style={{ marginLeft: -1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }} /></span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            disabled={buying}
            onClick={buyAll}
            style={{ fontSize: 15, padding: '14px', boxShadow: buying ? 'none' : 'var(--gold-glow)', gap: 1, position: 'relative', overflow: 'hidden' }}
          >
            {buying ? <><BtnShimmer /><MiniSpin /> <span style={{ marginLeft: 8 }}>Покупаем…</span></> : <>Купить всё за {fmtGram(total)} <GramIcon size={24} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }} /></>}
          </button>
        </>
      )}
    </div>
  )
}
