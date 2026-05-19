import { useMemo, useState } from 'react'
import { LabShell } from '@/components/LabShell'
import { useProgress } from '@/hooks/useProgress'
import {
  EC_G,
  EC_N,
  EC_PARAMS,
  EC_POINTS,
  scalarMul,
  sign as ecSign,
  verify as ecVerify,
  type Point,
  type Signature,
  type VerifyResult,
} from '@/utils/ecMath'

function pointStr(P: Point): string {
  if (P === null) return 'O (infinito)'
  return `(${P.x}, ${P.y})`
}

function ECDSATheory() {
  return (
    <>
      <h4>Cos'è una firma digitale</h4>
      <p>
        Chi possiede la <strong>chiave privata</strong> può produrre una firma di
        un messaggio; chiunque, con la sola <strong>chiave pubblica</strong>, può
        verificare che la firma sia autentica e che il messaggio non sia stato
        alterato. Non si può "forgiare" una firma senza conoscere la chiave
        privata.
      </p>

      <h4>ECDSA in due righe</h4>
      <p>
        Si fissa una <strong>curva ellittica</strong> e un suo punto generatore{' '}
        <code>G</code> di ordine <code>n</code>. Si sceglie:
      </p>
      <ul>
        <li><strong>Chiave privata:</strong> uno scalare <code>d ∈ [1, n−1]</code>.</li>
        <li><strong>Chiave pubblica:</strong> <code>Q = d·G</code> (un punto sulla curva).</li>
      </ul>

      <h4>Firma di un messaggio m</h4>
      <ol>
        <li>Calcola <code>z = hash(m) mod n</code>.</li>
        <li>Scegli un nonce <code>k</code> casuale in <code>[1, n−1]</code>.</li>
        <li>Calcola <code>R = k·G</code>, prendi <code>r = R.x mod n</code>.</li>
        <li>Calcola <code>s = k⁻¹ · (z + r·d) mod n</code>.</li>
        <li>La firma è la coppia <code>(r, s)</code>.</li>
      </ol>
      <code className="formula">⚠ Riusare k con messaggi diversi rivela d (caso PS3, Sony 2010).</code>

      <h4>Verifica</h4>
      <p>Con solo <code>(Q, m, r, s)</code>:</p>
      <ol>
        <li>Calcola <code>z = hash(m) mod n</code>.</li>
        <li><code>u₁ = s⁻¹ · z mod n</code>, <code>u₂ = s⁻¹ · r mod n</code>.</li>
        <li><code>R' = u₁·G + u₂·Q</code>.</li>
        <li>La firma è valida ⇔ <code>R'.x mod n == r</code>.</li>
      </ol>
      <p>
        La magia algebrica: <code>u₁·G + u₂·Q = (s⁻¹z + s⁻¹rd)·G = s⁻¹(z + rd)·G = k·G = R</code> quando la firma è autentica.
      </p>

      <h4>Nel mondo reale</h4>
      <p>
        Bitcoin usa <strong>secp256k1</strong>: <code>p ≈ 2²⁵⁶</code>, <code>n ≈ 2²⁵⁶</code>.
        Stesso algoritmo, ma con numeri impossibili da visualizzare. In questo lab
        usiamo una curva minuscola (<code>p = {EC_PARAMS.p}</code>, <code>n = {EC_N}</code>) per disegnare il piano e i punti.
      </p>
    </>
  )
}

