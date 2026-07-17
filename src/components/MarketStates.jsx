// Состояния маркета (ошибка/пусто/недостаточно средств/оффер) — перенос 1:1
// из дизайн-хендоффа market-states.jsx (ре-дизайн ruby). Цвета, размеры,
// радиусы, тени и тайминги финальные — захардкожены нарочно. Keyframes ms*
// в global.css. Валюта — наш GramIcon (тот же гем, что уже везде в приложении),
// не отдельный assets/gem.png, по прежней договорённости из статус-иконок.
import GramIcon from './GramIcon'
import { IconSwap, OwnerAvatar } from './StatusIcons'

const ACC = '#FA4A66'

function Illo({ children, glow = true }) {
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      {glow && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 190, height: 190,
          transform: 'translate(-50%,-50%)', borderRadius: '999px',
          background: `radial-gradient(circle, ${ACC}30 0%, transparent 65%)`,
          animation: 'msGlow 3.2s ease-in-out infinite', pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0, animation: 'msFloat 3.4s ease-in-out infinite' }}>
        {children}
      </div>
    </div>
  )
}

// ── Ошибка загрузки: тайл маркета + разорванное кольцо-соединение ──
export function IlloError() {
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      <defs>
        <linearGradient id="msErrTile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f42" />
          <stop offset="1" stopColor="#241c2b" />
        </linearGradient>
      </defs>
      {/* разорванное кольцо (нет соединения) */}
      <g style={{ animation: 'msSpinR 12s linear infinite', transformOrigin: '70px 70px' }}>
        <circle cx={70} cy={70} r={56} fill="none" stroke={`${ACC}55`} strokeWidth={4}
          strokeLinecap="round" strokeDasharray="18 16" style={{ animation: 'msDash 6s linear infinite' }} />
      </g>
      {/* тайл-«карточка маркета» */}
      <rect x={38} y={42} width={64} height={56} rx={14} fill="url(#msErrTile)" stroke="#4a3d52" strokeWidth={2} />
      <path d="M38 62 H102" stroke="#191420" strokeWidth={3} />
      {/* «крест-разрыв» диагональю */}
      <path d="M52 76 L88 76" stroke="#4a3d52" strokeWidth={4} strokeLinecap="round" />
      <path d="M52 88 L76 88" stroke="#4a3d52" strokeWidth={4} strokeLinecap="round" />
      {/* бейдж-восклицание */}
      <g style={{ animation: 'msPop 2.2s ease-in-out infinite', transformOrigin: '100px 46px' }}>
        <circle cx={100} cy={46} r={16} fill={ACC} />
        <path d="M100 39 v8" stroke="#fff" strokeWidth={3.6} strokeLinecap="round" />
        <circle cx={100} cy={53} r={2.1} fill="#fff" />
      </g>
    </svg>
  )
}

// ── Лот не найден: фирменный кейс, внутри — призрачный контур гема + «?» ──
export function IlloMissing() {
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      <defs>
        <linearGradient id="msCase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f42" />
          <stop offset="1" stopColor="#241c2b" />
        </linearGradient>
      </defs>
      <path d="M56 46 v-8 a8 8 0 0 1 8-8 h12 a8 8 0 0 1 8 8 v8" fill="none" stroke="#4a3d52" strokeWidth={5} strokeLinecap="round" />
      <rect x={26} y={46} width={88} height={60} rx={16} fill="url(#msCase)" stroke="#4a3d52" strokeWidth={2} />
      <path d="M26 72 H114" stroke="#191420" strokeWidth={3} />
      {/* призрачный ромб (пустое место лота) */}
      <rect x={60} y={62} width={20} height={20} rx={5} transform="rotate(45 70 72)" fill="none" stroke={`${ACC}66`} strokeWidth={2.4} strokeDasharray="5 5" />
      {/* «?» бейдж */}
      <g style={{ animation: 'msPop 2.6s ease-in-out infinite', transformOrigin: '104px 100px' }}>
        <circle cx={104} cy={100} r={17} fill={ACC} />
        <path d="M99 95 a5 5 0 1 1 6.5 7 c-1.6 1.2 -1.6 2.4 -1.6 4" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={103.9} cy={110} r={2} fill="#fff" />
      </g>
    </svg>
  )
}

