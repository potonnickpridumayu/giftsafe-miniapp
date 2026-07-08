import { useLocation, useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { IconBuildingStore, IconArrowsExchange, IconBriefcase, IconUser } from '@tabler/icons-react'

// Иконки как в утверждённом макете (Tabler outline). Активная — розовая
// с неоновым свечением через drop-shadow (не box-shadow: он квадратный).
const tabs = [
  { path: '/', Icon: IconBuildingStore, label: 'Маркет' },
  { path: '/trade', Icon: IconArrowsExchange, label: 'Обмен' },
  { path: '/portfolio', Icon: IconBriefcase, label: 'Портфель' },
  { path: '/profile', Icon: IconUser, label: 'Профиль' },
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
      background: 'rgba(12, 7, 16, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(({ path, Icon, label }) => {
        const active = path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => { haptic('light'); navigate(path) }}
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
              padding: '6px 0',
            }}
          >
            <Icon
              size={23}
              stroke={1.8}
              style={{
                color: active ? 'var(--gold)' : 'var(--text-muted)',
                filter: active ? 'drop-shadow(0 0 4px rgba(255, 45, 85, 0.55)) drop-shadow(0 0 14px rgba(255, 45, 85, 0.35))' : 'none',
                transition: 'color 0.2s, filter 0.2s',
              }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: active ? 'var(--gold-light)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
