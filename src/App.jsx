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
