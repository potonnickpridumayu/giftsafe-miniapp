import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAdjustments, IconX } from '@tabler/icons-react'
import { api, giftSlug, fragmentImage } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import GramIcon from '../components/GramIcon'
import FiltersSheet from '../components/FiltersSheet'
import { LoadingScreen, IconSwap } from '../components/StatusIcons'
import StateCard, { IlloError, IlloDeals, IlloSearch } from '../components/MarketStates'
import { fmtGram } from '../utils/format'
import { useMarketFilters, marketFiltersActive, resetMarketFilters } from '../utils/marketFilters'

// Единый стиль рамок ленты — как у истории в Профиле
const CARD_BORDER = '1px solid rgba(255, 255, 255, 0.30)'

// Подписи событий лотов: тип → [текст, цвет]
const EVENT_LABELS = {
  sale: ['Продажа', 'var(--gold)'],
  list: ['Выставлен на продажу', '#3ddc84'],
  delist: ['Снят с продажи', 'var(--text-secondary)'],
  price: ['Цена изменена', '#7f9df5'],
}

// Чипы фильтра по типу события — только для этой страницы, на Маркет
// не переносится (там таких сущностей нет)
const KIND_CHIPS = [
  ['sale', 'Продажа'],
  ['list', 'Размещение'],
  ['price', 'Изменение цены'],
  ['trade', 'Обмен'],
  ['delist', 'Снятие'],
]

function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

