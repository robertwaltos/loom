# Koydo Worlds (Loom) — Development Guide

> Created: 2026-03-18
> Audience: Founder, Engineering
> Purpose: Complete instruction set for running, developing, testing, and deploying the Loom backend

---

## What This Is

The Loom is the authoritative game server and world simulation engine for Koydo Worlds — a multiplayer educational game built on UE5. It runs as a standalone TypeScript/Node.js server, manages all game state, serves UE5 rendering clients over gRPC, and exposes a REST/WebSocket API for web clients.

**This is separate from Koydo Learn** (`D:/pythonprojects/koydo`). Loom is the game backend. Learn is the web app.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict, ES2023, no `any`) |
| HTTP/WS server | Fastify |
| gRPC (UE5 bridge) | `@grpc/grpc-js` |
| Game backend | Nakama 3.22 |
| Database | PostgreSQL 16 + TimescaleDB |
| Cache | Redis 7 |
| Job orchestration | Temporal |
| Observability | Prometheus + OpenTelemetry + Grafana |
| ML pipelines | Python 3.11+ (scikit-learn, httpx, fastapi) |
| UE5 plugin | C++ (BridgeLoom GameFeature plugin) |
| Infrastructure | Docker (local), Kubernetes (production) |
| Wire format | FlatBuffers + MessagePack (binary, not JSON on hot paths) |

---

## Prerequisites

```bash
# Required
node --version    # 22+
docker --version  # 24+
python3 --version # 3.11+

# Optional (UE5 only)
# Unreal Engine 5.5 via Epic Games Launcher
# Visual Studio 2022 (Windows) or Xcode 15 (macOS)
```

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/robertwaltos/Koydo_Loom.git
cd Koydo_Loom
npm install
```

### 2. Start the full local stack

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`
- Nakama 3.22 on `localhost:7349` (HTTP), `7350` (console), `7351` (gRPC)
- Loom server on `localhost:8080` (HTTP+WS), `50051` (gRPC)
- OpenTelemetry collector (optional tracing)

### 3. Run database migrations

```bash
npm run db:migrate
```

Applies all 19 migrations in `db/migrations/` in order.

### 4. Seed world data

```bash
npm run db:seed
```

Seeds all 50 worlds with initial luminance (0–100), guide assignments, and threadway connections.

### 5. Start development server (hot reload)

```bash
npm run dev
```

Watches `src/` and `fabrics/*/src/` — restarts on change.

---

## Run Commands Reference

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript → dist/
npm run start            # Run compiled dist/ in production mode

# Database
npm run db:migrate       # Apply pending migrations
npm run db:seed          # Seed world data
npm run db:reset         # Drop and re-migrate (destructive — dev only)

# Testing
npm run test             # Run all tests (vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (95%+ required)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only

# Code quality
npm run typecheck        # TypeScript strict check (no emit)
npm run lint             # ESLint (zero warnings policy)
npm run format           # Prettier check
npm run format:fix       # Prettier auto-fix

# Docker
docker compose up -d         # Start all services
docker compose down          # Stop all services
docker compose logs loom     # View Loom server logs
docker compose ps            # Check service health

# Load testing
npm run load-test            # k6 load test scenarios
```

---

## Architecture Overview

### Fabric System

The codebase is organized into 8 independent Fabrics (modules). **No fabric imports another fabric directly** — all communication is via typed events on the event bus.

```
contracts/          ← Shared interfaces (read-only — never modify without coordination)
  bridge-loom/      ← Rendering engine interface
  events/           ← 82+ typed event definitions
  entities/         ← 50+ component schemas
  protocols/        ← FlatBuffers + MessagePack wire formats

fabrics/            ← 8 independent modules
  loom-core/        ← ECS, tick loop (< 0.5ms), event bus, world state
  shuttle/          ← NPC orchestration (40+ subsystems via Temporal)
  silfen-weave/     ← World transitions, lattice transit
  nakama-fabric/    ← Economy (KALON), crafting, trading, governance
  archive/          ← Event sourcing, chronicle, genealogy
  selvage/          ← API gateway (Fastify + gRPC transport)
  dye-house/        ← Auth + encryption (XChaCha20-Poly1305)
  inspector/        ← Metrics, health probes, SLA monitoring
  bridge-loom-ue5/  ← C++ UE5 plugin (separate — C++ compilation)

