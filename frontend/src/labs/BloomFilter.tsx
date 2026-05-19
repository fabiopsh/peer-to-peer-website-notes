import { useEffect, useMemo, useState } from 'react'
import { LabShell } from '@/components/LabShell'
import { bloomHashes, falsePositiveRate, occupancy } from '@/utils/bloomHash'
import { useProgress } from '@/hooks/useProgress'

type Probe = { positions: number[]; allSet: boolean }

function BloomTheory() {
  return (
    <>
      <h4>Cos'è un Bloom filter</h4>
      <p>
        Un <strong>Bloom filter</strong> è una struttura dati probabilistica
        compatta per testare l'appartenenza di un elemento a un insieme. Usa un
        bit array di <code>m</code> bit (inizialmente tutti 0) e{' '}
        <code>k</code> funzioni hash indipendenti.
      </p>

      <h4>Operazioni</h4>
      <ul>
        <li>
          <strong>Insert(x):</strong> calcola le <code>k</code> posizioni{' '}
          <code>h₁(x), h₂(x), …, hₖ(x)</code> e mette a 1 quei bit.
        </li>
        <li>
          <strong>Query(x):</strong> se <em>tutti</em> i <code>k</code> bit corrispondenti sono 1 → "forse presente" (possibile <strong>falso positivo</strong>). Se anche solo uno è 0 → <strong>sicuramente assente</strong>.
        </li>
      </ul>
      <p>
        Niente falsi negativi (un elemento inserito risulta sempre presente), ma
        i falsi positivi crescono con il numero di elementi inseriti.
      </p>

      <h4>Tasso di falsi positivi</h4>
      <p>
        Dopo l'inserimento di <code>n</code> elementi in un filtro di{' '}
        <code>m</code> bit con <code>k</code> hash, la probabilità di un falso
        positivo è circa:
      </p>
      <code className="formula">FP ≈ (1 − e^(−kn/m))^k</code>
      <p>
        Per un dato <code>m</code> e <code>n</code>, il <code>k</code> ottimale è{' '}
        <code>(m/n) · ln 2 ≈ 0.693 · m/n</code>.
      </p>

      <h4>Bitcoin: BIP-37</h4>
      <p>
        I light client (SPV) inviano al full node un Bloom filter delle proprie
        chiavi/indirizzi. Il full node restituisce solo le transazioni
        "potenzialmente interessanti" per quel filtro, evitando di trasferire
        tutto il blocco. Compromesso: privacy (il filtro rivela parzialmente le
        chiavi) ↔ banda. BIP-37 è oggi considerato debole sotto il profilo
        privacy ma resta utile per capire l'idea.
      </p>
    </>
  )
}

