// Значок Gram — рубин. Ставится после числовых значений
// вместо текста "TON"/"Gram" (в тестнете валюта Gram, в проде масштабируется).
export default function GramIcon({ size = 14, style }) {
  return (
    <img
      src="/ruby-gem-256.png"
      width={size}
      height={size}
      style={{ verticalAlign: '-2px', flexShrink: 0, marginLeft: -4, ...style }}
      alt="Gram"
    />
  )
}
