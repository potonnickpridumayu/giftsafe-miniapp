import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { IconBuildingStore, IconArrowsExchange, IconBriefcase, IconUser } from '@tabler/icons-react'
import { api } from '../api/client'
import { getIncomingOffers, setIncomingOffers, subscribeOffers } from '../utils/offers'
import { showResult } from './ResultSheet'
import TradeSwapResult from './TradeSwapResult'

// Как часто навбар сам проверяет входящие офферы (вне вкладки Профиль). Реже,
// чем Profile (10 с) — там цена промедления выше; здесь бейдж «есть офферы».
const OFFERS_POLL_MS = 20000

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
  const { haptic, user } = useTelegram()
  const [offerCount, setOfferCount] = useState(getIncomingOffers())

  // Бейдж входящих офферов на «Профиле» виден с любой вкладки. Слушаем общий
  // счётчик (его же обновляет Profile после действий) и сами опрашиваем офферы
  // раз в 20 с, пока приложение открыто. Вне Telegram эндпоинты дают 401 —
  // молча ловим, бейдж остаётся пустым.
  useEffect(() => subscribeOffers(setOfferCount), [])

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      if (document.hidden) return
      try {
        const [trades, listings] = await Promise.all([
          api.getMyTradeOffers(),
          api.getMyListingOffers(),
        ])
        if (!alive) return
        setIncomingOffers((trades?.incoming?.length || 0) + (listings?.incoming?.length || 0))
      } catch { /* не авторизованы или сеть — бейдж не трогаем */ }
    }
    refresh()
    const id = setInterval(refresh, OFFERS_POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Анимация «Обмен принят» для обоих участников: принявший видит её сразу в
  // Профиле, а второй (и любой, у кого приложение было закрыто в момент
  // принятия) — здесь, при заходе и на опросе. Сервер отдаёт непоказанные
  // обмены и тут же помечает их показанными, поэтому повторно не проигрываем.
  useEffect(() => {
    if (!user?.id) return undefined
    let alive = true
    const checkSwaps = async () => {
      if (document.hidden) return
      try {
        const swaps = await api.getUnseenSwaps()
        if (!alive || !swaps?.length) return
        const s = swaps[swaps.length - 1] // самый свежий
        const iAmProposer = s.from_user_id === user.id
        const myName = user.first_name + (user.last_name ? ' ' + user.last_name : '')
        showResult({
          custom: (
            <TradeSwapResult
              leftGifts={iAmProposer ? s.offered_gifts : s.target_gifts}
              rightGifts={iAmProposer ? s.target_gifts : s.offered_gifts}
              leftUser={{ username: user.username, name: myName, photoUrl: user.photo_url, userId: user.id }}
              rightUser={iAmProposer
                ? { username: s.to_username, userId: s.to_user_id }
                : { username: s.from_username, userId: s.from_user_id }}
            />
          ),
          title: 'Обмен принят',
          sub: 'Подарки обменялись местами',
        })
      } catch { /* не авторизованы или сеть — тихо ждём следующего тика */ }
    }
    checkSwaps()
    const id = setInterval(checkSwaps, OFFERS_POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [user?.id])

  return (
    <nav className="rd-nav">
      <div className="rd-nav-inner">
        {tabs.map(({ path, Icon, label }) => {
          const active = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path)
          const badge = path === '/profile' ? offerCount : 0
          return (
            <button
              key={path}
              className={`rd-tab${active ? ' active' : ''}`}
              onClick={() => { haptic('light'); navigate(path) }}
            >
              <Icon size={20} stroke={2} />
              <span className="rd-tab-label">{label}</span>
              {badge > 0 && (
                <span className="rd-tab-badge">{badge > 99 ? '99+' : badge}</span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
