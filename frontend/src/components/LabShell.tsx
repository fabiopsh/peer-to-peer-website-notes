import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LESSONS_BY_SLUG } from '@/content/manifest'
import { MODULES_BY_ID } from '@/data/modules'

type Props = {
  title: string
  subtitle: string
  /** Slug della lezione di riferimento, per il link "torna alla lezione". */
  lessonSlug?: string
  /** Contenuto del pannello "📖 Teoria". Se omesso il pannello non viene renderizzato. */
  theory?: ReactNode
  /** Parte interattiva del lab (di solito una o più `.lab-shell`). */
  children: ReactNode
}

/**
 * Shell condiviso per tutti i laboratori.
 * - intestazione con titolo + sottotitolo + link alla lezione
 * - pannello "Teoria" espandibile (`<details>`), chiuso di default
 * - children = parte interattiva
 */
export function LabShell({ title, subtitle, lessonSlug, theory, children }: Props) {
  const lesson = lessonSlug ? LESSONS_BY_SLUG[lessonSlug] : undefined
  const lessonHref = lesson
    ? `/modulo/${lesson.moduleId}/lezione/${lesson.slug}`
    : undefined
  const moduleTitle = lesson ? MODULES_BY_ID[lesson.moduleId]?.title : undefined

  return (
    <div className="lab">
      <header className="lab__intro">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
        {lesson && lessonHref && (
          <p className="lab__lesson-link">
            <Link to={lessonHref}>
              ← Torna a “{lesson.title}”
              {moduleTitle && <span className="muted"> · {moduleTitle}</span>}
            </Link>
          </p>
        )}
      </header>

      {theory && (
        <details className="lab__theory">
          <summary>
            <span className="lab__theory-icon" aria-hidden="true">📖</span>
            <span className="lab__theory-title">Teoria</span>
            <span className="lab__theory-hint">clicca per espandere</span>
          </summary>
          <div className="lab__theory-body">{theory}</div>
        </details>
      )}

      {children}
    </div>
  )
}
