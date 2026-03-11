# Agent Session State — Project Loom Build Sprint

## Last Updated: 2026-03-09

## Current Branch

`claude/upbeat-hugle` — working in worktree at `/Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle`

## Latest Commit

```
8cdf0a4 feat(all-fabrics): add Wave 6-7 modules — 12 new engines across 6 fabrics
```

## Current Stats

- **Lines of code**: 148,093 (pre-Wave 8)
- **Tests**: 5,043 passing across 264 files
- **Target**: 200,000 lines
- **Gap**: ~52,000 lines needed
- **TypeScript build**: CLEAN
- **ESLint**: CLEAN
- **Prettier**: CLEAN

## Wave 8 Status: IN PROGRESS (2026-03-09)

### Completed

- **nakama-fabric + archive** (Agent tool): 4 modules, 112 tests DONE
  - dynasty-heritage.ts (337 lines, 30 tests)
  - tax-collection.ts (324 lines, 25 tests)
  - dynasty-reputation-global.ts (360 lines, 25 tests)
  - genealogy-tree.ts in archive (554 lines, 32 tests)

### Running (claude -p PIDs — may still be running or may have finished)

- **silfen-weave** (PID 13977): world-discovery, transit-capacity, weave-event-bus
  - Log: `/tmp/loom-wave8-prompts/agent-silfen.log`
- **shuttle** (PID 13978): npc-migration, npc-crafting-ai, npc-knowledge
  - Log: `/tmp/loom-wave8-prompts/agent-shuttle.log`
- **loom-core** (PID 13979): terrain-erosion, day-night-cycle, entity-influence, event-stream
  - Log: `/tmp/loom-wave8-prompts/agent-loom-core.log`
- **selvage + dye-house + inspector** (PID 13980): load-balancer, request-deduplicator, access-log, ip-filter, trace-collector, sla-monitor
  - Log: `/tmp/loom-wave8-prompts/agent-infra.log`

### Prompt Files (reusable)

All prompts saved at `/tmp/loom-wave8-prompts/agent-{silfen,shuttle,loom-core,infra}.txt`
Spawn with: `env -u CLAUDECODE claude --dangerously-skip-permissions --model claude-sonnet-4-5 -p < prompt.txt`

## What To Do When Resuming

1. Check if CLI agents finished: `ps aux | grep "claude-sonnet-4-5" | grep -v grep`
2. Check logs: `tail -20 /tmp/loom-wave8-prompts/agent-*.log`
3. Verify files were written to fabrics/\*/src/
4. If agents died without writing files, re-run prompts from /tmp/loom-wave8-prompts/
5. Update all index.ts barrel files with new exports (alias conflicting names)
6. Run `npx tsc --build` from worktree — fix any type errors
7. Run `npx vitest run --exclude '.claude/worktrees/**'` — all tests must pass
8. Run `npx prettier --write .` — format everything
9. Commit with conventional commit format
10. Check line count — if still under 200K, plan Wave 9
11. Merge `claude/upbeat-hugle` to `main`

---

## TODO LIST

### [ ] TODO 1 — Clean up stale agent worktrees

Run this exact command:

```bash
cd /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle
for d in .claude/worktrees/agent-*/; do
  git worktree remove "$d" --force 2>/dev/null || true
  git branch -D "$(basename $d)" 2>/dev/null || true
done
```

Verify with `ls .claude/worktrees/` — only `upbeat-hugle` should remain.

---

### [ ] TODO 2 — Build Wave 8 modules (20 modules across 6 fabrics)

Launch 6 parallel background agents using `isolation: worktree`. Each agent builds
3-4 modules: source file + test file for each. All agents work simultaneously.

**Agent A — nakama-fabric (3 modules):**

