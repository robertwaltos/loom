# Project Loom — Next Building Steps

## Current Status Summary

| Metric | Value |
|--------|-------|
| **Lines of Code** | 237,948+ TypeScript + Rust + C++ + Python |
| **Source / Test** | 434+ source / 409 test files |
| **Tests** | 10,581 passing (411 suites) |
| **Coverage** | 95.93% stmts / 86.57% branches / 98.77% functions / 97.93% lines |
| **Build** | Clean — 0 TypeScript errors |
| **Lint** | 1,246 pre-existing errors (0 critical `any` types) |
| **Security** | No critical OWASP findings |
| **Architecture** | Clean hexagonal — zero cross-fabric imports |

## What's Complete (85%)

All **game simulation systems** are fully implemented and tested:

- **loom-core**: ECS, tick loop, event bus, world state, dungeon generator, weather, seasons
- **nakama-fabric**: KALON economy (48K lines), crafting, trading, taxation, insurance, investment funds, carbon credits, monetary policy, reputation bonds
- **shuttle**: 40+ NPC subsystems (personality, memory, religion, politics, war-ai, quest-giver, art/culture, philosophy, migration, mortality)
- **silfen-weave**: Lattice transit, frequency lock, survey corps, wormhole stabilizer, corridor network, gravity wells
- **archive**: Event sourcing, chronicle, genealogy, dynasty portfolio, faction history, lore compendium, treaty archive
- **selvage**: API gateway, protocol spec, message codec, connection manager, rate limiting
- **dye-house**: Auth abstractions, permission gates, token vault, rate limiter, CSRF guard, zero-trust gateway
- **inspector**: Health probes, SLA monitoring, metrics abstractions

## Phase 1: COMPLETE ✅

All 5 infrastructure adapters + server bootstrap implemented:
- `src/main.ts` — Fastify HTTP + WebSocket server bootstrap
- `fabrics/selvage/src/fastify-transport.ts` — Fastify WebSocket TransportPort
- `fabrics/loom-core/src/pino-logger.ts` — Pino structured JSON logging
- `fabrics/archive/src/pg-persistence.ts` — PostgreSQL persistence (Chronicle + Event Store)
- `fabrics/dye-house/src/sodium-encryption-backend.ts` — XChaCha20-Poly1305 AEAD
- `fabrics/dye-house/src/node-hash-backend.ts` — Node.js crypto hash backend
- `fabrics/loom-core/src/redis-cache.ts` — Redis cache with in-memory test double

## Phase 2: COMPLETE ✅

All 5 interconnection systems implemented:
- `fabrics/selvage/src/grpc-transport.ts` — gRPC server/client (JSON-over-gRPC)
- `contracts/protocols/src/binary-codec.ts` — Binary envelope + MessagePack codecs
- `fabrics/archive/src/pg-event-archive.ts` — PostgreSQL event archive with replay
- `fabrics/inspector/src/prometheus-metrics.ts` — Prometheus adapter (prom-client)
- `fabrics/inspector/src/otel-tracer.ts` — OpenTelemetry distributed tracing
- `Dockerfile` — Multi-stage Node.js 22 production image
- `docker-compose.yml` — Postgres + Redis + Loom + OTel collector
- `.github/workflows/ci.yml` — Updated with Docker build job
- `k8s/` — Kubernetes namespace + deployment + service manifests

## Phase 3: COMPLETE ✅

All 4 scale systems scaffolded:
- `native/event-bus/` — Rust NAPI event bus (Cargo.toml + lib.rs with crossbeam + DashMap)
- `fabrics/shuttle/src/temporal-worker.ts` — Temporal client + worker adapter
- `fabrics/bridge-loom-ue5/` — UE5 C++ plugin scaffold (module, subsystem, .uplugin)
- `pipelines/` — Python AI/ML (NPC behavior training + procedural generation)

## Technical Debt Backlog

### Lint Cleanup (1,304 errors)
| Rule | Count | Fix Strategy |
|------|-------|-------------|
| `max-lines-per-function` | ~580 | Split large test functions into describe blocks |
| `no-unnecessary-type-assertion` | ~190 | Remove redundant `as Type` casts |
| `no-unused-vars` | ~180 | Remove unused imports/variables |
| `strict-boolean-expressions` | ~65 | Add explicit boolean checks |
| `no-non-null-assertion` | ~64 | Replace `!` with proper null checks |
| `no-redundant-type-constituents` | ~59 | Clean up union types |
| Other | ~166 | Various minor fixes |

### Security Hardening
- Add Zod schema validation on all selvage message parsing
- Enforce MAX_MESSAGE_SIZE_BYTES in transport layer before JSON.parse
- Add TTL-based cleanup to rate limiter window state

---

## Phase 4: COMPLETE ✅

All 4 sub-phases implemented:
- **4.1**: `nakama-client.ts` — Nakama HTTP REST adapter (auth, presence, matchmaking, leaderboards, storage)
- **4.2**: `sync-protocol.ts` — Binary WebSocket protocol (15-byte header, delta compression, EWMA latency)
- **4.3**: `character-creation.ts` — 5 archetypes, starting KALON, starter items, dynasty founding
- **4.4**: `input-validation.ts` — Anti-cheat (speed hack, teleport, rapid-fire, replay, violation scoring)

## Phase 5: COMPLETE ✅

All 3 sub-phases implemented:
- **5.1**: `BridgeLoomRenderer.h/.cpp` — UE5 time-of-day, weather, LOD bias, material parameters
- **5.2**: `world-streaming.ts` + `BridgeLoomWorldStreamer.h/.cpp` — Chunk streaming, interest management
- **5.3**: `pixel-streaming.ts` — WebRTC proxy, render instance pooling, quality adaptation

## Phase 6: COMPLETE ✅

All 4 sub-phases implemented:
- **6.1**: `lib.rs` expanded — Wildcard subscriptions, batch publish, backpressure detection
- **6.2**: `load-scenarios.ts` — k6 framework with 7 scenarios, 5 behavior profiles
- **6.3**: `multi-region.yml` — Istio mesh, HPA 3-24 replicas, PDB, circuit breaking
- **6.4**: `timescale-store.ts` — Hypertables, compression policies, continuous aggregates

## Phase 7: COMPLETE ✅

All 4 sub-phases implemented:
- **7.1**: `world_gen_automation.py` — Terrain, biomes, settlements, resources, batch generation
- **7.2**: `npc_tier3_llm.py` — 8 archetypes, context injection, content filtering, memory
- **7.3**: `loom-dashboard.json` — 15-panel Grafana dashboard (players, economy, infra)
- **7.4**: `foundation-archive.ts` — Snapshots, diffs, chronicle entries, dynasty legacy

---

## Phase 4-7: COMPLETE ✅

All 16 sub-phases implemented:

- **Phase 4.1**: `nakama-client.ts` — HTTP REST adapter (auth, presence, matchmaking, leaderboards, storage, friends)
- **Phase 4.2**: `sync-protocol.ts` — Binary WebSocket frame protocol (15-byte header, delta compression, sequence tracking, EWMA latency)
- **Phase 4.3**: `character-creation.ts` — 5 archetypes, starting KALON, starter items, dynasty founding
- **Phase 4.4**: `input-validation.ts` — Anti-cheat (speed hack, teleport, rapid-fire, replay detection, violation scoring)
- **Phase 5.1**: `BridgeLoomRenderer.h/.cpp` — UE5 time-of-day, weather, LOD bias, material parameters
- **Phase 5.2**: `world-streaming.ts` + `BridgeLoomWorldStreamer.h/.cpp` — Chunk streaming with interest management
- **Phase 5.3**: `pixel-streaming.ts` — WebRTC proxy, render instance pooling, quality adaptation
- **Phase 6.1**: `lib.rs` expanded — Wildcard subscriptions, batch publish, backpressure detection
- **Phase 6.2**: `load-scenarios.ts` — k6 framework with 7 scenarios (smoke → soak), 5 behavior profiles
- **Phase 6.3**: `multi-region.yml` — Istio mesh, HPA, PDB, circuit breaking, network policies
- **Phase 6.4**: `timescale-store.ts` — Hypertables, compression policies, continuous aggregates
- **Phase 7.1**: `world_gen_automation.py` — Terrain, biomes, settlements, resources, batch generation
- **Phase 7.2**: `npc_tier3_llm.py` — 8 archetypes, context injection, content filtering, conversation memory
- **Phase 7.3**: `loom-dashboard.json` — 15-panel Grafana dashboard (players, economy, infra)
- **Phase 7.4**: `foundation-archive.ts` — Snapshots, incremental diffs, chronicle entries, dynasty legacy

---

## Phase 8: Make It Social (Wave 37-40)

From solo play to living communities. Dynasty alliances, assemblies, and inter-world politics become real.

### 8.1 Real-Time Chat & Voice Infrastructure
**Priority**: P0 — Players need to communicate  
**Fabric**: selvage + nakama-fabric  
**Depends on**: Phase 4.2 (sync protocol)  

- [x] Text chat channels: world-local, dynasty, assembly, whisper, trade, global → `selvage/src/chat-channel-manager.ts`
- [x] Chat moderation pipeline: profanity filter → toxicity ML classifier → human review queue → `selvage/src/chat-moderation.ts`
- [x] Voice chat integration: WebRTC rooms per world zone (proximity-based), dynasty, party → `selvage/src/voice-chat-rooms.ts`
- [x] Voice-to-text transcription for accessibility (whisper model via shuttle workflows) → `shuttle/src/voice-transcription.ts`
- [x] Chat history persistence in archive (searchable, moderator-accessible) → `archive/src/chat-archive.ts`
- [x] Emoji/reaction system with custom dynasty-crafted emotes → `chat-channel-manager.ts` addReaction
- [x] Message rate limiting: 10 msg/s per player, escalating cooldowns → `chat-channel-manager.ts` rate limiter
- [x] Cross-world messaging relay for allied dynasties → `nakama-fabric/src/cross-world-messaging.ts`

### 8.2 Dynasty Alliance & Diplomacy System
**Priority**: P0 — Core social loop  
**Fabric**: nakama-fabric + loom-core  
**Depends on**: 8.1  

- [x] Alliance formation: proposal → vote → ratification workflow → `nakama-fabric/src/alliance-engine.ts` (pre-existing)
- [x] Alliance tiers: non-aggression, trade pact, mutual defense, full union → `nakama-fabric/src/diplomacy-engine.ts` (pre-existing)
- [x] Treaty negotiation interface: configurable terms (tribute %, territory, trade routes) → `nakama-fabric/src/treaty-engine.ts` (pre-existing)
- [x] Alliance chat channels and shared dynasty portfolios (read-only view) → `nakama-fabric/src/alliance-chat.ts`
- [x] War declaration protocol: formal declaration → 24h preparation → combat rules → `nakama-fabric/src/war-engine.ts`
- [x] Peace negotiation: armistice terms, reparations, territory concessions → `war-engine.ts` proposePeace/acceptPeace
- [x] Betrayal mechanics: broken treaties have KALON penalties + Remembrance records → `war-engine.ts` processBetrayal
- [x] Alliance leaderboard: combined dynasty influence rankings → `nakama-fabric/src/alliance-leaderboard.ts`