function attrsOf(raw) {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

// Все подарки записи одним списком (у обмена их несколько с двух сторон)
function itemGifts(it) {
  if (it.kind === 'trade') return [...(it.offered_gifts || []), ...(it.target_gifts || [])]
  return [it]
}

// Цена записи для фильтра/сортировки (у обмена цены нет)
function itemPrice(it) {
  if (it.kind === 'sale') return it.amount_ton
  if (it.kind === 'list' || it.kind === 'price' || it.kind === 'delist') return it.price_ton
  return null
}

// Строка подарка с миниатюрой; тап → официальная страница t.me/nft
function GiftRow({ gift, haptic, openLink, size = 34 }) {
  const slug = giftSlug(gift.gift_name, gift.gift_number, gift.nft_address)
  const thumb = fragmentImage(gift.gift_name, gift.gift_number, gift.nft_address)
  const link = slug ? `https://t.me/nft/${slug}` : ''
  return (
    <div
      onClick={link ? () => { haptic('light'); openLink(link) } : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: link ? 'pointer' : 'default' }}
    >
      <div style={{
        width: size, height: size, borderRadius: 'var(--radius-md)', overflow: 'hidden',
        flexShrink: 0, background: 'var(--bg-card-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: size / 2 }}>🎁</span>}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {gift.gift_name}{gift.gift_number ? ` #${gift.gift_number}` : ''}
      </div>
    </div>
  )
}

export default function MarketHistory() {
  const navigate = useNavigate()
  const { haptic, openLink } = useTelegram()
  const [items, setItems] = useState(null) // null = загрузка
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  // Фильтры общие с Маркетом: выставил там — действуют и здесь
  const filters = useMarketFilters()
  // …а тип события — ЛОКАЛЬНЫЙ фильтр этой страницы (мультивыбор;
  // пустой набор = показывать всё). В общий стор не пишем — на Маркете
  // продаж/размещений как фильтров не существует.
  const [kinds, setKinds] = useState(() => new Set())
  const toggleKind = (k) => {
    haptic('light')
    setKinds(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  useEffect(() => {
    api.getMarketHistory()
      .then(setItems)
      .catch(e => { setError(e.message || 'Не удалось загрузить историю'); setItems([]) })
  }, [])

  const attrOptions = useMemo(() => {
    const models = new Set(), backdrops = new Set(), symbols = new Set()
    for (const it of items || []) {
      for (const g of itemGifts(it)) {
        const a = attrsOf(g.tg_backdrop)
        if (a.model_name) models.add(a.model_name)
        if (a.backdrop_name) backdrops.add(a.backdrop_name)
        if (a.symbol_name) symbols.add(a.symbol_name)
      }
    }
    return { models: [...models], backdrops: [...backdrops], symbols: [...symbols] }
  }, [items])

  const visible = useMemo(() => {
    let list = [...(items || [])]
    if (kinds.size > 0) list = list.filter(it => kinds.has(it.kind))
    const numQ = filters.number.replace('#', '').trim()
    if (numQ) {
      list = list.filter(it => itemGifts(it).some(
        g => String(g.gift_number || '').replace('#', '').includes(numQ)
      ))
    }
    const pmin = parseFloat(String(filters.priceMin).replace(',', '.'))
    const pmax = parseFloat(String(filters.priceMax).replace(',', '.'))
    // Фильтр по цене оставляет только записи, у которых цена вообще есть
    if (!isNaN(pmin)) list = list.filter(it => itemPrice(it) != null && itemPrice(it) >= pmin)
    if (!isNaN(pmax)) list = list.filter(it => itemPrice(it) != null && itemPrice(it) <= pmax)
    const byAttr = (key, val) => (it) =>
      itemGifts(it).some(g => attrsOf(g.tg_backdrop)[key] === val)
    if (filters.model) list = list.filter(byAttr('model_name', filters.model))
    if (filters.backdropName) list = list.filter(byAttr('backdrop_name', filters.backdropName))
    if (filters.symbolName) list = list.filter(byAttr('symbol_name', filters.symbolName))
    if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
      const sign = filters.sort === 'price_asc' ? 1 : -1
      // записи без цены — в конец, между собой по дате
      list.sort((a, b) => {
        const pa = itemPrice(a), pb = itemPrice(b)
        if (pa == null && pb == null) return new Date(b.completed_at) - new Date(a.completed_at)
        if (pa == null) return 1
        if (pb == null) return -1
        return sign * (pa - pb)
      })
    }
    return list
  }, [items, filters, kinds])

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', padding: 0 }}
        >
          ← Назад
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { haptic('light'); setShowFilters(true) }}
            className={`chip${marketFiltersActive(filters) || kinds.size > 0 ? ' active' : ''}`}
            style={{ flexShrink: 0, padding: '0 14px' }}
            aria-label="Фильтры"
          >
            <IconAdjustments size={19} stroke={1.8} />
          </button>
          {(marketFiltersActive(filters) || kinds.size > 0) && (
            <button
              onClick={() => { haptic('light'); resetMarketFilters(); setKinds(new Set()) }}
              className="chip"
              style={{ flexShrink: 0, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              aria-label="Очистить фильтры"
            >
              <IconX size={16} stroke={2} />
            </button>
          )}
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
        Активность маркета
      </h2>

      {items === null ? (
        <LoadingScreen text="Загружаем историю…" />
      ) : error ? (
        <StateCard illo={<IlloError />} title="Ошибка загрузки" sub={error} />
      ) : items.length === 0 ? (
        <StateCard
          illo={<IlloDeals />}
          title="Сделок пока не было"
          sub="Здесь появятся продажи и обмены маркета."
        />
      ) : visible.length === 0 ? (
        <StateCard
          illo={<IlloSearch />}
          title="Ничего не найдено"
          sub="Попробуйте изменить фильтры или поисковый запрос."
        />
      ) : visible.map((it, i) => {
        if (it.kind === 'trade') {
          const left = it.offered_gifts || []
          const right = it.target_gifts || []
          return (
            <div key={`t${i}`} className="card" style={{ padding: '10px 16px', marginBottom: 6, border: CARD_BORDER }}>
              <div style={{ fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontWeight: 600, color: '#8a7fd6', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IconSwap size={13} color="#8a7fd6" /> Обмен
                </span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {fmtDate(it.completed_at)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {left.map((g, j) => <GiftRow key={`l${j}`} gift={g} haptic={haptic} openLink={openLink} />)}
              </div>
              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <div style={{ fontSize: 30, color: '#8a7fd6', fontWeight: 700, lineHeight: 1 }}>⇅</div>
                {it.top_up_ton > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>доплата {fmtGram(it.top_up_ton)} <GramIcon size={13} /></div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {right.map((g, j) => <GiftRow key={`r${j}`} gift={g} haptic={haptic} openLink={openLink} />)}
              </div>
            </div>
          )
        }
        const [label, color] = EVENT_LABELS[it.kind] || EVENT_LABELS.sale
        return (
          <div key={i} className="card" style={{
            padding: '10px 16px', marginBottom: 6, border: CARD_BORDER,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <GiftRow gift={it} haptic={haptic} openLink={openLink} size={40} />
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color }}>{label}</span>
                {' · '}{fmtDate(it.completed_at)}
              </div>
            </div>
            {it.kind === 'price' ? (
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                {it.old_price_ton != null && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'line-through', textDecorationColor: '#8f868c' }}>
                    {fmtGram(it.old_price_ton)}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--money-1, var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                  {fmtGram(it.price_ton)} <GramIcon size={24} />
                </div>
              </div>
            ) : itemPrice(it) != null ? (
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0,
                color: 'var(--money-1, var(--gold))',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {fmtGram(itemPrice(it))} <GramIcon size={24} />
              </div>
            ) : null}
          </div>
        )
      })}

      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        options={attrOptions}
        haptic={haptic}
        onReset={() => setKinds(new Set())}
        extra={(
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '16px 0 8px', fontWeight: 600, letterSpacing: 0.5 }}>
              ТИП СОБЫТИЯ
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KIND_CHIPS.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => toggleKind(value)}
                  className={`chip${kinds.has(value) ? ' active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      />
    </div>
  )
}
