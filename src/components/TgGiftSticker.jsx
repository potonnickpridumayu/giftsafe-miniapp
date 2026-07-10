import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

// Официальная раскладка узора с t.me/nft/{slug}: 18 иконок, координаты /
// масштаб / прозрачность скопированы из телеграмовского SVG (canvas 420x280,
// иконка 100x100). Одинакова для всех подарков — меняются только цвета и
// сама иконка. НЕ подбирать руками — это точные значения Telegram.
const PATTERN_SPOTS = [
  [140.5761, 13.79, 0.3, 0.2129],
  [249.465, 13.79, 0.3, 0.2129],
  [291.8539, 102.7918, 0.3, 0.2239],
  [98.1872, 102.7918, 0.3, 0.2239],
  [276.2551, 176.2043, 0.277, 0.2216],
  [196.144, 188.6412, 0.277, 0.123],
  [116.0329, 176.2043, 0.277, 0.2216],
  [355.0988, 79.3286, 0.2247, 0.1896],
  [292.0988, 52.1228, 0.2247, 0.2609],
  [334.0988, 17.5326, 0.2247, 0.1464],
  [198.7654, -5.7866, 0.2247, 0.1531],
  [63.4321, 17.5326, 0.2247, 0.1453],
  [105.4321, 52.1228, 0.2247, 0.2609],
  [42.4321, 79.3286, 0.2247, 0.1659],
  [72.7654, 155.8935, 0.2247, 0.1659],
  [49.4321, 205.6413, 0.2247, 0.105],
  [344.2099, 205.6413, 0.2247, 0.105],
  [337.2099, 155.8935, 0.2247, 0.1527],
]

/**
 * Карточка подарка, собранная как на официальной странице t.me/nft/{slug}:
 * телеграмовский радиальный градиент + их же раскладка узора (SVG выше) +
 * сам стикер из Telegram, по умолчанию остановленный на ПЕРВОМ КАДРЕ
 * анимации. Статика и анимация — один и тот же рендер.
 *  - тап (interactive): проиграть анимацию один раз;
 *  - autoPlay: проиграть один раз сразу после загрузки;
 *  - interactive={false} (гриды Маркета/Обмена): тап не перехватывается,
 *    карточка открывается как обычно.
 * Пока tgs не догрузился (или его нет) — официальный JPG с Fragment.
 */
export default function TgGiftSticker({ stickerId, image = '', backdrop = null, fallback = '🎁', pad = '20%', autoPlay = false, interactive = true }) {
  const [ready, setReady] = useState(false)
  const instRef = useRef(null)
  const boxRef = useRef(null)
  // SVG-id глобальны на всю страницу — на гриде карточек много, id должны
  // быть уникальны, иначе все карточки возьмут градиент/узор первой.
  const uid = useRef('tgs' + Math.random().toString(36).slice(2, 8)).current

  let bd = null
  if (backdrop) {
    try { bd = typeof backdrop === 'string' ? JSON.parse(backdrop) : backdrop } catch { /* без фона */ }
  }
  const gradient = bd
    ? `radial-gradient(circle at 50% 42%, ${intHex(bd.center)}, ${intHex(bd.edge)})`
    : 'var(--bg-card-hover)'
  const patternUrl = bd?.pattern ? `${FILE_BASE}/${bd.pattern}` : ''
  const patternColor = bd?.symbol != null ? intHex(bd.symbol) : 'rgba(255,255,255,0.8)'

  useEffect(() => {
    if (!stickerId) return undefined
    let dead = false
    ;(async () => {
      try {
        const res = await fetch(`${FILE_BASE}/${stickerId}`)
        if (!res.ok) throw new Error()
        const buf = new Uint8Array(await res.arrayBuffer())
        const raw = (buf[0] === 0x1f && buf[1] === 0x8b) ? ungzip(buf) : buf
        const data = JSON.parse(new TextDecoder().decode(raw))
        if (dead || !boxRef.current) return
        const inst = lottie.loadAnimation({
          container: boxRef.current, renderer: 'svg',
          loop: false, autoplay: false, animationData: data,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        })
        inst.addEventListener('complete', () => inst.goToAndStop(0, true))
        inst.goToAndStop(0, true)
        instRef.current = inst
        setReady(true)
        if (autoPlay) inst.goToAndPlay(0, true)
      } catch { /* tgs не загрузился — остаёмся на статичном JPG */ }
    })()
    return () => {
      dead = true
      if (instRef.current) { instRef.current.destroy(); instRef.current = null }
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickerId])

  const play = (e) => {
    if (!instRef.current) return
    e.stopPropagation()
    instRef.current.goToAndPlay(0, true)
  }

  return (
    <div
      onClick={interactive ? play : undefined}
      style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', cursor: interactive && stickerId ? 'pointer' : 'default',
        background: gradient,
      }}
    >
      {/* Фон 1-в-1 как на t.me/nft: их градиент + их раскладка узора.
          slice кроппит горизонтальный холст 420x280 до нашего квадрата. */}
      {ready && bd && (
        <svg
          viewBox="0 0 420 280" preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <radialGradient id={uid + 'g'} cx="50%" cy="50%" fx="50%" fy="50%" r="69.65%" gradientTransform="translate(0.5, 0.5), scale(0.6667, 1), rotate(90), translate(-0.5, -0.5)">
              <stop stopColor={intHex(bd.center)} offset="0%" />
              <stop stopColor={intHex(bd.edge)} offset="100%" />
            </radialGradient>
            <filter id={uid + 'f'}>
              <feFlood floodColor={patternColor} />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
            {patternUrl && <image id={uid + 'i'} x="0" y="0" width="100" height="100" href={patternUrl} />}
          </defs>
          <rect x="0" y="0" width="420" height="280" fill={`url(#${uid}g)`} />
          {patternUrl && (
            /* Официальная раскладка сделана под банер с подписью снизу и
               смещена вверх; для квадратной карточки опускаем узор на 20
               единиц (~7% высоты), чтобы он стоял по центру. */
            <g filter={`url(#${uid}f)`} transform="translate(0, 20)">
              {PATTERN_SPOTS.map(([x, y, s, o], i) => (
                <g key={i} opacity={o} transform={`translate(${x}, ${y})`}>
                  <use href={`#${uid}i`} transform={`scale(${s})`} />
                </g>
              ))}
            </g>
          )}
        </svg>
      )}
      {/* Фолбэк, пока стикер не готов: официальная картинка или эмодзи */}
      {!ready && (image
        ? <img src={image} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
          }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>)}
      {/* Стикер: первый кадр по умолчанию, анимация по тапу/autoPlay */}
      <div ref={boxRef} style={{ position: 'absolute', inset: pad, opacity: ready ? 1 : 0 }} />
    </div>
  )
}