### 8.3 Assembly Governance — Live Voting & Legislation
**Priority**: P0 — Player agency  
**Fabric**: loom-core + nakama-fabric  
**Depends on**: Phase 4.3 (player features)  

- [x] Real-time proposal submission (typed: economic, territorial, social, constitutional) → `nakama-fabric/src/assembly.ts` (pre-existing)
- [x] Debate phase: timed discussion period with structured arguments → `nakama-fabric/src/governance-engine.ts` openDebate
- [x] Voting engine: weighted by estate value, reputation, assembly role → `assembly.ts` + `governance-engine.ts`
- [x] Legislation execution: approved laws automatically modify world parameters → `governance-engine.ts` enactLegislation
- [x] Judicial system: disputes, appeals, arbitration panels → `governance-engine.ts` fileDispute/ruleOnDispute/appealDispute
- [x] Election campaigns: candidate registration, platform statements, voting → `governance-engine.ts` callElection/registerCandidate
- [x] Constitutional amendments: supermajority requirements, ratification period → `nakama-fabric/src/constitutional-amendment.ts`
- [x] Assembly session scheduling: weekly cycles, emergency sessions → `governance-engine.ts` startSession

### 8.4 Player-Driven Events & Festivals
**Priority**: P1 — Emergent storytelling  
**Fabric**: shuttle + loom-core  
**Depends on**: 8.2, 8.3  

- [x] Event proposal system: players submit event plans (festivals, tournaments, expeditions) → `loom-core/src/player-event-engine.ts`
- [x] NPC participation: Tier 3 NPCs attend and react to player events → `player-event-engine.ts` EventNotificationPort
- [x] Event arena system: instanced competitive spaces with spectator mode → `nakama-fabric/src/event-arena.ts`
- [x] Tournament brackets: single/double elimination, Swiss, round robin → `player-event-engine.ts` createTournament
- [x] Festival economy boost: temporary trade bonuses during celebrations → `player-event-engine.ts` economyBoosts
- [x] Remembrance event recording: milestone events become permanent history → `player-event-engine.ts` EventRemembrancePort
- [x] Cross-world event broadcasting via Foundation Archive feeds → `selvage/src/cross-world-broadcast.ts`

---

## Phase 9: Make It Beautiful (Wave 41-44)

Visual and audio systems that create genuine atmosphere.

### 9.1 Dynamic Audio System
**Priority**: P0 — Immersion  
**Fabric**: bridge-loom-ue5 + loom-core  
**Depends on**: Phase 5.1 (UE5 renderer)  

- [x] Ambient soundscapes per biome (forest, desert, ocean, cave, city) with smooth transitions
- [x] Dynamic music engine: mood-reactive composition (combat, exploration, trade, ceremony)
- [x] NPC speech synthesis: TTS for Tier 3 NPCs (voice style per archetype) → `shuttle/src/npc-speech-synthesis.ts`
- [x] Weather audio: rain, wind, thunder, snow with spatial positioning
- [x] Economy audio cues: market crash klaxon, trade completion chime, KALON milestone
- [x] Estate ambiance: activity-based sounds (crafting, farming, construction)
- [x] Silfen Weave transit soundscape: otherworldly corridor audio progression
- [x] Spatial audio: 3D positional with HRTF for headphone users
- [x] Audio engine: `createAudioEngine()` in loom-core/audio-engine.ts

### 9.2 Advanced Visual Effects
**Priority**: P1 — Polish  
**Fabric**: bridge-loom-ue5  
**Depends on**: Phase 5.1  

- [x] Lumen lighting: time-compressed day/night (1 IRL hour = 1 game day) → `bridge-loom-ue5/Public/BridgeLoomLumen.h`, `bridge-loom-ue5/Private/BridgeLoomLumen.cpp`
- [x] Niagara particle systems: Lattice energy flows, Weave transit FX, spell effects → `bridge-loom-ue5/Private/BridgeLoomNiagara.cpp`
- [x] Destructible terrain: Chaos Physics for siege events, natural disasters → `bridge-loom-ue5/Private/BridgeLoomChaosPhysics.cpp`
- [x] Water systems: ocean simulation, rivers with flow, waterfalls, flooding events → `bridge-loom-ue5/Private/BridgeLoomWater.cpp`
- [x] Volumetric clouds driven by loom-core weather parameters → `BridgeLoomLumen.cpp` (SetWeatherClouds, VolumetricCloudComponent params)
- [x] Material library: 200+ PBR materials (stone, wood, metal, fabric, crystal) → `loom-core/src/visual-effects-system.ts`
- [x] Seasonal visual transitions: foliage color, snow accumulation, bloom cycles → `visual-effects-system.ts`
- [x] Post-processing per world: unique color grading, fog, exposure per biome → `bridge-loom-ue5/Private/BridgeLoomPostProcess.cpp`

### 9.3 MetaHuman NPC System
**Priority**: P0 — NPCs feel real  
**Fabric**: bridge-loom-ue5 + shuttle  
**Depends on**: 9.2, Phase 3.4 (Shuttle AI)  

- [x] MetaHuman component with ARKit 52 blend shapes (BridgeLoomMetaHuman.h/.cpp)
- [x] Emotion preset system: 12 emotions (happy, sad, angry, surprised, curious, stern, etc.)
- [x] LOD management: Full (<6m), Medium (6-14m), Low (14-20m), Crowd (20m+)
- [x] Gaze/eye tracking: NPCs look at player and points of interest
- [x] Viseme lip sync from Loom speech data
- [x] RigLogic muscle simulation for Hero (Tier 4) NPCs
- [x] Groom strand-based hair for Hero NPCs, card-based for Tier 3
- [x] FlatBuffers FacialPose schema with 52 blend shapes (loom-bridge.fbs)
- [x] gRPC MetaHuman fields in negotiate + facial_pose stream (loom-bridge.proto)
- [x] Contract: FacialPoseState in visual-state.ts, MetaHumanCapabilities in capabilities.ts
- [x] MetaHuman preset library: 50+ base presets (age, ethnicity, archetype diversity) → `bridge-loom-ue5/Public/BridgeLoomMetaHumanLibrary.h`, `...Library.cpp`
- [x] Dynamic MetaHuman creation: runtime parameter blending for unique NPCs → `BridgeLoomMetaHumanLibrary::CreateDynamicBlend`
- [x] NPC body animation: full-body IK, gesture system, idle personality animations → `bridge-loom-ue5/Public/BridgeLoomNPCAnimation.h`, `...Animation.cpp`
- [x] Performance profiling: GPU budget enforcement (max 5 Full, 20 Medium, 100 Low) → `BridgeLoomMetaHumanLibrary::EnforceGPUBudget` (0.5Hz ticker)
- [x] MetaHuman streaming: progressive load (skeleton → mesh → groom → RigLogic) → `BridgeLoomMetaHumanLibrary::BeginStreamingPreset` (FStreamableManager)
- [x] LiveLink integration: real-time mocap for cinematics and dev tools → `loom-core/src/metahuman-system.ts`

### 9.4 Mass Entity Rendering
**Priority**: P0 — World feels alive  
**Fabric**: bridge-loom-ue5  
**Depends on**: 9.2  

- [x] UE5 Mass Entity Framework integration for NPC crowds (100K+ per world) → `bridge-loom-ue5/Private/BridgeLoomMassEntity.cpp`
- [x] NPC LOD tiers: T1 (full mesh within 50m), T2 (simplified 50-200m), T3 (dots/silhouettes 200m+) → `BridgeLoomMetaHumanLibrary::TickBudgetEnforcement` (distance-sorted)
- [x] Animation instancing: shared animation blueprints for crowd NPCs → `BridgeLoomNPCAnimation::SetAnimationInstancing` (OnlyTickPoseWhenRendered mode)
- [x] Crowd simulation: pathfinding, idle behaviors, market activity, combat formations → `bridge-loom-ue5/Private/BridgeLoomCrowdSim.cpp`
- [x] Wildlife system: herds, flocks, predator-prey with procedural animation → `bridge-loom-ue5/Private/BridgeLoomVegetation.cpp`
- [x] Vegetation rendering: SpeedTree integration, interactive flora, farming visuals → `bridge-loom-ue5/Private/BridgeLoomVegetation.cpp`
- [x] Building construction visualization: progressive build stages, scaffolding → `bridge-loom-ue5/Public/BridgeLoomBuildingStage.h`, `...BuildingStage.cpp`

### 9.5 UI/UX System
**Priority**: P0 — Player interface  
**Fabric**: bridge-loom-ue5 + selvage  
**Depends on**: Phase 5.1  

- [x] CommonUI framework: unified input (gamepad, keyboard+mouse, touch)
- [x] HUD system: health, KALON balance, minimap, compass, quest tracker
- [x] Inventory UI: grid-based, drag-and-drop, tooltip system
- [x] Trade interface: marketplace browse, order book, price history graphs
- [x] Assembly governance UI: proposal browser, vote interface, results display
- [x] Dynasty management panel: members, portfolio, alliances, history
- [x] World map: zoomable, fog-of-war, points of interest, survey data
- [x] Settings: graphics, audio, controls, accessibility, privacy
- [x] UI state engine: `createUiStateEngine()` in loom-core/ui-state-engine.ts

---

## Phase 10: Make It Resilient (Wave 45-48)

Production hardening. Nothing breaks, everything recovers.

### 10.1 Chaos Engineering
**Priority**: P0 — Survive failure  
**Fabric**: inspector  
**Depends on**: Phase 7.3 (monitoring)  

- [x] Scheduled failure injection: random pod kills, network partitions, disk full
- [x] Database failover drills: primary → replica promotion under load
- [x] Redis cluster node failure and recovery validation
- [x] Nakama backend failure: graceful degradation to cached sessions
- [x] World server crash recovery: state restoration from last snapshot (< 30s data loss)
- [x] Region failure simulation: full region outage, player migration to backup
- [x] Temporal workflow recovery: mid-execution failure and replay
- [x] Automated runbook execution: PagerDuty → alert → auto-remediation → escalation
- [x] Chaos engine: `createChaosEngine()` in inspector/chaos-engine.ts

### 10.2 Data Integrity & Backup
**Priority**: P0 — Permanence Covenant compliance  
**Fabric**: archive  
**Depends on**: Phase 7.4 (Foundation Archive)  

- [x] Continuous WAL archiving to S3/GCS (point-in-time recovery any 1-sec window)
- [x] Cross-region PostgreSQL streaming replication (async, < 1s lag)
- [x] Daily full backup verification: restore to test cluster, validate hash chains
- [x] Foundation Archive geo-replication: 3 providers, 6 copies, 2 continents
- [x] Remembrance integrity: hourly hash chain verification, anomaly alerting
- [x] KALON ledger audit: daily balance reconciliation across all worlds
- [x] Immutable audit log: every admin action recorded and cryptographically chained
- [x] Disaster recovery drill: quarterly, full-state restore from Foundation Archive
- [x] Data integrity engine: `createDataIntegrityEngine()` in archive/data-integrity.ts

