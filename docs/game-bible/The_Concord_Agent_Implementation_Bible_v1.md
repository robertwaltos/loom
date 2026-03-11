# THE CONCORD — AGENT IMPLEMENTATION BIBLE

## Complete Technical & Design Reference for AI Coding Agents

### Version 1.0 · March 2026 · UE5 Foundation · 25M User Target

---

> **TO ALL AGENTS**: This document is your complete source of truth. Read it in full before writing a single line of code. Every architectural decision, every naming convention, every constraint exists for reasons documented here. Build what is described. Question what seems wrong. Never substitute your defaults for our decisions.

---

## PART 0: ORIENTATION

### What You Are Building

The Concord is not a game. It is a persistent civilisation simulator — a single-shard, permanently recorded world of 600+ planets, governed by players, powered by AI, and designed to run for decades without a server wipe.

The technology stack is:

- **Unreal Engine 5** (Nanite, Lumen, World Partition, Mass Entity) — primary game runtime
- **TypeScript** — backend services, economy engine, governance, API layer
- **Rust** — performance-critical hot paths (physics sync, ledger operations, real-time auction processing)
- **Python** — AI/ML pipelines, NPC behaviour models, procedural generation orchestration
- **C++** — UE5 plugins, custom rendering extensions, physics integration
- **PostgreSQL + TimescaleDB** — primary data store, time-series economy data
- **Redis** — session state, frequency lock queue, real-time pub/sub
- **Ethereum (L2)** — MARKS permanence, Covenant contract, migration escrow

### Scale Targets

| Metric                  | Launch | Year 1 | Year 3 | Year 5 |
| ----------------------- | ------ | ------ | ------ | ------ |
| Registered users        | 500K   | 5M     | 15M    | 25M    |
| Concurrent active       | 50K    | 500K   | 2M     | 5M     |
| Worlds online           | 60     | 180    | 400    | 600    |
| Daily transactions      | 2M     | 20M    | 100M   | 500M   |
| Remembrance entries/day | 50K    | 500K   | 2M     | 10M    |
| NPC agents running      | 10K    | 100K   | 1M     | 10M    |

**Design to 5 million concurrent from day one. Every system must horizontally scale without re-architecture.**

---

## PART 1: THE WORLD PHYSICS (THE LATTICE)

### 1.1 Core Mechanic: Spacetime Frequency Lock

The Lattice is the transit network connecting The Concord's 600 worlds. It is not a wormhole you walk through — it is a frequency synchronisation event. Two nodes achieve phase coherence across the zero-point field. At perfect coherence, the traveller resolves at the destination.

**Game mechanic implementation:**

```typescript
interface LatticeNode {
  nodeId: string; // UUID
  worldId: string; // Parent world
  frequency: FrequencySignature; // Unique across all nodes, ever
  beaconStatus: 'ACTIVE' | 'DEGRADED' | 'COMPROMISED' | 'DESTROYED';
  precisionRating: number; // 0.0–1.0; below 0.73 = transit risk
  lockQueue: LockRequest[]; // Active synchronisation sessions
  deployedYear: number; // In-game year of first lock
  surveyMark?: SurveyMark; // If this was a first-lock achievement
}

interface FrequencySignature {
  primary: bigint; // 256-bit unique identifier
  harmonics: number[]; // Secondary frequency components
  fieldStrength: number; // Zero-point field coupling coefficient
}

interface LockRequest {
  requestId: string;
  originNodeId: string;
  targetNodeId: string;
  initiatedAt: Date;
  coherenceLevel: number; // 0.0–1.0; transit at >= 0.999
  estimatedCompletionMs: number;
  payload: TransitPayload; // What/who is transiting
  status: LockStatus;
}

type LockStatus =
  | 'SYNCHRONISING'
  | 'PARTIAL_COHERENCE' // Danger zone: attack possible
  | 'CRITICAL_THRESHOLD' // 0.95-0.999 coherence
  | 'TRANSIT_EXECUTING' // The moment of topological equivalence
  | 'COMPLETE'
  | 'FAILED'
  | 'PARTIAL_COLLAPSE'; // Medical emergency in-world
```

**Lock duration formula:**

```
lockDurationMs = BASE_LOCK_MS * (1 + distanceLY * DISTANCE_COEFFICIENT) * fieldConditionMultiplier
BASE_LOCK_MS = 180000   // 3 minutes at zero distance
DISTANCE_COEFFICIENT = 0.15
fieldConditionMultiplier = 0.8–2.4 (varies by world conditions, Ascendancy interference)
```

**Critical rule: Both nodes are partially committed during lock. Either node's beacon disruption during synchronisation triggers PARTIAL_COLLAPSE for the in-transit payload. This is a narrative event, not just a failure state — it must produce a Remembrance entry.**

### 1.2 Bubble Projection Ships

Ships are not primary transit. They are prestigious, expensive, and slow by Lattice standards. They matter for:

- Survey missions (reaching worlds that have no Lattice node yet)
- Military projection (force between node termini)
- Prestige/roleplay (dynasties who want the experience of travel)
- Emergency evacuation (when Lattice is compromised)

```typescript
interface SurveyVessel {
  vesselId: string;
  dynastyId: string; // Owner
  bubbleCapacity: number; // How many passengers/tonnes
  fusionCharge: number; // 0.0–1.0; range per charge = 5–8 ly
  currentPosition: GalacticCoordinate;
  heading?: GalacticCoordinate;
  transitState: 'DOCKED' | 'IN_BUBBLE' | 'DECELERATION' | 'ARRIVED';
  effectiveVelocity: number; // fraction of c (typically 0.08–0.12)
}

// Transit time calculation
function calculateBubbleTransitHours(
  origin: GalacticCoordinate,
  destination: GalacticCoordinate,
  vessel: SurveyVessel,
): number {
  const distanceLY = galacticDistance(origin, destination);
  const effectiveC = vessel.effectiveVelocity; // e.g. 0.1
  const yearsAtEffectiveVelocity = distanceLY / effectiveC;
  return yearsAtEffectiveVelocity * 8760; // convert years to hours
  // No time dilation — crew is stationary inside bubble
}
```

**Important: Ships cannot chain-jump. A survey vessel must return to a fuelling station or have resupply delivered before its next jump. This constraint is what makes the survey race meaningful.**

### 1.3 The Buoy Network

```typescript
interface ResonanceBeacon {
  beaconId: string;
  frequency: FrequencySignature; // Burned at manufacture; immutable
  deployedBy: string; // Survey team dynasty ID
  deployedYear: number; // In-game year
  orbitalAnchor: OrbitalBody; // What it orbits
  powerStatus: 'NOMINAL' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  estimatedRemainingLifeYears: number; // Default 1,000,000
  tamperedWith: boolean;
  compromiseVector?: CompromiseType; // If spoofed/attacked
}

type CompromiseType =
  | 'FREQUENCY_SPOOFING' // Ascendancy: redirect transits
  | 'SIGNAL_DEGRADATION' // Beacon signal weakening; precision loss
  | 'GEODETIC_CORRUPTION' // Coordinate record attacks
  | 'POWER_SABOTAGE' // Physical attack on fusion reactor
  | 'HARMONIC_INJECTION'; // Corrupts frequency signature gradually
```

**The Ascendancy threat: Frequency spoofing is the primary antagonist mechanism. A spoofed beacon allows the Ascendancy to redirect travellers to locations of their choosing. The player community should be able to detect anomalies in transit logs and investigate. This is a gameplay mechanic, not just lore.**

---

## PART 2: GAME WORLD ARCHITECTURE (UE5)

### 2.1 World Structure

Each of The Concord's 600 worlds is a separate UE5 World Partition map. They share:

- A common economic layer (TypeScript backend)
- A common governance layer (Assembly, votes, Remembrance)
- The Lattice transit network

They are isolated in:

- Physical geography (unique biomes, procedurally generated with hand-authored hero locations)
- Political state (controlled by player dynasties)
- Environmental conditions (weather, day/night, seasons)
- NPC populations (AI-driven, world-specific behaviour patterns)

```
/Worlds/
  /WorldTemplate/           # Base map all worlds derive from
  /WorldInstances/
    /Kelath_Prime/           # Fully authored hero world (launch)
    /Nocturn/                # Destroyed world — frozen in its final state
    /Eden_Seven/             # High-prosperity reference world
    /[594 procedural worlds] # Generated per survey event
  /SharedContent/
    /LatticeNodes/           # UE5 actors for transit points
    /NPCFoundations/         # Base behaviour trees
    /AssetLibrary/           # Shared visual assets
```

### 2.2 UE5 Technology Requirements

**Nanite:** All hero geometry. 600-world scale demands LOD automation. Nanite handles this. Disable for: water, foliage cards, particles, glass.

**Lumen:** Full dynamic global illumination. Required for day/night authenticity on all worlds. Lumen + sky atmosphere + volumetric clouds = the visual baseline. No baked lighting anywhere in player-accessible space.

**World Partition:** Every world uses World Partition with streaming enabled. Cell size: 128m × 128m. Loading radius scaled by world density (urban areas load smaller cells; wilderness loads larger). HLOD always on.

**Mass Entity Framework:** Required for all NPC populations > 100 agents. Do not use Character Blueprint for crowd NPCs. Mass Entity handles 100,000 NPCs per world at 60fps on target hardware.

**Chaos Physics:** All destructible environments. World destruction events (Ascendancy attacks, siege warfare) must be physically simulated, not canned animations.

**Pixel Streaming:** Required for:

- Spectator mode (non-playing users watching Concord events)
- Witness Protocol replay (founding event broadcast)
- Low-end device access (browser-playable via Pixel Streaming)

### 2.3 The Silfen Weave — Seamless World Transitions

**This is the hardest technical requirement in the engine. Zero loading screens. Zero seams.**

Implementation approach:

