import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  commonPrefixLength,
  lookupPath,
  parseId,
  randomIds,
  xorBits,
  xorDistance,
} from '@/utils/xor'
import { useProgress } from '@/hooks/useProgress'
import { LabShell } from '@/components/LabShell'

const NETWORK = randomIds(8, 42)

function KademliaTheory() {
  return (
    <>
      <h4>Cos'è una DHT</h4>
      <p>
        Una <strong>Distributed Hash Table</strong> distribuisce coppie chiave-valore
        su una rete P2P, in modo che ogni nodo sia responsabile di un sottoinsieme
        di chiavi e possa risolvere lookup remoti con pochi hop (logaritmici nel
        numero di nodi).
      </p>

      <h4>Perché XOR come metrica</h4>
      <p>
        Kademlia identifica nodi e chiavi con interi a 160 bit e definisce la
        distanza fra due ID come il loro <code>XOR</code> bit a bit. Lo XOR è una
        metrica <strong>simmetrica</strong> (d(a,b) = d(b,a)) e{' '}
        <strong>unidirezionale</strong> (a partire da un nodo verso un target esiste
        una sola direzione "in discesa"). Questo rende il routing deterministico e
        consente a chi risponde di apprendere informazioni utili da chi gli ha
        scritto.
      </p>
      <code className="formula">distanza(A, B) = A ⊕ B (interpretato come intero)</code>

      <h4>k-bucket</h4>
      <p>
        Ogni nodo mantiene tabelle di routing chiamate <strong>k-bucket</strong>:
        per ogni distanza <code>2^i ≤ d &lt; 2^(i+1)</code> tiene fino a{' '}
        <code>k</code> contatti (tipicamente k=20). Più un nodo è lontano, meno
        contatti servono — la rete è "fitta" vicino a noi e "rada" lontano.
      </p>

      <h4>Greedy lookup</h4>
      <p>
        Per trovare il nodo responsabile di una chiave target:
      </p>
      <ol>
        <li>Si parte da sé stessi.</li>
        <li>Si chiede ai contatti più vicini al target di restituire i loro contatti più vicini al target.</li>
        <li>Ad ogni hop la distanza minima diminuisce strettamente (almeno un bit di prefisso comune in più).</li>
        <li>Si ferma quando nessuno conosce un nodo più vicino → quello attuale è il responsabile.</li>
      </ol>
      <p>
        Nel laboratorio sotto la simulazione è semplificata: hai una rete di 8 nodi
        precaricati e a ogni step prendi quello a XOR minimo verso il target.
      </p>
    </>
  )
}

export function KademliaXOR() {
  const [aRaw, setARaw] = useState('10110100')
  const [bRaw, setBRaw] = useState('00011010')
  const a = parseId(aRaw)
  const b = parseId(bRaw)
  const { recordLabUse } = useProgress()

  const xor = a && b ? xorBits(a, b) : null
  const distance = a && b ? xorDistance(a, b) : null
  const cpl = a && b ? commonPrefixLength(a, b) : null

  const path = useMemo(() => {
    if (!a || !b) return []
    return lookupPath(a, b, [...NETWORK, b].filter((p) => p !== a))
  }, [a, b])

  function performLookup() {
    recordLabUse('kademlia', 'kademlia-master', 5)
  }

  return (
    <LabShell
      title="Kademlia · distanza XOR"
      subtitle="Inserisci due identificatori (binario o decimale 0–255) per calcolare la distanza XOR e simulare il lookup iterativo verso il target."
      lessonSlug="lezione-04"
      theory={<KademliaTheory />}
    >
      <div className="lab-shell">
        <div className="lab-controls">
          <div className="lab-control">
            <label>Nodo A (sorgente)</label>
            <input
              value={aRaw}
              onChange={(e) => setARaw(e.target.value)}
              placeholder="es: 10110100 o 180"
              aria-label="Nodo sorgente"
            />
          </div>
          <div className="lab-control">
            <label>Nodo B / chiave (target)</label>
            <input
              value={bRaw}
              onChange={(e) => setBRaw(e.target.value)}
              placeholder="es: 00011010 o 26"
              aria-label="Nodo target o chiave"
            />
          </div>
          <div className="lab-control" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button
              type="button"
              className="btn btn--primary"
              onClick={performLookup}
              disabled={!a || !b}
            >
              Simula lookup
            </button>
          </div>
        </div>

        {a && b ? (
          <>
            <div className="bit-row">
              <span className="bit-row__label">A</span>
              <div className="bit-row__bits">
                {a.split('').map((bit, i) => (
                  <span key={i} className={`bit ${a[i] !== b[i] ? 'bit--diff' : ''}`}>
                    {bit}
                  </span>
                ))}
              </div>
            </div>
            <div className="bit-row">
              <span className="bit-row__label">B</span>
              <div className="bit-row__bits">
                {b.split('').map((bit, i) => (
                  <span key={i} className={`bit ${a[i] !== b[i] ? 'bit--diff' : ''}`}>
                    {bit}
                  </span>
                ))}
              </div>
            </div>
            <div className="bit-row">
              <span className="bit-row__label">A ⊕ B</span>
              <div className="bit-row__bits">
                {xor!.split('').map((bit, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bit ${bit === '1' ? 'bit--diff' : ''}`}
                  >
                    {bit}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="lab-stats">
              <div className="lab-stat">
                <div className="lab-stat__label">Distanza XOR</div>
                <div className="lab-stat__value">{distance}</div>
              </div>
              <div className="lab-stat">
                <div className="lab-stat__label">Prefisso comune</div>
                <div className="lab-stat__value">
                  {cpl} bit
                </div>
              </div>
              <div className="lab-stat">
                <div className="lab-stat__label">Magnitudo</div>
                <div className="lab-stat__value">
                  2<sup>{distance ? Math.floor(Math.log2(distance || 1)) : 0}</sup>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="muted">
            Inserisci ID validi (8 bit binari oppure decimali 0–255).
          </p>
        )}
      </div>

      {a && b && (
        <div className="lab-shell">
          <h3 style={{ marginTop: 0 }}>Lookup iterativo</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Dal nodo <code>{a}</code> ad ogni step si seleziona il candidato
            con XOR minimo rispetto al target <code>{b}</code>. La rete
            simulata contiene {NETWORK.length} nodi.
          </p>

          <div className="tree" style={{ marginTop: 12 }}>
            <div className="row row--wrap" style={{ gap: 8 }}>
              {[a, ...path].map((id, i) => (
                <motion.div
                  key={`step-${i}-${id}`}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                  className={`tree-node ${id === b ? 'tree-node--target' : 'tree-node--visited'}`}
                  title={`d(${id}, ${b}) = ${xorDistance(id, b)}`}
                >
                  {i > 0 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                  <span>{id}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    d={xorDistance(id, b)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <h4 style={{ marginTop: 24 }}>Rete (cliccabile)</h4>
          <div className="row row--wrap" style={{ gap: 6 }}>
            {NETWORK.map((id) => {
              const visited = id === a || path.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  className={`tree-node ${visited ? 'tree-node--visited' : ''}`}
                  onClick={() => setBRaw(id)}
                  title={`d(A, ${id}) = ${a ? xorDistance(a, id) : '–'}`}
                >
                  {id}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </LabShell>
  )
}