### 10.3 Security Hardening
**Priority**: P0 — Required for public launch  
**Fabric**: dye-house + selvage  
**Depends on**: Phase 4.4 (anti-cheat)  

- [x] Zod schema validation on every selvage message boundary → `dye-house/src/security-hardening.ts`
- [x] Content Security Policy headers on all HTTP responses → `dye-house/src/security-hardening.ts`
- [x] DDoS protection: rate limiting at Cloudflare/Fastly edge + internal backpressure → `dye-house/src/security-hardening.ts`
- [x] JWT rotation and revocation infrastructure (short-lived tokens + refresh flow) → `dye-house/src/security-hardening.ts`
- [x] API key management: per-client keys, scopes, rotation schedule → `dye-house/src/security-hardening.ts`
- [x] Vulnerability scanning: Snyk/Trivy in CI pipeline, weekly full scans → `dye-house/src/security-hardening.ts`
- [ ] Penetration testing: contracted pen test before Open Beta
- [ ] Bug bounty program setup (HackerOne/Bugcrowd)

### 10.4 Compliance & Legal
**Priority**: P0 — Legal requirement  
**Fabric**: dye-house + archive  

- [x] GDPR right-to-erasure pipeline: pseudonymize player data within 30 days → `dye-house/src/compliance-engine.ts`
- [x] CCPA data access API: player can download all their data (JSON export) → `dye-house/src/compliance-engine.ts`
- [x] COPPA compliance: age gate, parental consent system, restricted features → `dye-house/src/compliance-engine.ts`
- [x] Loot box transparency: probability disclosure, spending limits → `dye-house/src/compliance-engine.ts`
- [ ] Permanence Covenant smart contract deployment (Ethereum L2)
- [ ] Terms of Service v1.0 legal review and publication
- [x] Privacy policy per jurisdiction (EU, US, JP, KR, BR) → `dye-house/src/compliance-engine.ts`
- [ ] Data processing agreements with all third-party providers

---

## Phase 11: Make It Intelligent (Wave 49-52)

NPC AI system from impressive to groundbreaking.

### 11.1 NPC Tier 4 — Emergent Planning
**Priority**: P0 — Core differentiator  
**Fabric**: shuttle + pipelines  
**Depends on**: Phase 7.2 (Tier 3 LLM)  

- [x] Multi-step goal planner: NPCs create and pursue long-term objectives (weeks/months) → `shuttle/src/npc-emergent-intelligence.ts`
- [x] Theory of mind: NPCs model player intentions, anticipate actions, adapt → `shuttle/src/npc-emergent-intelligence.ts`
- [x] Inter-NPC negotiation: autonomous trade deals, alliance formation, conflict resolution → `shuttle/src/npc-emergent-intelligence.ts`
- [x] NPC memory consolidation: summarize conversations into personality-shaping memories → `shuttle/src/npc-emergent-intelligence.ts`
- [x] Emotional state machine: mood shifts based on events, relationships, world state → `shuttle/src/npc-emergent-intelligence.ts`
- [x] Budget-aware model routing: Tier 4 for elite NPCs only (< 500/world) → `shuttle/src/npc-emergent-intelligence.ts`
- [x] NPC reputation tracking: players rate NPC quality, feedback loops to improve → `shuttle/src/npc-emergent-intelligence.ts`
- [x] NPC creation pipeline: personality specification → trained behavior → deployed → `shuttle/src/npc-creation-pipeline.ts`

### 11.2 Procedural Quest Generation
**Priority**: P0 — Infinite content  
**Fabric**: shuttle + loom-core  
**Depends on**: 11.1  

- [x] Quest template engine: parameterized narrative structures (fetch, escort, investigate, defend) → `shuttle/src/procedural-quest-generator.ts`
- [x] World state-reactive quests: quests respond to economy, politics, weather, war → `shuttle/src/procedural-quest-generator.ts`
- [x] Multi-player quest chains: cooperative objectives spanning multiple sessions → `shuttle/src/procedural-quest-generator.ts`
- [x] Quest quality evaluation: automated scoring (coherence, difficulty, reward balance) → `shuttle/src/procedural-quest-generator.ts`
- [x] NPC-originated quests: Tier 4 NPCs generate quests from their own goals → `shuttle/src/procedural-quest-generator.ts`
- [x] Cross-world quest arcs: Silfen Weave exploration missions linking multiple worlds → `shuttle/src/procedural-quest-generator.ts`
- [x] Player quest rating: thumbs up/down → ML feedback loop for generation quality → `shuttle/src/procedural-quest-generator.ts`
- [x] Quest economy integration: quest rewards calibrated to world economic state → `shuttle/src/procedural-quest-generator.ts`

### 11.3 Player Behavior Analytics
**Priority**: P1 — Retention  
**Fabric**: inspector + pipelines  
**Depends on**: Phase 6.4 (TimescaleDB)  

- [x] Player journey funnel: registration → tutorial → first trade → first assembly → 30-day retention → `inspector/src/player-analytics.ts`
- [x] Churn prediction model: identify at-risk players, trigger retention interventions → `inspector/src/player-analytics.ts`
- [x] Play style clustering: explorer/builder/trader/socializer with dynamic re-classification → `inspector/src/player-analytics.ts`
- [x] Session analytics: heatmaps (where players spend time), engagement curves → `inspector/src/player-analytics.ts`
- [x] Economy analytics: KALON velocity, wealth distribution Gini coefficient, inflation tracking → `inspector/src/player-analytics.ts`
- [x] A/B testing framework: feature flags, cohort assignment, metric comparison → `inspector/src/player-analytics.ts`
- [x] Player satisfaction surveys: in-game NPS, feature-specific feedback → `inspector/src/player-analytics.ts`
- [x] Dynamic difficulty: adjust world parameters based on player skill distribution → `inspector/src/player-analytics.ts`

### 11.4 Content Moderation AI
**Priority**: P0 — Trust & Safety  
**Fabric**: dye-house + shuttle  
**Depends on**: 8.1 (chat)  

- [x] Real-time chat toxicity classification (transformer model, < 50ms inference) → `dye-house/src/content-moderation.ts`
- [x] Image/screenshot moderation: NSFW detection on player-uploaded content → `dye-house/src/content-moderation.ts`
- [x] Behavior pattern detection: griefing, harassment, market manipulation → `dye-house/src/content-moderation.ts`
- [x] Automated action escalation: warn → mute → suspend → ban with appeal flow → `dye-house/src/content-moderation.ts`
- [x] Player reporting system with structured categories and evidence collection → `dye-house/src/content-moderation.ts`
- [x] Moderator dashboard: queue management, player history, action audit trail → `dye-house/src/content-moderation.ts`
- [x] False positive monitoring: track appeal rates, improve classifier accuracy → `dye-house/src/content-moderation.ts`
- [x] Cultural context awareness: moderation rules per region/community standards → `dye-house/src/content-moderation.ts`

---

## Phase 12: Make It Expand (Wave 53-56)

World count doubles. New biomes, cultures, challenges.

### 12.1 World Expansion Pipeline
**Priority**: P0 — Content growth  
**Fabric**: pipelines + silfen-weave  
**Depends on**: Phase 7.1 (world gen automation)  

- [x] World template system: cultural templates (Nordic, Mediterranean, Jungle, Steppe, Archipelago) → `fabrics/silfen-weave/src/world-expansion.ts`
- [x] Automated world quality scoring: visual diversity, gameplay variety, performance metrics → `world-expansion.ts`
- [x] World review dashboard: generated worlds queued for human approval → `world-expansion.ts`
- [x] Seasonal world events: synchronized across all worlds (harvest, solstice, eclipse) → `world-expansion.ts`
- [x] World degradation: environmental consequences of player exploitation → `world-expansion.ts`
- [x] World death mechanics: irreversible collapse conditions, evacuation protocols → `world-expansion.ts`
- [x] New world discovery: Survey Corps missions unlock new worlds for colonization → `world-expansion.ts`
- [x] Scale target: 60 → 180 worlds (Year 1 roadmap) → `world-expansion.ts` (configurable targetWorldCount)

### 12.2 Silfen Weave Network Expansion
**Priority**: P0 — Interconnected galaxy  
**Fabric**: silfen-weave  
**Depends on**: 12.1  

- [x] Dynamic corridor network: new paths open based on player survey data → `fabrics/silfen-weave/src/weave-network.ts`
- [x] Corridor difficulty tiers: safe trade routes vs dangerous exploration paths → `weave-network.ts`
- [x] Wormhole stabilization missions: player cooperation to establish permanent links → `weave-network.ts`
- [x] Transit marketplace: trade goods during 3-minute Weave transit → `weave-network.ts`
- [x] Weave events: temporal anomalies, creature encounters, lost artifact discovery → `weave-network.ts`
- [x] Network visualization: galaxy-map UI showing all worlds + connections → `silfen-weave/src/network-visualizer.ts`
- [x] Cross-world economy balancing: price arbitrage, import/export regulations → `weave-network.ts`
- [x] Emergency transit: Alliance mutual defense rapid deployment corridors → `weave-network.ts`

### 12.3 Estate System Expansion
**Priority**: P1 — Player investment  
**Fabric**: loom-core + nakama-fabric  
**Depends on**: Phase 4.3  

- [x] Estate tiers: plot → homestead → manor → keep → citadel (upgrade paths) → `fabrics/loom-core/src/estate-system.ts`
- [x] Estate specialization: farming, mining, crafting, trading, military, research → `estate-system.ts`
- [x] Defense systems: walls, towers, guards, siege preparation → `estate-system.ts`
- [x] Estate workers: assignable NPCs with skill progression → `estate-system.ts`
- [x] Resource production chains: raw materials → processed goods → finished items → `estate-system.ts`
- [x] Estate marketplace: automated selling of produced goods → `estate-system.ts`
- [x] Dynasty estate networks: shared resource pools, coordinated production → `estate-system.ts`
- [x] Architectural styles per world culture (visual + gameplay effects) → `estate-system.ts`

### 12.4 Economy Maturation
**Priority**: P0 — Sustainable economy  
**Fabric**: nakama-fabric  
**Depends on**: Phase 6.4 (TimescaleDB analytics)  

- [x] Central bank AI: automated monetary policy (interest rates, KALON supply) → `fabrics/nakama-fabric/src/economy-maturation.ts`
- [x] Commodity futures: forward contracts on resources, price discovery → `economy-maturation.ts`
- [x] Insurance marketplace: player-created insurance products → `economy-maturation.ts`
- [x] Tax system automation: progressive rates, assembly-voted adjustments → `economy-maturation.ts`
- [x] Inter-world trade treaties: tariffs, quotas, free trade zones → `economy-maturation.ts`
- [x] Economic indicators dashboard: GDP per world, trade balance, employment rate → `economy-maturation.ts`
- [x] Recession/boom cycle management: automatic stimulus or austerity measures → `economy-maturation.ts`
- [x] Wealth redistribution: commons pool funding, public goods provision → `economy-maturation.ts`

---

## Phase 13: Make It Competitive (Wave 57-60)

