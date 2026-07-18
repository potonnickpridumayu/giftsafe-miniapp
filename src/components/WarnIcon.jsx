// Фирменный значок предупреждения (замена жёлтого треугольника ⚠️): красный
// скруглённый бейдж с восклицательным знаком. Перенос 1:1 из дизайн-хендоффа
// «Ruby Warning Banner». Цвет строго акцентный #FA4A66, никакого жёлтого.
// (fontFamily из хендоффа — Onest; в проекте он не подключён, поэтому текст
// наследует шрифт приложения, всё остальное — как в референсе.)
export function WarnIcon({ size = 26 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: 8,
      background: '#FA4A6626',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58}>
        <path d="M12 6 v7" stroke="#FA4A66" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="12" cy="17.5" r="1.5" fill="#FA4A66" />
      </svg>
    </div>
  )
}

// Баннер-предупреждение целиком (значок + текст) в фирменном красном.
export default function WarnBanner({ children, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 16px', borderRadius: 14,
      background: 'linear-gradient(180deg, #FA4A661c, #FA4A660d)',
      border: '1px solid #FA4A6644',
      fontSize: 14.5, color: '#F5F2F4', fontWeight: 500,
      ...style,
    }}>
      <WarnIcon />
      <div>{children}</div>
    </div>
  )
}
