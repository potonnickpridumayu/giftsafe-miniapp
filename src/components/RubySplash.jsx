import { useEffect, useRef } from 'react'
import './RubySplash.css'

// ── easing ──────────────────────────────────────────────────────────────────
const easeInCubic = t => t * t * t
const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeInQuad = t => t * t
const easeOutQuad = t => 1 - (1 - t) * (1 - t)
const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)

const clamp01 = n => (n < 0 ? 0 : n > 1 ? 1 : n)
const lerp = (a, b, p) => a + (b - a) * p
// прогресс фазы [from,to] в секундах текущего времени t, зажатый в [0,1]
const phase = (t, from, to) => clamp01((t - from) / (to - from))

// линейная (сглаженная smoothstep) интерполяция по ключам, равномерно
// распределённым по окну [from,to] — нужна для squash&stretch (5 ключей)
function keyframeValue(t, from, to, keys) {
  const p = phase(t, from, to)
  if (p <= 0) return keys[0]
  if (p >= 1) return keys[keys.length - 1]
  const segCount = keys.length - 1
  const seg = Math.min(segCount - 1, Math.floor(p * segCount))
  const segP = p * segCount - seg
  const eased = segP * segP * (3 - 2 * segP) // smoothstep
  return lerp(keys[seg], keys[seg + 1], eased)
}

// ── раскладка на виртуальном холсте 1080×1920 ────────────────────────────────
// Все пиксельные значения ниже — в координатах этого холста; сам холст
// масштабируется под реальный контейнер через CSS transform (contain-fit),
// поэтому таймингам и смещениям из ТЗ ничего не грозит на любом экране.
const CANVAS_W = 1080
const CANVAS_H = 1920

const GEM_SIZE = 230              // сторона камня (натуральная пропорция 1:1)
const R_ASPECT = 233 / 379        // ширина/высота ассета ruby-r-splash.png
const R_HEIGHT = 330
const R_WIDTH = R_HEIGHT * R_ASPECT
const BLOCK_H = 520                // высота всего лого-блока по ТЗ
const BLOCK_CENTER_Y = CANVAS_H / 2
const GEM_CENTER_Y = BLOCK_CENTER_Y - BLOCK_H / 2 + GEM_SIZE / 2
const R_CENTER_Y = BLOCK_CENTER_Y + BLOCK_H / 2 - R_HEIGHT / 2
const IMPACT_Y = GEM_CENTER_Y + GEM_SIZE / 2 - 40 // точка контакта камня и "r"
const CENTER_X = CANVAS_W / 2

const SPARK_X = CENTER_X + GEM_SIZE * 0.34
const SPARK_Y = GEM_CENTER_Y - GEM_SIZE * 0.34

function textColorFor(bg) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(bg || '')
  if (!m) return '#FFFFFF'
  const [r, g, b] = [m[1], m[2], m[3]].map(h => parseInt(h, 16))
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma < 140 ? '#FFFFFF' : '#211A1C'
}