export function BloomFilter() {
  const [m, setM] = useState(32)
  const [k, setK] = useState(3)
  const [bits, setBits] = useState<boolean[]>(() => new Array(32).fill(false))
  const [elements, setElements] = useState<string[]>([])
  const [newElem, setNewElem] = useState('')
  const [queryElem, setQueryElem] = useState('')
  const [lastInsert, setLastInsert] = useState<Probe | null>(null)
  const [lastQuery, setLastQuery] = useState<{ elem: string; probe: Probe } | null>(null)
  const { recordLabUse } = useProgress()

  // Reset bit array (and probes) when m or k change
  useEffect(() => {
    setBits(new Array(m).fill(false))
    setElements([])
    setLastInsert(null)
    setLastQuery(null)
  }, [m, k])

  async function handleInsert(value?: string) {
    const raw = (value ?? newElem).trim()
    if (!raw) return
    if (elements.includes(raw)) {
      // Already inserted — just probe and highlight
      const positions = await bloomHashes(raw, k, m)
      setLastInsert({ positions, allSet: true })
      setLastQuery(null)
      setNewElem('')
      return
    }
    const positions = await bloomHashes(raw, k, m)
    setBits((prev) => {
      const next = [...prev]
      for (const p of positions) next[p] = true
      return next
    })
    setElements((prev) => [...prev, raw])
    setLastInsert({ positions, allSet: true })
    setLastQuery(null)
    setNewElem('')
    // Unlock badge after 10 inserts (badge unlocks on the 10th element added)
    if (elements.length + 1 >= 10) recordLabUse('bloom', 'bloom-tuner', 1)
    else recordLabUse('bloom')
  }

  async function handleQuery() {
    const raw = queryElem.trim()
    if (!raw) return
    const positions = await bloomHashes(raw, k, m)
    const allSet = positions.every((p) => bits[p])
    setLastQuery({ elem: raw, probe: { positions, allSet } })
    setLastInsert(null)
  }

  function handleReset() {
    setBits(new Array(m).fill(false))
    setElements([])
    setLastInsert(null)
    setLastQuery(null)
  }

  async function addRandom() {
    const samples = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'henry']
    const pool = samples.filter((s) => !elements.includes(s))
    if (pool.length === 0) return
    const picks = pool.sort(() => Math.random() - 0.5).slice(0, 3)
    for (const p of picks) await handleInsert(p)
  }

  const occ = occupancy(bits)
  const fp = useMemo(
    () => falsePositiveRate(m, elements.length, k),
    [m, elements.length, k],
  )

  // Determine cell highlighting
  const probePositions = lastInsert?.positions ?? lastQuery?.probe.positions ?? []
  const probeMiss = lastQuery && !lastQuery.probe.allSet
  const probeSet = new Set(probePositions)

  // Grid columns: aim for ~8–16 columns based on m
  const cols = m <= 16 ? 8 : m <= 64 ? 16 : 24

  return (
    <LabShell
      title="Bloom Filter"
      subtitle="Inserisci elementi e osserva i bit accendersi. Più elementi inserisci, più cresce la probabilità di falsi positivi."
      lessonSlug="lezione-15"
      theory={<BloomTheory />}
    >
      <div className="lab-shell">
        <div className="lab-controls">
          <div className="lab-control">
            <label>Bit array (m)</label>
            <input
              type="range"
              min={8}
              max={128}
              step={8}
              value={m}
              onChange={(e) => setM(Number(e.target.value))}
              aria-label="Dimensione bit array"
            />
            <span className="muted" style={{ fontSize: 12 }}>{m} bit</span>
          </div>
          <div className="lab-control">
            <label>Funzioni hash (k)</label>
            <input
              type="range"
              min={1}
              max={7}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              aria-label="Numero di funzioni hash"
            />
            <span className="muted" style={{ fontSize: 12 }}>{k} hash</span>
          </div>
          <div className="lab-control" style={{ flex: 1, minWidth: 240 }}>
            <label>Inserisci elemento</label>
            <div className="row" style={{ gap: 6 }}>
              <input
                value={newElem}
                onChange={(e) => setNewElem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInsert()
                }}
                placeholder="es. alice, bitcoin, …"
                aria-label="Elemento da inserire"
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleInsert()}
                disabled={!newElem.trim()}
              >
                + Insert
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={addRandom}
                title="Aggiungi 3 nomi casuali"
              >
                + 3 random
              </button>
            </div>
          </div>
          <div className="lab-control" style={{ flex: 1, minWidth: 240 }}>
            <label>Test appartenenza</label>
            <div className="row" style={{ gap: 6 }}>
              <input
                value={queryElem}
                onChange={(e) => setQueryElem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuery()
                }}
                placeholder="cerca un elemento"
                aria-label="Elemento da testare"
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleQuery}
                disabled={!queryElem.trim()}
              >
                Query
              </button>
            </div>
          </div>
          <div className="lab-control" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button type="button" className="btn btn--ghost" onClick={handleReset}>
              🗑 Reset
            </button>
          </div>
        </div>

        <div
          className="bloom-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          role="grid"
          aria-label="Bit array del Bloom filter"
        >
          {bits.map((b, i) => {
            const probed = probeSet.has(i)
            const cls = [
              'bloom-cell',
              b ? 'bloom-cell--set' : '',
              probed && probeMiss && !b ? 'bloom-cell--probed-miss' : '',
              probed && !(probeMiss && !b) ? 'bloom-cell--probed' : '',
            ].filter(Boolean).join(' ')
            return (
              <div
                key={i}
                className={cls}
                title={`bit ${i} = ${b ? 1 : 0}`}
                role="gridcell"
              >
                {b ? '1' : '0'}
              </div>
            )
          })}
        </div>

        <div className="lab-stats">
          <div className="lab-stat">
            <div className="lab-stat__label">Elementi inseriti</div>
            <div className="lab-stat__value">{elements.length}</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">Occupancy</div>
            <div className="lab-stat__value">{(occ * 100).toFixed(1)}%</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">FP rate (stima)</div>
            <div className="lab-stat__value">{(fp * 100).toFixed(2)}%</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">k ottimale</div>
            <div className="lab-stat__value">
              {elements.length > 0
                ? Math.max(1, Math.round((m / elements.length) * Math.LN2))
                : '–'}
            </div>
          </div>
        </div>

        {lastInsert && newElem === '' && (
          <div className="bloom-verdict bloom-verdict--maybe" style={{ marginTop: 16 }}>
            ✅ Inserito → bit{' '}
            <strong>{lastInsert.positions.join(', ')}</strong> messi a 1.
          </div>
        )}

        {lastQuery && (
          <div
            className={`bloom-verdict ${
              lastQuery.probe.allSet ? 'bloom-verdict--maybe' : 'bloom-verdict--no'
            }`}
            style={{ marginTop: 16 }}
          >
            {lastQuery.probe.allSet ? (
              <>
                <strong>"{lastQuery.elem}"</strong>: bit{' '}
                {lastQuery.probe.positions.join(', ')} tutti a 1 →{' '}
                <strong>possibilmente presente</strong>
                {!elements.includes(lastQuery.elem) && ' (probabile falso positivo!)'}
              </>
            ) : (
              <>
                <strong>"{lastQuery.elem}"</strong>: almeno un bit a 0 (
                {lastQuery.probe.positions.filter((p) => !bits[p]).join(', ')}) →{' '}
                <strong>sicuramente assente</strong>
              </>
            )}
          </div>
        )}

        {elements.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 6 }}>
              <strong>Elementi reali nel filtro</strong> ({elements.length}):
            </div>
            <div className="bloom-element-list">
              {elements.map((e) => (
                <span key={e}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </LabShell>
  )
}