src/                ← Main application (36 API routes)
pipelines/          ← 7 Python ML scripts
db/migrations/      ← 19 PostgreSQL migrations
```

### Event Flow

```
Player action (UE5 client)
  → gRPC transport (selvage)
  → Event bus (loom-core)
  → Relevant fabric handlers
  → State update (PostgreSQL/Redis)
  → Replication event emitted
  → UE5 client receives delta update
```

### Performance Targets

| Metric | Target | Measured |
|--------|--------|---------|
| Tick loop | < 0.5ms | ✅ |
| API latency | < 50ms p99 | ✅ |
| Event bus throughput | > 100K events/sec | ✅ |
| DB query p99 | < 10ms | ✅ |
| Concurrent players | 1,000+ per node | ✅ (load tested) |

---

## Python ML Pipelines

```bash
cd pipelines/

# Install dependencies
pip install -r requirements.txt

# World generation
python world_gen_automation.py --world-id <uuid> --output output/worlds/

# NPC behavior model training
python npc_behavior_training.py --output models/ --epochs 100

# Character portrait generation (requires FAL_API_KEY)
FAL_API_KEY=xxx python character_t2i_service.py

# Start the T2I FastAPI microservice
uvicorn character_t2i_service:app --host 0.0.0.0 --port 8090
```

### Pipeline reference

| Script | What it does | Input | Output |
|--------|-------------|-------|--------|
| `world_gen_automation.py` | Terrain, biomes, settlements, resources | world config | heightmap.npy + metadata.json |
| `procedural_generation.py` | Entity placement on terrain | heightmap | spawn manifest |
| `npc_tier3_llm.py` | Conversational AI for T3/T4 NPCs | conversation context | dialogue response |
| `npc_behavior_training.py` | Train NPC decision model | behavior data | RandomForest ONNX |
| `character_t2i_service.py` | FastAPI service for portrait generation | CharacterAppearance | portrait JPEG |
| `character_prompt_builder.py` | Structured appearance → FLUX prompt | CharacterAppearance | prompt string |
| `fal_ai_adapter.py` | Fal.ai queue API wrapper | prompt + config | CharacterImageResult |

---

## UE5 Plugin (bridge-loom-ue5)

The BridgeLoom plugin bridges UE5 to the Loom server via gRPC. **Requires Unreal Engine 5.5.**

```bash
# From UE5 project root
# 1. Copy or symlink fabrics/bridge-loom-ue5/ into your UE5 project Plugins/
# 2. Enable the plugin in .uproject:
{
  "Name": "BridgeLoom",
  "Enabled": true
}

# 3. Regenerate project files
# Right-click .uproject → Generate Visual Studio project files

# 4. Build in Unreal Editor:
# Tools → Compile → Build All
```

### gRPC endpoint
The plugin connects to `localhost:50051` by default (configurable in `BridgeLoom.ini`):
```ini
[BridgeLoom]
LoomServerHost=localhost
LoomServerPort=50051
ReconnectIntervalMs=2000
```

### Key plugin systems

| Header | Purpose |
|--------|---------|
| `BridgeLoomRenderer.h` | Time-of-day, weather, material params, LOD bias |
| `BridgeLoomWorldStreamer.h` | Chunk streaming, interest management, persistent state |
| `BridgeLoomCharacterVisuals.h` | MetaHuman sync, facial rig, emotion blend shapes |

### GameFeature components

| Component | Purpose |
|-----------|---------|
| `LoomDynastyComponent` | Dynasty genealogy UI |
| `LoomEconomyComponent` | KALON market, trading UI |
| `LoomGovernanceComponent` | Assembly voting, legislation |
| `LoomInteractionComponent` | World object interactions |

---

## Database

### Connection
```bash
# Local (docker compose)
DATABASE_URL=postgresql://loom:loom@localhost:5432/loom_dev

# Production — use environment variable, never hardcode
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/loom_prod?sslmode=require
```

### Key tables

| Table | Purpose |
|-------|---------|
| `kindler_profiles` | Child player profiles (COPPA-compliant) |
| `world_luminance` | The Fading state per world (0–100) |
| `kindler_progress` | Lesson completion tracking |
| `kindler_spark_log` | Spark award history |
| `real_world_entries` | 1000+ educational content entries |
| `ai_conversation_sessions` | AI chat (auto-deleted after 24h) |
| `session_reports` | Parent dashboard summaries |
| `parent_accounts` | Parent subscription tiers |
| `entry_curriculum_maps` | CCSS/NGSS alignment |
| `anti_cheat_violations` | Speed hack, teleport, rapid-fire detection |
| `quest_chains` | Multi-step quest state |
| `world_features` | Hidden zone discoveries |
| `notifications` | Push notification queue |

### Adding a migration

```bash
# Create a new migration file
touch db/migrations/0020_your_feature.sql

