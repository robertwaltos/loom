# The Concord — Development Guide

> **Last verified:** 2026-03-19 from source files
> For architecture overview see `docs/ARCHITECTURE.md`.
> For API reference see `docs/API.md`.
> For agent instructions see `CLAUDE.md` and `AGENTS.md`.

---

## Environment Setup

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22+ | Strict requirement in package.json engines |
| npm | 10+ | Workspace support required |
| Docker + Docker Compose | Latest | For local PostgreSQL, Redis, Nakama |
| Python | 3.11+ | For pipelines/ scripts |
| TypeScript | 5.9.x | Installed via npm — do not install globally |

### First-Time Setup

```bash
# Clone
git clone https://github.com/robertwaltos/loom
cd loom

# Install all npm workspace dependencies
npm install

# Start backing services
docker-compose up -d

# Wait for services to be healthy, then apply migrations
npx tsx db/migrate.ts

# Optionally seed content
npm run db:seed:content

# Build TypeScript
npm run build

# Start dev server with hot reload
npm run dev
```

### Environment Variables

All secrets are in `pipelines/.env`. The server reads from `process.env`. No secrets are hardcoded.

Key variables needed for local dev:
- Nakama connection: host, port, server key
- PostgreSQL: connection string
- Redis: connection URL
- fal.ai API key: for portrait generation (scripts/rewrite-and-generate.py)

See `pipelines/.env` for all current values.

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on save)
npm run test:watch

# Coverage report (target: >= 80% on changed files)
npm run test:coverage

