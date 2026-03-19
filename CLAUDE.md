# CLAUDE.md — The Concord (LOOM)

> **Repo:** https://github.com/robertwaltos/loom
> **Project:** The Concord — premium adventure MMO for teens/adults

---

## STOP — READ THIS BEFORE DOING ANYTHING

### VERIFY CODE 3x BEFORE ANY ACTION
- READ actual source files before making any claims about the codebase
- NEVER trust documentation, summaries, session logs, or memory — read the code
- NEVER recommend work that may already be done — check first
- If the user says "we did this already" — THEY ARE RIGHT. Verify and confirm.

### DEPLOY POLICY
- NEVER auto-deploy
- NEVER push to remote unless user explicitly says "push" or "ship it"
- Commit to main locally when asked

### MULTI-AGENT PROTOCOL
-> See AGENTS.md — every agent MUST follow it without exception

---

## Project

The Concord is a **premium adventure MMO** (~$15/month) targeting teens and adults. It is NOT an educational game. Do not mix it with the Kindler repo.

**Separate repo — Kindler** (`D:/pythonprojects/Kindler/`): the K-12 educational game. Keep them completely isolated.

---

## Character System

| Asset | Location |
|-------|----------|
| **Canonical bible (SINGLE SOURCE OF TRUTH)** | `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md` |
| Vol1 prose + visual spec | `docs/game-bible/The_Concord_Character_Bible_Vol1.md` |
| Vol1 visual manifest (CSV) | `docs/game-bible/The_Concord_Character_Visual_Manifest_Vol1.csv` |
| Portrait images | `docs/character-references/{id}-{slug}.jpg` |
| Character JSON manifest | `docs/character-manifest.json` |
| Design brief | `docs/CHARACTER-DESIGN-BRIEF.md` |

### Character Count: 500 total
- **Numbered characters:** 1-500 (in CANONICAL_CHARACTER_BIBLE.md)
- **Earth Phase characters:** E-001-E-019 (also in CANONICAL_CHARACTER_BIBLE.md)
- **Vol1** (chars 1-15): handled separately via CSV for visual prompts

### Distribution Targets (Adventure MMO — ESA/Newzoo research)
- Race seed 42: White 44%, East Asian 19%, Latin 13%, Black 11%, South Asian 7%, MENA 4%, SE Asian 2%
- Gender seed 44: Male 65%, Female 35%

### Scripts
| Script | Purpose |
|--------|---------|
| `scripts/canonicalize-characters.py` | Rewrites all ethnic/gender visual prompts across canonical bible |
| `scripts/rewrite-and-generate.py` | Deletes old portraits, generates new via fal.ai |

**API:** fal.ai FLUX-pro v1.1 queue — ~$0.05/image
**API key:** `pipelines/.env`

**NEVER run rewrite-and-generate.py without explicit user confirmation** — it deletes existing portraits.

---

## Demographic Assignment System

Both scripts use deterministic seeded lists:
```python
ETHNIC_ASSIGNMENTS_500 = _build_race_list_500()  # seed 42
GENDER_ASSIGNMENTS_500 = _build_gender_list_500() # seed 44
```

These are locked. Do NOT change the seeds — it would scramble all 500 assignments.

The Architect (char 001) is ALWAYS skipped by both scripts (`char_id == "1"`). His visual spec is in Vol1.md and the CSV — never overwrite it.

---

## Security Standards

- All secrets via environment variables — NEVER hardcode
- Secrets: `pipelines/.env`
- Validate all inputs at system boundaries
- No PII in logs
- Auth and session logic: review before modifying
- Dependencies: review before adding/upgrading

---

## Code Reliability

- Read existing code before modifying — match existing patterns
- No silent failures — surface or log all errors
- No dead code or commented-out blocks
- Test before committing

---

## Stats — ALWAYS VERIFY AGAINST CODE

```bash
# Total characters in canonical bible
grep -c "^### [0-9E]" docs/game-bible/CANONICAL_CHARACTER_BIBLE.md

# Portraits generated
ls docs/character-references/*.jpg | wc -l
```

---

## World Lore (Quick Reference)

