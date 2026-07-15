import { api } from '../api/client'
import { warmGiftArt } from '../components/TgGiftSticker'

// Кэш данных вкладок в памяти: страница рендерится мгновенно из кэша,
// свежие данные подтягиваются фоном. prefetchAll() дёргается на старте,
// пока висит сплэш — к первому экрану всё уже загружено.
const store = new Map()

export const getCached = (key) => store.get(key)
export const setCached = (key, value) => { store.set(key, value) }

// Сколько лотов маркета прогреваем графикой под сплэшем: первых экранов
// хватает, остальное догрузится обычным путём (сплэш не должен висеть
// минуту на гигантском маркете; сверху его и так страхует потолок 10с).
const WARM_ART_LIMIT = 24

// Прогреваем не залпом, а батчами, уступая поток между ними. Залп из 24 штук
// забивал главный поток распаковкой/разбором стикеров, и анимация сплэша,
// которая рисуется на том же потоке, теряла кадры. Батч держит сеть
// параллельной, а пауза между батчами отдаёт браузеру кадр на отрисовку.
const WARM_BATCH = 4
const yieldToFrame = () => new Promise(r => setTimeout(r, 0))

async function warmInBatches(listings) {
  for (let i = 0; i < listings.length; i += WARM_BATCH) {
    await Promise.allSettled(
      listings.slice(i, i + WARM_BATCH).map(l => warmGiftArt(l.tg_sticker, l.tg_backdrop))
    )
    await yieldToFrame()
  }
}

let prefetchPromise = null
export function prefetchAll() {
  if (!prefetchPromise) {
    prefetchPromise = Promise.allSettled([
      // Маркет — первый экран: сплэш держится, пока не готова и ГРАФИКА
      // подарков (стикеры + узоры), а не только JSON — иначе карточки
      // достраиваются у пользователя на глазах.
      api.getListings().then(async d => {
        setCached('listings', d)
        await warmInBatches(d.slice(0, WARM_ART_LIMIT))
      }),
      api.getTrades().then(d => setCached('trades', d)),
      // вне Telegram (нет initData) портфель вернёт 401 — allSettled это глотает
      api.getMyGifts().then(d => setCached('portfolio', d)),
    ])
  }
  return prefetchPromise
}
