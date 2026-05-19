# P2P & Blockchain — Sito di studio interattivo

Sito web pensato per studiare (e ripassare) il corso di **Peer-to-Peer e Blockchain** dell'Università di Pisa. L'idea è nata dalla frustrazione di avere 500+ pagine di appunti in un unico PDF — volevo qualcosa di navigabile, con lab interattivi che rendessero tangibili concetti come XOR distance, Merkle proof e PoW.

**Live:** [fabiopsh.github.io/peer-to-peer-website-notes](https://fabiopsh.github.io/peer-to-peer-website-notes/)

---

## Cosa c'è dentro

- **27 lezioni** organizzate in 4 moduli (Reti P2P & DHT, Bitcoin, Ethereum & Smart Contracts, IPFS & Applicazioni), renderizzate da Markdown con supporto LaTeX e syntax highlighting
- **7 laboratori interattivi** che permettono di sperimentare con i concetti chiave:
  - **Consistent Hashing Ring** — aggiungi/rimuovi nodi e chiavi, osserva la redistribuzione
  - **Kademlia XOR** — calcola distanze XOR e simula il lookup iterativo
  - **Merkle Tree builder** — costruisci l'albero, clicca una foglia, verifica la proof step by step
  - **Proof of Work simulator** — mina un blocco con difficulty crescente
  - **Bloom Filter** — inserisci elementi, testa appartenenza, guarda il false positive rate salire
  - **UTXO & Transaction Builder** — componi una transazione Bitcoin con input/output e fee live
  - **ECDSA Signature** — firma e verifica su una curva ellittica piccola, con visualizzazione dei punti
- **Quiz** per ogni modulo con punteggio e feedback
- **Sistema di progressi** con XP, badge e tracking delle lezioni completate (tutto in localStorage, niente backend)
- **Tema chiaro/scuro**

## Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Routing | React Router v7 |
| Animazioni | Framer Motion |
| Markdown | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-raw |
| Syntax highlighting | Shiki |
| Stili | CSS vanilla (niente Tailwind), variabili CSS per il theming |
| Deploy | GitHub Pages via `gh-pages` |

Nessun backend, nessun database. L'intero sito è statico e gira nel browser.

## Struttura del progetto

```
frontend/
├── scripts/
│   └── build-content.mjs    # Pipeline: legge i .md da ../build/md,
│                             # converte callout Obsidian, genera il manifest
├── src/
│   ├── components/           # LabShell, Header, Sidebar, CodeBlock, ...
│   ├── content/
│   │   ├── lessons/          # .md preprocessati (auto-generati)
│   │   └── manifest.ts       # Indice lezioni (auto-generato)
│   ├── data/
│   │   └── modules.ts        # Definizione moduli e catalogo lab
│   ├── hooks/                # useProgress, useLocalStorage
│   ├── labs/                 # I 7 laboratori interattivi
│   ├── routes/               # Pagine: Home, Modulo, Lezione, Quiz, Lab, Progressi
│   ├── styles/               # global.css + labs.css
│   └── utils/                # crypto, xor, ecMath, bloomHash, progress
├── public/images/            # Immagini copiate dal build
└── vite.config.ts
```

I contenuti Markdown vivono in `../build/md/` (fuori dal frontend) e vengono preprocessati dallo script `build-content.mjs` che gira automaticamente prima di `dev` e `build`. Le lezioni originali sono scritte in Obsidian e poi esportate.

## Setup locale

```bash
# Dalla root del repo
cd frontend
npm install
npm run dev        # avvia il dev server (include il prebuild dei contenuti)
```

Il sito sarà su `http://localhost:5173/peer-to-peer-website-notes/`.

## Build e deploy

```bash
npm run build      # type-check + bundle di produzione in dist/
npm run preview    # anteprima locale del bundle
npm run deploy     # build + push su GitHub Pages (branch gh-pages)
```

## Contenuti

Le lezioni coprono, nell'ordine:

1. **Modulo 1 — Reti P2P & DHT:** introduzione al P2P, consistent hashing, Kademlia, chord, strutture dati distribuite, crittografia di base, Merkle tree
2. **Modulo 2 — Bitcoin:** protocollo, transazioni e script, mining e PoW, sicurezza, anonimato, Lightning Network, advanced scripts, SPV, fork
3. **Modulo 3 — Ethereum:** account model, EVM, Solidity, token standards, vulnerabilità, Proof of Stake
4. **Modulo 4 — IPFS & Applicazioni:** content addressing, DeFi, supply chain, identità decentralizzata

Ogni lab ha un pannello "Teoria" collassabile che riassume il concetto prima di sperimentare.

## Note

- I lab non richiedono dipendenze esterne per la crittografia: SHA-256 usa la Web Crypto API nativa (`SubtleCrypto`), la curva ellittica del lab ECDSA è una curva didattica piccola (p=37) per poterla visualizzare
- Il progetto non ha test automatizzati al momento — la verifica è manuale tramite i lab stessi
- Il manifest e le lezioni preprocessate sono file auto-generati, non vanno modificati a mano

## Licenza

Appunti e contenuti del corso basati sul materiale dell'Università di Pisa. Il codice del frontend è open source.
