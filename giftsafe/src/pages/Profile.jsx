import { useTelegram } from '../hooks/useTelegram'

const STATS = [
  { label: 'Сделок', value: '12' },
  { label: 'Продано', value: '5' },
  { label: 'Рейтинг', value: '4.9 ⭐' },
]

export default function Profile() {
  const { user, haptic } = useTelegram()

  const name = user ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : 'Гость'
  const username = user?.username ? '@' + user.username : 'без username'

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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {STATS.map(s => (
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
        { icon: '📊', label: 'История сделок', sub: '12 завершённых транзакций' },
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
          • Маркет: 2.5% (vs 5% у конкурентов)<br/>
          • Аукцион: 2% победитель<br/>
          • Вывод: без комиссии
        </div>
      </div>
    </div>
  )
}
