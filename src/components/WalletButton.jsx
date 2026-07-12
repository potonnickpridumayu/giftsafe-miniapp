import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { IconWallet } from '@tabler/icons-react'
import { useTelegram } from '../hooks/useTelegram'

// Кастомная кнопка кошелька вместо дефолтной «синей» TonConnectButton:
// не подключён → фирменная золотая кнопка, сразу открывает выбор кошелька;
// подключён → компактный чип с адресом, тап предлагает отключить.
export default function WalletButton() {
  const [tonConnectUI] = useTonConnectUI()
  const address = useTonAddress()
  const { haptic, showConfirm } = useTelegram()

  if (address) {
    const short = `${address.slice(0, 4)}…${address.slice(-4)}`
    return (
      <button
        onClick={() => {
          haptic('light')
          showConfirm('Отключить кошелёк?', (ok) => { if (ok) tonConnectUI.disconnect() })
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 13px', borderRadius: 999,
          background: 'var(--bg-card)', border: '1px solid var(--gold)',
          color: 'var(--gold)', fontWeight: 600, fontSize: 13,
          fontFamily: 'var(--font-body)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <IconWallet size={14} stroke={2} style={{ flexShrink: 0 }} />
        {short}
      </button>
    )
  }

  return (
    <button
      onClick={() => { haptic('medium'); tonConnectUI.openModal() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 16px', borderRadius: 999,
        background: 'var(--gold-radial)', boxShadow: 'var(--gold-glow)',
        color: '#fff5f7', fontWeight: 600, fontSize: 13,
        fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <IconWallet size={15} stroke={2} style={{ flexShrink: 0 }} />
      Подключить кошелёк
    </button>
  )
}