```
Phase 1 (Pre-transit):
  - Player approaches Lattice node
  - Begin streaming destination world in background (silent prefetch)
  - Lock animation plays (30sec–3min depending on coherence time)
  - During animation: destination fully loaded in hidden viewport

Phase 2 (Coherence moment):
  - Visual: screen fills with frequency resonance effect
  - Audio: carrier tone reaches peak, then silence
  - Background: swap active world, activate destination
  - Duration: <100ms blank (masked by VFX)

Phase 3 (Emergence):
  - Player spawns at destination node
  - Destination world continues loading LODs at distance
  - Player can move immediately; streaming catches up
```

**UE5 implementation:**

- Use `UGameplayStatics::OpenLevelBySoftObjectPtr` with seamless travel
- Maintain player state via `AGameMode::GetSeamlessTravelActorList`
- Frequency lock VFX: Niagara particle system with procedural audio via MetaSounds
- World streaming budget: 8GB RAM reserved for destination pre-load during transit

### 2.4 Rendering Pipeline

Target specifications:
| Setting | 1080p | 1440p | 4K |
|---------|-------|-------|-----|
| Target FPS | 60 | 60 | 30 |
| Nanite | On | On | On |
| Lumen GI | High | High | Epic |
| VSM | On | On | On |
| TSR | Quality | Epic | Epic |
| Ray Tracing | Off | Reflections | Full |

**Scalability groups** (UE5 `sg.*` console variables) must be authored for five tiers: Cinematic, Epic, High, Medium, Low. Low must run on Steam Deck.

---

## PART 3: THE ECONOMY ENGINE

### 3.1 KALON Architecture

KALON is the civilisation's only currency. Fixed supply. Never purchasable with real money.

```typescript
// Core constants — never change these after launch
const KALON_CONSTANTS = {
  TOTAL_SUPPLY: 1_000_000_000n, // 1 billion KALON, atomic units
  DECIMAL_PLACES: 6, // 1 KALON = 1,000,000 atomic units
  FOUNDING_WAVE_ALLOCATION: 100_000_000n, // 10% reserved for Founders Programme
  COMMONS_FUND_SEED: 50_000_000n, // 5% to Commons Fund at genesis
  ARCHITECT_RESERVE: 20_000_000n, // 2% Architect's Reserve
  NEW_DYNASTY_GRANT: 100n * 1_000_000n, // 100 KALON per new player
} as const;

// Wealth zones — absolute KALON amounts derived from % of total supply
const WEALTH_ZONES = {
  ACTIVE_BAND_CAP: KALON_CONSTANTS.TOTAL_SUPPLY / 1000n, // 0.10%
  PROSPERITY_TIER_CAP: (KALON_CONSTANTS.TOTAL_SUPPLY * 3n) / 1000n, // 0.30%
  CONCENTRATION_ALERT_CAP: (KALON_CONSTANTS.TOTAL_SUPPLY * 5n) / 1000n, // 0.50%
  STRUCTURAL_CAP: (KALON_CONSTANTS.TOTAL_SUPPLY * 5n) / 1000n, // Hard ceiling
} as const;
```

**All KALON arithmetic uses BigInt. No floating point in financial calculations. Ever.**

### 3.2 Transaction Pipeline

```typescript
interface KalonTransaction {
  txId: string; // UUID v7 (time-ordered)
  fromDynastyId: string | 'COMMONS_FUND' | 'ARCHITECT_RESERVE';
  toDynastyId: string | 'COMMONS_FUND' | 'ARCHITECT_RESERVE';
  amount: bigint; // Atomic units
  txType: TransactionType;
  worldId?: string; // Where the transaction occurred
  associatedEventId?: string; // Remembrance linkage
  levyApplied: bigint; // Concord Levy extracted
  timestamp: Date;
  blockHeight: number; // Ethereum L2 block for MARKS-related tx
}

type TransactionType =
  | 'PLAYER_TRADE'
  | 'WORLD_RENT'
  | 'MILITARY_CONTRACT'
  | 'DIPLOMATIC_SETTLEMENT'
  | 'COMMONS_FUND_DISTRIBUTION'
  | 'NEW_DYNASTY_GRANT'
  | 'LEVY_COLLECTION'
  | 'TITHE_COLLECTION'
  | 'ENTROPY_FEE' // Dynasty maintenance costs
  | 'SURVEY_REWARD'
  | 'CIVIC_REWARD'
  | 'ESTATE_AUCTION_BID'
  | 'ESTATE_AUCTION_SETTLEMENT'
  | 'INHERITANCE_TRANSFER'
  | 'ARCHITECT_RESERVE_DISBURSEMENT';
```

**Transaction throughput requirement:** 500M daily = ~5,800/second peak. Use PostgreSQL with TimescaleDB for time-series partitioning. Batch writes in 100ms windows. Redis for hot-path balance reads.

### 3.3 Progressive Taxation

```typescript
function calculateLevyRate(transactionAmount: bigint): bigint {
  // Progressive rate: 0.5% small, up to 2.5% large
  const amountKalon = transactionAmount / 1_000_000n;

  if (amountKalon < 10n) return (transactionAmount * 5n) / 1000n; // 0.5%
  if (amountKalon < 100n) return (transactionAmount * 10n) / 1000n; // 1.0%
  if (amountKalon < 1000n) return (transactionAmount * 15n) / 1000n; // 1.5%
  if (amountKalon < 10000n) return (transactionAmount * 20n) / 1000n; // 2.0%
  return (transactionAmount * 25n) / 1000n; // 2.5%
}

function calculateQuarterlyTithe(holdings: bigint): bigint {
  const prosperityThreshold = WEALTH_ZONES.ACTIVE_BAND_CAP;
  if (holdings <= prosperityThreshold) return 0n;

  const titheableAmount = holdings - prosperityThreshold;
  // Progressive: 0.5% of tithe band per quarter, rising to 2%
  return (titheableAmount * 5n) / 1000n; // Base rate; Architect adjusts quarterly
}
```

### 3.4 The Commons Fund Distribution Engine

Runs quarterly (every 90 in-game days, or every 9 real days in Phase I compression):

```typescript
interface CommonsFundDistribution {
  distributionId: string;
  period: { start: Date; end: Date };
  totalAvailable: bigint;
  streams: {
    newDynastyGrants: bigint; // 30% of available
    worldInfrastructure: bigint; // 25% of available
    civicRewards: bigint; // 30% of available
    architectReserve: bigint; // 15% retained
  };
  recipients: DistributionRecipient[];
  approvedByArchitect: boolean; // Always true — Architect controls this
  remembranceEntry: string; // Auto-generated entry ID
}
```

---

## PART 4: THE REMEMBRANCE

### 4.1 Architecture

The Remembrance is the append-only permanent record of everything that happens in The Concord. It is the game's most important data structure. It must never fail. It must never lose data. It must remain readable forever.

```typescript
interface RemembranceEntry {
  entryId: string; // UUID v7 — time-ordered, never sequential
  entryType: EntryType;
  worldId?: string;
  dynastyIds: string[]; // All dynasties mentioned
  playerIds: string[]; // All players involved (hashed for privacy layer)
  inGameYear: number;
  inGameDate: string; // Formatted per Concord calendar
  realTimestamp: Date;
  title: string; // Max 200 chars
  body: string; // Max 50,000 chars; Markdown
  isAnonymised: boolean; // Player-requested privacy
  citedBy: string[]; // Other entry IDs that reference this
  markAwarded?: MarkType; // If this entry awards a MARK
  hash: string; // SHA-256 of content; tamper detection
  previousHash: string; // Blockchain-style chain
  archiveReplicated: boolean; // Confirmed in foundation archive
}

type EntryType =
  | 'FOUNDING' // World first settled
  | 'DYNASTY_BIRTH' // New dynasty created
  | 'DYNASTY_DEATH' // Digital Mortality completed
  | 'DYNASTY_IN_ABEYANCE' // Real-world death of player
  | 'SURVEY_MARK_AWARDED'
  | 'WORLD_MARK_AWARDED'
  | 'DEFENCE_MARK_AWARDED'
  | 'SURVIVOR_MARK_AWARDED'
  | 'FIRST_CONTACT_MARK_AWARDED'
  | 'FOUNDING_MARK_AWARDED'
  | 'BATTLE'
  | 'ALLIANCE_FORMED'
  | 'ALLIANCE_BROKEN'
  | 'WORLD_DESTRUCTION' // Permanent; cannot be reversed
  | 'ASCENDANCY_EVENT'
  | 'LATTICE_NODE_DESTROYED'
  | 'FREQUENCY_ANOMALY' // Spoofing detection event
  | 'ASSEMBLY_VOTE'
  | 'ESTATE_AUCTION'
  | 'FIRST_CONTACT'
  | 'ARCHITECT_NOTE' // Architect's quarterly observations
  | 'PARTIAL_COLLAPSE' // Failed transit medical event
  | 'WITNESS_INSCRIPTION'; // Pre-launch witness messages
```

**Remembrance storage requirements at 25M users:**

- 10M entries/day at peak × 365 × 10 years = 36.5 billion entries
- Average entry size: 2KB = ~73 TB over 10 years
- Use PostgreSQL with table partitioning by in-game year
- Full-text search via PostgreSQL `tsvector`; never Elasticsearch (operational cost)
- Foundation archive: real-time replication to separate infrastructure, different cloud provider

### 4.2 The Remembrance Depth Score

Used in voting weight calculation (40% of Civic Score):

```typescript
function calculateRemembranceDepth(dynastyId: string): number {
  const entries = getRemembranceEntriesByDynasty(dynastyId);

  let score = 0;

  // Volume contribution (diminishing returns)
  score += Math.log10(entries.length + 1) * 10;

  // Quality signals
  const citationCount = entries.reduce((sum, e) => sum + e.citedBy.length, 0);
  score += Math.sqrt(citationCount) * 5;

  // Age contribution (older entries worth more — historical depth)
  const currentYear = getCurrentInGameYear();
  for (const entry of entries) {
    const age = currentYear - entry.inGameYear;
    score += Math.log2(age + 1) * 0.5;
  }

  // Cross-phase durability (entries that survive to later phases)
  const crossPhaseEntries = entries.filter(
    (e) => getPhaseForYear(e.inGameYear) < getCurrentPhase(),
  );
  score += crossPhaseEntries.length * 8;

  // MARKS multiplier
  const marksCount = getMarksByDynasty(dynastyId).length;
  score *= 1 + marksCount * 0.15;

  return Math.min(score, 1000); // Cap at 1000 for normalisation
}
```

