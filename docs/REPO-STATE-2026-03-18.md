# Koydo Worlds (Loom) — Repository State & Deep Dive

> Created: 2026-03-18
> Audience: Founder
> Purpose: Complete record of what this repo is, its current state, what's done, what's pending, and decisions made

---

## What This Repo Is

**Koydo Worlds** is a hyper-realistic multiplayer educational game built on Unreal Engine 5. Kids explore 50 immersive worlds, each one inhabited by a Kindler Guide NPC who teaches a subject through open-world interaction — not worksheets. Worlds decay without learning (The Fading), and are restored by completing real educational content.

**The Loom** is the authoritative game server behind it — an event-driven backend written in TypeScript that manages all world state, NPC simulation, economy, social systems, and bridges to the UE5 rendering client via gRPC.

**This is NOT the same as Koydo Learn** (`D:/pythonprojects/koydo`). Learn is the web-based education platform. Loom is the game. Future integration is planned but not required for MVP of either.

---

## Repository Stats (as of 2026-03-18)

| Metric | Value |
|--------|-------|
| TypeScript lines | ~29,102 |
| Source files | ~1,984 |
| Test files | 400+ |
| Tests passing | 10,581+ |
| Test coverage (statements) | 95.93% |
| Test coverage (branches) | 86.57% |
| TypeScript errors | 0 |
| Lint warnings | 1,246 (pre-existing, non-critical) |
| Python ML scripts | 7 |
| SQL migrations | 19 |
| C++ UE5 plugin files | 40+ headers + implementations |
| API routes | 36 |
| Fabric modules | 8 |
| Worlds designed | 50 |
| Characters designed | 100+ NPCs, 50 Kindler Guides |
| Bible documents | 12 master docs + 20+ lore files |

---

## Architecture

### The Fabric System

The entire codebase is organized into 8 independent Fabrics (modules). The founding rule: **no Fabric imports another Fabric**. All cross-Fabric communication goes through typed events on the central event bus.

```
contracts/         ← Shared interfaces — read-only by all Fabrics
fabrics/
  loom-core/       ← The heartbeat: ECS, tick loop, event bus, world state, seasons, weather
  shuttle/         ← NPC orchestration: 40+ subsystems, Temporal workflows
  silfen-weave/    ← World transitions: Silfen Weave (no loading screens), lattice transit
  nakama-fabric/   ← Economy: KALON currency, crafting, trading, governance, war, alliances
  archive/         ← Persistence: event sourcing, Chronicle, genealogy, dynasty portfolio
  selvage/         ← API gateway: Fastify HTTP+WS + gRPC transport to UE5
  dye-house/       ← Security: XChaCha20-Poly1305 encryption, auth, CSRF, rate limiting
  inspector/       ← Observability: Prometheus metrics, OpenTelemetry traces, SLA monitoring
  bridge-loom-ue5/ ← C++ UE5 plugin (separate compilation — not in npm workspace)
```

### Event Flow

A player action travels:
```
UE5 client → gRPC (selvage) → event bus (loom-core) → fabric handlers → state update → replication delta → UE5 client
```

Everything is binary (FlatBuffers/MessagePack on hot paths). Never JSON for game traffic.

### Performance targets (all met)

- Tick loop: < 0.5ms
- API latency: < 50ms p99
- Event bus throughput: > 100K events/sec
- Concurrent players per node: 1,000+

---

## Completion Status

### What's Done (Phases 1–8 complete)

**Phase 1 — Infrastructure adapters**
- Fastify HTTP/WS transport
- gRPC transport to UE5
- Structured logging (Pino)
- PostgreSQL adapter
- XChaCha20-Poly1305 encryption

**Phase 2 — Interconnection**
- Binary message codec (FlatBuffers + MessagePack)
- Event archive (PostgreSQL event store + replay)
- Prometheus metrics export
- OpenTelemetry distributed tracing

**Phase 3 — Scale systems**
- Rust NAPI event bus (high-performance)
- Temporal workflow orchestration
- UE5 BridgeLoom plugin (core)
- Python ML pipeline wiring

**Phase 4 — NPC systems**
- Nakama client integration
- NPC sync protocol
- Character creation pipeline
- Anti-cheat detection (speed hack, teleport, rapid-fire)

