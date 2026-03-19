# The Concord — Technical Roadmap to Artist Handoff

> **Classification:** Engineering Reference · Living Document
> **Last verified:** 2026-03-19
> **UE version target:** 5.7 (current plugin baseline: 5.5 — see migration notes)
> **Rule:** This document describes what can be built before artists are needed, and defines
> the exact moment artists become the critical path. When this document conflicts with
> NEXT-STEPS.md or session logs, verify the code first. Code does not lie.

---

## Vision & Scope

The Concord is a 35-year civilisation simulator MMO. The Loom is its authoritative
server-side engine — a headless TypeScript/Rust/Python orchestration system that owns
all world state, economy, NPC simulation, and social systems. UE5 is the rendering
fabric: a plugin consumer of Loom output, not the brain.

**Scope of this roadmap:** Everything that engineering can build to a shippable,
testable state before 3D environment artists, concept artists for hero NPCs, voice
actors, or narrative cinematics are needed. This covers the entire server stack, the
complete UE5 white-box client, and every gameplay system testable with placeholder
geometry, programmer art, and TTS-synthesised voices.

---

## Current Technical State (verified from code, 2026-03-19)

### Server (TypeScript/Rust/Python monorepo)

All 8 fabrics are implemented and test-covered (95.93% statement coverage, 10,581+
passing tests, 0 TypeScript errors). Phases 1–13 are marked complete in NEXT-STEPS.md.

| Fabric | Location | Status |
|---|---|---|
| loom-core | `fabrics/loom-core/src/` | ~140 source files — ECS, tick loop, event bus, world gen, weather, NPC AI, estates, quests |
| shuttle | `fabrics/shuttle/src/` | ~55 source files — 40+ NPC subsystems, Temporal workflows, behavior trees, ML pipeline |
| silfen-weave | `fabrics/silfen-weave/src/` | ~50 source files — corridor network, wormhole stabilizer, survey corps, transit |
| nakama-fabric | `fabrics/nakama-fabric/src/` | ~135 source files — KALON economy, alliances, Assembly governance, dynasties, PvP |
| archive | `fabrics/archive/src/` | ~60 source files — event sourcing, Chronicle, genealogy, lore compendium |
| selvage | `fabrics/selvage/src/` | ~75 source files — API gateway, gRPC, WebSocket, chat, e-sports |
| dye-house | `fabrics/dye-house/src/` | ~40 source files — auth, encryption (XChaCha20-Poly1305), RBAC, compliance |
| inspector | `fabrics/inspector/src/` | ~40 source files — Prometheus, OTel, chaos engineering, SLA monitoring |

### UE5 Plugin (`fabrics/bridge-loom-ue5/`)

57 `.h` headers + 57 `.cpp` implementations in `BridgeLoom` plugin. `LoomGameFeatures`
subsystem present. Host project: `KoydoWorldsGame/KoydoWorlds.uproject`.

All major C++ modules are implemented: Renderer, WorldStreamer, MetaHuman,
MetaHumanLibrary, NPCAnimation, MassEntity, CrowdSim, Niagara, Lumen, ChaosPhysics,
Water, Vegetation, BuildingStage, DayNightCycle, Dialogue, Movement, NavMesh, SpawnSystem,
PixelStreaming, InputComponent, Interaction, Ability, Estate, Lattice, WeaveZone,
ThreadwayNetwork, QuestChains, PostProcess, SaveGame, SeasonalContent, StatusEffect,
StreamProcessor, and the LoomCharacter/LoomGameMode/LoomPlayerController game framework.

### Infrastructure

- PostgreSQL + Redis + Nakama backend (docker-compose + k8s manifests in `k8s/`)
- Rust NAPI event bus (`native/event-bus/`)
- Temporal.io workflow worker (`shuttle/src/temporal-worker.ts`)
- Python ML pipelines: 7 scripts in `pipelines/` (world gen, NPC tier 3 LLM, behavior
  training, character generation)
- 19 database migrations applied (`db/migrations/`)
- Permanence Covenant: Ethereum L2 smart contracts (`contracts/permanence/`)
- CI/CD: GitHub Actions (typecheck → lint → test → docker → k8s gate)

### Characters & World Design

- 500 named characters with full narrative profiles (CANONICAL_CHARACTER_BIBLE.md)
- 600 worlds designed in WORLDS_BIBLE.md
- All wormhole/Lattice topology, faction structure, and era timeline defined
- No production 3D art, no final voice acting, no cinematics

---

## Artist Handoff Definition

> The handoff point is the moment when **blocking progress on any playable milestone
> requires assets that must come from a human artist** — concept art, 3D models, texture
> sets, or final voice performances. Everything before this line is engineering-owned.