- `fabrics/nakama-fabric/src/dynasty-heritage.ts` — Lineage tracking, inheritance rules, heritage bonuses per ancestor chain. Factory: `createDynastyHeritageService`. 40+ tests.
- `fabrics/nakama-fabric/src/tax-collection.ts` — Progressive tax tiers, commons fund contribution, levy scheduling. Factory: `createTaxCollectionService`. 40+ tests.
- `fabrics/nakama-fabric/src/dynasty-reputation-global.ts` — Cross-world dynasty reputation aggregation, weighted by world prestige. Factory: `createDynastyReputationGlobalService`. 40+ tests.

**Agent B — silfen-weave (3 modules):**

- `fabrics/silfen-weave/src/world-discovery.ts` — Survey Corps world unlock progression, discovery states (UNKNOWN/SURVEYED/CHARTED/OPEN). Factory: `createWorldDiscoveryService`. 40+ tests.
- `fabrics/silfen-weave/src/transit-capacity.ts` — Corridor throughput limits, congestion levels, queue overflow handling. Factory: `createTransitCapacityService`. 40+ tests.
- `fabrics/silfen-weave/src/weave-event-bus.ts` — Cross-world event propagation through Lattice corridors, fan-out routing. Factory: `createWeaveEventBusService`. 40+ tests.

**Agent C — shuttle (3 modules):**

- `fabrics/shuttle/src/npc-migration.ts` — NPC population movement between worlds, migration triggers, quota management. Factory: `createNpcMigrationService`. 40+ tests.
- `fabrics/shuttle/src/npc-crafting-ai.ts` — NPC crafting decisions, resource prioritisation, skill-based output. Factory: `createNpcCraftingAiService`. 40+ tests.
- `fabrics/shuttle/src/npc-knowledge.ts` — NPC information sharing, rumour propagation, knowledge decay. Factory: `createNpcKnowledgeService`. 40+ tests.

**Agent D — loom-core (4 modules):**

- `fabrics/loom-core/src/terrain-erosion.ts` — Terrain modification over time, player-impact accumulation, restoration rates. Factory: `createTerrainErosionService`. 40+ tests.
- `fabrics/loom-core/src/day-night-cycle.ts` — World time progression (microsecond precision), lighting state machine (DAWN/DAY/DUSK/NIGHT). Factory: `createDayNightCycleService`. 40+ tests.
- `fabrics/loom-core/src/entity-influence.ts` — Entity area-of-effect zones, influence radius, overlap resolution. Factory: `createEntityInfluenceService`. 40+ tests.
- `fabrics/loom-core/src/event-stream.ts` — Persistent event streaming, replay buffer, subscriber fan-out. Factory: `createEventStreamService`. 40+ tests.

**Agent E — archive + selvage (4 modules):**

- `fabrics/archive/src/genealogy-tree.ts` — Dynasty family tree, ancestor/descendant queries, lineage depth. Factory: `createGenealogyTreeService`. 40+ tests.
- `fabrics/archive/src/timeline-index.ts` — Indexed timeline queries by world/era/category, range scans. Factory: `createTimelineIndexService`. 40+ tests.
- `fabrics/selvage/src/load-balancer.ts` — Request distribution across service instances, health-aware routing. Factory: `createLoadBalancerService`. 40+ tests.
- `fabrics/selvage/src/request-deduplicator.ts` — Idempotent request handling, dedup cache with TTL. Factory: `createRequestDeduplicatorService`. 40+ tests.

**Agent F — dye-house + inspector (4 modules):**

- `fabrics/dye-house/src/access-log.ts` — Security audit trail, access pattern analysis, anomaly flags. Factory: `createAccessLogService`. 40+ tests.
- `fabrics/dye-house/src/ip-filter.ts` — IP-based access control, CIDR matching, geo-block rules. Factory: `createIpFilterService`. 40+ tests.
- `fabrics/inspector/src/trace-collector.ts` — Distributed tracing, span correlation, trace tree assembly. Factory: `createTraceCollectorService`. 40+ tests.
- `fabrics/inspector/src/sla-monitor.ts` — SLA compliance tracking, degradation alerts, breach reporting. Factory: `createSlaMonitorService`. 40+ tests.

