import { useEffect, useRef, useState } from 'react'

// Splash / loading-анимация логотипа ruby. Точный порт Design-Component
// (ruby-splash.jsx + движок animations.jsx из исходника): математика тайминга
// перенесена 1:1, вместо DC-рантайма — собственный rAF-таймлайн с бесшовным
// лупом (time % DUR). Ассеты — оригиналы 1024×1024 (public/splash-gem.png,
// splash-r.png); позиции сцены завязаны на положение картинки внутри этого
// холста, поэтому кропать их нельзя.

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
const W = 1080, H = 1920, DUR = 3.0
const S = 520                          // сторона лого-бокса
const BOX_X = (W - S) / 2              // 280
const BOX_Y = 620                      // верх лого-бокса
const GEM_CX = (534 + 780) / 2 / 1024 * S   // центр камня по X в боксе
const GEM_CY = (215 + 461) / 2 / 1024 * S   // центр камня по Y
const GEM_BOTTOM = 461 / 1024 * S           // нижняя точка камня (контакт)
const R_BOTTOM_Y = BOX_Y + 833 / 1024 * S   // базовая линия «r» на холсте

function hexIsDark(hex) {
  try {
    const h = (hex || '').replace('#', '')
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128
  } catch { return false }
}

function Scene({ t, showWordmark, dark }) {
  const E = Easing

  // камень: падение → приземление → отскок → лёгкое «дыхание» при загрузке
  let gemY
  if (t < 0.10) gemY = -1100
  else if (t < 0.55) gemY = animate({ from: -1100, to: 0, start: 0.10, end: 0.55, ease: E.easeInCubic })(t)
  else if (t < 0.75) gemY = animate({ from: 0, to: -84, start: 0.55, end: 0.75, ease: E.easeOutQuad })(t)
  else if (t < 0.92) gemY = animate({ from: -84, to: 0, start: 0.75, end: 0.92, ease: E.easeInQuad })(t)
  else gemY = 0
  if (t > 1.05) gemY += Math.sin((t - 1.05) * 2.4) * 5

  const gemRot = animate({ from: -132, to: 0, start: 0.10, end: 0.92, ease: E.easeOutCubic })(t)

  const sy = interpolate([0.48, 0.55, 0.63, 0.74, 0.85], [1.06, 0.78, 1.09, 0.96, 1])(t)
  const sx = interpolate([0.48, 0.55, 0.63, 0.74, 0.85], [0.96, 1.24, 0.93, 1.03, 1])(t)

  // «r» выезжает из точки удара
  const pr = clamp((t - 0.60) / 0.55, 0, 1)
  const rClip = (1 - E.easeOutCubic(pr)) * 100
  const rY = (1 - E.easeOutBack(pr)) * 90
  const rOpacity = clamp(pr * 3, 0, 1)

  // рябь от удара
  const rip = clamp((t - 0.55) / 0.75, 0, 1)
  const ripR = 50 + E.easeOutCubic(rip) * 250
  const ripO = rip > 0 && rip < 1 ? (1 - rip) * 0.45 : 0

  // блик по камню
  const gl = clamp((t - 1.30) / 0.55, 0, 1)
  const glX = -160 + E.easeInOutCubic(gl) * 820
  const glOn = gl > 0 && gl < 1

  // искра у угла камня
  const sp = clamp((t - 1.48) / 0.45, 0, 1)
  const spS = Math.sin(sp * Math.PI)

  // словоформа
  const wm = clamp((t - 1.55) / 0.55, 0, 1)
  const wmC = E.easeOutCubic(wm)

  // дыхание всего логотипа + финальный подъём
  let logoScale = 1
  if (t > 1.2) logoScale += 0.008 * Math.sin((t - 1.2) * 2.0)
  logoScale *= 1 + E.easeInOutQuad(clamp((t - 2.55) / 0.45, 0, 1)) * 0.05

  const box = { position: 'absolute', left: 0, top: 0, width: S, height: S }
  const img = { ...box, objectFit: 'contain' }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {ripO > 0 && (
        <div style={{
          position: 'absolute',
          left: BOX_X + GEM_CX - ripR, top: BOX_Y + GEM_BOTTOM - ripR,
          width: ripR * 2, height: ripR * 2, borderRadius: '50%',
          border: '3px solid #FF2D55', opacity: ripO,
        }} />
      )}

      <div style={{
        position: 'absolute', left: BOX_X, top: BOX_Y, width: S, height: S,
        transform: 'scale(' + logoScale + ')', transformOrigin: '50% 60%',
      }}>
        <img src="/splash-r.png" alt="" style={{
          ...img,
          opacity: rOpacity,
          transform: 'translateY(' + rY + 'px)',
          clipPath: 'inset(' + rClip + '% 0 0 0)',
        }} />
        <img src="/splash-gem.png" alt="ruby" style={{
          ...img,
          transform: 'translateY(' + gemY + 'px) rotate(' + gemRot + 'deg) scale(' + sx + ',' + sy + ')',
          transformOrigin: GEM_CX + 'px ' + GEM_BOTTOM + 'px',
        }} />
        {glOn && (
          <div style={{
            ...box,
            WebkitMaskImage: 'url(/splash-gem.png)', maskImage: 'url(/splash-gem.png)',
            WebkitMaskSize: S + 'px ' + S + 'px', maskSize: S + 'px ' + S + 'px',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -80, left: glX, width: 90, height: S + 160,
              transform: 'rotate(22deg)',
              background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85), rgba(255,255,255,0))',
              filter: 'blur(6px)',
            }} />
          </div>
        )}
        {spS > 0.01 && (
          <div style={{
            position: 'absolute', left: GEM_CX + 66, top: GEM_CY - 92, width: 26, height: 26,
            background: dark ? '#FFFFFF' : '#FFD6DE',
            transform: 'rotate(' + (45 + sp * 120) + 'deg) scale(' + spS + ')',
            borderRadius: 5,
          }} />
        )}
      </div>

      {showWordmark && wm > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: R_BOTTOM_Y + 110,
          textAlign: 'center',
          fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 96,
          color: dark ? '#FFFFFF' : '#211A1C',
          opacity: wmC,
          letterSpacing: (0.42 - wmC * 0.36) + 'em',
          textIndent: (0.42 - wmC * 0.36) + 'em',
          transform: 'translateY(' + (1 - wmC) * 26 + 'px)',
        }}>ruby</div>
      )}
    </div>
  )
}

