import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { getProfile, getRefLink } from '../api/client';
import { useToast } from '../hooks/useToast';

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [refLink, setRefLink] = useState('');
  const { toast, showToast }  = useToast();

  useEffect(() => {
    getProfile().catch(() => ({ ...DEMO_PROFILE })).then(setProfile);
    getRefLink().catch(() => ({ link: `https://t.me/mrkt_helping_service_bot?start=ref_demo` }))
      .then(d => setRefLink(d.link));
  }, []);

  function copyRef() {
    navigator.clipboard.writeText(refLink).then(() => {
      showToast('✅ Ссылка скопирована!');
    });
  }

  function shareRef() {
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к GiftSafe — честный NFT-маркет без казино! 🎁')}`);
  }

  if (!profile) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="section-header">
        <span className="section-title">👤 Профиль</span>
      </div>

      {/* User card */}
      <div className="card" style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>
          {user?.photo_url
            ? <img src={user.photo_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
            : '👤'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {user?.first_name} {user?.last_name || ''}
        </div>
        {user?.username && (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>@{user.username}</div>
        )}
      </div>

      {/* Balance */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Баланс</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent2)', marginBottom: 12 }}>
          {profile.balance_ton?.toFixed(4)} TON
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 15 }}>{profile.total_spent?.toFixed(2)}</div>
            <div className="stat-label">Потрачено TON</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 15, color: 'var(--green)' }}>{profile.total_earned?.toFixed(2)}</div>
            <div className="stat-label">Заработано TON</div>
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">👥 Реферальная программа</div>
        <div className="card-sub">Получай 1% с каждой продажи рефералов навсегда</div>

        <div className="stats-row" style={{ marginBottom: 12 }}>
          <div className="stat-card">
            <div className="stat-value">{profile.ref_count || 0}</div>
            <div className="stat-label">Рефералов</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)', fontSize: 15 }}>
              {profile.ref_earned?.toFixed(2) || '0.00'}
            </div>
            <div className="stat-label">Заработано TON</div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-input)',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 12,
          color: 'var(--text-muted)',
          wordBreak: 'break-all',
          marginBottom: 10,
          fontFamily: 'monospace',
        }}>
          {refLink || 'Загрузка...'}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={copyRef}>
            📋 Копировать
          </button>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={shareRef}>
            📤 Поделиться
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-title">ℹ️ О платформе</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          GiftSafe — честный маркетплейс для торговли Telegram NFT-подарками.<br />
          ✅ Комиссия 3%<br />
          ✅ Без казино и обмана<br />
          ✅ Аукционы и фиксированная цена
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const DEMO_PROFILE = {
  balance_ton: 12.5,
  total_spent: 45.2,
  total_earned: 57.7,
  ref_count: 3,
  ref_earned: 0.57,
};