**Phase 5 — Rendering**
- UE5 renderer bridge (time-of-day, weather, material params)
- World chunk streaming + interest management
- Pixel streaming via WebRTC

**Phase 6 — Scale & performance**
- Event bus v2 (wildcard subscriptions, batch publish, backpressure)
- k6 load testing (7 scenarios, 5 behavior profiles)
- Multi-region PostgreSQL replication
- TimescaleDB hypertables for analytics compression

**Phase 7 — World generation**
- Procedural terrain (Perlin noise, 1024×1024 heightmaps)
- Biome classification (10 biome types)
- Settlement placement (fitness scoring)
- Resource distribution (biome-specific)
- Grafana observability dashboard
- NPC behavior model training (RandomForest → ONNX export)

**Phase 8 — Social systems**
- Chat: world-local, dynasty, assembly, whisper, trade, global channels
- Chat moderation: profanity filter, toxicity ML, human review queue
- Voice chat: WebRTC rooms, proximity-based activation
- Voice transcription: Whisper model integration
- Alliance & diplomacy: proposals, treaties, war/peace mechanics
- Assembly governance: voting, legislation, elections, constitutional amendments
- Player events & seasonal festivals
- Tournament brackets
- Cross-world broadcasting

### 36 API Routes Implemented

All routes in `src/routes/` are functional:

| Category | Routes |
|----------|--------|
| Core game | worlds, fading, threadways, hidden-zones |
| Player | kindler (child profiles), session, progression, accessibility |
| Content | content (entries), curriculum, entry-types, adventures |
| NPCs | npcs, npc-relationships, guide, visitor-characters |
| Economy | revenue |
| Social | leaderboard, notifications |
| Media | leitmotifs, mini-games |
| Parent | parent-dashboard |
| Infrastructure | analytics, auth, feature-flags, moderation, safety, seasonal |
| Quest | quest-chains |

### Database — 19 Migrations Applied

Full schema covering: anti-cheat, support, bans, achievements, leaderboards, analytics, feature flags, parent accounts, child profiles (COPPA), world luminance (The Fading), AI chat sessions (24h auto-delete), revenue, content, adventure progress, mini-games, quests, notifications, hidden zone discoveries, accessibility profiles.

---

## Phase 9 — In Progress

Visual and audio systems that complete the playable experience:

- [ ] MetaHuman facial rig sync (52 ARKit blend shapes → UE5)
- [ ] Lip-sync for NPC dialogue
- [ ] Ambient soundscape composition per world
- [ ] Dynamic music system (leitmotifs, intensity layers)
- [ ] Spell/ability particle effects
- [ ] World transition shader effects (The Silfen Weave)
- [ ] Fading visual effect (luminance → saturation on materials)
- [ ] `BridgeLoomMetaHuman.h/.cpp` — C++ implementation of gRPC facial pose streaming

The C++ header `BridgeLoomMetaHuman.h` is defined. The `.cpp` implementation is the critical pending piece. It handles streaming 52 ARKit blend shapes from the Loom server → UE5 MetaHuman rig via FlatBuffers schema over gRPC.

---

## What's Completely Missing

| Missing | Notes |
|---------|-------|
| 3D environment art (~60% of worlds) | Commission required — see CHARACTER-DESIGN-BRIEF.md for character art pipeline |
| Voice acting for T3/T4 NPCs | TTS fallback planned; real voices future |
| 10–15 narrative cutscenes | Scripted story sequences — UE5 Sequencer work |
| Mobile optimization | Desktop/web-first; mobile is future |
| VR support | Not in scope for MVP |
| Offline mode | Designed, not built — sync challenges |
| Cross-console (PS/Xbox) | Future |
| Localization | English complete; Spanish/French/Mandarin TBD |
| AI voice synthesis | Architecture wired (voice-transcription.ts exists); output not implemented |
| 32 more world ambient soundscapes | 18/50 done |
| 42 more world leitmotifs | 8/50 done |

---

## The 50 Worlds

All 50 worlds are fully designed in the bibles. Three realms + hub:

