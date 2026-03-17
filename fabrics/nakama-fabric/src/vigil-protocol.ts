/**
 * Vigil Protocol Engine ΓÇö Dynasty dormancy and reactivation lifecycle.
 *
 * When a player steps away for 6+ real months, their dynasty enters the
 * Continuity Window: NPC-administered mode that maintains (but does not
 * expand) the dynasty. Chronicle entries are filed every 10 in-game days
 * by the appointed regent NPC. Incoming events are preserved in a queue.
 * On return, full dynasty control resumes immediately with a 90-day
 * in-game re-acclimatisation period (no Extinction risk).
 *
 * Bible v1.4 ┬º9 ΓÇö Vigil Protocol / Multigenerational Design
 */

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const MS_PER_REAL_MONTH = 30 * 24 * 60 * 60 * 1_000;
export const VIGIL_ENTRY_MONTHS = 6;
export const DEEP_VIGIL_MONTHS = 18;
export const CRITICAL_VIGIL_MONTHS = 36;
export const ACCLIMATISATION_IN_GAME_DAYS = 90;
export const REGENT_ENTRY_INTERVAL_IN_GAME_DAYS = 10;

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type VigilStatus =
  | 'ACTIVE' // Dynasty is being actively played
  | 'WARNING' // 3+ months inactive ΓÇö Vigil approaching
  | 'IN_VIGIL' // 6+ months inactive ΓÇö Vigil active, NPC regent running
  | 'DEEP_VIGIL' // 18+ months inactive ΓÇö NPC regent has been active for years
  | 'CRITICAL' // 36+ months inactive ΓÇö dynasty at risk without return
  | 'REACTIVATING' // Player returned, 90-day acclimatisation
  | 'COMPLETED'; // Dynasty ran its full arc and completed

export interface VigilRecord {
  readonly dynastyId: string;
  readonly dynastyName: string;
  readonly status: VigilStatus;
  readonly lastActiveAt: string; // ISO timestamp
  readonly vigilStartedAt?: string; // ISO timestamp
  readonly reactivatedAt?: string; // ISO timestamp
  readonly acclimatisationEndsAt?: string; // ISO timestamp; 90 in-game days after return
  readonly regentNpcId?: string; // The NPC regent during Vigil
  readonly queuedItems: QueuedItem[];
  readonly chronicleEntriesFiledByRegent: number;
  readonly isProtectedFromExtinction: boolean;
}

export interface QueuedItem {
  readonly itemId: string;
  readonly type: 'ASSEMBLY_VOTE' | 'TRADE_OFFER' | 'DIPLOMATIC_MESSAGE' | 'CHRONICLE_MENTION';
  readonly queuedAt: string; // ISO timestamp
  readonly summary: string; // Plain text summary for the returning player
  readonly requiresAction: boolean;
  readonly expiresAt?: string; // ISO timestamp; some items expire
}

export interface RegentChronicleEntry {
  readonly entryId: string;
  readonly dynastyId: string;
  readonly filedAt: string; // ISO timestamp
  readonly inGameDay: number;
  readonly text: string;
  readonly isRegentEntry: true;
}

// ΓöÇΓöÇ Deps / Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface VigilClock {
  readonly nowMs: () => number;
}

export interface VigilIdGenerator {
  readonly next: () => string;
}

export interface VigilProtocolDeps {
  readonly clock: VigilClock;
  readonly idGenerator: VigilIdGenerator;
}

// ΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface VigilProtocolService {
  initDynasty(dynastyId: string, dynastyName: string): VigilRecord;
  getRecord(dynastyId: string): VigilRecord | undefined;
  evaluateStatus(dynastyId: string): VigilRecord;
  enterVigil(dynastyId: string, regentNpcId: string): VigilRecord;
  deepenVigil(dynastyId: string): VigilRecord;
  markCritical(dynastyId: string): VigilRecord;
  queueItem(dynastyId: string, item: QueueItemParams): VigilRecord;
  generateRegentEntry(
    dynastyId: string,
    inGameDay: number,
    context?: RegentContext,
  ): RegentChronicleEntry;
  reactivate(dynastyId: string, acclimatisationEndsAt: string): VigilRecord;
  completeAcclimatisation(dynastyId: string): VigilRecord;
  completeDynasty(dynastyId: string): VigilRecord;
  isProtectedFromExtinction(dynastyId: string): boolean;
  listByStatus(status: VigilStatus): ReadonlyArray<VigilRecord>;
}

export interface QueueItemParams {
  readonly type: QueuedItem['type'];
  readonly summary: string;
  readonly requiresAction: boolean;
  readonly expiresAt?: string;
}

export interface RegentContext {
  readonly eventType?: 'TRADE_OFFER' | 'ASSEMBLY_VOTE' | 'ERA_CHANGE';
  readonly worldName?: string;
  readonly motionTitle?: string;
  readonly eraName?: string;
}

