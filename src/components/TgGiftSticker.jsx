import { useLayoutEffect, useRef, useState } from 'react'
import lottie from 'lottie-web'
import { ungzip } from 'pako'

const FILE_BASE = 'https://nftmarketbot-production.up.railway.app/api/tg-file'

// Кэш разобранных tgs-анимаций на всё время сессии. Без него каждый ремоунт
// карточки (ушёл в подарок → вернулся на маркет) заново качал и парсил
// стикер, и пока это шло, карточка показывала JPG-фолбэк — фон с узором
// «перестраивались» на глазах. С кэшем повторный маунт рендерит первый кадр
// СИНХРОННО, до отрисовки кадра браузером — мигать просто нечему.
const tgsCache = new Map() // stickerId -> animationData (разобранный JSON)
const TGS_CACHE_MAX = 150
function cacheTgs(id, data) {
  if (tgsCache.size >= TGS_CACHE_MAX) {
    tgsCache.delete(tgsCache.keys().next().value) // самый старый
  }
  tgsCache.set(id, data)
}

// Загрузка tgs с дедупликацией: две карточки с одним стикером (или прогрев
// со сплэша + маунт карточки) делят один запрос.
const tgsLoading = new Map() // stickerId -> Promise<animationData>

// Распаковка tgs (gzip'нутый lottie-JSON). Через нативный DecompressionStream:
// он разжимает во внутренних потоках браузера, а не в JS на главном потоке, и
// Response.json() парсит нативно, без промежуточной JS-строки. Это важно не
// ради скорости самой по себе: прогрев зовётся со сплэша, и pako.ungzip на
// главном потоке блокировал его на десятки мс × число стикеров — анимация
// логотипа теряла кадры. pako остаётся фолбэком для старых webview.
async function decodeTgs(buf) {
  const gz = buf[0] === 0x1f && buf[1] === 0x8b
  if (gz && typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).json()
  }
  return JSON.parse(new TextDecoder().decode(gz ? ungzip(buf) : buf))
}

function loadTgs(stickerId) {
  if (tgsCache.has(stickerId)) return Promise.resolve(tgsCache.get(stickerId))
  if (tgsLoading.has(stickerId)) return tgsLoading.get(stickerId)
  const p = (async () => {
    const res = await fetch(`${FILE_BASE}/${stickerId}`)
    if (!res.ok) throw new Error('tgs fetch failed')
    const data = await decodeTgs(new Uint8Array(await res.arrayBuffer()))
    cacheTgs(stickerId, data)
    return data
  })().finally(() => tgsLoading.delete(stickerId))
  tgsLoading.set(stickerId, p)
  return p
}

// Тот же приём для картинки узора: после первой загрузки держим её blob'ом
// в памяти (objectURL живёт всю сессию — узоров столько же, сколько фонов,
// это единицы), чтобы SVG <image> на ремоунте не ходил даже в дисковый кэш.
const patternCache = new Map() // file_id -> objectURL
const patternLoading = new Map() // file_id -> Promise
function warmPattern(fileId) {
  if (!fileId || patternCache.has(fileId)) return Promise.resolve()
  if (patternLoading.has(fileId)) return patternLoading.get(fileId)
  const p = fetch(`${FILE_BASE}/${fileId}`)
    .then(r => (r.ok ? r.blob() : null))
    .then(b => { if (b) patternCache.set(fileId, URL.createObjectURL(b)) })
    .catch(() => { /* узор не критичен, останется сетевой URL */ })
    .finally(() => patternLoading.delete(fileId))
  patternLoading.set(fileId, p)
  return p
}

// Прогрев всей графики подарка (стикер + узор) — зовётся со сплэша
// (prefetchAll), чтобы маркет открывался уже ПОЛНОСТЬЮ готовым.
export function warmGiftArt(stickerId, backdrop) {
  let bd = null
  if (backdrop) {
    try { bd = typeof backdrop === 'string' ? JSON.parse(backdrop) : backdrop } catch { /* без фона */ }
  }
  const jobs = []
  if (bd?.pattern) jobs.push(warmPattern(bd.pattern))
  if (stickerId) jobs.push(loadTgs(stickerId).catch(() => { /* останется JPG */ }))
  return Promise.all(jobs)
}

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
  const patternUrl = bd?.pattern
    ? (patternCache.get(bd.pattern) || `${FILE_BASE}/${bd.pattern}`)
    : ''
  const patternColor = bd?.symbol != null ? intHex(bd.symbol) : 'rgba(255,255,255,0.8)'

  // useLayoutEffect: при закэшированном стикере первый кадр встаёт ДО того,
  // как браузер отрисует кадр с фолбэком — ремоунт визуально бесшовный.
  useLayoutEffect(() => {
    warmPattern(bd?.pattern)
    if (!stickerId) return undefined
    let dead = false

    const init = (data) => {
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
    }

    const cached = tgsCache.get(stickerId)
    if (cached) {
      init(cached) // синхронно, без единого кадра фолбэка
    } else {
      loadTgs(stickerId).then(init).catch(() => { /* остаёмся на статичном JPG */ })
    }
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
               смещена вверх; для квадратной карточки опускаем узор на 28
               единиц (~10% высоты), чтобы он стоял по центру. */
            <g filter={`url(#${uid}f)`} transform="translate(0, 28)">
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
