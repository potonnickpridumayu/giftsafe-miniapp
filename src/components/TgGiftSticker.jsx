import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

const intHex = (n) => '#' + ((n ?? 0) >>> 0).toString(16).padStart(6, '0')

/**
 * Стикер Telegram-подарка на родном фоне (градиент + узор из данных гифта).
 * Статика — средний кадр векторной анимации (чёткий в любом размере),
 * мыльная превьюшка видна только пока грузится tgs. Тап — проигрывание.
 * Файлы идут через бэкенд-прокси (прямые ссылки Telegram раскрывают токен).
 */
export default function TgGiftSticker({ thumbId, stickerId, backdrop, fallback = '🎁' }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const instRef = useRef(null)
  const boxRef = useRef(null)

  let bd = null
  if (backdrop) {
    try { bd = typeof backdrop === 'string' ? JSON.parse(backdrop) : backdrop } catch { /* без фона */ }
  }

  useEffect(() => {
    if (!stickerId || !boxRef.current) return
    let cancelled = false
    let inst = null
    ;(async () => {
      try {
        const res = await fetch(`${FILE_BASE}/${stickerId}`)
        if (!res.ok) throw new Error()
        const buf = new Uint8Array(await res.arrayBuffer())
        const raw = (buf[0] === 0x1f && buf[1] === 0x8b) ? ungzip(buf) : buf
        const data = JSON.parse(new TextDecoder().decode(raw))
        if (cancelled || !boxRef.current) return
        inst = lottie.loadAnimation({
          container: boxRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: data,
        })
        // Средний кадр как статика: первый у многих анимаций пустой
        const still = Math.floor((inst.totalFrames || 2) / 2)
        inst.addEventListener('complete', () => inst.goToAndStop(still, true))
        inst.goToAndStop(still, true)
        instRef.current = inst
        setReady(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => { cancelled = true; if (inst) inst.destroy(); instRef.current = null }
  }, [stickerId])

  const play = (e) => {
    if (!instRef.current) return
    e.stopPropagation()
    instRef.current.goToAndPlay(0, true)
  }

  return (
    <div
      onClick={play}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: stickerId ? 'pointer' : 'default',
        background: bd
          ? `radial-gradient(circle at 50% 42%, ${intHex(bd.center)}, ${intHex(bd.edge)})`
          : 'transparent',
        overflow: 'hidden',
      }}
    >
      {bd?.pattern && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${FILE_BASE}/${bd.pattern})`,
          backgroundSize: '30px 30px',
          backgroundRepeat: 'repeat',
          opacity: 0.16,
        }} />
      )}
      <div ref={boxRef} style={{ position: 'absolute', inset: '9%' }} />
      {!ready && (
        thumbId && !failed ? (
          <img
            src={`${FILE_BASE}/${thumbId}`}
            alt=""
            onError={() => setFailed(true)}
            style={{ position: 'absolute', inset: '9%', width: '82%', height: '82%', objectFit: 'contain' }}
          />
        ) : failed && !thumbId ? (
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{fallback}</span>
        ) : null
      )}
      {failed && thumbId && !ready && (
        <img
          src={`${FILE_BASE}/${thumbId}`}
          alt=""
          style={{ position: 'absolute', inset: '9%', width: '82%', height: '82%', objectFit: 'contain' }}
        />
      )}
    </div>
  )
}
