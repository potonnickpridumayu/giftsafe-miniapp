// Знак Rubuy (выбор 2026-07-10): строчная r + скруглённый ромбик-блик.
// Ромбик сознательно мягкий и НЕ гранёный — гранёный бриллиант в приложении
// занят иконкой валюты GRAM. Искру не используем: четырёхлучевая искра
// читается как «кнопка ИИ» (Gemini и т.п.).
function RubyGem({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <text
        x="13" y="26" textAnchor="middle"
        fontSize="26" fontWeight="700"
        fontFamily="var(--font-display)"
        fill="var(--gold)"
      >r</text>
      <rect
        x="19" y="4.5" width="7.6" height="7.6" rx="2.4"
        fill="var(--gold-light)"
        transform="rotate(45 22.8 8.3)"
      />
    </svg>
  )
}

export default function BrandLogo({ size = 26, showWord = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <RubyGem size={size} />
      {showWord && <span className="brand-word">ruby</span>}
    </div>
  )
}

export { RubyGem }
