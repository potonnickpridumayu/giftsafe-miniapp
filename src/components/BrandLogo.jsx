import { useNavigate } from 'react-router-dom'

// Логотип в шапке: только слово ruby (стиль — .brand-word в global.css).
// Знак «r + ромбик» живёт на аватарке бота, в приложении не дублируется.
// Тап по логотипу с любой страницы ведёт на Маркет.
export default function BrandLogo() {
  const navigate = useNavigate()
  return (
    <span
      className="brand-word"
      onClick={() => navigate('/')}
      style={{ cursor: 'pointer' }}
    >
      ruby
    </span>
  )
}
