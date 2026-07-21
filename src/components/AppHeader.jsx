import { useNavigate } from 'react-router-dom'

// Общий хедер редизайна: плавающая стеклянная пилюля. Слева логотип
// (ruby-mark.png) + wordmark «ruby» на Маркете либо название раздела на
// остальных. Справа — контекстные контролы страницы (children).
export default function AppHeader({ title, wordmark = false, children }) {
  const navigate = useNavigate()
  return (
    <header className="rd-header">
      <img src="/ruby-mark.png" alt="ruby" className="rd-logo" onClick={() => navigate('/')} />
      {wordmark
        ? <span className="rd-wordmark" onClick={() => navigate('/')}>ruby</span>
        : <span className="rd-htitle">{title}</span>}
      <span className="rd-hspace" />
      {children}
    </header>
  )
}
