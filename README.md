# The Concord — Loom Engine

The Concord is a premium adventure MMO (~$15/month) targeting teens and adults — a 35-year civilisation simulator where player choices are permanent, the Chronicle records everything, and the world runs on a real economy. The Loom is its authoritative server-side engine: a headless TypeScript/Rust/Python orchestration system that owns all world state, economy, NPC simulation, social systems, and seamless world transitions. Unreal Engine 5 is the rendering fabric — a plugin consumer of Loom output, not the brain.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Primary server language | TypeScript (strict, no `any`) | 5.9.x |
| Runtime | Node.js | 22+ |
| Performance-critical paths | Rust (NAPI event bus) | — |
| UE5 plugin | C++ | UE5.5 (target: 5.7) |
| AI/ML pipelines | Python | 3.11+ |
| HTTP/WebSocket gateway | Fastify | 5.x |
| gRPC bridge (UE5) | @grpc/grpc-js | 1.14.x |
| Async workflows | Temporal.io | 1.15.x |
| Identity/economy backend | Nakama | pinned in nakama.yml |
| Database | PostgreSQL | — |
| Cache | Redis (ioredis) | — |
| Wire format (hot paths) | FlatBuffers + MessagePack | — |
| Encryption | XChaCha20-Poly1305 (sodium-native) | — |
| Observability | Prometheus + OpenTelemetry | — |
| Package manager | npm workspaces | — |
| Smart contracts | Solidity (Ethereum L2) | — |

---

## Repository Structure

```
loom/
├── contracts/                 # Shared interfaces — RARELY MODIFIED, changes are breaking
│   ├── bridge-loom/           # Interface any rendering engine must implement
│   ├── events/                # Typed event definitions (the lingua franca between fabrics)
│   ├── entities/              # Entity component schemas
│   ├── protocols/             # Wire protocol definitions (binary-codec.ts)
│   └── permanence/            # PermanenceCovenant.sol + WitnessRegistry.sol (Ethereum L2)
│
├── fabrics/                   # Independent modules — one concern per fabric
│   ├── loom-core/             # Entity system, event bus, world state, weather, quests (~140 files)
│   ├── shuttle/               # AI agent orchestration, 40+ NPC subsystems, Temporal workflows (~55 files)
│   ├── silfen-weave/          # Seamless world transition orchestration, corridor network (~50 files)
│   ├── nakama-fabric/         # KALON economy, dynasties, Assembly governance, PvP (~135 files)
│   ├── archive/               # Event sourcing, Chronicle, genealogy, lore compendium (~60 files)
│   ├── selvage/               # API gateway, gRPC, WebSocket, chat, e-sports (~75 files)
│   ├── dye-house/             # Auth, XChaCha20 encryption, RBAC, compliance (~40 files)
│   ├── inspector/             # Prometheus metrics, OTel tracing, chaos engineering (~40 files)
│   └── bridge-loom-ue5/       # UE5.5 plugin — BridgeLoom + LoomGameFeatures
│
├── src/                       # Fastify server bootstrap and route registrars
│   ├── main.ts                # Entry point — bootstraps Fastify, registers all routes
│   ├── main-bootstrap.ts      # DI wiring — constructs engines and injects into routes
│   └── routes/                # 50 route files (one domain per file)
│
├── db/                        # Database layer
│   ├── migrate.ts             # Migration runner
│   ├── migrations/            # 19 SQL migrations (0001–0019)
│   └── seed-content.ts        # Seeds real_world_entries from universe/content/
│
├── universe/                  # Game data definitions (worlds, content, kindler engine)
│   ├── worlds/                # WorldsEngine, world definitions, luminance system
│   ├── content/               # ContentEngine, RealWorldEntry definitions
│   ├── kindler/               # KindlerEngine, KindlerRepository, session and spark logic
│   ├── fading/                # World fading/restoration system (luminance decay)
│   ├── analytics/             # Analytics event emitter and pg-repository
│   └── revenue/               # Epic royalty tracking engine
│
├── ue5/                       # Stub UE5 project (KoydoLoom.uproject)
│   └── Source/                # KoydoLoom game module target files
│
├── native/                    # Rust NAPI modules
│   └── event-bus/             # High-throughput event bus (>100K events/sec)
│
├── pipelines/                 # Python AI/ML scripts
│   ├── npc_tier3_llm.py       # Tier 3 LLM dialogue (8 NPC archetypes)
│   ├── npc_behavior_training.py # RandomForest → ONNX behavior model training
│   ├── procedural_generation.py # World procedural content generator
│   ├── world_gen_automation.py  # Automated world generation pipeline
│   ├── character_prompt_builder.py # Portrait prompt construction
│   ├── character_t2i_service.py    # fal.ai FLUX Pro image generation service
│   └── fal_ai_adapter.py      # fal.ai API adapter
│
├── scripts/                   # Developer tooling
│   ├── canonicalize-characters.py  # Rewrites ethnic/gender visual prompts in canonical bible
│   ├── rewrite-and-generate.py     # Deletes old portraits, regenerates via fal.ai (DESTRUCTIVE)
│   └── sync-to-kindler.sh          # Ports shared infrastructure from LOOM → Kindler
│
├── docs/                      # All documentation
│   ├── game-bible/            # CANONICAL_CHARACTER_BIBLE.md, GAME_DESIGN_BIBLE.md, WORLDS_BIBLE.md, etc.
│   ├── character-references/  # Portrait images: docs/character-references/{id}-{slug}.jpg
│   ├── legal/                 # Legal docs
│   ├── lore/                  # Lore docs
│   ├── ARCHITECTURE.md        # System architecture (this suite)
│   ├── API.md                 # Complete route index
│   ├── DATABASE.md            # Schema and migration reference
│   ├── UE5.md                 # UE5 plugin inventory and architecture
│   ├── DEVELOPMENT.md         # Dev setup and workflows
│   └── CHARACTERS.md          # 500-character system reference
│
├── agents/                    # Agent persona definitions and routing
├── k8s/                       # Kubernetes manifests (multi-region, Istio, HPA)
├── tests/                     # Integration and E2E tests
├── tools/                     # Build tools and code generators
├── CLAUDE.md                  # Agent instructions (read this first)
├── ROADMAP.md                 # Engineering roadmap to artist handoff
├── AGENTS.md                  # Multi-agent protocol
└── package.json               # npm workspace root
```