PvP, tournaments, ranked play, and e-sports foundations.

### 13.1 Competitive PvP System
**Priority**: P0 — Player retention  
**Fabric**: loom-core + nakama-fabric  
**Depends on**: Phase 8.4 (events)  

- [x] Ranked ladder: ELO-based matchmaking, seasonal resets, division tiers → `fabrics/nakama-fabric/src/competitive-pvp.ts`
- [x] Arena system: 1v1, 2v2, 5v5, dynasty vs dynasty instanced combat → `competitive-pvp.ts`
- [x] Territory control: world zones contestable by dynasties (weekly capture cycles) → `competitive-pvp.ts`
- [x] Siege warfare: formal siege declarations, 48h preparation, timed battles → `competitive-pvp.ts`
- [x] War economy: military supply chains, mercenary contracts, war bonds → `competitive-pvp.ts`
- [x] Ceasefire enforcement: mechanical penalties for attacking during peace → `competitive-pvp.ts`
- [x] Combat replay system: store and replay fights for review/spectating → `competitive-pvp.ts`
- [x] Anti-smurfing: skill-based matchmaking with new account detection → `competitive-pvp.ts`

### 13.2 E-Sports Infrastructure
**Priority**: P1 — Revenue stream  
**Fabric**: bridge-loom-ue5 + selvage  
**Depends on**: 13.1, Phase 5.3 (Pixel Streaming)  

- [x] Spectator camera system: observer controls, auto-camera, picture-in-picture → `selvage/src/spectator-camera.ts`
- [x] Tournament platform: registration, brackets, scheduling, prizes (KALON + real) → `fabrics/selvage/src/esports-engine.ts`
- [x] Broadcast overlay: player stats, team info, live score, commentator tools → `esports-engine.ts`
- [x] VOD system: tournament recordings with indexing and highlights → `esports-engine.ts`
- [x] League management: seasons, divisions, promotion/relegation → `esports-engine.ts`
- [x] Casting tools: delayed broadcast (30s), fog-of-war for competitive integrity → `esports-engine.ts`
- [x] Stats API: public player/dynasty statistics for community sites → `esports-engine.ts`
- [x] Prize pool management: KALON escrow, conversion to real currency → `esports-engine.ts`

### 13.3 Guild System
**Priority**: P0 — Social stickiness  
**Fabric**: nakama-fabric  
**Depends on**: Phase 8.2 (alliances)  

- [x] Guild creation: charter, ranks (5 tiers), permissions matrix → `fabrics/nakama-fabric/src/guild-system.ts` (base)
- [x] Guild bank: shared KALON treasury, deposit/withdraw with audit trail → `fabrics/nakama-fabric/src/guild-expansion.ts`
- [x] Guild quests: cooperative objectives with shared rewards → `guild-expansion.ts`
- [x] Guild halls: persistent social spaces on estates (customizable) → `guild-expansion.ts`
- [x] Guild vs Guild events: scheduled battles, trade competitions, racing → `guild-expansion.ts`
- [x] Guild progression: XP, levels, unlocks (emblem, name color, bank slots) → `guild-expansion.ts`
- [x] Cross-dynasty guilds: organizations that span multiple dynasties → `guild-expansion.ts`
- [x] Guild recruitment board: searchable listings, application workflow → `guild-expansion.ts`

### 13.4 Achievement & Collection System
**Priority**: P1 — Completionist retention  
**Fabric**: loom-core + archive  
**Depends on**: Phase 4.3  

- [x] Achievement framework: progress tracking, unlock notifications, reward distribution → `fabrics/archive/src/achievement-engine.ts`
- [x] Achievement categories: exploration, economic, social, combat, governance, lore → `achievement-engine.ts`
- [x] Cosmetic rewards: unique visual effects, titles, estate decorations → `achievement-engine.ts`
- [x] Collection system: rare items, NPC relationships, world discoveries → `achievement-engine.ts`
- [x] Seasonal achievements: time-limited challenges, exclusive rewards → `achievement-engine.ts`
- [x] Dynasty achievements: collaborative dynasty milestones → `achievement-engine.ts`
- [x] Achievement showcase: player profile with displayed achievements → `achievement-engine.ts`
- [x] Remembrance integration: achievements become permanent historical records → `achievement-engine.ts`

---

## Phase 14: Make It Accessible (Wave 61-64)

Every player, every device, every ability level.

### 14.1 Mobile Client
**Priority**: P0 — 60% of gaming audience  
**Fabric**: bridge-loom-ue5  
**Depends on**: Phase 5.3 (Pixel Streaming)  

- [x] Native mobile client: iOS + Android (UE5 cross-compile) → `loom-core/src/mobile-client-system.ts` (device profiling)
- [x] Mobile-optimized scalability profile (< 3GB RAM, GPU Tier Low/Mobile) → `bridge-loom-ue5/Private/BridgeLoomMobile.cpp`
- [x] Touch controls: virtual joystick, context-sensitive action buttons → `bridge-loom-ue5/Private/BridgeLoomMobile.cpp`
- [x] Mobile-specific UI: larger touch targets, simplified menus → `mobile-client-system.ts` computeMobileUiConfig()
- [x] Battery optimization: frame rate cap, background mode, push notifications → `bridge-loom-ue5/Private/BridgeLoomMobile.cpp`
- [x] Cloud gaming fallback: Pixel Streaming for devices below minimum spec → `mobile-client-system.ts` createCloudGamingSession()
- [x] Offline mode: estate management, inventory, chat (sync on reconnect) → `mobile-client-system.ts` createOfflineStatePacket()
- [x] Cross-platform play: mobile ↔ PC with input-aware matchmaking → `mobile-client-system.ts` createCrossPlatformMatch()

### 14.2 Accessibility Features
**Priority**: P0 — Inclusive design  
**Fabric**: bridge-loom-ue5 + selvage  

- [x] Screen reader support: UE5 Accessibility Framework integration → `bridge-loom-ue5/Private/BridgeLoomAccessibility.cpp`
- [x] Colorblind modes: protanopia, deuteranopia, tritanopia presets → `bridge-loom-ue5/Private/BridgeLoomAccessibility.cpp`
- [x] Text scaling: 50%-200% UI scale, resizable chat fonts → `loom-core/src/accessibility-system.ts` computeTextScaleProfile()
- [x] High contrast mode: enhanced outlines, simplified backgrounds → `accessibility-system.ts` computeHighContrastProfile()
- [x] Audio descriptions: narrate visual events for vision-impaired players → `bridge-loom-ue5/Private/BridgeLoomAccessibility.cpp`
- [x] Subtitles + closed captions: NPC dialogue, environmental sounds → `bridge-loom-ue5/Private/BridgeLoomAccessibility.cpp`
- [x] One-handed control schemes: full gameplay with reduced inputs → `bridge-loom-ue5/Private/BridgeLoomAccessibility.cpp`
- [x] Cognitive accessibility: simplified UI mode, extended timers, quest summaries → `accessibility-system.ts` computeCognitiveAccessProfile()

### 14.3 Localization System
**Priority**: P0 — Global audience  
**Fabric**: selvage + shuttle  
**Depends on**: Phase 8.1 (chat)  

- [x] i18n framework: ICU message format, pluralization, date/number formatting → `fabrics/selvage/src/localization-engine.ts`
- [x] 12 languages at launch: EN, ES, PT, FR, DE, IT, JP, KO, ZH-CN, ZH-TW, RU, AR → `localization-engine.ts`
- [x] Dynamic NPC dialogue translation: LLM-powered real-time translation → `localization-engine.ts`
- [x] Community translation platform: crowdsourced translations with review workflow → `localization-engine.ts`
- [x] Cultural adaptation: region-specific content, visual style variations → `localization-engine.ts`
- [x] Right-to-left UI support for Arabic → `localization-engine.ts`
- [x] Voice localization: NPC speech synthesis per language → `localization-engine.ts`
- [x] Remembrance translation: historical records accessible in all languages → `localization-engine.ts`

### 14.4 Performance Optimization
**Priority**: P0 — Low-end hardware  
**Fabric**: bridge-loom-ue5 + loom-core  
**Depends on**: Phase 5.2 (world streaming)  

- [x] Minimum spec validation: GTX 1060 / RX 580, 8GB RAM, SSD preferred → `fabrics/loom-core/src/perf-optimization.ts`
- [x] Scalability benchmarking: framerate targets per quality tier (Low=30fps, High=60fps, Ultra=120fps) → `perf-optimization.ts`
- [x] Memory profiling: per-world memory budgets, streaming pool optimization → `perf-optimization.ts`
- [x] Network optimization: adaptive tick rate (10-30Hz based on connection quality) → `perf-optimization.ts`
- [x] Asset optimization: texture streaming, mesh LOD pipeline, shader compilation cache → `loom-core/src/asset-optimization.ts`
- [x] Boot time optimization: < 30s from launch to world (shader pre-compilation) → `perf-optimization.ts`
- [x] Steam Deck verified: controller layout, 800p optimization, battery target 2h+ → `asset-optimization.ts` computeSteamDeckProfile()
- [x] Cloud streaming integration: GeForce NOW, Xbox Cloud Gaming certification → `asset-optimization.ts` computeCloudStreamingCert()

---

## Phase 15: Make It Persistent (Wave 65-68)

The Permanence Engine. What happens, stays happened.

### 15.1 Witness Protocol — On-Chain Registry
**Priority**: P0 — Core promise  
**Fabric**: nakama-fabric + archive  
**Depends on**: Phase 10.2 (data integrity)  

- [x] MARKS registry smart contract (Ethereum L2 — Arbitrum/Base) → `witness-protocol.ts` L2 chain adapter abstraction
- [x] Dynasty registration: on-chain founding record (name, founder, timestamp) → `witness-protocol.ts` registerDynastyFounding()
- [x] World milestone registration: first settlement, population milestones, destruction → `witness-protocol.ts` registerWorldMilestone()
- [x] Player milestone hashing: achievement hash published quarterly → `witness-protocol.ts` generatePlayerDigest()
- [x] Gas optimization: batch registration (< $0.10 per dynasty record) → `witness-protocol.ts` submitBatch() with auto gas budget
- [x] Chain explorer integration: public verification of all registered records → `witness-protocol.ts` getExplorerUrl()
- [x] Cross-chain bridge: future-proof for chain migration → `witness-protocol.ts` ChainAdapterPort abstraction
- [x] Ceremony system: Remembrance events generate on-chain attestations → `witness-protocol.ts` registerCeremony()

### 15.2 Remembrance System — Deep Archive
**Priority**: P0 — 200-year promise  
**Fabric**: archive  
**Depends on**: Phase 7.4 (Foundation Archive)  

- [x] Remembrance compression: 10-year event history → narrative summary → `remembrance-system.ts` compressDecade()
- [x] Dynasty genealogy tree: rendered visual lineage with key events → `remembrance-system.ts` generateDynastyTree()
- [x] World history timeline: interactive scrollable history per world → `remembrance-system.ts` generateWorldTimeline()
- [x] NPC biographies: procedurally generated life stories from memory logs → `remembrance-system.ts` generateNpcBiography()
- [x] Search engine: full-text search across all Remembrance entries → `remembrance-system.ts` search()
- [x] Public API: read-only REST API for community historians/researchers → `archive/src/public-api.ts`
- [x] Archive browser: web-based exploration of game history → `archive/src/archive-browser.ts`
- [x] Data format versioning: schema evolution over 200 years (Avro/Protobuf) → `remembrance-system.ts` migrateFormat()

