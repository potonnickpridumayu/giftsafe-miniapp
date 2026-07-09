import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

// Запасная маска, если силуэт построить не удалось: круглая дырка по центру,
// узор хотя бы по краям остаётся.
const HOLE = 'radial-gradient(circle at 50% 46%, transparent 34%, rgba(0,0,0,0.4) 48%, #000 60%)'

/**
 * Подарок Telegram: статичная официальная картинка (фон+узор+стикер с
 * nft.fragment.com), а поверх по тапу доигрывается анимация стикера.
 *  - autoPlay: проиграть один раз при появлении (страница товара).
 *  - тап: проиграть снова (страница товара, портфель).
 *
 * Проблема: в JPG узор и стикер слиты, отдельного узора «за стикером» нет.
 * Решение — ТОЧНЫЙ ВЫРЕЗ ПО КОНТУРУ: из lottie (кадр 0) строим силуэт стикера
 * и вырезаем в картинке дырку РОВНО этой формы. Анимация встаёт в тот же контур,
 * а узор на всей остальной площади остаётся 1-в-1 как на статичной карточке —
 * шва не видно. lottie грузится ЛЕНИВО (при первом проигрыше).
 */
export default function TgGiftSticker({ stickerId, image = '', backdrop = null, fallback = '🎁', pad = '20%', imageInset = '0%', autoPlay = false }) {
  const [playing, setPlaying] = useState(false)
  const [maskUrl, setMaskUrl] = useState('')
  const instRef = useRef(null)
  const boxRef = useRef(null)
  const loadingRef = useRef(false)

  const padFrac = (parseFloat(pad) || 0) / 100
  const imageInsetFrac = (parseFloat(imageInset) || 0) / 100
  const imageSizePct = `${(1 - imageInsetFrac * 2) * 100}%`

  let bd = null
  if (backdrop) {
    try { bd = typeof backdrop === 'string' ? JSON.parse(backdrop) : backdrop } catch { /* без фона */ }
  }
  const gradient = bd
    ? `radial-gradient(circle at 50% 42%, ${intHex(bd.center)}, ${intHex(bd.edge)})`
    : 'var(--bg-card-hover)'

  // Строим маску-силуэт стикера: непрозрачно везде, кроме формы стикера (дырка).
  const buildMask = (data) => {
    try {
      const S = 300
      const off = Math.round(S * padFrac)
      const inner = S - 2 * off
      // рендерим кадр 0 стикера на свой канвас (тем же fit, что и видимая svg-анимация)
      const sc = document.createElement('canvas')
      sc.width = inner; sc.height = inner
      const anim = lottie.loadAnimation({
        renderer: 'canvas', loop: false, autoplay: false, animationData: data,
        rendererSettings: {
          context: sc.getContext('2d'),
          clearCanvas: true, preserveAspectRatio: 'xMidYMid meet',
        },
      })
      anim.goToAndStop(0, true)

      // Бинаризуем альфу силуэта: любой ненулевой пиксель → полностью
      // непрозрачный. Иначе полупрозрачные края (антиалиасинг) вырезают не до
      // конца и сквозь них проступает цвет статичного стикера из JPG.
      const scx = sc.getContext('2d')
      const px = scx.getImageData(0, 0, inner, inner)
      const d = px.data
      for (let i = 3; i < d.length; i += 4) if (d[i] > 10) d[i] = 255
      scx.putImageData(px, 0, 0)

      const m = document.createElement('canvas'); m.width = S; m.height = S
      const mx = m.getContext('2d')
      mx.fillStyle = '#000'; mx.fillRect(0, 0, S, S)
      mx.globalCompositeOperation = 'destination-out'
      // Лёгкая дилатация: штампуем силуэт по кругу смещений на несколько
      // пикселей — только чтобы добить тонкую антиалиас-кайму, не больше.
      // Слишком большое раздутие делает вырез шире самой анимации, и вокруг
      // стикера во время игры видна пустая заливка вместо узора — было хуже.
      const g = Math.min(8, Math.max(4, Math.round(inner * 0.025)))
      const steps = 8
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2
        mx.drawImage(sc, off + Math.round(Math.cos(a) * g), off + Math.round(Math.sin(a) * g))
      }
      mx.drawImage(sc, off, off)
      anim.destroy()
      return m.toDataURL()
    } catch { return '' }
  }

  const startPlay = async () => {
    if (!stickerId) return
    if (instRef.current) {
      setPlaying(true)
      instRef.current.goToAndPlay(0, true)
      return
    }
    if (loadingRef.current || !boxRef.current) return
    loadingRef.current = true
    try {
      const res = await fetch(`${FILE_BASE}/${stickerId}`)
      if (!res.ok) throw new Error()
      const buf = new Uint8Array(await res.arrayBuffer())
      const raw = (buf[0] === 0x1f && buf[1] === 0x8b) ? ungzip(buf) : buf
      const data = JSON.parse(new TextDecoder().decode(raw))
      if (!boxRef.current) return
      setMaskUrl(buildMask(data))
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

  // Во время проигрывания вырезаем в картинке контур стикера (или круг, если
  // силуэт не построился) — узор остаётся, статичный стикер спрятан.
  const mask = !playing ? 'none' : (maskUrl ? `url(${maskUrl})` : HOLE)

  return (
    <div
      onClick={play}
      style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', cursor: stickerId ? 'pointer' : 'default',
        background: gradient,
      }}
    >
      {image
        ? <img src={image} alt="" style={{
            position: 'absolute', inset: imageInset, width: imageSizePct, height: imageSizePct,
            objectFit: 'cover',
            maskImage: mask, WebkitMaskImage: mask,
            maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
          }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>}
      {/* Анимация поверх, видна только во время проигрывания */}
      <div ref={boxRef} style={{ position: 'absolute', inset: pad, opacity: playing ? 1 : 0 }} />
    </div>
  )
}