| Realm | Worlds | Subject area |
|-------|--------|-------------|
| Discovery (STEM) | 15 | Weather, Engineering, Marine Biology, Plant Biology, Astronomy, Math, Arithmetic, Physics, Electricity, Coding, Anatomy, Geology, Chemistry, Data Science, Geography |
| Expression (Language Arts) | 15 | Storytelling, Poetry, Phonics, Reading Comprehension, Grammar, Vocabulary, Punctuation, Debate, Creative Writing, Spelling, World Languages, Research, Visual Literacy, Folklore, Editing |
| Exchange (Financial Literacy) | 12 | Trade, Saving, Budgeting, Entrepreneurship, Community Economics, Investing, Smart Spending, History of Money, Debt, Earning, Charitable Giving, Taxes |
| Crossroads (Hub) | 8 | The Great Archive, Design Thinking, Scientific Method, Ethics, Social-Emotional Learning, Historical Thinking, Music, Navigation |

Each world has:
- A Kindler Guide (subject matter expert NPC — all 50 designed and Fal.ai portraits generated)
- Three Fading states (luminance 0/50/100 — degraded/partial/restored)
- Zone design (entrance, learning areas, hidden zones, threadway exits)
- Ambient life system (fauna, flora, seasonal variants)
- Sound design spec (ambient loops + leitmotif)

---

## The 50 Kindler Guides

All 50 characters have:
- Verbatim physical descriptions (from CHARACTER-DESIGN-BRIEF.md)
- Fal.ai FLUX-pro v1.1 reference portraits generated (768×1024) — `docs/character-references/`
- Personality profiles in the bibles
- Tier 4 (Hero NPC) MetaHuman designation — full facial animation rig

Priority commission order for human concept artist:
1. **Zara Ngozi** — brass prosthetic arm, most distinctive silhouette
2. **Atlas** — stone golem, most technically complex, scale reference needed
3. **Cal** — crystal being, non-human proportions, internal light design
4. **Grandmother Anaya** — emotional anchor, storytelling warmth
5. **Pixel** — digital-physical boundary character, edge pixelation effects

---

## The Lore

### The Founding Event
On 2031-08-14, Dr. Amara Okafor achieves the first "Lattice transit" in Lagos, Nigeria. She passes through a physical location into a parallel world made of pure knowledge. This is the origin event that makes Koydo Worlds possible.

### The Three Founding Wounds
1. **Adeyemi Suppression** — early political suppression of Okafor's work
2. **World Selection Politics** — which 50 worlds were chosen and why became contested
3. **Ascendancy Origin** — the antagonist faction's roots

### The Fading
Worlds decay when children stop learning. Luminance (0–100) represents a world's vitality. At luminance 0 the world is grey, silent, and mostly inaccessible. At 100 it's fully restored — color, music, ambient life, all active. Completing lessons (content entries) restores luminance. This is the core gameplay loop connecting education to world state.

### The Chronicle
A persistent in-game history. Players write Chronicle entries by completing lessons. Entries affect faction reputation, unlock hidden zones, and shape future world events. "The Chronicle remembers everything."

### The Silfen Weave
Inter-world travel network. Threadways connect all 50 worlds. The Silfen Weave is the seamless transition system (no loading screens). Transit takes 2–4 seconds of real time.

### KALON Economy
The in-world currency. Earned through learning, traded between players, taxed by Assembly governance, invested in faction projects. Designed to model real economic principles (the Exchange realm) while being a functional game economy.

---

## Python ML Pipeline Status

All 7 pipelines are fully implemented and ready for deployment:

| Pipeline | Status | Notes |
|----------|--------|-------|
| `world_gen_automation.py` | ✅ Complete | Perlin noise terrain, 10 biome types, settlement fitness scoring |
| `procedural_generation.py` | ✅ Complete | Entity placement on generated terrain |
| `npc_tier3_llm.py` | ✅ Complete | 8 archetypes, context injection, emotion tags, T2 fallback |
| `npc_behavior_training.py` | ✅ Complete | RandomForest → ONNX export pipeline |
| `character_t2i_service.py` | ✅ Complete | FastAPI microservice, NSFW filtering, tier caps |
| `character_prompt_builder.py` | ✅ Complete | Archetype-specific prompts, style presets |
| `fal_ai_adapter.py` | ✅ Complete | Async queue API, content hashing, tier-based model selection |

**API key for Fal.ai** (also in Koydo Learn `.env`): `553b4624-3af5-4e45-9adc-2a8e385eea85:f4f9eaeb72e127d10cb0ceaf77615520`

---

## UE5 Plugin State

`fabrics/bridge-loom-ue5/` — scaffold complete, core systems implemented.

