import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api } from '../api/client'
import { TonConnectButton } from '@tonconnect/ui-react';


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

const FEE_RATE = 0.03 // должна совпадать с MARKET_FEE на бэке и Sell.jsx
const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4

function GiftCard({ gift, onWithdrawn, onListed, haptic }) {
  const [panel, setPanel] = useState(null) // null | 'withdraw' | 'sell'
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rarityColor = RARITY_COLORS[gift.rarity] || '#8888aa'
  const onChain = Boolean(gift.nft_address)
  const isTgGift = Boolean(gift.tg_owned_gift_id)
  const canTrade = onChain || isTgGift

  const priceNum = parseFloat(String(price).replace(',', '.')) || 0
  const youGet = round4(priceNum - priceNum * FEE_RATE)

  const togglePanel = (name) => {
    haptic('light')
    setError('')
    setPanel(p => (p === name ? null : name))
  }

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

  const sell = async () => {
    if (!(priceNum > 0)) { setError('Укажите цену в TON больше нуля'); return }
    setBusy(true)
    setError('')
    try {
      await api.createListing({ gift_id: gift.gift_id, price: priceNum, description: '' })
      haptic('medium')
      setBusy(false)
      setPanel(null)
      setPrice('')
      onListed(gift.gift_id)
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
            {onChain ? '⛓ В сейфе GiftSafe' : isTgGift ? '🎁 В Telegram-сейфе' : gift.collection_name || 'Подарок'}
          </div>
        </div>
        {canTrade && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {gift.on_sale ? (
              <span className="badge badge-gold" style={{ fontSize: 11 }}>На продаже</span>
            ) : (
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '8px 12px' }}
                onClick={() => togglePanel('sell')}
              >
                {panel === 'sell' ? 'Скрыть' : 'Продать'}
              </button>
            )}
            {onChain && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '8px 12px' }}
                onClick={() => togglePanel('withdraw')}
              >
                {panel === 'withdraw' ? 'Скрыть' : 'Вывести'}
              </button>
            )}
          </div>
        )}
      </div>

      {panel === 'sell' && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Лот появится на маркете. Комиссия GiftSafe {Math.round(FEE_RATE * 100)}%
            {priceNum > 0 ? ` — вы получите ${youGet} TON` : ''}.
          </div>
          <input
            value={price}
            onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Цена в TON, например 10.5"
            inputMode="decimal"
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
            disabled={busy || !(priceNum > 0)}
            onClick={sell}
          >
            {busy ? 'Выставляем…' : 'Выставить на продажу'}
          </button>
        </div>
      )}

      {panel === 'withdraw' && (
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

  const onListed = () => {
    // лот создан — перезагружаем портфель, чтобы состояние пришло с бэка
    haptic('light')
    load()
  }

  const onChainCount = (gifts || []).filter(g => g.nft_address).length

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 16,
        }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, margin: 0 }}>
            💼 <span style={{ color: 'var(--gold)' }}>Портфель</span>
          </h1>
          <TonConnectButton />
        </div>

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
            <GiftCard key={gift.gift_id} gift={gift} onWithdrawn={onWithdrawn} onListed={onListed} haptic={haptic} />
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