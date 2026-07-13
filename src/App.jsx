import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { prefetchAll } from './utils/dataCache'
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
  // Прячем сплэш из index.html, когда смонтировался React И предзагрузились
  // данные вкладок (маркет/обмен/портфель) — вкладки открываются сразу с
  // контентом. Минимум 600мс показа (не мигает), максимум ждём данные 2.5с
  // (сплэш никогда не зависает — при медленной сети догрузится уже внутри).
  useEffect(() => {
    const el = document.getElementById('splash')
    if (!el) return
    const shownFor = Date.now() - (window.__splashAt || Date.now())
    const minShow = new Promise(r => setTimeout(r, Math.max(0, 600 - shownFor)))
    const data = Promise.race([prefetchAll(), new Promise(r => setTimeout(r, 2500))])
    let gone = false
    Promise.all([minShow, data]).then(() => {
      if (gone) return
      el.classList.add('hide')
      setTimeout(() => el.remove(), 400)
    })
    return () => { gone = true }
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
