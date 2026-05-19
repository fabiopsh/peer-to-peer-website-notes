import { useEffect, useRef, useState } from 'react'
import { sha256Hex } from '@/utils/crypto'
import { useProgress } from '@/hooks/useProgress'
import { LabShell } from '@/components/LabShell'

type Status = 'idle' | 'mining' | 'found' | 'cancelled'

function PoWTheory() {
  return (
    <>
      <h4>Cos'è la Proof of Work</h4>
      <p>
        La <strong>Proof of Work</strong> è un meccanismo per produrre una prova
        "costosa da generare ma facile da verificare". In Bitcoin serve a due
        scopi distinti:
      </p>
      <ul>
        <li>
          <strong>Resistenza Sybil:</strong> creare identità è gratis, ma minare un
          blocco richiede energia reale — quindi attaccare la rete (50%+1 del
          potere computazionale) costa miliardi di dollari di hardware ed
          elettricità.
        </li>
        <li>
          <strong>Ordering decentralizzato:</strong> in assenza di un coordinatore,
          chi trova per primo un blocco valido "vince" e propone il prossimo
          stato della catena.
        </li>
      </ul>

      <h4>Come funziona</h4>
      <p>
        Si vuole un hash del blocco che inizi con un certo numero di zeri:
      </p>
      <code className="formula">SHA-256(header ‖ nonce) &lt; target</code>
      <p>
        Il miner incrementa il campo <code>nonce</code> (4 byte) finché l'hash
        risultante non rispetta il vincolo. SHA-256 è imprevedibile: l'unico modo
        di trovare un nonce valido è provarli uno per uno. Trovato il blocco,
        chiunque può verificarlo in <strong>una sola operazione di hash</strong>.
      </p>

      <h4>Difficoltà</h4>
      <p>
        L'output di SHA-256 in formato hex è uniforme: ogni cifra hex (4 bit) ha
        probabilità <code>1/16</code> di essere zero. Quindi richiedere{' '}
        <code>d</code> zeri iniziali significa che mediamente serviranno:
      </p>
      <code className="formula">E[tentativi] = 16^d</code>
      <p>
        Bitcoin reale usa un target a 256 bit (non zeri leading hex) e ricalibra
        la difficoltà ogni 2016 blocchi (~2 settimane) per mantenere un blocco
        ogni 10 minuti. Questo lab usa una scala semplificata: 1–6 zeri leading.
      </p>
    </>
  )
}

