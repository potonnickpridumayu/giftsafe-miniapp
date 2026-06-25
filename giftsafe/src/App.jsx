import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Market from './pages/Market'
import ListingDetail from './pages/ListingDetail'
import Auctions from './pages/Auctions'
import Portfolio from './pages/Portfolio'
import Profile from './pages/Profile'
import Sell from './pages/Sell'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Market />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/auctions" element={<Auctions />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/sell" element={<Sell />} />
      </Routes>
      <NavBar />
    </BrowserRouter>
  )
}