### 15.3 Dynasty Legacy System
**Priority**: P1 — Generational play  
**Fabric**: nakama-fabric + archive  
**Depends on**: 15.2  

- [x] Character death and succession: heir selection, inheritance rules → `dynasty-legacy.ts` processCharacterDeath()
- [x] Legacy traits: personality/skill traits inherited from ancestors → `dynasty-legacy.ts` createCharacter() trait inheritance
- [x] Heirloom items: named items that gain history and power across generations → `dynasty-legacy.ts` createHeirloom() / passHeirloom()
- [x] Dynasty reputation compound interest: reputation builds over generations → `dynasty-legacy.ts` compoundReputation()
- [x] Ancestral knowledge: access to forebears' discovered recipes, maps, contacts → `dynasty-legacy.ts` addAncestralKnowledge()
- [x] Legacy quests: quests triggered by ancestor actions (revenge, treasure, prophecy) → `dynasty-legacy.ts` generateLegacyQuests()
- [x] Dynasty chronicle: auto-generated narrative of dynasty history → `dynasty-legacy.ts` generateDynastyChronicle()
- [x] Heritage buildings: estate structures that persist across character generations → `dynasty-legacy.ts` addHeritageBuilding()

### 15.4 Time Compression Engine
**Priority**: P1 — Core mechanic  
**Fabric**: loom-core  
**Depends on**: Phase 7.1 (world gen)  

- [x] Time acceleration: configurable compression ratio (currently 1h IRL = 1 game day) → `time-compression.ts` initWorldClock() ratio 1-1000
- [x] Season system: 4 seasons × 7 days = 28 IRL hours per game year → `time-compression.ts` getCurrentSeason()
- [x] Historical era tracking: world ages, technological epochs, cultural periods → `time-compression.ts` getCurrentEra() / transitionEra()
- [x] Future projection: AI simulates "what if nobody logs in" (world continues) → `time-compression.ts` projectFuture() via FutureSimulatorPort
- [x] Time-lapse replay: watch world history unfold in accelerated playback → `time-compression.ts` recordTimelapse()
- [x] Calendar system: in-game calendar with holidays, harvest dates, political terms → `time-compression.ts` addCalendarEvent()
- [x] Aging NPCs: visual aging, career progression, retirement, death → `time-compression.ts` computeNpcAge() (logic; visual aging is UE5)
- [x] Environmental change over time: deforestation, urbanization, pollution, restoration → `time-compression.ts` trackEnvironmentalChange()

---

## Phase 16: Make It Evolve (Wave 69-72)

Self-improving systems. The world gets smarter the longer it runs.

### 16.1 Adaptive World Systems
**Priority**: P0 — Living worlds  
**Fabric**: loom-core + pipelines  
**Depends on**: Phase 11.3 (analytics)  

- [x] Player density-responsive spawning: more content in popular areas → `adaptive-world.ts` updateZoneDensity()
- [x] Resource regeneration tuning: adjust based on extraction rates → `adaptive-world.ts` adjustResourceRegen()
- [x] NPC population dynamics: birth rates, migration, profession shifts → `adaptive-world.ts` computePopulationDynamics()
- [x] World event generator: wars, plagues, golden ages triggered by aggregate behavior → `adaptive-world.ts` evaluateWorldEvents()
- [x] Climate change simulation: player industry affects weather patterns over years → `adaptive-world.ts` updateClimate()
- [x] Trade route emergence: frequently traveled paths become roads, then highways → `adaptive-world.ts` updateTradeRoutes()
- [x] Abandoned area decay: unused zones revert to wilderness over in-game years → `adaptive-world.ts` processDecay()
- [x] Self-balancing economy: ML-driven parameter adjustment to maintain healthy metrics → `adaptive-world.ts` balanceEconomy()

### 16.2 ML Model Continuous Improvement
**Priority**: P1 — Technical excellence  
**Fabric**: pipelines  
**Depends on**: Phase 11.1 (Tier 4 NPC)  

- [x] NPC behavior feedback loop: player engagement → training data → improved models → `ml-pipeline.ts` recordFeedback()
- [x] A/B model deployment: canary rollout of improved NPC models per world → `ml-pipeline.ts` deployCanary() / evaluateCanary()
- [x] Model performance monitoring: quality score, latency, cost per interaction → `ml-pipeline.ts` collectMetrics()
- [x] Fine-tuning pipeline: domain-specific LLM fine-tuning on game dialogue corpus → `ml-pipeline.ts` triggerFineTune()
- [x] Distillation: compress Tier 4 quality into smaller Tier 3 models → `ml-pipeline.ts` triggerDistillation()
- [x] Local model hosting: Ollama/vLLM for latency-sensitive NPC interactions → `ml-pipeline.ts` registerLocalHost()
- [x] Player feedback integration: thumbs up/down on NPC responses → RLHF → `ml-pipeline.ts` recordFeedback()
- [x] Automated regression testing: NPC behavior quality benchmarks per deploy → `ml-pipeline.ts` runRegressionSuite()

### 16.3 Plugin Architecture
**Priority**: P1 — Extensibility  
**Fabric**: loom-core  
**Depends on**: Core architecture  

- [x] Game Feature Plugin system: modular feature packs (combat, crafting, governance) → `plugin-system.ts` registerPlugin()
- [x] Plugin dependency resolution: load order, conflict detection, version constraints → `plugin-system.ts` resolveDependencies()
- [x] Hot-reload for plugins: update game logic without server restart → `plugin-system.ts` hotReload()
- [x] Plugin marketplace: community-created plugins (audited, signed) → `plugin-system.ts` publishToMarketplace()
- [x] Plugin sandboxing: isolated execution environment, resource limits → `plugin-system.ts` executePluginAction() via SandboxPort
- [x] API versioning: stable plugin API with backward compatibility guarantees → `plugin-system.ts` checkApiCompatibility()
- [x] Plugin telemetry: per-plugin performance metrics, error rates → `plugin-system.ts` getPluginTelemetry()
- [x] Documentation generator: auto-generate API docs from plugin interfaces → `plugin-system.ts` generateApiDocs()

### 16.4 Developer Experience
**Priority**: P1 — Community growth  
**Fabric**: tools  
**Depends on**: 16.3  

- [x] Modding SDK: TypeScript API for world event hooks, custom NPCs, quests → `tools/modding-sdk/index.ts`
- [x] World editor: web-based tool for placing entities, defining zones, triggering events
- [x] NPC personality editor: GUI for configuring NPC archetypes and behaviors
- [x] Economy simulator: sandbox tool for testing economic parameter changes → `tools/economy-simulator/index.ts`
- [x] DevPortal: documentation site, API explorer, community forums → `tools/dev-portal/index.ts`
- [x] Sample plugins: 5 example plugins with full documentation → `tools/modding-sdk/samples/`
- [x] CI pipeline for community plugins: automated testing, security scanning
- [x] Discord bot: development status, API status, world stats → `tools/discord-bot/index.ts`

---

## Phase 17: Make It Eternal (Wave 73-76)

The 200-year architecture. Technology changes; the world endures.

### 17.1 Engine Abstraction
**Priority**: P1 — Longevity  
**Fabric**: contracts/bridge-loom  
**Depends on**: All previous phases  

- [x] Rendering engine abstraction: UE5 is a plugin, can be replaced → `loom-core/src/engine-abstraction.ts`
- [x] Bridge Loom interface versioning: v1 contract locked, v2 development
- [x] Unity adapter proof-of-concept: validate engine portability
- [x] Godot adapter exploration: open-source rendering option
- [x] Custom engine evaluation: purpose-built renderer for 600+ worlds → `engine-abstraction.ts` evaluateEngine()
- [x] Engine migration plan: < 6 month swap for any rendering engine → `engine-abstraction.ts` createMigrationPlan()
- [x] Backward compatibility: old clients supported during transition period → `engine-abstraction.ts` computeCompatibility()
- [x] Performance benchmarks per engine: standardized scene for comparison → `engine-abstraction.ts` computeBenchmarkResult()

### 17.2 Infrastructure Evolution
**Priority**: P0 — Operational sustainability  
**Fabric**: All  

- [x] Multi-cloud deployment: AWS + GCP + Azure for vendor resilience → `loom-core/src/infrastructure-evolution.ts` computeMultiCloudConfig()
- [x] Bare-metal evaluation: dedicated servers for highest-traffic worlds → `infrastructure-evolution.ts` evaluateBaremetal()
- [x] Edge computing: game logic at CDN edge for < 10ms response time → `infrastructure-evolution.ts` computeEdgeNode()
- [x] WebAssembly backend: Rust core compiled to WASM for serverless scaling → `infrastructure-evolution.ts` computeWasmBackendConfig()
- [x] ARM server support: Graviton/Ampere for cost reduction (30-40% savings) → `infrastructure-evolution.ts` computeArmServerProfile()
- [x] Green computing: carbon-aware scheduling, renewable energy regions → `infrastructure-evolution.ts` computeGreenProfile()
- [x] Cost optimization: reserved instances, spot fleet for load testing, savings plans → `infrastructure-evolution.ts` computeCostReport()
- [x] IPv6 native: full dual-stack networking, IPv6-only option → `infrastructure-evolution.ts` NetworkMode type

### 17.3 Advanced Networking
**Priority**: P1  
**Fabric**: selvage + bridge-loom-ue5  
**Depends on**: Phase 6.3 (multi-region)  

- [x] Custom UDP protocol: reliability layer over GameNetworkingSockets → `selvage/src/gns-transport.ts`
- [x] State synchronization v2: interest management with priority queues
- [x] Bandwidth optimization: ML-driven prediction of needed state updates → `selvage/src/bandwidth-predictor.ts`
- [x] Client-side prediction v2: rollback netcode for competitive play
- [x] P2P mesh for local interactions: reduce server load for nearby players
- [x] Connection migration: seamless handoff between servers during Weave transit
- [x] Network condition simulation: built-in lag/loss/jitter simulation for testing
- [x] Protocol evolution: versioned wire format, backward compatible extension

### 17.4 VR/AR Client
**Priority**: P2 — Future platform  
**Fabric**: bridge-loom-ue5  
**Depends on**: 17.1  

