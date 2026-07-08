// Гранёный рубин — три facet-полигона вместо ромба-«алмаза», сам светится
// (drop-shadow на форме, без плашки) + искра-блик, чтобы читался как камень, а не иконка.
function RubyGem({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 0 6px rgba(255, 45, 85, 0.55)) drop-shadow(0 0 14px rgba(255, 45, 85, 0.3))' }}
    >
      <polygon points="8,5 16,5 21,10 3,10" fill="var(--gold-light)" />
      <polygon points="3,10 12,10 12,21" fill="var(--gold)" />
      <polygon points="12,10 21,10 12,21" fill="var(--gold-deep)" />
      <line x1="10" y1="6.4" x2="13" y2="8.4" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <line x1="17.5" y1="3" x2="17.5" y2="5.4" stroke="var(--gold-light)" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="16.3" y1="4.2" x2="18.7" y2="4.2" stroke="var(--gold-light)" strokeWidth="0.9" strokeLinecap="round" />
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
