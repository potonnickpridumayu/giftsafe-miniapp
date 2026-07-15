import { useEffect, useRef } from 'react'

// Splash / loading-анимация логотипа ruby. Точный порт Design-Component
// (ruby-splash.jsx + движок animations.jsx из исходника): математика тайминга
// перенесена 1:1, вместо DC-рантайма — собственный rAF-таймлайн.
//
// ВАЖНО про производительность: кадры НЕ гоняются через состояние React —
// setState на каждый кадр давал полный ре-рендер сцены 60 раз в секунду и
// заметно ронял fps (особенно на телефоне). Здесь rAF пишет стили напрямую в
// DOM по ref'ам: React рендерит разметку один раз и больше не участвует.
// По той же причине всё смонтировано всегда (гасим через opacity), а не
// монтируется/размонтируется по ходу анимации.
//
// Ассеты — оригиналы 1024×1024 (public/splash-gem.png, splash-r.png); позиции
// сцены завязаны на положение картинки внутри этого холста, кропать нельзя.

const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutBack: t => {
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// interpolate([t0,t1,…], [v0,v1,…]) — линейная развёртка по ключам во времени
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0]
    if (t >= input[input.length - 1]) return output[output.length - 1]
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i]
        const local = span === 0 ? 0 : (t - input[i]) / span
        return output[i] + (output[i + 1] - output[i]) * ease(local)
      }
    }
    return output[output.length - 1]
  }
}

// animate({from,to,start,end,ease})(t) — одноотрезковый твин
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return t => {
    if (t <= start) return from
    if (t >= end) return to
    const local = (t - start) / (end - start)
    return from + (to - from) * ease(local)
  }
}

// ── раскладка (координаты холста 1080×1920) ──────────────────────────────────
const W = 1080, H = 1920
const S = 520                          // сторона лого-бокса
const BOX_X = (W - S) / 2              // 280
const BOX_Y = 620                      // верх лого-бокса
const GEM_CX = (534 + 780) / 2 / 1024 * S   // центр камня по X в боксе
const GEM_CY = (215 + 461) / 2 / 1024 * S   // центр камня по Y
const GEM_BOTTOM = 461 / 1024 * S           // нижняя точка камня (контакт)
const R_BOTTOM_Y = BOX_Y + 833 / 1024 * S   // базовая линия «r» на холсте

const squashY = interpolate([0.48, 0.55, 0.63, 0.74, 0.85], [1.06, 0.78, 1.09, 0.96, 1])
const squashX = interpolate([0.48, 0.55, 0.63, 0.74, 0.85], [0.96, 1.24, 0.93, 1.03, 1])
const fall = animate({ from: -1100, to: 0, start: 0.10, end: 0.55, ease: Easing.easeInCubic })
const rebound = animate({ from: 0, to: -84, start: 0.55, end: 0.75, ease: Easing.easeOutQuad })
const settle = animate({ from: -84, to: 0, start: 0.75, end: 0.92, ease: Easing.easeInQuad })
const spin = animate({ from: -132, to: 0, start: 0.10, end: 0.92, ease: Easing.easeOutCubic })

function hexIsDark(hex) {
  try {
    const h = (hex || '').replace('#', '')
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128
  } catch { return false }
}