// ΓöÇΓöÇ Mutable Internal Record ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface MutableVigilRecord {
  dynastyId: string;
  dynastyName: string;
  status: VigilStatus;
  lastActiveAt: string;
  vigilStartedAt?: string;
  reactivatedAt?: string;
  acclimatisationEndsAt?: string;
  regentNpcId?: string;
  queuedItems: QueuedItem[];
  chronicleEntriesFiledByRegent: number;
  isProtectedFromExtinction: boolean;
}

interface ServiceState {
  readonly deps: VigilProtocolDeps;
  readonly records: Map<string, MutableVigilRecord>;
}

// ΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createVigilProtocolService(deps: VigilProtocolDeps): VigilProtocolService {
  const state: ServiceState = { deps, records: new Map() };

  return {
    initDynasty: (id, name) => initDynastyImpl(state, id, name),
    getRecord: (id) => getRecordReadonly(state, id),
    evaluateStatus: (id) => evaluateStatusImpl(state, id),
    enterVigil: (id, regentNpcId) => enterVigilImpl(state, id, regentNpcId),
    deepenVigil: (id) => deepenVigilImpl(state, id),
    markCritical: (id) => markCriticalImpl(state, id),
    queueItem: (id, item) => queueItemImpl(state, id, item),
    generateRegentEntry: (id, day, ctx) => generateRegentEntryImpl(state, id, day, ctx),
    reactivate: (id, endsAt) => reactivateImpl(state, id, endsAt),
    completeAcclimatisation: (id) => completeAcclimatisationImpl(state, id),
    completeDynasty: (id) => completeDynastyImpl(state, id),
    isProtectedFromExtinction: (id) => isProtectedImpl(state, id),
    listByStatus: (status) => listByStatusImpl(state, status),
  };
}

// ΓöÇΓöÇ Implementations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function initDynastyImpl(state: ServiceState, dynastyId: string, dynastyName: string): VigilRecord {
  if (state.records.has(dynastyId)) {
    throw new Error(`VigilRecord already exists for dynasty: ${dynastyId}`);
  }
  const record: MutableVigilRecord = {
    dynastyId,
    dynastyName,
    status: 'ACTIVE',
    lastActiveAt: new Date(state.deps.clock.nowMs()).toISOString(),
    queuedItems: [],
    chronicleEntriesFiledByRegent: 0,
    isProtectedFromExtinction: false,
  };
  state.records.set(dynastyId, record);
  return toReadonly(record);
}

function evaluateStatusImpl(state: ServiceState, dynastyId: string): VigilRecord {
  const record = requireRecord(state, dynastyId);
  const nowMs = state.deps.clock.nowMs();
  const inactiveMs = nowMs - new Date(record.lastActiveAt).getTime();
  const inactiveMonths = inactiveMs / MS_PER_REAL_MONTH;

  const nextStatus = resolveNextStatus(record.status, inactiveMonths);
  if (nextStatus !== null) record.status = nextStatus;

  return toReadonly(record);
}

function resolveNextStatus(current: VigilStatus, inactiveMonths: number): VigilStatus | null {
  if (current === 'ACTIVE' && inactiveMonths >= 3) return 'WARNING';
  if (current === 'WARNING' && inactiveMonths < 3) return 'ACTIVE';
  return null;
}

function enterVigilImpl(state: ServiceState, dynastyId: string, regentNpcId: string): VigilRecord {
  const record = requireRecord(state, dynastyId);
  assertNotInStatus(dynastyId, record.status, ['COMPLETED', 'IN_VIGIL', 'DEEP_VIGIL', 'CRITICAL']);
  record.status = 'IN_VIGIL';
  record.vigilStartedAt = new Date(state.deps.clock.nowMs()).toISOString();
  record.regentNpcId = regentNpcId;
  return toReadonly(record);
}

function deepenVigilImpl(state: ServiceState, dynastyId: string): VigilRecord {
  const record = requireRecord(state, dynastyId);
  assertInStatus(dynastyId, record.status, ['IN_VIGIL']);
  record.status = 'DEEP_VIGIL';
  return toReadonly(record);
}

function markCriticalImpl(state: ServiceState, dynastyId: string): VigilRecord {
  const record = requireRecord(state, dynastyId);
  assertInStatus(dynastyId, record.status, ['IN_VIGIL', 'DEEP_VIGIL']);
  record.status = 'CRITICAL';
  return toReadonly(record);
}

function queueItemImpl(
  state: ServiceState,
  dynastyId: string,
  params: QueueItemParams,
): VigilRecord {
  const record = requireRecord(state, dynastyId);
  const item: QueuedItem = {
    itemId: state.deps.idGenerator.next(),
    type: params.type,
    queuedAt: new Date(state.deps.clock.nowMs()).toISOString(),
    summary: params.summary,
    requiresAction: params.requiresAction,
    expiresAt: params.expiresAt,
  };
  record.queuedItems.push(item);
  return toReadonly(record);
}