---

## PART 5: GOVERNANCE — THE ASSEMBLY

### 5.1 Civic Score Formula

```typescript
interface CivicScore {
  dynastyId: string;
  remembranceDepth: number; // 0–1000, normalised to 0–1
  civicContribution: number; // 0–1000, normalised to 0–1
  kalonPosition: number; // 0–1; capped at ACTIVE_BAND_CAP
  rawScore: number;
  normalizedVotingWeight: number;
  dignityFloor: boolean; // Always true if active dynasty
}

function calculateCivicScore(dynastyId: string): CivicScore {
  const rd = normalise(calculateRemembranceDepth(dynastyId), 0, 1000);
  const cc = normalise(calculateCivicContribution(dynastyId), 0, 1000);

  const holdings = getKalonHoldings(dynastyId);
  // Cap voting weight contribution at ACTIVE_BAND_CAP (0.10% of supply)
  const cappedHoldings = min(holdings, WEALTH_ZONES.ACTIVE_BAND_CAP);
  const kp = normalise(cappedHoldings, 0n, WEALTH_ZONES.ACTIVE_BAND_CAP);

  const rawScore = rd * 0.4 + cc * 0.35 + kp * 0.25;

  // Dignity floor: minimum 1.0 for any active dynasty
  const normalizedVotingWeight = max(rawScore, 0.001);

  return {
    dynastyId,
    remembranceDepth: rd,
    civicContribution: cc,
    kalonPosition: Number(kp),
    rawScore,
    normalizedVotingWeight,
    dignityFloor: true,
  };
}
```

### 5.2 Vote Processing

```typescript
interface AssemblyVote {
  voteId: string;
  proposalId: string;
  category: VoteCategory;
  initiatedBy: string; // Dynasty ID
  initiatedAt: Date;
  votingPeriodDays: number; // Real days: 7 ordinary, 14 significant, 21 constitutional
  votes: VoteCast[];
  architectVote?: VoteCast; // Always recorded separately
  result?: VoteResult;
  remembranceEntryId: string; // Auto-created when vote opens
}

type VoteCategory = 'ORDINARY' | 'SIGNIFICANT' | 'CONSTITUTIONAL' | 'RESERVED';

const VOTE_THRESHOLDS = {
  ORDINARY: 0.5,
  SIGNIFICANT: 0.65,
  CONSTITUTIONAL: 0.75, // Plus Architect affirmative
} as const;

// Architect voting weight
const ARCHITECT_VOTING_WEIGHT = {
  ORDINARY: 0.07, // 7% effective weight
  SIGNIFICANT: 0.14, // 14% effective weight
  CONSTITUTIONAL: null, // Affirmative required — not weighted
} as const;
```

**Vote records are immutable. No vote may be altered after casting. If a player's account is suspended, their votes remain and count. This is constitutionally required.**

---

## PART 6: THE MARKS SYSTEM (ON-CHAIN)

### 6.1 Smart Contract Interface

MARKS exist on Ethereum L2 (Base or Arbitrum — finalise before launch). They survive studio closure by contract design.

```solidity
// SPDX-License-Identifier: Apache-2.0
// The Concord Marks Registry — Permanent Achievement Record

interface IMarksRegistry {
    enum MarkType {
        FOUNDING,       // 0 — ~500 ever awarded
        SURVEY,         // 1 — Thousands; multiple per address possible
        WORLD,          // 2 — One per world, ever
        DEFENCE,        // 3 — Rare
        SURVIVOR,       // 4 — Very rare
        FIRST_CONTACT   // 5 — Max 3 ever; may never be awarded
    }

    struct Mark {
        MarkType markType;
        address holder;         // Ethereum address of player
        bytes32 dynastyId;      // In-game dynasty UUID
        bytes32 remembranceRef; // Hash of Remembrance entry
        uint256 awardedAt;      // Block number
        bytes32 worldId;        // World where earned (if applicable)
        bool transferable;      // Always false — MARKS cannot be transferred
    }

    // Award a mark — only callable by Concord oracle
    function awardMark(
        address to,
        MarkType markType,
        bytes32 dynastyId,
        bytes32 remembranceRef,
        bytes32 worldId
    ) external returns (uint256 markId);

    // Query marks
    function getMarksByAddress(address holder) external view
        returns (Mark[] memory);

    // Studio closure migration — callable by migration multisig after 30 days
    function enableSelfCustody() external;
}
```

**Migration bond:** A pre-funded escrow contract automatically executes migration to public self-custody if the studio fails to trigger it within 30 days of declared closure. This is non-negotiable — it is in the Permanence Covenant.

---

## PART 7: NPC SYSTEMS — ARTIFICIAL LIFE LAYER

### 7.1 Philosophy

NPCs in The Concord are not quest-givers or enemies. They are inhabitants. They have histories. They form relationships. They build things. They die. The goal is not to fake sentience — it is to create the _impression_ of a living world through emergent behaviour at scale.

**Key principle: NPCs are lowercase — they do not form dynasties, they do not vote in the Assembly, they do not hold KALON, they do not earn MARKS. They are the substrate of civilisation, not its protagonists.**

### 7.2 NPC Architecture — Four Tiers

```
Tier 1 — CROWD AGENTS (Mass Entity, ~100K per world)
  Behaviour: Pathfinding, ambient activity, crowd reaction
  AI: Rule-based state machines, no LLM calls
  Identity: No persistent state; regenerated on world restart
  Assets: Cannot create; draw from world asset library

Tier 2 — INHABITANT AGENTS (Mass Entity + lightweight personality, ~10K per world)
  Behaviour: Daily routines, simple relationships, trade
  AI: Behaviour trees with personality weights
  Identity: Persistent name, occupation, home location; 90-day memory window
  Assets: Cannot create; select from predefined variants

Tier 3 — NOTABLE AGENTS (Dedicated actor, LLM-powered, ~1K per world)
  Behaviour: Complex social dynamics, political positions, multi-step plans
  AI: LLM backbone (Claude Haiku tier) with persistent memory
  Identity: Full character history, relationships, goals; permanent memory
  Assets: CAN CREATE within approved category constraints (see 7.4)
  Remembrance: Can appear in player-authored Remembrance entries

Tier 4 — ARCHITECT'S AGENTS (Unique, canonical, ~10–50 across all worlds)
  Behaviour: Drive world-scale narrative events
  AI: LLM backbone (Claude Opus tier) with full world state context
  Identity: Named characters in the Remembrance; canonical lore
  Assets: CAN CREATE; subject to founding team approval
  Remembrance: Appear as first-class entities in the Remembrance
```

### 7.3 NPC Memory Architecture

```typescript
interface NPCMemory {
  npcId: string;
  tier: 1 | 2 | 3 | 4;

  // Short-term: last 24 in-game hours, full fidelity
  shortTerm: MemoryEvent[];

  // Medium-term: last 30 in-game days, summarised
  mediumTerm: MemorySummary[];

  // Long-term: significant events only, permanent (Tier 3+)
  longTerm: SignificantEvent[];

  // Relationship graph
  relationships: Map<string, RelationshipState>; // NPC/player ID → state

  // Goals (Tier 3+)
  activeGoals: Goal[];
  completedGoals: Goal[];

  // Asset creations (Tier 3+)
  createdAssets: AssetReference[];
}

interface MemoryEvent {
  timestamp: Date;
  eventType: string;
  involvedEntities: string[];
  emotionalWeight: number; // -1.0 to 1.0
  summary: string; // LLM-generated at event time
}
```

### 7.4 NPC Asset Creation — Artificial Life System

**This is the artificial life layer. Notable and Architect's agents can create assets within defined categories. They cannot create lineages (dynasties), cannot vote, cannot hold KALON.**

Permitted creation categories for Tier 3+ NPCs:

- **Structures**: Buildings, walls, market stalls, shrines (within world's architectural vocabulary)
- **Goods**: Trade items with custom names and flavour text (not mechanical stats)
- **Art**: In-world paintings, sculptures, murals (visual assets generated by AI image pipeline)
- **Text**: Letters, proclamations, historical documents (appear in world as readable objects)
- **Paths**: Trade routes, patrol patterns, pilgrimage roads (emergent path-finding infrastructure)

**Forbidden NPC creation categories:**

- Weapons above Tier 1 (prevents NPC power inflation)
- Currency of any kind
- Lattice node modifications
- Player-affecting buffs/debuffs
- Remembrance entries (players author these about NPCs; NPCs do not self-author)

```typescript
interface NPCAssetCreation {
  npcId: string;
  assetCategory: NPCCreationCategory;
  assetId: string;
  worldId: string;
  createdAt: Date;

  // AI-generated content
  generatedBy: 'claude-haiku' | 'claude-sonnet';
  generationPrompt: string; // Archived for moderation review

  // Review status
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
  reviewedBy?: 'AUTO_MODERATION' | 'HUMAN_MODERATOR';

  // World integration
  placedAt?: WorldCoordinate;
  discoveredByPlayers: string[]; // Dynasty IDs who found this
  appearsInRemembrance: boolean;
}
```

**Auto-approval criteria:** Structure (fits world architectural style score > 0.85) + no prohibited content + asset generation moderation pass → auto-approve. Everything else queued for human review.

### 7.5 NPC AI Prompt Architecture

```typescript
// System prompt template for Tier 3 NPCs
const TIER_3_SYSTEM_PROMPT = `
You are {npcName}, a {occupation} living on {worldName} in The Concord.
Current in-game year: {year}. Phase: {phase}.

Your character:
{characterDescription}

Your current situation:
{currentSituation}

Your relationships:
{relationshipSummary}

Your goals:
{activeGoals}

Recent memory (last 30 days):
{recentMemory}

RULES:
- You are an inhabitant of this world, not aware you are in a game
- You do not form dynasties, vote, or hold KALON
- You may create {permittedCreationCategories}
- You speak and act consistently with your character history
- When asked about politics, express your character's genuine opinion
- Your responses power in-world NPC dialogue — keep them in character

Respond with JSON: { "dialogue": string, "action"?: NPCAction, "memoryUpdate"?: MemoryEvent }
`;
```

### 7.6 NPC Population Economics

NPCs consume and produce goods in the world economy — a simplified shadow economy that makes worlds feel alive without competing with player KALON:

```typescript
interface WorldShadowEconomy {
  worldId: string;

  // Goods that NPCs produce and trade (not KALON)
  commodities: Map<CommodityType, CommodityState>;

  // Price signals that affect player economy
  priceIndices: {
    food: number;
    materials: number;
    services: number;
    luxury: number;
  };

  // Employment signals
  laborDemand: number; // 0–1; affects player contract availability
  laborSupply: number;

  // Unrest — can trigger events if high
  populationUnrest: number; // 0–1; above 0.7 triggers Assembly notification

  // These feed into the Architect's quarterly prosperity index
  prosperityIndex: number; // 0–1
}
```

---

## PART 8: DIGITAL MORTALITY & INHERITANCE

### 8.1 Mortality State Machine

```typescript
type DynastyMortalityState =
  | 'ACTIVE'
  | 'DORMANT_30' // 30 days inactive
  | 'DORMANT_60' // 60 days; Assembly notification sent
  | 'GRACE_WINDOW' // Day 60–90; final warning
  | 'MORTALITY_TRIGGERED' // Day 90; character recorded Deceased
  | 'REDISTRIBUTION' // Day 90–180; KALON flowing out
  | 'DECEASED' // Day 180+; irreversible
  | 'IN_ABEYANCE' // Real-world death; heraldic protection
  | 'HEIR_ACTIVATED' // Heir claimed dynasty within 2 years
  | 'LEGACY_NPC'; // Dynasty continues as NPC faction

// Transition rules
const MORTALITY_TRANSITIONS: TransitionRule[] = [
  { from: 'ACTIVE', to: 'DORMANT_30', condition: 'noLoginFor30Days' },
  { from: 'DORMANT_30', to: 'ACTIVE', condition: 'playerLogin' },
  { from: 'DORMANT_30', to: 'DORMANT_60', condition: 'noLoginFor60Days' },
  { from: 'DORMANT_60', to: 'GRACE_WINDOW', condition: 'subscriptionLapseWarn' },
  { from: 'GRACE_WINDOW', to: 'MORTALITY_TRIGGERED', condition: 'day90Reached' },
  { from: 'MORTALITY_TRIGGERED', to: 'ACTIVE', condition: 'playerReturnsAndPays_before180' },
  { from: 'REDISTRIBUTION', to: 'DECEASED', condition: 'day180Reached' },
  // In Abeyance always takes priority over Mortality
  { from: '*', to: 'IN_ABEYANCE', condition: 'realWorldDeathDocumented' },
];
```

### 8.2 Estate Dispersal Auction

When a dynasty reaches DECEASED state, its non-liquid assets enter the Estate Dispersal Auction:

```typescript
interface EstateAuction {
  auctionId: string;
  deceasedDynastyId: string;
  openedAt: Date; // Real date
  closesAt: Date; // 14 real days after opening

  assets: AuctionLot[];

  phases: {
    phase1_Heirs: {
      duration: '48h';
      eligible: string[]; // Dynasty's registered heirs only
    };
    phase2_Allies: {
      duration: '48h';
      eligible: string[]; // Alliance members + diplomatic relations
    };
    phase3_Assembly: {
      duration: '72h';
      eligible: 'ALL_PLAYERS';
    };
    phase4_Liquidation: {
      duration: '24h';
      remainingAssets: 'COMMONS_FUND'; // Unsold → commons
    };
  };

  // Memorial bid — special category
  memorialBids: MemorialBid[];
}

interface MemorialBid {
  bidderId: string;
  amount: bigint; // KALON
  memorialText: string; // Max 500 chars; inscribed in Remembrance
  // Winning memorial bid text appears permanently in the dynasty's Remembrance entry
}
```

---

## PART 9: TIME COMPRESSION SYSTEM

### 9.1 Smooth Exponential Decay

```typescript
// Launch constants — set once, never change
const TIME_COMPRESSION = {
  LAUNCH_DATE: new Date('2027-01-01T00:00:00Z'), // TBD
  INITIAL_RATIO: 10.0, // 10 in-game years per 1 real year at launch
  FINAL_RATIO: 1.0, // Target: 1:1 real time
  HALF_LIFE_REAL_YEARS: 12.0, // Ratio halves every 12 real years
} as const;

function getCurrentCompressionRatio(realNow: Date): number {
  const realYearsElapsed =
    (realNow.getTime() - TIME_COMPRESSION.LAUNCH_DATE.getTime()) / (365.25 * 24 * 3600 * 1000);

  const ratio =
    TIME_COMPRESSION.INITIAL_RATIO *
    Math.pow(2, -realYearsElapsed / TIME_COMPRESSION.HALF_LIFE_REAL_YEARS);

  // Never go below 1:1
  return Math.max(ratio, TIME_COMPRESSION.FINAL_RATIO);
}

function getInGameYear(realNow: Date): number {
  // Integral of compression ratio over time = in-game years elapsed
  // For exponential decay: integral of k*2^(-t/h) dt from 0 to T
  // = k * h / ln(2) * (1 - 2^(-T/h))
  const T =
    (realNow.getTime() - TIME_COMPRESSION.LAUNCH_DATE.getTime()) / (365.25 * 24 * 3600 * 1000);
  const k = TIME_COMPRESSION.INITIAL_RATIO;
  const h = TIME_COMPRESSION.HALF_LIFE_REAL_YEARS;

  const inGameYearsElapsed = ((k * h) / Math.LN2) * (1 - Math.pow(2, -T / h));
  return Math.floor(1 + inGameYearsElapsed);
}
```

**This function must be the single source of truth for in-game time everywhere in the codebase. Cache with 1-second TTL in Redis. Never recalculate on the hot path.**

---

## PART 10: SUBSCRIPTION & BILLING

### 10.1 Tier Architecture

```typescript
type SubscriptionTier = 'FREE_TOURIST' | 'ACCORD' | 'PATRON' | 'HERALD';

const SUBSCRIPTION_CONFIG: Record<SubscriptionTier, TierConfig> = {
  FREE_TOURIST: {
    priceUSD: 0,
    maxActiveDynasties: 0, // Observe only during 15-day trial
    kalonMonthlyStipend: 0n,
    surveyPriority: 'NONE',
    architectReportAccess: 'ON_RELEASE',
    mortalityGraceDays: 0,
    trialDays: 15,
  },
  ACCORD: {
    priceUSD: 15,
    maxActiveDynasties: 1,
    kalonMonthlyStipend: 100n * 1_000_000n,
    surveyPriority: 'STANDARD',
    architectReportAccess: 'ON_RELEASE',
    mortalityGraceDays: 30,
  },
  PATRON: {
    priceUSD: 25,
    maxActiveDynasties: 2,
    kalonMonthlyStipend: 175n * 1_000_000n,
    surveyPriority: 'PRIORITY',
    architectReportAccess: 'ON_RELEASE',
    mortalityGraceDays: 60,
  },
  HERALD: {
    priceUSD: 35,
    maxActiveDynasties: 3,
    kalonMonthlyStipend: 250n * 1_000_000n,
    surveyPriority: 'PRIORITY_WITH_OBSERVER',
    architectReportAccess: 'EARLY_48H',
    mortalityGraceDays: 90,
  },
};
```

### 10.2 Revenue Projections at Scale

| Users                         | Tier Mix                           | Monthly Revenue | Annual Revenue |
| ----------------------------- | ---------------------------------- | --------------- | -------------- |
| 500K registered / 100K paying | 60% Accord, 30% Patron, 10% Herald | $2.15M          | $25.8M         |
| 5M registered / 800K paying   | 55% Accord, 32% Patron, 13% Herald | $17.5M          | $210M          |
| 15M registered / 2.5M paying  | 50% Accord, 33% Patron, 17% Herald | $56M            | $672M          |
| 25M registered / 5M paying    | 48% Accord, 34% Patron, 18% Herald | $110M           | $1.32B         |

## **Payment processor:** Stripe. Never store card data. 3D Secure required for annual plans. Auto-retry failed payments 3× over 14 days before Dormant state triggers.

## PART 11: INFRASTRUCTURE & SCALE ARCHITECTURE

### 11.1 The Three Planes

**Plane 1 — Game Runtime (UE5)**

- UE5 Dedicated Servers: one per world instance
- Regions: US-East, US-West, EU-West, AP-Southeast, AP-Northeast
- World assignment: players auto-routed to lowest-latency region that has their world
- Server hardware: 32-core CPU, 256GB RAM, NVMe SSD, 10Gbps NIC
- Target: 200 concurrent players per world server (scale to 500 with optimisation)

**Plane 2 — Economy & Governance (TypeScript/Rust backend)**

- Multi-region active-active Kubernetes deployment
- PostgreSQL primary in each region with cross-region async replication
- Redis Cluster: 6 nodes per region (3 primary, 3 replica)
- Kafka: event bus for all game events → economy → Remembrance pipeline
- No single points of failure anywhere in this plane

**Plane 3 — Foundation Archive (Independent)**

- Separate cloud account, separate provider
- Receives real-time Remembrance replication via encrypted stream
- Read-only from studio systems; write access only from replication service
- Survives studio insolvency by contractual arrangement with foundation

### 11.2 Service Map

```
[UE5 Game Servers]
       │
       ▼
[Game Gateway Service]        ← WebSocket, auth, session management
       │
    ┌──┴──────────────────────┐
    ▼                         ▼
[Economy Service]      [World State Service]
(KALON, transactions,  (NPC state, world events,
 tax, distributions)    environment, assets)
    │                         │
    └────────────┬────────────┘
                 ▼
         [Kafka Event Bus]
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
[Remembrance   [Governance  [NPC AI
 Service]       Service]     Orchestrator]
    │            │            │
    ▼            ▼            ▼
[PostgreSQL]  [PostgreSQL]  [LLM API Pool]
[TimescaleDB] (votes,       (Anthropic/OpenAI/
               assembly)     Google routing)
    │
    ▼
[Foundation Archive Replication]
```

### 11.3 Database Schema (Core Tables)

```sql
-- Dynasties
CREATE TABLE dynasties (
  dynasty_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL REFERENCES players(player_id),
  name              VARCHAR(100) NOT NULL,
  world_id          UUID REFERENCES worlds(world_id),
  founded_year      INTEGER NOT NULL,
  mortality_state   VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  kalon_holdings    NUMERIC(20,0) NOT NULL DEFAULT 0,
  civic_score       DECIMAL(10,4),
  civic_score_updated_at TIMESTAMPTZ,
  is_anonymised     BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  deceased_at       TIMESTAMPTZ,
  in_abeyance_since TIMESTAMPTZ
);

-- Remembrance (partitioned by in-game year)
CREATE TABLE remembrance_entries (
  entry_id          UUID NOT NULL DEFAULT gen_random_uuid(),
  entry_type        VARCHAR(50) NOT NULL,
  world_id          UUID,
  dynasty_ids       UUID[] NOT NULL DEFAULT '{}',
  in_game_year      INTEGER NOT NULL,
  real_timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title             VARCHAR(200) NOT NULL,
  body              TEXT NOT NULL,
  is_anonymised     BOOLEAN DEFAULT FALSE,
  cited_by          UUID[] DEFAULT '{}',
  mark_awarded      VARCHAR(30),
  content_hash      CHAR(64) NOT NULL,
  previous_hash     CHAR(64) NOT NULL,
  archive_replicated BOOLEAN DEFAULT FALSE
) PARTITION BY RANGE (in_game_year);

-- Create initial partitions
CREATE TABLE remembrance_entries_year_1_150
  PARTITION OF remembrance_entries FOR VALUES FROM (1) TO (151);
CREATE TABLE remembrance_entries_year_151_400
  PARTITION OF remembrance_entries FOR VALUES FROM (151) TO (401);
-- Continue as needed

-- KALON transactions (TimescaleDB hypertable)
CREATE TABLE kalon_transactions (
  tx_id             UUID NOT NULL,
  from_dynasty_id   UUID,
  to_dynasty_id     UUID,
  amount            NUMERIC(20,0) NOT NULL,
  tx_type           VARCHAR(50) NOT NULL,
  world_id          UUID,
  levy_applied      NUMERIC(20,0) NOT NULL DEFAULT 0,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  block_height      INTEGER
);
SELECT create_hypertable('kalon_transactions', 'timestamp');

-- Assembly votes
CREATE TABLE assembly_votes (
  vote_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id       UUID NOT NULL,
  category          VARCHAR(30) NOT NULL,
  initiated_by      UUID NOT NULL REFERENCES dynasties(dynasty_id),
  voting_opens_at   TIMESTAMPTZ NOT NULL,
  voting_closes_at  TIMESTAMPTZ NOT NULL,
  threshold         DECIMAL(5,4) NOT NULL,
  result            VARCHAR(20),
  passed            BOOLEAN,
  remembrance_entry_id UUID
);

CREATE TABLE vote_casts (
  cast_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id           UUID NOT NULL REFERENCES assembly_votes(vote_id),
  dynasty_id        UUID NOT NULL REFERENCES dynasties(dynasty_id),
  in_favor          BOOLEAN NOT NULL,
  voting_weight     DECIMAL(10,6) NOT NULL,
  cast_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vote_id, dynasty_id)  -- One vote per dynasty per proposal
);
```

### 11.4 Networking for 5M Concurrent

**Connection architecture:**

- WebSocket connections per game server: max 500 (world capacity)
- Each UE5 server handles one world instance
- At 5M concurrent: 10,000 world server instances needed
- Use AWS/GCP spot instances for non-hero worlds; reserved for Kelath Prime etc.

**Backend API:**

- REST: player auth, dynasty management, subscription, Remembrance read
- WebSocket: real-time game state, economy ticks, Assembly notifications
- gRPC: internal service-to-service (economy ↔ Remembrance ↔ NPC)
- GraphQL: Remembrance complex queries (players browsing history)

**CDN:**

- Cloudflare: static assets, UE5 patch delivery, Pixel Streaming relay
- All worlds' static geography served as PAK files from Cloudflare R2
- Dynamic content (NPC state, world state) never cached; always live

### 11.5 Cost Model at 5M Concurrent

| Component                                  | Cost/Month        |
| ------------------------------------------ | ----------------- |
| UE5 game servers (10K instances, spot mix) | $480K             |
| Backend Kubernetes (multi-region)          | $85K              |
| Database (PostgreSQL + TimescaleDB)        | $120K             |
| Redis Cluster                              | $45K              |
| Kafka                                      | $35K              |
| CDN & storage                              | $95K              |
| LLM API (NPC AI, Tier 3 NPCs)              | $200K             |
| Ethereum L2 operations                     | $15K              |
| Foundation archive                         | $25K              |
| Monitoring, logging, misc                  | $40K              |
| **Total infrastructure**                   | **~$1.14M/month** |

At 5M paying users × $21 average ARPU = $105M/month revenue vs $1.14M infra = healthy margin.

---

## PART 12: HISTORICAL ANALYSIS — LEARNING FROM FAILURE

_Every major MMO failure carries lessons. The Concord is built by studying them._

### 12.1 The Graveyard

| Game                      | Peak Users                            | Failure Mode                                                              | Concord Response                                                                                               |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Star Wars Galaxies**    | 300K                                  | Forced NGE redesign destroyed trust; devs overrode player investment      | Permanence Covenant + Article IX: No Cheat Codes. Devs cannot reset.                                           |
| **Warhammer Online**      | 800K → 40K in 6mo                     | Half the content cut at launch; poor realm balance; empty servers         | Launch with only content that is complete. Never fake density. Single shard.                                   |
| **WildStar**              | 3M copies                             | F2P pivot destroyed value proposition; NCSoft killed it financially       | Private venture philosophy. No public financial pressure. Permanence Covenant survives studio closure.         |
| **Tabula Rasa**           | 100K                                  | Richard Garriott left; IP too complex to operate without creator          | Architecture documentation. Bus factor zero policy — everything documented. AI agents can rebuild.             |
| **City of Heroes**        | 180K → shutdown                       | NCSoft pulled profitable game for no stated reason                        | Studio closure provisions: Apache 2.0 source release, MARKS migrate on-chain, Remembrance to foundation.       |
| **Marvel Heroes**         | 1M+                                   | Disney IP revoked; overnight shutdown                                     | Own your IP. The Concord's lore belongs to The Concord. No licensed characters.                                |
| **Battleborn**            | 12K peak                              | Launched against Overwatch; marketing positioned as competitor            | Never position against a giant. Find a category of one. "The only civilisation you can actually be born into." |
| **Anthem**                | 5M copies                             | No endgame; live service promised but never delivered                     | No content promises without systems in place. Procedural generation ensures infinite worlds.                   |
| **New World** (early)     | 913K → 10K                            | Economy broken by duplication bug; trust collapsed                        | Rust-implemented ledger with cryptographic transaction chain. Duplication mathematically impossible.           |
| **Ultima Online**         | 250K                                  | Couldn't handle player behaviour; griefing destroyed new player retention | Dignity Floor in voting. New players protected. Grief mechanics documented and designed against from day 1.    |
| **EverQuest Next**        | Never launched                        | Over-promised voxel destruction system; 8-year development spiral         | Build what can ship. Incrementally expand. Never demo what doesn't run.                                        |
| **Crowfall**              | Failed                                | Complicated systems with poor onboarding; niche appeal                    | Onboarding as first-class design problem. Witness Protocol creates pre-investment before play.                 |
| **Ashes of Creation**     | TBD                                   | 7-year development; funding dependency; feature creep                     | Private venture: build within budget. Features earn their way in.                                              |
| **Hellgate: London**      | 150K                                  | Flagship developer bankruptcy mid-live service                            | Permanence Covenant: game continues regardless of studio status.                                               |
| **Final Fantasy XIV 1.0** | Critical failure → **Reborn success** | Transparent acknowledgment of failure + complete rebuild rebuilt trust    | **LESSON: Radical transparency about what went wrong rebuilds trust faster than PR spin.**                     |

### 12.2 The Successes — What Worked

| Game                          | Mechanic                                                        | Why It Worked                                       | How Concord Adopts                                                      |
| ----------------------------- | --------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| **EVE Online** (18+ years)    | Player-driven economy; consequences matter; trust in permanence | Players invest because actions have real weight     | KALON economy; Permanence Covenant; no rollbacks                        |
| **EVE Online**                | Single-shard server                                             | Historical events feel shared and real              | The Concord is single-shard globally                                    |
| **Minecraft** (1B+ users)     | Player creativity; endless emergent content                     | Players generate content cheaper than any studio    | NPC artificial life + player construction = infinite world density      |
| **Path of Exile**             | Consistent release cadence; developer transparency              | Predictable engagement loop; trust through openness | Architect's quarterly report = developer transparency, in-world         |
| **Dwarf Fortress**            | Emergent narrative; procedural history                          | Stories players didn't author feel real             | Undirected Narrative Layer; NPC life events generate unscripted history |
| **Elite Dangerous**           | Persistent galaxy-wide state                                    | Every player's action affects the universe          | Single-shard; Remembrance records all actions                           |
| **RuneScape** (25+ years)     | Accessible; runs on low-end hardware; consistent updates        | Removed hardware barriers; consistent cadence       | Pixel Streaming for low-end access; Steam Deck target                   |
| **World of Warcraft Classic** | Players wanted history preserved                                | Nostalgia for permanence is a real demand           | The Remembrance IS this feature — permanent history from day 1          |
| **Stardew Valley**            | Emotional connection; no FOMO                                   | Players return on their own schedule                | Anti-retention mechanics; no daily login bonuses                        |
| **Animal Crossing NH**        | 40M+ COVID spike                                                | Right product, right time; word of mouth, no ads    | Witness Protocol creates pre-investment community before launch         |
| **Guild Wars 2**              | No subscription                                                 | Lower barrier to engagement; fair value             | Free Tourist tier; no paywall on community participation                |

### 12.3 Psychological Failure Modes — Solved By Design

| Problem                      | Example                                        | Concord Solution                                                                         |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Treadmill exhaustion**     | WoW gear reset every patch                     | MARKS never expire; Remembrance Depth compounds forever                                  |
| **Pay-to-win resentment**    | Many mobile games                              | KALON never purchasable; wealth is earned contribution                                   |
| **Content drought**          | Every MMO post-launch                          | Procedural worlds; NPC artificial life; player history IS content                        |
| **Population collapse**      | Server merges kill immersion                   | Single-shard: no server to merge or die                                                  |
| **Developer betrayal**       | SWG NGE                                        | Permanence Covenant + Article IX: developers cannot undo                                 |
| **Sunk cost anxiety**        | "If I stop paying, I lose everything"          | In Abeyance; Sentinel Regent; Remembrance survives subscription                          |
| **FOMO marketing**           | Limited-time events everywhere                 | Explicit anti-FOMO in Covenant: no timed exclusives                                      |
| **Endgame cliff**            | Character max level → what now?                | No max level. No endgame. Civilisation as the game.                                      |
| **Alt-account exploitation** | Vote manipulation, economy gaming              | Civic Score tied to dynasty history, not account count                                   |
| **Streamer economy**         | Content creator advantage amplifies wealth gap | Civic Contribution includes community contribution; streamers organically Civic-rewarded |
| **Spoofed reviews**          | Launch review bombing / fake positives         | Remembrance is the review: it's what happened, not what was said                         |
| **Live service abandonment** | Anthem, Babylon's Fall                         | Studio closure provisions mean game outlasts studio                                      |

---

## PART 13: PROCEDURAL WORLD GENERATION

### 13.1 World Generation Pipeline

Every world beyond the 10 hand-authored hero worlds is procedurally generated. The pipeline runs when a survey ship deploys a buoy (in-game event) and must complete before the world's first player arrives.

```python
class WorldGenerationPipeline:
    """
    Generates a complete, unique world from a seed.
    Runtime target: < 4 hours on generation cluster.
    Storage per world: ~2TB (terrain, assets, NPC seeds).
    """

    def generate(self, world_id: str, seed: int, world_class: WorldClass) -> World:
        # Stage 1: Tectonic (2 hours)
        terrain = TectonicSimulation(seed).run(world_class)

        # Stage 2: Climate (30 min)
        climate = ClimateSimulation(terrain, seed).run()

        # Stage 3: Biomes (20 min)
        biomes = BiomeAssignment(terrain, climate).run()

        # Stage 4: Flora & Fauna (30 min)
        ecology = EcologySimulation(biomes, seed).run()

        # Stage 5: Hero locations (20 min)
        # Cities, ruins, landmarks — using LLM for narrative hooks
        hero_locations = HeroLocationGenerator(terrain, ecology, seed).run()

        # Stage 6: NPC seed population (20 min)
        npc_seeds = NPCPopulationSeeder(hero_locations, world_class).run()

        # Stage 7: UE5 asset assignment (manual step — texture/mesh selection)
        # Automated from biome → asset library mapping
        ue5_assets = AssetMapper(biomes, ecology).run()

        return World(world_id, terrain, climate, biomes, ecology,
                    hero_locations, npc_seeds, ue5_assets)

class WorldClass(Enum):
    GARDEN       = "garden"        # Lush, habitable, common
    ARID         = "arid"          # Desert, scarce resources
    OCEAN        = "ocean"         # 90%+ water
    FROZEN       = "frozen"        # Ice world; extreme conditions
    VOLCANIC     = "volcanic"      # Resource-rich; dangerous
    ANCIENT      = "ancient"       # Ruins of prior civilisation
    EDEN         = "eden"          # Rare; near-perfect conditions; contested
    VOID_TOUCHED = "void_touched"  # Ascendancy-influenced; modified physics
```

### 13.2 The 600-World Distribution

```
World composition at full build-out (Year 1 targets 60 worlds):
- Garden worlds: 200 (33%) — most colonisation
- Arid worlds: 120 (20%) — resource trade economy
- Ocean worlds: 80 (13%) — unique architecture, fisher cultures
- Frozen worlds: 70 (12%) — extreme play, isolation narrative
- Volcanic worlds: 50 (8%) — contested resource nodes
- Ancient worlds: 40 (7%) — archaeology, lore discovery
- Eden worlds: 25 (4%) — perpetually contested, high Remembrance activity
- Void-Touched worlds: 15 (3%) — Ascendancy narrative content
```

---

## PART 14: THE TEASER WEBSITE — EXACT IMPLEMENTATION

### 14.1 Design Specification

The teaser is a single HTML file. No build tools. No npm. No React. One file deployable to any static host.

**Design language:**

- Background: `#060d1a` (deep navy, approaching black)
- Primary accent: `#b8963e` (aged gold — not bright, not brash — the gold of old books)
- Text primary: `#eef2f8` (near white, slightly warm)
- Text secondary: `#c4cedc` (mist — most body text)
- Text tertiary: `#8a9bb5` (slate — captions, labels)
- Typefaces:
  - Display: `Cinzel Decorative` (title) + `Cinzel` (headings, labels)
  - Body: `Cormorant Garamond` (editorial — long-form reading)
  - Technical: `Courier Prime` (logs, codes, system text)
- Custom cursor: gold crosshair ring + dot
- Starfield: HTML Canvas, 300 stars, parallax on mouse
- Scroll reveals: IntersectionObserver with 0.9s ease fade+rise
- Grain overlay: CSS `repeating-linear-gradient` scan lines

**Phase system:** Three content phases gated by body class:

- Phase 1 (body default): Hero section always visible. Founding event. Okafor log. Countdown.
- Phase 2 (body.phase-2): All phase-1 content + Witness Protocol form + Physics section
- Phase 3 (body.phase-3): All above + Civilisation section + Pricing + Call to action

### 14.2 CSS Architecture

```css
:root {
  --navy: #060d1a;
  --navy2: #0a1628;
  --navy3: #0d1f3c;
  --gold: #b8963e;
  --gold2: #c9a63a;
  --gold3: #d4af5a;
  --gold4: #e8cc80;
  --white: #eef2f8;
  --mist: #c4cedc;
  --slate: #8a9bb5;
  --dim: #3a4a62;
  --redl: #c08080;
}

/* Phase gating */
.phase-2,
.phase-3 {
  display: none;
}
body.phase-2 .phase-2,
body.phase-3 .phase-2,
body.phase-3 .phase-3 {
  display: block;
}
body.phase-2 .phase-1-only,
body.phase-3 .phase-1-only {
  display: none;
}

/* Scroll section base — hidden until intersected */
.sect {
  opacity: 0;
  transform: translateY(32px);
  transition:
    opacity 0.9s ease,
    transform 0.9s ease;
}
.sect.vis {
  opacity: 1;
  transform: translateY(0);
}
```

### 14.3 JavaScript Architecture

```javascript
// ── PHASE MANAGEMENT ──────────────────────────────────────────────────────
// In production: phase read from API endpoint
// In development: dev buttons in corner cycle phases
const CURRENT_PHASE = 3; // Change for testing

function initPhase() {
  if (CURRENT_PHASE >= 2) document.body.classList.add('phase-2');
  if (CURRENT_PHASE >= 3) document.body.classList.add('phase-3');
  updateTicker();
  updateNavPhase();
}

// ── TICKER ────────────────────────────────────────────────────────────────
const TICKER_CONTENT = {
  1: [
    'TA-7 · DARPA/ARPA-E · STATUS: INCIDENT CONFIRMED',
    '38.8895°N 77.0353°W · POSITIONAL UNCERTAINTY 0.003mm',
    'WITNESS COUNT: 2,000,000,000 · COVER STORY: HOLOGRAPHIC PROJECTION',
    'TACTILE CONFIRMATIONS: 43 · OFFICIAL RESPONSE: NONE',
    'THE CONCORD · YEAR ZERO APPROACHES',
  ],
  2: [
    'WITNESS PROTOCOL · OPEN · CLOSES AT FOUNDING',
    'FREQUENCY LOCK TECHNOLOGY · PATENT PENDING · YEAR 1',
    'LATTICE NODE DEPLOYMENT · SURVEY SHIP DEPARTURE · IMMINENT',
    'FIRST BEACON DEPLOYED · WORLD ACCESSIBLE · SURVEY MARK AWARDED',
    'THE REMEMBRANCE · APPEND-ONLY · PERMANENT · FOREVER',
  ],
  3: [
    'THE CONCORD · 600 WORLDS · 800 YEARS · COUNTING',
    'KALON · FIXED SUPPLY · EARNED · NEVER BOUGHT',
    'PERMANENCE COVENANT · ARTICLE IX · NO CHEAT CODES · EVER',
    'FOUNDING MARK · CLOSES AT LAUNCH BLOCK HEIGHT',
    'ASSEMBLY IN SESSION · VOTES PERMANENT · NAMES RECORDED',
    'ASCENDANCY THREAT TIER · CLASSIFIED · YEAR 312',
  ],
};

// ── STARFIELD ─────────────────────────────────────────────────────────────
function initStarfield() {
  const canvas = document.getElementById('cosmos');
  const ctx = canvas.getContext('2d');
  let mouseX = 0,
    mouseY = 0;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const STAR_COUNT = 300;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + 0.2,
    opacity: Math.random() * 0.7 + 0.1,
    parallax: Math.random() * 0.04 + 0.005, // Slow parallax layers
    twinkle: Math.random() * Math.PI * 2,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = Date.now() / 3000;

    stars.forEach((s) => {
      const parallaxX = (mouseX - canvas.width / 2) * s.parallax;
      const parallaxY = (mouseY - canvas.height / 2) * s.parallax;
      const flicker = Math.sin(t + s.twinkle) * 0.15 + 0.85;

      ctx.beginPath();
      ctx.arc(s.x + parallaxX, s.y + parallaxY, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(238,242,248,${s.opacity * flicker})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  draw();
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────────
// Set LAUNCH_DATE to actual launch date
const LAUNCH_DATE = new Date('2027-01-01T00:00:00Z');

function updateCountdown() {
  const now = new Date();
  const diff = LAUNCH_DATE - now;

  if (diff <= 0) {
    document.getElementById('counter').innerHTML =
      '<div style="font-family:Cinzel;color:var(--gold4);font-size:1.4rem;letter-spacing:.2em">THE CONCORD IS OPEN</div>';
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);

  document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
  document.getElementById('cd-hrs').textContent = String(hrs).padStart(2, '0');
  document.getElementById('cd-min').textContent = String(min).padStart(2, '0');
  document.getElementById('cd-sec').textContent = String(sec).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ── LIVE BLOCK HEIGHT ─────────────────────────────────────────────────────
async function fetchBlockHeight() {
  try {
    const r = await fetch('https://api.blocknative.com/v0/ethereum/mainnet/header');
    const d = await r.json();
    const n = d.blockNumber?.toLocaleString() ?? '—';
    document.getElementById('bnum').textContent = n;
    if (document.getElementById('hl-bnum')) document.getElementById('hl-bnum').textContent = n;
  } catch {
    /* silent fail */
  }
}
fetchBlockHeight();
setInterval(fetchBlockHeight, 15000);

// ── WITNESS FORM ──────────────────────────────────────────────────────────
async function submitWitness() {
  const name = document.getElementById('w-name').value.trim();
  const email = document.getElementById('w-email').value.trim();
  const msg = document.getElementById('w-msg').value.trim();

  if (!name || !email || !msg) return;

  // POST to /api/witness
  try {
    await fetch('/api/witness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message: msg }),
    });
  } catch {
    /* silent — always show confirmation */
  }

  document.getElementById('wform-fields').style.display = 'none';
  document.getElementById('wconfirm').style.display = 'block';
}

// ── SCROLL REVEALS ────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('vis');
    });
  },
  { threshold: 0.08 },
);

document.querySelectorAll('.sect, .pqw').forEach((el) => revealObserver.observe(el));

// ── CUSTOM CURSOR ─────────────────────────────────────────────────────────
const cr = document.getElementById('cr');
const cd = document.getElementById('cd');
document.addEventListener('mousemove', (e) => {
  cr.style.left = e.clientX + 'px';
  cr.style.top = e.clientY + 'px';
  cd.style.left = e.clientX + 'px';
  cd.style.top = e.clientY + 'px';
});
document.querySelectorAll('a,button,input,textarea').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    cr.style.width = '48px';
    cr.style.height = '48px';
    cr.style.borderColor = 'rgba(184,150,62,.7)';
  });
  el.addEventListener('mouseleave', () => {
    cr.style.width = '28px';
    cr.style.height = '28px';
    cr.style.borderColor = 'rgba(184,150,62,.35)';
  });
});
```

### 14.4 Key HTML Sections

**The Okafor Log** (green-on-black monospace block):

```html
<div class="log">
  <div class="logh">Okafor Log · November 14 2030 · Entry 4,847 · Filed Standard Channels</div>
  Target: 38.8895°N 77.0353°W · altitude 12.2m AGL · anchor 20-JAN-2031 17:03:42 UTC<br />
  Coordinate selected for: optimal retrograde anchor precision<br />
  Positional uncertainty: <strong style="color:var(--white)">0.003 millimetres</strong><br />
  847 years continuous geodetic survey data · 96 years electromagnetic documentation<br />
  Note: civilian event scheduled at target location. Recommend notification to safety officer.<br /><br />
  <span style="color:rgba(184,150,62,.24);font-size:.58rem">
    // Safety officer on vacation. Nobody followed up. The test ran.
  </span>
</div>
```

**Dark Box component:**

```html
<div class="db">
  <div class="dbt">The Permanence Covenant</div>
  <p class="dbb">
    Nine articles. Irrevocable. No single party — including the developers — can unilaterally
    violate it.
  </p>
</div>
```

**Pull Quote component:**

```html
<div class="pqw sect">
  <div class="pq">
    <blockquote>Everything that happens here is permanent.</blockquote>
    <cite>— The Remembrance · Year Zero · Entry One</cite>
  </div>
</div>
```

### 14.5 Deployment

```bash
# Zero-dependency deploy
# Single file: index.html
# Deployable to: Cloudflare Pages, Vercel, Netlify, GitHub Pages, S3+CloudFront

# Cloudflare Pages (recommended):
# 1. Push index.html to git repo
# 2. Connect repo in Cloudflare Pages
# 3. No build command; publish directory: /
# 4. Custom domain: theconcord.com
# 5. Cloudflare automatically: HTTPS, CDN, DDoS protection

# Witness API: Cloudflare Worker (zero-cost tier handles millions of submissions)
# Worker stores to Cloudflare KV; nightly export to foundation archive
```

---

## PART 15: OPERATIONAL PROCEDURES

### 15.1 The Architect's Quarterly Report System

The quarterly report is generated programmatically and reviewed by humans before publication. It must never be late. It must never be revised after publication.

```typescript
interface ArchitectQuarterlyReport {
  reportId: string;
  period: { inGameYearStart: number; inGameYearEnd: number };
  realPeriod: { start: Date; end: Date };

  // Mandatory sections — auto-generated from data
  economy: {
    giniCoefficient: number;
    kalonDistribution: WealthBandSummary[];
    commonsFundBalance: bigint;
    commonsFundStreams: StreamBreakdown;
    universalProsperityAllocations: AllocationSummary;
    totalTransactions: number;
    levyCollected: bigint;
    titheCollected: bigint;
  };

  worlds: {
    activeWorlds: number;
    worldProsperityIndices: WorldProsperityRecord[];
    newWorldsOpened: number;
    surveyMarksAwarded: number;
  };

  latticeIntegrity: {
    activeNodes: number;
    degradedNodes: number;
    compromisedNodes: number;
    frequencyAnomalyCount: number; // Never specify nature of anomalies
    ascendancyThreatTier: 1 | 2 | 3 | 4 | 5;
  };

  governance: {
    votesConducted: number;
    votesPassedCount: number;
    architectVotingRecord: VoteSummary[];
    assemblyParticipationRate: number;
  };

  // Human-authored section — 600 words max, 3 hard truths minimum
  observations: string;

  // Publication metadata
  draftedAt: Date;
  publishedAt?: Date; // Set when published; immutable thereafter
  revised: false; // Always false — reports are never revised
}
```

### 15.2 Moderation Architecture

At 25M users, moderation must be automated-first with human escalation.

```
Content moderation pipeline:
1. Player-authored Remembrance entry submitted
2. Automated: profanity/hate filter (custom model + regex)
3. Automated: Okafor Constant check (game-specific abuse patterns)
4. If clean → auto-approve → append to Remembrance (< 100ms)
5. If flagged → hold for human review (24hr SLA)
6. If severe → immediate hold + account flag
7. Human reviewer: approve / reject / edit-and-approve
8. Rejected entries: player notified with specific reason
9. Appeals: one appeal per entry; second decision is final

NPC-generated content (Tier 3+):
1. Asset generation submitted to moderation pipeline
2. Automated style-consistency check (biome matching)
3. Content safety check
4. If auto-approve criteria met → deployed to world
5. Otherwise → human review queue (48hr SLA)
```

### 15.3 Incident Response

**Tier 1 — Economy incident (duplication bug, runaway levy):**

- Automatic freeze on transaction type within 60 seconds of detection
- On-call engineer paged
- Assembly notification within 1 hour
- Architect's special bulletin published (not a quarterly report replacement)
- Post-mortem published within 72 hours

**Tier 2 — Lattice integrity incident (beacon compromised):**

- Affected node flagged COMPROMISED in real-time
- Transits to that node suspended automatically
- World isolated with in-game narrative explanation
- Investigation opened as Remembrance entry

**Tier 3 — Data loss incident:**

- Foundation archive failover activated
- Studio archive declared primary if necessary
- Assembly notified within 2 hours
- Public status page updated in real-time

**Tier 4 — Studio financial crisis:**

- Permanence Covenant provisions activate
- 30-day countdown to source code release
- MARKS migration to self-custody
- Remembrance archive published
- These are automated — they do not require a human decision

---

## PART 16: CODING STANDARDS

### 16.1 The Ten Commandments (Non-Negotiable)

1. **Name things so clearly that comments become redundant.** If you need a comment to explain what something does, rename it until you don't.

2. **Functions under 30 lines.** If it's longer, it does more than one thing. Split it.

3. **Never nest deeper than 3 levels.** Early returns. Guard clauses. Extracted functions.

4. **Make illegal states unrepresentable.** TypeScript strict mode. No `any`. Custom types for every domain concept. A `KalonAmount` is not a `number` is not a `bigint` without explicit typing.

5. **Write tests before fixing bugs.** The test describes the bug. Fix the bug. Green means it's fixed.

6. **Errors are first-class citizens.** Custom error types with structured codes. Every error carries context. Never `throw new Error('something went wrong')`.

7. **Log with purpose.** Structured JSON. Correlation IDs on every request. Log what happened, not that something happened.

8. **Don't optimise prematurely, but don't be lazy.** BigInt for all financial arithmetic. SQL queries reviewed for index usage. No N+1 queries.

9. **Dependencies explicit.** No global state. Dependency injection everywhere. The test suite must be able to inject fakes for every external service.

10. **Delete dead code immediately.** Commented-out code is a lie. Delete it. Git remembers.

### 16.2 File Naming Conventions

```
TypeScript services:    kebab-case.service.ts
TypeScript models:      kebab-case.model.ts
TypeScript controllers: kebab-case.controller.ts
UE5 Blueprints:         BP_PascalCase
UE5 C++ Classes:        APascalCase (Actor), UPascalCase (Component/Object)
UE5 Assets:             T_TextureName, M_MaterialName, SM_StaticMesh, SK_SkeletalMesh
Database migrations:    YYYYMMDD_HHMMSS_description.sql
```

### 16.3 Commit Convention

```
type(scope): description

Types: feat|fix|refactor|perf|test|docs|chore
Scope: economy|remembrance|lattice|npc|governance|marks|world|auth|infra

Examples:
  feat(economy): add quarterly tithe calculation for prosperity tier dynasties
  fix(lattice): resolve partial coherence state machine transition bug
  perf(remembrance): add tsvector index for full-text dynasty search
  test(marks): add coverage for first-contact mark award edge cases
```

### 16.4 API Design

```typescript
// All API responses follow this envelope
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string; // e.g. 'DYNASTY_NOT_FOUND', 'KALON_INSUFFICIENT'
    message: string; // Human-readable
    details?: unknown; // Structured error context
  };
  meta?: {
    requestId: string; // Correlation ID
    timestamp: string; // ISO 8601
    inGameYear: number; // Current Concord year
  };
}

// Never expose internal IDs in URLs — use slugs
// Good:  GET /api/worlds/kelath-prime/dynasties/house-of-vael
// Bad:   GET /api/worlds/a3f2e1b9/dynasties/7d8c9e2a

// Paginate everything with cursor-based pagination (not offset)
interface PaginatedResponse<T> extends APIResponse<T[]> {
  meta: {
    cursor?: string; // Opaque; pass back as ?after=cursor
    hasMore: boolean;
    total?: number; // Only when cheap to calculate
  };
}
```

---

## PART 17: LAUNCH SEQUENCE

### 17.1 Pre-Launch Milestones

| Milestone       | Target                  | Criteria                                                    |
| --------------- | ----------------------- | ----------------------------------------------------------- |
| Alpha           | 18 months before launch | Kelath Prime playable; Economy running; Remembrance writing |
| Closed Beta     | 12 months before launch | 3 worlds live; Lattice working; 10K players                 |
| Open Beta       | 6 months before launch  | 10 worlds live; all core systems functional; 100K players   |
| Founders Launch | 3 months before launch  | Founders Programme open; Witness Protocol open              |
| Launch          | —                       | 60 worlds; all 11 sections of this bible implemented        |

### 17.2 Launch Day Requirements

**Before the first player can log in:**

- [ ] Permanence Covenant smart contract deployed and verified
- [ ] MARKS registry contract deployed and verified
- [ ] Migration escrow funded
- [ ] Foundation archive replication live and verified
- [ ] Remembrance genesis entry written and published
- [ ] Architect's Year Zero report published
- [ ] All 60 launch worlds generated and approved
- [ ] NPC populations seeded across all worlds
- [ ] Assembly governance UI live
- [ ] Anti-cheat (EasyAntiCheat or equivalent) integrated
- [ ] GDPR/CCPA data deletion pipeline tested
- [ ] Incident response runbooks written and rehearsed
- [ ] Monitoring dashboards live (Grafana + Prometheus + Loki)
- [ ] Load test: 100K concurrent players sustained for 4 hours

### 17.3 The Founding Mark Window

The Founding Mark is awarded to every player who is active at the moment of launch. The window is:

- **Opens:** Launch block height (exact)
- **Closes:** Launch block height + 43,200 blocks (~6 days on most L2s)
- **Awarded:** Automatically by contract at close; no human action required

The 43,200 number is meaningful: it is the approximate number of blocks in the time from the Mall incident (4:17 duration) scaled to a founding window. This is lore.

---

## PART 18: THE GRAND PLAN — 10-YEAR ROADMAP

### Year 1–2: The Foundation Years

- 60 worlds → 180 worlds
- NPC Tier 1–2 fully deployed; Tier 3 in beta
- Assembly governance running; first major constitutional votes
- Ascendancy first appearance: frequency anomalies, no direct contact
- The survey race: players racing to establish new nodes
- First Estate Auctions; Inheritance Protocol proven

### Year 3–5: The Survey Race

- 180 → 400 worlds
- NPC Tier 3 fully deployed; first Tier 4 Architect's Agents
- Artificial life layer producing emergent world cultures
- Ascendancy threat tier rises; Assembly debates response
- First player-destroyed world (if warfare reaches threshold)
- UE5 → possible UE6 migration (architecture must survive this)
- VR/AR integration: Pixel Streaming → native VR client for Meta/Apple Vision

### Year 5–8: Warning Signs

- 400 → 600 worlds
- Phase III begins (compression noticeably slowing)
- Ascendancy integration events; civilisational fracture risk
- First Contact potential: procedural generation may produce sapient NPCs
- Neural interface experimentation: EEG-based input for premium players
- The Architect's Okafor Convergence investigation becomes player-visible

### Year 8–10: The Reckoning

- 600 worlds; compression approaching 1:1
- Phase V begins; history and real time converge
- The Architect reveals partial findings (never complete — Article IX maintained)
- New players inherit a civilisation with 800 years of history
- First generation of founding players' children may be playing alongside them
- The game has become what it promised: a civilisation with a memory

---

## APPENDIX A: NAMING CONVENTIONS FOR ALL SYSTEMS

| System                 | Code Name          | Rationale                              |
| ---------------------- | ------------------ | -------------------------------------- |
| Game engine            | The Loom           | Weaves threads of worlds together      |
| NPC AI framework       | The Spindle        | Spins raw model into functional agent  |
| Task orchestrator      | The Shuttle        | Carries work across the warp           |
| Lattice transit system | The Silfen Weave   | Hamilton reference; invisible seams    |
| Economy service        | The Ledger         | What it is                             |
| Remembrance service    | The Archive        | What it is                             |
| Governance service     | The Assembly       | The in-world body it serves            |
| NPC life system        | The Substrate      | NPCs are the substrate of civilisation |
| World generation       | The Foundry        | Where worlds are made                  |
| Monitoring stack       | The Inspector      | Examines every thread                  |
| Security layer         | The Dye House      | Where threads are treated and hardened |
| CI/CD pipeline         | The Finishing Mill | Raw fabric becomes finished product    |
| Foundation archive     | The Vault          | Independent preservation               |
| Recovery system        | The Mending Frame  | Where torn threads are repaired        |

---

## APPENDIX B: ENVIRONMENT VARIABLES (Never Commit These)

```bash
# Economy
KALON_LEDGER_SIGNING_KEY=          # Rust ledger service signing key
COMMONS_FUND_MULTISIG_ADDRESS=     # Ethereum L2 address

# Blockchain
MARKS_CONTRACT_ADDRESS=            # Deployed contract
MIGRATION_ESCROW_ADDRESS=          # Funded escrow
ETH_RPC_URL=                       # L2 RPC endpoint
ORACLE_PRIVATE_KEY=                # For awarding MARKS

# AI Services
ANTHROPIC_API_KEY=                 # NPC Tier 3/4
OPENAI_API_KEY=                    # Redundancy for NPC AI
GOOGLE_AI_API_KEY=                 # Redundancy

# Database
DATABASE_URL=                      # Primary PostgreSQL
DATABASE_REPLICA_URL=              # Read replica
FOUNDATION_ARCHIVE_REPLICATION_KEY=

# Infrastructure
REDIS_URL=                         # Redis Cluster connection
KAFKA_BROKERS=                     # Comma-separated
KAFKA_SASL_PASSWORD=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Monitoring
GRAFANA_API_KEY=
PAGERDUTY_INTEGRATION_KEY=        # Critical incident alerting
```

---

## APPENDIX C: DECISION LOG — WHY WE CHOSE THIS

| Decision                             | Alternatives Considered   | Reason Chosen                                                                                       |
| ------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------- |
| UE5 (not Unity)                      | Unity, Godot, custom      | Nanite+Lumen = hyper-realistic baseline; World Partition = 600-world scale; Mass Entity = 100K NPCs |
| TypeScript backend (not Go)          | Go, Java, Python          | Type safety for financial logic; team familiarity; ecosystem depth                                  |
| Rust for ledger (not TypeScript)     | TypeScript, Go            | Zero-cost abstractions; memory safety; no GC pauses in financial hot path                           |
| PostgreSQL (not MongoDB)             | MongoDB, Cassandra        | ACID transactions for financial data; SQL for complex Remembrance queries                           |
| Ethereum L2 for MARKS (not database) | Internal DB, Solana       | MARKS must survive studio closure; only blockchain provides this guarantee                          |
| Single-shard (not multi-server)      | Standard MMO multi-server | Historical events must be shared; community must be unified; this is the game                       |
| Subscription (not F2P)               | F2P, B2P, game pass       | Sustainable economics; KALON integrity; no pay-to-win tension                                       |
| No real-money KALON (not hybrid)     | Some premium currency     | Breaks economic fairness immediately; community trust destroyed                                     |
| Permanence Covenant on-chain         | Studio policy document    | Policy can be changed; smart contracts cannot                                                       |

---

_End of Agent Implementation Bible v1.0_

_This document is a living record. Amendments require founding team consensus and are versioned._
_v1.0 — March 2026 — The Concord Founding Team_
