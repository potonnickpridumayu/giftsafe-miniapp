// Splash-анимация логотипа ruby. Точный порт Design-Component (ruby-splash.jsx
// + движок animations.jsx): математика тайминга перенесена 1:1.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ В public/, А НЕ МОДУЛЬ В src/: сплэш обязан появиться в
// первые же кадры. Модуль из src/ Vite схлопывает в общий бандл (~600КБ gzip) —
// анимация ждала бы его целиком, и на 3G это секунды тёмного экрана. Файлы из
// public/ копируются как есть, тег остаётся обычным <script> сразу после
// #splash и выполняется ДО бандла. Отсюда же ванильный JS без импортов.
//
// Наружу отдаёт window.rubySplash:
//   ready     — промис, резолвится когда анимация реально пошла (ассеты готовы)
//   startedAt — Date.now() этого момента; от него App.jsx считает полный прогон
//   finish()  — запустить затухание и убрать сплэш; промис на конец затухания
//
// Ассеты — оригиналы 1024x1024 (splash-gem.png, splash-r.png): позиции сцены
// завязаны на положение картинки внутри этого холста, кропать нельзя.

(function () {
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

  function interpolate(input, output) {
    return t => {
      if (t <= input[0]) return output[0]
      if (t >= input[input.length - 1]) return output[output.length - 1]
      for (let i = 0; i < input.length - 1; i++) {
        if (t >= input[i] && t <= input[i + 1]) {
          const span = input[i + 1] - input[i]
          const local = span === 0 ? 0 : (t - input[i]) / span
          return output[i] + (output[i + 1] - output[i]) * local
        }
      }
      return output[output.length - 1]
    }
  }

  function animate({ from, to, start, end, ease }) {
    return t => {
      if (t <= start) return from
      if (t >= end) return to
      return from + (to - from) * ease((t - start) / (end - start))
    }
  }

  // ── раскладка (координаты холста 1080×1920) ──────────────────────────────────
  const W = 1080, H = 1920, DUR = 3.0
  const S = 520                               // сторона лого-бокса
  const BOX_X = (W - S) / 2                   // 280
  const BOX_Y = 620                           // верх лого-бокса
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

  // Ждём именно ДЕКОДИРОВАННУЮ картинку: onload значит «байты приехали», но
  // первый кадр с ней всё равно может не успеть отрисоваться. Ошибку глотаем —
  // сплэш не должен застрять из-за неприехавшей картинки.
  const preloadImage = src => new Promise(res => {
    const im = new Image()
    im.onload = () => (im.decode ? im.decode().then(res, res) : res())
    im.onerror = res
    im.src = src
  })

  const mk = (tag, style) => {
    const n = document.createElement(tag)
    Object.assign(n.style, style)
    return n
  }

  const root = document.getElementById('splash')

  if (root) {
    const BOX = { position: 'absolute', left: '0px', top: '0px', width: S + 'px', height: S + 'px' }
    const IMG = { ...BOX, objectFit: 'contain' }

    Object.assign(root.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', transition: 'opacity 0.45s ease',
    })

    // visibility: hidden до первого кадра — <img> камня иначе нарисуется в
    // позиции покоя, как только приедут его байты («красный ромб висит»).
    const canvas = mk('div', {
      width: W + 'px', height: H + 'px', flex: '0 0 auto',
      position: 'relative', transformOrigin: 'center center', visibility: 'hidden',
    })

    const ripple = mk('div', {
      position: 'absolute', borderRadius: '50%',
      border: '3px solid #FF2D55', opacity: '0',
    })

    const logo = mk('div', {
      position: 'absolute', left: BOX_X + 'px', top: BOX_Y + 'px',
      width: S + 'px', height: S + 'px',
      transformOrigin: '50% 60%', willChange: 'transform',
    })

    const rImg = mk('img', { ...IMG, opacity: '0', willChange: 'transform, opacity, clip-path' })
    rImg.src = '/splash-r.png'
    rImg.alt = ''

    const gemImg = mk('img', {
      ...IMG,
      transformOrigin: GEM_CX + 'px ' + GEM_BOTTOM + 'px',
      willChange: 'transform',
    })
    gemImg.src = '/splash-gem.png'
    gemImg.alt = 'ruby'

    const glintWrap = mk('div', {
      ...BOX, visibility: 'hidden',
      WebkitMaskImage: 'url(/splash-gem.png)', maskImage: 'url(/splash-gem.png)',
      WebkitMaskSize: S + 'px ' + S + 'px', maskSize: S + 'px ' + S + 'px',
      overflow: 'hidden',
    })
    const glintBar = mk('div', {
      position: 'absolute', top: '-80px', left: '0px', width: '90px', height: (S + 160) + 'px',
      background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85), rgba(255,255,255,0))',
      filter: 'blur(6px)', willChange: 'transform',
    })
    glintWrap.appendChild(glintBar)

    const spark = mk('div', {
      position: 'absolute', left: (GEM_CX + 66) + 'px', top: (GEM_CY - 92) + 'px',
      width: '26px', height: '26px', background: '#FFFFFF',
      borderRadius: '5px', visibility: 'hidden', willChange: 'transform',
    })

    logo.append(rImg, gemImg, glintWrap, spark)

    const word = mk('div', {
      position: 'absolute', left: '0px', right: '0px', top: (R_BOTTOM_Y + 110) + 'px',
      textAlign: 'center',
      fontFamily: "'Manrope', sans-serif", fontWeight: '800', fontSize: '96px',
      color: '#FFFFFF', opacity: '0', willChange: 'transform, opacity',
    })
    word.textContent = 'ruby'

    canvas.append(ripple, logo, word)
    root.appendChild(canvas)

    const draw = t => {
      // камень: падение → приземление → отскок → лёгкое «дыхание»
      let gemY
      if (t < 0.10) gemY = -1100
      else if (t < 0.55) gemY = fall(t)
      else if (t < 0.75) gemY = rebound(t)
      else if (t < 0.92) gemY = settle(t)
      else gemY = 0
      if (t > 1.05) gemY += Math.sin((t - 1.05) * 2.4) * 5

      gemImg.style.transform =
        'translateY(' + gemY + 'px) rotate(' + spin(t) + 'deg) scale(' + squashX(t) + ',' + squashY(t) + ')'

      // «r» выезжает из точки удара
      const pr = clamp((t - 0.60) / 0.55, 0, 1)
      rImg.style.opacity = clamp(pr * 3, 0, 1)
      rImg.style.transform = 'translateY(' + (1 - Easing.easeOutBack(pr)) * 90 + 'px)'
      rImg.style.clipPath = 'inset(' + (1 - Easing.easeOutCubic(pr)) * 100 + '% 0 0 0)'

      // рябь от удара
      const rip = clamp((t - 0.55) / 0.75, 0, 1)
      const ripR = 50 + Easing.easeOutCubic(rip) * 250
      ripple.style.opacity = rip > 0 && rip < 1 ? (1 - rip) * 0.45 : 0
      ripple.style.left = (BOX_X + GEM_CX - ripR) + 'px'
      ripple.style.top = (BOX_Y + GEM_BOTTOM - ripR) + 'px'
      ripple.style.width = ripple.style.height = (ripR * 2) + 'px'

      // Блик по камню (сдвиг — transform'ом, а не left: left дёргал layout).
      // Вне своего окна гасим через visibility: под маской лежит blur(6px),
      // незачем держать его слой всю анимацию.
      const gl = clamp((t - 1.30) / 0.55, 0, 1)
      const glOn = gl > 0 && gl < 1
      glintWrap.style.visibility = glOn ? 'visible' : 'hidden'
      if (glOn) {
        glintBar.style.transform =
          'translateX(' + (-160 + Easing.easeInOutCubic(gl) * 820) + 'px) rotate(22deg)'
      }

      // искра у угла камня
      const sp = clamp((t - 1.48) / 0.45, 0, 1)
      const spS = Math.sin(sp * Math.PI)
      const spOn = spS > 0.01
      spark.style.visibility = spOn ? 'visible' : 'hidden'
      if (spOn) spark.style.transform = 'rotate(' + (45 + sp * 120) + 'deg) scale(' + spS + ')'

      // словоформа
      const wm = clamp((t - 1.55) / 0.55, 0, 1)
      const wmC = Easing.easeOutCubic(wm)
      word.style.opacity = wmC
      word.style.letterSpacing = word.style.textIndent = (0.42 - wmC * 0.36) + 'em'
      word.style.transform = 'translateY(' + (1 - wmC) * 26 + 'px)'

      // дыхание всего логотипа + финальный подъём
      let logoScale = 1
      if (t > 1.2) logoScale += 0.008 * Math.sin((t - 1.2) * 2.0)
      logoScale *= 1 + Easing.easeInOutQuad(clamp((t - 2.55) / 0.45, 0, 1)) * 0.05
      logo.style.transform = 'scale(' + logoScale + ')'
    }

    // contain-fit холста 1080×1920 в экран
    const measure = () => {
      const s = Math.max(0.05, Math.min(root.clientWidth / W, root.clientHeight / H))
      canvas.style.transform = 'scale(' + s + ')'
    }
    measure()
    window.addEventListener('resize', measure)

    let raf = null
    let done = false
    const api = { ready: null, startedAt: null, finish: null }

    api.finish = () => {
      if (done) return Promise.resolve()
      done = true
      root.style.opacity = '0'
      root.style.pointerEvents = 'none'
      return new Promise(res => setTimeout(() => {
        if (raf) cancelAnimationFrame(raf)
        window.removeEventListener('resize', measure)
        root.remove()
        res()
      }, 450))
    }

    const fontReady = document.fonts?.load
      ? document.fonts.load('800 96px Manrope', 'ruby').catch(() => {})
      : Promise.resolve()

    // Стартуем только когда камень, «r» и шрифт слова готовы: иначе на медленной
    // сети первые прогоны идут вхолостую — рисовать ещё нечем.
    api.ready = Promise.all([
      preloadImage('/splash-gem.png'),
      preloadImage('/splash-r.png'),
      fontReady,
    ]).then(() => {
      if (done) return
      let last = null, t = 0
      // Время зациклено по DUR (как Stage loop в исходном DC): пока данные
      // грузятся дольше интро, анимация идёт по кругу. Обрывает её App.jsx через
      // finish() — первый прогон при этом всегда доигрывает до конца.
      const step = ts => {
        if (last == null) last = ts
        // %=, а не -=: если вкладку свернули, rAF замирает и на возврате
        // прилетает разом большой dt — он может перекрыть несколько циклов.
        t = (t + (ts - last) / 1000) % DUR
        last = ts
        draw(t)
        raf = requestAnimationFrame(step)
      }
      // сначала кадр t=0, и только потом показываем холст
      draw(0)
      canvas.style.visibility = 'visible'
      api.startedAt = Date.now()
      raf = requestAnimationFrame(step)
    })

    window.rubySplash = api
  }
})()
