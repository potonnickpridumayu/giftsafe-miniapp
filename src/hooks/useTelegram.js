import { useEffect, useState } from 'react'
import { requestConfirm } from '../components/ConfirmSheet'

const tg = window.Telegram?.WebApp

// В полноэкранном режиме контент рисуется под системным статус-баром и
// плавающими кнопками Telegram — отдаём их высоту в CSS через --tg-top.
function applyInsets() {
  if (!tg) return
  const sa = tg.safeAreaInset || {}
  const ca = tg.contentSafeAreaInset || {}
  const rs = document.documentElement.style
  rs.setProperty('--tg-top', `${(sa.top || 0) + (ca.top || 0)}px`)
  // env(safe-area-inset-bottom) в TG-fullscreen может быть 0 — берём из API
  if ((sa.bottom || 0) > 0) rs.setProperty('--safe-bottom', `${sa.bottom}px`)
}

let fsInitDone = false
function initFullscreen() {
  if (!tg || fsInitDone) return
  fsInitDone = true
  // Как у MRKT: без шапки «ruby» на весь экран — только на телефонах,
  // на десктопном Telegram fullscreen выглядит странно.
  const isMobile = tg.platform === 'android' || tg.platform === 'ios'
  if (isMobile && tg.isVersionAtLeast?.('8.0') && tg.requestFullscreen) {
    try { tg.requestFullscreen() } catch { /* старый клиент — остаёмся как есть */ }
  }
  applyInsets()
  tg.onEvent?.('safeAreaChanged', applyInsets)
  tg.onEvent?.('contentSafeAreaChanged', applyInsets)
  tg.onEvent?.('fullscreenChanged', applyInsets)
}

export function useTelegram() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#0a0a0f')
      tg.setBackgroundColor('#0a0a0f')
      initFullscreen()
      setUser(tg.initDataUnsafe?.user || null)
      setReady(true)
    } else {
      // Dev mode — mock user
      setUser({ id: 123456, first_name: 'Egor', username: 'testuser', photo_url: null })
      setReady(true)
    }
  }, [])

  const showAlert = (msg) => tg?.showAlert(msg)
  // Подтверждения — своя шторка снизу (в стиле приложения), не системный попап
  const showConfirm = (msg, cb) => requestConfirm(msg, cb)
  const haptic = (type = 'light') => tg?.HapticFeedback?.impactOccurred(type)
  const close = () => tg?.close()
  const openLink = (url) => {
    if (!url) return
    if (tg?.openTelegramLink && /t\.me\//i.test(url)) tg.openTelegramLink(url)
    else if (tg?.openLink) tg.openLink(url)
    else window.open(url, '_blank')
  }

  return { tg, user, ready, showAlert, showConfirm, haptic, close, openLink, initData: tg?.initData || '' }
}
