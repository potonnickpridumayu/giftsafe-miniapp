import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { prefetchAll } from './utils/dataCache'
import { api } from './api/client'
import MaintenanceScreen from './components/MaintenanceScreen'
import NavBar from './components/NavBar'
import ConfirmSheet from './components/ConfirmSheet'
import ResultSheet from './components/ResultSheet'
import Market from './pages/Market'
import ListingDetail from './pages/ListingDetail'
import Trade from './pages/Trade'
import TradeDetail from './pages/TradeDetail'
import Portfolio from './pages/Portfolio'
import Profile from './pages/Profile'
import Sell from './pages/Sell'
import Referral from './pages/Referral'
import Cart from './pages/Cart'
import MarketHistory from './pages/MarketHistory'

// Минимум показа сплэша — один полный прогон анимации.
const SPLASH_MIN_MS = 3000
// Страховка от мёртвой сети. Не «сколько показывать», а «когда сдаться»:
// в норме данные готовы за секунду-две и сюда никогда не доходит. Потолок
// большой намеренно — на медленной сети мы лучше покрутим анимацию лишний
// круг, чем пустим на маркет с недогруженной графикой подарков.
const SPLASH_CAP_MS = 30000

// Отладочный рубильник: ?maintenance=1 показывает экран техработ без падения
// серверов — проверить анимацию можно в любой момент.
const FORCED_MAINTENANCE = new URLSearchParams(window.location.search).has('maintenance')

// Как часто проверяем, ожил ли сервер, пока показываем экран техработ
const MAINTENANCE_RETRY_MS = 15000

export default function App() {
  // Сплэшем рулит splash-boot.js (window.rubySplash): он стартует до этого
  // бандла и сам рисует анимацию. Здесь только решаем, КОГДА его погасить —
  // когда предзагрузились данные вкладок (маркет/обмен/портфель), но не раньше
  // конца первого полного прогона. Если данные подъехали позже, анимация всё
  // это время идёт по кругу и мы обрываем её посреди любого кадра.
  // Пока сплэш виден, контент НЕ монтируем: карточки поднимают lottie-рендер
  // стикеров, а он отъедает тот же главный поток, на котором идёт анимация
  // (получались рывки). Монтируем в момент начала затухания — оно CSS-ное, по
  // opacity, живёт на композиторе и от занятого потока не страдает. Данные к
  // этому моменту уже в кэше.
  const [showContent, setShowContent] = useState(() => !window.rubySplash)
  const [maintenance, setMaintenance] = useState(FORCED_MAINTENANCE)

  useEffect(() => {
    const splash = window.rubySplash
    const data = Promise.race([
      prefetchAll(),
      new Promise(r => setTimeout(r, SPLASH_CAP_MS)),
    ])

    // Техработы/сервера лежат: маркет И обмен (оба публичные, без авторизации)
    // упали сетевой ошибкой или 5xx. Портфель не смотрим — вне Telegram он
    // всегда 401, это не признак падения. Лишних запросов нет: читаем исход
    // тех же запросов, которые prefetchAll и так делает под сплэшем.
    let alive = true
    prefetchAll().then((results) => {
      if (!alive) return
      const [listings, trades] = results
      const down = [listings, trades].every(
        (r) => r.status === 'rejected' && (r.reason?.network || r.reason?.status >= 500)
      )
      if (down) setMaintenance(true)
    })

    if (!splash) return () => { alive = false } // сплэш не поднялся — просто показываем app

    Promise.all([splash.ready, data]).then(() => {
      if (!alive) return
      const left = Math.max(0, SPLASH_MIN_MS - (Date.now() - splash.startedAt))
      setTimeout(() => {
        if (!alive) return
        splash.finish()      // запускает затухание, потом сам удалит узел
        setShowContent(true) // контент встаёт под затухающим сплэшем
      }, left)
    })
    return () => { alive = false }
  }, [])

  // Пока висит экран техработ — раз в 15 секунд проверяем, ожил ли сервер.
  // Ожил — полная перезагрузка: свежий бут со сплэшем и предзагрузкой, никаких
  // полуживых кэшей. При принудительном ?maintenance=1 не проверяем, иначе
  // живой сервер немедленно уводил бы страницу в вечный цикл перезагрузок.
  useEffect(() => {
    if (!maintenance || FORCED_MAINTENANCE) return undefined
    const id = setInterval(async () => {
      try {
        await api.getListings()
        window.location.reload()
      } catch { /* всё ещё лежит — ждём следующего тика */ }
    }, MAINTENANCE_RETRY_MS)
    return () => clearInterval(id)
  }, [maintenance])

  // Экран техработ перекрывает всё: поверх него ничего интерактивного.
  // Как и контент, монтируется не раньше начала затухания сплэша (showContent):
  // его rAF-рендер живёт на том же главном потоке, что и анимация сплэша, —
  // ранний монтаж дал бы те же рывки, что мы уже чинили в C-9.
  if (maintenance) return showContent ? <MaintenanceScreen /> : null

  return (
    <BrowserRouter>
      {showContent && (
        <>
          <Routes>
            <Route path="/" element={<Market />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/trade/:id" element={<TradeDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/referral" element={<Referral />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/history" element={<MarketHistory />} />
          </Routes>
          <NavBar />
          <ConfirmSheet />
          <ResultSheet />
        </>
      )}
    </BrowserRouter>
  )
}