- **Year 0:** The Founding — Concord established, Lattice activated
- **Current year:** 108
- **KALON:** Currency/trade network
- **The Lattice:** Distributed AI network. Truth (known to ~12): it is sentient.
- **Survey Corps:** Explorers/scouts
- **Assembly:** Government (Continuationists vs Returnists)
- **Covenant:** Religious faction (worships Lattice)
- **CID:** Intelligence directorate
- **Chronicle:** Legal/historical record system
- **Ascendancy:** Secret inner circle who know the Lattice is sentient
- **The Architect:** Lattice avatar — appears as mid-50s male, warm olive-brown complexion, dark silvered hair, dark amber-hazel eyes, dark coat

---

## Existing Architecture (The Loom Engine)

The Loom is a hyper-realistic experience orchestration engine built around a UE 5.7 integration baseline. It owns world state, entity lifecycle, AI behavior, identity, economy, and seamless world transitions (The Silfen Weave). UE is the rendering fabric — a plugin, not the brain.

### Directory Structure

```
contracts/          <- Shared interfaces. RARELY MODIFIED. Changes = breaking.
  bridge-loom/      <- Interface any rendering engine must implement
  events/           <- Event type definitions (the lingua franca)
  entities/         <- Entity component schemas
  protocols/        <- Wire protocol definitions

fabrics/            <- Independent modules. ONE AGENT PER FABRIC.
  loom-core/        <- The Loom: entity system, event bus, world state
  shuttle/          <- The Shuttle: AI agent orchestration (Temporal workflows)
  silfen-weave/     <- Seamless world transition orchestration
  nakama-fabric/    <- Identity, economy, matchmaking (wraps Nakama)
  bridge-loom-ue5/  <- UE 5.7 plugin-first Bridge Loom root (.uplugin, Source/, GameFeatures/)
  inspector/        <- Monitoring, metrics, quality control
  selvage/          <- API gateway, external interface
  dye-house/        <- Security, auth, encryption
  archive/          <- Document storage, state persistence

tools/              <- Build tools, code generation, scripts
tests/              <- Integration, E2E, perceptual tests
docs/               <- Architecture docs, game bible, API specs
```

### Tech Stack

- **TypeScript** (primary) — strict mode, no `any`, ES2023 target
- **Rust** (performance-critical) — event bus hot paths, binary serialization
- **C++** (UE 5.7 plugin code) — Bridge Loom modules, Game Features, gRPC bridge
- **Python** (AI/ML) — NPC behavior training, procedural generation ML
- **Node.js 22+** — runtime for TypeScript services
- **npm workspaces** — monorepo management

### Architecture Principles

- **Hexagonal (Ports & Adapters):** Business logic never imports infrastructure
- **Event-driven:** Modules communicate through typed events, never direct calls
- **Plugin architecture:** Core is minimal, features are plugins
- **Binary protocols on hot paths:** FlatBuffers/MessagePack between Loom and UE5, never JSON
- **The Loom is invisible to the frame budget:** < 0.5ms per game thread tick
- **Design for the ceiling:** Store highest quality, serve what device can handle

### The Ten Commandments

1. Name things so clearly that comments become redundant
2. Functions under 30 lines
3. Never nest deeper than 3 levels
4. Make illegal states unrepresentable — TypeScript strict mode, no `any`, ever
5. Write tests before fixing bugs
6. Errors are first-class citizens — custom types, structured codes, correlation IDs
7. Log with purpose — structured JSON, never `console.log`
8. Don't optimize prematurely, but don't be lazy
9. Dependencies explicit — no global state, dependency injection everywhere
10. Delete dead code immediately

### Quality Gates (Every PR)

1. `npm run format` — Prettier
2. `npm run lint` — ESLint (zero warnings)
3. `npm run typecheck` — TypeScript strict (zero errors)
4. `npm run test` — All tests pass
5. Coverage >= 80% on changed files
6. No `any` types
7. No functions > 30 lines
8. No nesting > 3 levels
9. Security scan passes
10. AI cross-model review score >= 8/10

### Persona System

Before starting any task, review the personas available in `agents/` and adopt the best-fit persona for the work at hand. Follow the routing in `agents/persona_router.md` and the activation protocol in `agents/persona_activation_protocol.md`.
