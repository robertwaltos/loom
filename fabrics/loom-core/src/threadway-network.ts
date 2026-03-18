/**
 * threadway-network.ts — The Threadway Network from Expansion Bible v5.
 *
 * Threadways are inter-world connections that represent subject links.
 * Children discover them as they make conceptual connections between worlds.
 *
 * Discovery tiers:
 *   Tier 1 — Always visible: Hub ↔ any world within the same Realm
 *   Tier 2 — Unlock after first completion in both worlds (same-Realm)
 *   Tier 3 — Unlock after specific cross-topic discovery (cross-Realm)
 *
 * Each threadway has a sensory identity: color shift, soundscape transition,
 * and environmental transformation. No loading screens — children walk
 * from one world into another.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface ThreadwayClockPort {
  readonly nowMs: () => number;
}

export interface ThreadwayLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface ThreadwayEventPort {
  readonly emit: (event: ThreadwayEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const LINGER_DISCOVERY_MS = 10_000;
export const THREADWAY_CELEBRATION_DURATION_MS = 3_000;
export const MAX_ACTIVE_THREADWAYS = 200;
export const LUMINANCE_BOOST_ON_DISCOVERY = 5;

// ── Types ────────────────────────────────────────────────────────

export type Realm = 'stem' | 'language-arts' | 'financial-literacy' | 'crossroads' | 'hub';

export type DiscoveryTier = 1 | 2 | 3;

export type ThreadwayStatus = 'hidden' | 'visible' | 'discovered' | 'traversed';

export type ThreadwayEventKind =
  | 'threadway-discovered'
  | 'threadway-traversed'
  | 'in-between-entered'
  | 'celebration-triggered';

export interface ThreadwayEvent {
  readonly kind: ThreadwayEventKind;
  readonly threadwayId: string;
  readonly kindlerId: string;
  readonly timestampMs: number;
}

export interface ThreadwayTransition {
  readonly visualDescription: string;
  readonly audioTransition: string;
}

export interface ThreadwayDefinition {
  readonly threadwayId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly conceptLink: string;
  readonly tier: DiscoveryTier;
  readonly realm: Realm;
  readonly transition: ThreadwayTransition;
  readonly discoveryTriggerEntryIds: ReadonlyArray<string>;
}

export interface KindlerThreadwayState {
  readonly kindlerId: string;
  readonly discoveredThreadwayIds: ReadonlySet<string>;
  readonly traversedThreadwayIds: ReadonlySet<string>;
  readonly completedEntryIds: ReadonlySet<string>;
  readonly completedWorldIds: ReadonlySet<string>;
}

export interface ThreadwayDiscoveryResult {
  readonly threadwayId: string;
  readonly status: ThreadwayStatus;
  readonly sparkGained: number;
  readonly luminanceBoost: number;
}

export interface InBetweenSpace {
  readonly activeWorldIds: readonly [string, string];
  readonly lingerStartMs: number;
  readonly discovered: boolean;
}

export interface ThreadwayNetworkStats {
  readonly totalThreadways: number;
  readonly tier1Count: number;
  readonly tier2Count: number;
  readonly tier3Count: number;
  readonly discoveredCount: number;
  readonly traversedCount: number;
}

// ── Hub Portals ──────────────────────────────────────────────────

export interface HubPortal {
  readonly portalId: string;
  readonly name: string;
  readonly realm: Realm;
  readonly visualIdentity: string;
  readonly audioTransition: string;
}

const HUB_PORTALS: ReadonlyArray<HubPortal> = [
  { portalId: 'green-door', name: 'The Green Door', realm: 'stem', visualIdentity: 'Ivy-covered stone arch, bioluminescent moss', audioTransition: 'Library hush → birdsong + running water' },
  { portalId: 'amber-gate', name: 'The Amber Gate', realm: 'language-arts', visualIdentity: 'Carved wooden doorframe, pages flutter in threshold', audioTransition: 'Library hush → crackling fire + pen scratch' },
  { portalId: 'copper-arch', name: 'The Copper Arch', realm: 'financial-literacy', visualIdentity: 'Hammered copper frame, coins embedded in threshold', audioTransition: 'Library hush → market chatter + steel drums' },
  { portalId: 'crystal-path', name: 'The Crystal Path', realm: 'crossroads', visualIdentity: 'Transparent crystalline tunnel, refracted light', audioTransition: 'Library hush → wind chimes + distant voices' },
  { portalId: 'compass-rose', name: 'The Compass Rose', realm: 'hub', visualIdentity: 'Floor mosaic that glows, Compass appears when stepped on', audioTransition: "Library hush → Compass's theme (gentle bells)" },
];

// ── Canonical Threadway Definitions ──────────────────────────────

const STEM_THREADWAYS: ReadonlyArray<ThreadwayDefinition> = [
  { threadwayId: 'number-garden→starfall', fromWorldId: 'number-garden', toWorldId: 'starfall-observatory', conceptLink: 'Math → Astronomy (orbital calculations)', tier: 2, realm: 'stem', transition: { visualDescription: 'Flowers become star patterns; petals turn to constellations', audioTransition: 'Garden chimes fade into cosmic resonance' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'number-garden→music-meadow', fromWorldId: 'number-garden', toWorldId: 'music-meadow', conceptLink: 'Math → Music (Fibonacci in rhythm)', tier: 2, realm: 'stem', transition: { visualDescription: 'Garden chimes align into melody; flowers become sound waves', audioTransition: 'Peaceful garden ambience → rhythmic melodies' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'cloud-kingdom→tideline', fromWorldId: 'cloud-kingdom', toWorldId: 'tideline-bay', conceptLink: 'Weather → Ocean (water cycle)', tier: 2, realm: 'stem', transition: { visualDescription: 'Clouds descend into rain, rain becomes ocean spray', audioTransition: 'Thunder rumble → crashing waves' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'cloud-kingdom→frost-peaks', fromWorldId: 'cloud-kingdom', toWorldId: 'frost-peaks', conceptLink: 'Weather → Geology (erosion, glaciation)', tier: 2, realm: 'stem', transition: { visualDescription: 'Storm clouds part to reveal frozen peaks', audioTransition: 'Wind howl → glacial echoes' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'meadow-lab→greenhouse', fromWorldId: 'meadow-lab', toWorldId: 'greenhouse-spiral', conceptLink: 'Biology → Chemistry (photosynthesis)', tier: 2, realm: 'stem', transition: { visualDescription: 'Living plants transition to molecular structures', audioTransition: 'Rustling leaves → glass clink' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'circuit-marsh→code-canyon', fromWorldId: 'circuit-marsh', toWorldId: 'code-canyon', conceptLink: 'Electricity → Coding (signals → logic)', tier: 2, realm: 'stem', transition: { visualDescription: 'Physical wires become light-streams of code', audioTransition: 'Electrical buzz → keyboard clicks' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'magnet-hills→starfall', fromWorldId: 'magnet-hills', toWorldId: 'starfall-observatory', conceptLink: 'Physics → Astronomy (gravity, orbits)', tier: 2, realm: 'stem', transition: { visualDescription: 'Falling objects arc upward into orbital paths', audioTransition: 'Metallic hum → deep space ambience' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'body-atlas→meadow-lab', fromWorldId: 'body-atlas', toWorldId: 'meadow-lab', conceptLink: 'Human body → Plant biology (breathing cycle)', tier: 2, realm: 'stem', transition: { visualDescription: 'Lungs exhale into leaves that photosynthesize', audioTransition: 'Heartbeat → birdsong' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'data-stream→map-room', fromWorldId: 'data-stream', toWorldId: 'map-room', conceptLink: 'Data → Geography (mapping as data viz)', tier: 2, realm: 'stem', transition: { visualDescription: 'Charts morph into terrain; graphs become mountain ranges', audioTransition: 'Digital beeps → wind across plains' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'frost-peaks→tideline', fromWorldId: 'frost-peaks', toWorldId: 'tideline-bay', conceptLink: 'Geology → Marine (seafloor geology)', tier: 2, realm: 'stem', transition: { visualDescription: 'Rock face descends underwater; crystals become coral', audioTransition: 'Cracking ice → underwater bubbles' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'calc-caves→number-garden', fromWorldId: 'calculation-caves', toWorldId: 'number-garden', conceptLink: 'Arithmetic → Patterns', tier: 2, realm: 'stem', transition: { visualDescription: 'Cave crystals bloom into garden flowers', audioTransition: 'Echo drips → birdsong' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'savanna→magnet-hills', fromWorldId: 'savanna-workshop', toWorldId: 'magnet-hills', conceptLink: 'Engineering → Physics (force application)', tier: 2, realm: 'stem', transition: { visualDescription: 'Workshop tools become physics demonstrations', audioTransition: 'Hammering → magnetic hum' }, discoveryTriggerEntryIds: [] },
];

const LANG_ARTS_THREADWAYS: ReadonlyArray<ThreadwayDefinition> = [
  { threadwayId: 'story-tree→folklore', fromWorldId: 'story-tree', toWorldId: 'folklore-bazaar', conceptLink: 'Narrative → Cultural storytelling', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Tree branches become market awnings; orbs become lanterns', audioTransition: 'Rustling pages → bazaar melodies' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'letter-forge→spelling-mines', fromWorldId: 'letter-forge', toWorldId: 'spelling-mines', conceptLink: 'Letters → Spelling (letters to words)', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Forged letters tumble into mine shafts, crystallizing into words', audioTransition: 'Anvil strikes → pickaxe taps' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'reading-reef→vocab-jungle', fromWorldId: 'reading-reef', toWorldId: 'vocabulary-jungle', conceptLink: 'Comprehension → Word knowledge', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Coral letters grow into jungle vines of vocabulary', audioTransition: 'Underwater bubbles → jungle calls' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'rhyme-docks→music-meadow', fromWorldId: 'rhyme-docks', toWorldId: 'music-meadow', conceptLink: 'Poetry → Music (rhythm connects)', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Harbor waves become sound waves; dock creaks become percussion', audioTransition: 'Sea shanty → symphonic melody' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'grammar-bridge→editing-tower', fromWorldId: 'grammar-bridge', toWorldId: 'editing-tower', conceptLink: 'Structure → Revision', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Bridge materials become manuscript pages in the Tower', audioTransition: 'Wooden bridge creaks → pen scratching' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'diary-lighthouse→story-tree', fromWorldId: 'diary-lighthouse', toWorldId: 'story-tree', conceptLink: 'Personal writing → Narrative', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Lighthouse beam illuminates Story Tree from afar', audioTransition: 'Foghorn → gentle wind in leaves' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'debate-arena→nonfiction-fleet', fromWorldId: 'debate-arena', toWorldId: 'nonfiction-fleet', conceptLink: 'Argument → Evidence/Research', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Arena columns become ship masts; speeches become sails', audioTransition: 'Crowd debate → ocean breeze' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'punctuation→grammar-bridge', fromWorldId: 'punctuation-station', toWorldId: 'grammar-bridge', conceptLink: 'Punctuation → Sentence structure', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Railway signals become bridge supports', audioTransition: 'Train whistle → bridge bells' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'translation→folklore', fromWorldId: 'translation-garden', toWorldId: 'folklore-bazaar', conceptLink: 'Languages → Cultural stories', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Garden paths lead to bazaar stalls from different cultures', audioTransition: 'Multilingual whispers → market chatter' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'illustration→story-tree', fromWorldId: 'illustration-cove', toWorldId: 'story-tree', conceptLink: 'Visual storytelling → Narrative', tier: 2, realm: 'language-arts', transition: { visualDescription: 'Painted images animate into story orbs', audioTransition: 'Brush strokes → page turns' }, discoveryTriggerEntryIds: [] },
];

const FINANCE_THREADWAYS: ReadonlyArray<ThreadwayDefinition> = [
  { threadwayId: 'market→barter', fromWorldId: 'market-square', toWorldId: 'barter-docks', conceptLink: 'Trade → History of money', tier: 2, realm: 'financial-literacy', transition: { visualDescription: 'Coins age and transform into shells, beads, stones', audioTransition: 'Cash register → ancient trading sounds' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'savings→investment', fromWorldId: 'savings-vault', toWorldId: 'investment-greenhouse', conceptLink: 'Saving → Investing', tier: 2, realm: 'financial-literacy', transition: { visualDescription: 'Vault trees become greenhouse seedlings at different growth stages', audioTransition: 'Metal vault → greenhouse drips' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'budget→needs-wants', fromWorldId: 'budget-kitchen', toWorldId: 'needs-wants-bridge', conceptLink: 'Budgeting → Decision-making', tier: 2, realm: 'financial-literacy', transition: { visualDescription: "Kitchen ingredients sort onto bridge's two sides", audioTransition: 'Cooking sounds → thoughtful pause' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'entrepreneur→job-fair', fromWorldId: 'entrepreneur-workshop', toWorldId: 'job-fair', conceptLink: 'Starting business → Earning/careers', tier: 2, realm: 'financial-literacy', transition: { visualDescription: 'Workshop inventions become Job Fair displays', audioTransition: 'Workshop buzz → crowd excitement' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'debt→savings', fromWorldId: 'debt-glacier', toWorldId: 'savings-vault', conceptLink: 'Debt → Saving (opposites)', tier: 2, realm: 'financial-literacy', transition: { visualDescription: 'Ice thaws into growing trees', audioTransition: 'Cracking ice → growing leaves' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'tax→charity', fromWorldId: 'tax-office', toWorldId: 'charity-harbor', conceptLink: 'Taxes → Public giving', tier: 2, realm: 'financial-literacy', transition: { visualDescription: 'Tax coins flow into harbor waters that support ships', audioTransition: 'Stamp + filing → harbor bells' }, discoveryTriggerEntryIds: [] },
  { threadwayId: 'sharing→charity', fromWorldId: 'sharing-meadow', toWorldId: 'charity-harbor', conceptLink: 'Community economics → Philanthropy', tier: 2, realm: 'financial-literacy', transition: { visualDescription: 'Meadow flowers become harbor cargo', audioTransition: 'Gentle breeze → dock activity' }, discoveryTriggerEntryIds: [] },
];

const CROSS_REALM_THREADWAYS: ReadonlyArray<ThreadwayDefinition> = [
  { threadwayId: 'number-garden↔music-meadow', fromWorldId: 'number-garden', toWorldId: 'music-meadow', conceptLink: 'Fibonacci in music', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Golden ratio spirals become musical staff lines', audioTransition: 'Mathematical chimes → orchestral swell' }, discoveryTriggerEntryIds: ['fibonacci-rabbits', 'music-meadow-entry'] },
  { threadwayId: 'code-canyon↔entrepreneur', fromWorldId: 'code-canyon', toWorldId: 'entrepreneur-workshop', conceptLink: 'Tech entrepreneurship', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Code streams become business plan blueprints', audioTransition: 'Digital typing → workshop bustle' }, discoveryTriggerEntryIds: ['world-wide-web', 'lemonade-stand'] },
  { threadwayId: 'map-room↔barter-docks', fromWorldId: 'map-room', toWorldId: 'barter-docks', conceptLink: 'Trade routes & geography', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Map contours become trade route markers', audioTransition: 'Compass spinning → merchant calls' }, discoveryTriggerEntryIds: ['polynesian-wayfinding', 'silk-road'] },
  { threadwayId: 'story-tree↔time-gallery', fromWorldId: 'story-tree', toWorldId: 'time-gallery', conceptLink: 'Narrative + History', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Story orbs become historical portraits', audioTransition: 'Page turn → clock chimes' }, discoveryTriggerEntryIds: ['epic-of-gilgamesh', 'time-gallery-entry'] },
  { threadwayId: 'data-stream↔budget-kitchen', fromWorldId: 'data-stream', toWorldId: 'budget-kitchen', conceptLink: 'Data-driven budgeting', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Data charts become recipe proportions', audioTransition: 'Digital pulse → measuring spoons' }, discoveryTriggerEntryIds: ['nightingale-charts', 'budget-kitchen-entry'] },
  { threadwayId: 'frost-peaks↔thinking-grove', fromWorldId: 'frost-peaks', toWorldId: 'thinking-grove', conceptLink: 'Geological time → Philosophical time', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Rock strata become rings of a vast tree', audioTransition: 'Glacial creak → meditative silence' }, discoveryTriggerEntryIds: ['grand-canyon', 'socrates'] },
  { threadwayId: 'letter-forge↔tax-office', fromWorldId: 'letter-forge', toWorldId: 'tax-office', conceptLink: 'Rosetta Stone connection', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Ancient letters become official documents', audioTransition: 'Anvil ring → bureaucratic murmur' }, discoveryTriggerEntryIds: ['phoenician-alphabet', 'rosetta-stone-tax'] },
  { threadwayId: 'circuit-marsh↔savanna', fromWorldId: 'circuit-marsh', toWorldId: 'savanna-workshop', conceptLink: 'Energy → Engineering', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Electrical sparks power workshop machines', audioTransition: 'Arc crackle → windmill spin' }, discoveryTriggerEntryIds: ['franklin-kite', 'kamkwamba-windmill'] },
  { threadwayId: 'body-atlas↔wellness-garden', fromWorldId: 'body-atlas', toWorldId: 'wellness-garden', conceptLink: 'Physical health → Emotional health', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Heart chambers open into garden pathways', audioTransition: 'Heartbeat → birdsong + breathing' }, discoveryTriggerEntryIds: ['jenner-vaccine', 'wellness-garden-entry'] },
  { threadwayId: 'nonfiction↔discovery-trail', fromWorldId: 'nonfiction-fleet', toWorldId: 'discovery-trail', conceptLink: 'Research skills → Scientific method', tier: 3, realm: 'crossroads', transition: { visualDescription: 'Ship logs become trail markers', audioTransition: 'Ocean wind → forest path' }, discoveryTriggerEntryIds: ['library-alexandria', 'discovery-trail-entry'] },
];

// ── All Threadways ───────────────────────────────────────────────

const ALL_THREADWAYS: ReadonlyArray<ThreadwayDefinition> = [
  ...STEM_THREADWAYS,
  ...LANG_ARTS_THREADWAYS,
  ...FINANCE_THREADWAYS,
  ...CROSS_REALM_THREADWAYS,
];

// ── Network Port ─────────────────────────────────────────────────

export interface ThreadwayNetworkPort {
  readonly getHubPortals: () => ReadonlyArray<HubPortal>;
  readonly getAllThreadways: () => ReadonlyArray<ThreadwayDefinition>;
  readonly getThreadwaysByRealm: (realm: Realm) => ReadonlyArray<ThreadwayDefinition>;
  readonly getThreadwaysByTier: (tier: DiscoveryTier) => ReadonlyArray<ThreadwayDefinition>;
  readonly getThreadwayById: (id: string) => ThreadwayDefinition | undefined;
  readonly getConnectedWorlds: (worldId: string) => ReadonlyArray<string>;
  readonly evaluateDiscovery: (state: KindlerThreadwayState) => ReadonlyArray<ThreadwayDiscoveryResult>;
  readonly computeStatus: (threadway: ThreadwayDefinition, state: KindlerThreadwayState) => ThreadwayStatus;
  readonly getNetworkStats: (state: KindlerThreadwayState) => ThreadwayNetworkStats;
  readonly checkInBetween: (space: InBetweenSpace, nowMs: number) => boolean;
}

// ── Implementation ───────────────────────────────────────────────

function getThreadwaysByRealm(realm: Realm): ReadonlyArray<ThreadwayDefinition> {
  return ALL_THREADWAYS.filter(t => t.realm === realm);
}

function getThreadwaysByTier(tier: DiscoveryTier): ReadonlyArray<ThreadwayDefinition> {
  return ALL_THREADWAYS.filter(t => t.tier === tier);
}

function getThreadwayById(id: string): ThreadwayDefinition | undefined {
  return ALL_THREADWAYS.find(t => t.threadwayId === id);
}

function getConnectedWorlds(worldId: string): ReadonlyArray<string> {
  const connected = new Set<string>();
  for (const t of ALL_THREADWAYS) {
    if (t.fromWorldId === worldId) connected.add(t.toWorldId);
    if (t.toWorldId === worldId) connected.add(t.fromWorldId);
  }
  return [...connected];
}

function computeStatus(
  threadway: ThreadwayDefinition,
  state: KindlerThreadwayState,
): ThreadwayStatus {
  if (state.traversedThreadwayIds.has(threadway.threadwayId)) return 'traversed';
  if (state.discoveredThreadwayIds.has(threadway.threadwayId)) return 'discovered';

  if (threadway.tier === 1) return 'visible';

  if (threadway.tier === 2) {
    const hasFrom = state.completedWorldIds.has(threadway.fromWorldId);
    const hasTo = state.completedWorldIds.has(threadway.toWorldId);
    return hasFrom && hasTo ? 'visible' : 'hidden';
  }

  // Tier 3 — requires specific entries
  const allTriggersComplete = threadway.discoveryTriggerEntryIds.length > 0 &&
    threadway.discoveryTriggerEntryIds.every(id => state.completedEntryIds.has(id));
  return allTriggersComplete ? 'visible' : 'hidden';
}

function evaluateDiscovery(
  state: KindlerThreadwayState,
): ReadonlyArray<ThreadwayDiscoveryResult> {
  const results: ThreadwayDiscoveryResult[] = [];

  for (const threadway of ALL_THREADWAYS) {
    const status = computeStatus(threadway, state);
    const wasHidden = !state.discoveredThreadwayIds.has(threadway.threadwayId);
    const isNewDiscovery = wasHidden && (status === 'visible' || status === 'discovered');

    results.push({
      threadwayId: threadway.threadwayId,
      status,
      sparkGained: isNewDiscovery ? 10 : 0,
      luminanceBoost: isNewDiscovery ? LUMINANCE_BOOST_ON_DISCOVERY : 0,
    });
  }

  return results;
}

function getNetworkStats(state: KindlerThreadwayState): ThreadwayNetworkStats {
  let discoveredCount = 0;
  let traversedCount = 0;

  for (const t of ALL_THREADWAYS) {
    if (state.traversedThreadwayIds.has(t.threadwayId)) traversedCount++;
    else if (state.discoveredThreadwayIds.has(t.threadwayId)) discoveredCount++;
  }

  return {
    totalThreadways: ALL_THREADWAYS.length,
    tier1Count: ALL_THREADWAYS.filter(t => t.tier === 1).length,
    tier2Count: ALL_THREADWAYS.filter(t => t.tier === 2).length,
    tier3Count: ALL_THREADWAYS.filter(t => t.tier === 3).length,
    discoveredCount,
    traversedCount,
  };
}

function checkInBetween(space: InBetweenSpace, nowMs: number): boolean {
  return (nowMs - space.lingerStartMs) >= LINGER_DISCOVERY_MS;
}

// ── Factory ──────────────────────────────────────────────────────

export function createThreadwayNetwork(): ThreadwayNetworkPort {
  return {
    getHubPortals: () => HUB_PORTALS,
    getAllThreadways: () => ALL_THREADWAYS,
    getThreadwaysByRealm,
    getThreadwaysByTier,
    getThreadwayById,
    getConnectedWorlds,
    evaluateDiscovery,
    computeStatus,
    getNetworkStats,
    checkInBetween,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface ThreadwayNetworkEngine {
  readonly kind: 'threadway-network';
  readonly network: ThreadwayNetworkPort;
}

export function createThreadwayNetworkEngine(
  deps: { readonly clock: ThreadwayClockPort; readonly log: ThreadwayLogPort; readonly events: ThreadwayEventPort },
): ThreadwayNetworkEngine {
  const network = createThreadwayNetwork();
  deps.log.info({ threadwayCount: network.getAllThreadways().length }, 'Threadway network initialized');
  return { kind: 'threadway-network', network };
}
