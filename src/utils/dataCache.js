import { api, fragmentImage } from '../api/client'
import { warmGiftArt } from '../components/TgGiftSticker'

// Кэш данных вкладок в памяти: страница рендерится мгновенно из кэша,
// свежие данные подтягиваются фоном. prefetchAll() дёргается на старте,
// пока висит сплэш — к первому экрану всё уже загружено.
const store = new Map()

export const getCached = (key) => store.get(key)
export const setCached = (key, value) => { store.set(key, value) }

// Сколько подарков прогреваем графикой под сплэшем — НА КАЖДУЮ вкладку.
// Раньше грели 24 и только на Маркете: обмен и портфель открывались пустыми и
// доедали графику уже на глазах у пользователя. Первых экранов хватает,
// остальное догрузится обычным путём при скролле.
const WARM_ART_LIMIT = 12

// Прогреваем не залпом, а батчами, уступая поток между ними. Залп забивал
// главный поток распаковкой/разбором стикеров, и анимация сплэша, которая
// рисуется на том же потоке, теряла кадры. Батч держит сеть параллельной,
// а пауза между батчами отдаёт браузеру кадр на отрисовку.
const WARM_BATCH = 4
const yieldToFrame = () => new Promise(r => setTimeout(r, 0))

// items: [{ sticker, backdrop, image }] — уже в порядке отображения
async function warmInBatches(items) {
  for (let i = 0; i < items.length; i += WARM_BATCH) {
    await Promise.allSettled(
      items.slice(i, i + WARM_BATCH).map(it => warmGiftArt(it.sticker, it.backdrop, it.image))
    )
    await yieldToFrame()
  }
}

// Греем В ТОМ ЖЕ ПОРЯДКЕ, в каком подарки покажет вкладка. Иначе набор не
// совпадает с видимым: карточки первого экрана остаются непрогретыми и на
// медленной сети открываются с недогруженной графикой, хотя сплэш уже считает,
// что всё готово.
const asCardItems = (list) => list.map(i => ({
  sticker: i.tg_sticker, backdrop: i.tg_backdrop, image: i.image_full || i.image_url,
}))

let prefetchPromise = null
export function prefetchAll() {
  if (!prefetchPromise) {
    prefetchPromise = Promise.allSettled([
      // Сплэш держится, пока не готова и ГРАФИКА подарков (стикеры + узоры),
      // а не только JSON — иначе карточки достраиваются на глазах.
      api.getListings().then(async d => {
        setCached('listings', d)
        // Маркет по умолчанию сортирует новые сверху (Market.jsx)
        const byDisplay = [...d].sort((a, b) => b.listed_at - a.listed_at)
        await warmInBatches(asCardItems(byDisplay.slice(0, WARM_ART_LIMIT)))
      }),
      api.getTrades().then(async d => {
        setCached('trades', d)
        // Обмен показывает лоты в порядке ответа — не сортирует (Trade.jsx)
        await warmInBatches(asCardItems(d.slice(0, WARM_ART_LIMIT)))
      }),
      // вне Telegram (нет initData) портфель вернёт 401 — allSettled это глотает
      api.getMyGifts().then(async d => {
        setCached('portfolio', d)
        // Портфель: сначала на продаже, потом в обмене, потом свободные
        // (statusRank в Portfolio.jsx). Картинку он берёт не из поля, а
        // считает через fragmentImage — греем ровно её.
        const rank = g => (g.on_sale ? 0 : g.on_trade ? 1 : 2)
        const byDisplay = [...d].sort((a, b) => rank(a) - rank(b))
        await warmInBatches(byDisplay.slice(0, WARM_ART_LIMIT).map(g => ({
          sticker: g.tg_sticker,
          backdrop: g.tg_backdrop,
          image: fragmentImage(g.gift_name, g.gift_number, g.nft_address) || g.image_url,
        })))
      }),
    ])
  }
  return prefetchPromise
}
