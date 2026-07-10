// Знак Rubuy: разорванное кольцо с искрой в зазоре + внутреннее тонкое
// кольцо + контурный рубин восьмиугольной огранки, линии в рубиновом
// градиенте. Камень сознательно НЕ бриллиант — бриллиант в приложении занят
// иконкой валюты GRAM, у бренда своя огранка.
function RubyGem({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255, 45, 85, 0.45)) drop-shadow(0 0 12px rgba(255, 45, 85, 0.25))' }}
    >
      <defs>
        <linearGradient id="rbLogoG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8ba1" />
          <stop offset="1" stopColor="#e01640" />
        </linearGradient>
      </defs>
      {/* внешнее кольцо с разрывом вверху справа — там сидит искра */}
      <path d="M12,2.6 A9.4,9.4 0 1 0 20.14,7.3" fill="none" stroke="url(#rbLogoG)" strokeWidth="1.2" strokeLinecap="round" />
      {/* внутреннее кольцо */}
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="url(#rbLogoG)" strokeWidth="0.6" opacity="0.55" />
      {/* восьмиугольный рубин: внешний контур, таблица, четыре ребра */}
      <g fill="none" stroke="url(#rbLogoG)" strokeWidth="1.25" strokeLinejoin="round">
        <polygon points="9.9,7.7 14.1,7.7 16.7,10.3 16.7,14.1 14.1,16.7 9.9,16.7 7.3,14.1 7.3,10.3" />
        <polygon points="10.8,9.8 13.2,9.8 14.6,11.2 14.6,13.2 13.2,14.6 10.8,14.6 9.4,13.2 9.4,11.2" />
        <path d="M9.9,7.7 L10.8,9.8 M14.1,7.7 L13.2,9.8 M14.1,16.7 L13.2,14.6 M9.9,16.7 L10.8,14.6" />
      </g>
      {/* искра в разрыве кольца */}
      <path d="M17.3,2.5 C17.55,3.8 18.2,4.45 19.5,4.7 C18.2,4.95 17.55,5.6 17.3,6.9 C17.05,5.6 16.4,4.95 15.1,4.7 C16.4,4.45 17.05,3.8 17.3,2.5 Z" fill="#ff8ba1" />
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