**Trigger conditions (ALL of these must be true before artists are on the critical path):**

1. A live server runs all 8 fabrics with real player sessions (not unit tests).
2. The UE5 client connects to the live server over gRPC and renders the world.
3. A player can move through at least one world, interact with an NPC, earn KALON,
   travel a Weave corridor to a second world, and have that session Chronicle-recorded —
   all using placeholder / programmer-art assets.
4. The NPC dialogue system speaks audible lines (TTS acceptable, final voices not needed).
5. Economy, Assembly governance, and dynasty systems are exercisable in a playtest.
6. Performance budget is verified: tick < 0.5ms, API p99 < 50ms, UE5 maintains 60fps
   on target hardware with placeholder geometry.

Until all 6 conditions are met, more engineering work unblocks more progress than any
art commission would.

---

## Phase 1 — Server Foundation

> **Status: COMPLETE** (verified against fabric source files)
> **No artists needed.** All work is infrastructure and tooling.

This phase established the production-grade infrastructure adapters. Documented here
for completeness and as a baseline for the UE5.5 → 5.7 migration dependency analysis.

| Subsystem | File | Complexity | Notes |
|---|---|---|---|
| Fastify HTTP/WebSocket bootstrap | `src/main.ts` | S | Done |
| Fastify transport adapter | `selvage/src/fastify-transport.ts` | S | Done |
| Pino structured logging | `loom-core/src/pino-logger.ts` | S | Done |
| PostgreSQL event store | `archive/src/pg-persistence.ts` | M | Done |
| XChaCha20-Poly1305 encryption | `dye-house/src/sodium-encryption-backend.ts` | M | Done |
| Redis cache with test double | `loom-core/src/redis-cache.ts` | S | Done |
| gRPC transport (UE5 bridge) | `selvage/src/grpc-transport.ts` | M | Done |
| Binary codec (FlatBuffers + MsgPack) | `contracts/protocols/src/binary-codec.ts` | M | Done |
| Prometheus metrics | `inspector/src/prometheus-metrics.ts` | S | Done |
| OpenTelemetry tracing | `inspector/src/otel-tracer.ts` | S | Done |
| Docker multi-stage image | `Dockerfile` | S | Done |
| Kubernetes manifests | `k8s/` | M | Done |

**Remaining P0 items in this layer:**
- [ ] Penetration test (contracted, pre-Open Beta) — not code, external engagement
- [ ] Terms of Service v1.0 legal review — not code, legal team
- [ ] Data processing agreements with third-party providers — not code, legal team

---

## Phase 2 — Game Server & World Simulation

> **Status: COMPLETE** (verified against fabric source files)
> **No artists needed.** All work is simulation logic and server state.

The entire game simulation layer — all the systems that make the Concord's 600 worlds
behave like a living civilisation — is implemented and tested.

### 2.1 Entity & World Systems (loom-core)

| Subsystem | File | Complexity |
|---|---|---|
| ECS (entity/component/archetype) | `entity-registry.ts`, `component-store.ts`, `component-archetype.ts` | L |
| Tick loop (< 0.5ms target) | `tick-loop.ts`, `system-scheduler.ts` | M |
| Event bus + sourcing | `in-process-event-bus.ts`, `event-sourcing.ts` | M |
| World generator (Perlin, biomes, settlements) | `world-generator.ts`, `biome-engine.ts`, `terrain-engine.ts` | L |
| Weather + day/night | `weather-system.ts`, `day-night-cycle.ts` | M |
| Dungeon generator | `dungeon-generator.ts` | M |
| Estate system | `estate-system.ts` | L |
| Quest system | `procedural-quest.ts`, `quest-chains.ts`, `quest-tracker.ts` | L |
| Silfen Weave seamless transit | `weave-system.ts`, `transit-weave-adapter.ts` | L |
| Hidden zones | `hidden-zones.ts` | S |
| Seasonal content | `seasonal-content.ts` | M |
| Spawn + respawn | `spawn-system.ts`, `respawn-system.ts` | M |
| Spatial index | `spatial-index.ts` | M |

### 2.2 NPC Systems (shuttle — 40+ subsystems)

All implemented. Key subsystems:

