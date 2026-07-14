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

let prefetchPromise = null
export function prefetchAll() {
  if (!prefetchPromise) {
    prefetchPromise = Promise.allSettled([
      // Маркет — первый экран: сплэш держится, пока не готова и ГРАФИКА
      // подарков (стикеры + узоры), а не только JSON — иначе карточки
      // достраиваются у пользователя на глазах.
      api.getListings().then(async d => {
        setCached('listings', d)
        await Promise.allSettled(
          d.slice(0, WARM_ART_LIMIT).map(l => warmGiftArt(l.tg_sticker, l.tg_backdrop))
        )
      }),
      api.getTrades().then(d => setCached('trades', d)),
      // вне Telegram (нет initData) портфель вернёт 401 — allSettled это глотает
      api.getMyGifts().then(d => setCached('portfolio', d)),
    ])
  }
  return prefetchPromise
}
