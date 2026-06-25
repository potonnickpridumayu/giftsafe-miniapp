import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { getListings, buyListing } from '../api/client';
import { useToast } from '../hooks/useToast';

const RARITY_EMOJI = { Common: '⬜', Rare: '🔵', Epic: '🟣', Legendary: '🟡' };
const GIFT_EMOJI   = ['🎁', '🧸', '🌹', '🚀', '💍', '❤️', '🎄', '🦋'];

export default function Market({ user }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [buying, setBuying]     = useState(false);
  const { toast, showToast }    = useToast();

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);
    try {
      const data = await getListings();
      setListings(data.listings || []);
    } catch {
      // Demo mode — показываем моковые данные
      setListings(DEMO_LISTINGS);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(listing) {
    WebApp.showConfirm(
      `Купить ${listing.gift_name} за ${listing.price_ton} TON?`,
      async (confirmed) => {
        if (!confirmed) return;
        setBuying(true);
        try {
          await buyListing(listing.listing_id);
          showToast('✅ Покупка успешна!');
          setSelected(null);
          loadListings();
        } catch (e) {
          showToast('❌ ' + (e.response?.data?.error || 'Ошибка покупки'));
        } finally {
          setBuying(false);
        }
      }
    );
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title">🛍 Маркет</span>
        <span className="section-badge">{listings.length} лотов</span>
      </div>

      <div className="fee-badge">🔥 Комиссия всего 3%</div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : listings.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🛍</div>
          <div className="empty-text">Нет активных объявлений</div>
          <div className="empty-sub">Выставь свой подарок первым!</div>
        </div>
      ) : (
        listings.map(lst => (
          <div key={lst.listing_id} className="gift-card" onClick={() => setSelected(lst)}>
            <div className="gift-emoji">
              {GIFT_EMOJI[lst.listing_id % GIFT_EMOJI.length]}
            </div>
            <div className="gift-info">
              <div className="gift-name">{lst.gift_name} #{lst.gift_number || '?'}</div>
              <div className="gift-collection">{lst.collection_name}</div>
              <span className={`gift-rarity rarity-${lst.rarity}`}>
                {RARITY_EMOJI[lst.rarity]} {lst.rarity}
              </span>
            </div>
            <div className="gift-price">
              {lst.price_ton}
              <span>TON</span>
            </div>
          </div>
        ))
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            <div className="modal-title">
              {selected.gift_name} #{selected.gift_number || '?'}
            </div>
            <div style={{ textAlign: 'center', fontSize: 64, margin: '16px 0' }}>
              {GIFT_EMOJI[selected.listing_id % GIFT_EMOJI.length]}
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Коллекция</span>
                <span style={{ fontWeight: 600 }}>{selected.collection_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Редкость</span>
                <span className={`gift-rarity rarity-${selected.rarity}`}>
                  {RARITY_EMOJI[selected.rarity]} {selected.rarity}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Продавец</span>
                <span>@{selected.seller_username || '?'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Просмотров</span>
                <span>{selected.views || 0}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent2)' }}>
                  {selected.price_ton} TON
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Комиссия: {(selected.price_ton * 0.03).toFixed(4)} TON (3%)
                </div>
              </div>
            </div>
            {selected.seller_id !== user?.id && (
              <button
                className="btn btn-primary"
                onClick={() => handleBuy(selected)}
                disabled={buying}
              >
                {buying ? '⏳ Покупка...' : `💳 Купить за ${selected.price_ton} TON`}
              </button>
            )}
            {selected.seller_id === user?.id && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
                Это ваш лот
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const DEMO_LISTINGS = [
  { listing_id: 1, gift_name: 'Teddy Bear', gift_number: '1234', collection_name: 'Bears', rarity: 'Rare', price_ton: 5.5, seller_username: 'user1', views: 42 },
  { listing_id: 2, gift_name: 'Diamond Ring', gift_number: '88', collection_name: 'Jewelry', rarity: 'Legendary', price_ton: 25.0, seller_username: 'user2', views: 128 },
  { listing_id: 3, gift_name: 'Red Rose', gift_number: '555', collection_name: 'Flowers', rarity: 'Common', price_ton: 1.2, seller_username: 'user3', views: 15 },
  { listing_id: 4, gift_name: 'Rocket', gift_number: '9', collection_name: 'Space', rarity: 'Epic', price_ton: 12.0, seller_username: 'user4', views: 77 },
];