| Subsystem | File | Complexity |
|---|---|---|
| Behavior tree v2 | `behavior-tree-v2.ts` | L |
| NPC memory (v1 + v2) | `npc-memory.ts`, `npc-memory-v2.ts` | L |
| NPC emergent intelligence (Tier 4) | `npc-emergent-intelligence.ts` | XL |
| Goal planner + decision | `npc-goal-planner.ts`, `npc-decision.ts` | L |
| Dialogue engine | `npc-dialogue-engine.ts` | L |
| Personality, emotion, traits | `npc-personality.ts`, `npc-emotion-system.ts`, `npc-traits.ts` | M |
| NPC economy, politics, religion | `npc-economy.ts`, `npc-politics.ts`, `npc-religion.ts` | M |
| NPC schedule v2 | `npc-schedule-v2.ts` | M |
| NPC combat AI | `npc-combat-ai.ts` | L |
| Crowd simulation | `npc-crowd-simulation.ts` | L |
| Procedural quest generator | `procedural-quest-generator.ts` | L |
| Temporal workflow worker | `temporal-worker.ts` | M |
| ML pipeline (RandomForest → ONNX) | `ml-pipeline.ts` | L |

### 2.3 Economy & Governance (nakama-fabric — 135+ subsystems)

All implemented. Key subsystems:

| Subsystem | File | Complexity |
|---|---|---|
| KALON ledger | `kalon-ledger.ts`, `kalon-levy.ts` | M |
| Market (auction, black market) | `market-price-engine.ts`, `auction-engine.ts`, `black-market.ts` | L |
| Trade engine | `trade-engine.ts`, `trade-route-registry.ts` | L |
| Crafting (engine, recipes, specialization) | `crafting-engine.ts`, `crafting-recipe-registry.ts` | M |
| Dynasty system (full lifecycle) | `dynasty.ts`, `dynasty-succession.ts`, `dynasty-alliance.ts` | XL |
| Assembly governance | `assembly.ts`, `governance-engine.ts`, `constitutional-amendment.ts` | XL |
| War engine | `war-engine.ts`, `competitive-pvp.ts` | L |
| Insurance, investment, monetary policy | `insurance-market.ts`, `investment-fund.ts`, `monetary-policy.ts` | L |
| Economy maturation (central bank AI) | `economy-maturation.ts` | L |
| World sovereignty | `world-sovereignty-claims.ts`, `world-sovereignty-ledger.ts` | M |
| Subscription tiers | `subscription-tiers.ts`, `subscription-lifecycle.ts` | M |

### 2.4 Persistence & Chronicle (archive)

| Subsystem | File | Complexity |
|---|---|---|
| Event sourcing + pg archive | `event-sourcing.ts`, `pg-event-archive.ts` | M |
| Chronicle (builder, search, hasher) | `chronicle.ts`, `chronicle-builder.ts`, `chronicle-search.ts` | L |
| Dynasty portfolio | `dynasty-portfolio.ts` | M |
| Genealogy tree | `genealogy-tree.ts` | M |
| Lore compendium | `lore-compendium.ts` | M |
| Sealed chambers | `sealed-chambers.ts` | M |
| Remembrance system | `remembrance-system.ts` | M |
| Foundation archive (geo-replicated) | `foundation-archive.ts` | L |
| Permanence Covenant (L2 smart contracts) | `contracts/permanence/PermanenceCovenant.sol` | L |

---

## Phase 3 — UE5 White-Box Client

> **Status: COMPLETE (code scaffolding and logic)**
> **No artists needed for this phase.** Placeholder cubes, capsules, and debug meshes
> are sufficient to exercise all systems. Final geometry, textures, and character art
> come after the handoff point.

This phase covers all C++ UE5 plugin work achievable with placeholder assets.

### 3.1 Core Plugin Architecture

| Component | File | Complexity | Notes |
|---|---|---|---|
| BridgeLoom plugin module | `BridgeLoomModule.cpp/.h` | S | Done |
| LoomGameMode | `LoomGameMode.cpp/.h` | M | Done |
| LoomPlayerController | `LoomPlayerController.cpp/.h` | M | Done |
| LoomCharacter (base pawn) | `LoomCharacter.cpp/.h` | M | Done |
| BridgeLoomSubsystem | `BridgeLoomSubsystem.cpp/.h` | M | Done |
| BridgeLoomConnection (gRPC) | `BridgeLoomConnection.cpp/.h` | M | Done |

### 3.2 World Rendering & Streaming