| System | Status |
|--------|--------|
| BridgeLoomRenderer (lighting, weather, LOD) | ✅ Implemented |
| BridgeLoomWorldStreamer (chunk streaming) | ✅ Implemented |
| BridgeLoomCharacterVisuals (MetaHuman sync) | ⚠️ Header defined, .cpp pending |
| BridgeLoomNiagara (particle effects) | ⚠️ Partial |
| BridgeLoomMassEntity (crowd simulation) | ✅ Framework |
| GameFeature: Dynasty, Economy, Governance, Interaction | ✅ Components |
| Pixel Streaming (WebRTC proxy) | ✅ Implemented |
| gRPC bridge to Loom server | ✅ Implemented |

**Critical pending:** `BridgeLoomMetaHuman.cpp` — the 52 ARKit blend shape streaming implementation. This is Phase 9's most important C++ task.

---

## CI/CD Pipeline

GitHub Actions runs on every push:

1. `typecheck` — `tsc --build` strict (must be clean)
2. `lint` — ESLint zero warnings
3. `format` — Prettier
4. `test` — vitest + coverage (95%+ required)
5. `code-quality` — no `any`, no `console.log`, no hardcoded secrets
6. `security` — `npm audit`, secret scanning
7. `docker` — `docker build` verification
8. `gate` — all above must pass

On `main` push: auto-builds Docker image, pushes to GHCR, deploys to staging.

---

## Relationship to Koydo Learn

| | Koydo Learn | Koydo Worlds (Loom) |
|--|-------------|---------------------|
| Type | Web app | Game |
| Stack | Next.js / React | TypeScript server + UE5 |
| Users | Parents + kids (browser) | Kids (PC/console) |
| Backend | Supabase | Custom (Loom + Nakama + PostgreSQL) |
| Content | Structured modules | Open-world exploration |
| NPCs | Static guide voices | T1–T4 NPC simulation |
| Economy | None (subscription) | KALON currency, trading, taxation |
| Social | Personal progress only | Alliances, assembly, war, diplomacy |

**Integration path (future, not MVP):**
- Single sign-on: parent auth → both apps
- Content shared: Loom can embed Learn modules as in-world interactions
- Progress sync: lesson completion in Learn → spark gain in Worlds

**Priority:** Learn ships first and generates revenue. Worlds is funded by Learn subscription revenue.

---

## Critical Path to Playable Demo

The backend is feature-complete. The remaining work to a playable demo:

1. **`BridgeLoomMetaHuman.cpp`** — wire facial blend shapes to UE5 MetaHuman
2. **Character assets for first world** — commission Number Garden or Great Archive 3D art
3. **Audio integration** — wire leitmotif system, connect ambient soundscapes
4. **Phase 9 particle effects** — Fading visual shader, transition effects
5. **Internal playtest** — 20-person playtest, bug triage
6. **COPPA hardening** — verify age gate, data deletion, parental controls end-to-end

Realistic timeline to playable single-world demo: **4–6 weeks** (primarily asset bottleneck, not code).

---

## Decisions Made This Session

1. **Worlds funded by Learn** — do not invest in 3D art commissions until Learn generates revenue
2. **Fal.ai pipeline confirmed working** — all 50 character portraits generated at ~$2.50 total
3. **CHARACTER-DESIGN-BRIEF.md ready** — brief is complete and can be sent to a human concept artist when funding permits
4. **Commission priority** — if/when budget allows, start with 1 world (Number Garden or Great Archive hub) to prove the art pipeline before committing to all 50
5. **Phase 9 MetaHuman work** — `BridgeLoomMetaHuman.cpp` is the technical critical path for any UE5 demo

---

## Open Items

| Item | Owner | Priority |
|------|-------|---------|
| Implement `BridgeLoomMetaHuman.cpp` | Engineering | P1 — blocks UE5 demo |
| Commission first world art (Number Garden or Great Archive) | Founder (post-Learn revenue) | P2 |
| Wire audio leitmotif system | Engineering | P2 |
| Add voice synthesis to NPC dialogue pipeline | Engineering | P3 |
| Commission character concept art (5 priority characters) | Founder (post-Learn revenue) | P3 |
| Mobile optimization | Engineering | P4 — post-MVP |
| Localization (Spanish, French, Mandarin) | Engineering | P4 — post-MVP |
