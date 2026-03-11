/**
 * Nakama Fabric Orchestrator — The connective tissue.
 *
 * Ties presence, dynasty continuity, lattice integrity, and chronicle
 * recording into a unified per-tick cycle. This is the top-level
 * orchestrator for the nakama-fabric — the service that makes all
 * isolated systems coherent.
 *
 * Per tick:
 *   1. Sweep idle presences
 *   2. Evaluate dynasty continuity transitions (delegates to ContinuityOrchestrator)
 *   3. Compute per-world activity from active presences
 *   4. Adjust lattice integrity based on world activity
 *   5. Record chronicle entries for integrity changes
 *
 * The orchestrator never makes policy decisions — each system owns
 * its own rules. This service is purely sequencing and wiring.
 */

// ─── Port Interfaces ────────────────────────────────────────────────

export interface FabricPresencePort {
  sweepIdle(): number;
  listInWorld(worldId: string): ReadonlyArray<FabricPresenceRecord>;
  getStats(): FabricPresenceStats;
}

export interface FabricPresenceRecord {
  readonly dynastyId: string;
  readonly worldId: string | undefined;
}

export interface FabricPresenceStats {
  readonly onlineCount: number;
  readonly idleCount: number;
}

export interface FabricContinuityPort {
  tick(): FabricContinuityTickResult;
}

export interface FabricContinuityTickResult {
  readonly transitions: ReadonlyArray<FabricContinuityTransition>;
  readonly auctionsCreated: number;
  readonly auctionsCompleted: number;
  readonly chronicleEntries: number;
}

export interface FabricContinuityTransition {
  readonly dynastyId: string;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
}

export interface FabricLatticePort {
  listWorlds(): ReadonlyArray<string>;
  getIntegrity(worldId: string): number;
  restore(worldId: string, amount: number, reason: string): FabricIntegrityChange;
  degrade(worldId: string, amount: number, reason: string): FabricIntegrityChange;
}

export interface FabricIntegrityChange {
  readonly worldId: string;
  readonly previousIntegrity: number;
  readonly newIntegrity: number;
}

export interface FabricChroniclePort {
  append(entry: FabricChronicleEntry): string;
}

export interface FabricChronicleEntry {
  readonly category: string;
  readonly worldId: string;
  readonly subject: string;
  readonly content: string;
}

export interface FabricMortalityPort {
  readonly processTransitions: (transitions: ReadonlyArray<FabricContinuityTransition>) => number;
}