export function ECDSASign() {
  const [privKey, setPrivKey] = useState<number>(7)
  const [message, setMessage] = useState<string>('hello bitcoin')
  const [signature, setSignature] = useState<Signature | null>(null)
  const [verification, setVerification] = useState<VerifyResult | null>(null)
  const { recordLabUse } = useProgress()

  const pubKey: Point = useMemo(() => scalarMul(privKey, EC_G), [privKey])

  function generateKey() {
    const d = 1 + Math.floor(Math.random() * (EC_N - 1))
    setPrivKey(d)
    setSignature(null)
    setVerification(null)
  }

  function handleSign() {
    try {
      const sig = ecSign(message, privKey)
      setSignature(sig)
      setVerification(null)
    } catch (e) {
      setSignature(null)
      setVerification(null)
      window.alert(`Errore: ${String(e)}`)
    }
  }

  function handleVerify() {
    if (!signature) return
    const res = ecVerify(message, signature, pubKey)
    setVerification(res)
    if (res.valid) recordLabUse('ecdsa', 'crypto-signer', 1)
  }

  // SVG plot
  const size = 360
  const padding = 28
  const scale = (size - 2 * padding) / (EC_PARAMS.p - 1)

  function plotPoint(P: Point): { cx: number; cy: number } | null {
    if (P === null) return null
    return {
      cx: padding + P.x * scale,
      cy: size - padding - P.y * scale,
    }
  }

  // Highlighted points: G (always), Q = pubKey, R from signature, R' from verify
  const highlights: { P: Point; color: string; label: string }[] = [
    { P: EC_G, color: '#22a06b', label: 'G' },
    { P: pubKey, color: '#5b8def', label: 'Q' },
  ]
  if (signature) highlights.push({ P: signature.R, color: '#f59e0b', label: 'R = k·G' })
  if (verification && verification.Rprime !== null) {
    highlights.push({
      P: verification.Rprime,
      color: verification.valid ? '#22a06b' : '#ef4444',
      label: "R'",
    })
  }

  return (
    <LabShell
      title="ECDSA Signature"
      subtitle="Genera una keypair su una curva ellittica didattica, firma un messaggio, verifica passo per passo e prova a manomettere."
      lessonSlug="lezione-06"
      theory={<ECDSATheory />}
    >
      <div className="lab-shell">
        <div className="merkle-tree__guide">
          Curva didattica: <code>y² = x³ + {EC_PARAMS.b}</code> mod{' '}
          <code>{EC_PARAMS.p}</code>. Generatore <code>G = {pointStr(EC_G)}</code> di
          ordine <code>n = {EC_N}</code>. {EC_POINTS.length} punti totali sulla curva.
        </div>

        <div className="lab-controls">
          <div className="lab-control">
            <label>Chiave privata (d)</label>
            <input
              type="number"
              min={1}
              max={EC_N - 1}
              value={privKey}
              onChange={(e) => {
                setPrivKey(Math.max(1, Math.min(EC_N - 1, Number(e.target.value) || 1)))
                setSignature(null)
                setVerification(null)
              }}
              aria-label="Chiave privata d"
            />
          </div>
          <div className="lab-control">
            <label>&nbsp;</label>
            <button type="button" className="btn btn--ghost" onClick={generateKey}>
              🎲 Genera random
            </button>
          </div>
          <div className="lab-control" style={{ flex: 1, minWidth: 240 }}>
            <label>Messaggio</label>
            <input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                setVerification(null)
              }}
              placeholder="messaggio da firmare"
              aria-label="Messaggio"
            />
          </div>
          <div className="lab-control" style={{ justifyContent: 'flex-end', gap: 6 }}>
            <label>&nbsp;</label>
            <button type="button" className="btn btn--primary" onClick={handleSign}>
              ✍ Firma
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleVerify}
              disabled={!signature}
            >
              🔍 Verifica
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <svg
            className="ec-curve"
            viewBox={`0 0 ${size} ${size}`}
            width="100%"
            height={size}
            aria-label="Punti della curva ellittica"
          >
            {/* Grid */}
            <g stroke="var(--border)" strokeWidth="0.5" opacity="0.4">
              {Array.from({ length: EC_PARAMS.p }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={padding + i * scale}
                  y1={padding}
                  x2={padding + i * scale}
                  y2={size - padding}
                />
              ))}
              {Array.from({ length: EC_PARAMS.p }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1={padding}
                  y1={padding + i * scale}
                  x2={size - padding}
                  y2={padding + i * scale}
                />
              ))}
            </g>
            {/* All points */}
            {EC_POINTS.map((P, i) => {
              const xy = plotPoint(P)
              if (!xy) return null
              return (
                <circle
                  key={i}
                  cx={xy.cx}
                  cy={xy.cy}
                  r={2.5}
                  fill="var(--text-muted)"
                  opacity={0.45}
                />
              )
            })}
            {/* Highlights */}
            {highlights.map((h, i) => {
              const xy = plotPoint(h.P)
              if (!xy) return null
              return (
                <g key={i}>
                  <circle cx={xy.cx} cy={xy.cy} r={7} fill={h.color} stroke="white" strokeWidth={2} />
                  <text
                    x={xy.cx + 10}
                    y={xy.cy - 8}
                    fontSize={11}
                    fontFamily="var(--mono)"
                    fontWeight={700}
                    fill={h.color}
                  >
                    {h.label}
                  </text>
                </g>
              )
            })}
            {/* Axes labels */}
            <text x={size / 2} y={size - 4} fontSize={10} textAnchor="middle" fill="var(--text-muted)">
              x (mod {EC_PARAMS.p})
            </text>
            <text x={8} y={size / 2} fontSize={10} textAnchor="middle" fill="var(--text-muted)" transform={`rotate(-90 8 ${size / 2})`}>
              y (mod {EC_PARAMS.p})
            </text>
          </svg>

          <div>
            <div className="ec-readout" aria-label="Keypair">
              <strong>Keypair</strong>{'\n'}
              d (privata) = {privKey}{'\n'}
              Q = d·G = {pointStr(pubKey)}
            </div>

            {signature && (
              <div className="ec-readout" style={{ marginTop: 10 }}>
                <strong>Firma di "{message}"</strong>{'\n'}
                z = hash(m) mod n = {signature.z}{'\n'}
                k (nonce, casuale) = {signature.k}{'\n'}
                R = k·G = {pointStr(signature.R)}{'\n'}
                r = R.x mod n = {signature.r}{'\n'}
                s = k⁻¹·(z + r·d) mod n = {signature.s}{'\n'}
                {'\n'}
                ➜ (r, s) = ({signature.r}, {signature.s})
              </div>
            )}

            {verification && (
              <div style={{ marginTop: 10 }}>
                <div className="ec-readout">
                  <strong>Verifica step-by-step</strong>{'\n'}
                  z = hash(m) mod n = {verification.z}{'\n'}
                  u₁ = s⁻¹·z mod n = {verification.u1}{'\n'}
                  u₂ = s⁻¹·r mod n = {verification.u2}{'\n'}
                  R₁ = u₁·G = {pointStr(verification.R1)}{'\n'}
                  R₂ = u₂·Q = {pointStr(verification.R2)}{'\n'}
                  R' = R₁ + R₂ = {pointStr(verification.Rprime)}{'\n'}
                  r' = R'.x mod n = {verification.rCheck}
                </div>
                <div className={`ec-verdict ${verification.valid ? 'ec-verdict--ok' : 'ec-verdict--fail'}`}>
                  {verification.valid ? (
                    <>✅ Firma valida: r' ({verification.rCheck}) == r ({signature?.r})</>
                  ) : (
                    <>❌ Firma invalida: r' ({verification.rCheck}) ≠ r ({signature?.r})</>
                  )}
                </div>
              </div>
            )}

            {signature && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 6, fontSize: 13 }}>
                <strong>💡 Prova:</strong> modifica il messaggio (anche un solo carattere)
                e premi <em>Verifica</em> di nuovo — vedrai la firma fallire perché{' '}
                <code>z</code> cambia.
              </div>
            )}
          </div>
        </div>
      </div>
    </LabShell>
  )
}