export default function RubyMarketSplash({ background = '#1A0910', showWordmark = true, fading = false }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const rippleRef = useRef(null)
  const logoRef = useRef(null)
  const gemRef = useRef(null)
  const rRef = useRef(null)
  const glintWrapRef = useRef(null)
  const glintBarRef = useRef(null)
  const sparkRef = useRef(null)
  const wordRef = useRef(null)

  // rAF-таймлайн: секунды, время просто идёт вперёд и НЕ заворачивается по
  // модулю (в DC так делал Stage loop — для превью в редакторе): на стыке 3.0→0
  // кадр «лого на 105% + слово» жёстко срезало бы в пустой экран. Поэтому интро
  // (~3с) играет ровно один раз, а дальше всё завершённое залипает само:
  // рябь/блик/искра отсекаются clamp'ом, «r» и слово раскрыты. Остаются только
  // незатухающие синусы — покачивание камня и дыхание лого. Это и есть
  // бесшовный луп, пока грузятся данные.
  useEffect(() => {
    let raf, last = null, t = 0

    const draw = () => {
      // камень: падение → приземление → отскок → лёгкое «дыхание»
      let gemY
      if (t < 0.10) gemY = -1100
      else if (t < 0.55) gemY = fall(t)
      else if (t < 0.75) gemY = rebound(t)
      else if (t < 0.92) gemY = settle(t)
      else gemY = 0
      if (t > 1.05) gemY += Math.sin((t - 1.05) * 2.4) * 5

      gemRef.current.style.transform =
        'translateY(' + gemY + 'px) rotate(' + spin(t) + 'deg) scale(' + squashX(t) + ',' + squashY(t) + ')'

      // «r» выезжает из точки удара
      const pr = clamp((t - 0.60) / 0.55, 0, 1)
      const rs = rRef.current.style
      rs.opacity = clamp(pr * 3, 0, 1)
      rs.transform = 'translateY(' + (1 - Easing.easeOutBack(pr)) * 90 + 'px)'
      rs.clipPath = 'inset(' + (1 - Easing.easeOutCubic(pr)) * 100 + '% 0 0 0)'

      // рябь от удара
      const rip = clamp((t - 0.55) / 0.75, 0, 1)
      const ripR = 50 + Easing.easeOutCubic(rip) * 250
      const rps = rippleRef.current.style
      rps.opacity = rip > 0 && rip < 1 ? (1 - rip) * 0.45 : 0
      rps.left = (BOX_X + GEM_CX - ripR) + 'px'
      rps.top = (BOX_Y + GEM_BOTTOM - ripR) + 'px'
      rps.width = rps.height = (ripR * 2) + 'px'

      // Блик по камню (сдвиг — transform'ом, а не left: left дёргал layout).
      // Вне своего окна гасим через visibility, а не только opacity: под маской
      // лежит blur(6px), и незачем держать его слой всю анимацию.
      const gl = clamp((t - 1.30) / 0.55, 0, 1)
      const glOn = gl > 0 && gl < 1
      glintWrapRef.current.style.visibility = glOn ? 'visible' : 'hidden'
      if (glOn) {
        glintBarRef.current.style.transform =
          'translateX(' + (-160 + Easing.easeInOutCubic(gl) * 820) + 'px) rotate(22deg)'
      }

      // искра у угла камня
      const sp = clamp((t - 1.48) / 0.45, 0, 1)
      const spS = Math.sin(sp * Math.PI)
      const sps = sparkRef.current.style
      const spOn = spS > 0.01
      sps.visibility = spOn ? 'visible' : 'hidden'
      if (spOn) sps.transform = 'rotate(' + (45 + sp * 120) + 'deg) scale(' + spS + ')'

      // словоформа
      if (wordRef.current) {
        const wm = clamp((t - 1.55) / 0.55, 0, 1)
        const wmC = Easing.easeOutCubic(wm)
        const ws = wordRef.current.style
        ws.opacity = wmC
        ws.letterSpacing = ws.textIndent = (0.42 - wmC * 0.36) + 'em'
        ws.transform = 'translateY(' + (1 - wmC) * 26 + 'px)'
      }

      // дыхание всего логотипа + финальный подъём
      let logoScale = 1
      if (t > 1.2) logoScale += 0.008 * Math.sin((t - 1.2) * 2.0)
      logoScale *= 1 + Easing.easeInOutQuad(clamp((t - 2.55) / 0.45, 0, 1)) * 0.05
      logoRef.current.style.transform = 'scale(' + logoScale + ')'
    }

    const step = ts => {
      if (last == null) last = ts
      t += (ts - last) / 1000
      last = ts
      draw()
      raf = requestAnimationFrame(step)
    }
    draw()
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // contain-fit холста 1080×1920 в контейнер
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const s = Math.max(0.05, Math.min(el.clientWidth / W, el.clientHeight / H))
      canvasRef.current.style.transform = 'scale(' + s + ')'
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  const dark = hexIsDark(background)
  const box = { position: 'absolute', left: 0, top: 0, width: S, height: S }
  const img = { ...box, objectFit: 'contain' }

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        opacity: fading ? 0 : 1, transition: 'opacity 0.45s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div ref={canvasRef} style={{ width: W, height: H, flex: '0 0 auto', position: 'relative', transformOrigin: 'center center' }}>
        <div ref={rippleRef} style={{
          position: 'absolute', borderRadius: '50%',
          border: '3px solid #FF2D55', opacity: 0,
        }} />

        <div ref={logoRef} style={{
          position: 'absolute', left: BOX_X, top: BOX_Y, width: S, height: S,
          transformOrigin: '50% 60%', willChange: 'transform',
        }}>
          <img ref={rRef} src="/splash-r.png" alt="" style={{ ...img, opacity: 0, willChange: 'transform, opacity, clip-path' }} />
          <img ref={gemRef} src="/splash-gem.png" alt="ruby" style={{
            ...img,
            transformOrigin: GEM_CX + 'px ' + GEM_BOTTOM + 'px',
            willChange: 'transform',
          }} />
          <div ref={glintWrapRef} style={{
            ...box, visibility: 'hidden',
            WebkitMaskImage: 'url(/splash-gem.png)', maskImage: 'url(/splash-gem.png)',
            WebkitMaskSize: S + 'px ' + S + 'px', maskSize: S + 'px ' + S + 'px',
            overflow: 'hidden',
          }}>
            <div ref={glintBarRef} style={{
              position: 'absolute', top: -80, left: 0, width: 90, height: S + 160,
              background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85), rgba(255,255,255,0))',
              filter: 'blur(6px)', willChange: 'transform',
            }} />
          </div>
          <div ref={sparkRef} style={{
            position: 'absolute', left: GEM_CX + 66, top: GEM_CY - 92, width: 26, height: 26,
            background: dark ? '#FFFFFF' : '#FFD6DE',
            borderRadius: 5, visibility: 'hidden', willChange: 'transform',
          }} />
        </div>

        {showWordmark && (
          <div ref={wordRef} style={{
            position: 'absolute', left: 0, right: 0, top: R_BOTTOM_Y + 110,
            textAlign: 'center',
            fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 96,
            color: dark ? '#FFFFFF' : '#211A1C',
            opacity: 0, willChange: 'transform, opacity',
          }}>ruby</div>
        )}
      </div>
    </div>
  )
}
