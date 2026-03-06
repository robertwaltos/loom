# Project Loom — The Silfen Weaver

## What This Is

A hyper-realistic experience orchestration engine built on UE5. The Loom owns world state, entity lifecycle, AI behavior, identity, economy, and seamless world transitions (The Silfen Weave). UE5 is the rendering fabric — a plugin, not the brain.

## Multi-Agent Operating Rules

### You Are One Thread In A Loom

Multiple AI agents work this repo simultaneously. Your actions must never break another agent's work.

### Zero-Conflict Rules

1. **Never modify files outside your assigned Fabric** without explicit coordination
2. **Contracts (`contracts/`) are read-only** unless you are specifically tasked with contract changes
3. **Use git worktrees** for all work: `git worktree add .claude/worktrees/<branch-name> -b <branch-name>`
4. **Commit to feature branches only** — never commit directly to `main`
5. **One agent per Fabric directory** at any time. Check `.claude/locks/` before starting work
6. **Keep commits atomic** — one logical change per commit

### Branch Naming

```
<thread-type>/<fabric>/<description>
```

Examples:

- `silk/selvage/add-rate-limiting`
- `steel/loom-core/entity-migration`
- `cotton/nakama-fabric/matchmaking-rooms`
- `carbon/loom-core/event-bus-optimization`
- `sentinel/dye-house/auth-tokens`
- `bridge/bridge-loom-ue5/grpc-setup`
- `scribe/docs/api-reference`

### Commit Format

```
<type>(<fabric>): <description>

[body]

Thread: <thread-type>
Tier: <0|1|2|3|R|M>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`

## The Ten Commandments

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

## Architecture Principles

- **Hexagonal (Ports & Adapters)**: Business logic never imports infrastructure
- **Event-driven**: Modules communicate through typed events, never direct calls
- **Plugin architecture**: Core is minimal, features are plugins
- **Binary protocols on hot paths**: FlatBuffers/MessagePack between Loom and UE5, never JSON
- **The Loom is invisible to the frame budget**: < 0.5ms per game thread tick
- **Design for the ceiling**: Store highest quality, serve what device can handle

## Directory Structure

```
contracts/          ← Shared interfaces. RARELY MODIFIED. Changes = breaking.
  bridge-loom/      ← Interface any rendering engine must implement
  events/           ← Event type definitions (the lingua franca)
  entities/         ← Entity component schemas
  protocols/        ← Wire protocol definitions

fabrics/            ← Independent modules. ONE AGENT PER FABRIC.
  loom-core/        ← The Loom: entity system, event bus, world state
  shuttle/          ← The Shuttle: AI agent orchestration (Temporal workflows)
  silfen-weave/     ← Seamless world transition orchestration
  nakama-fabric/    ← Identity, economy, matchmaking (wraps Nakama)
  bridge-loom-ue5/  ← UE5 C++ plugin: Bridge Loom implementation
  inspector/        ← Monitoring, metrics, quality control
  selvage/          ← API gateway, external interface
  dye-house/        ← Security, auth, encryption
  archive/          ← Document storage, state persistence

tools/              ← Build tools, code generation, scripts
tests/              ← Integration, E2E, perceptual tests
docs/               ← Architecture docs, game bible, API specs
```

## Tech Stack

- **TypeScript** (primary) — strict mode, no `any`, ES2023 target
- **Rust** (performance-critical) — event bus hot paths, binary serialization
- **C++** (UE5 plugin) — Bridge Loom, gRPC bridge
- **Python** (AI/ML) — NPC behavior training, procedural generation ML
- **Node.js 22+** — runtime for TypeScript services
- **npm workspaces** — monorepo management

## Key Dependencies (Approved)

- **Flecs** — Entity Component System (C, MIT)
- **Nakama** — Game backend (Go, Apache 2.0)
- **Temporal** — Workflow orchestration (Go, MIT)
- **Valve GameNetworkingSockets** — Networking transport (C++, BSD-3)
- **FlatBuffers** — Binary serialization (Apache 2.0)
- **Lyra patterns** — UE5 GameFeature Plugin architecture (Epic)

## Quality Gates (Every PR)

1. `npm run format` — Prettier
2. `npm run lint` — ESLint (zero warnings)
3. `npm run typecheck` — TypeScript strict (zero errors)
4. `npm run test` — All tests pass
5. Coverage ≥ 80% on changed files
6. No `any` types
7. No functions > 30 lines
8. No nesting > 3 levels
9. Security scan passes
10. AI cross-model review score ≥ 8/10
