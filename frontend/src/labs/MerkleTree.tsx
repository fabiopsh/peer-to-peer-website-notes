import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { sha256Hex } from '@/utils/crypto'
import { useProgress } from '@/hooks/useProgress'
import { LabShell } from '@/components/LabShell'

type TreeLevel = string[]
type ProofStep = { hash: string; side: 'L' | 'R'; level: number; siblingIdx: number }

const DEFAULT_LEAVES = [
  'tx1: Alice → Bob 10',
  'tx2: Bob → Carol 4',
  'tx3: Carol → Dave 1',
  'tx4: Dave → Eve 8',
].join('\n')

const RANDOM_POOL = [
  'tx-alice-bob',
  'tx-pay-rent',
  'tx-coffee-3',
  'tx-airdrop',
  'tx-refund-42',
  'tx-stake-pool',
  'tx-nft-mint',
  'tx-bridge-eth',
]

async function buildTree(leaves: string[]): Promise<{ levels: TreeLevel[]; duplicatedAt: number[] }> {
  const levels: TreeLevel[] = []
  const duplicatedAt: number[] = []  // levels where last item was duplicated
  let current = await Promise.all(leaves.map((l) => sha256Hex(l)))
  levels.push(current)
  while (current.length > 1) {
    if (current.length % 2 === 1) duplicatedAt.push(levels.length - 1)
    const next: string[] = []
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]
      const right = current[i + 1] ?? left
      next.push(await sha256Hex(left + right))
    }
    current = next
    levels.push(current)
  }
  return { levels, duplicatedAt }
}

function proofFor(levels: TreeLevel[], leafIndex: number): ProofStep[] {
  const proof: ProofStep[] = []
  let idx = leafIndex
  for (let lvl = 0; lvl < levels.length - 1; lvl++) {
    const layer = levels[lvl]
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1
    const safeSibling = siblingIdx < layer.length ? siblingIdx : idx
    const hash = layer[safeSibling]
    proof.push({
      hash,
      side: idx % 2 === 0 ? 'R' : 'L',
      level: lvl,
      siblingIdx: safeSibling,
    })
    idx = Math.floor(idx / 2)
  }
  return proof
}

function shortHash(h: string, len = 6): string {
  if (h.length <= len * 2 + 1) return h
  return `${h.slice(0, len)}…${h.slice(-4)}`
}

function MerkleTheory() {
  return (
    <>
      <h4>Cos'è un Merkle tree</h4>
      <p>
        Un <strong>Merkle tree</strong> (o albero di hash) è una struttura ad albero
        binario in cui:
      </p>
      <ul>
        <li>Ogni <strong>foglia</strong> è l'hash di un dato (es. una transazione).</li>
        <li>Ogni <strong>nodo interno</strong> è l'hash della concatenazione dei suoi due figli.</li>
        <li>La <strong>root</strong> è un singolo hash che riassume tutti i dati: cambiare anche un bit in una foglia rende la root completamente diversa.</li>
      </ul>
      <code className="formula">parent = SHA-256( left ‖ right )</code>

      <h4>A cosa serve</h4>
      <p>
        In <strong>Bitcoin</strong> ogni blocco ha una <em>Merkle root</em> di tutte
        le sue transazioni nell'header. Questo permette:
      </p>
      <ul>
        <li>
          <strong>Verifica leggera (SPV):</strong> un light client può verificare
          che una transazione T sia in un blocco senza scaricare tutto il blocco —
          basta la root (32 byte) e <code>O(log n)</code> hash dei nodi fratelli
          lungo il path.
        </li>
        <li>
          <strong>Integrità:</strong> qualunque alterazione di una transazione
          cambia la root, invalidando il blocco.
        </li>
      </ul>

      <h4>Proof of inclusion</h4>
      <p>
        Per dimostrare che la foglia <code>L</code> al posto <code>i</code> è
        nell'albero con root <code>R</code>, serve sapere gli hash dei nodi fratelli
        lungo il path dalla foglia alla root (sono <code>⌈log₂ n⌉</code> hash). Il
        verificatore ricostruisce ricorsivamente i parent hash e controlla che il
        risultato finale combaci con <code>R</code>.
      </p>

      <h4>Foglie dispari = duplicazione</h4>
      <p>
        Quando un livello ha un numero dispari di nodi, Bitcoin{' '}
        <strong>duplica l'ultimo nodo</strong> in modo da poter sempre formare coppie.
        Questa convenzione è semplice ma ha causato bug storici (CVE-2012-2459).
      </p>
    </>
  )
}

