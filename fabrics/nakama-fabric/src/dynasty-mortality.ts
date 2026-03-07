/**
 * Dynasty Mortality Orchestrator — The living continuity protocol.
 *
 * Bible v1.1 Part 8, v1.4: "Before implementing any mechanic that touches
 * inactive dynasties, ask: what does this do to the player who logged in
 * once a month to write one Chronicle entry for someone they lost?"
 *
 * This service ties ContinuityEngine, DynastyRegistry, and EstateAuctionEngine
 * into a cohesive lifecycle. On each tick it:
 *   1. Evaluates all continuity records for inactivity transitions
 *   2. Syncs DynastyRegistry status (active/dormant/completed)
 *   3. Creates estate auctions when dynasties enter redistribution
 *   4. Evaluates active auction phases for time-gated advancement
 *   5. Completes redistribution when auctions finish
 *   6. Records Chronicle entries for all significant mortality events
 *
 * The orchestrator never makes policy decisions — the ContinuityEngine owns
 * the state machine, the EstateAuctionEngine owns the auction. This service
 * is purely the connective tissue.
 */

import type { ContinuityTransition, ContinuityState } from './dynasty-continuity.js';
import type { DynastyStatus } from './dynasty.js';

// ─── Port Interfaces ────────────────────────────────────────────────

export interface MortalityContinuityPort {
  evaluateAll(): ReadonlyArray<ContinuityTransition>;
  completeRedistribution(dynastyId: string): ContinuityTransition;
}

export interface MortalityDynastyPort {
  setStatus(dynastyId: string, status: DynastyStatus): void;
}

export interface MortalityAuctionPort {
  createAuction(auctionId: string, dynastyId: string): void;
  evaluatePhase(auctionId: string): MortalityPhaseResult | null;
}

export interface MortalityPhaseResult {
  readonly to: string;
}

export interface MortalityChroniclePort {
  append(entry: MortalityChronicleEntry): string;
}

export interface MortalityChronicleEntry {
  readonly category: string;
  readonly subject: string;
  readonly content: string;
  readonly worldId: string;
}

export interface MortalityIdGenerator {
  next(): string;
}

export interface DynastyMortalityDeps {
  readonly continuity: MortalityContinuityPort;
  readonly dynasty: MortalityDynastyPort;
  readonly auction: MortalityAuctionPort;
  readonly chronicle: MortalityChroniclePort;
  readonly idGenerator: MortalityIdGenerator;
}

// ─── Result Types ───────────────────────────────────────────────────

