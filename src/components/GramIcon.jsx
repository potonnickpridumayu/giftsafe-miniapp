// Значок Gram — рубин. Ставится после числовых значений
// вместо текста "TON"/"Gram" (в тестнете валюта Gram, в проде масштабируется).
export default function GramIcon({ size = 14, style }) {
  return (
    <img
      src="/ruby-gem-256.png"
      height={size}
      style={{ verticalAlign: 'middle', flexShrink: 0, marginLeft: -4, width: 'auto', ...style }}
      alt="Gram"
    />
  )
}
