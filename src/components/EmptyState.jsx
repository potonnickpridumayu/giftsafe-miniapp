// Empty-state иллюстрации и шаблон карточки — перенос 1:1 из дизайн-хендоффа
// design_handoff_empty_states (ре-дизайн ruby). Цвета/размеры/анимации менять
// нельзя — они финальные, поэтому захардкожены, а не через CSS-переменные.
// Keyframes rbFloat/rbGlow/rbSpin/rbDash/rbPop живут в styles/global.css.

const ACC = '#FA4A66'

function Illo({ children, glow = true }) {
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      {glow && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 190, height: 190,
          transform: 'translate(-50%,-50%)', borderRadius: '999px',
          background: `radial-gradient(circle, ${ACC}33 0%, transparent 65%)`,
          animation: 'rbGlow 3.2s ease-in-out infinite', pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0, animation: 'rbFloat 3.2s ease-in-out infinite' }}>
        {children}
      </div>
    </div>
  )
}

// «Пока нет объявлений» — ценник на верёвочке с плюсом
export function IlloListing() {
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      <defs>
        <linearGradient id="lgTag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2f42" />
          <stop offset="1" stopColor="#241c2b" />
        </linearGradient>
      </defs>
      {/* ценник (повёрнутый) */}
      <g transform="rotate(-14 70 74)">
        <rect x={30} y={44} width={80} height={60} rx={14} fill="url(#lgTag)" stroke="#4a3d52" strokeWidth={2} />
        <circle cx={70} cy={44} r={9} fill="#0d0b10" stroke="#4a3d52" strokeWidth={2} />
        <path d="M70 22 L70 40" stroke="#4a3d52" strokeWidth={3} strokeLinecap="round" />
        {/* пунктирная «пустая строка» цены */}
        <path d="M44 68 H96" stroke={`${ACC}55`} strokeWidth={4} strokeLinecap="round" strokeDasharray="10 8" style={{ animation: 'rbDash 5s linear infinite' }} />
        <path d="M44 84 H78" stroke="#4a3d52" strokeWidth={4} strokeLinecap="round" />
      </g>
      {/* плюс-бейдж */}
      <g style={{ animation: 'rbPop 2.4s ease-in-out infinite', transformOrigin: '104px 100px' }}>
        <circle cx={104} cy={100} r={17} fill={ACC} />
        <path d="M104 92 v16 M96 100 h16" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      </g>
    </svg>
  )
}

// «Нет подарков на обмен» — два подарка и стрелки по кругу
export function IlloSwap() {
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      {/* орбита стрелок */}
      <g style={{ animation: 'rbSpin 9s linear infinite', transformOrigin: '70px 70px' }}>
        <path d="M70 16 A54 54 0 0 1 124 70" fill="none" stroke={`${ACC}88`} strokeWidth={4} strokeLinecap="round" />
        <path d="M118 56 L124 70 L110 72" fill="none" stroke={`${ACC}88`} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M70 124 A54 54 0 0 1 16 70" fill="none" stroke={`${ACC}88`} strokeWidth={4} strokeLinecap="round" />
        <path d="M22 84 L16 70 L30 68" fill="none" stroke={`${ACC}88`} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* подарок слева-снизу */}
      <g transform="translate(34 66) rotate(-8)">
        <rect x={0} y={8} width={34} height={28} rx={7} fill="#3a2f42" />
        <rect x={14} y={8} width={6} height={28} fill={ACC} />
        <rect x={-2} y={2} width={38} height={10} rx={5} fill="#4a3d52" />
        <circle cx={17} cy={2} r={5} fill={ACC} />
      </g>
      {/* подарок справа-сверху (светлый) */}
      <g transform="translate(72 36) rotate(10)">
        <rect x={0} y={8} width={34} height={28} rx={7} fill="#F4EEF1" />
        <rect x={14} y={8} width={6} height={28} fill={ACC} />
        <rect x={-2} y={2} width={38} height={10} rx={5} fill="#fff" />
        <circle cx={17} cy={2} r={5} fill={ACC} />
      </g>
    </svg>
  )
}

// «Портфель пуст» — фирменный кейс с гемом-замком
export function IlloCase() {
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      <defs>
        <linearGradient id="lgCase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f42" />
          <stop offset="1" stopColor="#241c2b" />
        </linearGradient>
      </defs>
      {/* ручка */}
      <path d="M56 44 v-8 a8 8 0 0 1 8-8 h12 a8 8 0 0 1 8 8 v8" fill="none" stroke="#4a3d52" strokeWidth={5} strokeLinecap="round" />
      {/* корпус */}
      <rect x={26} y={44} width={88} height={62} rx={16} fill="url(#lgCase)" stroke="#4a3d52" strokeWidth={2} />
      {/* линия крышки */}
      <path d="M26 70 H114" stroke="#191420" strokeWidth={3} />
      {/* гем-замочек (ромб бренда) */}
      <g style={{ animation: 'rbPop 2.8s ease-in-out infinite', transformOrigin: '70px 72px' }}>
        <rect x={58} y={60} width={24} height={24} rx={6} transform="rotate(45 70 72)" fill={ACC} />
        <rect x={64} y={66} width={12} height={12} rx={3} transform="rotate(45 70 72)" fill="#ff8ba0" />
      </g>
    </svg>
  )
}

// Общий шаблон empty-state: карточка на всю ширину контейнера
// (в референсе 420px — по хендоффу растягиваем, сохраняя отступы и размеры)
export default function EmptyState({ illo, title, sub, cta, onCta }) {
  return (
    <div style={{
      width: '100%', minHeight: 430, borderRadius: 24, padding: '48px 36px 40px',
      background: 'radial-gradient(120% 100% at 50% 0%, #14101a 0%, #0b090e 70%)',
      border: '1px solid #241c2b',
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    }}>
      <Illo>{illo}</Illo>
      <div style={{ marginTop: 30, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#F5F2F4' }}>
        {title}
      </div>
      <div style={{ marginTop: 12, fontSize: 15.5, color: '#8f868c', lineHeight: 1.45, maxWidth: 330 }}>
        {sub}
      </div>
      {cta && (
        <button
          onClick={onCta}
          style={{
            marginTop: 28, padding: '15px 34px', borderRadius: 999, border: 'none',
            background: `linear-gradient(180deg, ${ACC}, #e02547)`,
            boxShadow: `0 10px 30px -8px ${ACC}aa`, color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {cta}
        </button>
      )}
    </div>
  )
}
