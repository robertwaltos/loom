/**
 * npc-philosophy.ts — NPC philosophical worldviews and ethical frameworks.
 *
 * Models NPC philosophical beliefs that influence decision-making. Worldviews
 * provide weighted modifiers to outcome evaluations. NPCs can engage in
 * philosophical debates that may shift their worldviews over time. Tracks
 * worldview history and measures ideological spread across populations.
 */

// -- Ports ────────────────────────────────────────────────────────

interface PhilosophyClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface PhilosophyIdGeneratorPort {
  readonly next: () => string;
}

interface PhilosophyLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface PhilosophyDeps {
  readonly clock: PhilosophyClockPort;
  readonly idGenerator: PhilosophyIdGeneratorPort;
  readonly logger: PhilosophyLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type Worldview = 'PRAGMATIST' | 'IDEALIST' | 'NIHILIST' | 'ALTRUIST' | 'MATERIALIST' | 'STOIC';

type OutcomeType = 'ECONOMIC' | 'SOCIAL' | 'MORAL' | 'SURVIVAL' | 'PLEASURE' | 'DUTY';

interface PhilosophicalBelief {
  readonly npcId: string;
  readonly worldview: Worldview;
  readonly conviction: number;
  readonly adoptedAt: bigint;
}

interface DecisionModifier {
  readonly outcomeType: OutcomeType;
  readonly weight: number;
}

interface PhilosophyDebate {
  readonly debateId: string;
  readonly participantA: string;
  readonly participantB: string;
  readonly topic: string;
  readonly worldviewA: Worldview;
  readonly worldviewB: Worldview;
  readonly startedAt: bigint;
  readonly resolvedAt: bigint | undefined;
  readonly winner: string | undefined;
}

interface WorldviewShift {
  readonly npcId: string;
  readonly fromWorldview: Worldview;
  readonly toWorldview: Worldview;
  readonly reason: string;
  readonly occurredAt: bigint;
}

interface PhilosophyReport {
  readonly totalNpcs: number;
  readonly worldviewDistribution: Record<Worldview, number>;
  readonly totalDebates: number;
  readonly totalShifts: number;
  readonly mostPopularWorldview: Worldview | undefined;
}

type SetWorldviewError = 'invalid_conviction' | 'npc_already_has_worldview';
type HoldDebateError = 'npc_not_found' | 'same_worldview';
type ResolveDebateError = 'debate_not_found' | 'already_resolved';
type GetWorldviewHistoryError = 'npc_not_found';

// -- Constants ────────────────────────────────────────────────────

const CONVICTION_MIN = 0;
const CONVICTION_MAX = 100;
const DEBATE_CONVICTION_DELTA = 10;
const SHIFT_CONVICTION_THRESHOLD = 25;

const WORLDVIEW_MODIFIERS: Record<Worldview, DecisionModifier[]> = {
  PRAGMATIST: [
    { outcomeType: 'ECONOMIC', weight: 1.3 },
    { outcomeType: 'SURVIVAL', weight: 1.2 },
    { outcomeType: 'MORAL', weight: 0.7 },
  ],
  IDEALIST: [
    { outcomeType: 'MORAL', weight: 1.5 },
    { outcomeType: 'DUTY', weight: 1.3 },
    { outcomeType: 'ECONOMIC', weight: 0.6 },
  ],
  NIHILIST: [
    { outcomeType: 'PLEASURE', weight: 1.4 },
    { outcomeType: 'DUTY', weight: 0.5 },
    { outcomeType: 'MORAL', weight: 0.6 },
  ],
  ALTRUIST: [
    { outcomeType: 'SOCIAL', weight: 1.5 },
    { outcomeType: 'MORAL', weight: 1.4 },
    { outcomeType: 'ECONOMIC', weight: 0.7 },
  ],
  MATERIALIST: [
    { outcomeType: 'ECONOMIC', weight: 1.6 },
    { outcomeType: 'PLEASURE', weight: 1.3 },
    { outcomeType: 'DUTY', weight: 0.6 },
  ],
  STOIC: [
    { outcomeType: 'DUTY', weight: 1.4 },
    { outcomeType: 'SURVIVAL', weight: 1.3 },
    { outcomeType: 'PLEASURE', weight: 0.5 },
  ],
};

// -- State ────────────────────────────────────────────────────────

interface PhilosophySystemState {
  readonly beliefs: Map<string, PhilosophicalBelief>;
  readonly debates: Map<string, PhilosophyDebate>;
  readonly shifts: WorldviewShift[];
}

// -- Factory ──────────────────────────────────────────────────────

export interface PhilosophySystem {
  readonly setWorldview: (
    npcId: string,
    worldview: Worldview,
    conviction: number,
  ) => SetWorldviewError | 'ok';
  readonly getDecisionModifiers: (npcId: string) => DecisionModifier[];
  readonly holdDebate: (npcIdA: string, npcIdB: string, topic: string) => HoldDebateError | string;
  readonly resolveDebate: (debateId: string, winnerId: string) => ResolveDebateError | 'ok';
  readonly getWorldviewHistory: (npcId: string) => GetWorldviewHistoryError | WorldviewShift[];
  readonly measurePhilosophySpread: (worldIds: string[]) => Record<Worldview, number>;
  readonly getPhilosophyReport: () => PhilosophyReport;
}

export function createPhilosophySystem(deps: PhilosophyDeps): PhilosophySystem {
  const state: PhilosophySystemState = {
    beliefs: new Map(),
    debates: new Map(),
    shifts: [],
  };
  return {
    setWorldview: (npcId, worldview, conviction) =>
      setWorldview(state, deps, npcId, worldview, conviction),
    getDecisionModifiers: (npcId) => getDecisionModifiers(state, npcId),
    holdDebate: (npcIdA, npcIdB, topic) => holdDebate(state, deps, npcIdA, npcIdB, topic),
    resolveDebate: (debateId, winnerId) => resolveDebate(state, deps, debateId, winnerId),
    getWorldviewHistory: (npcId) => getWorldviewHistory(state, npcId),
    measurePhilosophySpread: (worldIds) => measurePhilosophySpread(state, worldIds),
    getPhilosophyReport: () => getPhilosophyReport(state),
  };
}

// -- Module-level functions ───────────────────────────────────────

function setWorldview(
  state: PhilosophySystemState,
  deps: PhilosophyDeps,
  npcId: string,
  worldview: Worldview,
  conviction: number,
): SetWorldviewError | 'ok' {
  if (conviction < CONVICTION_MIN || conviction > CONVICTION_MAX) {
    return 'invalid_conviction';
  }
  const existing = state.beliefs.get(npcId);
  if (existing !== undefined && existing.worldview === worldview) {
    return 'npc_already_has_worldview';
  }
  const now = deps.clock.nowMicroseconds();
  if (existing !== undefined) {
    const shift: WorldviewShift = {
      npcId,
      fromWorldview: existing.worldview,
      toWorldview: worldview,
      reason: 'manual_assignment',
      occurredAt: now,
    };
    state.shifts.push(shift);
  }
  const belief: PhilosophicalBelief = {
    npcId,
    worldview,
    conviction,
    adoptedAt: now,
  };
  state.beliefs.set(npcId, belief);
  deps.logger.info('worldview_set', { npcId, worldview, conviction });
  return 'ok';
}

function getDecisionModifiers(state: PhilosophySystemState, npcId: string): DecisionModifier[] {
  const belief = state.beliefs.get(npcId);
  if (belief === undefined) {
    return [];
  }
  const baseModifiers = WORLDVIEW_MODIFIERS[belief.worldview];
  const convictionFactor = belief.conviction / 100;
  const modifiers: DecisionModifier[] = [];
  for (let i = 0; i < baseModifiers.length; i = i + 1) {
    const mod = baseModifiers[i];
    if (mod === undefined) {
      continue;
    }
    const adjustedWeight = 1 + (mod.weight - 1) * convictionFactor;
    modifiers.push({ outcomeType: mod.outcomeType, weight: adjustedWeight });
  }
  return modifiers;
}

function holdDebate(
  state: PhilosophySystemState,
  deps: PhilosophyDeps,
  npcIdA: string,
  npcIdB: string,
  topic: string,
): HoldDebateError | string {
  const beliefA = state.beliefs.get(npcIdA);
  const beliefB = state.beliefs.get(npcIdB);
  if (beliefA === undefined || beliefB === undefined) {
    return 'npc_not_found';
  }
  if (beliefA.worldview === beliefB.worldview) {
    return 'same_worldview';
  }
  const debateId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const debate: PhilosophyDebate = {
    debateId,
    participantA: npcIdA,
    participantB: npcIdB,
    topic,
    worldviewA: beliefA.worldview,
    worldviewB: beliefB.worldview,
    startedAt: now,
    resolvedAt: undefined,
    winner: undefined,
  };
  state.debates.set(debateId, debate);
  deps.logger.info('debate_held', { debateId, npcIdA, npcIdB, topic });
  return debateId;
}

function resolveDebate(
  state: PhilosophySystemState,
  deps: PhilosophyDeps,
  debateId: string,
  winnerId: string,
): ResolveDebateError | 'ok' {
  const debate = state.debates.get(debateId);
  if (debate === undefined) {
    return 'debate_not_found';
  }
  if (debate.resolvedAt !== undefined) {
    return 'already_resolved';
  }
  const now = deps.clock.nowMicroseconds();
  const winnerIdMatches = winnerId === debate.participantA || winnerId === debate.participantB;
  if (!winnerIdMatches) {
    return 'debate_not_found';
  }
  const loserId = winnerId === debate.participantA ? debate.participantB : debate.participantA;
  const resolvedDebate: PhilosophyDebate = {
    ...debate,
    resolvedAt: now,
    winner: winnerId,
  };
  state.debates.set(debateId, resolvedDebate);
  const loserBelief = state.beliefs.get(loserId);
  if (loserBelief !== undefined) {
    const newConviction = Math.max(
      CONVICTION_MIN,
      loserBelief.conviction - DEBATE_CONVICTION_DELTA,
    );
    const updatedBelief: PhilosophicalBelief = {
      ...loserBelief,
      conviction: newConviction,
    };
    state.beliefs.set(loserId, updatedBelief);
    if (newConviction < SHIFT_CONVICTION_THRESHOLD) {
      const winnerBelief = state.beliefs.get(winnerId);
      if (winnerBelief !== undefined) {
        const shift: WorldviewShift = {
          npcId: loserId,
          fromWorldview: loserBelief.worldview,
          toWorldview: winnerBelief.worldview,
          reason: 'debate_loss_to_' + String(winnerId),
          occurredAt: now,
        };
        state.shifts.push(shift);
        const shiftedBelief: PhilosophicalBelief = {
          npcId: loserId,
          worldview: winnerBelief.worldview,
          conviction: SHIFT_CONVICTION_THRESHOLD,
          adoptedAt: now,
        };
        state.beliefs.set(loserId, shiftedBelief);
      }
    }
  }
  deps.logger.info('debate_resolved', { debateId, winnerId });
  return 'ok';
}

function getWorldviewHistory(
  state: PhilosophySystemState,
  npcId: string,
): GetWorldviewHistoryError | WorldviewShift[] {
  const belief = state.beliefs.get(npcId);
  if (belief === undefined) {
    return 'npc_not_found';
  }
  const history: WorldviewShift[] = [];
  for (let i = 0; i < state.shifts.length; i = i + 1) {
    const shift = state.shifts[i];
    if (shift === undefined) {
      continue;
    }
    if (shift.npcId === npcId) {
      history.push(shift);
    }
  }
  return history;
}

function measurePhilosophySpread(
  state: PhilosophySystemState,
  worldIds: string[],
): Record<Worldview, number> {
  const spread: Record<Worldview, number> = {
    PRAGMATIST: 0,
    IDEALIST: 0,
    NIHILIST: 0,
    ALTRUIST: 0,
    MATERIALIST: 0,
    STOIC: 0,
  };
  for (const belief of state.beliefs.values()) {
    const count = spread[belief.worldview];
    if (count !== undefined) {
      spread[belief.worldview] = count + 1;
    }
  }
  return spread;
}

function getPhilosophyReport(state: PhilosophySystemState): PhilosophyReport {
  const distribution: Record<Worldview, number> = {
    PRAGMATIST: 0,
    IDEALIST: 0,
    NIHILIST: 0,
    ALTRUIST: 0,
    MATERIALIST: 0,
    STOIC: 0,
  };
  let maxCount = 0;
  let mostPopular: Worldview | undefined = undefined;
  for (const belief of state.beliefs.values()) {
    const count = distribution[belief.worldview];
    if (count !== undefined) {
      const newCount = count + 1;
      distribution[belief.worldview] = newCount;
      if (newCount > maxCount) {
        maxCount = newCount;
        mostPopular = belief.worldview;
      }
    }
  }
  return {
    totalNpcs: state.beliefs.size,
    worldviewDistribution: distribution,
    totalDebates: state.debates.size,
    totalShifts: state.shifts.length,
    mostPopularWorldview: mostPopular,
  };
}
