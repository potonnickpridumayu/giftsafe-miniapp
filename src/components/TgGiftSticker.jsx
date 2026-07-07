import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

/**
 * Подарок Telegram: статичная официальная картинка (фон + узор + стикер с
 * nft.fragment.com) как подложка, а по тапу поверх доигрывается анимация
 * стикера (lottie грузится ЛЕНИВО — только при первом тапе).
 *
 * Во время проигрывания статичную картинку ПРЯЧЕМ (иначе за анимацией виден
 * второй, статичный стикер), показывая под анимацией родной градиент-фон
 * подарка. Узор на время анимации уходит, зато стикер один; по завершении
 * картинка с узором возвращается.
 */
export default function TgGiftSticker({ stickerId, image = '', backdrop = null, fallback = '🎁', pad = '20%' }) {
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

  useEffect(() => () => {
    if (instRef.current) { instRef.current.destroy(); instRef.current = null }
  }, [stickerId])

  const play = async (e) => {
    if (!stickerId) return
    e.stopPropagation()
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
            objectFit: 'cover', opacity: playing ? 0 : 1,
          }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</span>}
      {/* Анимация поверх, видна только во время проигрывания */}
      <div ref={boxRef} style={{ position: 'absolute', inset: pad, opacity: playing ? 1 : 0 }} />
    </div>
  )
}
