import { useState, useEffect } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { api } from '../api/client'

export default function Profile() {
  const { user, haptic } = useTelegram()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    api.getProfile()
      .then(res => { if (alive) setProfile(res) })
      .catch(e => { if (alive) setError(e.message || 'Ошибка загрузки') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const dbUser = profile?.user || null
  const txs = profile?.transactions || []
  const balance = dbUser?.balance_ton ?? 0
  const earned = dbUser?.total_earned ?? 0
  const spent = dbUser?.total_spent ?? 0

  const name = user ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : 'Гость'
  const username = user?.username ? '@' + user.username : 'без username'

  // Реальные метрики из БД (total_earned / total_spent обновляются при каждой сделке)
  const stats = [
    { label: 'Сделок', value: loading ? '…' : String(txs.length) },
    { label: 'Заработано', value: loading ? '…' : earned.toFixed(1) },
    { label: 'Потрачено', value: loading ? '…' : spent.toFixed(1) },
  ]

  return (
    <div className="page">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        👤 <span style={{ color: 'var(--gold)' }}>Профиль</span>
      </h1>

      {/* User card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 20,
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--gold)' }}
          />
        ) : (
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold-dim), var(--bg-card))',
            border: '2px solid var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}>
            {name[0]}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{username}</div>
        </div>
        <div className="badge badge-gold">✓ Верифицирован через Telegram</div>
      </div>

      {/* Balance */}
      <div style={{
        background: 'linear-gradient(135deg, var(--gold-dim), var(--bg-card))',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 'var(--radius-xl)',
        padding: 20,
        marginBottom: 16,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5 }}>
          БАЛАНС
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: 'var(--gold)' }}>
          {loading ? '…' : `${balance.toFixed(2)} TON`}
        </div>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--danger, #e5484d)', marginTop: 6 }}>{error}</div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--gold)', marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      {[
        { icon: '🔗', label: 'Реферальная ссылка', sub: 'Заработайте с каждой продажи' },
        { icon: '📊', label: 'История сделок', sub: `${txs.length} завершённых транзакций` },
        { icon: '⚙️', label: 'Настройки', sub: 'Уведомления и безопасность' },
        { icon: '❓', label: 'Поддержка', sub: 'Написать в @GiftSafe_support' },
      ].map((item, i) => (
        <div
          key={i}
          className="card"
          style={{ padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => haptic('light')}
        >
          <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>›</span>
        </div>
      ))}

      {/* Fee info */}
      <div style={{
        marginTop: 20,
        padding: '14px 16px',
        background: 'var(--gold-dim)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>
          💰 Наши комиссии
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          • Маркет: 3% (ниже, чем у конкурентов)<br/>
          • Аукцион: 3% с победителя<br/>
          • Вывод: без комиссии
        </div>
      </div>
    </div>
  )
}