// ── Ничего не найдено: лупа + гем в линзе, лёгкое «сканирование» ──
export function IlloSearch() {
  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <div style={{ position: 'absolute', inset: 0, animation: 'msScan 3.4s ease-in-out infinite' }}>
        <svg viewBox="0 0 140 140" width={140} height={140}>
          <circle cx={62} cy={60} r={34} fill="#14101a" stroke={ACC} strokeWidth={6} />
          <circle cx={62} cy={60} r={34} fill={`${ACC}10`} />
          <path d="M88 86 L112 110" stroke={ACC} strokeWidth={9} strokeLinecap="round" />
          {/* призрачный ромб внутри линзы */}
          <rect x={53} y={51} width={18} height={18} rx={5} transform="rotate(45 62 60)" fill="none" stroke={`${ACC}77`} strokeWidth={2.2} strokeDasharray="4 5" />
        </svg>
      </div>
    </div>
  )
}

// ── Сделок пока не было: лоток входящих + стрелки обмена сверху ──
export function IlloDeals() {
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      <defs>
        <linearGradient id="msTray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f42" />
          <stop offset="1" stopColor="#241c2b" />
        </linearGradient>
      </defs>
      {/* орбита стрелок обмена */}
      <g style={{ animation: 'msSpin 9s linear infinite', transformOrigin: '70px 52px' }}>
        <path d="M70 22 A30 30 0 0 1 100 52" fill="none" stroke={`${ACC}88`} strokeWidth={3.6} strokeLinecap="round" />
        <path d="M95 40 L100 52 L88 54" fill="none" stroke={`${ACC}88`} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M70 82 A30 30 0 0 1 40 52" fill="none" stroke={`${ACC}88`} strokeWidth={3.6} strokeLinecap="round" />
        <path d="M45 64 L40 52 L52 50" fill="none" stroke={`${ACC}88`} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* лоток */}
      <path d="M24 86 L34 68 H106 L116 86" fill="none" stroke="#4a3d52" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M24 86 V104 a8 8 0 0 0 8 8 H108 a8 8 0 0 0 8 -8 V86 H92 l-6 8 H54 l-6 -8 Z" fill="url(#msTray)" stroke="#4a3d52" strokeWidth={2} strokeLinejoin="round" />
      {/* ромб-гем в центре */}
      <g style={{ animation: 'msPop 2.8s ease-in-out infinite', transformOrigin: '70px 52px' }}>
        <rect x={60} y={42} width={20} height={20} rx={5} transform="rotate(45 70 52)" fill={ACC} />
        <rect x={65} y={47} width={10} height={10} rx={2.5} transform="rotate(45 70 52)" fill="#ff8ba0" />
      </g>
    </svg>
  )
}

// ── Общий каркас экрана-состояния (растянут на ширину контейнера — в
// хендоффе 420px фикс, здесь по требованию «на ширину контейнера») ──
export default function StateCard({ illo, title, sub, cta, ctaVariant = 'solid', onCta }) {
  const ctaStyles = {
    solid: { background: `linear-gradient(180deg, ${ACC}, #e02547)`, color: '#fff', boxShadow: `0 12px 30px -8px ${ACC}aa`, border: 'none' },
    ghost: { background: '#1a1420', color: '#F5F2F4', border: '1px solid #2a2230', boxShadow: 'none' },
  }
  return (
    <div style={{
      width: '100%', minHeight: 380, borderRadius: 24, padding: '52px 36px 44px', boxSizing: 'border-box',
      background: 'radial-gradient(120% 100% at 50% 0%, #14101a 0%, #0b090e 70%)', border: '1px solid #241c2b',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    }}>
      <Illo>{illo}</Illo>
      <div style={{ marginTop: 28, fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 700, color: '#F5F2F4' }}>{title}</div>
      <div style={{ marginTop: 12, fontSize: 15.5, color: '#8f868c', lineHeight: 1.5, maxWidth: 320 }}>{sub}</div>
      {cta && (
        <button
          onClick={onCta}
          style={{
            marginTop: 30, padding: '15px 40px', borderRadius: 999, fontSize: 16.5, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)',
            ...ctaStyles[ctaVariant],
          }}
        >
          {cta}
        </button>
      )}
    </div>
  )
}

