/**
 * seasonal-content.ts — Seasonal & Live Content Calendar from Bible v5 Part 6.
 *
 * The worlds change with the real calendar, adding freshness and
 * reasons to return. 12 monthly events affect different worlds.
 * Daily rhythms drive character schedules, ambient audio, visual mood,
 * and time-locked content.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface SeasonalClockPort {
  readonly nowMs: () => number;
}

export interface SeasonalLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface SeasonalEventPort {
  readonly emit: (event: SeasonalEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const LUMINANCE_BOOST_NEW_YEAR = 5;
export const HOURS_IN_DAY_CYCLE = 24;
export const GOLDEN_HOUR_START = 17;
export const GOLDEN_HOUR_END = 19;
export const NIGHT_START = 21;
export const NIGHT_END = 5;

// ── Types ────────────────────────────────────────────────────────

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'golden-hour' | 'evening' | 'night';

export type SeasonalEventKind =
  | 'monthly-event-started'
  | 'monthly-event-ended'
  | 'time-of-day-changed'
  | 'daily-rhythm-updated';

export interface SeasonalEvent {
  readonly kind: SeasonalEventKind;
  readonly timestampMs: number;
  readonly detail: Readonly<Record<string, unknown>>;
}

export interface MonthlyEvent {
  readonly month: Month;
  readonly name: string;
  readonly affectedWorldIds: ReadonlyArray<string>;
  readonly newContent: string;
  readonly luminanceBoost: number;
}

export interface DailyRhythm {
  readonly worldId: string;
  readonly alwaysNight: boolean;
  readonly activeCharacterShift: 'morning' | 'evening' | 'all-day';
  readonly timeLockedContent: ReadonlyArray<TimeLockedContent>;
}

export interface TimeLockedContent {
  readonly contentId: string;
  readonly description: string;
  readonly availableTimeOfDay: TimeOfDay;
  readonly worldId: string;
}

export interface SeasonalCalendarState {
  readonly currentMonth: Month;
  readonly currentHour: number;
  readonly activeEvents: ReadonlyArray<MonthlyEvent>;
  readonly timeOfDay: TimeOfDay;
}

// ── Monthly Events Calendar ──────────────────────────────────────

const MONTHLY_EVENTS: ReadonlyArray<MonthlyEvent> = [
  { month: 1, name: 'New Year\'s Reset', affectedWorldIds: ['all'], newContent: 'The Fresh Start — all worlds gain +5 luminance. Fresh snow in Frost Peaks', luminanceBoost: 5 },
  { month: 2, name: 'Inventor\'s Month', affectedWorldIds: ['savanna-workshop', 'code-canyon', 'circuit-marsh'], newContent: 'Spotlight on lesser-known inventors. New entries surface temporarily', luminanceBoost: 0 },
  { month: 3, name: 'Women\'s History Month', affectedWorldIds: ['all-female-guides'], newContent: 'Special quests highlighting Hypatia, Curie, Hamilton, Earle, Maathai', luminanceBoost: 0 },
  { month: 4, name: 'Earth Month', affectedWorldIds: ['cloud-kingdom', 'meadow-lab', 'tideline-bay'], newContent: 'Environmental entries spotlighted. Ocean cleanup quest in Tideline Bay', luminanceBoost: 0 },
  { month: 5, name: 'Story Season', affectedWorldIds: ['story-tree', 'folklore-bazaar'], newContent: 'New stories added. Oral storytelling challenge', luminanceBoost: 0 },
  { month: 6, name: 'Music Festival', affectedWorldIds: ['music-meadow'], newContent: 'Luna hosts a cross-world music festival. Characters contribute leitmotifs', luminanceBoost: 0 },
  { month: 7, name: 'Explorer\'s Month', affectedWorldIds: ['map-room', 'discovery-trail'], newContent: 'New geography field trips unlocked temporarily', luminanceBoost: 0 },
  { month: 8, name: 'Math Week', affectedWorldIds: ['number-garden', 'calculation-caves'], newContent: 'Math puzzles challenge across all STEM worlds', luminanceBoost: 0 },
  { month: 9, name: 'Back to School', affectedWorldIds: ['great-archive'], newContent: 'The Librarian hosts a welcome back event. World state refreshes', luminanceBoost: 0 },
  { month: 10, name: 'Curiosity Month', affectedWorldIds: ['all'], newContent: 'Mystery entries appear. Things science doesn\'t know yet', luminanceBoost: 0 },
  { month: 11, name: 'Gratitude Season', affectedWorldIds: ['sharing-meadow', 'charity-harbor'], newContent: 'Community economics spotlight. Collaborative giving quest', luminanceBoost: 0 },
  { month: 12, name: 'The Great Restoration', affectedWorldIds: ['all'], newContent: 'End-of-year event where all Kindlers collaborate to restore the most Faded world', luminanceBoost: 0 },
];

// ── Daily Rhythm Definitions ─────────────────────────────────────

const TIME_LOCKED_CONTENT: ReadonlyArray<TimeLockedContent> = [
  { contentId: 'aurora-borealis', description: 'Aurora Borealis visible at night in Magnet Hills', availableTimeOfDay: 'night', worldId: 'magnet-hills' },
  { contentId: 'dawn-chorus', description: 'Dawn chorus in Meadow Lab', availableTimeOfDay: 'dawn', worldId: 'meadow-lab' },
  { contentId: 'golden-market', description: 'Golden hour atmosphere in Market Square', availableTimeOfDay: 'golden-hour', worldId: 'market-square' },
  { contentId: 'frost-blue-hour', description: 'Blue hour sky in Frost Peaks', availableTimeOfDay: 'evening', worldId: 'frost-peaks' },
  { contentId: 'dream-archive', description: 'Dream Archive accessible at night in Wellness Garden', availableTimeOfDay: 'night', worldId: 'wellness-garden' },
  { contentId: 'cricket-songs', description: 'Cricket songs at night across STEM worlds', availableTimeOfDay: 'night', worldId: 'meadow-lab' },
];

// ── Port ─────────────────────────────────────────────────────────

export interface SeasonalContentPort {
  readonly getMonthlyEvents: () => ReadonlyArray<MonthlyEvent>;
  readonly getActiveEvent: (month: Month) => MonthlyEvent;
  readonly computeTimeOfDay: (hour: number) => TimeOfDay;
  readonly getTimeLockedContent: (worldId: string, timeOfDay: TimeOfDay) => ReadonlyArray<TimeLockedContent>;
  readonly getAllTimeLockedContent: () => ReadonlyArray<TimeLockedContent>;
  readonly computeCalendarState: (nowMs: number) => SeasonalCalendarState;
  readonly isWorldAffected: (worldId: string, month: Month) => boolean;
  readonly getGreatRestorationTarget: (worldLuminances: ReadonlyMap<string, number>) => string | null;
}

// ── Implementation ───────────────────────────────────────────────

function computeTimeOfDay(hour: number): TimeOfDay {
  if (hour >= NIGHT_START || hour < NIGHT_END) return 'night';
  if (hour >= NIGHT_END && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < GOLDEN_HOUR_START) return 'afternoon';
  if (hour >= GOLDEN_HOUR_START && hour < GOLDEN_HOUR_END) return 'golden-hour';
  return 'evening';
}

function getActiveEvent(month: Month): MonthlyEvent {
  return MONTHLY_EVENTS[month - 1];
}

function getTimeLockedContent(worldId: string, timeOfDay: TimeOfDay): ReadonlyArray<TimeLockedContent> {
  return TIME_LOCKED_CONTENT.filter(c => c.worldId === worldId && c.availableTimeOfDay === timeOfDay);
}

function computeCalendarState(nowMs: number): SeasonalCalendarState {
  const date = new Date(nowMs);
  const month = (date.getUTCMonth() + 1) as Month;
  const hour = date.getUTCHours();
  const event = getActiveEvent(month);
  return {
    currentMonth: month,
    currentHour: hour,
    activeEvents: [event],
    timeOfDay: computeTimeOfDay(hour),
  };
}

function isWorldAffected(worldId: string, month: Month): boolean {
  const event = getActiveEvent(month);
  return event.affectedWorldIds.includes('all') || event.affectedWorldIds.includes(worldId);
}

function getGreatRestorationTarget(worldLuminances: ReadonlyMap<string, number>): string | null {
  let minWorld: string | null = null;
  let minLuminance = Infinity;
  for (const [worldId, luminance] of worldLuminances) {
    if (luminance < minLuminance) {
      minLuminance = luminance;
      minWorld = worldId;
    }
  }
  return minWorld;
}

// ── Factory ──────────────────────────────────────────────────────

export function createSeasonalContent(): SeasonalContentPort {
  return {
    getMonthlyEvents: () => MONTHLY_EVENTS,
    getActiveEvent,
    computeTimeOfDay,
    getTimeLockedContent,
    getAllTimeLockedContent: () => TIME_LOCKED_CONTENT,
    computeCalendarState,
    isWorldAffected,
    getGreatRestorationTarget,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface SeasonalContentEngine {
  readonly kind: 'seasonal-content';
  readonly seasonal: SeasonalContentPort;
}

export function createSeasonalContentEngine(
  deps: { readonly clock: SeasonalClockPort; readonly log: SeasonalLogPort; readonly events: SeasonalEventPort },
): SeasonalContentEngine {
  const seasonal = createSeasonalContent();
  deps.log.info({ eventCount: seasonal.getMonthlyEvents().length }, 'Seasonal content calendar initialized');
  return { kind: 'seasonal-content', seasonal };
}
