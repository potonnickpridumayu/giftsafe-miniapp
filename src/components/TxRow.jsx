// Строка транзакции (пополнение/вывод) и её иконка — стиль из дизайн-хендоффа
// design_handoff_empty_states (ре-дизайн ruby), но габариты ужаты до остальных
// карточек истории (иконка 40×40, суммы 14px c GramIcon) по фидбеку 2026-07-17.
import GramIcon from './GramIcon'

const ACC = '#FA4A66'

// Иконка: скруглённый квадрат с мягким градиентом + стрелка с гемом.
// kind: 'in' — пополнение (зелёная, стрелка вниз), 'out' — вывод (красная, вверх)
export function TxIcon({ kind }) {
  const up = kind === 'out'
  const grad = up ? ['#2b1118', '#180a0f'] : ['#12241a', '#0a140f']
  const col = up ? ACC : '#3DDC84'
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 'var(--radius-md)', position: 'relative', flexShrink: 0,
      background: `linear-gradient(160deg, ${grad[0]}, ${grad[1]})`,
      boxShadow: `inset 0 0 0 1.5px ${col}33, 0 6px 18px -8px ${col}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 32 32" width={22} height={22}>
        {/* гем (ромб) */}
        <rect x={11.5} y={up ? 17.5 : 3.5} width={9} height={9} rx={2.4} transform={`rotate(45 16 ${up ? 22 : 8})`} fill={col} />
        <rect x={13.8} y={up ? 19.8 : 5.8} width={4.4} height={4.4} rx={1.2} transform={`rotate(45 16 ${up ? 22 : 8})`} fill="#fff" opacity={0.35} />
        {/* стрелка */}
        {up ? (
          <g stroke={col} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M16 13 V3.5" />
            <path d="M10.5 8.5 L16 3 L21.5 8.5" />
          </g>
        ) : (
          <g stroke={col} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M16 18.5 V28.5" />
            <path d="M10.5 23.5 L16 29 L21.5 23.5" />
          </g>
        )}
      </svg>
    </div>
  )
}

// badgeColor — цвет статуса; в референсе бейдж зелёный (#3DDC84), для других
// статусов («в обработке», «возвращён на баланс») тот же pill со своим цветом
export default function TxRow({ kind, label, badge, badgeColor = '#3DDC84', date, amount, amountColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '10px 16px', borderRadius: 20, background: '#100d14', border: '1px solid #1e1826',
    }}>
      <TxIcon kind={kind} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F2F4' }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: badgeColor,
              background: `${badgeColor}22`, padding: '1px 7px', borderRadius: 999,
            }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#655c6b' }}>{date}</span>
      </div>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: amountColor,
      }}>
        {amount} <GramIcon size={19} />
      </span>
    </div>
  )
}