export interface MortalityTickResult {
  readonly transitions: ReadonlyArray<ContinuityTransition>;
  readonly auctionsCreated: number;
  readonly auctionsCompleted: number;
  readonly chronicleEntries: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface DynastyMortalityOrchestrator {
  tick(): MortalityTickResult;
  getActiveAuctionCount(): number;
  getActiveAuctionIds(): ReadonlyArray<string>;
}

// ─── State ──────────────────────────────────────────────────────────

interface OrchestratorState {
  readonly deps: DynastyMortalityDeps;
  readonly activeAuctions: Map<string, string>; // auctionId → dynastyId
}

// ─── Factory ────────────────────────────────────────────────────────

export function createDynastyMortalityOrchestrator(
  deps: DynastyMortalityDeps,
): DynastyMortalityOrchestrator {
  const state: OrchestratorState = {
    deps,
    activeAuctions: new Map(),
  };

  return {
    tick: () => tickImpl(state),
    getActiveAuctionCount: () => state.activeAuctions.size,
    getActiveAuctionIds: () => [...state.activeAuctions.keys()],
  };
}

// ─── Tick ───────────────────────────────────────────────────────────

function tickImpl(state: OrchestratorState): MortalityTickResult {
  let chronicleEntries = 0;
  let auctionsCreated = 0;

  const transitions = state.deps.continuity.evaluateAll();

  for (const transition of transitions) {
    chronicleEntries += processTransition(state, transition);
    if (transition.to === 'redistribution') {
      createAuctionForDynasty(state, transition.dynastyId);
      auctionsCreated += 1;
    }
    syncDynastyStatus(state, transition);
  }

  const auctionsCompleted = evaluateActiveAuctions(state);

  return { transitions, auctionsCreated, auctionsCompleted, chronicleEntries };
}

// ─── Transition Processing ──────────────────────────────────────────

function processTransition(
  state: OrchestratorState,
  transition: ContinuityTransition,
): number {
  if (!isChronicleWorthy(transition.to)) return 0;
  const content = buildChronicleContent(transition);
  state.deps.chronicle.append({
    category: chronicleCategory(transition.to),
    subject: transition.dynastyId,
    content,
    worldId: '',
  });
  return 1;
}

function isChronicleWorthy(toState: ContinuityState): boolean {
  return CHRONICLE_WORTHY_STATES.has(toState);
}

const CHRONICLE_WORTHY_STATES: ReadonlySet<ContinuityState> = new Set([
  'dormant_30',
  'dormant_60',
  'continuity_triggered',
  'redistribution',
  'completed',
  'vigil',
  'heir_activated',
  'legacy_npc',
]);

function chronicleCategory(toState: ContinuityState): string {
  if (toState === 'vigil') return 'dynasty.vigil';
  if (toState === 'heir_activated') return 'dynasty.heir';
  if (toState === 'legacy_npc') return 'dynasty.legacy';
  return 'dynasty.continuity';
}

function buildChronicleContent(transition: ContinuityTransition): string {
  return transition.dynastyId + ': ' + transition.reason;
}

// ─── Dynasty Status Sync ────────────────────────────────────────────

function syncDynastyStatus(
  state: OrchestratorState,
  transition: ContinuityTransition,
): void {
  const mapped = mapContinuityToDynastyStatus(transition.to);
  if (mapped === null) return;
  state.deps.dynasty.setStatus(transition.dynastyId, mapped);
}

function mapContinuityToDynastyStatus(
  continuityState: ContinuityState,
): DynastyStatus | null {
  if (continuityState === 'active') return 'active';
  if (DORMANT_STATES.has(continuityState)) return 'dormant';
  if (COMPLETED_STATES.has(continuityState)) return 'completed';
  return null;
}

const DORMANT_STATES: ReadonlySet<ContinuityState> = new Set([
  'dormant_30',
  'dormant_60',
  'grace_window',
  'continuity_triggered',
]);

const COMPLETED_STATES: ReadonlySet<ContinuityState> = new Set([
  'redistribution',
  'completed',
  'vigil',
  'heir_activated',
  'legacy_npc',
]);

// ─── Auction Management ─────────────────────────────────────────────

function createAuctionForDynasty(
  state: OrchestratorState,
  dynastyId: string,
): void {
  const auctionId = state.deps.idGenerator.next();
  state.deps.auction.createAuction(auctionId, dynastyId);
  state.activeAuctions.set(auctionId, dynastyId);
}

function evaluateActiveAuctions(state: OrchestratorState): number {
  let completed = 0;
  const toRemove: string[] = [];

  for (const [auctionId, dynastyId] of state.activeAuctions.entries()) {
    const result = advanceAuction(state, auctionId, dynastyId);
    if (result) {
      toRemove.push(auctionId);
      completed += 1;
    }
  }

  for (const id of toRemove) {
    state.activeAuctions.delete(id);
  }
  return completed;
}

function advanceAuction(
  state: OrchestratorState,
  auctionId: string,
  dynastyId: string,
): boolean {
  const phaseResult = state.deps.auction.evaluatePhase(auctionId);
  if (phaseResult === null) return false;
  if (phaseResult.to !== 'complete') return false;
  state.deps.continuity.completeRedistribution(dynastyId);
  return true;
}
