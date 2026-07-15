import { useEffect, useState } from 'react'
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

export default function App() {
  // Сплэш открытия маркета: React-анимация логотипа ruby (RubyMarketSplash)
  // поверх приложения. Показываем, пока предзагружаются данные вкладок
  // (маркет/обмен/портфель), но не меньше полного интро (3с) — если данные
  // готовы раньше, ждём до 3с; если дольше, лого просто дышит до готовности.
  // Потолок 10с — сплэш не зависает при мёртвой сети.
  // 'visible' → 'fading' (плавное затухание 0.45с) → 'gone' (размонтирован).
  const [splash, setSplash] = useState('visible')
  useEffect(() => {
    // Тёмная подложка первого кадра из index.html больше не нужна — её
    // накрывает React-сплэш; убираем сразу, чтобы не мигала под затуханием.
    const el = document.getElementById('splash')
    if (el) el.remove()

    const startedAt = window.__splashAt || Date.now()
    const MIN_MS = 3000
    let alive = true
    const data = Promise.race([prefetchAll(), new Promise(r => setTimeout(r, 10000))])
    data.then(() => {
      if (!alive) return
      const left = Math.max(0, MIN_MS - (Date.now() - startedAt))
      setTimeout(() => {
        if (!alive) return
        setSplash('fading')
        setTimeout(() => { if (alive) setSplash('gone') }, 450)
      }, left)
    })
    return () => { alive = false }
  }, [])

  return (
    <BrowserRouter>
      {splash !== 'gone' && <RubyMarketSplash background="#1A0910" fading={splash === 'fading'} />}
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
    </BrowserRouter>
  )
}
