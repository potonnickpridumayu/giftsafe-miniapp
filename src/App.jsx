import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Market from './pages/Market'
import ListingDetail from './pages/ListingDetail'
import Trade from './pages/Trade'
import TradeDetail from './pages/TradeDetail'
import Portfolio from './pages/Portfolio'
import Profile from './pages/Profile'
import Sell from './pages/Sell'
import Referral from './pages/Referral'
import Cart from './pages/Cart'

export default function App() {
  // Прячем сплэш из index.html, когда React смонтировался.
  // Минимум 600мс показа — чтобы при быстрой загрузке он не мигал.
  useEffect(() => {
    const el = document.getElementById('splash')
    if (!el) return
    const shownFor = Date.now() - (window.__splashAt || Date.now())
    const t = setTimeout(() => {
      el.classList.add('hide')
      setTimeout(() => el.remove(), 400)
    }, Math.max(0, 600 - shownFor))
    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter>
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
      </Routes>
      <NavBar />
    </BrowserRouter>
  )
}
