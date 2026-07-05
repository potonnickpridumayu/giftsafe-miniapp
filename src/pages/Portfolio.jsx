import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api } from '../api/client'
import { TonConnectButton } from '@tonconnect/ui-react';
import TgGiftSticker from '../components/TgGiftSticker'


const RARITY_COLORS = {
  Common: '#a390a0', Rare: '#7f9df5', Epic: '#c084f0', Legendary: '#f0b47e',
}

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

const FEE_RATE = 0.03
const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4

function GiftCard({ gift, onWithdrawn, onListed, haptic }) {
  const [panel, setPanel] = useState(null)
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rarityColor = RARITY_COLORS[gift.rarity] || '#a390a0'
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
    if (!isTgGift && !to) { setError('Укажите адрес кошелька'); return }
    setBusy(true)
    setError('')
    try {
      await apiCall(`/api/gifts/${gift.gift_id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify(isTgGift ? {} : { to_address: to }),
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
          {gift.tg_thumb
            ? <TgGiftSticker thumbId={gift.tg_thumb} stickerId={gift.tg_sticker} />
            : gift.image_url
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
            {onChain ? '💎 Хранится в Rubuy' : isTgGift ? '🎁 Хранится в Rubuy' : gift.collection_name || 'Подарок'}
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
            {canTrade && (
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
            Лот появится на маркете. Комиссия {Math.round(FEE_RATE * 100)}%
            {priceNum > 0 ? ` — вы получите ${youGet} TON` : ''}.
          </div>
          <input
            className="input"
            value={price}
            onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Цена в TON, например 10.5"
            inputMode="decimal"
            disabled={busy}
            style={{ fontSize: 13, marginBottom: 8 }}
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

      {panel === 'withdraw' && isTgGift && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Подарок вернётся в ваш аккаунт Telegram обычной посылкой.
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy}
            onClick={withdraw}
          >
            {busy ? 'Отправляем…' : 'Вернуть в Telegram'}
          </button>
        </div>
      )}

      {panel === 'withdraw' && !isTgGift && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            NFT уйдёт на указанный TON-адрес. Проверьте адрес перед отправкой.
          </div>
          <input
            className="input"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Адрес вашего TON-кошелька"
            disabled={busy}
            style={{ fontSize: 13, marginBottom: 8 }}
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
  const [gifts, setGifts] = useState(null)
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
    haptic('light')
    load()
  }

  const onSaleCount = (gifts || []).filter(g => g.on_sale).length

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Подарков', value: gifts === null ? '…' : gifts.length },
            { label: 'На продаже', value: gifts === null ? '…' : onSaleCount },
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

        <button
          className="btn btn-primary btn-full"
          onClick={() => { haptic('medium'); navigate('/sell') }}
        >
          + Закинуть подарок
        </button>
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
            {error ? `Не удалось загрузить: ${error}` : 'Закиньте свой подарок или купите на маркете'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gifts.map(gift => (
            <GiftCard key={gift.gift_id} gift={gift} onWithdrawn={onWithdrawn} onListed={onListed} haptic={haptic} />
          ))}
        </div>
      )}
    </div>
  )
}