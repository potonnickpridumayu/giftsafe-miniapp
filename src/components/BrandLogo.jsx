// Гранёный рубин — три facet-полигона вместо ромба-«алмаза»,
// чтобы логотип реально читался как рубин (Ruby → Rubuy), а не как дженерик-иконка.
function RubyGem({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points="8,5 16,5 21,10 3,10" fill="var(--gold-light)" />
      <polygon points="3,10 12,10 12,21" fill="var(--gold)" />
      <polygon points="12,10 21,10 12,21" fill="var(--gold-deep)" />
      <line x1="10" y1="6.4" x2="13" y2="8.4" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export default function BrandLogo({ size = 34, showWord = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="brand-badge" style={{ width: size, height: size }}>
        <RubyGem size={Math.round(size * 0.58)} />
      </div>
      {showWord && <span className="brand-word">RUBUY</span>}
    </div>
  )
}

export { RubyGem }
