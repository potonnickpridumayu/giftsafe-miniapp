// Экран техработ: буква «r» гаечным ключом доводит узор шестерёнки за три
// щелчка, готовая улетает, приезжает следующая — бесконечный «мы чиним».
//
// Дословный порт дизайн-референса design_handoff_maintenance_screen
// (loader-scene.jsx): вся сцена — чистая функция от progress (0→1 за цикл
// 4 с), состояний нет, драйвер — requestAnimationFrame. Числа (координаты,
// тайминги, цвета) — финальные из хэндоффа, НЕ подбирать руками.
//
// Холст фиксированный 1080×1920, масштабируется на вьюпорт целиком
// (scale-to-fit contain), фон за пределами холста #060608.
import { useEffect, useState } from 'react'

const ACCENT = '#FA4A66'
const MAIN_TEXT = 'Маркет временно недоступен'
const SUB_TEXT = 'Проводим технические работы\nСкоро всё заработает'

const CYCLE_MS = 4000
const CANVAS_W = 1080
const CANVAS_H = 1920

// ── r (рабочий) ──
const S = 0.55
const R_W = 217 * S
const R_H = 363 * S
// r стоит слева от шестерёнки, верхняя правая «рука» толкает обод
const LOGO_L = 356
const LOGO_T = 690
const ARM_X = LOGO_L + R_W // контактная точка (кончик руки)
const ARM_Y = LOGO_T + R_H * 0.12

// ── шестерёнка (деталь) ──
const GX = 668
const GY = 838
const RAD = 190

const TAU = Math.PI * 2
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }
const seg = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)))
const eo = (x) => 1 - Math.pow(1 - x, 3)

// Щелчки ключом: [start, end, angleFrom, angleTo] — узор доводится до 0 = идеал
const STROKES = [[0.08, 0.18, -66, -44], [0.26, 0.36, -44, -22], [0.44, 0.54, -22, 0]]
const CLICK = 0.54

function Gear({ accent, angle, x, y, scale, opacity, squash, glowPx, aligned }) {
  if (opacity <= 0) return null
  return (
    <div style={{
      position: 'absolute', left: GX + x, top: GY + y, width: 0, height: 0,
      transform: `scale(${scale * squash})`, opacity, zIndex: 2,
      filter: glowPx ? `drop-shadow(0 0 ${glowPx}px ${accent}88)` : 'none',
    }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: '50%', width: 44, height: 30, marginLeft: -22, marginTop: -15,
          borderRadius: 8, background: '#2c2333',
          transform: `rotate(${angle + i * 30}deg) translateX(${RAD}px)`,
        }} />
      ))}
      {/* обод */}
      <div style={{
        position: 'absolute', left: -RAD, top: -RAD, width: RAD * 2, height: RAD * 2, borderRadius: '999px',
        background: '#241c2b', boxShadow: `inset 0 0 0 10px #322939, 0 26px 60px -20px ${accent}55`,
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
          {[0, 90].map((o, i) => (
            <div key={'s' + i} style={{
              position: 'absolute', left: '50%', top: '50%', width: 26, height: RAD * 2 - 60, marginLeft: -13, marginTop: -(RAD - 30),
              borderRadius: 13, background: `${accent}${aligned ? '66' : '3d'}`,
              transform: `rotate(${angle + o}deg)`, transformOrigin: '50% 50%',
            }} />
          ))}
        </div>
      </div>
      {/* узор-маркер на колесе — должен встретиться с неподвижной меткой в 12 часов */}
      <div style={{
        position: 'absolute', left: -10, top: 0, width: 20, height: RAD - 26,
        borderRadius: 10, background: accent,
        transform: `rotate(${angle + 180}deg)`, transformOrigin: '50% 0%',
      }} />
      {/* целевая метка (не вращается) */}
      <div style={{
        position: 'absolute', left: -13, top: -RAD - 4, width: 26, height: 40, borderRadius: 8,
        background: aligned ? accent : '#4a3d52', boxShadow: aligned ? `0 0 22px ${accent}aa` : 'none',
      }} />
      {/* центральный колпачок со слотом */}
      <div style={{
        position: 'absolute', left: -34, top: -34, width: 68, height: 68, borderRadius: '999px',
        background: '#F4EEF1', boxShadow: `inset 0 0 0 6px ${accent}`,
      }}>
        <div style={{
          position: 'absolute', left: 10, top: '50%', right: 10, height: 8, marginTop: -4,
          borderRadius: 4, background: accent, transform: `rotate(${angle}deg)`,
        }} />
      </div>
    </div>
  )
}

