import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { sha256Hex } from '@/utils/crypto'
import { useProgress } from '@/hooks/useProgress'
import { LabShell } from '@/components/LabShell'

const RING_SIZE = 360  // degrees on the ring
const RADIUS = 140

type Item = { id: string; pos: number; ownerId: string }
type Node = { id: string; pos: number; color: string }

const COLORS = ['#5b8def', '#f7931a', '#7b3ff2', '#22a06b', '#ef4444', '#0ea5e9', '#ec4899']

const RANDOM_KEY_POOL = [
  'user-42', 'session-abc', 'photo.png', 'config.yaml', 'log.txt',
  'video.mp4', 'doc.pdf', 'cart-001', 'profile-99', 'message-7',
  'cache-x', 'tx-9f3e', 'order-2025', 'avatar.svg', 'backup.zip',
]

async function hashPos(input: string): Promise<number> {
  const h = await sha256Hex(input)
  return parseInt(h.slice(0, 4), 16) % RING_SIZE
}

function ownerOf(nodes: Node[], pos: number): string {
  if (nodes.length === 0) return ''
  const sorted = [...nodes].sort((a, b) => a.pos - b.pos)
  for (const n of sorted) {
    if (pos <= n.pos) return n.id
  }
  return sorted[0].id  // wrap around
}

