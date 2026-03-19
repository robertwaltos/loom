# The Loom — System Architecture

> **Classification:** Engineering Reference
> **Last verified:** 2026-03-19 from source files

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UE5 CLIENT (C++ Plugin)                      │
│                                                                      │
│  BridgeLoomSubsystem ─► BridgeLoomConnection ─► BridgeLoomRenderer │
│  BridgeLoomMassEntity   BridgeLoomWorldStreamer   BridgeLoomMetaHuman│
│  BridgeLoomDialogue     BridgeLoomNPCAI           BridgeLoomEstate  │
│  BridgeLoomWeaveZone    BridgeLoomLattice          ... (57 modules)  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
             gRPC stream (FlatBuffers, binary)
             15-byte delta-compressed WebSocket frames
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                    selvage fabric (API Gateway)                       │
│                                                                      │
│  Fastify HTTP/WS server   grpc-transport.ts   bridge-grpc-server.ts │
│  rollback-netcode.ts      sync-protocol.ts    websocket-gateway.ts  │
│  rate-guard.ts            load-balancer.ts    p2p-mesh.ts           │
│  sse-stream.ts            udp-protocol.ts     circuit-breaker.ts    │
└───┬──────────────┬────────────────┬──────────────┬──────────────────┘
    │              │                │              │
    ▼              ▼                ▼              ▼