| Component | File | Complexity | Notes |
|---|---|---|---|
| World chunk streaming | `BridgeLoomWorldStreamer.cpp/.h` | L | Done |
| Renderer (time-of-day, weather, LOD) | `BridgeLoomRenderer.cpp/.h` | L | Done |
| Lumen lighting | `BridgeLoomLumen.cpp/.h` | M | Done |
| Post-processing per world | `BridgeLoomPostProcess.cpp/.h` | M | Done |
| Vegetation (SpeedTree, interactive flora) | `BridgeLoomVegetation.cpp/.h` | M | Done |
| Water simulation | `BridgeLoomWater.cpp/.h` | M | Done |
| Chaos physics (destructible terrain) | `BridgeLoomChaosPhysics.cpp/.h` | L | Done |
| Day/night cycle | `BridgeLoomDayNightCycle.cpp/.h` | S | Done |
| Seasonal transitions | `BridgeLoomSeasonalContent.cpp/.h` | M | Done |
| NavMesh (runtime recast) | `BridgeLoomNavMesh.cpp/.h` | M | Done |

### 3.3 NPC Visual Layer

| Component | File | Complexity | Notes |
|---|---|---|---|
| MetaHuman facial rig (52 ARKit blend shapes) | `BridgeLoomMetaHuman.cpp/.h` | L | Done |
| MetaHuman library (50+ presets, runtime blend) | `BridgeLoomMetaHumanLibrary.cpp/.h` | L | Done |
| NPC body animation (full-body IK, gesture) | `BridgeLoomNPCAnimation.cpp/.h` | L | Done |
| Mass Entity (100K+ crowd NPCs) | `BridgeLoomMassEntity.cpp/.h` | L | Done |
| Crowd simulation (pathfinding, market) | `BridgeLoomCrowdSim.cpp/.h` | L | Done |
| Building construction stages | `BridgeLoomBuildingStage.cpp/.h` | M | Done |
| Visitor characters | `BridgeLoomVisitorCharacters.cpp/.h` | M | Done |

### 3.4 Gameplay Systems (C++)

| Component | File | Complexity | Notes |
|---|---|---|---|
| Dialogue (lip sync, subtitles) | `BridgeLoomDialogue.cpp/.h` | L | Done |
| Ability system | `BridgeLoomAbility.cpp/.h` | L | Done |
| Interaction system | `BridgeLoomInteraction.cpp/.h` | M | Done |
| Input component (gamepad/KBM/touch) | `BridgeLoomInputComponent.cpp/.h` | M | Done |
| Movement system | `BridgeLoomMovement.cpp/.h` | M | Done |
| Spawn system | `BridgeLoomSpawnSystem.cpp/.h` | M | Done |
| Status effects | `BridgeLoomStatusEffect.cpp/.h` | M | Done |
| Save game | `BridgeLoomSaveGame.cpp/.h` | M | Done |
| Quest chains | `BridgeLoomQuestChains.cpp/.h` | M | Done |
| Loot tables | `BridgeLoomLootTable.cpp/.h` | M | Done |
| Hidden zones | `BridgeLoomHiddenZones.cpp/.h` | M | Done |
| Estate visual | `BridgeLoomEstate.cpp/.h` | M | Done |
| Lattice visual | `BridgeLoomLattice.cpp/.h` | M | Done |
| Threadway network (Weave corridors) | `BridgeLoomThreadwayNetwork.cpp/.h` | L | Done |
| Weave zone (transition shader) | `BridgeLoomWeaveZone.cpp/.h` | M | Done |
| Dungeon generator integration | `BridgeLoomDungeonGenerator.cpp/.h` | M | Done |
| Entity manager | `BridgeLoomEntityManager.cpp/.h` | M | Done |
| NPC AI (UE5 side) | `BridgeLoomNPCAI.cpp/.h` | L | Done |
| Respawn | `BridgeLoomRespawn.cpp/.h` | S | Done |

### 3.5 Platform & Streaming

| Component | File | Complexity | Notes |
|---|---|---|---|
| Pixel Streaming (WebRTC proxy) | `BridgeLoomPixelStreaming.cpp/.h` | L | Done |
| Mobile (iOS/Android, touch controls) | `BridgeLoomMobile.cpp/.h` | L | Done |
| Haptics | `BridgeLoomHaptics.cpp/.h` | S | Done |
| Accessibility (colorblind, subtitles) | `BridgeLoomAccessibility.cpp/.h` | M | Done |
| VR support | `BridgeLoomVR.cpp/.h` | L | Done |
| Cross-reality | `BridgeLoomCrossReality.cpp/.h` | M | Done |
| Niagara particle systems | `BridgeLoomNiagara.cpp/.h` | L | Done |
| Stream processor | `BridgeLoomStreamProcessor.cpp/.h` | M | Done |

### 3.6 GameFeatures

Both GameFeature plugins exist under `fabrics/bridge-loom-ue5/GameFeatures/`:

| Feature | Notes |
|---|---|
| LoomGameFeatures | Core feature registration, component lifecycle |

### 3.7 Open White-Box Tasks (no art required)

