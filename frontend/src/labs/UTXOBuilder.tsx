import { useMemo, useState } from 'react'
import { LabShell } from '@/components/LabShell'
import { useProgress } from '@/hooks/useProgress'

type UTXO = {
  txid: string
  vout: number
  amount: number          // BTC
  scriptPubKey: string    // simplified
  address: string
}

type Output = {
  id: number
  address: string
  amount: number
}

const AVAILABLE_UTXOS: UTXO[] = [
  { txid: 'a1b2c3d4', vout: 0, amount: 0.50, scriptPubKey: 'OP_DUP OP_HASH160 <hashAlice> OP_EQUALVERIFY OP_CHECKSIG', address: '1AliceK7t…' },
  { txid: 'a1b2c3d4', vout: 1, amount: 1.20, scriptPubKey: 'OP_DUP OP_HASH160 <hashAlice> OP_EQUALVERIFY OP_CHECKSIG', address: '1AliceK7t…' },
  { txid: 'e5f6a7b8', vout: 0, amount: 0.05, scriptPubKey: 'OP_DUP OP_HASH160 <hashAlice> OP_EQUALVERIFY OP_CHECKSIG', address: '1AliceK7t…' },
  { txid: '9c8d7e6f', vout: 0, amount: 2.10, scriptPubKey: 'OP_DUP OP_HASH160 <hashAlice> OP_EQUALVERIFY OP_CHECKSIG', address: '1AliceK7t…' },
  { txid: '11223344', vout: 2, amount: 0.018, scriptPubKey: 'OP_DUP OP_HASH160 <hashAlice> OP_EQUALVERIFY OP_CHECKSIG', address: '1AliceK7t…' },
  { txid: 'deadbeef', vout: 0, amount: 0.31415, scriptPubKey: 'OP_DUP OP_HASH160 <hashAlice> OP_EQUALVERIFY OP_CHECKSIG', address: '1AliceK7t…' },
]

function key(u: UTXO): string {
  return `${u.txid}:${u.vout}`
}

function UTXOTheory() {
  return (
    <>
      <h4>Cos'è una UTXO</h4>
      <p>
        UTXO sta per <strong>Unspent Transaction Output</strong>. In Bitcoin{' '}
        <em>non esistono account o saldi</em>: lo "stato" della blockchain è
        l'insieme di tutti gli output di transazioni non ancora spesi. Il tuo
        saldo è semplicemente la somma delle UTXO che puoi spendere con le tue
        chiavi.
      </p>

      <h4>Struttura di una transazione</h4>
      <ul>
        <li>
          <strong>Input:</strong> riferimenti a UTXO esistenti (<code>txid:vout</code>) più la <em>scriptSig</em> che le sblocca (firma + chiave pubblica).
        </li>
        <li>
          <strong>Output:</strong> nuovi UTXO con un valore in satoshi e una <em>scriptPubKey</em> che pone il vincolo per spenderli (es. P2PKH: "chi conosce la chiave del corrispondente hash").
        </li>
        <li>
          <strong>Locktime:</strong> blocco minimo a partire dal quale la tx è valida.
        </li>
      </ul>

      <h4>Spesa totale e change</h4>
      <p>
        Le UTXO devono essere spese <strong>per intero</strong>: non si può "spendere metà UTXO". Se gli input superano l'output desiderato, la differenza va in un <strong>output di change</strong> verso un proprio indirizzo. Altrimenti finisce ai miner come fee.
      </p>
      <code className="formula">fee = Σ input − Σ output</code>

      <h4>Vincoli</h4>
      <ul>
        <li><code>Σ output ≤ Σ input</code> sempre — altrimenti la tx è invalida (fee negativa).</li>
        <li><code>fee = 0</code> è tecnicamente valido ma i miner non includono mai la tx.</li>
        <li><code>fee &gt;&gt; valore output</code> è un errore comune ("fee burn") — sospetto e probabilmente uno sbaglio.</li>
      </ul>

      <h4>P2PKH (Pay-to-Public-Key-Hash)</h4>
      <p>
        Il template di script più comune. Lo scriptPubKey codifica:
      </p>
      <code className="formula">OP_DUP OP_HASH160 &lt;hashPubKey&gt; OP_EQUALVERIFY OP_CHECKSIG</code>
      <p>
        Per sbloccarlo serve la firma + chiave pubblica corrispondente.
      </p>
    </>
  )
}