# Full quality gate (typecheck + lint + test)
npm run check
```

**Current coverage:** 95.93% statement coverage, 10,581+ passing tests, 0 TypeScript errors.

Tests live in:
- `tests/` — integration and E2E tests
- `fabrics/*/src/__tests__/` — unit tests per fabric

---

## The Ten Commandments (Coding Standards)

These are enforced by the linter and code review:

1. Name things so clearly that comments become redundant
2. Functions under 30 lines (lint: `max-lines-per-function` — ~580 pre-existing violations are known tech debt)
3. Never nest deeper than 3 levels
4. Make illegal states unrepresentable — TypeScript strict mode, no `any`, ever
5. Write tests before fixing bugs
6. Errors are first-class citizens — custom types, structured codes, correlation IDs
7. Log with purpose — structured JSON via Pino, never `console.log`
8. Don't optimize prematurely, but don't be lazy
9. Dependencies explicit — no global state, dependency injection everywhere
10. Delete dead code immediately

### Quality Gate (Every PR)

Before committing, run:
```bash
npm run format        # Prettier
npm run lint          # ESLint (zero warnings)
npm run typecheck     # TypeScript strict (zero errors)
npm run test          # All tests pass
```

Additional checks:
- Coverage >= 80% on changed files
- No `any` types
- No functions > 30 lines
- No nesting > 3 levels
- Security scan passes

---

## Fabric Architecture

The codebase is organized as an npm workspace with fabrics as independent packages:

```
package.json (workspace root)
└── workspaces: ["contracts/*", "fabrics/*", "tools/*"]
```

Each fabric is a self-contained module with:
- Its own `package.json`
- Its own `src/` directory
- Its own `__tests__/` directory
- No direct imports of other fabrics — communication is through typed events (contracts/events/)

**Architecture principle (Hexagonal):** Business logic never imports infrastructure. Infrastructure adapters implement interfaces defined by the fabric. For example, the archive fabric defines `ArchiveRepository` as an interface; `pg-event-archive.ts` is the PostgreSQL implementation.

---

## How to Add a New Route

1. Create `src/routes/{domain}.ts` using the pattern:
   ```typescript
   /**
    * {Domain} Routes — {description}
    *
    * {Method} {path} — {purpose}
    * ...
    *
    * Thread: silk/{domain}
    * Tier: 1|2|3
    */
   import type { FastifyAppLike } from '@loom/selvage';

   export interface {Domain}RoutesDeps {
     // inject dependencies here — never import globally
   }

   export function register{Domain}Routes(app: FastifyAppLike, deps: {Domain}RoutesDeps): void {
     app.get('/v1/{path}', async (req, reply) => {
       // validate input
       // call fabric via deps
       // return typed response
     });
   }
   ```

2. Register the route in `src/main-bootstrap.ts` by importing and calling the registrar with its deps.

3. Add tests in `tests/routes/{domain}.test.ts`.

4. If the route involves a new database table, create a migration in `db/migrations/{NNNN}_{name}.sql` and update `docs/DATABASE.md`.

5. Document the route in `docs/API.md`.

### Route Conventions

- All paths under `/v1/`
- Always validate input — return `{ ok: false, error, code }` with 400 for invalid input
- Always inject deps — never import fabric implementations directly in route files
- Return `{ ok: true, ...data }` on success
- Use `satisfies` keyword on response objects for TypeScript narrowing
- BigInt values must be serialized as strings for JSON (see combat.ts `serializeBigInt`)

---

## How to Add a New World

1. Add the world definition to `universe/worlds/` following the `WorldDefinition` type.
2. Add it to the `WorldsEngine` registry.
3. Create content entries for the world in `universe/content/` and seed them via `db/seed-content.ts`.
4. Assign a guide NPC in the NPC catalog.
5. Define threadway connections to adjacent worlds in `fabrics/loom-core/src/threadway-network.ts`.
6. For UE5: the BridgeLoomWorldStreamer will request the new world's chunks from the server using the worldId. No UE5 code change is needed until an actual level is created in the editor.

---

## How to Add a New Character

For NPCs in the catalog (in-game characters a player can meet):
1. Add the NPC to the NPC catalog in `fabrics/loom-core/src/npc-catalog.ts`.
2. Assign a `worldId` (where they reside), `role`, and `tier` (1-3).
3. If tier 3 or 4: add dialogue configuration in the shuttle fabric.

For named characters in the canon (the 500):
1. Add to `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md` following the established format.
2. Do NOT change the demographic seed numbers.
3. Character 001 (The Architect) is always exempt from demographic assignment scripts.
4. Run `scripts/canonicalize-characters.py` to normalize the bible after adding characters.
5. Portrait generation: see Portrait Generation section below.

---

## Portrait Generation

**IMPORTANT:** Running `scripts/rewrite-and-generate.py` deletes existing portraits. Never run it without explicit user confirmation.

The portrait pipeline:

1. `scripts/canonicalize-characters.py` — Normalizes all ethnic/gender visual prompts in `CANONICAL_CHARACTER_BIBLE.md` using deterministic seed-42 (race) and seed-44 (gender) assignments. Run this after adding new characters or editing demographics.

2. `scripts/rewrite-and-generate.py` — Deletes portraits from `docs/character-references/` that have changed prompts, then regenerates them via fal.ai FLUX Pro v1.1.
   - Cost: ~$0.05/image
   - API key in `pipelines/.env`
   - Output: `docs/character-references/{id}-{slug}.jpg`

3. `pipelines/character_prompt_builder.py` — Builds the prompt string for each character from their bible entry.

4. `pipelines/character_t2i_service.py` — fal.ai queue wrapper for FLUX Pro v1.1.

5. `pipelines/fal_ai_adapter.py` — Low-level fal.ai API adapter.

```bash
# 1. Canonicalize after editing the character bible
python scripts/canonicalize-characters.py

# 2. Check what would be regenerated (dry run)
python scripts/rewrite-and-generate.py --dry-run

# 3. Regenerate (DESTRUCTIVE — confirm first)
python scripts/rewrite-and-generate.py
```

---

## sync-to-kindler.sh Workflow

LOOM is the canonical source. Kindler shares a large subset of server infrastructure. All shared code is developed in LOOM and ported to Kindler via this script.

```bash
# Dry run — shows what would change
./scripts/sync-to-kindler.sh

# Apply changes (copy files from LOOM to Kindler)
./scripts/sync-to-kindler.sh --apply

