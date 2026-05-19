import type { ModuleId } from '@/content/manifest'

export type LessonProgressEntry = {
  viewedAt: string
  quickCheckScore?: number  // 0..3 correct answers
  quickCheckTotal?: number
}

export type QuizResult = {
  score: number  // 0..1
  attempts: number
  bestAt: string
}

export type ProgressState = {
  lessonsViewed: Record<string, LessonProgressEntry>
  moduleQuizzes: Partial<Record<ModuleId, QuizResult>>
  xp: number
  badges: string[]
  labStats: Record<string, { uses: number; lastAt: string }>
  lastVisited: { moduleId: ModuleId; lessonSlug: string } | null
}

export const INITIAL_PROGRESS: ProgressState = {
  lessonsViewed: {},
  moduleQuizzes: {},
  xp: 0,
  badges: [],
  labStats: {},
  lastVisited: null,
}

export const STORAGE_KEY = 'p2p-study:state'

export type Badge = {
  id: string
  title: string
  description: string
  icon: string
}

export const BADGE_CATALOG: readonly Badge[] = [
  {
    id: 'first-step',
    title: 'Primo passo',
    description: 'Hai aperto la prima lezione.',
    icon: '🚀',
  },
  {
    id: 'dht-explorer',
    title: 'DHT Explorer',
    description: 'Quiz del modulo 1 superato con ≥80%.',
    icon: '🧭',
  },
  {
    id: 'bitcoin-graduate',
    title: 'Bitcoin Graduate',
    description: 'Quiz del modulo 2 superato con ≥80%.',
    icon: '🪙',
  },
  {
    id: 'evm-developer',
    title: 'EVM Developer',
    description: 'Quiz del modulo 3 superato con ≥80%.',
    icon: '💎',
  },
  {
    id: 'p2p-master',
    title: 'P2P Master',
    description: 'Quiz del modulo 4 superato con ≥80%.',
    icon: '🌐',
  },
  {
    id: 'completionist',
    title: 'Completionist',
    description: 'Tutti i moduli superati con almeno l’80%.',
    icon: '🏆',
  },
  {
    id: 'kademlia-master',
    title: 'Kademlia Master',
    description: 'Hai eseguito ≥5 lookup nel lab Kademlia.',
    icon: '🌳',
  },
  {
    id: 'miner',
    title: 'Miner',
    description: 'Hai trovato un blocco con difficulty ≥4.',
    icon: '⛏️',
  },
  {
    id: 'hashing-pro',
    title: 'Hashing Pro',
    description: 'Hai sperimentato con consistent hashing.',
    icon: '⭕',
  },
  {
    id: 'merkle-architect',
    title: 'Merkle Architect',
    description: 'Hai costruito un albero di Merkle.',
    icon: '🧬',
  },
  {
    id: 'bloom-tuner',
    title: 'Bloom Tuner',
    description: 'Hai inserito almeno 10 elementi nel Bloom filter lab.',
    icon: '🔵',
  },
  {
    id: 'tx-builder',
    title: 'TX Builder',
    description: 'Hai completato una transazione Bitcoin valida nel lab UTXO.',
    icon: '₿',
  },
  {
    id: 'crypto-signer',
    title: 'Crypto Signer',
    description: 'Hai firmato e verificato un messaggio con ECDSA.',
    icon: '🔑',
  },
] as const

export const BADGES_BY_ID: Record<string, Badge> = Object.fromEntries(
  BADGE_CATALOG.map((b) => [b.id, b]),
)

export const MODULE_BADGE: Record<ModuleId, string> = {
  'p2p-dht': 'dht-explorer',
  bitcoin: 'bitcoin-graduate',
  ethereum: 'evm-developer',
  apps: 'p2p-master',
}

export function xpForQuiz(score: number): number {
  if (score >= 1) return 150
  if (score >= 0.8) return 100
  if (score >= 0.6) return 50
  return 10
}

export function totalLessonsViewed(state: ProgressState): number {
  return Object.keys(state.lessonsViewed).length
}