- [x] VR rendering pipeline: stereoscopic, 90fps minimum, foveated rendering → `bridge-loom-ue5/Public/BridgeLoomVR.h`, `...VR.cpp` (EnableVR, SetFoveatedRendering)
- [x] VR interaction: hand tracking, gaze selection, spatial UI → `BridgeLoomVR::UpdateHandTracking`, `FLoomHandTrackingState`
- [x] AR overlay: real-world table surface as game map (Apple Vision Pro) → `BridgeLoomVR::EnableVR(ELoomVRMode::AR)`
- [x] Spatial audio: HRTF with head tracking for true 3D positioning → `BridgeLoomVR::SetSpatialAudioEnabled`
- [x] Haptic feedback: controller vibration patterns for game events → `bridge-loom-ue5/Public/BridgeLoomHaptics.h`, `...Haptics.cpp` (ELoomHapticEvent, FLoomHapticWaveform, 15 events, multi-layer summing, globalScale)
- [x] Motion sickness mitigation: comfort vignette, teleport locomotion option → `FLoomVRComfortSettings`, `BridgeLoomVR::TeleportPlayer`, `SnapTurn`
- [x] Cross-reality play: VR players share worlds with flat-screen players → `bridge-loom-ue5/Public/BridgeLoomCrossReality.h`, `...CrossReality.cpp` (ELoomViewMode, ELoomXRPolicy, pointer-ray tracking, session state, mixed-policy gate)
- [x] Pixel Streaming to standalone headsets (Quest): no local GPU needed → `bridge-loom-ue5/Public/BridgeLoomPixelStreaming.h`, `...PixelStreaming.cpp` (ELoomStreamTarget, ELoomStreamQuality, Quest 3840×1832@72fps, ApplyQuestStereoSettings, adaptive bitrate)

---

## Phase 18: Bible v5 UE5 Bridge Systems

Five new Unreal Engine 5 C++ components bridging the 10 new TypeScript subsystems added in commit `cad9b73` (Bible v5 expansion). All numerical constants mirror the TypeScript sources exactly.

### 18.1 Core Traversal & Progression
**Priority**: P0 — Player experience backbone
**Fabric**: fabrics/bridge-loom-ue5

- [x] Threadway Network: 39 threadways across 5 realms, 5 hub portals, tier 1/2/3 discovery unlock, teleport via `FTimerDelegate`, portal actor scanning → `bridge-loom-ue5/Public/BridgeLoomThreadwayNetwork.h`, `...ThreadwayNetwork.cpp` (`ELoomThreadwayTier`, `ELoomThreadwayStatus`, `ELoomThreadwayRealm`, `FLoomThreadwayDefinition`, `FLoomHubPortal`, `FLoomKindlerThreadwayState`, `TriggerTransit`, `EvaluateDiscovery`, `OnThreadwayDiscovered`, `OnThreadwayTraversed`, `OnPortalActivated`)
- [x] Kindler Progression: 8 spark levels (NewKindler → Constellation), luminance decay per world, welcome-back bonus after 7-day absence, aura MPC scalar writes (`SparkLevel` 0–7), async Niagara level-up VFX → `bridge-loom-ue5/Public/BridgeLoomKindlerProgression.h`, `...KindlerProgression.cpp` (`ELoomSparkLevel`, `ELoomSparkAction`, `FLoomSparkLevelDef`, `FLoomWorldLuminance`, `FLoomKindlerProgressionState`, `InitiateSession`, `AddSpark`, `ApplyLuminanceDecay`, `ApplyWelcomeBack`, `UpdateAuraMaterial`, `OnSparkGained`, `OnLevelUp`, `OnWelcomeBack`, `OnLuminanceChanged`)
- [x] Hidden Zones: 5 discovery zones (TheInBetween / InverseGarden / WhalesLibrary / UnfinishedRoom / DreamArchive), 5 trigger types (linger 10 s, complete-all, follow-NPC, entries+ask, night+count), 15-spark reward, async Niagara reveal → `bridge-loom-ue5/Public/BridgeLoomHiddenZones.h`, `...HiddenZones.cpp` (`ELoomHiddenZoneId`, `ELoomDiscoveryTriggerType`, `FLoomDiscoveryTrigger`, `FLoomHiddenZoneDefinition`, `FLoomKindlerZoneState`, `EvaluateLinger`, `EvaluateDiscovery`, `MarkDiscovered`, `IsNightCycle`, `OnZoneDiscovered`, `OnZoneEntered`, `OnZoneExited`)

### 18.2 Live Content & Mini-Games
**Priority**: P1 — Engagement loops
**Fabric**: fabrics/bridge-loom-ue5

- [x] Seasonal Content: 12 monthly events, 6 time-of-day bands (Dawn 05–07 / Morning / Afternoon / GoldenHour 17–19 / Evening / Night 21–05), recurring calendar timer, async prop spawning per world, per-month `PropClasses` TMap → `bridge-loom-ue5/Public/BridgeLoomSeasonalContent.h`, `...SeasonalContent.cpp` (`ELoomTimeOfDay`, `ELoomMonth`, `FLoomMonthlyEvent`, `FLoomTimeLockedContent`, `FLoomSeasonalCalendarState`, `EvaluateCalendar`, `HourToTimeOfDay`, `SpawnEventProps`, `DespawnEventProps`, `InitDefaultMonthlyEvents`, `OnTimeOfDayChanged`, `OnMonthlyEventStarted`, `OnMonthlyEventEnded`)
- [x] Mini-Games Registry: 50 canonical games across STEM / Language Arts / Financial Literacy / Crossroads realms, session lifecycle (Start → InProgress → Complete/Failed), spark gain `lerp(3,8)` by normalised score × difficulty, high-score tracking, incremental difficulty unlock at 80% threshold → `bridge-loom-ue5/Public/BridgeLoomMiniGames.h`, `...MiniGames.cpp` (`ELoomMiniGameRealm`, `ELoomMiniGameState`, `FLoomMiniGameDefinition`, `FLoomMiniGameSession`, `FLoomMiniGameResult`, `FLoomKindlerGameState`, `StartGame`, `CompleteGame`, `AbortGame`, `TearDownSession`, `ComputeSparkGain`, `InitDefaultGameDefs`, `OnGameStarted`, `OnGameCompleted`, `OnHighScoreAchieved`, `OnDifficultyUnlocked`)

---

## Phase 19: Bible v5 UE5 Bridge Systems — Batch 2

Five more Unreal Engine 5 C++ components bridging the remaining 5 TypeScript subsystems from `cad9b73`. All constants, world-IDs, and data mirror the TypeScript sources exactly.

### 19.1 Educational Standards & Content Types
**Priority**: P0 — Curriculum integrity backbone
**Fabric**: fabrics/bridge-loom-ue5

- [x] Curriculum Map: STEM×15 worlds → NGSS/CCSS/C3, LanguageArts×10 → CCSS.ELA, Financial×10 → Jump$tart+C3, age-band K-2/3-5/6-8, 8 cross-curricular highlights → `bridge-loom-ue5/Public/BridgeLoomCurriculumMap.h`, `...CurriculumMap.cpp` (`ELoomCurriculumDomain`, `ELoomAgeLabel`, `FLoomGradeMapping`, `FLoomSTEMAlignment`, `FLoomLanguageArtsAlignment`, `FLoomFinancialAlignment`, `FLoomCrossCurricularHighlight`, `GetAlignmentsForWorld`, `GetSTEMAlignment`, `GetLanguageArtsAlignment`, `GetFinancialAlignment`, `GetHighlightsForWorld`, `GetGradeMapping`, `GetWorldsForDomain`, `InitDefaultAlignments`, `InitDefaultGradeMappings`, `InitDefaultCrossHighlights`)
- [x] Entry Types: 3 new expandable formats — UnsolvedMystery (open/contested), LivingExperiment (ongoing/concluded/paused), ThoughtExperiment (philosophical, no answer), spark gain 5–15 per completion → `bridge-loom-ue5/Public/BridgeLoomEntryTypes.h`, `...EntryTypes.cpp` (`ELoomEntryTypeName`, `ELoomMysteryStatus`, `ELoomExperimentStatus`, `FLoomAgeContent`, `FLoomUnsolvedMysteryEntry`, `FLoomLivingExperimentEntry`, `FLoomThoughtExperimentEntry`, `FLoomExpandedEntryResult`, `FOnExpandedEntryCompleted`, `CompleteEntry`, `GetMysteryById`, `GetExperimentById`, `GetThoughtExperimentById`, `GetEntryIdsForWorld`, `GetEntryType`, `ComputeSparkGain`, `InitDefaultEntries`)

### 19.2 Audio, Quests & Characters
**Priority**: P0 — World immersion and long-form progression
**Fabric**: fabrics/bridge-loom-ue5

- [x] Leitmotif Catalog: 50 character motifs + Compass adaptive motif (4 modes), async `USoundBase` streaming via `FStreamableManager`, `TWeakObjectPtr<UAudioComponent>` lifecycle, global volume scalar → `bridge-loom-ue5/Public/BridgeLoomLeitmotifCatalog.h`, `...LeitmotifCatalog.cpp` (`FLoomLeitmotifDefinition`, `FLoomCompassMotifMode`, `FOnLeitmotifStarted`, `FOnLeitmotifStopped`, `PlayMotif`, `PlayCompassMotif`, `StopMotif`, `StopAllMotifs`, `GetLeitmotifByCharacterId`, `IsMotifPlaying`, `InitDefaultLeitmotifs`)
- [x] Quest Chains: 20 cross-world quests (4×STEM 50sp, 3×LanguageArts 40-50sp, 2×FinancialLiteracy 40sp, 11×CrossRealm 40-50sp), entry-world-completion-based unlock, per-kindler step tracking via `TMap<FString,TSet<int32>>` → `bridge-loom-ue5/Public/BridgeLoomQuestChains.h`, `...QuestChains.cpp` (`ELoomQuestCategory`, `ELoomQuestChainStatus`, `FLoomQuestStep`, `FLoomQuestChainDefinition`, `FLoomKindlerQuestState`, `FLoomQuestAvailabilityResult`, `FLoomQuestCompletionResult`, `FOnQuestUnlocked`, `FOnQuestStepCompleted`, `FOnQuestChainCompleted`, `RecordWorldEntryCompletion`, `CompleteQuestStep`, `GetAllQuestAvailability`, `GetQuestStatus`, `GetQuestsByCategory`, `GetQuestById`, `GetCompletedStepCount`, `EvaluateQuestUnlock`, `IsQuestUnlocked`, `InitDefaultQuestDefs`)
- [x] Visitor Characters: Compass guide (4 adaptive modes: orienting/celebrating/challenge/quiet), 9 recurring historical-traveler visitors, 12 legendary figures (first-visit then ambient), async `TSoftClassPtr<AActor>` spawning at tagged spawn points, `resolveCompassMode` logic (ForgettingWell→challenge, discovery→celebrating, lost/absent7d→orienting, else→quiet) → `bridge-loom-ue5/Public/BridgeLoomVisitorCharacters.h`, `...VisitorCharacters.cpp` (`ELoomCompassMode`, `ELoomVisitorCategory`, `ELoomLegendaryVisibility`, `FLoomCompassModeDefinition`, `FLoomCompassDefinition`, `FLoomRecurringVisitorDefinition`, `FLoomLegendaryFigureDefinition`, `FLoomKindlerVisitorState`, `FLoomCompassModeResult`, `FOnCompassModeChanged`, `FOnVisitorAppeared`, `FOnVisitorDeparted`, `FOnLegendaryFirstSeen`, `ResolveCompassMode`, `OnKindlerEnteredWorld`, `SpawnRecurringVisitor`, `SpawnLegendaryFigure`, `DespawnVisitor`, `GetVisitorsForWorld`, `IsLegendaryFirstVisit`, `InitDefaultVisitors`)

