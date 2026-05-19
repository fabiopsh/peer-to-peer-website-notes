import { sha256Hex } from './crypto'

/**
 * Calcola k posizioni nel range [0, m) per `elem` usando k hash distinti.
 * I k hash sono ottenuti con SHA-256 di `${elem}:${seed}` per seed = 0..k-1
 * e poi presi i primi 8 hex digits → intero → modulo m.
 *
 * Questo è il classico schema usato in Bitcoin BIP-37 (con MurmurHash invece di SHA);
 * per il lab usiamo SHA-256 perché è già disponibile via SubtleCrypto.
 */
export async function bloomHashes(elem: string, k: number, m: number): Promise<number[]> {
  const out: number[] = []
  for (let seed = 0; seed < k; seed++) {
    const h = await sha256Hex(`${elem}:${seed}`)
    out.push(parseInt(h.slice(0, 8), 16) % m)
  }
  return out
}

/**
 * Probabilità teorica di falso positivo per un Bloom filter con
 *   m bit, n elementi inseriti, k funzioni hash.
 * Formula classica: (1 - e^(-kn/m))^k.
 */
export function falsePositiveRate(m: number, n: number, k: number): number {
  if (n === 0 || m === 0) return 0
  return Math.pow(1 - Math.exp((-k * n) / m), k)
}

/**
 * Frazione di bit a 1 nel bit array.
 */
export function occupancy(bits: boolean[]): number {
  if (bits.length === 0) return 0
  const set = bits.reduce((acc, b) => acc + (b ? 1 : 0), 0)
  return set / bits.length
}
