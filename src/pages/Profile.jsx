import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTelegram } from '../hooks/useTelegram'
import { api, fragmentImage, giftSlug } from '../api/client'
import { useTonConnectUI, useTonAddress, useTonWallet, CHAIN } from '@tonconnect/ui-react'
import { beginCell } from '@ton/core'
import GramIcon from '../components/GramIcon'
import AppHeader from '../components/AppHeader'
import WalletButton from '../components/WalletButton'
import TxRow from '../components/TxRow'
import { IconSwap, MiniSpin, MiniSpinAccent, OwnerAvatar } from '../components/StatusIcons'
import { OfferCard } from '../components/MarketStates'
import WarnBanner from '../components/WarnIcon'
import { fmtGram } from '../utils/format'
import { setIncomingOffers } from '../utils/offers'
import { showResult } from '../components/ResultSheet'
import TradeSwapResult from '../components/TradeSwapResult'
import { IconUsers, IconMessageCircleDollar, IconHistory, IconActivity, IconHelpCircle, IconChevronRight, IconArrowDownLeft, IconArrowUpRight } from '@tabler/icons-react'

// Комиссия площадки с доплаты при обмене — та же, что и на Маркете (MARKET_FEE
// на бэкенде). Здесь только для превью «сколько получит владелец лота»,
// реальная сумма фиксируется на бэкенде в момент принятия оффера.
const TRADE_FEE_RATE = 0.03