function generateRegentEntryImpl(
  state: ServiceState,
  dynastyId: string,
  inGameDay: number,
  ctx?: RegentContext,
): RegentChronicleEntry {
  const record = requireRecord(state, dynastyId);
  const entry: RegentChronicleEntry = {
    entryId: state.deps.idGenerator.next(),
    dynastyId,
    filedAt: new Date(state.deps.clock.nowMs()).toISOString(),
    inGameDay,
    text: buildRegentText(record.dynastyName, ctx),
    isRegentEntry: true,
  };
  record.chronicleEntriesFiledByRegent++;
  return entry;
}

function buildRegentText(dynastyName: string, ctx?: RegentContext): string {
  if (ctx?.eventType === 'TRADE_OFFER') {
    const world = ctx.worldName ?? 'an unknown world';
    return `${dynastyName}'s regent received a trade offer from ${world}. It has been preserved for the dynasty's return.`;
  }
  if (ctx?.eventType === 'ASSEMBLY_VOTE') {
    const motion = ctx.motionTitle ?? 'an unnamed motion';
    return `The Assembly voted on ${motion}. ${dynastyName}'s regent abstained as instructed by the Vigil Protocol. The record is preserved.`;
  }
  if (ctx?.eventType === 'ERA_CHANGE') {
    return `The civilisation has entered a new phase. ${dynastyName}'s regent records this transition for their return.`;
  }
  return `${dynastyName}'s holdings are maintained. The regent reports no unusual activity. The KALON reserves remain stable.`;
}

function reactivateImpl(
  state: ServiceState,
  dynastyId: string,
  acclimatisationEndsAt: string,
): VigilRecord {
  const record = requireRecord(state, dynastyId);
  assertInStatus(dynastyId, record.status, ['IN_VIGIL', 'DEEP_VIGIL', 'CRITICAL']);
  record.status = 'REACTIVATING';
  record.reactivatedAt = new Date(state.deps.clock.nowMs()).toISOString();
  record.acclimatisationEndsAt = acclimatisationEndsAt;
  record.isProtectedFromExtinction = true;
  record.lastActiveAt = new Date(state.deps.clock.nowMs()).toISOString();
  return toReadonly(record);
}

function completeAcclimatisationImpl(state: ServiceState, dynastyId: string): VigilRecord {
  const record = requireRecord(state, dynastyId);
  assertInStatus(dynastyId, record.status, ['REACTIVATING']);
  record.status = 'ACTIVE';
  record.isProtectedFromExtinction = false;
  record.acclimatisationEndsAt = undefined;
  return toReadonly(record);
}

function completeDynastyImpl(state: ServiceState, dynastyId: string): VigilRecord {
  const record = requireRecord(state, dynastyId);
  record.status = 'COMPLETED';
  record.isProtectedFromExtinction = false;
  return toReadonly(record);
}

function isProtectedImpl(state: ServiceState, dynastyId: string): boolean {
  const record = state.records.get(dynastyId);
  return record?.isProtectedFromExtinction ?? false;
}

function listByStatusImpl(state: ServiceState, status: VigilStatus): ReadonlyArray<VigilRecord> {
  const result: VigilRecord[] = [];
  for (const record of state.records.values()) {
    if (record.status === status) result.push(toReadonly(record));
  }
  return result;
}

// ΓöÇΓöÇ Guards ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function assertInStatus(dynastyId: string, current: VigilStatus, allowed: VigilStatus[]): void {
  if (!allowed.includes(current)) {
    throw new Error(
      `Dynasty ${dynastyId}: cannot transition from ${current}. Allowed: ${allowed.join(', ')}`,
    );
  }
}

function assertNotInStatus(
  dynastyId: string,
  current: VigilStatus,
  disallowed: VigilStatus[],
): void {
  if (disallowed.includes(current)) {
    throw new Error(`Dynasty ${dynastyId}: transition not allowed from status ${current}`);
  }
}

// ΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function requireRecord(state: ServiceState, dynastyId: string): MutableVigilRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw new Error(`VigilRecord not found for dynasty: ${dynastyId}`);
  return record;
}

function getRecordReadonly(state: ServiceState, dynastyId: string): VigilRecord | undefined {
  const record = state.records.get(dynastyId);
  return record ? toReadonly(record) : undefined;
}

function toReadonly(record: MutableVigilRecord): VigilRecord {
  return {
    dynastyId: record.dynastyId,
    dynastyName: record.dynastyName,
    status: record.status,
    lastActiveAt: record.lastActiveAt,
    vigilStartedAt: record.vigilStartedAt,
    reactivatedAt: record.reactivatedAt,
    acclimatisationEndsAt: record.acclimatisationEndsAt,
    regentNpcId: record.regentNpcId,
    queuedItems: [...record.queuedItems],
    chronicleEntriesFiledByRegent: record.chronicleEntriesFiledByRegent,
    isProtectedFromExtinction: record.isProtectedFromExtinction,
  };
}