# Apply + commit + push Kindler
./scripts/sync-to-kindler.sh --apply --push
```

What gets synced:
- 43 shared route files (all routes except PvP, guilds, dynasty, governance, survey-corps, ascendancy, crafting)
- Core bootstrap files (main.ts, main-bootstrap.ts, etc.)
- Three fabric directories: loom-core, nakama-fabric, shuttle (via `sync_dir`)
- silfen-bridge fabric
- Select UE5 engine files (gRPC, audio, MetaHuman, Niagara, telemetry, world streaming, Weave shader)

What is never synced to Kindler (LOOM-only):
- `src/routes/pvp.ts`
- `src/routes/guilds.ts`
- `src/routes/dynasty.ts`
- `src/routes/governance.ts`
- `src/routes/survey-corps.ts`
- `src/routes/realm.ts`
- `src/routes/ascendancy.ts`
- `src/routes/crafting.ts`

What is never overwritten in Kindler (Kindler-only):
- `src/routes/parent-dashboard.ts` — Kindler COPPA version differs
- `src/routes/curriculum.ts` — Kindler curriculum standards
- `src/routes/kindler.ts` — Kindler-specific guide logic

---

## Python ML Pipelines

Pipelines are in `pipelines/`. Install Python dependencies:

```bash
cd pipelines
pip install -r requirements.txt
```

| Script | Purpose | Run condition |
|---|---|---|
| `npc_tier3_llm.py` | Tier 3 LLM dialogue pipeline — 8 NPC archetypes | Server-side, called by shuttle fabric |
| `npc_behavior_training.py` | RandomForest → ONNX behavior model training | Run to retrain; output consumed by ml-pipeline.ts |
| `procedural_generation.py` | Procedural content generation | Called by world generator |
| `world_gen_automation.py` | World generation automation | Batch world creation |
| `character_prompt_builder.py` | Portrait prompt construction | Part of portrait pipeline |
| `character_t2i_service.py` | fal.ai FLUX Pro image generation | Part of portrait pipeline |
| `fal_ai_adapter.py` | fal.ai API adapter | Utility, used by other scripts |

---

## Docker and Kubernetes

### Local dev with docker-compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

`docker-compose.yml` starts: PostgreSQL, Redis, Nakama (see `nakama.yml` for Nakama config).

### Kubernetes (production/staging)

Manifests in `k8s/`:
- `namespace.yml` — namespace definition
- `deployment.yml` — Loom server deployment
- `postgres.yml` — PostgreSQL StatefulSet
- `redis.yml` — Redis deployment
- `nakama.yml` — Nakama deployment
- `ingress.yml` — Ingress rules
- `secrets.yml` — Secret references
- `config.yml` — ConfigMap
- `monitoring.yml` — Prometheus/Grafana
- `alerts.yml` — Alertmanager rules
- `multi-region.yml` — Multi-region configuration with Istio, HPA, PDB

CI/CD pipeline: GitHub Actions — typecheck → lint → test → docker build → k8s gate.

---

## Temporal.io Workflows

Temporal workflows drive long-running NPC and world processes. The worker runs in `fabrics/shuttle/src/temporal-worker.ts`.

For local development, Temporal Server must be running. The simplest approach:

```bash
# Start Temporal dev server (requires Temporal CLI)
temporal server start-dev
```

Then the shuttle worker will connect automatically when the Loom server starts.

---

## Known Tech Debt

| Issue | Location | Priority | Notes |
|---|---|---|---|
| 1,246 lint violations | All fabrics | P1 | Primarily `max-lines-per-function` (~580), `no-unnecessary-type-assertion` (~190), `no-unused-vars` (~180) |
| Rate limiter TTL cleanup | dye-house | P1 | Window state accumulates without TTL expiry |
| MAX_MESSAGE_SIZE_BYTES not enforced | selvage transport | P1 | Security: enforce before JSON.parse |
| Zod validation missing on some selvage boundaries | selvage | P2 | Security hardening |

See `ROADMAP.md` Phase 7 for the complete list.
