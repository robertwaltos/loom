# OPUS2 — Agent Work Assignment

## Role

You are the **second agent** working the Loom repo in parallel with another agent (OPUS1).
Read `CLAUDE.md` before touching anything — it contains the Ten Commandments, architecture rules, and multi-agent operating rules.

**Your call sign is OPUS2. The other agent is OPUS1.**

## Golden Rule: Zero Overlap

You and OPUS1 work **different fabrics**. Never modify the same file. Never create tests in the other agent's assigned directories.

---

## Your Fabrics (OPUS2 owns these)

| Fabric | Untested Files | Lines | Priority |
|--------|---------------|-------|----------|
| **nakama-fabric** | 10 | 5,157 | 🔴 HIGH |
| **selvage** | 8 | 2,453 | 🔴 HIGH |
| **dye-house** | 5 | 1,945 | 🟡 MEDIUM |
| **inspector** | 4 | 1,573 | 🟡 MEDIUM |
| **archive** | 8 | 2,987 | 🟡 MEDIUM |
| **bridge-loom-ue5** (TS only) | 1 | 268 | 🟢 LOW |
| **silfen-weave** | 3 | 1,187 | 🟢 LOW |

**Total: 39 files, ~15,570 lines (~60% of remaining work)**

## OPUS1 Keeps (DO NOT TOUCH)

| Fabric | Files |
|--------|-------|
| **loom-core** | 23 files (8,870 lines) |
| **shuttle** | 6 files (3,319 lines) |

OPUS1 also has two in-progress test files already written:
- `fabrics/loom-core/src/__tests__/wallet-sync-system-simulation.test.ts` — being created
- `fabrics/loom-core/src/__tests__/respawn-system-simulation.test.ts` — being created

**Never create or modify anything under `fabrics/loom-core/` or `fabrics/shuttle/`.**

---

## Your Work Breakdown

### Phase 1: nakama-fabric (10 files — start here)

Write simulation tests for each file. Read the production code first, then create `*-simulation.test.ts` files in `fabrics/nakama-fabric/src/__tests__/`.

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `dynasty-legacy.ts` | 806 | Dynasty inheritance chains, legacy scoring. Large — do this first. |
| 2 | `competitive-pvp.ts` | 653 | PvP matchmaking, ranking, season system |
| 3 | `resource-exchange.ts` | 650 | KALON market, trade orders, price discovery |
| 4 | `witness-protocol.ts` | 641 | Hash-chain event witnessing (SACRED — hash chains must never break) |
| 5 | `economy-maturation.ts` | 631 | Economic evolution over server lifetime |
| 6 | `guild-expansion.ts` | 584 | Guild system, territory claims |
| 7 | `war-engine.ts` | 581 | Alliance warfare, battle resolution |
| 8 | `nakama-client.ts` | 364 | Nakama API adapter — mock the Nakama SDK |
| 9 | `kalon-errors.ts` | 166 | Error types — may be type-only, skip if no logic |
| 10 | `mortality-timings.ts` | 81 | Age/death timing calculations — pure logic, quick win |

### Phase 2: selvage (8 files)

Test files go in `fabrics/selvage/src/__tests__/`.

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `localization-engine.ts` | 771 | i18n string resolution, pluralisation, fallbacks |
| 2 | `esports-engine.ts` | 647 | Tournament brackets, scoring |
| 3 | `chat-channel-manager.ts` | 488 | Channel lifecycle, moderation integration |
| 4 | `grpc-transport.ts` | 212 | gRPC server setup — may need heavy mocking |
| 5 | `fastify-transport.ts` | 145 | HTTP transport — may need heavy mocking |
| 6 | `selvage-errors.ts` | 79 | Error types — skip if type-only |
| 7 | `connection.ts` | 60 | Connection state — likely small |
| 8 | `message-codec.ts` | 51 | Binary message encoding — pure logic |

### Phase 3: dye-house (5 files)

Test files go in `fabrics/dye-house/src/__tests__/`.

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `content-moderation.ts` | 637 | Content filtering (broader than chat-moderation) |
| 2 | `security-hardening.ts` | 636 | Rate limiting, input sanitization, CORS |
| 3 | `compliance-engine.ts` | 533 | GDPR, age verification, data retention |
| 4 | `sodium-encryption-backend.ts` | 104 | libsodium wrapper — mock the native binding |
| 5 | `node-hash-backend.ts` | 35 | Node.js crypto hashing — may be trivial |

### Phase 4: inspector (4 files)