# Add standard header:
-- Migration: 0020_your_feature
-- Description: What this changes
-- Author: <name>
-- Date: YYYY-MM-DD

-- Apply migration
npm run db:migrate
```

---

## Nakama (Game Backend)

Nakama handles player sessions, matchmaking, social features, and economy primitives. The Loom server connects to Nakama as a client, extending it with custom game logic.

```bash
# Nakama console UI (admin)
open http://localhost:7350
# Default: admin / password (change in production!)

# Nakama API (HTTP)
curl http://localhost:7349/v2/healthcheck

# Nakama gRPC
grpc_cli ls localhost:7351
```

Nakama config: `nakama.yml`

---

## Testing

### Run all tests

```bash
npm run test
```

### Coverage requirements
- Statements: **95%+**
- Branches: **86%+**
- Functions: **90%+**

### Test structure

```
fabrics/<fabric>/src/__tests__/   ← Unit tests per fabric
src/__tests__/                    ← Integration tests for routes
```

### Writing tests

```typescript
// vitest — use describe/it/expect
import { describe, it, expect, beforeEach } from 'vitest'

describe('WorldLuminance', () => {
  it('restores luminance when lesson completed', async () => {
    // ...
  })
})
```

### Load testing

```bash
# Requires k6 installed
npm run load-test

# Scenarios defined in: tools/load-testing/
# 7 scenarios: burst, sustained, ramp-up, social-flood, economy, transition, mixed
```

---

## Observability

### Metrics (Prometheus)
```bash
# Metrics endpoint
curl http://localhost:8080/metrics

# Grafana dashboard (if running)
open http://localhost:3000
# Default: admin / admin
```

### Traces (OpenTelemetry)
```bash
# Jaeger UI (if running)
open http://localhost:16686
```

### Health probes
```bash
curl http://localhost:8080/health         # Liveness
curl http://localhost:8080/health/ready   # Readiness
curl http://localhost:8080/health/live    # Detailed status
```

---

## Deployment

### Staging (Docker)

```bash
# Build image
docker build -t loom:staging .

# Push to registry
docker tag loom:staging ghcr.io/robertwaltos/Koydo_Loom:staging
docker push ghcr.io/robertwaltos/Koydo_Loom:staging
```

### Production (Kubernetes)

Full runbook: `docs/LAUNCH-RUNBOOK.md`

```bash
# Apply K8s manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/nakama.yaml
kubectl apply -f k8s/loom.yaml

# Check deployment
kubectl -n loom get pods
kubectl -n loom logs -f deployment/loom-server

# Scale
kubectl -n loom scale deployment/loom-server --replicas=5
```

### Environment variables (production)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NAKAMA_HOST=nakama
NAKAMA_PORT=7349
NAKAMA_SERVER_KEY=<from nakama.yml>
NAKAMA_SERVER_PASSWORD=<secret>
OPENAI_API_KEY=<for NPC T3 dialogue>
FAL_API_KEY=<for character portraits>
LOOM_GRPC_PORT=50051
LOOM_HTTP_PORT=8080
NODE_ENV=production
```

---

## Multi-Agent Development Rules (CLAUDE.md)

When using AI agents to develop in this repo:

1. **One agent per Fabric** — Never two agents in the same Fabric simultaneously
2. **Contracts are read-only** — Never modify `contracts/` without full coordination
3. **No cross-Fabric imports** — Use events only, never `import` from another Fabric
4. **Branch naming** — `<thread-type>/<fabric>/<description>` (e.g. `shuttle/npc-memory/persistence`)
5. **Quality gates are non-negotiable** — TypeScript strict, 95% coverage, zero `any`, zero `console.log`
6. **Git worktrees for concurrency** — Each agent gets its own worktree under `.claude/worktrees/`
7. **Hexagonal architecture** — Business logic never imports infrastructure adapters

---

## Known Issues & Limitations

| Issue | Status | Workaround |
|-------|--------|-----------|
| MetaHuman facial rig sync incomplete | Phase 9 in progress | Use placeholder blend shapes |
| Voice synthesis for NPC dialogue | Not started | Text-only NPC responses |
| Mobile optimization | Not started | Desktop/web only |
| VR support | Future | Not planned for MVP |
| Offline mode | Designed, not implemented | Requires sync state management |
| Cross-console (PlayStation/Xbox) | Future | Desktop first |
