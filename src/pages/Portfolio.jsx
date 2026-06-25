import React, { useState, useEffect } from 'react';
import { getPortfolio, getTransactions } from '../api/client';

const RARITY_EMOJI = { Common: '⬜', Rare: '🔵', Epic: '🟣', Legendary: '🟡' };
const GIFT_EMOJI   = ['🎁', '🧸', '🌹', '🚀', '💍', '❤️', '🎄', '🦋'];

export default function Portfolio({ user }) {
  const [gifts, setGifts]   = useState([]);
  const [txs, setTxs]       = useState([]);
  const [tab, setTab]       = useState('gifts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPortfolio().catch(() => ({ gifts: DEMO_GIFTS })),
      getTransactions().catch(() => ({ transactions: DEMO_TXS })),
    ]).then(([p, t]) => {
      setGifts(p.gifts || []);
      setTxs(t.transactions || []);
      setLoading(false);
    });
  }, []);

  const rarityCount = gifts.reduce((acc, g) => {
    acc[g.rarity] = (acc[g.rarity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="section-header">
        <span className="section-title">💼 Портфолио</span>
        <span className="section-badge">{gifts.length} подарков</span>
      </div>

      {/* Rarity stats */}
      {gifts.length > 0 && (
        <div className="stats-row" style={{ gridTemplateColumns: `repeat(${Object.keys(rarityCount).length}, 1fr)` }}>
          {Object.entries(rarityCount).map(([rarity, count]) => (
            <div key={rarity} className="stat-card">
              <div className="stat-value">{count}</div>
              <div className="stat-label">{RARITY_EMOJI[rarity]} {rarity}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className={`btn btn-sm ${tab === 'gifts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('gifts')}
        >
          🎁 Подарки
        </button>
        <button
          className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('history')}
        >
          📜 История
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : tab === 'gifts' ? (
        gifts.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💼</div>
            <div className="empty-text">Портфолио пусто</div>
            <div className="empty-sub">Купи подарки на маркете</div>
          </div>
        ) : (
          gifts.map(g => (
            <div key={g.gift_id} className="gift-card">
              <div className="gift-emoji">
                {GIFT_EMOJI[g.gift_id % GIFT_EMOJI.length]}
              </div>
              <div className="gift-info">
                <div className="gift-name">{g.gift_name} #{g.gift_number || '?'}</div>
                <div className="gift-collection">{g.collection_name}</div>
                <span className={`gift-rarity rarity-${g.rarity}`}>
                  {RARITY_EMOJI[g.rarity]} {g.rarity}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {g.acquired_at?.slice(0, 10)}
                </div>
              </div>
            </div>
          ))
        )
      ) : (
        txs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📜</div>
            <div className="empty-text">История пуста</div>
          </div>
        ) : (
          txs.map(tx => (
            <div key={tx.tx_id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {tx.buyer_id === user?.id ? '🛍 Покупка' : '💰 Продажа'} — {tx.gift_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {tx.completed_at?.slice(0, 10)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: 700,
                    color: tx.buyer_id === user?.id ? 'var(--red)' : 'var(--green)'
                  }}>
                    {tx.buyer_id === user?.id ? '-' : '+'}{tx.amount_ton} TON
                  </div>
                </div>
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}

const DEMO_GIFTS = [
  { gift_id: 1, gift_name: 'Teddy Bear', gift_number: '1234', collection_name: 'Bears', rarity: 'Rare', acquired_at: '2026-06-01' },
  { gift_id: 2, gift_name: 'Diamond Ring', gift_number: '88', collection_name: 'Jewelry', rarity: 'Legendary', acquired_at: '2026-06-10' },
];

const DEMO_TXS = [
  { tx_id: 1, gift_name: 'Red Rose', amount_ton: 1.2, buyer_id: 999, completed_at: '2026-06-05' },
  { tx_id: 2, gift_name: 'Rocket', amount_ton: 12.0, buyer_id: 123, completed_at: '2026-06-08' },
];