---

## Phase 20: Core Gameplay Systems UE5 Bridges

Eight Unreal Engine 5 C++ components bridging the primary gameplay TypeScript modules introduced across multiple sprints. All structs, enums, and constants mirror the TypeScript sources exactly.

### 20.1 Character & World Mechanics
**Priority**: P0 — Core runtime gameplay
**Fabric**: fabrics/bridge-loom-ue5

- [x] Movement: `ELoomMovementMode` (Walking/Running/Sprinting/Falling/Swimming/Flying), configurable per-mode max speeds, `FLoomMovementSnapshot` synced to `UCharacterMovementComponent`, footstep Niagara VFX → `bridge-loom-ue5/Public/BridgeLoomMovement.h`, `...Movement.cpp` (`ELoomMovementMode`, `FLoomMovementState`, `FLoomMovementSnapshot`, `ApplySnapshot`, `GetCurrentMode`, `GetMaxSpeedForMode`, `SyncCharacterMovement`, `OnMovementModeChanged`, `OnEntityMoved`, `OnGroundedChanged`)

- [x] Respawn: 3-second death → respawn pipeline (matches `DEFAULT_RESPAWN_DELAY_US = 3_000_000`), tick-driven countdown for HUD, `FLoomRespawnEvent` teleports owner actor via `TeleportPhysics`, death + respawn Niagara VFX → `bridge-loom-ue5/Public/BridgeLoomRespawn.h`, `...Respawn.cpp` (`FLoomRespawnTimer`, `FLoomRespawnEvent`, `NotifyDeath`, `NotifyRespawn`, `GetRespawnCountdownSeconds`, `OnEntityDied`, `OnEntityRespawned`, `OnCountdownTick`)

### 20.2 AI & Dialogue
**Priority**: P0 — NPC behaviour and narrative
**Fabric**: fabrics/bridge-loom-ue5

- [x] NPC AI: `ELoomNpcGoal` (Idle/Patrol/Chase/Attack/Flee/ReturnHome), `ELoomNpcHostility` (Hostile/Neutral/Friendly), server-authoritative decision apply with goal-change diffing, alert Niagara VFX on Chase/Attack entry → `bridge-loom-ue5/Public/BridgeLoomNPCAI.h`, `...NPCAI.cpp` (`ELoomNpcGoal`, `ELoomNpcHostility`, `FLoomNpcDecision`, `FLoomNpcAiState`, `ApplyDecision`, `ApplyStateSnapshot`, `GetCurrentGoal`, `GetHostility`, `IsInCombat`, `SpawnAlertVFX`, `OnGoalChanged`, `OnAttackTriggered`, `OnDecisionReceived`)

- [x] Dialogue: `ELoomDialogueSpeaker`, `ELoomDialogueEndReason` (Natural/Abandoned/Timeout), `TSoftClassPtr` widget auto-management, response selection forwarded to transport, `AbandonDialogue` synthesises completed event → `bridge-loom-ue5/Public/BridgeLoomDialogue.h`, `...Dialogue.cpp` (`FLoomDialogueResponse`, `FLoomDialogueLine`, `FLoomDialogueSession`, `FLoomDialogueCompletedEvent`, `BeginDialogue`, `ReceiveLine`, `EndDialogue`, `SelectResponse`, `AbandonDialogue`, `ShowDialogueWidget`, `HideDialogueWidget`, `OnDialogueStarted`, `OnDialogueLine`, `OnDialogueEnded`, `OnResponseSelected`)

### 20.3 Combat & Progression
**Priority**: P0 — Player agency and feedback loops
**Fabric**: fabrics/bridge-loom-ue5

- [x] Status Effects: `ELoomStatusEffectType` (Poison/Burn/Freeze/Stun/Slow/Haste/Regen/Shield/Weakness/Strength), `ELoomStackBehavior` (Replace/Extend/Stack/Refresh), TSet diffing for add/remove detection, Niagara VFX per effect type, MPC scalar writes (PoisonIntensity/FreezeIntensity/BurnIntensity/StunIntensity/ShieldIntensity) → `bridge-loom-ue5/Public/BridgeLoomStatusEffect.h`, `...StatusEffect.cpp` (`FLoomActiveStatusEffect`, `FLoomStatusImmunity`, `FLoomStatusReport`, `FLoomEffectTickResult`, `ApplyStatusReport`, `NotifyEffectTick`, `HasEffect`, `IsImmuneTo`, `UpdatePostProcessParams`, `SpawnEffectVFX`, `OnStatusChanged`, `OnEffectApplied`, `OnEffectRemoved`, `OnEffectTicked`)

- [x] Abilities: `ELoomAbilityEffectType` (Damage/Heal/Buff/Debuff/Teleport/Summon/Shield), `ELoomAbilityResource` (Stamina/Mana/Health/Energy), tick-driven cooldown tracking with per-ability progress bar queries, per-effect-type Niagara VFX map, fail VFX on rejected activation → `bridge-loom-ue5/Public/BridgeLoomAbility.h`, `...Ability.cpp` (`FLoomResourceCost`, `FLoomAbilityDef`, `FLoomCooldownState`, `FLoomActivationResult`, `RequestActivation`, `RegisterAbility`, `NotifyActivation`, `NotifyActivationFailed`, `ApplyCooldownState`, `NotifyCooldownExpired`, `IsOnCooldown`, `GetCooldownRemaining`, `OnActivationRequested`, `OnAbilityActivated`, `OnAbilityFailed`, `OnCooldownExpired`)

- [x] Achievements: `ELoomAchievementRarity` (Common/Uncommon/Rare/Epic/Legendary), per-rarity Niagara unlock VFX, `TSoftClassPtr` toast widget with auto-dismiss timer, `FLoomAchievementProgress.GetProgressRatio()` BlueprintPure → `bridge-loom-ue5/Public/BridgeLoomAchievement.h`, `...Achievement.cpp` (`FLoomAchievementDef`, `FLoomPlayerAchievement`, `FLoomAchievementProgress`, `FLoomPlayerAchievementStats`, `NotifyUnlock`, `UpdateProgress`, `ApplyPlayerStats`, `IsUnlocked`, `ShowToast`, `SpawnUnlockVFX`, `OnAchievementUnlocked`, `OnProgressUpdated`, `OnStatsRefreshed`)

### 20.4 Persistence
**Priority**: P1 — Player data and progression continuity
**Fabric**: fabrics/bridge-loom-ue5

- [x] Save Game: `MAX_SLOTS_PER_PLAYER = 5` enforced client-side, slot list cache for save-menu UI, bidirectional delegates (outbound request → transport RPC, inbound confirm → Blueprint), upsert on `NotifySaveCompleted`, `CanCreateNewSlot()` BlueprintPure → `bridge-loom-ue5/Public/BridgeLoomSaveGame.h`, `...SaveGame.cpp` (`FLoomSaveSlotInfo`, `FLoomSaveStateRecord`, `FLoomSaveSummary`, `RequestSave`, `RequestLoad`, `RequestCreateSlot`, `RequestDeleteSlot`, `NotifySaveCompleted`, `NotifyLoadCompleted`, `NotifySaveError`, `ApplySlotList`, `ApplySummary`, `CanCreateNewSlot`, `GetSlot`, `OnSaveCompleted`, `OnLoadCompleted`, `OnSaveError`, `OnSlotListRefreshed`, `OnSaveSummaryRefreshed`)

---

## Phase 21: Extended Gameplay Systems UE5 Bridges

Eight Unreal Engine 5 C++ components bridging the next tier of core gameplay TypeScript modules. All structs, enums, and constants mirror the TypeScript sources exactly.

### 21.1 Items & World Interaction
**Priority**: P0 — Core game-feel loops
**Fabric**: fabrics/bridge-loom-ue5

- [x] Loot Table: `ELoomLootRarity` (Common/Uncommon/Rare/Epic/Legendary/Artifact), per-rarity Niagara VFX map, session item totals, `OnRareItemDropped` fires for Rarity ≥ Rare → `bridge-loom-ue5/Public/BridgeLoomLootTable.h`, `...LootTable.cpp` (`FLoomDroppedItem`, `FLoomLootRoll`, `NotifyLootRoll`, `GetLastRollByRarity`, `GetSessionItemCount`, `SpawnItemVFX`, `OnLootRollReceived`, `OnItemDropped`, `OnRareItemDropped`)

- [x] Interaction System: `ELoomInteractionKind` (Talk/Trade/Inspect/Use/Pickup), `ELoomInteractionEventType` (Available/Unavailable/Started/Completed), `TSoftClassPtr` prompt widget with auto-manage, `TSet<FString>` entities-in-range, bidirectional delegates → `bridge-loom-ue5/Public/BridgeLoomInteraction.h`, `...Interaction.cpp` (`FLoomInteractionEvent`, `NotifyInteractionEvent`, `RequestInteraction`, `IsEntityInRange`, `GetEntitiesInRangeCount`, `ShowPromptWidget`, `HidePromptWidget`, `OnInteractionAvailable`, `OnInteractionUnavailable`, `OnInteractionStarted`, `OnInteractionCompleted`, `OnInteractionRequested`)

### 21.2 Player Progression & Navigation
**Priority**: P0 — Character advancement and world traversal
**Fabric**: fabrics/bridge-loom-ue5

- [x] Player Progression: `MaxLevel=100`, XP formula `level²×100`, skill catalog TMap for O(1) lookup, level-up Niagara VFX, `HasLearnedSkill`/`GetSkillRank` BlueprintPure queries → `bridge-loom-ue5/Public/BridgeLoomPlayerProgression.h`, `...PlayerProgression.cpp` (`FLoomPlayerLevel`, `FLoomSkillDef`, `FLoomPlayerSkill`, `FLoomProgressionStats`, `ApplyLevelState`, `RegisterSkillDef`, `ApplyPlayerSkill`, `ApplyProgressionStats`, `RequestLearnSkill`, `RequestUpgradeSkill`, `IsMaxLevel`, `OnLevelGained`, `OnXpChanged`, `OnSkillLearned`, `OnSkillUpgraded`, `OnLearnSkillRequested`, `OnUpgradeSkillRequested`)

- [x] Navigation Mesh: `ELoomNavNodeType` (Passable/Blocked/Slow/Water/Hazard), `ELoomNavLayer` (Surface/Underground/Underwater), request-ID correlation, upsert obstacle mirror, `HasObstacleAt` BlueprintPure → `bridge-loom-ue5/Public/BridgeLoomNavMesh.h`, `...NavMesh.cpp` (`FLoomNavNode`, `FLoomNavPath`, `FLoomNavObstacle`, `FLoomNavPathRequest`, `FLoomNavMeshStats`, `RequestPath`, `NotifyPathResult`, `NotifyPathNotFound`, `NotifyObstacleAdded`, `NotifyObstacleRemoved`, `ApplyNavStats`, `OnPathRequested`, `OnPathFound`, `OnPathNotFound`, `OnObstacleAdded`, `OnObstacleRemoved`)

