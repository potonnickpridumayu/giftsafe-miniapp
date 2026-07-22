// Значок «Активность маркета» — эквалайзер. Столбики пляшут ВСЕГДА (по умолчанию):
// это простой «живой» индикатор без опроса ленты. Раньше пробовали оживлять
// только на новых событиях маркета — выходило с задержкой и багануло на
// переходах между вкладками, поэтому по просьбе пользователя оставили
// постоянную анимацию.
export default function MarketActivityIcon({ size = 22 }) {
  return (
    <svg
      className="mkt-eq"
      viewBox="0 0 24 24" width={size} height={size}
      fill="currentColor" aria-hidden="true"
    >
      <rect className="eqb eqb1" x="3.4"  y="9"   width="2.8" height="9"   rx="1.4" />
      <rect className="eqb eqb2" x="8.6"  y="6"   width="2.8" height="12"  rx="1.4" />
      <rect className="eqb eqb3" x="13.8" y="9.5" width="2.8" height="8.5" rx="1.4" />
      <rect className="eqb eqb4" x="18.6" y="5"   width="2.8" height="13"  rx="1.4" />
    </svg>
  )
}