function ConsistentHashingTheory() {
  return (
    <>
      <h4>Il problema del modulo N</h4>
      <p>
        Distribuire chiavi fra <code>N</code> server con <code>owner = hash(key) mod N</code>{' '}
        funziona, ma quando <code>N</code> cambia (un server entra o esce){' '}
        <strong>quasi tutte le chiavi vengono rimappate</strong>: K/N chiavi rimangono al
        loro posto, il resto va riallocato.
      </p>

      <h4>L'idea del consistent hashing</h4>
      <p>
        Si fa hash sia di nodi che di chiavi sullo <strong>stesso anello</strong>{' '}
        (es. spazio <code>[0, 2^160)</code>). Ogni chiave appartiene al primo nodo
        che si incontra muovendosi in senso orario: il suo <em>successor</em>.
      </p>
      <p>
        Quando un nodo viene aggiunto, eredita solo le chiavi del segmento che
        copre — gli altri nodi sono <strong>imperturbati</strong>. Quando uno viene
        rimosso, le sue chiavi passano al successor. In entrambi i casi solo{' '}
        <code>K/N</code> chiavi migrano in media.
      </p>

      <h4>Virtual nodes</h4>
      <p>
        Pochi nodi sul ring → grossi divari → carico sbilanciato. Soluzione:
        ogni server fisico genera <code>v</code> punti sul ring (con etichette diverse, es.{' '}
        <code>node-1#0</code>, <code>node-1#1</code>, …). Il carico si distribuisce
        in modo più uniforme: la varianza scende come <code>1/√v</code>.
      </p>

      <h4>Dove si usa</h4>
      <ul>
        <li><strong>Amazon Dynamo / Cassandra:</strong> sharding dei dati su cluster.</li>
        <li><strong>CDN (Akamai):</strong> mapping URL → edge server.</li>
        <li><strong>Memcached / Redis Cluster:</strong> chiavi → nodi.</li>
        <li><strong>Chord, Kademlia:</strong> DHT in reti P2P.</li>
      </ul>
    </>
  )
}

export function ConsistentHashing() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [newItem, setNewItem] = useState('')
  const [newNode, setNewNode] = useState('')
  const [virtualNodes, setVirtualNodes] = useState(1)
  const { recordLabUse } = useProgress()

  // Recompute owners when nodes change
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => ({ ...it, ownerId: ownerOf(nodes, it.pos) })),
    )
  }, [nodes])

  async function addNode(name?: string) {
    const id = (name && name.trim()) || `node-${nodes.length + 1}`
    if (nodes.some((n) => n.id.split('@')[0] === id)) return
    const color = COLORS[nodes.length % COLORS.length]
    const newNodes: Node[] = []
    for (let i = 0; i < virtualNodes; i++) {
      const pos = await hashPos(`${id}#${i}`)
      newNodes.push({ id: virtualNodes > 1 ? `${id}@${i}` : id, pos, color })
    }
    setNodes((prev) => [...prev, ...newNodes])
    setNewNode('')
    recordLabUse('hashing', 'hashing-pro', 1)
  }

  function removeNode(id: string) {
    const baseId = id.split('@')[0]
    setNodes((prev) => prev.filter((n) => n.id.split('@')[0] !== baseId))
  }

  async function addItem(rawKey: string) {
    const key = rawKey.trim()
    if (!key) return
    if (items.some((it) => it.id === key)) return
    const pos = await hashPos(`key:${key}`)
    setItems((prev) => [
      ...prev,
      { id: key, pos, ownerId: ownerOf(nodes, pos) },
    ])
    setNewItem('')
  }

  async function addRandomKeys(count: number) {
    if (nodes.length === 0) return
    const existing = new Set(items.map((it) => it.id))
    const available = RANDOM_KEY_POOL.filter((k) => !existing.has(k))
    const picks = available.sort(() => Math.random() - 0.5).slice(0, count)
    for (const k of picks) {
      await addItem(k)
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function clearAll() {
    if (nodes.length === 0 && items.length === 0) return
    if (!window.confirm('Svuotare tutto il ring (nodi e chiavi)?')) return
    setNodes([])
    setItems([])
  }

  function pointOnRing(pos: number, radius = RADIUS) {
    const angle = (pos / RING_SIZE) * Math.PI * 2 - Math.PI / 2
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  const itemsByOwner = useMemo(() => {
    const groups: Record<string, Item[]> = {}
    for (const it of items) {
      const owner = it.ownerId.split('@')[0] || '—'
      ;(groups[owner] ??= []).push(it)
    }
    return groups
  }, [items])

  const physicalNodes = useMemo(() => {
    const seen = new Map<string, Node>()
    for (const n of nodes) {
      const base = n.id.split('@')[0]
      if (!seen.has(base)) seen.set(base, n)
    }
    return Array.from(seen.values())
  }, [nodes])

  return (
    <LabShell
      title="Consistent Hashing Ring"
      subtitle="Posiziona nodi e chiavi sull'anello e osserva come l'aggiunta o rimozione di un nodo ridistribuisce le chiavi al successore."
      lessonSlug="lezione-03"
      theory={<ConsistentHashingTheory />}
    >
      <div className="lab-shell">
        <div className="lab-controls">
          <div className="lab-control">
            <label>Aggiungi nodo</label>
            <div className="row" style={{ gap: 6 }}>
              <input
                value={newNode}
                onChange={(e) => setNewNode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNode(newNode)
                }}
                placeholder="nome opzionale"
                aria-label="Nome del nodo da aggiungere"
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => addNode(newNode)}
              >
                + Nodo
              </button>
            </div>
          </div>
          <div className="lab-control" style={{ flex: 1, minWidth: 220 }}>
            <label>Aggiungi chiave</label>
            <div className="row" style={{ gap: 6 }}>
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem(newItem)
                }}
                placeholder="es. user-123, foo.txt"
                aria-label="Nome della chiave da aggiungere"
                disabled={nodes.length === 0}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => addItem(newItem)}
                disabled={nodes.length === 0 || newItem.trim().length === 0}
              >
                + Chiave
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => addRandomKeys(5)}
                disabled={nodes.length === 0}
                title="Aggiungi 5 chiavi casuali per popolare velocemente il ring"
              >
                + 5 random
              </button>
            </div>
          </div>
          <div className="lab-control">
            <label
              title="Ogni nodo fisico viene replicato N volte sul ring per bilanciare meglio il carico"
            >
              Virtual nodes / nodo ⓘ
            </label>
            <select
              value={virtualNodes}
              onChange={(e) => setVirtualNodes(Number(e.target.value))}
              aria-label="Numero di virtual nodes per nodo fisico"
            >
              <option value={1}>1 (nessun virtual)</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>
          <div className="lab-control" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={clearAll}
              disabled={nodes.length === 0 && items.length === 0}
            >
              🗑 Svuota tutto
            </button>
          </div>
        </div>

        {nodes.length === 0 && (
          <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
            ▶ <strong>Inizia aggiungendo almeno un nodo</strong>, poi prova ad
            aggiungere chiavi e altri nodi per vedere come si ridistribuiscono.
          </p>
        )}

        <div className="lab-vis">
          <svg
            viewBox="-180 -180 360 360"
            className="ring-svg"
            width="100%"
            height="360"
          >
            <circle r={RADIUS} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />
            <AnimatePresence>
              {nodes.map((n) => {
                const p = pointOnRing(n.pos, RADIUS)
                return (
                  <motion.g
                    key={n.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <circle cx={p.x} cy={p.y} r={9} fill={n.color} stroke="var(--bg-elevated)" strokeWidth={2} />
                    <text
                      x={p.x * 1.18}
                      y={p.y * 1.18}
                      fontSize={10}
                      fill="var(--text)"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeNode(n.id)}
                    >
                      {n.id}
                    </text>
                  </motion.g>
                )
              })}
            </AnimatePresence>
            <AnimatePresence>
              {items.map((it) => {
                const p = pointOnRing(it.pos, RADIUS - 22)
                const owner = nodes.find((n) => n.id === it.ownerId)
                return (
                  <motion.g
                    key={it.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.25 }}
                    style={{ cursor: 'pointer' }}
                    onClick={() => removeItem(it.id)}
                  >
                    <title>Click per rimuovere {it.id}</title>
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={(p.x / (RADIUS - 22)) * RADIUS}
                      y2={(p.y / (RADIUS - 22)) * RADIUS}
                      stroke={owner?.color ?? 'var(--text-muted)'}
                      strokeOpacity={0.4}
                      strokeWidth={1}
                    />
                    <rect
                      x={p.x - 5}
                      y={p.y - 5}
                      width={10}
                      height={10}
                      fill={owner?.color ?? '#999'}
                      stroke="var(--bg-elevated)"
                      strokeWidth={1}
                    />
                    <text
                      x={p.x * 0.7}
                      y={p.y * 0.7}
                      fontSize={9}
                      fill="var(--text-soft)"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {it.id.length > 8 ? `${it.id.slice(0, 6)}…` : it.id}
                    </text>
                  </motion.g>
                )
              })}
            </AnimatePresence>
          </svg>
        </div>

        {physicalNodes.length > 0 && (
          <div className="ring-legend" aria-label="Legenda colori dei nodi">
            {physicalNodes.map((n) => (
              <span key={n.id.split('@')[0]} className="ring-legend__chip">
                <span
                  className="ring-legend__swatch"
                  style={{ background: n.color }}
                  aria-hidden="true"
                />
                {n.id.split('@')[0]}
              </span>
            ))}
          </div>
        )}

        <div className="lab-stats">
          <div className="lab-stat">
            <div className="lab-stat__label">Nodi (fisici)</div>
            <div className="lab-stat__value">{physicalNodes.length}</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">Punti sull'anello</div>
            <div className="lab-stat__value">{nodes.length}</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">Chiavi</div>
            <div className="lab-stat__value">{items.length}</div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="key-chip-list">
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 4 }}>
              <strong>Chiavi nel ring</strong> — click su <code>✕</code> (o sul punto nell'anello) per rimuovere.
            </div>
            {Object.entries(itemsByOwner).map(([owner, keys]) => {
              const node = nodes.find((n) => n.id.split('@')[0] === owner)
              const color = node?.color ?? '#999'
              return (
                <div key={owner} className="key-chip-group">
                  <span
                    className="key-chip-group__owner"
                    style={{ background: color }}
                  >
                    {owner} ({keys.length})
                  </span>
                  <AnimatePresence>
                    {keys.map((it) => (
                      <motion.span
                        key={it.id}
                        className="key-chip"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.18 }}
                      >
                        {it.id}
                        <button
                          type="button"
                          className="key-chip__remove"
                          aria-label={`Rimuovi chiave ${it.id}`}
                          title={`Rimuovi ${it.id}`}
                          onClick={() => removeItem(it.id)}
                        >
                          ✕
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </LabShell>
  )
}
