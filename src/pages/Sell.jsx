import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'

// Должна совпадать с FEE_RATE в ListingDetail.jsx, "Комиссия 3%" в Market.jsx
// и MARKET_FEE на бэкенде. Весь маркет работает в TON, не в Stars.
const FEE_RATE = 0.03
const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4
const POLL_MS = 10000 // как часто спрашиваем бэкенд, дошёл ли NFT

// Копирование с фолбэком для старых Telegram-webview
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

export default function Sell() {
  const navigate = useNavigate()
  const { haptic, showConfirm } = useTelegram()

  // step: intro → deposit → deposited → price → done
  const [step, setStep] = useState('intro')
  const [intent, setIntent] = useState(null)   // { address, code }
  const [gift, setGift] = useState(null)       // { gift_id, nft_address }
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)   // 'address' | 'code'
  const [done, setDone] = useState(null)
  const pollRef = useRef(null)

  const priceNum = parseFloat(String(price).replace(',', '.')) || 0
  const fee = round4(priceNum * FEE_RATE)
  const youGet = round4(priceNum - fee)

  // Поллинг статуса депозита, пока открыт шаг deposit
  useEffect(() => {
    if (step !== 'deposit') return
    const check = async () => {
      try {
        const st = await api.getDepositStatus()
        if (st.status === 'completed' && st.gift_id) {
          haptic('light')
          setGift({ gift_id: st.gift_id, nft_address: st.nft_address })
          setStep('deposited')
        }
      } catch { /* сеть мигнула — попробуем в следующий цикл */ }
    }
    check()
    pollRef.current = setInterval(check, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const startDeposit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.createDepositIntent()
      setIntent(res)
      setStep('deposit')
      haptic('medium')
    } catch (e) {
      setError(e.message || 'Не удалось получить адрес депозита')
      haptic('heavy')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async (what, value) => {
    const ok = await copyText(value)
    haptic(ok ? 'light' : 'heavy')
    if (ok) {
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  const submitListing = () => {
    if (!(priceNum > 0)) {
      setError('Укажите цену в TON больше нуля')
      haptic('heavy')
      return
    }
    haptic('medium')
    showConfirm(
      `Выставить подарок за ${priceNum} TON? Вы получите ${youGet} TON.`,
      async (ok) => {
        if (!ok) return
        setBusy(true)
        setError(null)
        try {
          const res = await api.createListing({
            gift_id: gift.gift_id,
            price: priceNum,
            description: '',
          })
          setDone(res || {})
          haptic('light')
        } catch (e) {
          setError(e.message || 'Не удалось выставить лот')
          haptic('heavy')
        } finally {
          setBusy(false)
        }
      }
    )
  }

  // ── done ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
            Подарок выставлен!
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            {done.gift_name ? `«${done.gift_name}» ` : ''}теперь на маркете
            При продаже TON придёт вам на баланс.
          </p>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 20 }}
            onClick={() => { haptic('light'); navigate('/') }}
          >
            В маркет
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Закинуть <span style={{ color: 'var(--gold)' }}>подарок</span>
      </h1>

      {/* ── Шаг 1: интро ── */}
      {step === 'intro' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 20px' }}>
            Закиньте подарок — он будет надёжно храниться в Rubuy
          </p>
          <div className="card" style={{ padding: '16px', marginBottom: 20, fontSize: 13, lineHeight: 1.7 }}>
            <div>1️⃣ Получите адрес сейфа и ваш код</div>
            <div>2️⃣ Отправьте NFT на адрес, указав код в комментарии</div>
            <div>3️⃣ Мы увидим депозит и предложим назначить цену</div>
          </div>
          <div style={{
            padding: '12px 14px', marginBottom: 20,
            background: 'rgba(94,156,245,0.08)', border: '1px solid rgba(94,156,245,0.25)',
            borderRadius: 'var(--radius-lg)', fontSize: 13, color: '#5e9cf5', lineHeight: 1.5,
          }}>
            🔒 NFT физически лежит на сейфе Rubuy — покупатель гарантированно его получит,
            а при снятии лота подарок вернётся вам.
          </div>
          {error && (
            <div className="card" style={{ padding: '10px 14px', marginBottom: 12, border: '1px solid #f5555540', color: '#ff6b6b', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}
          <button
            className="btn btn-primary btn-full"
            onClick={startDeposit}
            disabled={busy}
            style={{ fontSize: 15, padding: '14px', boxShadow: busy ? 'none' : 'var(--gold-glow)', opacity: busy ? 0.5 : 1 }}
          >
            {busy ? '⏳ Готовим адрес…' : 'Начать депозит'}
          </button>
        </>
      )}

      {/* ── Шаг 2: депозит ── */}
      {step === 'deposit' && intent && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 20px' }}>
            Отправьте NFT из своего кошелька (Tonkeeper и др.)
          </p>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Адрес сейфа
          </label>
          <div
            className="card"
            onClick={() => handleCopy('address', intent.address)}
            style={{ padding: '12px 14px', marginBottom: 16, fontSize: 12, wordBreak: 'break-all', cursor: 'pointer', border: copied === 'address' ? '1px solid var(--gold)' : undefined }}
          >
            {intent.address}
            <div style={{ marginTop: 6, fontSize: 12, color: copied === 'address' ? 'var(--gold)' : 'var(--text-muted)' }}>
              {copied === 'address' ? '✓ Скопировано' : '📋 Нажмите, чтобы скопировать'}
            </div>
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Ваш код — укажите в комментарии к переводу <span style={{ color: 'var(--gold)' }}>*</span>
          </label>
          <div
            className="card"
            onClick={() => handleCopy('code', intent.code)}
            style={{ padding: '12px 14px', marginBottom: 16, fontSize: 16, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer', border: copied === 'code' ? '1px solid var(--gold)' : undefined }}
          >
            {intent.code}
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 400, letterSpacing: 0, color: copied === 'code' ? 'var(--gold)' : 'var(--text-muted)' }}>
              {copied === 'code' ? '✓ Скопировано' : '📋 Нажмите, чтобы скопировать'}
            </div>
          </div>

          <div style={{
            padding: '12px 14px', marginBottom: 20,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-lg)', fontSize: 13, color: '#f59e0b', lineHeight: 1.5,
          }}>
            ⚠️ Без кода в комментарии мы не сможем привязать NFT к вам. Проверьте код перед отправкой.
          </div>

          <div className="card" style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            ⏳ Ждём ваш NFT… Проверяем каждые 10 секунд, страницу можно не обновлять.
          </div>
        </>
      )}

      {/* ── Шаг 2.5: NFT в портфеле, цена — по желанию ── */}
      {step === 'deposited' && gift && (
        <>
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
              NFT получен!
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
              Подарок уже в вашем портфеле и хранится в сейфе Rubuy.
              Выставить на продажу можно сейчас или позже — из портфеля.
            </p>
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 16, fontSize: 15, padding: '14px', boxShadow: 'var(--gold-glow)' }}
            onClick={() => { haptic('medium'); setStep('price') }}
          >
            Назначить цену сейчас
          </button>
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 10 }}
            onClick={() => { haptic('light'); navigate('/portfolio') }}
          >
            В портфель — продам позже
          </button>
        </>
      )}

      {/* ── Шаг 3: цена ── */}
      {step === 'price' && gift && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 20px' }}>
            ✅ Подарок получен и хранится в Rubuy. Назначьте цену.
          </p>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Цена в TON <span style={{ color: 'var(--gold)' }}>*</span>
          </label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            placeholder="10.2"
            value={price}
            onChange={e => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); setError(null) }}
            style={{ marginBottom: 20 }}
          />

          <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Цена покупателя</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{priceNum || 0} TON</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Комиссия Rubuy ({Math.round(FEE_RATE * 100)}%)
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>− {fee} TON</span>
            </div>
            <div className="divider" style={{ margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Вы получите</span>
              <span className="price price-md">{youGet} TON</span>
            </div>
          </div>

          {error && (
            <div className="card" style={{ padding: '10px 14px', marginBottom: 12, border: '1px solid #f5555540', color: '#ff6b6b', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={submitListing}
            disabled={busy || !(priceNum > 0)}
            style={{ fontSize: 15, padding: '14px', boxShadow: (busy || !(priceNum > 0)) ? 'none' : 'var(--gold-glow)', opacity: (busy || !(priceNum > 0)) ? 0.5 : 1 }}
          >
            {busy ? '⏳ Выставляем…' : 'Выставить на продажу'}
          </button>
        </>
      )}
    </div>
  )
}