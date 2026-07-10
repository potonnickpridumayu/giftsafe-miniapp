import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

/**
 * Подарок Telegram: статичная официальная картинка (фон+узор+стикер с
 * nft.fragment.com), а по тапу проигрывается анимация стикера.
 *  - autoPlay: проиграть один раз при появлении (страница товара).
 *  - тап: проиграть снова (страница товара, портфель).
 *
 * На время анимации JPG прячется ЦЕЛИКОМ, а фон собирается заново из атрибутов
 * подарка, как это делает сам Telegram (и Portals): градиент из цветов фона +
 * узор из иконки-символа (webp-миниатюра, затонированная символьным цветом
 * через CSS-маску). Всё рисуется нативно в разрешении экрана, поэтому во время
 * анимации ничего не замыливается — в отличие от прежнего подхода с вырезанием
 * дырки в низкорезном JPG. lottie грузится ЛЕНИВО (при первом проигрыше).
 */
export default function TgGiftSticker({ stickerId, image = '', backdrop = null, fallback = '🎁', pad = '20%', autoPlay = false }) {
  const [playing, setPlaying] = useState(false)
  const [patternTile, setPatternTile] = useState('')
  const instRef = useRef(null)
  const boxRef = useRef(null)
  const loadingRef = useRef(false)
  const tileRef = useRef('')

  let bd = null
  if (backdrop) {
    try { bd = typeof backdrop === 'string' ? JSON.parse(backdrop) : backdrop } catch { /* без фона */ }
  }
  const gradient = bd
    ? `radial-gradient(circle at 50% 42%, ${intHex(bd.center)}, ${intHex(bd.edge)})`
    : 'var(--bg-card-hover)'
  const patternUrl = bd?.pattern ? `${FILE_BASE}/${bd.pattern}` : ''
  const patternColor = bd?.symbol != null ? intHex(bd.symbol) : 'rgba(255,255,255,0.8)'

  // Плитка узора как на официальной карточке Fragment: маленькая иконка в
  // шахматном порядке с промежутками (2 иконки по диагонали плитки). Голый
  // repeat самой иконки даёт слишком крупный и плотный узор — не как в TG.
  // Обязательно crossOrigin: canvas с «грязной» картинкой не отдаст toDataURL,
  // а CSS mask-image и так грузится в CORS-режиме.
  const buildPatternTile = () => new Promise((resolve) => {
    if (!patternUrl) return resolve('')
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      try {
        const S = 256
        const c = document.createElement('canvas'); c.width = S; c.height = S
        const x = c.getContext('2d')
        const isz = S * 0.42
        for (const [cx, cy] of [[S * 0.25, S * 0.25], [S * 0.75, S * 0.75]]) {
          x.drawImage(im, cx - isz / 2, cy - isz / 2, isz, isz)
        }
        resolve(c.toDataURL())
      } catch { resolve('') }
    }
    im.onerror = () => resolve('')
    im.src = patternUrl
  })

  const startPlay = async () => {
    if (!stickerId) return
    if (instRef.current) {
      setPlaying(true)
      instRef.current.goToAndPlay(0, true)
      return
    }
    if (loadingRef.current || !boxRef.current) return
    loadingRef.current = true
    // Пока качается lottie, параллельно собираем плитку узора, чтобы фон не
    // «допоявлялся» после старта анимации.
    if (!tileRef.current) {
      buildPatternTile().then((t) => { tileRef.current = t; setPatternTile(t) })
    }
    try {
      const res = await fetch(`${FILE_BASE}/${stickerId}`)
      if (!res.ok) throw new Error()
      const buf = new Uint8Array(await res.arrayBuffer())
      const raw = (buf[0] === 0x1f && buf[1] === 0x8b) ? ungzip(buf) : buf
      const data = JSON.parse(new TextDecoder().decode(raw))
      if (!boxRef.current) return
      const inst = lottie.loadAnimation({
        container: boxRef.current, renderer: 'svg',
        loop: false, autoplay: false, animationData: data,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      })
      inst.addEventListener('complete', () => { inst.goToAndStop(0, true); setPlaying(false) })
      instRef.current = inst
      setPlaying(true)
      inst.goToAndPlay(0, true)
    } catch { /* без анимации — остаётся статичная картинка */ }
  }

  useEffect(() => {
    if (autoPlay) startPlay()
    return () => { if (instRef.current) { instRef.current.destroy(); instRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickerId])

  const play = (e) => {
    if (!stickerId) return
    e.stopPropagation()
    startPlay()
  }

  return (
    <div
      onClick={play}
      style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', cursor: stickerId ? 'pointer' : 'default',
        background: gradient,
      }}
    >
      {/* Узор из иконки-символа — виден только пока играет анимация.
          Внешний слой гасит узор к центру (там стикер), внутренний тонирует
          альфу иконки символьным цветом. */}
      {playing && patternTile && (
        <div style={{
          position: 'absolute', inset: 0,
          maskImage: 'radial-gradient(circle at 50% 46%, transparent 26%, #000 55%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 26%, #000 55%)',
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
      {image
        ? <img src={image} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: playing ? 0 : 1,
          }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>}
      {/* Анимация поверх, видна только во время проигрывания */}
      <div ref={boxRef} style={{ position: 'absolute', inset: pad, opacity: playing ? 1 : 0 }} />
    </div>
  )
}