These are the remaining items that are code-only and have no external art dependency:

| Task | Fabric | Complexity | Notes |
|---|---|---|---|
| First-pass UE5 level (white-box single world) | UE5 | M | BSP/modular kit geometry — no artist needed |
| Player onboarding tutorial flow | UE5 + loom-core | M | Text + debug UI only |
| TTS integration (NPC dialogue → audio) | shuttle + UE5 | L | Wire `npc-speech-synthesis.ts` to UE5 audio |
| Ambient audio system wire-up | UE5 | M | Wire `audio-engine.ts` → UE5 Wwise/MetaSound |
| Lint cleanup (1,246 pre-existing errors) | All fabrics | M | No new logic, just cleanup |
| Zod validation on remaining selvage boundaries | selvage | S | Security hardening |
| Rate limiter TTL cleanup | dye-house | S | Technical debt |
| Vol5 character canonicalization | scripts | S | Run `canonicalize-characters.py` |

---

## Phase 4 — Network & Streaming Architecture

> **Status: COMPLETE**
> **No artists needed.** Pure networking and protocol work.

| Subsystem | File | Complexity | Notes |
|---|---|---|---|
| Binary WebSocket frame protocol (15-byte header, delta compression) | `selvage/src/sync-protocol.ts` | L | Done |
| gRPC bridge to UE5 | `selvage/src/bridge-grpc-server.ts`, `bridge-grpc-transport.ts` | L | Done |
| Rollback netcode | `selvage/src/rollback-netcode.ts` | XL | Done |
| Connection pooling + migration | `selvage/src/connection-pool.ts`, `connection-migration.ts` | M | Done |
| P2P mesh | `selvage/src/p2p-mesh.ts` | L | Done |
| Bandwidth predictor + optimizer | `selvage/src/bandwidth-predictor.ts`, `bandwidth-optimizer.ts` | M | Done |
| Load balancer | `selvage/src/load-balancer.ts` | M | Done |
| Circuit breaker | `selvage/src/circuit-breaker.ts` | M | Done |
| Rate guard | `selvage/src/rate-guard.ts` | S | Done |
| UDP protocol | `selvage/src/udp-protocol.ts` | M | Done |
| SSE stream | `selvage/src/sse-stream.ts` | S | Done |
| Rust NAPI event bus (>100K events/sec) | `native/event-bus/` | L | Done |
| Multi-region k8s (Istio, HPA, PDB) | `k8s/multi-region.yml` | L | Done |
| TimescaleDB analytics hypertables | `archive/src/timescale-store.ts` | M | Done |

---

## Phase 5 — AI / NPC Systems

> **Status: COMPLETE**
> **No artists needed.** All NPC logic runs headless and is testable without visual assets.

The shuttle fabric contains 55+ NPC subsystems. The critical runtime chain is:

```
Temporal workflow (shuttle-orchestrator.ts)
  → behavior-tree-v2.ts (goal selection)
  → npc-goal-planner.ts (multi-week planning)
  → npc-emergent-intelligence.ts (Tier 4 LLM routing)
  → npc-dialogue-engine.ts (dialogue generation)
  → npc-speech-synthesis.ts (TTS → audio bytes)
  → gRPC stream → BridgeLoomDialogue.cpp (lip sync, audio playback)
```

| Subsystem | File | Complexity | Notes |
|---|---|---|---|
| Tier 4 emergent planner | `npc-emergent-intelligence.ts` | XL | Done |
| Tier 3 LLM (8 archetypes) | `pipelines/npc_tier3_llm.py` | L | Done |
| Tier 2 behavior tree | `behavior-tree-v2.ts` | L | Done |
| Tier 1 FSM crowd | `npc-crowd-simulation.ts` | M | Done |
| NPC creation pipeline | `npc-creation-pipeline.ts` | L | Done |
| NPC knowledge system | `npc-knowledge-system.ts` | L | Done |
| NPC relationship system | `npc-relationship-system.ts` | L | Done |
| NPC social network | `npc-social-network.ts` | L | Done |
| NPC migration | `npc-migration.ts` | M | Done |
| NPC mortality | (mortality-connect-adapter.ts, loom-core) | M | Done |
| World population management | `world-population.ts` | M | Done |
| Shadow economy | `world-shadow-economy.ts` | M | Done |
| Procedural quest generator | `procedural-quest-generator.ts` | L | Done |
| ML behavior training (ONNX export) | `pipelines/npc_behavior_training.py` | L | Done |
| Speech synthesis | `npc-speech-synthesis.ts` | M | Done (TTS wire-up pending) |
| Voice transcription (Whisper) | `voice-transcription.ts` | M | Done |

