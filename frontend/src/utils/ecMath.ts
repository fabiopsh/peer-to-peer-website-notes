/**
 * Aritmetica su una curva ellittica didattica E: y² = x³ + a·x + b mod p
 * con p piccolo (qui p = 37). Tutta la matematica è ovvia da seguire ma
 * la struttura algebrica è identica a secp256k1 — solo i numeri sono umani.
 *
 * Punti rappresentati come { x, y } | null (null = punto all'infinito O).
 */

export type Point = { x: number; y: number } | null

/** Parametri della curva didattica usata dal lab ECDSA. */
export const EC_PARAMS = {
  p: 37,        // primo
  a: 0,         // y² = x³ + 7  (formula bitcoin-like)
  b: 7,
} as const

/** Riduzione modulare positiva (JS `%` lascia segni). */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Inverso modulare via Euclide esteso. Throws se gcd(a, m) ≠ 1. */
export function modInverse(a: number, m: number): number {
  a = mod(a, m)
  let [old_r, r] = [a, m]
  let [old_s, s] = [1, 0]
  while (r !== 0) {
    const q = Math.floor(old_r / r)
    ;[old_r, r] = [r, old_r - q * r]
    ;[old_s, s] = [s, old_s - q * s]
  }
  if (old_r !== 1) throw new Error(`${a} non invertibile mod ${m}`)
  return mod(old_s, m)
}

/** Verifica se P sta sulla curva. */
export function onCurve(P: Point, p = EC_PARAMS.p, a = EC_PARAMS.a, b = EC_PARAMS.b): boolean {
  if (P === null) return true
  const lhs = mod(P.y * P.y, p)
  const rhs = mod(P.x * P.x * P.x + a * P.x + b, p)
  return lhs === rhs
}

/** Negazione del punto: -P = (x, -y). */
export function neg(P: Point, p = EC_PARAMS.p): Point {
  if (P === null) return null
  return { x: P.x, y: mod(-P.y, p) }
}

/** Somma di punti su E. */
export function add(P: Point, Q: Point, p = EC_PARAMS.p, a = EC_PARAMS.a): Point {
  if (P === null) return Q
  if (Q === null) return P
  if (P.x === Q.x && mod(P.y + Q.y, p) === 0) return null  // P + (-P) = O
  let lambda: number
  if (P.x === Q.x && P.y === Q.y) {
    // Tangente
    const num = mod(3 * P.x * P.x + a, p)
    const den = modInverse(mod(2 * P.y, p), p)
    lambda = mod(num * den, p)
  } else {
    const num = mod(Q.y - P.y, p)
    const den = modInverse(mod(Q.x - P.x, p), p)
    lambda = mod(num * den, p)
  }
  const xR = mod(lambda * lambda - P.x - Q.x, p)
  const yR = mod(lambda * (P.x - xR) - P.y, p)
  return { x: xR, y: yR }
}

/** Moltiplicazione scalare double-and-add: k · P. */
export function scalarMul(k: number, P: Point, p = EC_PARAMS.p, a = EC_PARAMS.a): Point {
  let result: Point = null
  let addend: Point = P
  k = mod(k, 10 ** 9)  // safety
  while (k > 0) {
    if (k & 1) result = add(result, addend, p, a)
    addend = add(addend, addend, p, a)
    k >>>= 1
  }
  return result
}

/** Restituisce tutti i punti sulla curva (per visualizzazione SVG). */
export function allPoints(p = EC_PARAMS.p, a = EC_PARAMS.a, b = EC_PARAMS.b): Point[] {
  const pts: Point[] = []
  for (let x = 0; x < p; x++) {
    const rhs = mod(x * x * x + a * x + b, p)
    for (let y = 0; y < p; y++) {
      if (mod(y * y, p) === rhs) pts.push({ x, y })
    }
  }
  return pts
}

/** Calcola l'ordine di P (più piccolo n: n·P = O). Limit per safety. */
export function pointOrder(P: Point, limit = 200): number {
  if (P === null) return 1
  let acc: Point = P
  for (let i = 1; i <= limit; i++) {
    if (acc === null) return i
    acc = add(acc, P)
  }
  return -1
}

/** Trova un generatore con ordine almeno minOrder, partendo dal primo punto valido. */
export function findGenerator(minOrder = 20): { G: Point; n: number } {
  const pts = allPoints()
  for (const P of pts) {
    const ord = pointOrder(P)
    if (ord >= minOrder) return { G: P, n: ord }
  }
  // fallback
  return { G: pts[0] ?? null, n: pointOrder(pts[0] ?? null) }
}

/** Parametri precomputati: curva + generatore di ordine massimo (calcolato a load time). */
const PTS = allPoints()
const _G_search = (() => {
  let best: { G: Point; n: number } = { G: null, n: 0 }
  for (const P of PTS) {
    const ord = pointOrder(P)
    if (ord > best.n) best = { G: P, n: ord }
  }
  return best
})()
export const EC_G: Point = _G_search.G
export const EC_N: number = _G_search.n  // ordine di G
export const EC_POINTS: readonly Point[] = PTS

/**
 * Hash didattico (NON sicuro) di una stringa → intero in [0, n).
 * Per il lab basta una funzione deterministica che dipenda da TUTTI i char.
 */
export function messageHash(msg: string, n: number = EC_N): number {
  let h = 0
  for (let i = 0; i < msg.length; i++) {
    h = (h * 31 + msg.charCodeAt(i)) >>> 0
  }
  return mod(h, n)
}

/** Firma ECDSA didattica. Restituisce (r, s) e i passi intermedi per visualizzazione. */
export type Signature = {
  r: number
  s: number
  k: number
  R: Point
  z: number
}

export function sign(
  msg: string,
  privKey: number,
  G: Point = EC_G,
  n: number = EC_N,
): Signature {
  const z = messageHash(msg, n)
  // Loop finché r ≠ 0 e s ≠ 0
  for (let attempt = 0; attempt < 50; attempt++) {
    const k = 1 + Math.floor(Math.random() * (n - 1))
    const R = scalarMul(k, G)
    if (R === null) continue
    const r = mod(R.x, n)
    if (r === 0) continue
    const kInv = modInverse(k, n)
    const s = mod(kInv * (z + r * privKey), n)
    if (s === 0) continue
    return { r, s, k, R, z }
  }
  throw new Error('sign: nessuna firma valida trovata (riprova)')
}

export type VerifyResult = {
  valid: boolean
  z: number
  u1: number
  u2: number
  R1: Point          // u1·G
  R2: Point          // u2·Q
  Rprime: Point      // R1 + R2
  rCheck: number     // R'.x mod n
}

export function verify(
  msg: string,
  sig: Signature,
  pubKey: Point,
  G: Point = EC_G,
  n: number = EC_N,
): VerifyResult {
  const z = messageHash(msg, n)
  const sInv = modInverse(sig.s, n)
  const u1 = mod(sInv * z, n)
  const u2 = mod(sInv * sig.r, n)
  const R1 = scalarMul(u1, G)
  const R2 = scalarMul(u2, pubKey)
  const Rprime = add(R1, R2)
  if (Rprime === null) {
    return { valid: false, z, u1, u2, R1, R2, Rprime, rCheck: -1 }
  }
  const rCheck = mod(Rprime.x, n)
  return { valid: rCheck === sig.r, z, u1, u2, R1, R2, Rprime, rCheck }
}
