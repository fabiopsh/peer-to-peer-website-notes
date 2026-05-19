import { Link, Navigate, useParams } from 'react-router-dom'
import { LABS, LABS_BY_SLUG } from '@/data/modules'
import { LESSONS_BY_SLUG } from '@/content/manifest'
import { KademliaXOR } from '@/labs/KademliaXOR'
import { ConsistentHashing } from '@/labs/ConsistentHashing'
import { PoWSimulator } from '@/labs/PoWSimulator'
import { MerkleTreeLab } from '@/labs/MerkleTree'
import { BloomFilter } from '@/labs/BloomFilter'
import { UTXOBuilder } from '@/labs/UTXOBuilder'
import { ECDSASign } from '@/labs/ECDSASign'

export function LabIndex() {
  return (
    <div>
      <h1 className="page-title">Laboratori interattivi</h1>
      <p className="page-subtitle">
        Esperimenti pratici sui protocolli centrali del corso.
      </p>
      <div className="lab-card-grid">
        {LABS.map((lab) => (
          <Link
            key={lab.slug}
            to={`/lab/${lab.slug}`}
            className="card card--module"
          >
            <h3 style={{ margin: '0 0 8px' }}>{lab.title}</h3>
            <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: 0 }}>
              {lab.blurb}
            </p>
            <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              Lezione di riferimento: {LESSONS_BY_SLUG[lab.lessonSlug]?.title ?? lab.lessonSlug}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function LabPage() {
  const { slug } = useParams<{ slug: string }>()
  const lab = slug ? LABS_BY_SLUG[slug] : undefined
  if (!lab) return <Navigate to="/lab" replace />

  switch (lab.slug) {
    case 'kademlia':
      return <KademliaXOR />
    case 'hashing':
      return <ConsistentHashing />
    case 'pow':
      return <PoWSimulator />
    case 'merkle':
      return <MerkleTreeLab />
    case 'bloom':
      return <BloomFilter />
    case 'utxo':
      return <UTXOBuilder />
    case 'ecdsa':
      return <ECDSASign />
    default:
      return <Navigate to="/lab" replace />
  }
}