export default function RubySplash({ background = '#1A0910', showWordmark = true }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const gemRef = useRef(null)
  const rRef = useRef(null)
  const rippleRef = useRef(null)
  const shineRef = useRef(null)
  const sparkRef = useRef(null)
  const wordRef = useRef(null)
  const fitScaleRef = useRef(1)

  useEffect(() => {
    let raf
    const start = performance.now()

    const fitCanvas = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      fitScaleRef.current = Math.min(wrap.clientWidth / CANVAS_W, wrap.clientHeight / CANVAS_H)
    }
    fitCanvas()
    window.addEventListener('resize', fitCanvas)

    const tick = (now) => {
      const t = (now - start) / 1000 // секунды с момента монтирования

      // ── 1. падение + докрутка ────────────────────────────────────────────
      const fallP = phase(t, 0.10, 0.55)
      const rotP = phase(t, 0.10, 0.92)
      let y = lerp(-1100, 0, easeInCubic(fallP))
      const rot = lerp(-132, 0, easeOutCubic(rotP))

      // ── 3. отскок после удара ────────────────────────────────────────────
      if (t >= 0.55) {
        if (t < 0.75) {
          y = lerp(0, -84, easeOutQuad(phase(t, 0.55, 0.75)))
        } else {
          y = lerp(-84, 0, easeInQuad(phase(t, 0.75, 0.92)))
        }
      }

      // ── 2. squash & stretch (транформ-origin — нижняя точка камня) ───────
      // до 0.48с камень летит без искажений — окно ключей стартует именно с 1.06/0.96
      const scaleY = t < 0.48 ? 1 : keyframeValue(t, 0.48, 0.85, [1.06, 0.78, 1.09, 0.96, 1])
      const scaleX = t < 0.48 ? 1 : keyframeValue(t, 0.48, 0.85, [0.96, 1.24, 0.93, 1.03, 1])

      if (gemRef.current) {
        gemRef.current.style.transform =
          `translate(-50%, calc(-50% + ${y}px)) rotate(${rot}deg) scale(${scaleX}, ${scaleY})`
      }

      // ── 4. рябь от удара ──────────────────────────────────────────────────
      if (rippleRef.current) {
        if (t < 0.55) {
          rippleRef.current.style.opacity = 0
        } else {
          const rp = phase(t, 0.55, 1.30)
          const radius = lerp(50, 300, easeOutCubic(rp))
          rippleRef.current.style.width = `${radius * 2}px`
          rippleRef.current.style.height = `${radius * 2}px`
          rippleRef.current.style.opacity = lerp(0.45, 0, easeOutCubic(rp))
        }
      }

      // ── 5. выезд «r» из точки удара ───────────────────────────────────────
      if (rRef.current) {
        if (t < 0.60) {
          rRef.current.style.opacity = 0
        } else {
          const rp = phase(t, 0.60, 1.15)
          const topInset = lerp(100, 0, easeOutCubic(rp))
          const overshootY = lerp(30, 0, easeOutBack(rp))
          rRef.current.style.clipPath = `inset(${topInset}% 0 0 0)`
          rRef.current.style.transform = `translate(-50%, calc(-50% + ${overshootY}px))`
          rRef.current.style.opacity = easeOutCubic(phase(t, 0.60, 0.78))
        }
      }

      // ── 6. блик по камню ───────────────────────────────────────────────────
      if (shineRef.current) {
        if (t < 1.30 || t > 1.85) {
          shineRef.current.style.opacity = 0
        } else {
          const sp = easeInOutCubic(phase(t, 1.30, 1.85))
          shineRef.current.style.opacity = 1
          shineRef.current.style.transform = `translateX(${lerp(-140, 240, sp)}%) rotate(22deg)`
        }
      }

      // ── 7. искра у верхнего угла ────────────────────────────────────────────
      if (sparkRef.current) {
        if (t < 1.48 || t > 1.93) {
          sparkRef.current.style.transform = 'translate(-50%, -50%) rotate(45deg) scale(0)'
        } else {
          const kp = phase(t, 1.48, 1.93)
          const s = Math.sin(kp * Math.PI)
          sparkRef.current.style.transform = `translate(-50%, -50%) rotate(45deg) scale(${s})`
        }
      }

      // ── 8. словоформа ────────────────────────────────────────────────────────
      if (wordRef.current) {
        if (t < 1.55) {
          wordRef.current.style.opacity = 0
        } else {
          const wp = easeOutCubic(phase(t, 1.55, 2.10))
          wordRef.current.style.opacity = wp
          wordRef.current.style.letterSpacing = `${lerp(0.42, 0.06, wp)}em`
          wordRef.current.style.transform = `translate(-50%, calc(-50% + ${lerp(26, 0, wp)}px))`
        }
      }

      // ── 9. дыхание + финальный подъём (после 3.0с — бесшовный луп) ──────────
      const BREATHE_PERIOD = 2.4
      const breathe = t >= 1.2 ? Math.sin(((t - 1.2) / BREATHE_PERIOD) * Math.PI * 2) * 0.008 : 0
      const lift = 0.05 * easeOutCubic(phase(t, 2.55, 3.00))
      const scale = fitScaleRef.current * (1 + breathe + lift)
      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fitCanvas)
    }
  }, [])

  const wordColor = textColorFor(background)

  return (
    <div className="ruby-splash" style={{ background }} ref={wrapRef}>
      <div className="ruby-splash__canvas" ref={canvasRef} style={{ transform: 'translate(-50%, -50%)' }}>
        <div
          className="ruby-splash__r"
          ref={rRef}
          style={{
            left: CENTER_X, top: R_CENTER_Y,
            width: R_WIDTH, height: R_HEIGHT,
            opacity: 0,
          }}
        >
          <img src="/ruby-r-splash.png" alt="" />
        </div>

        <div
          className="ruby-splash__ripple"
          ref={rippleRef}
          style={{ left: CENTER_X, top: IMPACT_Y, width: 100, height: 100, opacity: 0 }}
        />

        <div
          className="ruby-splash__gem"
          ref={gemRef}
          style={{ left: CENTER_X, top: GEM_CENTER_Y, width: GEM_SIZE, height: GEM_SIZE }}
        >
          <img className="ruby-splash__gem-img" src="/ruby-gem-splash.png" alt="ruby" />
          <div className="ruby-splash__shine" ref={shineRef} style={{ opacity: 0 }}>
            <div className="ruby-splash__shine-bar" />
          </div>
        </div>

        <div
          className="ruby-splash__spark"
          ref={sparkRef}
          style={{ left: SPARK_X, top: SPARK_Y, transform: 'translate(-50%, -50%) rotate(45deg) scale(0)' }}
        />

        {showWordmark && (
          <div
            className="ruby-splash__word"
            ref={wordRef}
            style={{
              left: CENTER_X, top: R_CENTER_Y + R_HEIGHT / 2 + 110,
              color: wordColor, opacity: 0,
            }}
          >
            ruby
          </div>
        )}
      </div>
    </div>
  )
}
