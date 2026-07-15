import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { prefetchAll } from './utils/dataCache'
import NavBar from './components/NavBar'
import ConfirmSheet from './components/ConfirmSheet'
import RubyMarketSplash from './components/RubyMarketSplash'
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

export default function App() {
  // Сплэш открытия маркета: React-анимация логотипа ruby (RubyMarketSplash)
  // поверх приложения. Держим, пока предзагружаются данные вкладок
  // (маркет/обмен/портфель), но не меньше одного полного прогона: если данные
  // готовы раньше — ждём его конца, если позже — анимация идёт по кругу и мы
  // обрываем её сразу по готовности, посреди любого кадра.
  // 'visible' → 'fading' (плавное затухание 0.45с) → 'gone' (размонтирован).
  const [splash, setSplash] = useState('visible')
  // Момент, когда анимация РЕАЛЬНО пошла (ассеты сплэша готовы), а не когда
  // смонтировался компонент: от него отсчитываем полный первый прогон.
  const [animStart, setAnimStart] = useState(null)
  const dataRef = useRef(null)

  useEffect(() => {
    // Тёмная подложка первого кадра из index.html больше не нужна — её
    // накрывает React-сплэш; убираем сразу, чтобы не мигала под затуханием.
    const el = document.getElementById('splash')
    if (el) el.remove()
    // Загрузку начинаем сразу, не дожидаясь старта анимации.
    dataRef.current = Promise.race([
      prefetchAll(),
      new Promise(r => setTimeout(r, SPLASH_CAP_MS)),
    ])
  }, [])

  useEffect(() => {
    if (animStart == null) return undefined
    let alive = true
    dataRef.current.then(() => {
      if (!alive) return
      const left = Math.max(0, SPLASH_MIN_MS - (Date.now() - animStart))
      setTimeout(() => {
        if (!alive) return
        setSplash('fading')
        setTimeout(() => { if (alive) setSplash('gone') }, 450)
      }, left)
    })
    return () => { alive = false }
  }, [animStart])

  // Контент НЕ монтируем под сплэшем: карточки маркета поднимают lottie-рендер
  // стикеров, и он отъедает тот же главный поток, на котором рисуется анимация
  // (получались рывки). Монтируем в момент начала затухания — оно сделано
  // CSS-transition'ом по opacity, живёт на композиторе и не страдает от того,
  // что главный поток занят маунтом. Данные к этому моменту уже в кэше.
  return (
    <BrowserRouter>
      {splash !== 'gone' && (
        <RubyMarketSplash
          background="#1A0910"
          fading={splash === 'fading'}
          onReady={() => setAnimStart(Date.now())}
        />
      )}
      {splash !== 'visible' && (
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
        </>
      )}
    </BrowserRouter>
  )
}