export function MerkleTreeLab() {
  const [leavesText, setLeavesText] = useState(DEFAULT_LEAVES)
  const [tree, setTree] = useState<TreeLevel[]>([])
  const [duplicatedAt, setDuplicatedAt] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [verifySteps, setVerifySteps] = useState(0)
  const { recordLabUse } = useProgress()

  const leaves = useMemo(
    () =>
      leavesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 16),
    [leavesText],
  )

  useEffect(() => {
    let cancelled = false
    if (leaves.length === 0) {
      setTree([])
      setDuplicatedAt([])
      return
    }
    void buildTree(leaves).then((res) => {
      if (!cancelled) {
        setTree(res.levels)
        setDuplicatedAt(res.duplicatedAt)
      }
    })
    return () => {
      cancelled = true
    }
  }, [leaves])

  // Reset verifier when selection changes
  useEffect(() => {
    setVerifySteps(0)
  }, [selected, leaves])

  function handleBuild() {
    recordLabUse('merkle', 'merkle-architect', 1)
  }

  function handleReset() {
    setLeavesText(DEFAULT_LEAVES)
    setSelected(null)
  }

  function handleRandom() {
    const count = 3 + Math.floor(Math.random() * 4)  // 3..6 leaves
    const shuffled = [...RANDOM_POOL].sort(() => Math.random() - 0.5).slice(0, count)
    setLeavesText(shuffled.join('\n'))
    setSelected(null)
  }

  const proof = useMemo(
    () => (selected !== null && tree.length > 0 ? proofFor(tree, selected) : []),
    [selected, tree],
  )
  // map "level:index" -> step number, for badges on sibling nodes
  const proofKeyToStep = new Map<string, number>()
  proof.forEach((p, i) => {
    proofKeyToStep.set(`${p.level}:${p.siblingIdx}`, i + 1)
  })
  const root = tree[tree.length - 1]?.[0]

  // Step-by-step verifier: simulate hash combination
  const [verifyHashes, setVerifyHashes] = useState<string[]>([])
  useEffect(() => {
    if (selected === null || tree.length === 0) {
      setVerifyHashes([])
      return
    }
    let cancelled = false
    void (async () => {
      const accum: string[] = []
      let cur = tree[0][selected]
      accum.push(cur)
      for (const p of proof) {
        const combined = p.side === 'L' ? p.hash + cur : cur + p.hash
        cur = await sha256Hex(combined)
        accum.push(cur)
      }
      if (!cancelled) setVerifyHashes(accum)
    })()
    return () => {
      cancelled = true
    }
  }, [selected, tree, proof])

  const dupSet = new Set(duplicatedAt)

  return (
    <LabShell
      title="Merkle Tree builder"
      subtitle="Inserisci foglie (una per riga), costruisci l'albero e clicca una foglia per esplorare la sua proof of inclusion passo per passo."
      lessonSlug="lezione-07"
      theory={<MerkleTheory />}
    >
      <div className="lab-shell">
        <div className="merkle-tree__guide">
          <strong>Come usarlo:</strong>{' '}
          <span>1) Inserisci le foglie (una per riga, max 16). </span>
          <span>2) Clicca <em>Costruisci albero</em>. </span>
          <span>3) Clicca su una <strong>foglia</strong> per vedere la proof, poi sui bottoni <em>▶ Verifica step</em>.</span>
        </div>

        <div className="lab-controls">
          <div className="lab-control" style={{ flex: 1, minWidth: 280 }}>
            <label>Foglie (una per riga, max 16)</label>
            <textarea
              value={leavesText}
              onChange={(e) => setLeavesText(e.target.value)}
              rows={5}
              aria-label="Foglie del Merkle tree"
              style={{
                fontFamily: 'var(--mono)',
                padding: 8,
                background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: 13,
              }}
            />
          </div>
          <div className="lab-control" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <label>&nbsp;</label>
            <button type="button" className="btn btn--primary" onClick={handleBuild}>
              Costruisci albero
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleRandom}>
              🎲 Esempio random
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleReset}>
              ↻ Reset
            </button>
          </div>
        </div>

        {tree.length > 0 && (
          <>
            <div className="lab-stats">
              <div className="lab-stat">
                <div className="lab-stat__label">Foglie</div>
                <div className="lab-stat__value">{leaves.length}</div>
              </div>
              <div className="lab-stat">
                <div className="lab-stat__label">Livelli</div>
                <div className="lab-stat__value">{tree.length}</div>
              </div>
              <div className="lab-stat">
                <div className="lab-stat__label">Proof size</div>
                <div className="lab-stat__value">
                  {selected !== null ? `${proof.length} hash` : '–'}
                </div>
              </div>
              <div className="lab-stat" style={{ gridColumn: 'span 2' }}>
                <div className="lab-stat__label">Root</div>
                <div className="lab-stat__value" title={root}>
                  {root ? shortHash(root) : '–'}
                </div>
              </div>
            </div>

            <div className="merkle-scroll">
              <div className="merkle-tree" style={{ marginTop: 16 }}>
                {[...tree].reverse().map((level, lvlFromTop) => {
                  const lvl = tree.length - 1 - lvlFromTop
                  const isDupLevel = dupSet.has(lvl)
                  return (
                    <div key={lvl} className="merkle-level">
                      {level.map((hash, i) => {
                        const isRoot = lvl === tree.length - 1
                        const isLeaf = lvl === 0
                        const proofStep = proofKeyToStep.get(`${lvl}:${i}`)
                        const isProof = proofStep !== undefined
                        const isSelected = isLeaf && selected === i
                        const isDuplicatedLastLeaf = isDupLevel && i === level.length - 1
                        return (
                          <motion.div
                            key={`${lvl}-${i}-${hash}`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: lvlFromTop * 0.04 + i * 0.02 }}
                            className={`${isLeaf ? 'merkle-leaf' : 'merkle-hash'} ${
                              isRoot ? 'merkle-hash--root' : ''
                            } ${isProof ? 'merkle-hash--proof' : ''} ${
                              isSelected ? 'merkle-leaf--selected' : ''
                            }`}
                            onClick={() => {
                              if (isLeaf) setSelected(selected === i ? null : i)
                            }}
                            title={hash}
                            style={{ cursor: isLeaf ? 'pointer' : 'default' }}
                          >
                            {proofStep !== undefined && (
                              <div className="merkle-proof-num" title={`Step ${proofStep} della proof`}>
                                {proofStep}
                              </div>
                            )}
                            {isLeaf ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>
                                  {leaves[i]}
                                </div>
                                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                                  {shortHash(hash)}
                                </div>
                                {isDuplicatedLastLeaf && (
                                  <div className="merkle-leaf__dup-badge" title="Numero dispari di nodi a questo livello: l'ultimo viene duplicato per formare la coppia">
                                    ↩ duplicata
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                {shortHash(hash)}
                                {isDuplicatedLastLeaf && (
                                  <div className="merkle-leaf__dup-badge" title="Ultimo nodo del livello duplicato per parità">
                                    ↩ duplicato
                                  </div>
                                )}
                              </>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {selected === null && (
              <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                ▶ Clicca su una foglia per vedere la sua <strong>proof of inclusion</strong>.
              </p>
            )}

            {selected !== null && (
              <div className="card" style={{ marginTop: 16 }}>
                <strong>Proof of inclusion per "{leaves[selected]}"</strong>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Per provare che questa foglia è nell'albero servono i {proof.length} hash
                  qui sotto (i nodi fratelli lungo il path). I numeri{' '}
                  <span className="merkle-proof-num" style={{ display: 'inline-flex', width: 16, height: 16, fontSize: 9 }}>1</span>{' '}
                  corrispondono ai badge arancioni nell'albero qui sopra.
                </p>
                <ol className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  {proof.map((p, i) => (
                    <li key={i} style={{ fontFamily: 'var(--mono)', marginBottom: 4 }}>
                      Step {i + 1}: combina con{' '}
                      <strong>{p.side === 'L' ? 'fratello a sinistra' : 'fratello a destra'}</strong>{' '}
                      <code>{shortHash(p.hash)}</code>
                    </li>
                  ))}
                </ol>

                <div className="merkle-verifier">
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Verifica passo per passo
                  </div>
                  <div className="merkle-verifier__step">
                    <span style={{ color: 'var(--text-muted)' }}>start</span>
                    <span>H(foglia) = {shortHash(verifyHashes[0] ?? '')}</span>
                  </div>
                  {proof.map((p, i) => {
                    const done = i < verifySteps
                    return (
                      <div
                        key={i}
                        className={`merkle-verifier__step ${done ? 'merkle-verifier__step--done' : ''}`}
                      >
                        {done ? (
                          <>
                            <span>✓ step {i + 1}:</span>
                            <span>
                              SHA-256({p.side === 'L' ? 'sibling‖cur' : 'cur‖sibling'}) ={' '}
                              <strong>{shortHash(verifyHashes[i + 1] ?? '')}</strong>
                            </span>
                          </>
                        ) : i === verifySteps ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary"
                              style={{ padding: '4px 12px', fontSize: 12 }}
                              onClick={() => setVerifySteps((s) => s + 1)}
                            >
                              ▶ Verifica step {i + 1}
                            </button>
                            <span style={{ color: 'var(--text-muted)' }}>
                              ({p.side === 'L' ? 'sibling‖cur' : 'cur‖sibling'})
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            step {i + 1}: in attesa…
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {verifySteps === proof.length && verifyHashes.length > 0 && (
                    <div
                      className={
                        verifyHashes[verifyHashes.length - 1] === root
                          ? 'merkle-verifier__step merkle-verifier__step--match-root'
                          : 'merkle-verifier__step'
                      }
                    >
                      {verifyHashes[verifyHashes.length - 1] === root ? (
                        <>✅ Risultato = root <code>{shortHash(root!)}</code> → proof valida!</>
                      ) : (
                        <>❌ Risultato ≠ root</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </LabShell>
  )
}
