#!/usr/bin/env node
// Build-time content pipeline.
//  - Copies images from ../build/images -> public/images
//  - Reads every .md from ../build/md, preprocesses Obsidian callouts,
//    strips administrative sections, and writes them to src/content/lessons/
//  - Generates src/content/manifest.ts, the single source of truth for nav.
//
// Run via `npm run prebuild-content` (also fires automatically before dev/build).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BUILD_DIR = path.resolve(ROOT, '..', 'build')
const SRC_MD = path.join(BUILD_DIR, 'md')
const SRC_IMG = path.join(BUILD_DIR, 'images')
const OUT_LESSONS = path.join(ROOT, 'src', 'content', 'lessons')
const OUT_IMG = path.join(ROOT, 'public', 'images')
const MANIFEST = path.join(ROOT, 'src', 'content', 'manifest.ts')

// --- Module assignment ---------------------------------------------------
// (lessonNumber|'P') -> moduleId
// Note: 'P' (Progetto) intentionally not mapped — it's a capstone exercise,
// out of scope for this study site.
const MODULE_MAP = {
  1: 'p2p-dht', 2: 'p2p-dht', 3: 'p2p-dht', 4: 'p2p-dht',
  5: 'p2p-dht', 6: 'p2p-dht', 7: 'p2p-dht',
  8: 'bitcoin', 9: 'bitcoin', 10: 'bitcoin', 11: 'bitcoin',
  12: 'bitcoin', 13: 'bitcoin', 14: 'bitcoin', 15: 'bitcoin',
  16: 'bitcoin', 17: 'bitcoin', 18: 'bitcoin',
  19: 'ethereum', 20: 'ethereum', 21: 'ethereum', 22: 'ethereum',
  23: 'ethereum', 25: 'ethereum', 26: 'ethereum',
  24: 'apps', 27: 'apps',
}

// Lessons with linked interactive labs
const LAB_FOR_LESSON = {
  3: 'hashing',
  4: 'kademlia',
  6: 'ecdsa',
  7: 'merkle',
  11: 'utxo',
  12: 'pow',
  15: 'bloom',
}

// --- Helpers -------------------------------------------------------------

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function emptyDir(dir) {
  await ensureDir(dir)
  const entries = await fs.readdir(dir)
  await Promise.all(
    entries.map((e) => fs.rm(path.join(dir, e), { recursive: true, force: true })),
  )
}

async function copyImages() {
  await ensureDir(OUT_IMG)
  const entries = await fs.readdir(SRC_IMG, { withFileTypes: true })
  let copied = 0
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const src = path.join(SRC_IMG, entry.name)
    const dst = path.join(OUT_IMG, entry.name)
    await fs.copyFile(src, dst)
    copied++
  }
  return copied
}

// Convert Obsidian callouts like:
//   > [!definition] Title
//   > body line 1
//   > body line 2
// into HTML div blocks (kept as raw HTML, handled later by rehype-raw).
function convertCallouts(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^>\s*\[!(\w+)\]\s*(.*)$/)
    if (m) {
      const kind = m[1].toLowerCase()
      const title = m[2].trim()
      const body = []
      i++
      while (i < lines.length && lines[i].startsWith('>')) {
        body.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push('')
      out.push(`<div class="callout callout-${escapeAttr(kind)}">`)
      if (title) {
        out.push(`  <div class="callout-title">${escapeHtml(title)}</div>`)
      }
      out.push('')
      out.push(body.join('\n'))
      out.push('')
      out.push('</div>')
      out.push('')
      continue
    }
    out.push(line)
    i++
  }
  return out.join('\n')
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
function escapeAttr(s) {
  return s.replace(/[^a-zA-Z0-9-]/g, '')
}

// Replace mermaid code fences with a placeholder block. Mermaid rendering
// happens in the LaTeX pipeline (Python) — we don't have it client side, so
// we surface them as an info box rather than dumping raw mermaid source.
function handleMermaid(md) {
  return md.replace(/```mermaid\n([\s\S]*?)```/g, (_match, src) => {
    const compact = src.trim().split('\n').slice(0, 4).join(' · ')
    return [
      '',
      '<div class="callout callout-note">',
      '  <div class="callout-title">Diagramma (Mermaid)</div>',
      '',
      `_Diagramma originale del corso (renderizzato nel PDF degli appunti). Anteprima: \`${escapeHtml(compact).slice(0, 200)}\`_`,
      '',
      '</div>',
      '',
    ].join('\n')
  })
}