**Rules every agent must follow (non-negotiable):**

- No `any` — TypeScript strict mode throughout
- Functions under 30 lines (source) / 60 lines (test)
- No template literals — use `'text ' + String(num)` for string concat with numbers
- BigInt for all KALON currency values
- Guard every array access: `const x = arr[i]; if (x === undefined) return 'not-found';`
- Errors returned as string literal unions, never thrown
- No nesting deeper than 3 levels
- Each fabric defines its own port interfaces — NEVER import from other fabrics
- State extraction pattern: factory creates state object, module-level functions take state as first param
- Test file goes in `fabrics/<fabric>/src/__tests__/<module>.test.ts`

---

### [ ] TODO 3 — Copy agent files into main worktree

For each completed agent worktree, copy its new source and test files into the
main worktree at `/Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle`.

For each agent worktree in `.claude/worktrees/agent-*/`:

1. Identify new `.ts` files that don't exist in main worktree
2. `cp` them to the correct path in the main worktree
3. Skip any files that already exist in main worktree

---

### [ ] TODO 4 — Update all index.ts barrel files

For each fabric that received new modules, add exports to its `src/index.ts`.

Follow the alias pattern for any name conflicts:

```typescript
export type { SomeType as AliasedType } from './module.js';
```

Fabrics to update:

- `fabrics/nakama-fabric/src/index.ts` — add dynasty-heritage, tax-collection, dynasty-reputation-global
- `fabrics/silfen-weave/src/index.ts` — add world-discovery, transit-capacity, weave-event-bus
- `fabrics/shuttle/src/index.ts` — add npc-migration, npc-crafting-ai, npc-knowledge
- `fabrics/loom-core/src/index.ts` — add terrain-erosion, day-night-cycle, entity-influence, event-stream
- `fabrics/archive/src/index.ts` — add genealogy-tree, timeline-index
- `fabrics/selvage/src/index.ts` — add load-balancer, request-deduplicator
- `fabrics/dye-house/src/index.ts` — add access-log, ip-filter
- `fabrics/inspector/src/index.ts` — add trace-collector, sla-monitor

---

### [ ] TODO 5 — TypeScript build

```bash
cd /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle
npx tsc --build
```

Fix ALL errors before proceeding. Zero tolerance. Common issues:

- Old exports referenced that no longer exist → update imports
- Name conflicts in barrel files → add `as` aliases
- Array access without guard → add `if (x === undefined)` check
- Template literal → convert to string concat

---

### [ ] TODO 6 — Full test suite

```bash
cd /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle
npx vitest run --exclude '.claude/worktrees/agent-*/**'
```

All tests must pass. Fix any failures before proceeding.

---

### [ ] TODO 7 — Prettier format

```bash
cd /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle
npx prettier --write .
```

---

### [ ] TODO 8 — Commit

```bash
cd /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle
rm -f .git/index.lock
git add -A
git commit -m "feat(all-fabrics): add Wave 8 — 20 new modules across 6 fabrics

- nakama-fabric: dynasty-heritage, tax-collection, dynasty-reputation-global
- silfen-weave: world-discovery, transit-capacity, weave-event-bus
- shuttle: npc-migration, npc-crafting-ai, npc-knowledge
- loom-core: terrain-erosion, day-night-cycle, entity-influence, event-stream
- archive: genealogy-tree, timeline-index
- selvage: load-balancer, request-deduplicator
- dye-house: access-log, ip-filter
- inspector: trace-collector, sla-monitor

Thread: carbon
Tier: 1

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### [ ] TODO 9 — Check line count

```bash
find /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle \
  -path '*/node_modules' -prune -o \
  -path '*/.claude/worktrees/agent-*' -prune -o \
  -path '*/dist/*' -prune -o \
  -type f \( -name '*.ts' -o -name '*.js' -o -name '*.json' -o -name '*.md' -o -name '*.yml' \) \
  -print | xargs wc -l 2>/dev/null | tail -1
