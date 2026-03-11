/**
 * NPC Schedule V2 — Enhanced daily schedule with weekly variation.
 *
 * Builds on the base schedule with:
 *   - Activity types: SLEEP, WORK, SOCIALIZE, EAT, TRAVEL, LEISURE, WORSHIP, TRADE
 *   - Schedule templates per NPC archetype (farmer, merchant, guard, scholar)
 *   - Schedule interrupts with priority resolution
 *   - Location tracking for each activity
 *   - Weekly variation (7-day cycle, different activities per day)
 *   - Day-of-week awareness for schedule resolution
 *
 * Time model: hours 0-23 as integers, days 0-6 (0=Monday).
 *
 * "The warp threads hold the pattern; the weft gives it life."
 */

// ── Ports ────────────────────────────────────────────────────────

interface ScheduleV2Clock {
  readonly nowMicroseconds: () => number;
}

interface ScheduleV2IdGenerator {
  readonly next: () => string;
}

interface ScheduleV2Deps {
  readonly clock: ScheduleV2Clock;
  readonly idGenerator: ScheduleV2IdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ScheduleV2Activity =
  | 'sleep'
  | 'work'
  | 'socialize'
  | 'eat'
  | 'travel'
  | 'leisure'
  | 'worship'
  | 'trade';

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface ScheduleV2Block {
  readonly blockId: string;
  readonly activity: ScheduleV2Activity;
  readonly startHour: number;
  readonly endHour: number;
  readonly locationId: string;
  readonly days: ReadonlyArray<DayOfWeek>;
  readonly priority: number;
}

interface ScheduleV2Interrupt {
  readonly interruptId: string;
  readonly activity: ScheduleV2Activity;
  readonly locationId: string;
  readonly reason: string;
  readonly priority: number;
  readonly expiresAt: number;
}

interface NpcScheduleV2 {
  readonly scheduleId: string;
  readonly npcId: string;
  readonly blocks: ReadonlyArray<ScheduleV2Block>;
  readonly interrupts: ReadonlyArray<ScheduleV2Interrupt>;
  readonly createdAt: number;
}

interface AddBlockV2Params {
  readonly npcId: string;
  readonly activity: ScheduleV2Activity;
  readonly startHour: number;
  readonly endHour: number;
  readonly locationId: string;
  readonly days: ReadonlyArray<DayOfWeek>;
  readonly priority?: number;
}

interface AddInterruptParams {
  readonly npcId: string;
  readonly activity: ScheduleV2Activity;
  readonly locationId: string;
  readonly reason: string;
  readonly priority: number;
  readonly durationUs: number;
}

interface ResolvedActivity {
  readonly npcId: string;
  readonly activity: ScheduleV2Activity;
  readonly locationId: string;
  readonly isInterrupt: boolean;
  readonly reason: string | null;
}

type ScheduleV2TemplateName = 'farmer' | 'merchant' | 'guard' | 'scholar' | 'priest';

interface ScheduleV2Stats {
  readonly totalSchedules: number;
  readonly totalBlocks: number;
  readonly activeInterrupts: number;
}

interface NpcScheduleV2System {
  readonly createSchedule: (npcId: string) => NpcScheduleV2;
  readonly addBlock: (params: AddBlockV2Params) => ScheduleV2Block;
  readonly removeBlock: (npcId: string, blockId: string) => boolean;
  readonly addInterrupt: (params: AddInterruptParams) => ScheduleV2Interrupt;
  readonly clearInterrupts: (npcId: string) => number;
  readonly sweepExpiredInterrupts: () => number;
  readonly resolve: (npcId: string, hour: number, day: DayOfWeek) => ResolvedActivity | undefined;
  readonly applyTemplate: (npcId: string, template: ScheduleV2TemplateName) => NpcScheduleV2;
  readonly getSchedule: (npcId: string) => NpcScheduleV2 | undefined;
  readonly removeSchedule: (npcId: string) => boolean;
  readonly getStats: () => ScheduleV2Stats;
}

// ── Templates ────────────────────────────────────────────────────

interface TemplateBlock {
  readonly activity: ScheduleV2Activity;
  readonly startHour: number;
  readonly endHour: number;
  readonly location: string;
  readonly days: ReadonlyArray<DayOfWeek>;
}

const ALL_DAYS: ReadonlyArray<DayOfWeek> = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS: ReadonlyArray<DayOfWeek> = [0, 1, 2, 3, 4];
const WEEKEND: ReadonlyArray<DayOfWeek> = [5, 6];

const SCHEDULE_TEMPLATES: Readonly<Record<ScheduleV2TemplateName, ReadonlyArray<TemplateBlock>>> = {
  farmer: [
    { activity: 'sleep', startHour: 21, endHour: 5, location: 'home', days: ALL_DAYS },
    { activity: 'eat', startHour: 5, endHour: 6, location: 'home', days: ALL_DAYS },
    { activity: 'work', startHour: 6, endHour: 12, location: 'farm', days: WEEKDAYS },
    { activity: 'eat', startHour: 12, endHour: 13, location: 'home', days: ALL_DAYS },
    { activity: 'work', startHour: 13, endHour: 18, location: 'farm', days: WEEKDAYS },
    { activity: 'socialize', startHour: 18, endHour: 21, location: 'tavern', days: WEEKDAYS },
    { activity: 'leisure', startHour: 6, endHour: 18, location: 'village', days: WEEKEND },
    { activity: 'worship', startHour: 8, endHour: 10, location: 'temple', days: [6] },
  ],
  merchant: [
    { activity: 'sleep', startHour: 22, endHour: 7, location: 'home', days: ALL_DAYS },
    { activity: 'eat', startHour: 7, endHour: 8, location: 'home', days: ALL_DAYS },
    { activity: 'trade', startHour: 8, endHour: 18, location: 'market', days: WEEKDAYS },
    { activity: 'socialize', startHour: 18, endHour: 22, location: 'guild_hall', days: WEEKDAYS },
    { activity: 'travel', startHour: 8, endHour: 16, location: 'trade_route', days: WEEKEND },
  ],
  guard: [
    { activity: 'sleep', startHour: 23, endHour: 6, location: 'barracks', days: ALL_DAYS },
    { activity: 'eat', startHour: 6, endHour: 7, location: 'barracks', days: ALL_DAYS },
    { activity: 'work', startHour: 7, endHour: 19, location: 'gate', days: WEEKDAYS },
    { activity: 'work', startHour: 7, endHour: 15, location: 'patrol_route', days: WEEKEND },
    { activity: 'socialize', startHour: 19, endHour: 23, location: 'tavern', days: WEEKDAYS },
  ],
  scholar: [
    { activity: 'sleep', startHour: 0, endHour: 8, location: 'quarters', days: ALL_DAYS },
    { activity: 'eat', startHour: 8, endHour: 9, location: 'refectory', days: ALL_DAYS },
    { activity: 'work', startHour: 9, endHour: 17, location: 'library', days: WEEKDAYS },
    { activity: 'leisure', startHour: 17, endHour: 22, location: 'quarters', days: WEEKDAYS },
    { activity: 'worship', startHour: 9, endHour: 11, location: 'temple', days: [6] },
    { activity: 'socialize', startHour: 14, endHour: 18, location: 'courtyard', days: WEEKEND },
  ],
  priest: [
    { activity: 'sleep', startHour: 22, endHour: 5, location: 'cell', days: ALL_DAYS },
    { activity: 'worship', startHour: 5, endHour: 7, location: 'temple', days: ALL_DAYS },
    { activity: 'eat', startHour: 7, endHour: 8, location: 'refectory', days: ALL_DAYS },
    { activity: 'work', startHour: 8, endHour: 12, location: 'temple', days: WEEKDAYS },
    { activity: 'socialize', startHour: 14, endHour: 17, location: 'village', days: WEEKDAYS },
    { activity: 'worship', startHour: 17, endHour: 19, location: 'temple', days: ALL_DAYS },
  ],
};

// ── State ────────────────────────────────────────────────────────

interface MutableScheduleV2 {
  readonly scheduleId: string;
  readonly npcId: string;
  readonly blocks: MutableBlockV2[];
  readonly interrupts: MutableInterrupt[];
  readonly createdAt: number;
}

interface MutableBlockV2 {
  readonly blockId: string;
  readonly activity: ScheduleV2Activity;
  readonly startHour: number;
  readonly endHour: number;
  readonly locationId: string;
  readonly days: DayOfWeek[];
  readonly priority: number;
}

interface MutableInterrupt {
  readonly interruptId: string;
  readonly activity: ScheduleV2Activity;
  readonly locationId: string;
  readonly reason: string;
  readonly priority: number;
  readonly expiresAt: number;
}

interface ScheduleV2State {
  readonly deps: ScheduleV2Deps;
  readonly schedules: Map<string, MutableScheduleV2>;
}

// ── Operations ───────────────────────────────────────────────────

function createScheduleImpl(state: ScheduleV2State, npcId: string): NpcScheduleV2 {
  if (state.schedules.has(npcId)) {
    throw new Error('Schedule for ' + npcId + ' already exists');
  }
  const schedule: MutableScheduleV2 = {
    scheduleId: state.deps.idGenerator.next(),
    npcId,
    blocks: [],
    interrupts: [],
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.schedules.set(npcId, schedule);
  return toReadonlySchedule(schedule);
}

function addBlockImpl(state: ScheduleV2State, params: AddBlockV2Params): ScheduleV2Block {
  const schedule = getOrThrow(state, params.npcId);
  const block: MutableBlockV2 = {
    blockId: state.deps.idGenerator.next(),
    activity: params.activity,
    startHour: clampHour(params.startHour),
    endHour: clampHour(params.endHour),
    locationId: params.locationId,
    days: [...params.days] as DayOfWeek[],
    priority: params.priority ?? 0,
  };
  schedule.blocks.push(block);
  return toReadonlyBlock(block);
}

function addInterruptImpl(state: ScheduleV2State, params: AddInterruptParams): ScheduleV2Interrupt {
  const schedule = getOrThrow(state, params.npcId);
  const now = state.deps.clock.nowMicroseconds();
  const interrupt: MutableInterrupt = {
    interruptId: state.deps.idGenerator.next(),
    activity: params.activity,
    locationId: params.locationId,
    reason: params.reason,
    priority: params.priority,
    expiresAt: now + params.durationUs,
  };
  schedule.interrupts.push(interrupt);
  return toReadonlyInterrupt(interrupt);
}

function resolveImpl(
  state: ScheduleV2State,
  npcId: string,
  hour: number,
  day: DayOfWeek,
): ResolvedActivity | undefined {
  const schedule = state.schedules.get(npcId);
  if (schedule === undefined) return undefined;
  const interrupt = findActiveInterrupt(schedule, state);
  if (interrupt !== undefined) return interrupt;
  return findMatchingBlock(schedule, hour, day);
}

function findActiveInterrupt(
  schedule: MutableScheduleV2,
  state: ScheduleV2State,
): ResolvedActivity | undefined {
  const now = state.deps.clock.nowMicroseconds();
  let best: MutableInterrupt | undefined;
  for (const int of schedule.interrupts) {
    if (now >= int.expiresAt) continue;
    if (best === undefined || int.priority > best.priority) best = int;
  }
  if (best === undefined) return undefined;
  return {
    npcId: schedule.npcId,
    activity: best.activity,
    locationId: best.locationId,
    isInterrupt: true,
    reason: best.reason,
  };
}

function findMatchingBlock(
  schedule: MutableScheduleV2,
  hour: number,
  day: DayOfWeek,
): ResolvedActivity | undefined {
  let best: MutableBlockV2 | undefined;
  for (const block of schedule.blocks) {
    if (!blockMatchesTime(block, hour, day)) continue;
    if (best === undefined || block.priority > best.priority) best = block;
  }
  if (best === undefined) return undefined;
  return {
    npcId: schedule.npcId,
    activity: best.activity,
    locationId: best.locationId,
    isInterrupt: false,
    reason: null,
  };
}

function blockMatchesTime(block: MutableBlockV2, hour: number, day: DayOfWeek): boolean {
  if (!block.days.includes(day)) return false;
  if (block.startHour <= block.endHour) {
    return hour >= block.startHour && hour < block.endHour;
  }
  return hour >= block.startHour || hour < block.endHour;
}

function applyTemplateImpl(
  state: ScheduleV2State,
  npcId: string,
  template: ScheduleV2TemplateName,
): NpcScheduleV2 {
  if (!state.schedules.has(npcId)) {
    createScheduleImpl(state, npcId);
  }
  const blocks = SCHEDULE_TEMPLATES[template];
  for (const tb of blocks) {
    addBlockImpl(state, {
      npcId,
      activity: tb.activity,
      startHour: tb.startHour,
      endHour: tb.endHour,
      locationId: tb.location,
      days: tb.days,
    });
  }
  return toReadonlySchedule(getOrThrow(state, npcId));
}

function sweepExpiredImpl(state: ScheduleV2State): number {
  const now = state.deps.clock.nowMicroseconds();
  let removed = 0;
  for (const schedule of state.schedules.values()) {
    const before = schedule.interrupts.length;
    const kept = schedule.interrupts.filter((i) => now < i.expiresAt);
    schedule.interrupts.length = 0;
    schedule.interrupts.push(...kept);
    removed += before - kept.length;
  }
  return removed;
}

function getStatsImpl(state: ScheduleV2State): ScheduleV2Stats {
  let totalBlocks = 0;
  let activeInterrupts = 0;
  const now = state.deps.clock.nowMicroseconds();
  for (const schedule of state.schedules.values()) {
    totalBlocks += schedule.blocks.length;
    for (const int of schedule.interrupts) {
      if (now < int.expiresAt) activeInterrupts++;
    }
  }
  return { totalSchedules: state.schedules.size, totalBlocks, activeInterrupts };
}

// ── Helpers ──────────────────────────────────────────────────────

function clampHour(h: number): number {
  return Math.max(0, Math.min(23, Math.floor(h)));
}

function getOrThrow(state: ScheduleV2State, npcId: string): MutableScheduleV2 {
  const schedule = state.schedules.get(npcId);
  if (schedule === undefined) throw new Error('Schedule for ' + npcId + ' not found');
  return schedule;
}

function toReadonlySchedule(s: MutableScheduleV2): NpcScheduleV2 {
  return {
    scheduleId: s.scheduleId,
    npcId: s.npcId,
    blocks: s.blocks.map(toReadonlyBlock),
    interrupts: s.interrupts.map(toReadonlyInterrupt),
    createdAt: s.createdAt,
  };
}

function toReadonlyBlock(b: MutableBlockV2): ScheduleV2Block {
  return {
    blockId: b.blockId,
    activity: b.activity,
    startHour: b.startHour,
    endHour: b.endHour,
    locationId: b.locationId,
    days: [...b.days],
    priority: b.priority,
  };
}

function toReadonlyInterrupt(i: MutableInterrupt): ScheduleV2Interrupt {
  return {
    interruptId: i.interruptId,
    activity: i.activity,
    locationId: i.locationId,
    reason: i.reason,
    priority: i.priority,
    expiresAt: i.expiresAt,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcScheduleV2System(deps: ScheduleV2Deps): NpcScheduleV2System {
  const state: ScheduleV2State = { deps, schedules: new Map() };

  return {
    createSchedule: (npcId) => createScheduleImpl(state, npcId),
    addBlock: (params) => addBlockImpl(state, params),
    removeBlock: (npcId, blockId) => removeBlockImpl(state, npcId, blockId),
    addInterrupt: (params) => addInterruptImpl(state, params),
    clearInterrupts: (npcId) => clearInterruptsImpl(state, npcId),
    sweepExpiredInterrupts: () => sweepExpiredImpl(state),
    resolve: (npcId, hour, day) => resolveImpl(state, npcId, hour, day),
    applyTemplate: (npcId, tmpl) => applyTemplateImpl(state, npcId, tmpl),
    getSchedule: (npcId) => {
      const s = state.schedules.get(npcId);
      return s !== undefined ? toReadonlySchedule(s) : undefined;
    },
    removeSchedule: (npcId) => state.schedules.delete(npcId),
    getStats: () => getStatsImpl(state),
  };
}

function removeBlockImpl(state: ScheduleV2State, npcId: string, blockId: string): boolean {
  const schedule = state.schedules.get(npcId);
  if (schedule === undefined) return false;
  const idx = schedule.blocks.findIndex((b) => b.blockId === blockId);
  if (idx < 0) return false;
  schedule.blocks.splice(idx, 1);
  return true;
}

function clearInterruptsImpl(state: ScheduleV2State, npcId: string): number {
  const schedule = state.schedules.get(npcId);
  if (schedule === undefined) return 0;
  const count = schedule.interrupts.length;
  schedule.interrupts.length = 0;
  return count;
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcScheduleV2System, SCHEDULE_TEMPLATES };
export type {
  NpcScheduleV2System,
  ScheduleV2Deps,
  ScheduleV2Activity,
  DayOfWeek,
  ScheduleV2Block,
  ScheduleV2Interrupt,
  NpcScheduleV2,
  AddBlockV2Params,
  AddInterruptParams,
  ResolvedActivity,
  ScheduleV2TemplateName,
  ScheduleV2Stats,
};