### 21.3 Spawning & World Time
**Priority**: P0 — Entity lifecycle and atmosphere
**Fabric**: fabrics/bridge-loom-ue5

- [x] Spawn System: `ELoomNpcTier` (Common/Uncommon/Rare/Elite = 0-3), ring-buffer result history (cap 32), `HasEntityBeenSpawned` BlueprintPure, bidirectional player/NPC spawn delegates → `bridge-loom-ue5/Public/BridgeLoomSpawnSystem.h`, `...SpawnSystem.cpp` (`FLoomSpawnPlayerParams`, `FLoomSpawnNpcParams`, `FLoomSpawnResult`, `RequestSpawnPlayer`, `RequestSpawnNpc`, `NotifySpawnResult`, `NotifySpawnFailed`, `OnSpawnPlayerRequested`, `OnSpawnNpcRequested`, `OnSpawnCompleted`, `OnSpawnFailed`)

- [x] Day/Night Cycle: `ELoomDayPhase` (Dawn/Morning/Midday/Afternoon/Dusk/Evening/Midnight/DeepNight), drives `UDirectionalLightComponent` intensity + colour temperature, `IsNighttime`/`GetPhaseDisplayName` BlueprintPure, soft-ref sky atmosphere actor → `bridge-loom-ue5/Public/BridgeLoomDayNightCycle.h`, `...DayNightCycle.cpp` (`FLoomLightingState`, `FLoomTimeOfDay`, `FLoomPhaseTransition`, `NotifyPhaseTransition`, `ApplyLightingState`, `ApplyTimeOfDay`, `ApplyLightingToScene`, `OnPhaseChanged`, `OnLightingStateApplied`, `OnTimeOfDayUpdated`)

### 21.4 World Economy & Procedural Content
**Priority**: P1 — Player housing and dungeon gameplay
**Fabric**: fabrics/bridge-loom-ue5

- [x] Estate System: `ELoomEstateTier` (Plot→Citadel), `ELoomEstateSpecialization` (7 types), `ELoomArchitecturalStyle` (10 culture styles), `ELoomDefenseType` (7 types), `ELoomEstateProductionState`, `int64` economy fields (bigint parity), `GetTotalWeeklyRevenue` aggregate → `bridge-loom-ue5/Public/BridgeLoomEstate.h`, `...Estate.cpp` (`FLoomEstateInfo`, `FLoomProductionCompleteEvent`, `ApplyEstateInfo`, `NotifyTierUpgrade`, `NotifyProductionComplete`, `SetFocusedEstate`, `GetEstateById`, `OnEstateInfoRefreshed`, `OnEstateTierUpgraded`, `OnProductionCompleted`)

- [x] Dungeon Generator: `ELoomRoomType` (Entry/Boss/Treasure/Corridor/Puzzle/Trap/Rest/Merchant/Elite/Secret), `FLoomDungeonLayout.Rooms` as `TMap<FString, FLoomDungeonRoom>` for O(1) lookup, request-ID correlation, `GetRoomsByType` filter query, `OnRoomEntered` fires with resolved `ELoomRoomType` → `bridge-loom-ue5/Public/BridgeLoomDungeonGenerator.h`, `...DungeonGenerator.cpp` (`FLoomGenerationParams`, `FLoomDungeonRoom`, `FLoomRoomConnection`, `FLoomDungeonLayout`, `RequestGeneration`, `NotifyLayoutReady`, `NotifyGenerationFailed`, `NotifyRoomEntered`, `GetRoom`, `GetRoomsByType`, `GetRoomCount`, `OnGenerationRequested`, `OnLayoutReady`, `OnGenerationFailed`, `OnRoomEntered`)

---

## Scale Targets

| Metric | Launch | Year 1 | Year 3 | Year 5 | Year 10 |
|--------|--------|--------|--------|--------|---------|
| Registered users | 500K | 5M | 15M | 25M | 50M |
| **Concurrent active** | **50K** | 500K | 2M | 5M | 10M |
| Worlds online | 60 | 180 | 400 | 600 | 1,200 |
| Daily transactions | 2M | 20M | 100M | 500M | 2B |
| Remembrance entries/day | 50K | 500K | 2M | 10M | 50M |
| NPC agents running | 10K | 100K | 1M | 10M | 100M |
| Data stored (total) | 500GB | 10TB | 100TB | 1PB | 10PB |
| Rendering engines supported | 1 | 1 | 2 | 3 | 4+ |

---

## Post-Launch Roadmap (Years 3-10)

| Timeframe | Milestone |
|-----------|-----------|
| Year 3-5 | UE5 → UE6 migration (architecture designed to survive) |
| Year 3-5 | VR/AR client (Meta/Apple Vision via Pixel Streaming → native) |
| Year 3-5 | First player-destroyed world (permanent consequences) |
| Year 5-8 | Sapient NPC emergence (procedural generation + Tier 4 agents) |
| Year 5-8 | Neural interface experimentation (EEG input, premium tier) |
| Year 8-10 | Compression approaches 1:1 (Phase V), history and real time converge |

---

## Phase 22: Launch Infrastructure (Internal Alpha → Open Beta)

Operational infrastructure enabling real players to connect and ensuring legal compliance for public launch.

### 22.1 Server Infrastructure

**Priority**: P0 — Players cannot connect without this  
**Completed**: March 2026

- [x] `nakama.yml` — Nakama 3.22 server config (ports 7349/7350/7351, session tokens, runtime, metrics)
- [x] `docker-compose.yml` updated — Nakama service, gRPC port 50051, NAKAMA_* env vars
- [x] `k8s/config.yml` — ConfigMap templates (loom-config + nakama-config)
- [x] `k8s/secrets.yml` — Secret templates (loom-secrets + nakama-secrets)
- [x] `k8s/deployment.yml` updated — gRPC containerPort 50051
- [x] `k8s/nakama.yml` — K8s Nakama Deployment + Service (init-container migration, health probes)
- [x] `k8s/postgres.yml` — K8s PostgreSQL StatefulSet + PVC + Service (postgres:16-alpine, 20Gi)
- [x] `k8s/redis.yml` — K8s Redis StatefulSet + PVC + Service (redis:7-alpine, 5Gi, LRU eviction)
- [x] `.env.example` updated — All LOOM_*, NAKAMA_*, PG_*, REDIS_*, support vars documented
- [x] `.github/workflows/docker-build.yml` — Docker build+push to GHCR, staging auto-deploy

### 22.2 Player Account System

**Priority**: P0 — Players cannot register without this  
**Completed**: March 2026

- [x] `src/routes/auth.ts` — Player registration + login + session endpoints
  - `POST /v1/auth/register` — Creates Nakama account, returns JWT
  - `POST /v1/auth/login` — Authenticates, returns JWT
  - `GET /v1/auth/me` — Returns session info from Nakama
- [x] `fabrics/selvage/src/fastify-transport.ts` — Extended with `routeRegistrars` hook for plugin registration
- [x] `src/main.ts` — Auth routes wired into Fastify transport

### 22.3 Anti-Cheat and Moderation

**Priority**: P0 (Open Beta) — Required before public launch  
**Completed**: March 2026

- [x] `fabrics/dye-house/src/anti-cheat.ts` — Anti-cheat system scaffold
  - Speed hack detection (max 12 units/s)
  - Teleport detection (threshold 100 units)
  - Rapid-fire detection (max 20 actions/s)
  - Sequence replay detection
  - Escalating penalties: warn (score ≥3) → kick (≥7) → 24h ban (≥15)
  - Per-player audit log (200 entries)
- [x] `fabrics/dye-house/src/chronicle-moderation.ts` — Chronicle content review (ported from upstream)
- [x] `fabrics/dye-house/src/review-queue.ts` — Moderation queue system (ported from upstream)
- [x] `tools/support/src/support-webhook.ts` — Player support system
  - `POST /v1/support/report` — Submit a player report (7 categories)
  - `GET /v1/support/ticket/:id` — Get ticket status
  - `POST /v1/support/ban` — Internal ban action (shared-secret auth)
  - `POST /v1/support/mute` — Internal mute action (shared-secret auth)
  - Discord webhook notifications for new reports

### 22.4 Legal and Compliance

**Priority**: P0 (Open Beta) — Required before public launch  
**Completed**: March 2026

- [x] `docs/legal/tos.md` — Terms of Service (eligibility, Permanence Covenant, economy, IP)
- [x] `docs/legal/privacy.md` — Privacy Policy (GDPR/CCPA/COPPA compliant template)
- [ ] Age verification integration (Veriff/Onfido — external provider required)
- [ ] DPAs signed with Nakama, Stripe, Pagerduty
- [ ] External penetration test (contracted third party)
- [ ] Bug bounty programme (HackerOne or similar)
- [ ] EU/UK data representative appointed

### 22.5 Upstream Sync (Wave GGGG+HHHH)

**Priority**: P1 — Keeps Koydo fork current with loom engine  
**Completed**: March 2026

- [x] 30 nakama-fabric modules: launch-sequence, player-initiation, pre-launch-witness, game-state-aggregator, subscription-lifecycle, assembly systems, dynasty governance, economy engine, sovereignty ledger
- [x] Inspector modules: health-check-service, permanence-covenant, metrics-endpoint, incident-response-service, covenant-status-api, civilisation-dashboard
- [x] Selvage APIs: historian-api, galaxy-map-api, discord-stats-api, lore-compendium-api, witness-api
- [x] Dye-house: chronicle-moderation, review-queue
- [x] Contracts: binary-codec, gameplay-components, character-appearance
- [x] Bootstrap: src/bootstrap-world.ts, src/main-bootstrap.ts, src/bridge-world-state-provider.ts
- [x] Website: website/index.html, website/covenant.html

### 22.6 Operations

**Priority**: P1 — Engineers need to operate the system  
**Completed**: March 2026

- [x] `docs/LAUNCH-RUNBOOK.md` — Complete Phase 0→1→2 launch guide
  - Prerequisites and exact commands for each phase
  - Rollback procedures
  - Environment variable reference
  - Health check endpoint catalogue
- [x] Updated `docs/NEXT-STEPS.md` — Phase 22 launch infrastructure documented

---

## What Remains for Full Launch (Phase 3)

| Item | Status | Owner |
|------|--------|-------|
| Age verification integration | ⏳ Need external provider | Ops |
| DPAs with processors | ⏳ Legal negotiation | Legal |
| External penetration test | ⏳ Contracted third party | Security |
| Bug bounty programme | ⏳ HackerOne setup | Security |
| EU/UK data representative | ⏳ Legal appointment | Legal |
| Production Kubernetes cluster | ⏳ Cloud provisioning | Infra |
| DNS and TLS certificates | ⏳ Domain registration | Infra |
| Steam/Epic storefront listing | ⏳ Platform submission | Marketing |
| Permanence Covenant smart contract | ⏳ Blockchain deployment | Engineering |
| UE5 client packaged build | ✅ Packaged in artifacts/ | Engineering |

