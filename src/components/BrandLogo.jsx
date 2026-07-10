// Рубин восьмиугольной огранки (вид спереди): кольцо фасетов вокруг яркой
// «таблицы», свет сверху — верхние грани светлее, нижние глубже. Прежний
// силуэт (трапеция + остриё вниз) читался как алмаз 💎, а не рубин.
function RubyGem({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255, 45, 85, 0.55)) drop-shadow(0 0 14px rgba(255, 45, 85, 0.3))' }}
    >
      {/* кольцо фасетов: верх светлый → низ глубокий */}
      <polygon points="8,3 16,3 14.5,8 9.5,8" fill="#ff8ba1" />
      <polygon points="16,3 21,8 17,10.5 14.5,8" fill="var(--gold-light)" />
      <polygon points="21,8 21,16 17,13.5 17,10.5" fill="var(--gold)" />
      <polygon points="21,16 16,21 14.5,16 17,13.5" fill="var(--gold-deep)" />
      <polygon points="16,21 8,21 9.5,16 14.5,16" fill="#b30d38" />
      <polygon points="8,21 3,16 7,13.5 9.5,16" fill="var(--gold-deep)" />
      <polygon points="3,16 3,8 7,10.5 7,13.5" fill="var(--gold)" />
      <polygon points="3,8 8,3 9.5,8 7,10.5" fill="var(--gold-light)" />
      {/* таблица (центральная грань) + блик */}
      <polygon points="9.5,8 14.5,8 17,10.5 17,13.5 14.5,16 9.5,16 7,13.5 7,10.5" fill="#ff4d6f" />
      <polygon points="9.5,8.7 13.2,8.7 10.6,11 8.2,11" fill="#fff" opacity="0.4" />
      {/* искра */}
      <line x1="19.8" y1="1.4" x2="19.8" y2="3.8" stroke="var(--gold-light)" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="18.6" y1="2.6" x2="21" y2="2.6" stroke="var(--gold-light)" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  )
}

export default function BrandLogo({ size = 26, showWord = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <RubyGem size={size} />
      {showWord && <span className="brand-word">RUBUY</span>}
    </div>
  )
}

export { RubyGem }