export function UTXOBuilder() {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [outputs, setOutputs] = useState<Output[]>([
    { id: 1, address: '1BobReceiver…', amount: 0.4 },
  ])
  const [outputIdSeq, setOutputIdSeq] = useState(2)
  const [showScript, setShowScript] = useState<string | null>(null)
  const { recordLabUse } = useProgress()

  function toggleUtxo(k: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function updateOutput(id: number, patch: Partial<Output>) {
    setOutputs((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  function addOutput() {
    setOutputs((prev) => [
      ...prev,
      { id: outputIdSeq, address: '', amount: 0 },
    ])
    setOutputIdSeq((s) => s + 1)
  }

  function removeOutput(id: number) {
    setOutputs((prev) => prev.filter((o) => o.id !== id))
  }

  function addChangeOutput() {
    const diff = sumInputs - sumOutputs
    if (diff <= 0) return
    setOutputs((prev) => [
      ...prev,
      { id: outputIdSeq, address: '1AliceChange…', amount: Number((diff - 0.0001).toFixed(8)) },
    ])
    setOutputIdSeq((s) => s + 1)
  }

  const selectedUtxos = useMemo(
    () => AVAILABLE_UTXOS.filter((u) => selectedKeys.has(key(u))),
    [selectedKeys],
  )

  const sumInputs = useMemo(
    () => selectedUtxos.reduce((acc, u) => acc + u.amount, 0),
    [selectedUtxos],
  )

  const sumOutputs = useMemo(
    () => outputs.reduce((acc, o) => acc + (Number(o.amount) || 0), 0),
    [outputs],
  )

  const fee = sumInputs - sumOutputs

  const txSerialized = useMemo(() => {
    return JSON.stringify(
      {
        version: 1,
        vin: selectedUtxos.map((u) => ({
          txid: u.txid,
          vout: u.vout,
          scriptSig: '<sig> <pubKey>',
          sequence: 4294967295,
        })),
        vout: outputs
          .filter((o) => o.address.trim() && o.amount > 0)
          .map((o) => ({
            value: Number(o.amount.toFixed(8)),
            scriptPubKey: 'OP_DUP OP_HASH160 <hashOf(' + o.address + ')> OP_EQUALVERIFY OP_CHECKSIG',
          })),
        locktime: 0,
      },
      null,
      2,
    )
  }, [selectedUtxos, outputs])

  function finalize() {
    if (fee > 0 && sumOutputs > 0 && selectedUtxos.length > 0) {
      recordLabUse('utxo', 'tx-builder', 1)
    }
  }

  let feeClass = 'utxo-fee'
  let feeMsg = ''
  if (selectedUtxos.length === 0) {
    feeClass = 'utxo-fee utxo-fee--zero'
    feeMsg = 'Seleziona almeno una UTXO come input.'
  } else if (fee < 0) {
    feeClass = 'utxo-fee utxo-fee--error'
    feeMsg = `❌ Output (${sumOutputs.toFixed(4)} BTC) supera gli input (${sumInputs.toFixed(4)} BTC). Tx invalida.`
  } else if (fee === 0) {
    feeClass = 'utxo-fee utxo-fee--zero'
    feeMsg = '⚠ Fee = 0: tecnicamente valida ma nessun miner la includerà.'
  } else if (sumInputs > 0 && fee / sumInputs > 0.1) {
    feeClass = 'utxo-fee utxo-fee--zero'
    feeMsg = `⚠ Fee del ${((fee / sumInputs) * 100).toFixed(1)}% degli input — sospettosamente alta.`
  } else {
    feeClass = 'utxo-fee utxo-fee--ok'
    feeMsg = `✅ Tx valida. Fee = ${fee.toFixed(8)} BTC (${((fee / sumInputs) * 100).toFixed(2)}% degli input).`
  }

  return (
    <LabShell
      title="UTXO & Transaction Builder"
      subtitle="Componi una transazione Bitcoin selezionando UTXO come input, aggiungendo output e osservando la fee aggiornarsi in tempo reale."
      lessonSlug="lezione-11"
      theory={<UTXOTheory />}
    >
      <div className="lab-shell">
        <div className="merkle-tree__guide">
          <strong>Come usarlo:</strong>{' '}
          1) Seleziona una o più UTXO da spendere (colonna sinistra).{' '}
          2) Definisci gli output (colonna centrale).{' '}
          3) Osserva fee, errori e serializzazione (colonna destra).
        </div>

        <div className="utxo-grid">
          {/* ─── INPUTS ─── */}
          <div className="utxo-panel">
            <h3>UTXO disponibili (input)</h3>
            {AVAILABLE_UTXOS.map((u) => {
              const k = key(u)
              const isSelected = selectedKeys.has(k)
              return (
                <div
                  key={k}
                  className={`utxo-item ${isSelected ? 'utxo-item--selected' : ''}`}
                  onClick={() => toggleUtxo(k)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleUtxo(k)
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    aria-label={`Seleziona UTXO ${k}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'none' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{u.txid}:{u.vout}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowScript(showScript === k ? null : k)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 11,
                          fontFamily: 'inherit',
                        }}
                      >
                        {showScript === k ? '▾ nascondi script' : '▸ vedi script'}
                      </button>
                    </div>
                    {showScript === k && (
                      <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                        {u.scriptPubKey}
                      </div>
                    )}
                  </div>
                  <span className="utxo-item__amount">{u.amount.toFixed(4)}</span>
                </div>
              )
            })}
            <div style={{ fontSize: 13, marginTop: 10, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
              <strong>Σ input:</strong> {sumInputs.toFixed(8)} BTC
            </div>
          </div>

          {/* ─── OUTPUTS ─── */}
          <div className="utxo-panel">
            <h3>Output</h3>
            {outputs.map((o) => (
              <div key={o.id} className="utxo-output-row">
                <input
                  value={o.address}
                  onChange={(e) => updateOutput(o.id, { address: e.target.value })}
                  placeholder="indirizzo (es. 1Bob…)"
                  aria-label="Indirizzo destinatario"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <input
                  type="number"
                  step={0.0001}
                  value={o.amount}
                  onChange={(e) => updateOutput(o.id, { amount: Number(e.target.value) })}
                  placeholder="BTC"
                  aria-label="Importo in BTC"
                  style={{ width: 100 }}
                />
                <button
                  type="button"
                  className="utxo-output-row__remove"
                  onClick={() => removeOutput(o.id)}
                  title="Rimuovi output"
                  aria-label="Rimuovi output"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <button type="button" className="btn btn--ghost" onClick={addOutput}>
                + Output
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={addChangeOutput}
                disabled={fee <= 0.0001}
                title="Aggiungi automaticamente un output di change al mittente"
              >
                + Change
              </button>
            </div>
            <div style={{ fontSize: 13, marginTop: 10, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
              <strong>Σ output:</strong> {sumOutputs.toFixed(8)} BTC
            </div>
            <div className={feeClass}>
              <span>Fee:</span>
              <span>{fee.toFixed(8)} BTC</span>
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-soft)' }}>
              {feeMsg}
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={finalize}
              disabled={fee <= 0 || sumOutputs <= 0}
              style={{ marginTop: 10, width: '100%' }}
            >
              ✓ Finalizza transazione
            </button>
          </div>

          {/* ─── SERIALIZATION ─── */}
          <div className="utxo-panel">
            <h3>Transazione serializzata</h3>
            <div className="utxo-summary" aria-label="Serializzazione JSON della transazione">
              {selectedUtxos.length === 0 ? (
                <span className="muted">Seleziona UTXO per vedere la serializzazione.</span>
              ) : (
                txSerialized
              )}
            </div>
            <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-soft)' }}>
              <strong>Nota:</strong> formato semplificato. Una tx Bitcoin reale è
              serializzata in formato binario compatto (varint, little-endian) e
              gli scriptSig contengono firma DER + chiave pubblica.
            </div>
          </div>
        </div>
      </div>
    </LabShell>
  )
}
