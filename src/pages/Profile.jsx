import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api, fragmentImage, giftSlug } from '../api/client'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { beginCell } from '@ton/core'
import GramIcon from '../components/GramIcon'
import { fmtGram } from '../utils/format'

export default function Profile() {
  const navigate = useNavigate()
  const { user, haptic, openLink } = useTelegram()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tonConnectUI] = useTonConnectUI()
  const walletAddress = useTonAddress()
  const [depositAmount, setDepositAmount] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositStatus, setDepositStatus] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawStatus, setWithdrawStatus] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const SUPPORT_USERNAME = 'giftruby_support'

  const SAFE_ADDRESS = '0QA2-P0sWJofS2PuPFrDln3nyBNJhw2wddDwUhxSU1b0tmqS'

  // Единая перезагрузка профиля; best-effort — ошибку глотаем,
  // чтобы не перетереть статус вывода/пополнения.
  const reloadProfile = async () => {
    try {
      const res = await api.getProfile()
      setProfile(res)
    } catch {}
  }

  const handleWithdraw = async () => {
  const amount = parseFloat(String(withdrawAmount).replace(',', '.'))
  if (!amount || amount < 0.1) { setWithdrawStatus('Минимум 0.1 GRAM'); return }
  if (amount > balance) { setWithdrawStatus('Недостаточно средств'); return }
  if (!walletAddress) {
    setWithdrawStatus('Сначала подключи кошелёк')
    tonConnectUI.openModal()
    return
  }
  setWithdrawStatus('Отправляем…')
  try {
    await api.withdrawBalance(walletAddress, amount)
    try { haptic('medium') } catch {}
    setShowWithdraw(false)
    setWithdrawAmount('')
    setWithdrawStatus('Отправлено! GRAM придут через ~15 секунд')
    await reloadProfile()
  } catch (e) {
    setWithdrawStatus(e.message || 'Что-то пошло не так, попробуй ещё раз')
    // При 502 баланс уже списан на бэке (pending) — показываем актуальный,
    // чтобы юзер видел «зависшую» сумму до подтверждения/возврата.
    await reloadProfile()
  }
}

  const handleDeposit = async () => {
    const amount = parseFloat(String(depositAmount).replace(',', '.'))
    if (!amount || amount < 0.1) { setDepositStatus('Минимум 0.1 GRAM'); return }
    if (!walletAddress) {
      setDepositStatus('Сначала подключи кошелёк')
      tonConnectUI.openModal()
      return
    }
    try {
      const boc = beginCell()
        .storeUint(0, 32)
        .storeStringTail(`GS-DEP-${user?.id}`)
        .endCell()
        .toBoc()
      const payload = btoa(String.fromCharCode(...boc))

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: SAFE_ADDRESS,
          amount: String(Math.round(amount * 1e9)), // nanotons
          payload,
        }],
      })
      try { haptic('medium') } catch {}
      setDepositStatus('Отправлено! Ждём подтверждения…')
      setShowDeposit(false)
      setDepositAmount('')
      // опрашиваем профиль каждые 5 сек, пока баланс не вырастет (макс 2 мин)
      const prevBalance = balance
      let tries = 0
      const poll = setInterval(async () => {
        tries++
        try {
          const res = await api.getProfile()
          setProfile(res)
          if ((res?.user?.balance_ton ?? 0) > prevBalance) {
            setDepositStatus(null)
            clearInterval(poll)
          }
        } catch {}
        if (tries >= 24) clearInterval(poll)
      }, 5000)
    } catch (e) {
      const m = e.message || ''
      if (m.includes('reject') || m.includes('Reject')) {
        setDepositStatus('Отменено')
      } else if (m.includes('was not sent') || m.includes('TON_CONNECT')) {
        setDepositStatus('Не удалось отправить — открой Tonkeeper и попробуй ещё раз')
      } else {
        setDepositStatus('Что-то пошло не так, попробуй ещё раз')
      }
    }
  }

  useEffect(() => {
    let alive = true
    api.getProfile()
      .then(res => { if (alive) setProfile(res) })
      .catch(e => { if (alive) setError(e.message || 'Ошибка загрузки') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const dbUser = profile?.user || null
  const txs = profile?.transactions || []
  const balance = dbUser?.balance_ton ?? 0
  const earned = dbUser?.total_earned ?? 0
  const spent = dbUser?.total_spent ?? 0

  const name = user ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : 'Гость'
  const username = user?.username ? '@' + user.username : 'без username'

  // Реальные метрики из БД (total_earned / total_spent обновляются при каждой сделке)
  const stats = [
    { label: 'Сделок', value: loading ? '…' : String(txs.length) },
    { label: 'Заработано', value: loading ? '…' : <span className="money-text">{fmtGram(earned)}</span> },
    { label: 'Потрачено', value: loading ? '…' : fmtGram(spent) },
  ]

  return (
    <div className="page">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.5px' }}>
        Профиль
      </h1>

      {/* User card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 20,
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--gold)' }}
          />
        ) : (
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold-dim), var(--bg-card))',
            border: '2px solid var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}>
            {name[0]}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{username}</div>
        </div>
      </div>

      {/* Balance */}
      <div style={{
        background: 'linear-gradient(135deg, var(--gold-dim), var(--bg-card))',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-xl)',
        padding: 20,
        marginBottom: 16,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5 }}>
          БАЛАНС
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700 }}>
          <span className="money-text">{loading ? '…' : fmtGram(balance)}</span>
          {!loading && <GramIcon size={24} style={{ marginLeft: 6, verticalAlign: '-3px' }} />}
        </div>
        <button
          onClick={() => { haptic('light'); setShowDeposit(v => !v); setShowWithdraw(false); setDepositStatus(null); setDepositAmount('0.1') }}
          style={{
            marginTop: 12, padding: '10px 24px', borderRadius: 999,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-deep))',
            color: '#fff', fontWeight: 700, fontSize: 14,
            border: 'none', cursor: 'pointer',
          }}
        >
          Пополнить
        </button>
        <button
          onClick={() => { haptic('light'); setShowWithdraw(v => !v); setShowDeposit(false); setWithdrawStatus(null); setWithdrawAmount('0.1') }}
          style={{
            marginTop: 12, marginLeft: 8, padding: '10px 24px', borderRadius: 999,
            background: 'transparent', color: 'var(--gold)', fontWeight: 700, fontSize: 14,
            border: '1px solid var(--gold)', cursor: 'pointer',
          }}
        >
          Вывести
        </button>
        {showDeposit && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
              onClick={() => setDepositAmount(a => Math.max(0.1, (parseFloat(String(a).replace(',', '.')) || 0.1) - 0.1).toFixed(1))}
              style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer' }}
            >−</button>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.1"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              style={{
                width: 80, padding: '10px 12px', borderRadius: 999,
                border: '1px solid var(--border)', background: 'var(--bg-input)',
                color: 'var(--text-primary)', fontSize: 14, textAlign: 'center',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setDepositAmount(a => ((parseFloat(String(a).replace(',', '.')) || 0) + 0.1).toFixed(1))}
              style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer' }}
            >+</button>
            <button
              onClick={handleDeposit}
              style={{
                padding: '10px 16px', borderRadius: 999,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-deep))',
                color: '#fff', fontWeight: 700,
                border: 'none', cursor: 'pointer', fontSize: 14,
                boxShadow: 'var(--gold-glow)',
              }}
            >
              OK
            </button>
          </div>
        )}
        {showWithdraw && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => setWithdrawAmount(a => Math.max(0.1, (parseFloat(String(a).replace(',', '.')) || 0.1) - 0.1).toFixed(1))}
              style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer' }}
            >−</button>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.1"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              style={{
                width: 80, padding: '10px 12px', borderRadius: 999,
                border: '1px solid var(--border)', background: 'var(--bg-input)',
                color: 'var(--text-primary)', fontSize: 14, textAlign: 'center',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setWithdrawAmount(a => ((parseFloat(String(a).replace(',', '.')) || 0) + 0.1).toFixed(1))}
              style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer' }}
            >+</button>
            <button
              onClick={handleWithdraw}
              style={{
                padding: '10px 16px', borderRadius: 999,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-deep))',
                color: '#fff', fontWeight: 700,
                border: 'none', cursor: 'pointer', fontSize: 14,
                boxShadow: 'var(--gold-glow)',
              }}
            >
              OK
            </button>
          </div>
        )}
        {depositStatus && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{depositStatus}</div>
        )}
        {withdrawStatus && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{withdrawStatus}</div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      {[
        {
          icon: '🔗', label: 'Рефералы',
          sub: 'Приглашайте друзей и зарабатывайте',
          onClick: () => { haptic('light'); navigate('/referral') },
        },
        {
          icon: '📊', label: 'История сделок',
          sub: `${txs.length} завершённых транзакций`,
          onClick: () => { haptic('light'); setShowHistory(v => !v) },
        },
        {
          icon: '❓', label: 'Поддержка',
          sub: `Написать в @${SUPPORT_USERNAME}`,
          onClick: () => {
            haptic('light')
            const url = `https://t.me/${SUPPORT_USERNAME}`
            if (window.Telegram?.WebApp?.openTelegramLink) {
              window.Telegram.WebApp.openTelegramLink(url)
            } else {
              window.open(url, '_blank')
            }
          },
        },
      ].map((item, i) => (
        <div key={i}>
          <div
            className="card"
            style={{ padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={item.onClick}
          >
            <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>
              {item.label === 'История сделок' ? (showHistory ? '⌄' : '›') : '›'}
            </span>
          </div>
          {item.label === 'История сделок' && showHistory && (
            <div style={{ marginBottom: 8 }}>
              {txs.length === 0 ? (
                <div className="card" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Сделок пока нет
                </div>
              ) : txs.map((tx, j) => {
                const isBuy = tx.buyer_id === user?.id
                const counterpart = isBuy ? tx.seller_username : tx.buyer_username
                const slug = giftSlug(tx.gift_name, tx.gift_number, tx.nft_address)
                const thumb = fragmentImage(tx.gift_name, tx.gift_number, tx.nft_address)
                const giftLink = slug ? `https://t.me/nft/${slug}` : ''
                // Продавец получает цену за вычетом комиссии и реф-бонуса —
                // показываем реально зачисленную сумму, а не цену лота.
                const displayAmount = isBuy
                  ? tx.amount_ton
                  : tx.amount_ton - (tx.fee_ton || 0) - (tx.ref_bonus_ton || 0)
                return (
                  <div
                    key={j} className="card"
                    style={{ padding: '10px 16px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: giftLink ? 'pointer' : 'default' }}
                    onClick={giftLink ? () => { haptic('light'); openLink(giftLink) } : undefined}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      flexShrink: 0, background: 'var(--bg-card-hover)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 18 }}>🎁</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {isBuy ? '🛒' : '💰'} {tx.gift_name}{tx.gift_number ? ` #${tx.gift_number}` : ''}
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {counterpart ? `${isBuy ? 'от' : 'кому'} @${counterpart} · ` : ''}
                        {tx.completed_at ? new Date(tx.completed_at).toLocaleDateString('ru-RU') : ''}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0,
                      color: isBuy ? 'var(--text-secondary)' : 'var(--gold)',
                    }}>
                      {isBuy ? '−' : '+'}{fmtGram(displayAmount)} <GramIcon size={11} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}