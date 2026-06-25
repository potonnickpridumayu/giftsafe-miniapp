import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import Market from './pages/Market';
import Auctions from './pages/Auctions';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import './App.css';

const TABS = [
  { id: 'market',    label: 'Маркет',    icon: '🛍' },
  { id: 'auctions',  label: 'Аукционы',  icon: '🔨' },
  { id: 'portfolio', label: 'Портфолио', icon: '💼' },
  { id: 'profile',   label: 'Профиль',   icon: '👤' },
];

export default function App() {
  const [tab, setTab] = useState('market');
  const [user, setUser] = useState(null);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    if (WebApp.initDataUnsafe?.user) {
      setUser(WebApp.initDataUnsafe.user);
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span className="logo-icon">🎁</span>
          <span className="logo-text">GiftSafe</span>
        </div>
        {user && (
          <div className="header-user">
            {user.first_name}
          </div>
        )}
      </header>

      <main className="main">
        {tab === 'market'    && <Market user={user} />}
        {tab === 'auctions'  && <Auctions user={user} />}
        {tab === 'portfolio' && <Portfolio user={user} />}
        {tab === 'profile'   && <Profile user={user} />}
      </main>

      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}