import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api } from '../api/client'
import GramIcon from '../components/GramIcon'
import { fmtGram } from '../utils/format'

const BOT_USERNAME = 'giftruby_bot'

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

export default function Referral() {
  const navigate = useNavigate()
  const { user, haptic } = useTelegram()
  const [stats, setStats] = useState(null) // { invited, earned_ton }
  const [copied, setCopied] = useState(false)

  const link = `https://t.me/${BOT_USERNAME}?start=ref_${user?.id || ''}`

  useEffect(() => {
    api.getReferralStats?.()
      .then(setStats)
      .catch(() => setStats({ invited: 0, earned_ton: 0 }))
  }, [])

  const share = () => {
    haptic('medium')
    const text = 'Залетай на ruby — маркет подарков Telegram 💎'
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const copy = async () => {
    const ok = await copyText(link)
    haptic(ok ? 'light' : 'heavy')
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Рефералы
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 20px' }}>
        Приглашайте друзей и получайте процент с их сделок
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Приглашено', value: stats === null ? '…' : String(stats.invited ?? 0) },
          { label: 'Заработано', value: stats === null ? '…' : <><span className="money-text">{fmtGram(stats.earned_ton)}</span> <GramIcon size={20} /></> },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--gold)', marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Link */}
      <div
        className="card"
        onClick={copy}
        style={{ padding: '14px 16px', marginBottom: 16, cursor: 'pointer', border: copied ? '1px solid var(--gold)' : undefined }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ваша ссылка</div>
        <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{link}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: copied ? 'var(--gold)' : 'var(--text-muted)' }}>
          {copied ? '✓ Скопировано' : '📋 Нажмите, чтобы скопировать'}
        </div>
      </div>

      <button className="btn btn-primary btn-full" onClick={share}>
        Поделиться в Telegram
      </button>

      <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          💡 Друг заходит по вашей ссылке → продаёт подарки → вам начисляется 1% от суммы каждой его продажи. Начисления приходят на Gram-баланс автоматически.
        </div>
      </div>
    </div>
  )
}