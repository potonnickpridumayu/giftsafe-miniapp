// Потолок цены лота. Должен совпадать с MAX_LISTING_PRICE в api_server.py:
// бэкенд отвергает такую цену сам (обойти интерфейс можно), здесь — только
// ранняя понятная ошибка, чтобы не гонять заведомо мёртвый запрос.
export const MAX_LISTING_PRICE = 100000

export const MAX_PRICE_ERROR = 'Максимум 100 000 Gram за лот. Мать продаешь?'

// true — цену вводить нельзя, показываем MAX_PRICE_ERROR.
export const overMaxPrice = (n) => Number(n) > MAX_LISTING_PRICE