---

## Phase 6 — Economy & Chronicle Systems

> **Status: COMPLETE**
> **No artists needed.**

The KALON economy and Chronicle are the two pillars that make The Concord's permanence
covenant real. Both are fully implemented.

### 6.1 KALON Economy

Running on nakama-fabric. Key capabilities verified in source:

- Market price engine with supply/demand curves
- Commodity futures and forward contracts
- Insurance marketplace (player-created products)
- Continuity bonds (cross-session investment)
- Monetary policy (central bank AI, interest rates, supply)
- World-local taxation (progressive rates, Assembly-voted)
- Inter-world trade treaties (tariffs, quotas, free trade zones)
- Quarterly tithe system
- KALON stellar standard
- Universal Basic KALON (UBK)
- Economy simulation + scheduler (automatic cycles)
- Black market + contraband registry

### 6.2 Chronicle & Permanence

Running on archive fabric + Ethereum L2:

- Chronicle builder: player actions → Chronicle entries
- Chronicle hasher: cryptographic chain
- Permanence Covenant smart contract (`PermanenceCovenant.sol`) — 37 passing tests
- Witness registry (`WitnessRegistry.sol`)
- Foundation archive: geo-replicated, 3 providers, 6 copies
- Remembrance system: milestone events, permanent historical records
- Dynasty portfolio: multi-generational asset tracking
- Genealogy tree: family/alliance lineages across player generations

### 6.3 Governance

- Assembly full lifecycle: proposal → debate → vote → legislation → execution
- Constitutional amendments (supermajority + ratification)
- Assembly crisis protocol, delegation registry, voting history
- Judicial system: disputes, appeals, arbitration
- Elections: campaigns, registration, platform, voting
- World local governance: mayors, councils, ordinances

---

## Phase 7 — Pre-Artist Polish Pass

> **Status: PARTIALLY COMPLETE — remaining items listed below**
> **No artists needed.** This is final engineering hardening before the art pipeline opens.

### 7.1 Technical Debt Cleanup

| Item | Location | Complexity | Priority |
|---|---|---|---|
| Lint: `max-lines-per-function` (~580 violations) | All fabrics | M | P1 |
| Lint: `no-unnecessary-type-assertion` (~190) | All fabrics | S | P2 |
| Lint: `no-unused-vars` (~180) | All fabrics | S | P2 |
| Lint: `strict-boolean-expressions` (~65) | All fabrics | S | P2 |
| Lint: `no-non-null-assertion` (~64) | All fabrics | S | P2 |
| MAX_MESSAGE_SIZE_BYTES enforcement in transport (before JSON.parse) | selvage | S | P1 |
| TTL-based cleanup for rate limiter window state | dye-house | S | P1 |

### 7.2 Playtest Readiness

| Item | Fabric | Complexity | Priority |
|---|---|---|---|
| First white-box world (BSP level, placeholder static meshes) | UE5 editor | M | P0 |
| Player onboarding: tutorial flow, controls, UI hints | UE5 + loom-core | M | P0 |
| TTS audio wire-up (shuttle → gRPC → UE5 audio component) | shuttle + UE5 | L | P0 |
| Ambient soundscape wire-up (18/50 world soundscapes exist) | loom-core + UE5 | M | P1 |
| Leitmotif wire-up (8/50 leitmotifs exist) | loom-core + UE5 | M | P1 |
| 20-person internal playtest | — | — | P0 (milestone gate) |

### 7.3 Security Hardening (Remaining)

| Item | Fabric | Complexity | Priority |
|---|---|---|---|
| Contracted penetration test | External | — | P0 (pre-Open Beta) |
| Bug bounty program (HackerOne/Bugcrowd) | External | — | P1 |
| Terms of Service v1.0 legal review | Legal | — | P0 |
| Data processing agreements | Legal | — | P0 |

### 7.4 UE5.5 → UE5.7 Migration

| Item | Notes | Complexity |
|---|---|---|
| Update `.uplugin` EngineVersion field | `BridgeLoom.uplugin` line change | S |
| Audit MassEntity API changes (5.5 → 5.7 breaking) | Mass AI had API churn; review `BridgeLoomMassEntity.cpp` | M |
| MetaHuman Component API (5.7 moved RigLogic to new module) | Review `BridgeLoomMetaHuman.cpp`, `BridgeLoomMetaHumanLibrary.cpp` | M |
| CommonUI plugin registration (moved in 5.6) | Update `.uproject` plugin list | S |
| Nanite Tessellation (new in 5.5+, stable in 5.7) | Optional: add to terrain materials for detail | M |
| Substrate materials (replaces layered materials in 5.7) | Low priority unless art team requests | L |
| Chaos Vehicle improvements (5.7) | Only if transit vehicles are in scope | S |
| LumenRT (real-time scene capture, 5.7) | Relevant for Chronicle screenshot system | M |
| Build system: upgrade UBT target files | `KoydoWorlds.uproject`, `BridgeLoom.Build.cs` | S |

