import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { api, fragmentImage, giftAccentColor } from '../api/client'
import { useTelegram } from '../hooks/useTelegram'
import TgGiftSticker from '../components/TgGiftSticker'
import GiftCard from '../components/GiftCard'
import GramIcon from '../components/GramIcon'
import { IconLayoutGrid, IconList } from '@tabler/icons-react'
import { LoadingScreen, IconSwap, MiniSpin, MiniSpinAccent, BtnShimmer, OwnerAvatar, Chip } from '../components/StatusIcons'
import StateCard, { IlloError, IlloMissing } from '../components/MarketStates'
import { showResult } from '../components/ResultSheet'
import { WarnIcon } from '../components/WarnIcon'
import { fmtGram, fmtPercent } from '../utils/format'

// Комиссия площадки — та же, что и на Маркете (MARKET_FEE на бэкенде),
// берётся только с доплаты при принятии оффера.
const FEE_RATE = 0.03

// Русское склонение «подарок / подарка / подарков»
function giftWord(n) {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return 'подарков'
  if (b === 1) return 'подарок'
  if (b >= 2 && b <= 4) return 'подарка'
  return 'подарков'
}

export default function TradeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { haptic, showConfirm, user, openLink } = useTelegram()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  // Мульти-подарочный лот: по умолчанию карточки (как на маркете/обмене),
  // кнопкой сворачивается в компактные строки.
  const [compactGifts, setCompactGifts] = useState(false)
  const [picking, setPicking] = useState(false)
  const [myGifts, setMyGifts] = useState(null)
  const [selectedGiftIds, setSelectedGiftIds] = useState(() => new Set())
  const [topUp, setTopUp] = useState('')
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState(null)
  const [proposed, setProposed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api.getTrade(id)
      setItem(data)
    } catch (e) {
      setLoadError(e.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const openPicker = async () => {
    haptic('light')
    setProposeError(null)
    setPicking(true)
    if (myGifts === null) {
      try {
        const gifts = await api.getMyGifts()
        setMyGifts(gifts.filter(g => !g.on_sale && !g.on_trade))
      } catch {
        setMyGifts([])
      }
    }
  }

  const topUpNum = parseFloat(String(topUp).replace(',', '.')) || 0
  const topUpFee = topUpNum * FEE_RATE

  const toggleGift = (giftId) => {
    haptic('light')
    setSelectedGiftIds(prev => {
      const next = new Set(prev)
      if (next.has(giftId)) next.delete(giftId)
      else next.add(giftId)
      return next
    })
  }

  const handlePropose = async () => {
    if (selectedGiftIds.size === 0) return
    haptic('medium')
    setProposing(true)
    setProposeError(null)
    const topUpNum = parseFloat(String(topUp).replace(',', '.')) || 0
    try {
      await api.proposeTradeOffer(item.id, Array.from(selectedGiftIds), topUpNum)
      setPicking(false)
      showResult({
        icon: 'success', title: 'Предложение отправлено!',
        sub: 'Владелец увидит его в Профиле → Офферы',
        onClose: () => navigate('/trade'),
      })
    } catch (e) {
      showResult({ icon: 'error', title: 'Не удалось отправить', sub: e.message || 'Попробуйте ещё раз' })
      haptic('heavy')
    } finally {
      setProposing(false)
    }
  }

  const handleCancel = () => {
    haptic('medium')
    showConfirm(
      `Снять «${item.name}» с обмена? Подарок останется в вашем портфеле`,
      async (ok) => {
        if (!ok) return
        setCancelling(true)
        setCancelError(null)
        try {
          await api.cancelTrade(item.id)
          showResult({
            icon: 'return', title: 'Лот снят с обмена', sub: 'Подарок остался в вашем портфеле',
            onClose: () => navigate('/portfolio'),
          })
        } catch (e) {
          showResult({ icon: 'error', title: 'Не удалось снять лот', sub: e.message || 'Попробуйте ещё раз' })
          haptic('heavy')
        } finally {
          setCancelling(false)
        }
      }
    )
  }

  if (loading) return (
    <div className="page">
      <LoadingScreen text="Загрузка…" />
    </div>
  )

  // Бэкенд шлёт 404 "Объявление об обмене не найдено" тем же текстом, что и
  // настоящую ошибку сети (request() бросает Error с detail из ответа) —
  // разводим их по тексту, иначе «объявление снято» показывалось бы как
  // «Ошибка загрузки».
  if (loadError && loadError !== 'Объявление об обмене не найдено') return (
    <div className="page">
      <StateCard illo={<IlloError />} title="Ошибка загрузки" sub={loadError} cta="Повторить" onCta={load} />
    </div>
  )

  if (loadError || !item) return (
    <div className="page">
      <StateCard
        illo={<IlloMissing />}
        title="Обмен не найден"
        sub="Похоже, объявление снято или уже обменяно."
        cta="← Назад"
        ctaVariant="ghost"
        onCta={() => navigate('/trade')}
      />
    </div>
  )

  const rarityColor = giftAccentColor(item.gift_id ?? item.id)
  let attrs = {}
  if (item.tg_backdrop) {
    try { attrs = JSON.parse(item.tg_backdrop) } catch { /* без атрибутов */ }
  }
  const soldOut = item.status && item.status !== 'active'
  const isOwnTrade = user?.id === item.owner_id

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
      >
        ← Назад
      </button>

      {item.giftCount <= 1 ? (
        <>
          <div style={{
            width: '100%', aspectRatio: '1', maxWidth: 280, margin: '0 auto 24px',
            background: `radial-gradient(circle at 40% 35%, ${rarityColor}33, var(--bg-card))`,
            borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 80, border: `1px solid ${rarityColor}33`, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <TgGiftSticker image={item.image_full || item.image_url} stickerId={item.tg_sticker} backdrop={item.tg_backdrop} fallback={item.emoji} autoPlay />
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: item.gift_link ? 10 : 20 }}>
            {item.name} {item.number ? <span style={{ fontWeight: 500 }}>{item.number}</span> : null}
          </h2>

          {item.gift_link && (
            <button
              onClick={() => { haptic('light'); openLink(item.gift_link) }}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)' }}
            >
              🔗 Посмотреть подарок в Telegram
            </button>
          )}

          {(attrs.model_name || attrs.backdrop_name || attrs.symbol_name) && (
            <div className="card" style={{ padding: '12px 14px', marginBottom: 16 }}>
              {[
                ['Модель', attrs.model_name, attrs.model_rarity],
                ['Фон', attrs.backdrop_name, attrs.backdrop_rarity],
                ['Символ', attrs.symbol_name, attrs.symbol_rarity],
              ].filter(([, v]) => v).map(([label, value, rarity], i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {value}
                    {rarity != null && (
                      <span style={{ color: 'var(--gold)', fontWeight: 600, marginLeft: 6 }}>{fmtPercent(rarity)}%</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
            {item.giftCount} {giftWord(item.giftCount)}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button
              onClick={() => { haptic('light'); setCompactGifts(v => !v) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                background: '#1a1420', border: '1px solid #2a2230', color: 'var(--text-secondary)',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {compactGifts
                ? <><IconLayoutGrid size={14} stroke={2} /> Карточками</>
                : <><IconList size={14} stroke={2} /> Списком</>}
            </button>
          </div>

          {compactGifts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {item.gifts.map(g => (
                <div
                  key={g.gift_id}
                  className="card"
                  style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: g.gift_link ? 'pointer' : 'default' }}
                  onClick={g.gift_link ? () => { haptic('light'); openLink(g.gift_link) } : undefined}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card-hover)' }}>
                    <img src={g.image_full || g.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.name}{g.number ? ` #${g.number}` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {item.gifts.map(g => (
                <GiftCard
                  key={g.gift_id}
                  item={g}
                  onClick={() => { haptic('light'); if (g.gift_link) openLink(g.gift_link) }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Комментарий владельца — главный ориентир для меняющегося: что владелец
          хочет получить за обмен. Поэтому он выше и заметнее компактной строки
          владельца (акцентная рамка, крупный текст). */}
      {item.note && (
        <div style={{
          marginBottom: 14, padding: '14px 16px', borderRadius: 16,
          background: 'linear-gradient(180deg, #FA4A6614, #FA4A6608)', border: '1px solid #FA4A6633',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#FA4A66', letterSpacing: '.03em', marginBottom: 5, textTransform: 'uppercase' }}>
            Комментарий владельца
          </div>
          <div style={{ fontSize: 15.5, lineHeight: 1.45, color: '#F5F2F4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {item.note}
          </div>
        </div>
      )}

      {/* Компактная строка владельца: уменьшенная аватарка и отступы, чтобы
          не забирать место у комментария выше. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 20,
        padding: '10px 14px', borderRadius: 16, background: '#100d14', border: '1px solid #1e1826',
      }}>
        <OwnerAvatar username={item.owner} name={item.owner_name} userId={item.owner_id} size={40} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 11.5, color: '#655c6b', fontWeight: 500 }}>Владелец</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F5F2F4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{item.owner}</span>
        </div>
        <Chip icon={<IconSwap size={14} />} label="На обмен" filled style={{ padding: '6px 12px', fontSize: 13 }} />
      </div>

      {/* результат предложения/снятия — всплывающим окном (ResultSheet) */}
      {isOwnTrade ? (
        <button className="btn btn-ghost btn-full" style={{ gap: 8 }} onClick={handleCancel} disabled={cancelling || soldOut}>
          {cancelling ? <><MiniSpinAccent size={16} /> Снимаем…</> : soldOut ? 'Лот неактивен' : 'Снять с обмена'}
        </button>
      ) : soldOut ? (
        <button className="btn btn-ghost btn-full" disabled>
          Лот уже обменян
        </button>
      ) : picking ? (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            Выберите подарки для обмена {selectedGiftIds.size > 0 ? `(${selectedGiftIds.size})` : ''}
          </div>
          {myGifts === null ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка…</div>
          ) : myGifts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Нет свободных подарков для обмена (все на продаже/в обмене, либо портфель пуст).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {myGifts.map(g => (
                <div
                  key={g.gift_id}
                  onClick={() => toggleGift(g.gift_id)}
                  className="card"
                  style={{
                    padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    border: selectedGiftIds.has(g.gift_id) ? '1px solid var(--gold)' : '1px solid var(--border)',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-card-hover)' }}>
                    <img
                      src={fragmentImage(g.gift_name, g.gift_number, g.nft_address) || g.image_url}
                      alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.gift_name}{g.gift_number ? ` #${g.gift_number}` : ''}
                  </div>
                  {selectedGiftIds.has(g.gift_id) && <span style={{ color: 'var(--gold)' }}>✓</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Доплата (Gram, необязательно)</div>
          <input
            className="input"
            value={topUp}
            onChange={e => setTopUp(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
            inputMode="decimal"
            style={{ fontSize: 13, marginBottom: topUpNum > 0 ? 4 : 10 }}
          />
          {topUpNum > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Комиссия площадки {Math.round(FEE_RATE * 100)}% ({fmtGram(topUpFee)} <GramIcon size={15} />) с доплаты —
              владелец лота получит {fmtGram(topUpNum - topUpFee)} <GramIcon size={15} />
            </div>
          )}

          {proposeError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff6b6b', fontSize: 13, marginBottom: 10 }}>
              <WarnIcon size={18} /> {proposeError}
            </div>
          )}
          {myGifts && myGifts.length > 0 && selectedGiftIds.size === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Сначала выберите один или несколько подарков выше
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, position: 'relative', overflow: 'hidden', gap: 8 }} onClick={handlePropose} disabled={proposing || selectedGiftIds.size === 0}>
              {proposing ? <><BtnShimmer /><MiniSpin size={16} /> Отправляем…</> : `Предложить${selectedGiftIds.size > 0 ? ` (${selectedGiftIds.size})` : ''}`}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPicking(false)} disabled={proposing}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={openPicker}
          style={{
            fontSize: 15, padding: '14px', color: '#fff', border: 'none',
            // Фиолетовый — фирменный цвет обменов (ярлыки/иконки свопа), чтобы
            // кнопка не сливалась с рубиновой «Купить». Двойная тень = свечение.
            background: 'linear-gradient(180deg, #9d8be8, #7a63d0)',
            boxShadow: '0 10px 26px -6px rgba(138,120,224,.75), 0 0 26px rgba(138,120,224,.55)',
          }}
        >
          Предложить обмен
        </button>
      )}
    </div>
  )
}
