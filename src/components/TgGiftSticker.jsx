import { useEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

/**
 * Стикер Telegram-подарка: статичная превьюшка, по тапу — Lottie-анимация.
 * Файлы идут через бэкенд-прокси (прямые ссылки Telegram раскрывают токен).
 * Заполняет родительский контейнер целиком.
 */
export default function TgGiftSticker({ thumbId, stickerId, fallback = '🎁' }) {
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const animData = useRef(null)
  const boxRef = useRef(null)

  const play = async (e) => {
    if (!stickerId || playing) return
    e.stopPropagation()
    try {
      if (!animData.current) {
        const res = await fetch(`${FILE_BASE}/${stickerId}`)
        if (!res.ok) throw new Error()
        const buf = new Uint8Array(await res.arrayBuffer())
        // .tgs = gzip-нутый Lottie JSON (магия 1f 8b), иногда бывает голый JSON
        animData.current = (buf[0] === 0x1f && buf[1] === 0x8b)
          ? JSON.parse(ungzip(buf, { to: 'string' }))
          : JSON.parse(new TextDecoder().decode(buf))
      }
      setPlaying(true)
    } catch {
      setFailed(true)
    }
  }

  useEffect(() => {
    if (!playing || !animData.current || !boxRef.current) return
    const inst = lottie.loadAnimation({
      container: boxRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: animData.current,
    })
    inst.addEventListener('complete', () => setPlaying(false))
    return () => inst.destroy()
  }, [playing])

  if (playing) {
    return (
      <div
        ref={boxRef}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', height: '100%' }}
      />
    )
  }

  if (thumbId && !failed) {
    return (
      <img
        src={`${FILE_BASE}/${thumbId}`}
        alt=""
        onClick={play}
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: '100%', objectFit: 'contain',
          cursor: stickerId ? 'pointer' : 'default',
        }}
      />
    )
  }

  return <span onClick={play}>{fallback}</span>
}