---

## Artist Handoff Point — Definition

Engineering delivers the following **demo binary** to the art team. No assets beyond
this are needed to hand off:

### Handoff Deliverable: "Playable Whitebox Demo"

```
Server:
  ✓ Live Loom server (docker-compose or k8s) with all 8 fabrics running
  ✓ Nakama + PostgreSQL + Redis operational
  ✓ At least 2 worlds active in world-manager
  ✓ A Lattice corridor connecting them
  ✓ Chronicle recording player actions
  ✓ KALON ledger tracking economy
  ✓ Assembly governance accepting motions
  ✓ At least 10 NPC instances active (Tier 2 or 3)

UE5 Client:
  ✓ Connects to live server over gRPC
  ✓ Player can move, interact, trade in a white-box level
  ✓ NPC dialogue plays (TTS voice acceptable)
  ✓ Weave corridor transit works (placeholder shader)
  ✓ HUD shows KALON balance, health, quest tracker
  ✓ World map shows connected worlds
  ✓ Stable 60fps on target spec hardware

Performance:
  ✓ Tick loop < 0.5ms
  ✓ API p99 < 50ms
  ✓ Memory < 4GB server, < 8GB client
  ✓ No critical OWASP findings
```

### What Artists Receive at Handoff

- **CANONICAL_CHARACTER_BIBLE.md** — 500 character profiles with full physical specs
  and visual prompt specs ready for concept art
- **CHARACTER-DESIGN-BRIEF.md** — 50 Hero NPC priority order and style brief
- **WORLDS_BIBLE.md** — 600 worlds with environment, atmosphere, culture, biome specs
- **GAME_DESIGN_BIBLE.md** — faction visual language, era aesthetics, design pillars
- **Working white-box demo** — artists can walk through the actual game, not a mockup
- **Integration guide** — how to get 3D assets into UE5 and into the Loom pipeline
- **Character portrait references** — 500 fal.ai FLUX-pro reference portraits
  (`docs/character-references/`) as directional references, not final art

### Artist Onboarding Priority Order

1. **Hero NPCs (Tier 4) — 5 priority characters** (defined in CHARACTER-DESIGN-BRIEF.md):
   - Character 001 — The Architect (Lattice avatar, canonical visual defined)
   - Vol1 characters 2–15 (fully specced in Vol1.md + CSV)
2. **First world environment** — one world, complete, as art pipeline proof-of-concept
3. **Remaining 49 world environments** — batch commissioning
4. **Remaining 485 characters** — batch commissioning via canonical bible

---

## Post-Handoff (Artist Dependencies)

These items cannot proceed without artist deliverables. Engineering work on them should
not start until assets are in-hand.

| Item | Dependency | Notes |
|---|---|---|
| MetaHuman asset swap (final faces) | Artist: character concept art → MetaHuman scan/build | Hero NPCs only at launch |
| World environment 3D art | Artist: world concept art + 3D modeling | 1 world to prove pipeline, then batch |
| World material library (final PBR) | Artist: texture sets | Material pipeline is wired; needs actual textures |
| NPC costume sets | Artist: costume concepts → 3D modeling | Modular wardrobe system is wired |
| Narrative cutscenes (10–15) | Artist (cinematic) + writer + voice actor | UE5 Sequencer wired; needs director + assets |
| Final voice performances | Voice actor | TTS acceptable through closed beta |
| Remaining ambient soundscapes (32 of 50) | Composer | 18 exist; 32 more needed |
| Remaining leitmotifs (42 of 50) | Composer | 8 exist; 42 more needed |
| Concept art for faction UI motifs | Artist: UI concept art | CommonUI system wired; needs themed assets |
| Official game logo and brand kit | Designer | Marketing, not gameplay |

---

## Tech Debt & Blockers

### Active Technical Debt

| Item | Impact | Effort | Owner |
|---|---|---|---|
| 1,246 lint violations (non-critical) | Code quality, CI noise | M | Engineering |
| Vol5 character bibles 351–480 (background agent) | Portrait generation blocked | S | Ongoing |
| Portrait regeneration (~495 portraits, ~$24.75) | All portraits with changed demographics | S | Run after Vol5 complete |
| `docs/vol5_assignments.txt` (temp file) | Clutter | Trivial | Delete after generation |

