import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api, fragmentImage } from '../api/client'
import { TonConnectButton } from '@tonconnect/ui-react';
import GramIcon from '../components/GramIcon'
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
  const [note, setNote] = useState('')
  const [newPrice, setNewPrice] = useState('')
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

  const delist = async () => {
    setBusy(true)
    setError('')
    try {
      await api.withdrawListing(gift.listing_id)
      haptic('medium')
      setBusy(false)
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const sell = async () => {
    if (!(priceNum > 0)) { setError('Укажите цену в GRAM больше нуля'); return }
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

  const savePrice = async () => {
    const p = parseFloat(String(newPrice).replace(',', '.'))
    if (!p || p <= 0) { setError('Введите цену больше нуля'); return }
    setBusy(true)
    setError('')
    try {
      await api.changePrice(gift.listing_id, p)
      haptic('medium')
      setBusy(false)
      setPanel(null)
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const listForTrade = async () => {
    setBusy(true)
    setError('')
    try {
      await api.createTrade(gift.gift_id, note)
      haptic('medium')
      setBusy(false)
      setPanel(null)
      setNote('')
      onListed(gift.gift_id)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: canTrade ? 10 : 0 }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: 'var(--radius-md)',
          background: `${rarityColor}18`,
          border: `1px solid ${rarityColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, flexShrink: 0, overflow: 'hidden',
        }}>
          <TgGiftSticker
            image={fragmentImage(gift.gift_name, gift.gift_number, gift.nft_address) || gift.image_url}
            stickerId={gift.tg_sticker}
            backdrop={gift.tg_backdrop}
            pad="17%"
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {gift.gift_name}{gift.gift_number ? ` #${gift.gift_number}` : ''}
            </span>
          </div>
          {!onChain && !isTgGift && (
            <div style={{
              fontSize: 12, color: 'var(--text-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {gift.collection_name || 'Подарок'}
            </div>
          )}
        </div>
        {gift.on_sale ? (
          <span className="badge badge-gold" style={{ fontSize: 11, flexShrink: 0 }}>На продаже</span>
        ) : gift.on_trade ? (
          <span className="badge badge-gold" style={{ fontSize: 11, flexShrink: 0 }}>На обмене</span>
        ) : null}
      </div>

      {canTrade && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {gift.on_sale ? (
            <>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '8px 12px' }}
                onClick={() => { setNewPrice(String(gift.price_ton ?? '')); togglePanel('editPrice') }}
              >
                {panel === 'editPrice' ? 'Скрыть' : '✏️ Изменить цену'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '8px 12px' }}
                disabled={busy}
                onClick={delist}
              >
                {busy ? '⏳' : 'Снять с продажи'}
              </button>
            </>
          ) : gift.on_trade ? null : (
            <>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '8px 12px' }}
                onClick={() => togglePanel('sell')}
              >
                {panel === 'sell' ? 'Скрыть' : 'Продать'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '8px 12px' }}
                onClick={() => togglePanel('trade')}
              >
                {panel === 'trade' ? 'Скрыть' : 'Обменять'}
              </button>
            </>
          )}
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '8px 12px' }}
            onClick={() => togglePanel('withdraw')}
          >
            {panel === 'withdraw' ? 'Скрыть' : 'Вывести'}
          </button>
        </div>
      )}

      {panel === null && error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</div>
      )}

      {panel === 'editPrice' && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <input
            className="input"
            value={newPrice}
            onChange={e => { setNewPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Новая цена в GRAM"
            inputMode="decimal"
            disabled={busy}
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy || !(parseFloat(String(newPrice).replace(',', '.')) > 0)}
            onClick={savePrice}
          >
            {busy ? 'Сохраняем…' : 'Сохранить цену'}
          </button>
        </div>
      )}

      {panel === 'sell' && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Лот появится на маркете. Комиссия {Math.round(FEE_RATE * 100)}%
            {priceNum > 0 ? <> — вы получите {youGet} <GramIcon size={11} /></> : ''}.
          </div>
          <input
            className="input"
            value={price}
            onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Цена в GRAM, например 10.5"
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

      {panel === 'trade' && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Лот появится во вкладке «Обмен» без цены. Другие пользователи предложат свой подарок (+ доплату, если захотят) — вы примете или отклоните.
          </div>
          <input
            className="input"
            value={note}
            onChange={e => { setNote(e.target.value); setError('') }}
            placeholder="Комментарий (необязательно)"
            disabled={busy}
            style={{ fontSize: 13, marginBottom: 8 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
          )}
          <button
            className="btn btn-primary btn-full"
            disabled={busy}
            onClick={listForTrade}
          >
            {busy ? 'Выставляем…' : 'Выставить на обмен'}
          </button>
        </div>
      )}

      {panel === 'withdraw' && isTgGift && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Подарок вернётся в ваш аккаунт Telegram обычной посылкой.
            Комиссия за передачу — <span style={{ color: 'var(--money-1)', fontWeight: 700 }}>0.2 <GramIcon size={11} /></span>, спишется с баланса.
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
            Портфель
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