// ── Баннер «Недостаточно средств» + кнопка «Пополнить баланс» ──
export function InsufficientFundsBanner({ onDeposit }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 16,
        background: `linear-gradient(180deg, ${ACC}1c, ${ACC}0d)`, border: `1px solid ${ACC}44`,
      }}>
        <div style={{
          width: 24, height: 24, flexShrink: 0, borderRadius: 8, marginTop: 1,
          background: `${ACC}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width={15} height={15}>
            <path d="M12 5 v8" stroke={ACC} strokeWidth={2.6} strokeLinecap="round" />
            <circle cx={12} cy={18} r={1.5} fill={ACC} />
          </svg>
        </div>
        <div style={{ textAlign: 'left', fontSize: 14.5, lineHeight: 1.45 }}>
          <div style={{ color: '#F5F2F4', fontWeight: 600 }}>Недостаточно средств</div>
          <div style={{ color: '#a99fa8', marginTop: 2 }}>Пополните баланс, чтобы купить лот</div>
        </div>
      </div>
      <button
        onClick={onDeposit}
        style={{
          padding: '15px 0', borderRadius: 999, textAlign: 'center', cursor: 'pointer',
          background: '#1a1420', border: '1px solid #2a2230', color: '#F5F2F4', fontSize: 16, fontWeight: 600,
          fontFamily: 'var(--font-display)',
        }}
      >
        Пополнить баланс
      </button>
    </div>
  )
}

// ── Карточка денежного оффера на лот. Компактная (по размерам истории
// сделок). variant: 'incoming' (мне предложили — Принять/Отклонить) или
// 'outgoing' (я предложил — Отменить). Пропсы busy рисуют спиннер внутри. ──
export function OfferCard({
  variant = 'incoming', giftTitle, priceTon, offeredTon, username,
  onAccept, onDecline, onCancel, busy,
}) {
  const incoming = variant === 'incoming'
  const discount = priceTon > 0 ? Math.round((1 - offeredTon / priceTon) * 100) : 0
  const btn = (label, kind, onClick) => (
    <button
      className="btn"
      onClick={!busy ? onClick : undefined}
      disabled={busy}
      style={{
        flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 13, fontWeight: 600,
        ...(kind === 'accept'
          ? { background: `linear-gradient(180deg, ${ACC}, #e02547)`, color: '#fff', boxShadow: `0 8px 20px -10px ${ACC}aa` }
          : { background: '#181320', color: '#a99fa8', border: '1px solid #2a2230' }),
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      width: '100%', borderRadius: 16, padding: '12px 14px', boxSizing: 'border-box',
      background: 'radial-gradient(130% 120% at 20% 0%, #17121e 0%, #0c0a10 75%)', border: `1px solid ${ACC}33`,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* шапка */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, flexShrink: 0, borderRadius: 10,
          background: `linear-gradient(160deg, ${ACC}, #e02547)`, boxShadow: `0 6px 14px -8px ${ACC}aa`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconSwap size={17} color="#fff" spin={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 10.5, color: ACC, fontWeight: 600, letterSpacing: '.02em' }}>
            {incoming ? 'Предложили цену' : 'Ваше предложение'}
          </div>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: '#F5F2F4', marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {giftTitle}
          </div>
        </div>
      </div>
      {/* цена */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12,
        background: '#0e0b12', border: '1px solid #1e1826',
      }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, color: '#655c6b', marginBottom: 2 }}>Цена лота</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a99fa8', display: 'flex', alignItems: 'center', gap: 4 }}>
            {priceTon} <GramIcon size={14} />
          </div>
        </div>
        <div style={{ color: `${ACC}cc`, fontSize: 17, fontWeight: 700, margin: '0 2px' }}>→</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, color: '#655c6b', marginBottom: 2 }}>Предложено</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: ACC, display: 'flex', alignItems: 'center', gap: 4 }}>
            {offeredTon} <GramIcon size={14} />
          </div>
        </div>
        {discount > 0 && (
          <div style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#ffb84d',
            background: '#ffb84d1a', padding: '3px 8px', borderRadius: 999, flexShrink: 0,
          }}>
            −{discount}%
          </div>
        )}
      </div>
      {/* от кого / кому */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <OwnerAvatar username={username} size={26} fallback="letter" />
        <span style={{ fontSize: 12, color: '#8f868c' }}>{incoming ? 'От' : 'Кому'}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F2F4' }}>@{username}</span>
      </div>
      {/* кнопки */}
      {incoming ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {btn(busy ? '…' : 'Принять', 'accept', onAccept)}
          {btn(busy ? '…' : 'Отклонить', 'decline', onDecline)}
        </div>
      ) : (
        btn(busy ? '…' : 'Отменить предложение', 'decline', onCancel)
      )}
    </div>
  )
}
