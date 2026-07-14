import { useMarketFilters, setMarketFilters, resetMarketFilters } from '../utils/marketFilters'

const SORTS = [
  { label: 'Новые', value: 'new' },
  { label: 'Дешевле', value: 'price_asc' },
  { label: 'Дороже', value: 'price_desc' },
]

// Общая шторка фильтров Маркета и Истории маркета. Состояние живёт в
// utils/marketFilters — одно на обе страницы.
// extra — JSX-секция, специфичная для страницы (например, тип события в
// Истории): рендерится в шторке первой, но её состояние живёт у страницы
// и на другие страницы не переносится. onReset зовётся из «Очистить всё»,
// чтобы страница сбросила и своё локальное состояние.
export default function FiltersSheet({ open, onClose, options, haptic, extra, onReset }) {
  const filters = useMarketFilters()
  if (!open) return null

  const setF = (patch) => setMarketFilters(patch)

  const section = (title) => (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '16px 0 8px', fontWeight: 600, letterSpacing: 0.5 }}>
      {title}
    </div>
  )

  const attrChips = (opts, current, key) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {opts.map(o => (
        <button
          key={o}
          onClick={() => { haptic('light'); setF({ [key]: current === o ? '' : o }) }}
          className={`chip${current === o ? ' active' : ''}`}
        >
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(5,3,4,0.7)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 480,
          margin: '0 auto',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Фильтры</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {extra}

        {section('НОМЕР ПОДАРКА')}
        <input
          className="input"
          placeholder="# 33824"
          inputMode="numeric"
          value={filters.number}
          onChange={e => setF({ number: e.target.value.replace(/[^\d#]/g, '') })}
        />

        {section('СОРТИРОВАТЬ ПО')}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SORTS.map(s => (
            <button
              key={s.value}
              onClick={() => { haptic('light'); setF({ sort: s.value }) }}
              className={`chip${filters.sort === s.value ? ' active' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section('ЦЕНА')}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="От"
            inputMode="decimal"
            value={filters.priceMin}
            onChange={e => setF({ priceMin: e.target.value.replace(/[^\d.,]/g, '') })}
          />
          <input
            className="input"
            placeholder="До"
            inputMode="decimal"
            value={filters.priceMax}
            onChange={e => setF({ priceMax: e.target.value.replace(/[^\d.,]/g, '') })}
          />
        </div>

        {options.models.length > 0 && (
          <>
            {section('МОДЕЛЬ')}
            {attrChips(options.models, filters.model, 'model')}
          </>
        )}

        {options.backdrops.length > 0 && (
          <>
            {section('ФОН')}
            {attrChips(options.backdrops, filters.backdropName, 'backdropName')}
          </>
        )}

        {options.symbols.length > 0 && (
          <>
            {section('СИМВОЛ')}
            {attrChips(options.symbols, filters.symbolName, 'symbolName')}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={() => { haptic('light'); resetMarketFilters(); onReset?.() }}
          >
            Очистить всё
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={() => { haptic('medium'); onClose() }}
          >
            Показать результаты
          </button>
        </div>
      </div>
    </div>
  )
}