function MaintenanceScene({ p }) {
  const accent = ACCENT

  // ── хореография: r толкает обод, узор трещоткой доводится до идеала ──
  let ang = STROKES[0][2]
  let wr = 0
  for (const [s, e, a0, a1] of STROKES) {
    if (p >= s && p < e) { const k = sm(seg(p, s, e)); ang = a0 + (a1 - a0) * k; wr = 13 * k }
    else if (p >= e) ang = a1
  }
  for (const [, e] of STROKES) {
    const re = e + 0.07
    if (p >= e && p < re) wr = 13 * (1 - eo(seg(p, e, re)))
  }

  const impact = Math.max(0, 1 - Math.abs(p - CLICK) / 0.025)
  const burst = Math.sin(seg(p, CLICK, 0.66) * Math.PI)
  let tick = 0
  for (const [, e] of STROKES.slice(0, 2)) tick = Math.max(tick, Math.sin(seg(p, e - 0.01, e + 0.05) * Math.PI) * 0.5)
  const aligned = p >= CLICK && p < 0.87

  // шестерёнка A: текущая (сбитый узор → идеал → улетает)
  const ex = seg(p, 0.74, 0.87)
  const aOpacity = p < 0.87 ? 1 - ex : 0
  const aScale = 1 - 0.5 * eo(ex)
  const aY = -190 * eo(ex)
  const squash = 1 + 0.05 * impact + 0.03 * burst
  const glowPx = 34 * impact + 16 * burst

  // шестерёнка B: следующая падает сверху, к p=1 стоит на месте
  const en = seg(p, 0.87, 1)
  const bY = -760 * (1 - eo(en))
  const bSquash = 1 - 0.06 * Math.sin(seg(p, 0.96, 1) * Math.PI)
  const bOpacity = p >= 0.87 ? 1 : 0

  const bgFill = 'radial-gradient(120% 90% at 50% 34%, #14121a 0%, #0a090d 55%, #060608 100%)'

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgFill, overflow: 'hidden', fontFamily: 'Onest, sans-serif' }}>
      {/* ambient-свечение */}
      <div style={{
        position: 'absolute', left: 540, top: GY - 120, width: 860, height: 860,
        transform: 'translate(-50%,-50%)',
        background: `radial-gradient(circle, ${accent}1e 0%, transparent 62%)`, pointerEvents: 'none',
      }} />
      {/* вспышка на клике */}
      <div style={{
        position: 'absolute', left: GX, top: GY, width: 560, height: 560,
        transform: `translate(-50%,-50%) scale(${0.6 + 0.6 * impact})`,
        background: `radial-gradient(circle, ${accent}66 0%, transparent 60%)`,
        opacity: impact, pointerEvents: 'none', zIndex: 1,
      }} />
      <Gear accent={accent} angle={ang} x={0} y={aY} scale={aScale} opacity={aOpacity} squash={squash} glowPx={glowPx} aligned={aligned} />
      <Gear accent={accent} angle={STROKES[0][2]} x={0} y={bY} scale={1} opacity={bOpacity} squash={bSquash} glowPx={0} aligned={false} />
      {/* ударная волна на клике */}
      <div style={{
        position: 'absolute', left: GX, top: GY, width: 400, height: 400, marginLeft: -200, marginTop: -200,
        transform: `scale(${0.3 + burst * 1.6})`, border: `4px solid ${accent}`, borderRadius: '999px',
        opacity: burst * 0.7, pointerEvents: 'none', zIndex: 6,
      }} />
      {/* искры из контактной точки (кончик руки на ободе) */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const b = Math.max(burst, tick)
        const a = (-150 + i * 28) * Math.PI / 180
        const d = 14 + b * (60 + (i % 3) * 14)
        const sz = i % 2 === 0 ? 11 : 6
        return (
          <div key={i} style={{
            position: 'absolute', left: ARM_X + Math.cos(a) * d, top: ARM_Y + Math.sin(a) * d,
            width: sz, height: sz, marginLeft: -sz / 2, marginTop: -sz / 2, background: accent,
            borderRadius: i % 2 === 0 ? '3px' : '999px', transform: `rotate(45deg) scale(${0.4 + b})`,
            opacity: b, pointerEvents: 'none', zIndex: 6,
          }} />
        )
      })}
      {/* r — наклоняется вправо, верхняя рука толкает обод */}
      <img src="/maintenance-r.png" alt="" style={{
        position: 'absolute', left: LOGO_L, top: LOGO_T, width: R_W, height: R_H,
        transform: `rotate(${wr}deg) scale(${1 + 0.03 * burst})`, transformOrigin: '30% 96%',
        zIndex: 5, filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.5))',
      }} />
      {/* тексты */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center',
        color: '#F5F2F4', fontSize: 56, fontWeight: 600, letterSpacing: '-0.01em',
        padding: '0 80px', lineHeight: 1.18,
      }}>{MAIN_TEXT}</div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1276, textAlign: 'center',
        color: '#8f868c', fontSize: 30, fontWeight: 400, padding: '0 120px', lineHeight: 1.4, whiteSpace: 'pre-line',
      }}>{SUB_TEXT}</div>
      {/* лоадер-точки */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1390,
        display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center',
      }}>
        {[0, 1, 2].map((i) => {
          const v = 0.5 + 0.5 * Math.sin(p * TAU * 3 - i * (TAU / 6))
          return (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: 999, background: accent,
              opacity: 0.35 + 0.65 * v, transform: `scale(${0.8 + 0.35 * v})`,
            }} />
          )
        })}
      </div>
    </div>
  )
}

export default function MaintenanceScreen() {
  const [p, setP] = useState(0)
  const [scale, setScale] = useState(() =>
    Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H))

  useEffect(() => {
    let raf
    const loop = (t) => {
      setP((t % CYCLE_MS) / CYCLE_MS)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onResize = () =>
      setScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060608', overflow: 'hidden', zIndex: 100 }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: CANVAS_W, height: CANVAS_H,
        transform: `translate(-50%,-50%) scale(${scale})`,
      }}>
        <MaintenanceScene p={p} />
      </div>
    </div>
  )
}
