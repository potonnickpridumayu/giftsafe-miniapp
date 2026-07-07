import { useEffect, useState } from 'react'

const tg = window.Telegram?.WebApp

export function useTelegram() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#0a0a0f')
      tg.setBackgroundColor('#0a0a0f')
      setUser(tg.initDataUnsafe?.user || null)
      setReady(true)
    } else {
      // Dev mode — mock user
      setUser({ id: 123456, first_name: 'Egor', username: 'testuser', photo_url: null })
      setReady(true)
    }
  }, [])

  const showAlert = (msg) => tg?.showAlert(msg)
  const showConfirm = (msg, cb) => tg ? tg.showConfirm(msg, cb) : cb(window.confirm(msg))
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