export function PoWSimulator() {
  const [blockData, setBlockData] = useState('Hello Bitcoin, ciao UniPi!')
  const [difficulty, setDifficulty] = useState(4)
  const [nonce, setNonce] = useState(0)
  const [hash, setHash] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const cancelRef = useRef(false)
  const { recordLabUse } = useProgress()

  const target = '0'.repeat(difficulty)
  const expected = Math.pow(16, difficulty)

  // Update elapsed time during mining
  useEffect(() => {
    if (status !== 'mining' || !startedAt) return
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100)
    return () => clearInterval(id)
  }, [status, startedAt])

  async function start() {
    cancelRef.current = false
    setStatus('mining')
    setNonce(0)
    setHash('')
    const start = Date.now()
    setStartedAt(start)
    setElapsed(0)
    let n = 0
    let lastUiUpdate = 0
    while (!cancelRef.current) {
      const candidate = `${blockData}|${n}`
      const h = await sha256Hex(candidate)
      if (h.startsWith(target)) {
        setHash(h)
        setNonce(n)
        setStatus('found')
        if (difficulty >= 4) recordLabUse('pow', 'miner', 1)
        else recordLabUse('pow')
        return
      }
      n++
      if (n - lastUiUpdate > 200) {
        setNonce(n)
        setHash(h)
        lastUiUpdate = n
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    setStatus('cancelled')
  }

  function stop() {
    cancelRef.current = true
  }

  const hashesPerSec =
    elapsed > 0 ? Math.round((nonce / elapsed) * 1000).toLocaleString() : '0'

  const statusInfo: Record<Status, { icon: string; label: string }> = {
    mining: { icon: '⛏', label: 'Mining in corso' },
    found: { icon: '✅', label: 'Blocco trovato' },
    idle: { icon: '—', label: 'Inattivo' },
    cancelled: { icon: '✋', label: 'Stoppato' },
  }

  return (
    <LabShell
      title="Proof of Work simulator"
      subtitle="Aumenta la difficulty per richiedere più zeri iniziali nell'hash SHA-256. Ogni cifra hex aggiuntiva moltiplica il lavoro medio per ~16."
      lessonSlug="lezione-12"
      theory={<PoWTheory />}
    >
      <div className="lab-shell">
        <div className="lab-controls">
          <div className="lab-control" style={{ flex: 1, minWidth: 240 }}>
            <label>Dati del blocco</label>
            <input
              value={blockData}
              onChange={(e) => setBlockData(e.target.value)}
              disabled={status === 'mining'}
              aria-label="Dati del blocco da minare"
            />
          </div>
          <div className="lab-control">
            <label>Difficulty (zeri leading)</label>
            <input
              type="range"
              min={1}
              max={6}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              disabled={status === 'mining'}
              aria-label="Difficolt&agrave;: numero di zeri leading"
            />
            <span className="muted" style={{ fontSize: 12 }}>
              {difficulty} zeri · ~{expected.toLocaleString()} hash attesi
            </span>
          </div>
          <div className="lab-control" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            {status === 'mining' ? (
              <button type="button" className="btn btn--ghost" onClick={stop}>
                Stop
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={start}>
                {status === 'found' ? '⛏ Mina di nuovo' : '⛏ Inizia mining'}
              </button>
            )}
          </div>
        </div>

        {difficulty >= 5 && status !== 'mining' && (
          <div className="lab-warning" role="alert">
            <span aria-hidden="true">⚠</span>
            <span>
              Difficulty {difficulty}: attesa media di{' '}
              <strong>{expected.toLocaleString()}</strong> tentativi.
              {difficulty >= 6 && ' Può richiedere diversi minuti sul tuo browser.'}
            </span>
          </div>
        )}

        <div className="lab-stats">
          <div className="lab-stat">
            <div className="lab-stat__label">Nonce</div>
            <div className="lab-stat__value">{nonce.toLocaleString()}</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">Tempo</div>
            <div className="lab-stat__value">
              {(elapsed / 1000).toFixed(1)}s
            </div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">Velocità</div>
            <div className="lab-stat__value">{hashesPerSec} H/s</div>
          </div>
          <div className="lab-stat">
            <div className="lab-stat__label">Stato</div>
            <div className="lab-stat__value">
              <span aria-label={statusInfo[status].label} title={statusInfo[status].label}>
                {statusInfo[status].icon}
              </span>{' '}
              <span style={{ fontSize: 13, fontWeight: 500 }}>{statusInfo[status].label}</span>
            </div>
          </div>
        </div>

        <div className="pow-output" style={{ marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            Hash corrente (target: <code>{target}…</code>):
          </div>
          <div
            className={
              status === 'found' ? 'pow-output__hash--match' : undefined
            }
          >
            {hash ? (
              <>
                <span className="pow-zeros">{hash.slice(0, difficulty)}</span>
                {hash.slice(difficulty)}
              </>
            ) : (
              <span className="muted">— premi "Inizia mining" —</span>
            )}
          </div>
        </div>

        {status === 'found' && (
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-soft)' }}>
            🎉 Blocco trovato con nonce <strong>{nonce.toLocaleString()}</strong>.
            Hash atteso medio: <strong>{expected.toLocaleString()}</strong> ·
            Tu hai impiegato <strong>{nonce.toLocaleString()}</strong> tentativi
            ({(nonce / expected).toFixed(2)}× la media).
          </div>
        )}
      </div>
    </LabShell>
  )
}
