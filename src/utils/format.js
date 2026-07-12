// Денежный формат: округление до 4 знаков (точность бэкенд-леджера, round4)
// с обрезкой хвостовых нулей — комиссия 0.0126 видна как есть, а не "0.01";
// 0.42 → "0.42", 60 → "60". Эпсилон гасит float-хвосты (0.9288999… → "0.9289").
export const fmtGram = (n) => {
  const v = Math.round((Number(n) || 0) * 1e4 + 1e-7) / 1e4
  return String(v)
}

// Редкость атрибута: на входе промилле (rarity_per_mille из TG), на выходе
// проценты — целое без хвоста ("1%"), дробное с одним знаком ("0.3%").
export const fmtPercent = (permille) => {
  const v = (Number(permille) || 0) / 10
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
