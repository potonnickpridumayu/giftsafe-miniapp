import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

const RARITY_COLORS = {
  Common: '#8888aa', Rare: '#5e9cf5', Epic: '#a855f7', Legendary: '#d4af37',
}

export default function Portfolio() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const items = MOCK.portfolio

  const totalValue = items.reduce((s, i) => s + i.estimated, 0)
  const totalCost = items.reduce((s, i) => s + i.bought_for, 0)
  const totalPnl = totalValue - totalCost
  const pnlPct = ((totalPnl / totalCost) * 100).toFixed(1)

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          💼 <span style={{ color: 'var(--gold)' }}>Портфель</span>
        </h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
          {[
            { label: 'Стоимость', value: `⭐ ${totalValue}`, sub: null },
            { label: 'Вложено', value: `⭐ ${totalCost}`, sub: null },
            { label: 'P&L', value: `${totalPnl >= 0 ? '+' : ''}⭐ ${totalPnl}`, positive: totalPnl >= 0, sub: `${pnlPct}%` },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{stat.label}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                color: stat.positive !== undefined
                  ? (stat.positive ? 'var(--green)' : 'var(--red)')
                  : 'var(--gold)',
              }}>
                {stat.value}
              </div>
              {stat.sub && (
                <div style={{ fontSize: 10, color: stat.positive ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💼</div>
          <div className="empty-title">Портфель пуст</div>
          <div className="empty-desc">Купите первый подарок на маркете</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
            Перейти на маркет
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const pnl = item.estimated - item.bought_for
            const positive = pnl >= 0
            const rarityColor = RARITY_COLORS[item.rarity] || '#8888aa'

            return (
              <div key={item.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: `${rarityColor}18`,
                  border: `1px solid ${rarityColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  flexShrink: 0,
                }}>
                  {item.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                    <span style={{ fontSize: 10, color: rarityColor, fontWeight: 600 }}>{item.rarity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Куплен за ⭐ {item.bought_for}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="price price-sm" style={{ marginBottom: 2 }}>⭐ {item.estimated}</div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: positive ? 'var(--green)' : 'var(--red)',
                  }}>
                    {positive ? '+' : ''}⭐ {pnl}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {items.length > 0 && (
        <button
          className="btn btn-ghost btn-full"
          style={{ marginTop: 16 }}
          onClick={() => { haptic('light'); navigate('/sell') }}
        >
          + Выставить на продажу
        </button>
      )}
    </div>
  )
}