function extractTitle(md, fallback) {
  const m = md.match(/^#\s+(.+?)\s*$/m)
  return m ? m[1].trim() : fallback
}

function parseFilename(filename) {
  // "Lezione 1 - Introduzione corso.md" or "Progetto - Decentralised Lending Service.md"
  const stem = filename.replace(/\.md$/, '')
  const lez = stem.match(/^Lezione\s+(\d+)\s*-\s*(.+)$/)
  if (lez) {
    return { num: Number(lez[1]), kind: 'lezione', titleFromFile: lez[2].trim() }
  }
  const proj = stem.match(/^Progetto\s*-\s*(.+)$/)
  if (proj) {
    return { num: 'P', kind: 'progetto', titleFromFile: proj[1].trim() }
  }
  return null
}

function slugFor(parsed) {
  if (parsed.kind === 'lezione') {
    const n = String(parsed.num).padStart(2, '0')
    return `lezione-${n}`
  }
  return 'progetto'
}

function sortKey(parsed) {
  return parsed.num === 'P' ? 999 : parsed.num
}

// --- Main ---------------------------------------------------------------

async function main() {
  console.log('▶ Building content from', BUILD_DIR)
  await ensureDir(path.dirname(MANIFEST))
  await emptyDir(OUT_LESSONS)

  const copied = await copyImages()
  console.log(`  copied ${copied} images → public/images/`)

  const files = (await fs.readdir(SRC_MD)).filter((f) => f.endsWith('.md'))
  const entries = []
  for (const file of files) {
    const parsed = parseFilename(file)
    if (!parsed) {
      console.warn(`  skipped ${file} (unrecognized name pattern)`)
      continue
    }
    const moduleId = MODULE_MAP[parsed.num]
    if (!moduleId) {
      console.warn(`  ${file} has no module assignment, skipping`)
      continue
    }
    let md = await fs.readFile(path.join(SRC_MD, file), 'utf8')
    md = handleMermaid(md)
    md = convertCallouts(md)
    const title = extractTitle(md, parsed.titleFromFile)
    const slug = slugFor(parsed)
    await fs.writeFile(path.join(OUT_LESSONS, `${slug}.md`), md, 'utf8')
    entries.push({
      slug,
      num: parsed.num,
      kind: parsed.kind,
      title,
      moduleId,
      labSlug: typeof parsed.num === 'number' ? LAB_FOR_LESSON[parsed.num] ?? null : null,
    })
  }

  entries.sort((a, b) => sortKey(a) - sortKey(b))
  await fs.writeFile(MANIFEST, renderManifest(entries), 'utf8')
  console.log(`  wrote ${entries.length} lessons → src/content/lessons/`)
  console.log(`  wrote manifest → ${path.relative(ROOT, MANIFEST)}`)
}

function renderManifest(entries) {
  const records = entries
    .map(
      (e) =>
        `  { slug: ${JSON.stringify(e.slug)}, num: ${
          typeof e.num === 'number' ? e.num : JSON.stringify(e.num)
        }, kind: ${JSON.stringify(e.kind)}, title: ${JSON.stringify(
          e.title,
        )}, moduleId: ${JSON.stringify(e.moduleId)}, labSlug: ${
          e.labSlug ? JSON.stringify(e.labSlug) : 'null'
        } },`,
    )
    .join('\n')
  return `// AUTO-GENERATED by scripts/build-content.mjs — do not edit by hand.

export type LessonKind = 'lezione' | 'progetto'
export type ModuleId = 'p2p-dht' | 'bitcoin' | 'ethereum' | 'apps'
export type LabSlug = 'kademlia' | 'hashing' | 'pow' | 'merkle' | 'bloom' | 'utxo' | 'ecdsa'

export type LessonMeta = {
  slug: string
  num: number | 'P'
  kind: LessonKind
  title: string
  moduleId: ModuleId
  labSlug: LabSlug | null
}

export const LESSONS: readonly LessonMeta[] = [
${records}
] as const

export const LESSONS_BY_SLUG: Record<string, LessonMeta> = Object.fromEntries(
  LESSONS.map((l) => [l.slug, l]),
)

export function lessonsForModule(moduleId: ModuleId): LessonMeta[] {
  return LESSONS.filter((l) => l.moduleId === moduleId)
}

export function neighbourLessons(slug: string): {
  prev: LessonMeta | null
  next: LessonMeta | null
} {
  const idx = LESSONS.findIndex((l) => l.slug === slug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? LESSONS[idx - 1] : null,
    next: idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null,
  }
}
`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
