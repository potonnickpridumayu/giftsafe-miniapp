import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { getAuctions, placeBid, buyoutAuction } from '../api/client';
import { useToast } from '../hooks/useToast';

const RARITY_EMOJI = { Common: '⬜', Rare: '🔵', Epic: '🟣', Legendary: '🟡' };
const GIFT_EMOJI   = ['🎁', '🧸', '🌹', '🚀', '💍', '❤️', '🎄', '🦋'];

function timeLeft(endsAt) {
  const diff = new Date(endsAt) - new Date();
  if (diff <= 0) return '⌛ Завершён';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}ч ${m}м`;
}

export default function Auctions({ user }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const { toast, showToast }    = useToast();

  useEffect(() => { loadAuctions(); }, []);

  async function loadAuctions() {
    setLoading(true);
    try {
      const data = await getAuctions();
      setAuctions(data.auctions || []);
    } catch {
      setAuctions(DEMO_AUCTIONS);
    } finally {
      setLoading(false);
    }
  }

  async function handleBid() {
    const amount = parseFloat(bidAmount);
    const minBid = selected.current_price + selected.min_step;
    if (!amount || amount < minBid) {
      showToast(`❌ Минимальная ставка: ${minBid} TON`);
      return;
    }
    try {
      await placeBid(selected.auction_id, amount);
      showToast('✅ Ставка принята!');
      setBidAmount('');
      setSelected(null);
      loadAuctions();
    } catch (e) {
      showToast('❌ ' + (e.response?.data?.error || 'Ошибка'));
    }
  }

  async function handleBuyout() {
    WebApp.showConfirm(
      `Купить за ${selected.buyout_price} TON?`,
      async (confirmed) => {
        if (!confirmed) return;
        try {
          await buyoutAuction(selected.auction_id);
          showToast('🎉 Куплено!');
          setSelected(null);
          loadAuctions();
        } catch (e) {
          showToast('❌ ' + (e.response?.data?.error || 'Ошибка'));
        }
      }
    );
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title">🔨 Аукционы</span>
        <span className="section-badge">{auctions.length} активных</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : auctions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔨</div>
          <div className="empty-text">Нет активных аукционов</div>
        </div>
      ) : (
        auctions.map(a => (
          <div key={a.auction_id} className="gift-card" onClick={() => { setSelected(a); setBidAmount(''); }}>
            <div className="gift-emoji">
              {GIFT_EMOJI[a.auction_id % GIFT_EMOJI.length]}
            </div>
            <div className="gift-info">
              <div className="gift-name">{a.gift_name} #{a.gift_number || '?'}</div>
              <div className="gift-collection">{a.collection_name}</div>
              <span className="timer">⏰ {timeLeft(a.ends_at)}</span>
            </div>
            <div className="gift-price">
              {a.current_price}
              <span>TON</span>
            </div>
          </div>
        ))
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            <div className="modal-title">{selected.gift_name} #{selected.gift_number || '?'}</div>
            <div style={{ textAlign: 'center', fontSize: 64, margin: '12px 0' }}>
              {GIFT_EMOJI[selected.auction_id % GIFT_EMOJI.length]}
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Текущая ставка</span>
                <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{selected.current_price} TON</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Мин. шаг</span>
                <span>{selected.min_step} TON</span>
              </div>
              {selected.buyout_price && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Buyout</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{selected.buyout_price} TON</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>До конца</span>
                <span className="timer">{timeLeft(selected.ends_at)}</span>
              </div>
            </div>

            {selected.seller_id !== user?.id && (
              <>
                <div className="input-group">
                  <label className="input-label">Ваша ставка (TON)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    min={selected.current_price + selected.min_step}
                    placeholder={`Минимум ${(selected.current_price + selected.min_step).toFixed(2)}`}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" style={{ marginBottom: 8 }} onClick={handleBid}>
                  ⬆ Сделать ставку
                </button>
                {selected.buyout_price && (
                  <button className="btn btn-secondary" onClick={handleBuyout}>
                    ⚡ Купить сразу за {selected.buyout_price} TON
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const DEMO_AUCTIONS = [
  { auction_id: 1, gift_name: 'Teddy Bear', gift_number: '777', collection_name: 'Bears', rarity: 'Epic', current_price: 8.5, min_step: 0.5, buyout_price: 20.0, ends_at: new Date(Date.now() + 3600000 * 5).toISOString() },
  { auction_id: 2, gift_name: 'Christmas Tree', gift_number: '33', collection_name: 'Holiday', rarity: 'Rare', current_price: 3.0, min_step: 0.2, buyout_price: null, ends_at: new Date(Date.now() + 3600000 * 12).toISOString() },
];
