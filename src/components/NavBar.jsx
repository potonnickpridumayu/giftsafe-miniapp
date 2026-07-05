import { useLocation, useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'

const ICONS = {
  market: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  auction: (
    <>
      <path d="M13 2L4.5 12.5H11L10 22l8.5-10.5H12L13 2z" />
    </>
  ),
  portfolio: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ),
}

const tabs = [
  { path: '/', icon: 'market', label: 'Маркет' },
  { path: '/auctions', icon: 'auction', label: 'Аукцион' },
  { path: '/portfolio', icon: 'portfolio', label: 'Портфель' },
  { path: '/profile', icon: 'profile', label: 'Профиль' },
]

function TabIcon({ name, active }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#fff' : 'var(--text-muted)'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'stroke 0.2s' }}
    >
      {ICONS[name]}
    </svg>
  )
}

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
      background: 'rgba(16, 11, 20, 0.95)',
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
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 28,
              borderRadius: 999,
              background: active
                ? 'linear-gradient(135deg, var(--gold), var(--gold-deep))'
                : 'transparent',
              boxShadow: active ? 'var(--gold-glow)' : 'none',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}>
              <TabIcon name={tab.icon} active={active} />
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: active ? 'var(--gold-light)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}