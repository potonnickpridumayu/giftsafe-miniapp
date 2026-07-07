import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

// Радиальная маска: прозрачный центр (там играет анимация), непрозрачные края
// (там виден узор из официальной картинки). Смещён вверх под центр стикера.
const HOLE = 'radial-gradient(circle at 50% 44%, transparent 32%, rgba(0,0,0,0.35) 46%, #000 58%)'

/**
 * Подарок Telegram: статичная официальная картинка (фон+узор+стикер с
 * nft.fragment.com), а поверх по запросу доигрывается анимация стикера.
 *  - autoPlay: проиграть один раз при появлении (страница товара).
 *  - тап: проиграть снова (страница товара, портфель).
 * На время проигрывания официальную картинку прячем (иначе за анимацией виден
 * второй, статичный стикер), но под ней ПОСТОЯННО лежит воссозданный узор
 * (цвет-символ сквозь mask-image узора-стикера) — поэтому при тапе узор НЕ
 * исчезает, остаётся только градиент-фон + узор + анимация.
 * lottie грузится ЛЕНИВО (при первом проигрыше).
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
      const inst = lottie.loadAnimation({
        container: boxRef.current, renderer: 'svg',
        loop: false, autoplay: false, animationData: data,
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
      {image
        ? <img src={image} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            // Во время анимации не прячем картинку целиком (иначе пропадает узор),
            // а вырезаем в ней круглую «дырку» по центру, где играет lottie:
            // края с узором остаются видимыми, статичный стикер в центре скрыт.
            maskImage: playing ? HOLE : 'none',
            WebkitMaskImage: playing ? HOLE : 'none',
          }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>}
      {/* Анимация поверх, видна только во время проигрывания */}
      <div ref={boxRef} style={{ position: 'absolute', inset: pad, opacity: playing ? 1 : 0 }} />
    </div>
  )
}