export default function RubyMarketSplash({ background = '#1A0910', showWordmark = true, fading = false }) {
  const [t, setT] = useState(0)
  const [scale, setScale] = useState(1)
  const wrapRef = useRef(null)

  // rAF-таймлайн: секунды. Время НЕ заворачивается по модулю (в DC это делал
  // Stage loop — для превью в редакторе): на стыке 3.0→0 кадр «лого на 105% +
  // слово» жёстко срезало бы в пустой экран. Вместо этого интро играет один раз,
  // а после DUR всё завершённое залипает (rip/блик/искра отсекаются clamp'ом,
  // «r» и слово раскрыты), и остаются только незатухающие синусы — покачивание
  // камня и дыхание лого. Это и есть бесшовный луп, пока грузятся данные.
  useEffect(() => {
    let raf, last = null, cur = 0
    const step = ts => {
      if (last == null) last = ts
      const dt = (ts - last) / 1000
      last = ts
      cur += dt
      setT(cur)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // contain-fit холста 1080×1920 в контейнер
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setScale(Math.max(0.05, Math.min(el.clientWidth / W, el.clientHeight / H)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  const dark = hexIsDark(background)

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
      <div style={{ width: W, height: H, flex: '0 0 auto', position: 'relative', transform: 'scale(' + scale + ')', transformOrigin: 'center center' }}>
        <Scene t={t} showWordmark={showWordmark} dark={dark} />
      </div>
    </div>
  )
}