---

## Quick Start (Local Dev)

```bash
# 1. Clone and install dependencies
git clone https://github.com/robertwaltos/loom
cd loom
npm install

# 2. Start backing services (PostgreSQL, Redis, Nakama)
docker-compose up -d

# 3. Run database migrations
npx tsx db/migrate.ts

# 4. (Optional) Seed content
npm run db:seed:content

# 5. Start the dev server with hot reload
npm run dev

# 6. Run the test suite
npm test

# 7. Full quality gate (typecheck + lint + test)
npm run check
```

**Required environment variables:** See `pipelines/.env` for secret keys. The server reads env vars from process.env — no hardcoded secrets anywhere.

---

## How the UE5 ↔ Server Bridge Works

The Loom server runs headless. UE5 is a rendering client that receives world state from the server over gRPC and binary WebSocket frames. It never generates world state independently.

```
UE5 Client (C++ plugin: BridgeLoom)
  │
  │  gRPC stream (binary FlatBuffers)
  │  15-byte delta-compressed WebSocket frames
  ▼
selvage fabric (Fastify + grpc-transport.ts)
  │
  │  Typed events (contracts/events/)
  ▼
loom-core fabric (entity system, world state, tick loop)
  │
  ├── nakama-fabric (economy, governance)
  ├── shuttle (NPC AI, Temporal workflows)
  ├── silfen-weave (world transitions)
  └── archive (Chronicle, persistence)
```

The BridgeLoom plugin in UE5 maintains a gRPC connection to the server. World chunk data, NPC positions, weather state, and economy ticks are streamed to the client. Player inputs travel the reverse path. The connection is managed by `BridgeLoomConnection.cpp` and `BridgeLoomSubsystem.cpp`.

---

## Key Documentation Links

| Document | Location |
|---|---|
| Engineering roadmap | `ROADMAP.md` |
| System architecture | `docs/ARCHITECTURE.md` |
| Complete API reference | `docs/API.md` |
| Database schema | `docs/DATABASE.md` |
| UE5 plugin reference | `docs/UE5.md` |
| Developer guide | `docs/DEVELOPMENT.md` |
| Character system | `docs/CHARACTERS.md` |
| Game design canon | `docs/game-bible/GAME_DESIGN_BIBLE.md` |
| 500-character canon | `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md` |
| 600-world canon | `docs/game-bible/WORLDS_BIBLE.md` |
| Story canon | `docs/game-bible/STORY_BIBLE.md` |
| Agent instructions | `CLAUDE.md` |
| Multi-agent protocol | `AGENTS.md` |

---

## The sync-to-kindler.sh Workflow

LOOM is the canonical source of truth. Kindler (`D:/pythonprojects/Kindler/`) is an educational K-12 game that shares a large subset of the server infrastructure.

**Rule:** All shared code is developed in LOOM and ported to Kindler via the sync script. Never develop shared code in Kindler and backport it.

```bash
# Dry run — shows what would be copied
./scripts/sync-to-kindler.sh

# Apply — copies changed files to Kindler
./scripts/sync-to-kindler.sh --apply

# Apply + commit + push Kindler
./scripts/sync-to-kindler.sh --apply --push
```

**What gets synced:** ~43 shared route files, core bootstrap files, three fabric directories (loom-core, nakama-fabric, shuttle), and select UE5 engine files.

**What is never synced to Kindler:** PvP, guilds, dynasty, Assembly governance, survey-corps, ascendancy, crafting (all LOOM-only).

**What is never overwritten in Kindler:** parent-dashboard, curriculum, kindler-specific guide logic (Kindler-only).
