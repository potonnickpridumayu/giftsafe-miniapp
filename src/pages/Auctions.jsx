import { useState, useEffect } from 'react'
import { MOCK } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

function Countdown({ endsAt }) {
  const [left, setLeft] = useState(endsAt - Date.now())
  useEffect(() => {
    const t = setInterval(() => setLeft(endsAt - Date.now()), 1000)
    return () => clearInterval(t)
  }, [endsAt])

  if (left <= 0) return <span style={{ color: 'var(--red)' }}>Завершён</span>
  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const s = Math.floor((left % 60000) / 1000)
  const urgent = left < 3600000

  return (
    <span style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      color: urgent ? 'var(--red)' : 'var(--gold)',
      fontSize: 13,
    }}>
      {h > 0 ? `${h}ч ` : ''}{m}м {s}с
    </span>
  )
}

export default function Auctions() {
  const { haptic, showConfirm } = useTelegram()
  const [bidding, setBidding] = useState(null)
  const [bids, setBids] = useState({})

  const handleBid = (auction) => {
    haptic('medium')
    showConfirm(
      `Поставить ставку ⭐ ${auction.min_bid} на «${auction.name}»?`,
      (ok) => {
        if (!ok) return
        setBidding(auction.id)
        setTimeout(() => {
          setBidding(null)
          setBids(prev => ({ ...prev, [auction.id]: auction.min_bid }))
        }, 1000)
      }
    )
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          ⚡ <span style={{ color: 'var(--gold)' }}>Аукционы</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Ставки в реальном времени · Без накруток
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK.auctions.map(auction => {
          const myBid = bids[auction.id]
          const winning = myBid && myBid >= auction.min_bid

          return (
            <div key={auction.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                {/* Emoji */}
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gold-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  flexShrink: 0,
                }}>
                  {auction.emoji}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>
                      {auction.name}
                    </span>
                    <span className="badge badge-gold">{auction.rarity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {auction.bids_count} ставок · лидер: @{auction.top_bidder}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Осталось:</span>
                    <Countdown endsAt={auction.ends_at} />
                  </div>
                </div>
              </div>

              <div className="divider" style={{ margin: '0 0 12px' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Текущая ставка</div>
                  <div className="price price-md">⭐ {auction.current_bid}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {winning ? (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 2 }}>✓ Ваша ставка</div>
                      <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>⭐ {myBid}</div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleBid(auction)}
                      disabled={bidding === auction.id}
                      style={{ boxShadow: 'var(--gold-glow)' }}
                    >
                      {bidding === auction.id ? '⏳' : `Ставить ⭐ ${auction.min_bid}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ margin: '24px 0', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          💡 <strong style={{ color: 'var(--text-secondary)' }}>Как работают аукционы:</strong> ставки проходят через эскроу. Если вас перебьют — звёзды возвращаются автоматически.
        </div>
      </div>
    </div>
  )
}
