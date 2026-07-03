import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'

const RARITY_COLORS = {
  Common: '#8888aa', Rare: '#5e9cf5', Epic: '#a855f7', Legendary: '#d4af37',
}

// Если в ../api/client уже есть общий helper с initData — замени apiCall на него.
const API_BASE = 'https://nftmarketbot-production.up.railway.app'

async function apiCall(path, options = {}) {
  const initData = window.Telegram?.WebApp?.initData || ''
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Ошибка ${res.status}`)
  return data
}

function GiftCard({ gift, onWithdrawn, haptic }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rarityColor = RARITY_COLORS[gift.rarity] || '#8888aa'
  const onChain = Boolean(gift.nft_address)

  const withdraw = async () => {
    const to = address.trim()
    if (!to) { setError('Укажите адрес кошелька'); return }
    setBusy(true)
    setError('')
    try {
      await apiCall(`/api/gifts/${gift.gift_id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ to_address: to }),
      })
      haptic('medium')
      onWithdrawn(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: 'var(--radius-md)',
          background: `${rarityColor}18`,
          border: `1px solid ${rarityColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0, overflow: 'hidden',
        }}>
          {gift.image_url
            ? <img src={gift.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🎁'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
              {gift.gift_name}{gift.gift_number ? ` #${gift.gift_number}` : ''}
            </span>
            <span style={{ fontSize: 10, color: rarityColor, fontWeight: 600 }}>{gift.rarity}</span>
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {onChain ? '⛓ В сейфе GiftSafe' : gift.collection_name || 'Подарок'}
          </div>
        </div>
        {onChain && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '8px 12px', flexShrink: 0 }}
            onClick={() => { haptic('light'); setOpen(!open); setError('') }}
          >
            {open ? 'Скрыть' : 'Вывести'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            NFT уйдёт из сейфа на указанный TON-адрес. Проверьте адрес перед отправкой.
          </div>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Адрес вашего TON-кошелька"
            disabled={busy}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              color: 'inherit', fontSize: 13,
              marginBottom: 8, outline: 'none',
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy}
            onClick={withdraw}
          >
            {busy ? 'Отправляем…' : 'Вывести на кошелёк'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Portfolio() {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [gifts, setGifts] = useState(null) // null = загрузка
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await apiCall('/api/portfolio')
      setGifts(data.gifts || [])
    } catch (e) {
      setError(e.message)
      setGifts([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onWithdrawn = (giftId) => {
    setGifts(prev => prev.filter(g => g.gift_id !== giftId))
  }

  const onChainCount = (gifts || []).filter(g => g.nft_address).length

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          💼 <span style={{ color: 'var(--gold)' }}>Портфель</span>
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          {[
            { label: 'Подарков', value: gifts === null ? '…' : gifts.length },
            { label: 'В сейфе (ончейн)', value: gifts === null ? '…' : onChainCount },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{stat.label}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 15, color: 'var(--gold)',
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {gifts === null ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Загружаем портфель…</div>
        </div>
      ) : gifts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💼</div>
          <div className="empty-title">Портфель пуст</div>
          <div className="empty-desc">
            {error ? `Не удалось загрузить: ${error}` : 'Купите первый подарок на маркете'}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
            Перейти на маркет
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gifts.map(gift => (
            <GiftCard key={gift.gift_id} gift={gift} onWithdrawn={onWithdrawn} haptic={haptic} />
          ))}
        </div>
      )}

      {gifts !== null && gifts.length > 0 && (
        <button
          className="btn btn-ghost btn-full"
          style={{ marginTop: 16 }}
          onClick={() => { haptic('light'); navigate('/sell') }}
        >
          + Выставить на продажу
        </button>
      )}
    </div>
  )
}