/**
 * MARKS Registry — Permanent Achievement Oracle Layer.
 *
 * Bible v1.1 Part 6: Six mark types representing permanent dynasty
 * achievements. Each mark is tied to a Chronicle entry and ultimately
 * recorded on-chain via the IMarksRegistry Solidity contract.
 *
 * This TypeScript layer acts as the oracle — deciding when marks are
 * awarded and recording them before the on-chain transaction.
 *
 * MARKS are non-transferable and permanently bound to a dynasty.
 */

// ─── Types ─────────────────────────────────────────────────────────

export type MarkType = 'FOUNDING' | 'SURVEY' | 'WORLD' | 'DEFENCE' | 'SURVIVOR' | 'FIRST_CONTACT';

export interface Mark {
  readonly markId: string;
  readonly markType: MarkType;
  readonly dynastyId: string;
  readonly chronicleEntryRef: string;
  readonly worldId: string | null;
  readonly awardedAtUs: number;
}

export interface AwardMarkParams {
  readonly markType: MarkType;
  readonly dynastyId: string;
  readonly chronicleEntryRef: string;
  readonly worldId?: string;
}

// ─── Supply Caps ───────────────────────────────────────────────────

/** Global supply caps per mark type. null = no hard cap. */
export const MARK_SUPPLY_CAPS: Readonly<Record<MarkType, number | null>> = {
  FOUNDING: 500,
  SURVEY: null,
  WORLD: null,
  DEFENCE: null,
  SURVIVOR: null,
  FIRST_CONTACT: 3,
};

// ─── Registry Interface ────────────────────────────────────────────

export interface MarksRegistry {
  award(params: AwardMarkParams): Mark;
  getByDynasty(dynastyId: string): ReadonlyArray<Mark>;
  getByType(markType: MarkType): ReadonlyArray<Mark>;
  countByDynasty(dynastyId: string): number;
  countByDynastyAndType(dynastyId: string, markType: MarkType): number;
  getWorldMark(worldId: string): Mark | null;
  totalAwarded(): number;
  totalAwardedByType(markType: MarkType): number;
}

// ─── Errors ────────────────────────────────────────────────────────

export class MarkError extends Error {
  constructor(
    readonly code: MarkErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MarkError';
  }
}

export type MarkErrorCode = 'SUPPLY_CAP_REACHED' | 'WORLD_MARK_EXISTS' | 'DUPLICATE_CHRONICLE_REF';

// ─── Internal State ────────────────────────────────────────────────

interface RegistryState {
  readonly marks: Map<string, Mark>;
  readonly byDynasty: Map<string, Mark[]>;
  readonly byType: Map<MarkType, Mark[]>;
  readonly worldMarks: Map<string, Mark>;
  readonly chronicleRefs: Set<string>;
}

function createState(): RegistryState {
  return {
    marks: new Map(),
    byDynasty: new Map(),
    byType: new Map(),
    worldMarks: new Map(),
    chronicleRefs: new Set(),
  };
}

// ─── Deps ──────────────────────────────────────────────────────────

export interface MarksRegistryDeps {
  readonly idGenerator: { next(): string };
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ───────────────────────────────────────────────────────

export function createMarksRegistry(deps: MarksRegistryDeps): MarksRegistry {
  const state = createState();

  return {
    award: (params) => awardMark(state, deps, params),
    getByDynasty: (id) => state.byDynasty.get(id) ?? [],
    getByType: (type) => state.byType.get(type) ?? [],
    countByDynasty: (id) => (state.byDynasty.get(id) ?? []).length,
    countByDynastyAndType: (id, type) => countByDynastyAndType(state, id, type),
    getWorldMark: (worldId) => state.worldMarks.get(worldId) ?? null,
    totalAwarded: () => state.marks.size,
    totalAwardedByType: (type) => (state.byType.get(type) ?? []).length,
  };
}

// ─── Award Logic ───────────────────────────────────────────────────

function awardMark(state: RegistryState, deps: MarksRegistryDeps, params: AwardMarkParams): Mark {
  validateSupplyCap(state, params.markType);
  validateWorldUniqueness(state, params);
  validateChronicleRef(state, params.chronicleEntryRef);

  const mark: Mark = {
    markId: deps.idGenerator.next(),
    markType: params.markType,
    dynastyId: params.dynastyId,
    chronicleEntryRef: params.chronicleEntryRef,
    worldId: params.worldId ?? null,
    awardedAtUs: deps.clock.nowMicroseconds(),
  };

  storeMark(state, mark);
  return mark;
}

function validateSupplyCap(state: RegistryState, markType: MarkType): void {
  const cap = MARK_SUPPLY_CAPS[markType];
  if (cap === null) return;
  const current = (state.byType.get(markType) ?? []).length;
  if (current >= cap) {
    throw new MarkError(
      'SUPPLY_CAP_REACHED',
      `Supply cap reached for ${markType}: ${String(cap)} marks`,
    );
  }
}

function validateWorldUniqueness(state: RegistryState, params: AwardMarkParams): void {
  if (params.markType !== 'WORLD') return;
  const worldId = params.worldId;
  if (worldId === undefined) return;
  if (state.worldMarks.has(worldId)) {
    throw new MarkError('WORLD_MARK_EXISTS', `WORLD mark already exists for world ${worldId}`);
  }
}

function validateChronicleRef(state: RegistryState, ref: string): void {
  if (state.chronicleRefs.has(ref)) {
    throw new MarkError('DUPLICATE_CHRONICLE_REF', `Chronicle ref already used: ${ref}`);
  }
}

function storeMark(state: RegistryState, mark: Mark): void {
  state.marks.set(mark.markId, mark);
  state.chronicleRefs.add(mark.chronicleEntryRef);
  pushToIndex(state.byDynasty, mark.dynastyId, mark);
  pushToIndex(state.byType, mark.markType, mark);
  if (mark.markType === 'WORLD' && mark.worldId !== null) {
    state.worldMarks.set(mark.worldId, mark);
  }
}

function countByDynastyAndType(
  state: RegistryState,
  dynastyId: string,
  markType: MarkType,
): number {
  return (state.byDynasty.get(dynastyId) ?? []).filter((m) => m.markType === markType).length;
}

function pushToIndex<K>(map: Map<K, Mark[]>, key: K, mark: Mark): void {
  const list = map.get(key);
  if (list !== undefined) {
    list.push(mark);
  } else {
    map.set(key, [mark]);
  }
}
