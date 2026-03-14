/**
 * hidden-zones.ts — Hidden Zones & Secret Areas from Bible v5 Part 7.
 *
 * Discoverable areas that reward deep exploration. NOT required for
 * progression — pure delight. Each zone has a unique discovery trigger
 * and narrative purpose. Finding one grants +15 Spark (one-time).
 */

// ── Ports ────────────────────────────────────────────────────────

export interface HiddenZoneClockPort {
  readonly nowMs: () => number;
}

export interface HiddenZoneLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface HiddenZoneEventPort {
  readonly emit: (event: HiddenZoneEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const SPARK_REWARD_HIDDEN_ZONE = 15;
export const IN_BETWEEN_LINGER_MS = 10_000;
export const MIN_ENTRIES_FOR_DREAM_ARCHIVE = 10;

// ── Types ────────────────────────────────────────────────────────

export type HiddenZoneId =
  | 'the-in-between'
  | 'the-inverse-garden'
  | 'the-whales-library'
  | 'the-unfinished-room'
  | 'the-dream-archive';

export type HiddenZoneAccessScopeId = 'any-threadway';

export type DiscoveryTriggerType =
  | 'linger-in-threadway'
  | 'complete-all-entries'
  | 'follow-npc'
  | 'complete-entries-and-ask'
  | 'time-and-entry-count';

export type HiddenZoneEventKind =
  | 'zone-discovered'
  | 'zone-entered'
  | 'zone-exited';

export interface HiddenZoneEvent {
  readonly kind: HiddenZoneEventKind;
  readonly zoneId: HiddenZoneId;
  readonly kindlerId: string;
  readonly timestampMs: number;
}

export interface DiscoveryTrigger {
  readonly type: DiscoveryTriggerType;
  readonly description: string;
  readonly requiredWorldId: string | null;
  readonly requiredEntryCount: number;
  readonly requiredNpcId: string | null;
  readonly lingerDurationMs: number;
  readonly requiresNightCycle: boolean;
}

export interface HiddenZoneDefinition {
  readonly zoneId: HiddenZoneId;
  readonly name: string;
  readonly location: string;
  readonly description: string;
  readonly narrativePurpose: string;
  readonly accessWorldId: string | null;
  readonly accessScopeId: HiddenZoneAccessScopeId | null;
  readonly discoveryTrigger: DiscoveryTrigger;
  readonly sparkReward: number;
}

export interface KindlerZoneState {
  readonly kindlerId: string;
  readonly discoveredZoneIds: ReadonlySet<HiddenZoneId>;
  readonly completedWorldIds: ReadonlySet<string>;
  readonly completedEntryCount: number;
  readonly totalDistinctWorldsVisited: number;
}

export interface ZoneDiscoveryResult {
  readonly zoneId: HiddenZoneId;
  readonly discovered: boolean;
  readonly sparkGained: number;
  readonly message: string;
}

// ── Hidden Zone Definitions ──────────────────────────────────────

const HIDDEN_ZONES: ReadonlyArray<HiddenZoneDefinition> = [
  {
    zoneId: 'the-in-between',
    name: 'The In-Between',
    location: 'Accessible from any Threadway by stopping in the middle',
    description: 'A liminal space where worlds overlap. The sky shows both worlds simultaneously. Sound blends. Colors merge.',
    narrativePurpose: 'Compass tells stories about connections between subjects that no one else knows',
    accessWorldId: null,
    accessScopeId: 'any-threadway',
    discoveryTrigger: {
      type: 'linger-in-threadway',
      description: 'Stand still in a Threadway for 10 seconds',
      requiredWorldId: null,
      requiredEntryCount: 0,
      requiredNpcId: null,
      lingerDurationMs: IN_BETWEEN_LINGER_MS,
      requiresNightCycle: false,
    },
    sparkReward: SPARK_REWARD_HIDDEN_ZONE,
  },
  {
    zoneId: 'the-inverse-garden',
    name: 'The Inverse Garden',
    location: 'Under the Number Garden, accessible through the Zero Pool',
    description: 'A garden where everything is negative — flowers grow downward, light comes from below, numbers are all negative.',
    narrativePurpose: 'Dottie says this is where subtraction lives. Cal has a secret cave entrance here.',
    accessWorldId: 'number-garden',
    accessScopeId: null,
    discoveryTrigger: {
      type: 'complete-all-entries',
      description: 'Complete all Number Garden entries',
      requiredWorldId: 'number-garden',
      requiredEntryCount: 0,
      requiredNpcId: null,
      lingerDurationMs: 0,
      requiresNightCycle: false,
    },
    sparkReward: SPARK_REWARD_HIDDEN_ZONE,
  },
  {
    zoneId: 'the-whales-library',
    name: "The Whale's Library",
    location: 'Deep in Tideline Bay, past the Abyssal Plain',
    description: 'A massive whale skeleton that has become an underwater library. Barnacles have formed into text. Sea creatures live in chambers that were once organs.',
    narrativePurpose: 'Suki discovered it years ago and has never told anyone',
    accessWorldId: 'tideline-bay',
    accessScopeId: null,
    discoveryTrigger: {
      type: 'follow-npc',
      description: 'Follow Hachi (the octopus) when he swims away during a lesson',
      requiredWorldId: 'tideline-bay',
      requiredEntryCount: 0,
      requiredNpcId: 'hachi',
      lingerDurationMs: 0,
      requiresNightCycle: false,
    },
    sparkReward: SPARK_REWARD_HIDDEN_ZONE,
  },
  {
    zoneId: 'the-unfinished-room',
    name: 'The Unfinished Room',
    location: 'Top floor of the Editing Tower',
    description: "Wren's 47th draft of their novel. The room literally isn't finished — walls fade into white, sentences trail off, characters are half-formed.",
    narrativePurpose: "A space about the courage to keep creating even when you're not done",
    accessWorldId: 'editing-tower',
    accessScopeId: null,
    discoveryTrigger: {
      type: 'complete-entries-and-ask',
      description: 'Complete all Editing Tower entries and ask Wren about their novel',
      requiredWorldId: 'editing-tower',
      requiredEntryCount: 0,
      requiredNpcId: 'wren-calloway',
      lingerDurationMs: 0,
      requiresNightCycle: false,
    },
    sparkReward: SPARK_REWARD_HIDDEN_ZONE,
  },
  {
    zoneId: 'the-dream-archive',
    name: 'The Dream Archive',
    location: 'Accessible from the Wellness Garden at night',
    description: "A visual representation of the dreaming brain. Memories from the child's own play sessions appear as floating fragments.",
    narrativePurpose: 'Hana explains that dreams are how your brain organizes what you\'ve learned',
    accessWorldId: 'wellness-garden',
    accessScopeId: null,
    discoveryTrigger: {
      type: 'time-and-entry-count',
      description: 'Visit the Wellness Garden during the night cycle after completing at least 10 entries across different worlds',
      requiredWorldId: 'wellness-garden',
      requiredEntryCount: MIN_ENTRIES_FOR_DREAM_ARCHIVE,
      requiredNpcId: null,
      lingerDurationMs: 0,
      requiresNightCycle: true,
    },
    sparkReward: SPARK_REWARD_HIDDEN_ZONE,
  },
];

// ── Port ─────────────────────────────────────────────────────────

export interface HiddenZonePort {
  readonly getAllZones: () => ReadonlyArray<HiddenZoneDefinition>;
  readonly getZoneById: (id: HiddenZoneId) => HiddenZoneDefinition | undefined;
  readonly checkDiscoveryEligibility: (zoneId: HiddenZoneId, state: KindlerZoneState) => boolean;
  readonly evaluateDiscovery: (state: KindlerZoneState) => ReadonlyArray<ZoneDiscoveryResult>;
  readonly getTotalSparkAvailable: () => number;
  readonly getDiscoveredCount: (state: KindlerZoneState) => number;
}

// ── Implementation ───────────────────────────────────────────────

function getZoneById(id: HiddenZoneId): HiddenZoneDefinition | undefined {
  return HIDDEN_ZONES.find(z => z.zoneId === id);
}

function checkDiscoveryEligibility(zoneId: HiddenZoneId, state: KindlerZoneState): boolean {
  if (state.discoveredZoneIds.has(zoneId)) return false;
  const zone = getZoneById(zoneId);
  if (!zone) return false;

  const trigger = zone.discoveryTrigger;

  switch (trigger.type) {
    case 'linger-in-threadway':
      return true; // Eligible for any kindler in a threadway
    case 'complete-all-entries':
      return trigger.requiredWorldId !== null && state.completedWorldIds.has(trigger.requiredWorldId);
    case 'follow-npc':
      return trigger.requiredWorldId !== null && state.completedWorldIds.has(trigger.requiredWorldId);
    case 'complete-entries-and-ask':
      return trigger.requiredWorldId !== null && state.completedWorldIds.has(trigger.requiredWorldId);
    case 'time-and-entry-count':
      return state.completedEntryCount >= trigger.requiredEntryCount &&
        state.totalDistinctWorldsVisited >= MIN_ENTRIES_FOR_DREAM_ARCHIVE;
  }
}

function evaluateDiscovery(state: KindlerZoneState): ReadonlyArray<ZoneDiscoveryResult> {
  return HIDDEN_ZONES.map(zone => {
    const alreadyDiscovered = state.discoveredZoneIds.has(zone.zoneId);
    const eligible = !alreadyDiscovered && checkDiscoveryEligibility(zone.zoneId, state);
    return {
      zoneId: zone.zoneId,
      discovered: eligible,
      sparkGained: eligible ? zone.sparkReward : 0,
      message: alreadyDiscovered
        ? `${zone.name} already discovered`
        : eligible
          ? `${zone.name} is now discoverable!`
          : `${zone.name} remains hidden`,
    };
  });
}

function getTotalSparkAvailable(): number {
  return HIDDEN_ZONES.reduce((sum, z) => sum + z.sparkReward, 0);
}

function getDiscoveredCount(state: KindlerZoneState): number {
  return state.discoveredZoneIds.size;
}

// ── Factory ──────────────────────────────────────────────────────

export function createHiddenZones(): HiddenZonePort {
  return {
    getAllZones: () => HIDDEN_ZONES,
    getZoneById,
    checkDiscoveryEligibility,
    evaluateDiscovery,
    getTotalSparkAvailable,
    getDiscoveredCount,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface HiddenZoneEngine {
  readonly kind: 'hidden-zones';
  readonly zones: HiddenZonePort;
}

export function createHiddenZoneEngine(
  deps: { readonly clock: HiddenZoneClockPort; readonly log: HiddenZoneLogPort; readonly events: HiddenZoneEventPort },
): HiddenZoneEngine {
  const zones = createHiddenZones();
  deps.log.info({ zoneCount: zones.getAllZones().length }, 'Hidden zones initialized');
  return { kind: 'hidden-zones', zones };
}