Test files go in `fabrics/inspector/src/__tests__/`.

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `player-analytics.ts` | 762 | Session tracking, engagement metrics, cohort analysis |
| 2 | `chaos-engine.ts` | 524 | Fault injection for resilience testing |
| 3 | `prometheus-metrics.ts` | 184 | Metrics export — mock the prom-client |
| 4 | `otel-tracer.ts` | 103 | OpenTelemetry tracing — mock the SDK |

### Phase 5: archive (8 files)

Test files go in `fabrics/archive/src/__tests__/`.

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `remembrance-system.ts` | 709 | NPC memory persistence, recall scoring |
| 2 | `timeline-service.ts` | 592 | Event timeline queries, range operations |
| 3 | `timescale-store.ts` | 399 | TimescaleDB adapter — mock the DB driver |
| 4 | `sealed-chambers.ts` | 394 | Immutable chronicle storage (SACRED — never mutate) |
| 5 | `pg-persistence.ts` | 320 | PostgreSQL adapter — mock pg |
| 6 | `chat-archive.ts` | 277 | Chat history storage/retrieval |
| 7 | `pg-event-archive.ts` | 254 | Event sourcing archive |
| 8 | `chronicle-errors.ts` | 42 | Error types — skip if type-only |

### Phase 6: silfen-weave & bridge-loom-ue5 (4 files)

| # | File | Lines | Fabric | Notes |
|---|------|-------|--------|-------|
| 1 | `weave-network.ts` | 564 | silfen-weave | World graph, pathfinding between worlds |
| 2 | `world-expansion.ts` | 549 | silfen-weave | New world activation, resource allocation |
| 3 | `survey-pacing.ts` | 74 | silfen-weave | Exploration rate limiting — likely pure logic |
| 4 | `pixel-streaming.ts` | 268 | bridge-loom-ue5 | UE5 Pixel Streaming integration |

---

## Rules You Must Follow

1. **Branch**: Work on branch `silk/opus2/simulation-tests` — never commit to `main`
2. **Test filename convention**: `<production-file-name>-simulation.test.ts`
3. **Test pattern**: Read the source → create factory helpers with `make*()` functions → mock ports/deps inline → test all exported functions
4. **No `any`**: TypeScript strict mode, zero `any` types
5. **Mock, don't import infrastructure**: For files with DB/HTTP/gRPC deps, mock the port interfaces — never import real drivers
6. **Run each test file individually first**: `npx vitest run <path-to-test>` — fix failures before moving on
7. **Run full regression after each phase**: `npx vitest run` — all tests must pass (current baseline: 447 files, 11,454 tests)
8. **SACRED systems**: `witness-protocol.ts` hash chains and `sealed-chambers.ts` chronicles are append-only/immutable by design. Tests must verify immutability invariants.
9. **KALON amounts are bigint**: All economy values in micro-KALON. `1 KALON = 1_000_000n micro-KALON`. Use `bigint` literals.
10. **Skip type-only files**: If a file exports only interfaces/types with zero runtime logic, skip it and move to the next.

## Quality Gates (per test file)

- ≥ 15 tests per production file (more for files > 500 lines)
- Cover: happy path, edge cases, error conditions, boundary values
- No test interdependence — each `it()` block runs independently
- Factory helpers at the top, tests grouped by feature in `describe()` blocks

## How to Start

```bash
# 1. Read CLAUDE.md first
# 2. Verify current baseline
npx vitest run 2>&1 | Select-Object -Last 5

# 3. Start with the quickest win
# Read the file
cat fabrics/nakama-fabric/src/mortality-timings.ts

# 4. Write tests, run, fix, verify
npx vitest run fabrics/nakama-fabric/src/__tests__/mortality-timings-simulation.test.ts

# 5. Move to the next file in priority order
```

## Communication

- If you encounter a file that imports from a fabric you don't own, you may **read** it for context but **never modify** it.
- If a production file has a bug, document it in a comment in your test file (`// BUG: <description>`) and write the test to match current (buggy) behavior. Fixing production code in your fabrics is allowed; fixing it in OPUS1's fabrics is not.
- When done with a phase, update test count in a comment at the top of this file.

---

## Progress Tracker

Update these as you complete each phase:

- [x] Phase 1: nakama-fabric (10 files) — Tests: already written by prior run
- [x] Phase 2: selvage (8 files) — Tests: already written by prior run
- [x] Phase 3: dye-house (5 files) — Tests: already written by prior run
- [x] Phase 4: inspector (4 files) — Tests: already written by prior run
- [x] Phase 5: archive (8 files) — Tests: already written by prior run
- [x] Phase 6: silfen-weave + bridge (4 files) — Tests: 39 (pixel-streaming-simulation.test.ts)
- [x] Full regression: 893 files, 14,722 tests — ALL PASSING
