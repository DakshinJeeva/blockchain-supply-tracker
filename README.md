# ChainTrace 🔗

> An enterprise-grade, multi-organization supply chain tracking platform built on Hyperledger Fabric — providing end-to-end provenance, custody verification, and immutable auditing across manufacturing, logistics, and retail.

[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger_Fabric-v2.5.x-2F3134?logo=hyperledger&logoColor=white)](https://hyperledger-fabric.readthedocs.io)
[![Node.js](https://img.shields.io/badge/Node.js-CommonJS-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.2.5-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Google OAuth](https://img.shields.io/badge/Auth-Google_OAuth_2.0-4285F4?logo=google&logoColor=white)](https://developers.google.com/identity)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Organizations & Workflow](#organizations--workflow)
- [Tech Stack](#tech-stack)
- [Services](#services)
- [Authentication & Onboarding](#authentication--onboarding)
- [Transaction Flows](#transaction-flows)
- [Smart Contract (Chaincode)](#smart-contract-chaincode)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)

---

## Overview

ChainTrace tackles three hard problems in industrial supply chains: counterfeit goods, opaque custody handoffs, and missing audit trails. It does this by recording every production step, logistics event, and delivery checkpoint as an **immutable transaction on a permissioned blockchain** — visible to all authorized parties, falsifiable by none.

Three independent organizations share a single channel (`mychannel`) but operate under strict role-based access:

| Organization | Role | Responsibility |
|---|---|---|
| **Org 1** | Manufacturer / Producer | Raw material collection → drying → mixing → final packaging |
| **Org 2** | Logistics / Transporter | Shipment creation, IoT cargo telemetry, delivery confirmation |
| **Org 3** | Consumer / Retailer / Auditor | Full provenance trace and chain-of-custody verification |

Each organization runs its own **Fabric CA**, **peer node**, and **MSP identity**, ensuring cryptographic separation between parties.

---

## Architecture

> View the full interactive architecture diagram: **[ChainTrace Architecture →](https://claude.ai/artifact/SvKzhXtTtNbzh8uAGqV1kr)**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          React Frontend :5173                             │
│    Org1 Dashboard  │  Org2 Transit Monitor  │  Org3 Trace Verifier       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                 │  JWT Bearer
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Express REST Gateway :4000                           │
│  Google OAuth 2.0  │  JWT Sessions  │  RBAC Middleware  │  CA Manager    │
└──────┬─────────────────┬────────────────┬────────────────────────────────┘
       │                 │                │
       ▼                 ▼                ▼
  Fabric CA          Fabric CA        Fabric CA
  Org1 :7054         Org2 :8054       Org3 :11054
  (X.509 certs)      (X.509 certs)    (X.509 certs)

                    Fabric Gateway SDK
                    (fabric-network)
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   peer0.org1      peer0.org2      peer0.org3
     :7051           :9051          :11051
   [Endorse]       [Endorse]      [Query only]
          │               │
          └───────────────┘
                  │  endorsed tx
                  ▼
            Orderer :7050
           (Raft consensus)
                  │  block
                  ▼
     All peers commit → GoLevelDB
          Channel: mychannel
          Chaincode: batchcc
```

---

## Organizations & Workflow

### Org 1 — Production (Manufacturer)

Chaincode enforces **strict sequential progression** — each step is blocked until the previous one is on-chain.

```
Step 1: Collection    →  Batch ID, raw material type, location, timestamp, photo
Step 2: Drying        →  Temperature, duration, conditions          [requires Step 1]
Step 3: Mixing        →  Temperature, added ingredients             [requires Step 2]
Step 4: Product Ready →  Final packaged product verification photo  [requires Step 3]
```

### Org 2 — Logistics (Transporter)

```
Create Transport    →  Bundle finished batches into transportId (validates all 4 steps complete)
Track Cargo (IoT)  →  Real-time telemetry: temperature, speed, GPS coordinates
Complete Transport  →  Final destination, delivery timestamp, status → DELIVERED
```

### Org 3 — Consumer / Verifier (Read-only)

```
GetFullBatchDetails →  Complete lifecycle: raw material → processing stages →
                       transportation route → IoT compliance → cryptographic metadata
                       (txId, timestamp, initiator email, X.509 identity)
```

---

## Tech Stack

### Blockchain

| Technology | Version | Purpose |
|---|---|---|
| Hyperledger Fabric | v2.5.x | Permissioned blockchain framework |
| Chaincode (Node.js) | fabric-contract-api ^2.5.8 | Smart contract business logic |
| Consensus | Raft (CFT) | Crash fault-tolerant ordering |
| State DB | GoLevelDB | Embedded peer ledger storage |
| PKI | Fabric CA (X.509) | Identity issuance per organization |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | CommonJS | Runtime |
| Express.js | v5.2.1 | REST API server |
| fabric-network | ^2.2.20 | Gateway SDK — propose, endorse, submit |
| fabric-ca-client | ^2.2.20 | CA registration and enrollment |
| Passport.js | — | Google OAuth 2.0 SSO |
| jsonwebtoken | ^9.0.3 | Stateless session tokens (8h expiry) |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | v19.2.5 | UI framework |
| Vite | v8.0.10 | Build tool & dev server |
| React Context API | — | Auth state management |
| Fetch API | — | HTTP client with auto Bearer injection |

---

## Services

| Service | Port | Role |
|---|---|---|
| Frontend Web App | `:5173` | React SPA — dashboards, forms, trace search |
| Backend REST Gateway | `:4000` | Express — OAuth, JWT, Fabric Gateway proxy |
| peer0.org1 | `:7051` | Endorses & commits production transactions |
| peer0.org2 | `:9051` | Endorses & commits logistics transactions |
| peer0.org3 | `:11051` | Evaluates read-only provenance queries |
| Orderer | `:7050` | Raft consensus, block creation & distribution |
| Fabric CA Org1 | `:7054` | X.509 certs for Org1 operators |
| Fabric CA Org2 | `:8054` | X.509 certs for Org2 logistics staff |
| Fabric CA Org3 | `:11054` | X.509 certs for Org3 consumer auditors |

---

## Authentication & Onboarding

```
1. User clicks "Sign in with Google"
        → /auth/google → Google OAuth 2.0

2. Google redirects to /auth/google/callback
        → New users: select Organization (Org1, Org2, or Org3)

3. CA Enrollment
        → Backend enrolls CA admin for the selected Org MSP (if not already enrolled)
        → Backend registers & enrolls user against ca.orgX.example.com
        → X.509 cert + private key written to backend/wallet/OrgXMSP/<userId>.id

4. User metadata stored in backend/users.json

5. Backend returns signed JWT: { id, email, org }
        → Frontend stores token, all subsequent requests include Authorization: Bearer <token>
```

---

## Transaction Flows

### Invoke (state-mutating)

Used for: `CreateBatch`, `AddDrying`, `AddMixing`, `AddProduct`, `CreateTransport`, `TrackCargo`, `CompleteTransport`

```
Frontend POST /batch/:id/drying  (JWT Bearer)
    │
    ▼
Middleware requireOrg('Org1')  →  validates JWT + org membership
    │
    ▼
fabric-network.Gateway
    ├── Loads connection-org1.json
    ├── Retrieves identity from wallet/Org1MSP/<userId>.id
    └── Connects to channel mychannel → batchcc contract
    │
    ▼
contract.submitTransaction(...)
    ├── SDK proposes tx to peers → peers simulate chaincode → return endorsements
    ├── SDK packages endorsements → submits to Orderer :7050
    ├── Orderer creates block → broadcasts to all peers
    └── Peers validate → commit to GoLevelDB → emit commit event
    │
    ▼
Backend appends ID to off-chain registry (batches-registry.json)
    │
    ▼
Returns updated state to frontend
```

### Query (read-only)

Used for: `ReadBatch`, `ReadTransport`, `GetFullBatchDetails`

```
Frontend GET /trace/:id  (JWT Bearer)
    │
    ▼
Middleware requireOrg('Org3')  →  validates consumer access
    │
    ▼
contract.evaluateTransaction('GetFullBatchDetails', batchId)
    │
    ▼
Peer queries local GoLevelDB directly
    └── No Orderer involved, no consensus, no block creation
    │
    ▼
Returns complete provenance record: batch history + transport chain + IoT logs
```

---

## Smart Contract (Chaincode)

**Name:** `batchcc` · **Sequence:** 1 · **Version:** 1.0 · **Language:** Node.js

| Function | Org | Description |
|---|---|---|
| `CreateBatch` | Org1 | Records raw material collection (Step 1) |
| `AddDrying` | Org1 | Logs drying conditions (Step 2, requires Step 1) |
| `AddMixing` | Org1 | Logs mixing parameters (Step 3, requires Step 2) |
| `AddProduct` | Org1 | Finalizes packaged product (Step 4, requires Step 3) |
| `CreateTransport` | Org2 | Creates shipment from finished batches |
| `TrackCargo` | Org2 | Submits IoT telemetry (temp, GPS, speed) |
| `CompleteTransport` | Org2 | Closes shipment with delivery confirmation |
| `ReadBatch` | All | Returns current batch state |
| `ReadTransport` | All | Returns current transport state |
| `GetFullBatchDetails` | Org3 | Returns complete lifecycle with crypto metadata |

---

## Project Structure

```
chaintrace/
├── chaincode/
│   └── index.js               # BatchContract — all chaincode business logic
│
├── backend/
│   ├── app.js                 # Express server, OAuth, CA manager, Fabric Gateway
│   ├── wallet/                # FileSystemWallet: X.509 certs per MSP
│   │   ├── Org1MSP/
│   │   ├── Org2MSP/
│   │   └── Org3MSP/
│   ├── users.json             # Off-chain user registry
│   ├── batches-registry.json  # Off-chain batch ID index
│   └── transports-registry.json
│
├── frontend/
│   └── src/
│       ├── App.jsx            # Root layout, sidebar, RBAC badge
│       ├── api.js             # Centralized API client (auto JWT injection)
│       └── pages/
│           ├── BatchPage.jsx      # Org1: production steps UI
│           ├── TransportPage.jsx  # Org2: shipment & IoT logging UI
│           ├── TracePage.jsx      # Org3: full provenance search
│           └── DashboardPage.jsx  # Admin: CA management
│
├── start.sh                   # Smart launcher: fresh or resume from ledger
├── stop.sh                    # Halt containers, preserve ledger volumes
├── setup-volumes.sh           # Initialize persistent Docker named volumes
├── deploycc.sh                # Package, install, approve, commit batchcc
├── test.sh                    # End-to-end CLI simulation across all 3 Orgs
└── compose-ledger-persist.yaml  # Volume persistence override for Docker Compose
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Hyperledger Fabric binaries (`peer`, `configtxgen`, `fabric-ca-client`) in your `PATH`
- Google OAuth 2.0 credentials (Client ID + Secret)

### 1. Initialize persistent volumes

```bash
./setup-volumes.sh
```

### 2. Start the network

```bash
# Fresh start (wipes existing ledger)
./start.sh --fresh

# Resume from existing ledger data
./start.sh
```

### 3. Deploy the chaincode

```bash
./deploycc.sh
```

### 4. Start the backend

```bash
cd backend
npm install
npm start
# → http://localhost:4000
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 6. Run end-to-end tests

```bash
./test.sh
```

### Stop the network (preserves ledger)

```bash
./stop.sh
```

---

## Environment Variables

```bash
# backend/.env

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

JWT_SECRET=
SESSION_SECRET=

# Fabric network
CHANNEL_NAME=mychannel
CHAINCODE_NAME=batchcc
```

---

## Off-chain Storage

ChainTrace uses lightweight flat-file registries alongside the blockchain:

| File | Purpose |
|---|---|
| `backend/users.json` | User metadata and org assignment after OAuth |
| `backend/batches-registry.json` | Local index of batch IDs for fast listing |
| `backend/transports-registry.json` | Local index of transport IDs |
| `backend/wallet/OrgXMSP/<id>.id` | X.509 cryptographic identities per user |

> The blockchain itself is the source of truth for all state. These files are convenience indexes only.

---

## License

MIT
