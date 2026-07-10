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
  const instRef = useRef(null)
  const boxRef = useRef(null)
  const loadingRef = useRef(false)

  let bd = null
  if (backdrop) {
    try { bd = typeof backdrop === 'string' ? JSON.parse(backdrop) : backdrop } catch { /* без фона */ }
  }
  const gradient = bd
    ? `radial-gradient(circle at 50% 42%, ${intHex(bd.center)}, ${intHex(bd.edge)})`
    : 'var(--bg-card-hover)'
  const patternUrl = bd?.pattern ? `${FILE_BASE}/${bd.pattern}` : ''
  const patternColor = bd?.symbol != null ? intHex(bd.symbol) : 'rgba(255,255,255,0.8)'

  const startPlay = async () => {
    if (!stickerId) return
    if (instRef.current) {
      setPlaying(true)
      instRef.current.goToAndPlay(0, true)
      return
    }
    if (loadingRef.current || !boxRef.current) return
    loadingRef.current = true
    // Пока качается lottie, параллельно греем кеш иконки узора, чтобы фон не
    // «допоявлялся» после старта анимации. Обязательно в CORS-режиме
    // (crossOrigin) — CSS mask-image грузится именно так, а закешированный
    // не-CORS ответ ломает последующую загрузку маски по тому же URL.
    if (patternUrl) { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = patternUrl }
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
      {playing && patternUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          maskImage: 'radial-gradient(circle at 50% 46%, transparent 26%, #000 55%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 26%, #000 55%)',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: patternColor, opacity: 0.4,
            maskImage: `url(${patternUrl})`, WebkitMaskImage: `url(${patternUrl})`,
            maskSize: '22% 22%', WebkitMaskSize: '22% 22%',
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
