import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

// Гашение узора к центру карточки (там стикер) — как на рендере Telegram.
const FADE = 'radial-gradient(circle at 50% 46%, transparent 26%, #000 55%)'

/**
 * Карточка подарка в стиле Telegram/Portals: фон собирается из атрибутов
 * подарка (градиент из цветов фона + узор из иконки-символа), поверх — сам
 * стикер из Telegram, по умолчанию остановленный на ПЕРВОМ КАДРЕ анимации.
 * Статика и анимация — один и тот же рендер, поэтому при проигрывании ничего
 * не меняется и не замыливается.
 *  - тап (interactive): проиграть анимацию один раз;
 *  - autoPlay: проиграть один раз сразу после загрузки;
 *  - interactive={false} (гриды Маркета/Обмена): тап не перехватывается,
 *    карточка открывается как обычно.
 * Пока tgs не догрузился (или его нет) — официальный JPG с Fragment.
 */
export default function TgGiftSticker({ stickerId, image = '', backdrop = null, fallback = '🎁', pad = '20%', autoPlay = false, interactive = true }) {
  const [ready, setReady] = useState(false)
  const [patternTile, setPatternTile] = useState('')
  const instRef = useRef(null)
  const boxRef = useRef(null)

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

    // Плитка узора: маленькая иконка в шахматном порядке с промежутками.
    // crossOrigin обязателен — иначе canvas «грязный» и toDataURL не отдаст.
    if (patternUrl) {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => {
        if (dead) return
        try {
          const S = 256
          const c = document.createElement('canvas'); c.width = S; c.height = S
          const x = c.getContext('2d')
          const isz = S * 0.42
          for (const [cx, cy] of [[S * 0.25, S * 0.25], [S * 0.75, S * 0.75]]) {
            x.drawImage(im, cx - isz / 2, cy - isz / 2, isz, isz)
          }
          setPatternTile(c.toDataURL())
        } catch { /* без узора — просто градиент */ }
      }
      im.src = patternUrl
    }

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
      {ready && patternTile && (
        <div style={{
          position: 'absolute', inset: 0,
          maskImage: FADE, WebkitMaskImage: FADE,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: patternColor, opacity: 0.3,
            maskImage: `url(${patternTile})`, WebkitMaskImage: `url(${patternTile})`,
            maskSize: '25% 25%', WebkitMaskSize: '25% 25%',
            maskRepeat: 'repeat', WebkitMaskRepeat: 'repeat',
          }} />
        </div>
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