```

If total < 200,000 lines → proceed to TODO 10.
If total >= 200,000 lines → proceed to TODO 11.

---

### [ ] TODO 10 — Wave 9 (if still under 200K)

Plan and build another wave of modules to close the gap. Suggested modules:

**nakama-fabric:** political-influence, dynasty-espionage, black-market, contraband-registry
**silfen-weave:** wormhole-stabiliser, lattice-repair, corridor-economics, transit-insurance-v2
**shuttle:** npc-government, npc-religion, npc-philosophy, npc-art-culture
**loom-core:** procedural-quest, dungeon-generator, loot-table, spawn-budget
**archive:** lore-compendium, world-atlas, faction-history, character-biography
**selvage:** websocket-gateway, grpc-bridge, sse-stream, api-doc-generator
**dye-house:** zero-trust-engine, oauth-provider, certificate-manager, secrets-rotation
**inspector:** chaos-engineer, load-tester, regression-detector, cost-analyser

Follow the exact same pattern as TODO 2-8 for each wave.
Keep building until line count >= 200,000.

---

### [ ] TODO 11 — Final cleanup and merge prep

1. Remove all stale agent worktrees:

```bash
for d in /Users/robertwaltos/loom/.claude/worktrees/upbeat-hugle/.claude/worktrees/agent-*/; do
  git worktree remove "$d" --force 2>/dev/null || true
done
```

2. Run full quality gate one final time:

```bash
npx tsc --build && npx vitest run --exclude '.claude/worktrees/agent-*/**' && npx prettier --check .
```

3. Update `.claude/agents.md` with final stats (line count, test count, modules built).

4. Push branch to remote:

```bash
git push origin claude/upbeat-hugle
```

---

## Architecture Reference

### State Extraction Pattern

```typescript
interface ModuleDeps {
  readonly clock: { nowMicroseconds: () => bigint };
  readonly idGen: { generate: () => string };
}

interface ModuleState {
  readonly items: Map<string, Item>;
  count: number;
}

export function createModuleService(deps: ModuleDeps): ModuleService {
  const state: ModuleState = { items: new Map(), count: 0 };
  return {
    addItem: (params) => addItem(state, deps, params),
    getStats: () => getStats(state),
  };
}

function addItem(state: ModuleState, deps: ModuleDeps, params: AddItemParams): AddItemResult {
  const id = deps.idGen.generate();
  const now = deps.clock.nowMicroseconds();
  const item: Item = { id, createdAt: now, ...params };
  state.items.set(id, item);
  state.count += 1;
  return { item };
}

function getStats(state: ModuleState): ModuleStats {
  return { total: state.count };
}
```

### String Concat (no template literals)

```typescript
// WRONG: `Hello ${name}, you have ${count} items`
// RIGHT:
const msg = 'Hello ' + name + ', you have ' + String(count) + ' items';
```

### Array Access Guard

```typescript
// WRONG: return arr[0].name
// RIGHT:
const first = arr[0];
if (first === undefined) return 'empty';
return first.name;
```

### Port Interface (define locally, never import from other fabric)

```typescript
// Each module defines its own minimal ports
interface MyModuleClockPort {
  readonly nowMicroseconds: () => bigint;
}
interface MyModuleIdPort {
  readonly generate: () => string;
}
interface MyModuleDeps {
  readonly clock: MyModuleClockPort;
  readonly idGen: MyModuleIdPort;
}
```

### Error Pattern

```typescript
type MyError = 'not-found' | 'already-exists' | 'invalid-state' | 'forbidden';
type MyResult = { readonly ok: true; value: Thing } | { readonly ok: false; error: MyError };
```

### Barrel Export Aliasing

```typescript
// In index.ts — when two modules export the same name:
export type { ResultType as ModuleAResult } from './module-a.js';
export type { ResultType as ModuleBResult } from './module-b.js';
```
