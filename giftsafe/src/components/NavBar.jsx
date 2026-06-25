import { useLocation, useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'

const tabs = [
  { path: '/', icon: '🏪', label: 'Маркет' },
  { path: '/auctions', icon: '⚡', label: 'Аукцион' },
  { path: '/portfolio', icon: '💼', label: 'Портфель' },
  { path: '/profile', icon: '👤', label: 'Профиль' },
]

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => {
        const active = tab.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(tab.path)
        return (
          <button
            key={tab.path}
            onClick={() => { haptic('light'); navigate(tab.path) }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{
              fontSize: 20,
              filter: active ? 'none' : 'grayscale(0.6) opacity(0.5)',
              transition: 'filter 0.2s',
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: active ? 'var(--gold)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
            {active && (
              <span style={{
                position: 'absolute',
                bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) - 2px)',
                width: 20,
                height: 2,
                background: 'var(--gold)',
                borderRadius: 1,
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