┌────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐
│loom-   │  │ shuttle  │  │silfen-weave  │  │nakama-   │
│core    │  │(NPC AI)  │  │(world transit│  │fabric    │
│        │  │          │  │              │  │(economy) │
│ECS     │  │Temporal  │  │Corridor net  │  │KALON     │
│Tick    │  │workflows │  │Wormhole stab │  │Dynasty   │
│World   │  │Behavior  │  │Survey corps  │  │Assembly  │
│gen     │  │trees     │  │Weave transit │  │Market    │
│Weather │  │ML/ONNX   │  │Lattice nodes │  │PvP       │
│Quests  │  │Dialogue  │  │              │  │          │
└───┬────┘  └────┬─────┘  └──────┬───────┘  └────┬─────┘
    │            │               │               │
    └────────────┴───────────────┴───────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
┌─────────┐        ┌──────────┐        ┌──────────┐
│archive  │        │dye-house │        │inspector │
│         │        │          │        │          │
│Chronicle│        │XChaCha20 │        │Prometheus│
│Event    │        │RBAC      │        │OpenTelm  │
│sourcing │        │Anti-cheat│        │Chaos eng │
│Genealogy│        │Rate limit│        │SLA mon   │
│Lore     │        │Zero-trust│        │          │
│L2 smart │        │          │        │          │
│contracts│        │          │        │          │
└────┬────┘        └─────┬────┘        └────┬─────┘
     │                   │                  │
     └───────────────────┴──────────────────┘
                         │
    ┌────────────────────┼──────────────┐
    ▼                    ▼              ▼
┌────────────┐  ┌──────────────┐  ┌──────────┐
│ PostgreSQL │  │    Redis     │  │ Nakama   │
│            │  │              │  │          │
│19 migration│  │Session cache │  │Identity  │
│Event store │  │Rate limits   │  │Auth      │
│Chronicle   │  │World state   │  │Leaderb.  │
│TimescaleDB │  │pub/sub       │  │          │
└────────────┘  └──────────────┘  └──────────┘
```

---

## Layer Descriptions

### UE5 Client Layer

The UE5 client is a rendering consumer. It receives world state from the Loom server and renders it. It does not own any game state. The BridgeLoom C++ plugin handles all server communication.

**Key plugin components:**
- `BridgeLoomSubsystem` — Engine subsystem, singleton lifecycle manager
- `BridgeLoomConnection` — gRPC connection to selvage
- `BridgeLoomWorldStreamer` — Streams world chunks as the player moves
- `BridgeLoomRenderer` — Lumen lighting, time-of-day, weather, LOD
- `BridgeLoomMassEntity` — 100K+ crowd NPC simulation via UE Mass AI
- `BridgeLoomDialogue` — NPC speech with lip sync (52 ARKit blend shapes)
- `BridgeLoomWeaveZone` — Silfen Weave transition visual effect
- `BridgeLoomLattice` — Visual representation of the Lattice network

### selvage fabric (API Gateway)

The external interface layer. Routes all client connections (HTTP REST, WebSocket, gRPC, UDP) to the appropriate fabric. Responsible for:
- Binary WebSocket frame protocol (15-byte header, delta compression)
- gRPC bridge server and transport to UE5
- Rollback netcode for client state reconciliation
- Connection pooling and migration
- P2P mesh for peer connections
- Rate limiting (rate-guard.ts)
- Load balancing across fabric instances
- Circuit breaker pattern for fabric isolation

### loom-core fabric

The authoritative world state engine. Contains:
- **Entity Component System (ECS):** entity-registry.ts, component-store.ts, component-archetype.ts
- **Tick loop:** < 0.5ms target per game thread tick; system-scheduler.ts
- **Event bus:** in-process-event-bus.ts (TypeScript), Rust NAPI bus for > 100K events/sec hot paths
- **World generator:** Perlin noise biomes, terrain, settlements, dungeons
- **Weather system:** weather-system.ts + day-night-cycle.ts
- **Quest system:** procedural-quest.ts, quest-chains.ts, quest-tracker.ts
- **Estate system:** Player-owned and NPC-owned buildings and land
- **Ability system:** ability-system.ts — combat, resources, cooldowns, effects
- **NPC catalog:** In-memory registry of world-resident characters
- **Silfen Weave integration:** weave-system.ts, transit-weave-adapter.ts
- **Ascendancy engine:** Tracks Lattice anomalies and the inner-circle secret

### shuttle fabric (NPC AI)

The NPC intelligence and workflow orchestration fabric. 55+ subsystems organized in a 4-tier AI hierarchy:

| Tier | Mechanism | Scale | Files |
|---|---|---|---|
| 1 | FSM crowd simulation | 100K+ NPCs | npc-crowd-simulation.ts |
| 2 | Behavior tree v2 | Thousands of NPCs | behavior-tree-v2.ts |
| 3 | LLM archetypes (8 types) | Hundreds of hero NPCs | pipelines/npc_tier3_llm.py |
| 4 | Emergent intelligence | Tens of key characters | npc-emergent-intelligence.ts |

The Temporal.io worker (`temporal-worker.ts`) drives long-running NPC workflows: multi-week goal planning, migration events, career path transitions, dynasty events.

ML pipeline: RandomForest classifier trains on NPC behavior data and exports to ONNX for fast inference (`ml-pipeline.ts`, `pipelines/npc_behavior_training.py`).

NPC dialogue chain: `behavior-tree-v2.ts` → `npc-goal-planner.ts` → `npc-emergent-intelligence.ts` → `npc-dialogue-engine.ts` → `npc-speech-synthesis.ts` → gRPC → `BridgeLoomDialogue.cpp`

### silfen-weave fabric (World Transitions)

The Silfen Weave is the in-universe name for the wormhole/corridor network connecting the 600 worlds. The fabric models this server-side with:
- **Corridor network:** corridor-network.ts, corridor-stability.ts, corridor-maintenance.ts
- **Lattice nodes and topology:** lattice-node.ts, lattice-topology.ts, lattice-corridor.ts
- **Wormhole stabilizer:** wormhole-stabilizer.ts — manages corridor stability metrics
- **Survey corps:** survey-corps.ts, survey-mission.ts — player-driven world discovery
- **Frequency systems:** frequency-lock.ts, frequency-matcher.ts — resonance mechanics
- **Transit management:** transit-bookings.ts, transit-scheduler.ts, transit-capacity.ts
- **Gravity wells:** gravity-well.ts — mass-based corridor topology effects
- **Navigation graph:** navigation-graph.ts, star-map.ts — route planning
- **World streaming:** world-streaming.ts — world anchor management for seamless transit

#### The Silfen Weave World Transition System

When a player transits between worlds:
1. Client sends transit request to selvage
2. silfen-weave validates corridor availability and stability
3. transit-bookings.ts reserves capacity
4. World state for the destination is loaded (archive + loom-core)
5. Server streams the new world state to the UE5 client
6. BridgeLoomWeaveZone.cpp triggers the transition shader effect
7. BridgeLoomWorldStreamer.cpp begins streaming the new world's chunks

The transition appears seamless to the player because world state is pre-loaded server-side before the visual transition completes.

#### How the Lattice/Wormhole Network Is Modeled

The Lattice is a distributed AI network (in lore) that is sentient — known only to ~12 characters (the Ascendancy). Server-side it is modeled as a graph:
- `lattice-topology.ts` — defines the node graph (worlds as nodes, corridors as edges)
- `lattice-node.ts` — per-node state including compromise type, stability, and harmonic deviation
- `lattice-repair.ts` — NPC-driven repair missions
- `resonance-amplifier.ts` — player actions that strengthen corridors
- `signal-relay.ts` — message propagation through the network
- The `ascendancy-engine.ts` in loom-core tracks anomalies visible only to Ascendancy members

### nakama-fabric (Economy and Governance)

The largest fabric (~135 files). Wraps Nakama's identity and matchmaking layer and adds the full Concord economy, political, and social systems.

#### KALON Economy Flow

```
Production (crafting, harvesting, quests)
         │
         ▼
kalon-ledger.ts (per-player balances, all transactions)
         │
         ├──► market-price-engine.ts (supply/demand curves)
         │         └──► auction-engine.ts (player auctions)
         │         └──► black-market.ts (contraband)
         │
         ├──► trade-engine.ts (direct trades, trade routes)
         │         └──► trade-route-registry.ts
         │         └──► canonical-trade-routes.ts
         │
         ├──► kalon-levy.ts (Assembly-voted taxation)
         │         └──► monetary-policy.ts (central bank AI)
         │
         ├──► investment-fund.ts (continuity bonds, futures)
         │         └──► insurance-market.ts
         │
         └──► crafting-economy.ts (material flows, recipes)
```

Key economic subsystems:
- KALON stellar standard (gold-equivalent anchor)
- Universal Basic KALON (UBK) distribution
- World-local taxation with Assembly-voted rates
- Commodity futures and forward contracts
- Quarterly tithe system
- Inter-world trade treaties (tariffs, quotas, free trade zones)
- Economy simulation scheduler (automatic economic cycles)
- Economy maturation engine (central bank AI)

#### Mass AI / NPC Simulation Pipeline

NPC economic behavior runs through the shuttle fabric (npc-economy.ts, npc-politics.ts, npc-religion.ts) and is coordinated with nakama-fabric for KALON transactions and market participation. NPCs can own property, run businesses, form guilds, and participate in Assembly votes.

NPC simulation scale:
- Tier 1 FSM: 100K+ NPCs follow simple rules (crowd, ambiance)
- Tier 2 behavior trees: thousands with goals and schedules
- Tier 3 LLM: hundreds of named characters with context-aware dialogue
- Tier 4 emergent: tens of key characters with multi-week planning and memory

#### Temporal.io Workflow Usage

Temporal.io drives long-running NPC and world lifecycle processes that span hours or weeks:
- NPC goal planning and execution over multiple sessions
- Dynasty succession events
- Assembly legislative cycles (proposal → debate → vote → execution)
- Economic cycles (quarterly tithe, monetary policy adjustments)
- World expansion events (corridor discovery, wormhole stabilization)
- NPC migration events (population shifts between worlds)

The Temporal worker is in `fabrics/shuttle/src/temporal-worker.ts`.

### archive fabric (Chronicle and Persistence)

The historical record and event sourcing fabric. Every player action that should be remembered is recorded here.

Key systems:
- **Event sourcing:** event-sourcing.ts, pg-event-archive.ts — append-only event log in PostgreSQL
- **Chronicle:** chronicle.ts, chronicle-builder.ts, chronicle-search.ts, chronicle-hasher.ts
  - Players and NPCs are recorded as they act
  - Chronicle entries are cryptographically chained
  - The Chronicle is the game's social layer — players can read each other's histories
- **Permanence Covenant:** contracts/permanence/PermanenceCovenant.sol — Ethereum L2 smart contract
  - WitnessRegistry.sol for independent verification
  - 37 passing tests
- **Foundation archive:** foundation-archive.ts — geo-replicated, 3 providers, 6 copies
- **Genealogy tree:** genealogy-tree.ts — family and alliance lineages across generations
- **Dynasty portfolio:** dynasty-portfolio.ts — multi-generational asset tracking
- **Lore compendium:** lore-compendium.ts — accumulated world knowledge
- **Remembrance system:** remembrance-system.ts — milestone permanent records
- **Sealed chambers:** sealed-chambers.ts — secret lore unlocked only at conditions

### dye-house fabric (Security and Auth)

Security and authentication fabric. All encryption uses XChaCha20-Poly1305 via sodium-native (libsodium bindings).

Key systems:
- `sodium-encryption-backend.ts` — XChaCha20-Poly1305 encryption/decryption
- `rbac-engine.ts` — role-based access control
- `rate-limiter.ts`, `rate-limiter-system.ts` — per-player and per-IP rate limiting
- `zero-trust-engine.ts`, `zero-trust-gateway.ts` — zero-trust network policy
- `anti-cheat.ts` — server-side anti-cheat (speed, teleport, replay detection)
- `session-manager.ts`, `session-store.ts` — session lifecycle
- `key-rotation.ts`, `key-rotation-system.ts` — automatic key rotation
- `audit-log.ts`, `audit-log-system.ts` — immutable audit trail
- `compliance-engine.ts` — COPPA, GDPR compliance enforcement
- `content-moderation.ts`, `chronicle-moderation.ts` — moderation pipeline

### inspector fabric (Observability)

- Prometheus metrics: inspector/src/prometheus-metrics.ts
- OpenTelemetry tracing: inspector/src/otel-tracer.ts
- Chaos engineering: controlled failure injection for resilience testing
- SLA monitoring: uptime and latency tracking against defined SLAs

---

## Architecture Principles

1. **Hexagonal (Ports and Adapters):** Business logic in fabrics never imports infrastructure. Infrastructure adapters implement interfaces defined by the fabric.
2. **Event-driven:** Fabrics communicate through typed events (contracts/events/), never direct imports.
3. **Binary protocols on hot paths:** FlatBuffers + MessagePack between Loom and UE5. JSON only for admin/debug endpoints.
4. **The Loom is invisible to the frame budget:** Tick loop target < 0.5ms per game thread tick.
5. **Store highest quality, serve what device can handle:** Content adapts to player hardware capability.

## Character Demographic Assignment System

Character demographics (ethnicity and gender) for all 500 numbered characters are assigned deterministically using seeded random lists:

```python
ETHNIC_ASSIGNMENTS_500 = _build_race_list_500()  # seed 42
GENDER_ASSIGNMENTS_500 = _build_gender_list_500() # seed 44
```

**Distribution targets (ESA/Newzoo research):**
- Race (seed 42): White 44%, East Asian 19%, Latin 13%, Black 11%, South Asian 7%, MENA 4%, SE Asian 2%
- Gender (seed 44): Male 65%, Female 35%

These seeds are locked. Changing them would scramble all 500 character assignments. Character 001 (The Architect) is always skipped by assignment scripts — his visual spec is canonical in Vol1.md and the CSV.

Character ethnic and gender assignments are stored in the canonical bible and used as the basis for portrait generation prompts. The server does not currently store per-character demographic data in the database — it is baked into character profiles in CANONICAL_CHARACTER_BIBLE.md.
