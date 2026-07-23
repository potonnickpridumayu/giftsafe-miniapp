import { useState } from 'react'
import { api } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import { showResult } from './ResultSheet'
import GramIcon from './GramIcon'
import { MiniSpin } from './StatusIcons'
import { WarnIcon } from './WarnIcon'
import { fmtGram } from '../utils/format'

// Шторка «Создать ордер» (заявку на покупку). Сумма замораживается на балансе,
// пока ордер активен; любой владелец подходящего подарка сможет его исполнить.
// gift = { name, number, collection } — из карточки/страницы подарка.
export default function CreateOrderSheet({ gift, refPrice, onClose, onCreated }) {
  const { haptic } = useTelegram()
  const [kind, setKind] = useState('collection')   // collection | gift
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const amountNum = parseFloat(String(amount).replace(',', '.')) || 0
  const hasNumber = Boolean(gift?.number)

  const submit = async () => {
    if (!(amountNum > 0)) { setError('Укажите сумму больше нуля'); return }
    setBusy(true)
    setError('')
    try {
      await api.createOrder({
        kind: kind === 'gift' && hasNumber ? 'gift' : 'collection',
        gift_name: gift.name,
        gift_number: kind === 'gift' ? String(gift.number || '') : '',
        collection_name: gift.collection || '',
        amount_ton: amountNum,
      })
      haptic('medium')
      onClose()
      showResult({
        icon: 'success',
        title: 'Ордер создан',
        sub: `${fmtGram(amountNum)} Gram заморожено на балансе. Отменить можно в Профиле.`,
      })
      onCreated?.()
    } catch (e) {
      setError(e.message || 'Не удалось создать ордер')
      setBusy(false)
    }
  }

  const title = `${gift?.name || 'Подарок'}${hasNumber ? ` #${gift.number}` : ''}`

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(5,3,4,0.7)', display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          padding: '20px 16px calc(22px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 480, margin: '0 auto',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>
          Создать ордер
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.45, marginBottom: 16 }}>
          Заявка на покупку {title}. Сумма заморозится на балансе — любой владелец сможет продать вам подарок по ней.
        </div>

        {hasNumber && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              className={`chip${kind === 'collection' ? ' active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { haptic('light'); setKind('collection') }}
            >
              Любой такой
            </button>
            <button
              className={`chip${kind === 'gift' ? ' active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { haptic('light'); setKind('gift') }}
            >
              Именно #{gift.number}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <input
            className="input"
            value={amount}
            onChange={e => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="Ваша цена в Gram"
            inputMode="decimal"
            disabled={busy}
            style={{ flex: 1, fontSize: 15 }}
          />
          <GramIcon size={22} />
        </div>

        {refPrice != null && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Цена этого лота — {fmtGram(refPrice)} Gram. Ордер обычно ставят ниже.
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>
            <WarnIcon size={18} /> {error}
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          style={{ gap: 4, position: 'relative', overflow: 'hidden' }}
          onClick={submit}
          disabled={busy || !(amountNum > 0)}
        >
          {busy ? <><MiniSpin size={16} /> Создаём…</> : <>Заморозить {fmtGram(amountNum)} <GramIcon size={18} /></>}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose} disabled={busy}>
          Отмена
        </button>
      </div>
    </div>
  )
}