// Кнопка +/- для суммы: тап делает один шаг, зажатие повторяет шаг
// каждые 80мс после первой паузы в 400мс.
function HoldStepButton({ onStep, style, children }) {
  const timers = useRef({ timeout: null, interval: null })

  const stop = () => {
    clearTimeout(timers.current.timeout)
    clearInterval(timers.current.interval)
    timers.current.timeout = null
    timers.current.interval = null
  }
  const start = () => {
    onStep()
    timers.current.timeout = setTimeout(() => {
      timers.current.interval = setInterval(onStep, 80)
    }, 400)
  }

  useEffect(() => stop, [])

  return (
    <button
      onPointerDown={e => { e.preventDefault(); start() }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      style={style}
    >
      {children}
    </button>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, haptic, openLink } = useTelegram()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tonConnectUI] = useTonConnectUI()
  const walletAddress = useTonAddress()
  // Нужен ради account.chain: адрес сам по себе сеть не выдаёт надёжно, а
  // кошелёк в тестовом режиме увёл бы деньги на адрес, которым в основной сети
  // владелец не распоряжается (у W5 адреса в сетях разные).
  const wallet = useTonWallet()
  const [depositAmount, setDepositAmount] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositStatus, setDepositStatus] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawStatus, setWithdrawStatus] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [offers, setOffers] = useState(null)
  const [showOffers, setShowOffers] = useState(false)
  const [offerBusyId, setOfferBusyId] = useState(null)
  // Какое именно действие в полёте ('accept'|'decline'|'cancel') — чтобы
  // спиннер крутился ТОЛЬКО в нажатой кнопке, а вторая осталась с подписью.
  const [offerBusyAction, setOfferBusyAction] = useState(null)
  const [offerError, setOfferError] = useState(null)

  // Пришли с флагом openDeposit (кнопка «Пополнить баланс» из баннера
  // «Недостаточно средств») — сразу открываем шторку пополнения, а не просто
  // страницу профиля. Флаг гасим, чтобы шторка не открывалась при возврате.
  useEffect(() => {
    if (location.state?.openDeposit) {
      setShowDeposit(true)
      setShowWithdraw(false)
      setDepositStatus(null)
      setDepositAmount('0.1')
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  const SUPPORT_USERNAME = 'giftruby_support'

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
  if (!amount || amount < 0.1) { setWithdrawStatus('Минимум 0.1 Gram'); return }
  if (amount > balance) { setWithdrawStatus('Недостаточно средств'); return }
  if (!walletAddress) {
    setWithdrawStatus('Сначала подключите кошелёк')
    tonConnectUI.openModal()
    return
  }
  setWithdrawStatus('Отправляем…')
  try {
    await api.withdrawBalance(walletAddress, amount)
    try { haptic('medium') } catch {}
    // Шторку не закрываем — статус успеха виден внутри, закроет сам юзер
    setWithdrawStatus('Отправлено! Gram придут в течение 15 секунд')
    await reloadProfile()
  } catch (e) {
    setWithdrawStatus(e.message || 'Что-то пошло не так, попробуйте ещё раз')
    // При 502 баланс уже списан на бэке (pending) — показываем актуальный,
    // чтобы юзер видел «зависшую» сумму до подтверждения/возврата.
    await reloadProfile()
  }
}

  const handleDeposit = async () => {
    const amount = parseFloat(String(depositAmount).replace(',', '.'))
    if (!amount || amount < 0.1) { setDepositStatus('Минимум 0.1 Gram'); return }
    if (!walletAddress) {
      setDepositStatus('Сначала подключите кошелёк')
      tonConnectUI.openModal()
      return
    }
    try {
      // Адрес сейфа спрашиваем у бэкенда перед каждой отправкой. Зашивать его
      // в код нельзя: он менялся при переезде на mainnet, и старая константа
      // увела бы деньги на давно заброшенный адрес. Не ответил — не отправляем.
      let safeAddress, safeNetwork
      try {
        const res = await api.getEscrowAddress()
        safeAddress = res?.address
        safeNetwork = res?.network
      } catch {
        safeAddress = null
      }
      if (!safeAddress) {
        setDepositStatus('Не удалось получить адрес пополнения — попробуйте ещё раз')
        return
      }
      // Сеть кошелька должна совпадать с сетью сервиса, иначе перевод уйдёт
      // в другую сеть и не зачислится.
      const expectedChain = safeNetwork === 'testnet' ? CHAIN.TESTNET : CHAIN.MAINNET
      const walletChain = wallet?.account?.chain
      if (walletChain && walletChain !== expectedChain) {
        setDepositStatus('Кошелёк подключён к другой сети — переключите его и подключите заново')
        return
      }

      const boc = beginCell()
        .storeUint(0, 32)
        .storeStringTail(`GS-DEP-${user?.id}`)
        .endCell()
        .toBoc()
      const payload = btoa(String.fromCharCode(...boc))

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: safeAddress,
          amount: String(Math.round(amount * 1e9)), // nanotons
          payload,
        }],
      })
      try { haptic('medium') } catch {}
      setDepositStatus('Отправлено! Ждём подтверждения…')
      // опрашиваем профиль каждые 5 сек, пока баланс не вырастет (макс 2 мин);
      // как только Gram зачислены — шторка закрывается сама, новый баланс уже на экране
      const prevBalance = balance
      let tries = 0
      const poll = setInterval(async () => {
        tries++
        try {
          const res = await api.getProfile()
          setProfile(res)
          if ((res?.user?.balance_ton ?? 0) > prevBalance) {
            setDepositStatus(null)
            setShowDeposit(false)
            try { haptic('medium') } catch {}
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
        setDepositStatus('Не удалось отправить — откройте Tonkeeper и попробуйте ещё раз')
      } else {
        setDepositStatus('Что-то пошло не так, попробуйте ещё раз')
      }
    }
  }

  const reloadOffers = async () => {
    try {
      const [trades, listings] = await Promise.all([
        api.getMyTradeOffers(),
        api.getMyListingOffers(),
      ])
      const incoming = [
        ...trades.incoming.map(o => ({ ...o, kind: 'trade' })),
        ...listings.incoming.map(o => ({ ...o, kind: 'listing' })),
      ]
      setOffers({
        incoming,
        outgoing: [
          ...trades.outgoing.map(o => ({ ...o, kind: 'trade' })),
          ...listings.outgoing.map(o => ({ ...o, kind: 'listing' })),
        ],
      })
      // Держим бейдж навбара в синхроне: после принятия/отклонения оффера он
      // гаснет сразу, не дожидаясь 20-секундного тика поллера навбара.
      setIncomingOffers(incoming.length)
    } catch {}
  }

  useEffect(() => {
    let alive = true
    api.getProfile()
      .then(res => { if (alive) setProfile(res) })
      .catch(e => { if (alive) setError(e.message || 'Ошибка загрузки') })
      .finally(() => { if (alive) setLoading(false) })
    reloadOffers()
    return () => { alive = false }
  }, [])

  // Автообновление: входящие офферы, баланс и история подтягиваются сами
  // раз в 10 с, пока страница открыта (свёрнутое приложение не опрашиваем).
  // Оба вызова тихие — стейт просто заменяется, экран не мигает.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      reloadOffers()
      reloadProfile()
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const handleOfferAction = async (offer, action) => {
    haptic('light')
    setOfferBusyId(offer.offer_id)
    setOfferBusyAction(action)
    setOfferError(null)
    const api_ = offer.kind === 'listing'
      ? { accept: api.acceptListingOffer, decline: api.declineListingOffer, cancel: api.cancelListingOffer }
      : { accept: api.acceptTradeOffer, decline: api.declineTradeOffer, cancel: api.cancelTradeOffer }
    try {
      await api_[action](offer.offer_id)
      haptic(action === 'accept' ? 'medium' : 'light')
      await reloadOffers()
      if (action === 'accept') {
        await reloadProfile()
        // Принятый обмен — всплывающее окно с анимацией: подарки меняются
        // местами, между ними крутятся стрелки. target_gifts — что отдал
        // владелец лота (я), offered_gifts — что пришло от предложившего.
        if (offer.kind === 'trade') {
          showResult({
            custom: (
              <TradeSwapResult
                leftGifts={offer.target_gifts || []}
                rightGifts={offer.offered_gifts || []}
                leftUser={{
                  username: user?.username,
                  name: user ? user.first_name + (user.last_name ? ' ' + user.last_name : '') : '',
                  photoUrl: user?.photo_url,
                  userId: user?.id,
                }}
                rightUser={{ username: offer.from_username, userId: offer.from_user_id }}
              />
            ),
            title: 'Обмен принят',
            sub: 'Подарки обменялись местами',
          })
        }
      }
    } catch (e) {
      setOfferError(e.message || 'Не удалось выполнить действие')
      haptic('heavy')
    } finally {
      setOfferBusyId(null)
      setOfferBusyAction(null)
    }
  }

  // Строка одной стороны обмена в карточке оффера: юзернейм + список подарков,
  // с опциональной доплатой (её всегда платит отправитель оффера).
  const tradeOfferGiftSide = (username, gifts, paidTopUp) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        @{username}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(gifts || []).map((g, i) => {
          const slug = giftSlug(g.gift_name, g.gift_number, g.nft_address)
          const thumb = fragmentImage(g.gift_name, g.gift_number, g.nft_address)
          const link = slug ? `https://t.me/nft/${slug}` : ''
          return (
            <div
              key={i}
              onClick={link ? () => { haptic('light'); openLink(link) } : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: link ? 'pointer' : 'default' }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                flexShrink: 0, background: 'var(--bg-card-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {thumb
                  ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 16 }}>🎁</span>}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {g.gift_name}{g.gift_number ? ` #${g.gift_number}` : ''}
              </div>
            </div>
          )
        })}
      </div>
      {paidTopUp > 0 && (
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>доплата </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#3DDC84' }}>
            +{fmtGram(paidTopUp)} <GramIcon size={14} />
          </span>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            комиссия при принятии {fmtGram(paidTopUp * TRADE_FEE_RATE)} <GramIcon size={12} />
          </div>
        </div>
      )}
    </div>
  )

  const dbUser = profile?.user || null
  const txs = profile?.transactions || []
  const totalDeals = profile?.total_deals ?? txs.length
  const balance = dbUser?.balance_ton ?? 0
  const earned = dbUser?.total_earned ?? 0
  const spent = dbUser?.total_spent ?? 0

  const name = user ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : 'Гость'
  const username = user?.username ? '@' + user.username : 'без username'

  // Реальные метрики из БД (total_earned / total_spent обновляются при каждой сделке)
  const stats = [
    { label: 'Сделок', value: loading ? '…' : String(totalDeals) },
    { label: 'Заработано', value: loading ? '…' : <span className="money-text">{fmtGram(earned)}</span> },
    { label: 'Потрачено', value: loading ? '…' : fmtGram(spent) },
  ]

  return (
    <div className="rd-page">
      <AppHeader title="Профиль">
        <WalletButton />
        <button className="rd-iconbtn" onClick={() => { haptic('light'); navigate('/history') }} aria-label="Активность маркета">
          <IconActivity size={18} stroke={1.9} />
        </button>
      </AppHeader>

      <div className="rd-body">
        <div className="rd-prof">
          <div className="rd-avatar-ring">
            <OwnerAvatar name={name} username={user?.username} photoUrl={user?.photo_url} userId={user?.id} size={86} />
          </div>
          <div className="rd-pname">{name}</div>
          <div className="rd-handle">{username}</div>

          <div className="rd-ballabel">Баланс · Gram</div>
          <div className="rd-balrow">
            <span className="rd-balnum">{loading ? '…' : fmtGram(balance)}</span>
            <img src="/ruby-gem-256.png" width={46} height={46} alt="" />
          </div>

          <div className="rd-balbtns">
            <button
              className="rd-balbtn rd-balbtn--ruby"
              onClick={() => { haptic('light'); setShowDeposit(v => !v); setShowWithdraw(false); setDepositStatus(null); setDepositAmount('0.1') }}
            >
              Пополнить
            </button>
            <button
              className="rd-balbtn rd-balbtn--glass"
              onClick={() => { haptic('light'); setShowWithdraw(v => !v); setShowDeposit(false); setWithdrawStatus(null); setWithdrawAmount('0.1') }}
            >
              Вывести
            </button>
          </div>
        {/* Шторка пополнения/вывода: крупная, с явной идентичностью направления —
            пополнение золотое (деньги приходят), вывод крэмзовый (уходят) */}
        {(showDeposit || showWithdraw) && (() => {
          const isDep = showDeposit
          const amount = isDep ? depositAmount : withdrawAmount
          const setAmount = isDep ? setDepositAmount : setWithdrawAmount
          const status = isDep ? depositStatus : withdrawStatus
          const accent = isDep ? 'var(--money-1)' : 'var(--gold)'
          const actionBg = isDep ? 'var(--money-radial)' : 'var(--gold-radial)'
          const close = () => { setShowDeposit(false); setShowWithdraw(false) }
          const step = (d) => setAmount(a => Math.max(0.1, ((parseFloat(String(a).replace(',', '.')) || 0.1) + d)).toFixed(1))
          const stepBtnStyle = {
            width: 46, height: 46, borderRadius: '50%', fontSize: 22, lineHeight: 1,
            border: '1px solid var(--border)', background: 'var(--bg-card-hover)',
            color: accent, fontWeight: 700, cursor: 'pointer', touchAction: 'none', flexShrink: 0,
          }
          const shortWallet = walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : null
          return (
            <div
              onClick={close}
              style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(5,3,4,0.7)',
                display: 'flex', alignItems: 'flex-end',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
                  border: '1px solid var(--border)', borderBottom: 'none',
                  padding: '26px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
                  maxWidth: 480, margin: '0 auto', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: actionBg, color: '#fff5f7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDep ? <IconArrowDownLeft size={22} stroke={2.2} /> : <IconArrowUpRight size={22} stroke={2.2} />}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
                    {isDep ? 'Пополнить баланс' : 'Вывести Gram'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 18 }}>
                  {isDep
                    ? 'Gram спишутся с подключённого кошелька и зачислятся на ваш баланс'
                    : shortWallet
                      ? <>Gram придут на подключённый кошелёк<br /><b style={{ color: 'var(--text-secondary)' }}>{shortWallet}</b></>
                      : 'Кошелёк не подключён — попросим подключить при отправке'}
                </div>

                {!isDep && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Доступно: <b className="money-text">{fmtGram(balance)}</b> <GramIcon size={16} />
                    </span>
                    <button
                      className="chip"
                      style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => { haptic('light'); setAmount(fmtGram(balance)) }}
                    >
                      Всё
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <HoldStepButton onStep={() => step(-0.1)} style={stepBtnStyle}>−</HoldStepButton>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.1"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                    style={{
                      flex: 1, minWidth: 0, padding: '14px 12px', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${accent}44`, background: 'var(--bg-input, var(--bg))',
                      color: 'var(--text-primary)', fontSize: 28, fontWeight: 700,
                      fontFamily: 'var(--font-display)', textAlign: 'center', outline: 'none',
                    }}
                  />
                  <HoldStepButton onStep={() => step(0.1)} style={stepBtnStyle}>+</HoldStepButton>
                </div>

                {status && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>
                    {status}
                  </div>
                )}

                <button
                  onClick={isDep ? handleDeposit : handleWithdraw}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 999,
                    background: actionBg, boxShadow: isDep ? 'none' : 'var(--gold-glow)',
                    color: '#fff5f7', fontWeight: 700, fontSize: 16,
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {isDep ? `Пополнить на ${amount || '0.1'}` : `Вывести ${amount || '0.1'}`} Gram
                </button>
                <button
                  onClick={close}
                  className="btn btn-ghost btn-full"
                  style={{ marginTop: 8 }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )
        })()}
        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</div>
        )}
      </div>

      {/* Stats */}
      <div className="rd-stats" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 20 }}>
        {stats.map(s => (
          <div key={s.label} className="rd-stat">
            <div className="rd-stat-value">{s.value}</div>
            <div className="rd-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="rd-menu" style={{ marginTop: 20 }}>
      {[
        {
          icon: <IconUsers size={18} stroke={1.8} />, label: 'Рефералы',
          sub: 'Приглашайте друзей и зарабатывайте',
          onClick: () => { haptic('light'); navigate('/referral') },
        },
        {
          icon: <IconMessageCircleDollar size={18} stroke={1.8} />, label: 'Офферы',
          sub: offers
            ? `${offers.incoming.length} входящих · ${offers.outgoing.length} исходящих`
            : 'Предложения обмена',
          badge: offers?.incoming.length || 0,
          onClick: () => { haptic('light'); setShowOffers(v => !v) },
        },
        {
          icon: <IconHistory size={18} stroke={1.8} />, label: 'История сделок',
          sub: totalDeals > txs.length
            ? `${totalDeals} завершённых транзакций (показаны последние ${txs.length})`
            : `${totalDeals} завершённых транзакций`,
          onClick: () => { haptic('light'); setShowHistory(v => !v) },
        },
        {
          icon: <IconHelpCircle size={18} stroke={1.8} />, label: 'Поддержка',
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
          <button className="rd-menu-row" onClick={item.onClick}>
            <span className="rd-menu-ico">{item.icon}</span>
            <div className="rd-menu-body">
              <div className="rd-menu-title">{item.label}</div>
              <div className="rd-menu-sub">{item.sub}</div>
            </div>
            {item.badge > 0 && <span className="rd-menu-badge">{item.badge}</span>}
            <IconChevronRight
              size={18}
              className="rd-menu-chev"
              style={{
                transform: (item.label === 'История сделок' && showHistory) || (item.label === 'Офферы' && showOffers)
                  ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </button>
          {item.label === 'Офферы' && showOffers && (
            <div style={{ marginBottom: 8 }}>
              {offerError && (
                <WarnBanner style={{ marginBottom: 6 }}>{offerError}</WarnBanner>
              )}
              {!offers || (offers.incoming.length === 0 && offers.outgoing.length === 0) ? (
                <div className="card" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Офферов пока нет
                </div>
              ) : (
                <>
                  {offers.incoming.map(o => {
                    const isListing = o.kind === 'listing'
                    const busy = offerBusyId === o.offer_id
                    if (isListing) {
                      const title = `${o.gift_name}${o.gift_number ? ` #${o.gift_number}` : ''}`
                      return (
                        <div key={`${o.kind}-${o.offer_id}`} style={{ marginBottom: 10 }}>
                          <OfferCard
                            variant="incoming"
                            giftTitle={title}
                            priceTon={fmtGram(o.price_ton)}
                            offeredTon={fmtGram(o.amount_ton)}
                            username={o.from_username}
                            name={o.from_name}
                            userId={o.from_user_id}
                            busy={busy}
                            busyAction={offerBusyAction}
                            onAccept={() => handleOfferAction(o, 'accept')}
                            onDecline={() => handleOfferAction(o, 'decline')}
                          />
                        </div>
                      )
                    }
                    return (
                      <div key={`${o.kind}-${o.offer_id}`} className="card" style={{ padding: '10px 16px', marginBottom: 6 }}>
                        <div style={{ fontSize: 11, marginBottom: 6, fontWeight: 600, color: '#8a7fd6', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconSwap size={12} color="#8a7fd6" /> Предлагают обмен
                        </div>
                        {tradeOfferGiftSide(o.from_username, o.offered_gifts, o.top_up_ton)}
                        <div style={{ textAlign: 'center', fontSize: 30, color: '#8a7fd6', fontWeight: 700, lineHeight: 1, margin: '6px 0' }}>⇅</div>
                        {tradeOfferGiftSide(user?.username || 'вы', o.target_gifts, 0)}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="btn btn-primary" style={{ flex: 1, fontSize: 12, padding: '8px' }}
                            disabled={busy} onClick={() => handleOfferAction(o, 'accept')}>
                            {busy && offerBusyAction === 'accept' ? <MiniSpin size={14} /> : 'Принять'}
                          </button>
                          <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '8px' }}
                            disabled={busy} onClick={() => handleOfferAction(o, 'decline')}>
                            {busy && offerBusyAction === 'decline' ? <MiniSpinAccent size={14} /> : 'Отклонить'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {offers.outgoing.map(o => {
                    const isListing = o.kind === 'listing'
                    const busy = offerBusyId === o.offer_id
                    if (isListing) {
                      const title = `${o.gift_name}${o.gift_number ? ` #${o.gift_number}` : ''}`
                      return (
                        <div key={`${o.kind}-${o.offer_id}`} style={{ marginBottom: 10 }}>
                          <OfferCard
                            variant="outgoing"
                            giftTitle={title}
                            priceTon={fmtGram(o.price_ton)}
                            offeredTon={fmtGram(o.amount_ton)}
                            username={o.to_username}
                            name={o.to_name}
                            busy={busy}
                            busyAction={offerBusyAction}
                            onCancel={() => handleOfferAction(o, 'cancel')}
                          />
                        </div>
                      )
                    }
                    return (
                      <div key={`${o.kind}-${o.offer_id}`} className="card" style={{ padding: '10px 16px', marginBottom: 6 }}>
                        <div style={{ fontSize: 11, marginBottom: 6, fontWeight: 600, color: '#8a7fd6', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconSwap size={12} color="#8a7fd6" /> Ваше предложение
                        </div>
                        {tradeOfferGiftSide(user?.username || 'вы', o.offered_gifts, o.top_up_ton)}
                        <div style={{ textAlign: 'center', fontSize: 30, color: '#8a7fd6', fontWeight: 700, lineHeight: 1, margin: '6px 0' }}>⇅</div>
                        {tradeOfferGiftSide(o.to_username, o.target_gifts, 0)}
                        <button className="btn btn-ghost btn-full" style={{ fontSize: 12, padding: '8px', marginTop: 10 }}
                          disabled={busy} onClick={() => handleOfferAction(o, 'cancel')}>
                          {busy ? <MiniSpinAccent size={14} /> : 'Отменить предложение'}
                        </button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
          {item.label === 'История сделок' && showHistory && (
            <div style={{ marginBottom: 8 }}>
              {txs.length === 0 ? (
                <div className="card" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Сделок пока нет
                </div>
              ) : txs.map((tx, j) => {
                if (tx.kind === 'trade') {
                  // isFrom: я тот, кто предложил обмен (отдал offered_gifts, получил target_gifts).
                  const isFrom = tx.from_user_id === user?.id
                  const counterpart = isFrom ? tx.to_username : tx.from_username
                  const gaveGifts = isFrom ? (tx.offered_gifts || []) : (tx.target_gifts || [])
                  const gotGifts = isFrom ? (tx.target_gifts || []) : (tx.offered_gifts || [])
                  const grossTopUp = tx.top_up_ton || 0
                  const netTopUp = grossTopUp - (tx.fee_ton || 0)
                  const myUsername = user?.username || 'вы'
                  const giftSide = (username, gifts, amount, label) => (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        @{username}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {gifts.map((g, i) => {
                          const slug = giftSlug(g.gift_name, g.gift_number, g.nft_address)
                          const thumb = fragmentImage(g.gift_name, g.gift_number, g.nft_address)
                          const link = slug ? `https://t.me/nft/${slug}` : ''
                          return (
                            <div
                              key={i}
                              onClick={link ? () => { haptic('light'); openLink(link) } : undefined}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: link ? 'pointer' : 'default' }}
                            >
                              <div style={{
                                width: 34, height: 34, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                                flexShrink: 0, background: 'var(--bg-card-hover)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {thumb
                                  ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <span style={{ fontSize: 16 }}>🎁</span>}
                              </div>
                              <div style={{
                                fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {g.gift_name}{g.gift_number ? ` #${g.gift_number}` : ''}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {amount > 0 && (
                        <div style={{ textAlign: 'right', marginTop: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label} </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#3DDC84' }}>
                            +{fmtGram(amount)} <GramIcon size={18} />
                          </span>
                        </div>
                      )}
                    </div>
                  )
                  return (
                    <div key={`t${j}`} className="card" style={{ padding: '10px 16px', marginBottom: 6, border: '1px solid rgba(255, 255, 255, 0.30)' }}>
                      <div style={{
                        fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 4,
                      }}>
                        <span style={{ fontWeight: 600, color: '#8a7fd6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconSwap size={12} color="#8a7fd6" /> Обмен
                        </span>
                        {tx.completed_at && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                            {new Date(tx.completed_at).toLocaleDateString('ru-RU')}
                            {' '}
                            {new Date(tx.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {giftSide(
                        myUsername, gaveGifts,
                        grossTopUp > 0 ? (isFrom ? grossTopUp : netTopUp) : 0,
                        isFrom ? 'доплатил(а)' : 'получил(а)'
                      )}
                      <div style={{ textAlign: 'center', margin: '6px 0' }}>
                        <div style={{ fontSize: 30, color: '#8a7fd6', fontWeight: 700, lineHeight: 1 }}>⇅</div>
                        {tx.fee_ton > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>комиссия {fmtGram(tx.fee_ton)} <GramIcon size={17} /></div>
                        )}
                      </div>
                      {giftSide(
                        counterpart, gotGifts,
                        grossTopUp > 0 ? (isFrom ? netTopUp : grossTopUp) : 0,
                        isFrom ? 'получил(а)' : 'доплатил(а)'
                      )}
                    </div>
                  )
                }
                if (tx.kind === 'deposit' || tx.kind === 'withdrawal') {
                  // Движение средств — TxRow из дизайн-хендоффа (иконка-стрелка
                  // с гемом, бейдж статуса, гем-валюта у суммы)
                  const isDep = tx.kind === 'deposit'
                  const wdStatus = isDep ? null : ({
                    pending: ['в обработке', '#8f868c'],
                    sent: ['в обработке', '#8f868c'],
                    confirmed: ['выполнен', '#3DDC84'],
                    refunded: ['не выполнен', '#e8a13c', 'средства возвращены на баланс'],
                  }[tx.status] || [tx.status, '#8f868c'])
                  const date = tx.completed_at
                    ? `${new Date(tx.completed_at).toLocaleDateString('ru-RU')} ${new Date(tx.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                    : ''
                  return (
                    <div key={`m${j}`} style={{ marginBottom: 6 }}>
                      <TxRow
                        kind={isDep ? 'in' : 'out'}
                        label={isDep ? 'Пополнение' : 'Вывод средств'}
                        badge={wdStatus ? wdStatus[0] : null}
                        badgeColor={wdStatus ? wdStatus[1] : undefined}
                        sub={wdStatus ? wdStatus[2] : undefined}
                        date={date}
                        amount={`${isDep ? '+' : '−'}${fmtGram(tx.amount_ton)}`}
                        amountColor={isDep ? '#3DDC84' : '#FA4A66'}
                      />
                    </div>
                  )
                }
                if (tx.kind === 'ref') {
                  // Реферальное начисление: ваш реферал продал подарок,
                  // вам капнул 1% от суммы его продажи (из комиссии площадки)
                  const thumb = fragmentImage(tx.gift_name, tx.gift_number, tx.nft_address)
                  return (
                    <div
                      key={`r${j}`} className="card"
                      style={{ padding: '10px 16px', marginBottom: 6, border: '1px solid rgba(255, 255, 255, 0.30)', display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                        flexShrink: 0, background: 'var(--bg-card-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {thumb
                          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 18 }}>👥</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          <span style={{ fontWeight: 600, color: '#3ddc84' }}>👥 Реферал</span>
                          {tx.referral_username && <span>: @{tx.referral_username}</span>}
                        </div>
                        <div style={{
                          fontSize: 11, marginTop: 2, color: 'var(--text-muted)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          продал {tx.gift_name ? `${tx.gift_name}${tx.gift_number ? ` #${tx.gift_number}` : ''}` : 'подарок'}
                          {tx.sale_amount_ton != null && <> за {fmtGram(tx.sale_amount_ton)} <GramIcon size={17} /></>}
                        </div>
                        {tx.completed_at && (
                          <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)' }}>
                            {new Date(tx.completed_at).toLocaleDateString('ru-RU')}
                            {' '}
                            {new Date(tx.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0,
                        color: '#3DDC84',
                      }}>
                        +{fmtGram(tx.amount_ton)} <GramIcon size={19} />
                      </div>
                    </div>
                  )
                }
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
                    style={{ padding: '10px 16px', marginBottom: 6, border: '1px solid rgba(255, 255, 255, 0.30)', display: 'flex', alignItems: 'center', gap: 10, cursor: giftLink ? 'pointer' : 'default' }}
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
                        {tx.gift_name}{tx.gift_number ? ` #${tx.gift_number}` : ''}
                      </div>
                      <div style={{
                        fontSize: 11, marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        <span style={{ fontWeight: 600, color: isBuy ? '#FA4A66' : '#3DDC84' }}>
                          {isBuy ? 'Покупка' : 'Продажа'}
                        </span>
                        {counterpart && <span style={{ color: 'var(--text-primary)' }}>: @{counterpart}</span>}
                      </div>
                      {tx.completed_at && (
                        <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)' }}>
                          {new Date(tx.completed_at).toLocaleDateString('ru-RU')}
                          {' '}
                          {new Date(tx.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0,
                      color: isBuy ? '#FA4A66' : '#3DDC84',
                    }}>
                      {isBuy ? '−' : '+'}{fmtGram(displayAmount)} <GramIcon size={19} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
      </div>{/* /rd-menu */}
      </div>{/* /rd-body */}
    </div>
  )
}