### External Blockers (Non-Engineering)

| Item | Blocker Type | Notes |
|---|---|---|
| Penetration test | Budget + scheduling | Pre-Open Beta requirement |
| ToS + Privacy Policy legal review | Legal | Pre-public launch |
| Data processing agreements | Legal | GDPR requirement |
| 3D environment art | Budget + artist availability | Post-handoff |
| Voice acting | Budget + casting | TTS acceptable through beta |
| RevenueCat native platform keys | RevenueCat dashboard access | `appl_` / `goog_` keys needed |

### Architecture Risks

| Risk | Severity | Mitigation |
|---|---|---|
| UE5.5 → 5.7 migration breaking API changes | Medium | Audit list in Phase 7.4 above; test in isolated branch |
| MassEntity API churn (5.5 → 5.7) | Medium | `BridgeLoomMassEntity.cpp` needs targeted review |
| Temporal.io version drift | Low | Pin `@temporalio/*` versions in package.json |
| Nakama version compatibility | Low | Pinned in `nakama.yml`; test before upgrade |
| Permanence Covenant L2 gas costs | Low | Benchmark on testnet before mainnet deploy |
| Rust NAPI event bus: Node.js 22 ABI | Low | Rebuild native addon on Node upgrade |

---

## Version Target: UE5.5 → UE5.7 Migration Notes

The plugin baseline is UE5.5. The target version is UE5.7. This migration is
**engineering-owned and requires no art assets.**

### Breaking Changes to Verify

```
UE5.6 changes affecting this codebase:
  - CommonUI: plugin registration moved to Plugins array in .uproject
  - MetaHuman: RigLogic moved to standalone plugin (RigLogicModule)
  - Enhanced Input: fully replaced Legacy Input System (verify LoomPlayerController)
  - Nanite: Tessellation out of experimental
  - Lumen: Hardware Ray Tracing improvements (verify BridgeLoomLumen.cpp defaults)

UE5.7 changes affecting this codebase:
  - Mass AI: Entity Handle type changes, Processor registration API updated
    → Review BridgeLoomMassEntity.cpp ProcessorGroups registration
  - Substrate materials: default in new projects, opt-in for existing
    → Do NOT enable unless art team requests; backward-compatible
  - LumenRT scene capture: new API for Chronicle screenshot system
    → Opportunity to improve capture quality in BridgeLoomRenderer.cpp
  - MetaHuman Animator: new runtime retargeting API
    → Potential improvement to BridgeLoomNPCAnimation.cpp IK chain
  - Game Feature Actions: async activation now default
    → Verify LoomGameFeatures GameFeatureAction subclasses
```

### Migration Execution Plan

```
Step 1 (S): Update engine version in .uplugin + .uproject
Step 2 (M): Build on 5.7, collect compile errors
Step 3 (M): Fix MassEntity processor registration (known breaking)
Step 4 (M): Fix MetaHuman RigLogic plugin dependency
Step 5 (S): Fix CommonUI plugin reference
Step 6 (S): Verify Enhanced Input bindings in LoomPlayerController
Step 7 (M): Test white-box level end-to-end on 5.7
Step 8 (S): Update CI to build on 5.7 image
```

Total estimated effort: **4–6 engineering days** in isolated branch before merging.

---

## Summary: The Critical Path

```
[DONE]  Server infrastructure (Phases 1–2)
[DONE]  UE5 plugin C++ (Phase 3)
[DONE]  Network + streaming (Phase 4)
[DONE]  AI/NPC systems (Phase 5)
[DONE]  Economy + Chronicle (Phase 6)

[NOW]   Phase 7 — Pre-Artist Polish
          → TTS audio wire-up            (L, P0)
          → White-box first world level  (M, P0)
          → Player onboarding flow       (M, P0)
          → 20-person internal playtest  (milestone gate)
          → UE5.5 → 5.7 migration       (M–L, P0)
          → Lint cleanup                 (M, P1)

[GATE]  Playable Whitebox Demo
          → Artist handoff package prepared
          → CHARACTER-DESIGN-BRIEF.md sent to concept artist
          → WORLDS_BIBLE.md sent to environment artist

[POST]  Artist pipeline opens
          → Hero NPC MetaHuman builds
          → First world environment art
          → Remaining 49 worlds
          → Voice acting (beta+)
          → Cinematics (post-launch)
```

**Realistic timeline to Playable Whitebox Demo:** 4–6 weeks (primarily the UE5.7
migration and TTS wire-up, not net-new server work). The server is feature-complete.
The asset pipeline is the only remaining critical path.
