import { Link, useLocation } from 'react-router-dom'
import { useProgress } from '@/hooks/useProgress'
import { useTheme } from '@/hooks/useTheme'
import { LESSONS_BY_SLUG } from '@/content/manifest'
import { MODULES_BY_ID, LABS_BY_SLUG } from '@/data/modules'

type Props = {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: Props) {
  const { state } = useProgress()
  const [theme, toggleTheme] = useTheme()
  const location = useLocation()
  const crumbs = buildBreadcrumb(location.pathname)

  return (
    <header className="app-header">
      <div className="row">
        <button
          type="button"
          className="icon-btn sidebar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Apri menu"
        >
          ≡
        </button>
        <div className="app-header__breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 4px' }}>/</span>}
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="app-header__right">
        <span className="app-header__xp" title="Punti esperienza">
          ⭐ {state.xp} XP
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Cambia tema"
          title="Cambia tema"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  )
}

type Crumb = { label: string; to?: string }

function buildBreadcrumb(pathname: string): Crumb[] {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }]
  if (parts.length === 0) return crumbs

  if (parts[0] === 'modulo') {
    const modId = parts[1] as keyof typeof MODULES_BY_ID
    const mod = MODULES_BY_ID[modId]
    if (mod) {
      crumbs.push({ label: mod.title, to: `/modulo/${mod.id}` })
    }
    if (parts[2] === 'lezione' && parts[3]) {
      const lesson = LESSONS_BY_SLUG[parts[3]]
      if (lesson) crumbs.push({ label: lessonShortLabel(lesson.num, lesson.title) })
    } else if (parts[2] === 'quiz') {
      crumbs.push({ label: 'Quiz finale' })
    }
  } else if (parts[0] === 'progressi') {
    crumbs.push({ label: 'Progressi' })
  } else if (parts[0] === 'lab') {
    crumbs.push({ label: 'Laboratori', to: '/lab' })
    if (parts[1]) {
      const lab = LABS_BY_SLUG[parts[1]]
      if (lab) crumbs.push({ label: lab.title })
    }
  }
  return crumbs
}

function lessonShortLabel(num: number | 'P', title: string): string {
  const prefix = num === 'P' ? 'Progetto' : `Lezione ${num}`
  if (title.length <= 32) return `${prefix} — ${title}`
  return `${prefix} — ${title.slice(0, 30)}…`
}