export interface FabricClockPort {
  readonly nowMicroseconds: () => number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface NakamaOrchestratorConfig {
  readonly restorePerPlayer: number;
  readonly degradeEmptyWorld: number;
  readonly minPlayersForRestore: number;
}

const DEFAULT_NAKAMA_ORCHESTRATOR_CONFIG: NakamaOrchestratorConfig = {
  restorePerPlayer: 0.01,
  degradeEmptyWorld: 0.005,
  minPlayersForRestore: 1,
};

// ─── Deps ───────────────────────────────────────────────────────────

export interface NakamaOrchestratorDeps {
  readonly presence: FabricPresencePort;
  readonly continuity: FabricContinuityPort;
  readonly lattice: FabricLatticePort;
  readonly chronicle: FabricChroniclePort;
  readonly clock: FabricClockPort;
  readonly mortality?: FabricMortalityPort;
}

// ─── Result Types ───────────────────────────────────────────────────

export interface NakamaTickResult {
  readonly idleSwept: number;
  readonly continuityTransitions: number;
  readonly auctionsCreated: number;
  readonly auctionsCompleted: number;
  readonly integrityChanges: number;
  readonly chronicleEntries: number;
  readonly mortalityNotifications: number;
  readonly tickNumber: number;
}

export interface WorldActivitySummary {
  readonly worldId: string;
  readonly activePlayers: number;
  readonly integrity: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface NakamaFabricOrchestrator {
  readonly tick: () => NakamaTickResult;
  readonly getTickCount: () => number;
  readonly getWorldActivity: () => ReadonlyArray<WorldActivitySummary>;
}

// ─── State ──────────────────────────────────────────────────────────

interface OrchestratorState {
  readonly deps: NakamaOrchestratorDeps;
  readonly config: NakamaOrchestratorConfig;
  tickCount: number;
  lastWorldActivity: ReadonlyArray<WorldActivitySummary>;
}

// ─── Factory ────────────────────────────────────────────────────────

function createNakamaOrchestrator(
  deps: NakamaOrchestratorDeps,
  config?: Partial<NakamaOrchestratorConfig>,
): NakamaFabricOrchestrator {
  const state: OrchestratorState = {
    deps,
    config: { ...DEFAULT_NAKAMA_ORCHESTRATOR_CONFIG, ...config },
    tickCount: 0,
    lastWorldActivity: [],
  };

  return {
    tick: () => orchestratorTick(state),
    getTickCount: () => state.tickCount,
    getWorldActivity: () => state.lastWorldActivity,
  };
}

// ─── Tick Implementation ────────────────────────────────────────────

function orchestratorTick(state: OrchestratorState): NakamaTickResult {
  state.tickCount += 1;

  const idleSwept = state.deps.presence.sweepIdle();
  const continuityResult = state.deps.continuity.tick();
  const mortalityNotifs = dispatchMortality(state, continuityResult);
  const activity = computeWorldActivity(state);
  const integrityResult = adjustLatticeIntegrity(state, activity);

  state.lastWorldActivity = activity;

  return buildTickResult(state, idleSwept, continuityResult, integrityResult, mortalityNotifs);
}

function dispatchMortality(
  state: OrchestratorState,
  continuity: FabricContinuityTickResult,
): number {
  if (state.deps.mortality === undefined) return 0;
  if (continuity.transitions.length === 0) return 0;
  return state.deps.mortality.processTransitions(continuity.transitions);
}

function buildTickResult(
  state: OrchestratorState,
  idleSwept: number,
  continuity: FabricContinuityTickResult,
  integrity: IntegrityAdjustResult,
  mortalityNotifications: number,
): NakamaTickResult {
  return {
    idleSwept,
    continuityTransitions: continuity.transitions.length,
    auctionsCreated: continuity.auctionsCreated,
    auctionsCompleted: continuity.auctionsCompleted,
    integrityChanges: integrity.changesApplied,
    chronicleEntries: continuity.chronicleEntries + integrity.chronicleEntries,
    mortalityNotifications,
    tickNumber: state.tickCount,
  };
}

// ─── World Activity ─────────────────────────────────────────────────

function computeWorldActivity(state: OrchestratorState): WorldActivitySummary[] {
  const worlds = state.deps.lattice.listWorlds();
  return worlds.map((worldId) => buildWorldSummary(state, worldId));
}

function buildWorldSummary(state: OrchestratorState, worldId: string): WorldActivitySummary {
  const players = state.deps.presence.listInWorld(worldId);
  const integrity = state.deps.lattice.getIntegrity(worldId);
  return { worldId, activePlayers: players.length, integrity };
}

// ─── Lattice Integrity ──────────────────────────────────────────────

interface IntegrityAdjustResult {
  readonly changesApplied: number;
  readonly chronicleEntries: number;
}

function adjustLatticeIntegrity(
  state: OrchestratorState,
  activity: ReadonlyArray<WorldActivitySummary>,
): IntegrityAdjustResult {
  let changes = 0;
  let chronicles = 0;

  for (const world of activity) {
    const result = adjustWorldIntegrity(state, world);
    changes += result.changed ? 1 : 0;
    chronicles += result.chronicled ? 1 : 0;
  }

  return { changesApplied: changes, chronicleEntries: chronicles };
}

interface WorldAdjustResult {
  readonly changed: boolean;
  readonly chronicled: boolean;
}

function adjustWorldIntegrity(
  state: OrchestratorState,
  world: WorldActivitySummary,
): WorldAdjustResult {
  if (world.activePlayers >= state.config.minPlayersForRestore) {
    return applyRestore(state, world);
  }
  if (world.activePlayers === 0) {
    return applyDegrade(state, world);
  }
  return { changed: false, chronicled: false };
}

function applyRestore(state: OrchestratorState, world: WorldActivitySummary): WorldAdjustResult {
  const amount = state.config.restorePerPlayer * world.activePlayers;
  if (world.integrity >= 100) return { changed: false, chronicled: false };

  const reason = String(world.activePlayers) + ' active players restoring lattice';
  const change = state.deps.lattice.restore(world.worldId, amount, reason);
  const chronicled = recordIntegrityChange(state, change, 'restore');

  return { changed: true, chronicled };
}

function applyDegrade(state: OrchestratorState, world: WorldActivitySummary): WorldAdjustResult {
  if (world.integrity <= 0) return { changed: false, chronicled: false };

  const reason = 'Empty world lattice degradation';
  const change = state.deps.lattice.degrade(world.worldId, state.config.degradeEmptyWorld, reason);
  const chronicled = recordIntegrityChange(state, change, 'degrade');

  return { changed: true, chronicled };
}

// ─── Chronicle ──────────────────────────────────────────────────────

function recordIntegrityChange(
  state: OrchestratorState,
  change: FabricIntegrityChange,
  direction: 'restore' | 'degrade',
): boolean {
  const delta = Math.abs(change.newIntegrity - change.previousIntegrity);
  if (delta < 0.001) return false;

  state.deps.chronicle.append({
    category: 'world.integrity',
    worldId: change.worldId,
    subject: change.worldId,
    content: buildIntegrityContent(change, direction),
  });
  return true;
}

function buildIntegrityContent(
  change: FabricIntegrityChange,
  direction: 'restore' | 'degrade',
): string {
  const prev = change.previousIntegrity.toFixed(1);
  const next = change.newIntegrity.toFixed(1);
  return 'Lattice integrity ' + direction + ': ' + prev + ' → ' + next;
}

// ─── Exports ────────────────────────────────────────────────────────

export { createNakamaOrchestrator, DEFAULT_NAKAMA_ORCHESTRATOR_CONFIG };
