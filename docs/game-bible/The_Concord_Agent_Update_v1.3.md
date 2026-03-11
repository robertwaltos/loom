# THE CONCORD — AGENT IMPLEMENTATION UPDATE
## Session Addendum v1.3 · March 2026
## READ THIS ALONGSIDE Bible v1.1 AND Agent Update v1.2

---

> **TO ALL CODING AGENTS**: This document adds one locked decision and propagates its implications across every system it touches. v1.2 remains in effect. Where this document adds to or amends v1.2, this document wins. Read everything before writing time-dependent code.

---

## THE SINGLE NEW DECISION

### [LOCKED] TIME COMPRESSION RATIO: 3:1

**3 in-game years pass for every 1 real year.**

This is the only change from v1.2. Its implications are wide. Read every section below before touching any system that involves time, money, mortality, survey pacing, or player progression.

---

## WHAT THIS MEANS FOR EVERY SYSTEM

### The Master Time Service

This is the single source of truth for all time calculations. Every service reads from it. Nothing calculates time independently.

```typescript
// src/services/time/TimeService.ts

export const TIME_CONFIG = {
  COMPRESSION_RATIO:    3,          // 3 in-game years per 1 real year — LOCKED, never change
  LAUNCH_DATE:          new Date('2027-01-01T00:00:00Z'), // set at launch, then immutable
  MS_PER_REAL_YEAR:     365.25 * 24 * 3600 * 1000,
  MS_PER_INGAME_YEAR:   (365.25 * 24 * 3600 * 1000) / 3,
  MS_PER_INGAME_MONTH:  (365.25 * 24 * 3600 * 1000) / 36,  // ~10.14 real days
  MS_PER_INGAME_DAY:    (365.25 * 24 * 3600 * 1000) / (3 * 365.25),
} as const;

// Cache this in Redis with 1-second TTL. Never call on hot path without cache.
export function getInGameYear(realNow: Date = new Date()): number {
  const realElapsed = realNow.getTime() - TIME_CONFIG.LAUNCH_DATE.getTime();
  const realYearsElapsed = realElapsed / TIME_CONFIG.MS_PER_REAL_YEAR;
  return Math.floor(1 + (realYearsElapsed * TIME_CONFIG.COMPRESSION_RATIO));
}

export function getInGameDate(realNow: Date = new Date()): {
  year: number;
  month: number;  // 1–12
  day: number;    // 1–30 (simplified calendar)
} {
  const realElapsed = realNow.getTime() - TIME_CONFIG.LAUNCH_DATE.getTime();
  const inGameDaysElapsed = realElapsed / TIME_CONFIG.MS_PER_INGAME_DAY;
  const year  = Math.floor(inGameDaysElapsed / 360) + 1;  // 360-day in-game year
  const month = Math.floor((inGameDaysElapsed % 360) / 30) + 1;
  const day   = Math.floor(inGameDaysElapsed % 30) + 1;
  return { year, month, day };
}

// Convert real duration to in-game duration
export function realDaysToInGame(realDays: number): number {
  return realDays * TIME_CONFIG.COMPRESSION_RATIO;
}

// Convert in-game duration to real duration
export function inGameDaysToReal(inGameDays: number): number {
  return inGameDays / TIME_CONFIG.COMPRESSION_RATIO;
}
```

---

### Survey Corps Pacing

580 worlds to unlock over 35 real years. The TimeService drives beacon deployment scheduling.

```typescript
export const SURVEY_PACING = {
  // Total worlds to unlock after launch: 600 - 20 = 580
  WORLDS_TO_UNLOCK: 580,

  // Real days between world openings (average)
  // 35 years × 365 days / 580 worlds = ~22 real days per world
  REAL_DAYS_PER_WORLD_AVG: 22,

  // In-game days between world openings (average)
  // 22 real days × 3 = 66 in-game days
  INGAME_DAYS_PER_WORLD_AVG: 66,

  // Pacing is NOT uniform — it follows civilisational phases:
  PHASE_PACING: [
    { realYearStart: 0,  realYearEnd: 3,  worldsTarget: 60,  rationale: 'Early rush — Survey Corps proving itself' },
    { realYearStart: 3,  realYearEnd: 8,  worldsTarget: 150, rationale: 'Steady expansion — Corps institutionalised' },
    { realYearStart: 8,  realYearEnd: 15, worldsTarget: 300, rationale: 'Mid expansion — Ascendancy interference begins' },
    { realYearStart: 15, realYearEnd: 25, worldsTarget: 500, rationale: 'Late expansion — contested, slower, dangerous' },
    { realYearStart: 25, realYearEnd: 35, worldsTarget: 600, rationale: 'Reckoning — final worlds, highest stakes' },
  ],
} as const;
```

---

### Mortality Grace Periods — Recalculated

All grace periods are defined in in-game days. They convert to real time via the TimeService.

```typescript
export const MORTALITY_TIMINGS = {
  // Day 91 Protection — no player-forced Extinction before this in-game day
  // In-game day 91 = real day 30.3 (~1 real month)
  // New players have exactly one real month of absolute Extinction protection.
  EXTINCTION_PROTECTION_INGAME_DAYS: 91,
  get EXTINCTION_PROTECTION_REAL_DAYS() {
    return inGameDaysToReal(this.EXTINCTION_PROTECTION_INGAME_DAYS); // ~30.3
  },

  // Subscription tier grace periods (in-game days)
  // These are the window after subscription lapse before Sentinel Regent kicks in
  ACCORD_GRACE_INGAME_DAYS:  30,  // ~10 real days
  PATRON_GRACE_INGAME_DAYS:  60,  // ~20 real days
  HERALD_GRACE_INGAME_DAYS:  90,  // ~30 real days (1 real month)

  // Digital Mortality Protocol trigger (in-game days of inactivity)
  MORTALITY_TRIGGER_INGAME_DAYS: 90,    // ~30 real days — protocol begins
  MORTALITY_REVIEW_INGAME_DAYS:  180,   // ~60 real days — reversible window closes
  MORTALITY_FINAL_INGAME_DAYS:   360,   // ~120 real days — irrevocable

  // In Abeyance heir window
  IN_ABEYANCE_HEIR_WINDOW_REAL_YEARS: 2,  // unchanged — real-world legal window
} as const;
```

**Design note on the tight grace periods:** At 3:1, the Accord tier's 30 in-game day grace period is only ~10 real days. This is intentional — it keeps the subscription meaningful without being punishing. A player who lapses their Accord subscription gets 10 real days to renew before their Sentinel Regent is triggered. This is a customer retention moment, not a punishment. The Herald tier's 30 real day grace period is generous enough for a holiday, a crisis, a busy month.

---

### Economy — UBK Cadence

UBK is paid monthly in-game. One in-game month = ~10.14 real days.

```typescript
export const UBK_CADENCE = {
  // Payment interval in real milliseconds
  PAYMENT_INTERVAL_MS: TIME_CONFIG.MS_PER_INGAME_MONTH, // ~10.14 real days

  // Players receive UBK approximately 36 times per real year
  // This is frequent enough to feel like a living economy
  // Not so frequent it becomes background noise

  // Inactive escrow: 24 in-game months = ~240 real days (~8 real months)
  // A player who disappears for 8 real months returns to 24 months of escrowed UBK
  // This makes return meaningful — there's something waiting for them
  INACTIVE_ESCROW_INGAME_MONTHS: 24,
  get INACTIVE_ESCROW_REAL_DAYS() {
    return this.INACTIVE_ESCROW_INGAME_MONTHS * inGameDaysToReal(30); // ~240 real days
  },
} as const;
```

---

### World Issuance — Annual Trigger

World issuance runs on the in-game year boundary, not the real year boundary.

```typescript
// WorldIssuanceService.ts
// Runs when getInGameYear() increments
// Triggered by a cron job that checks every real hour

export class WorldIssuanceService {
  async processAnnualIssuance(inGameYear: number): Promise<void> {
    const activeWorlds = await this.worldRepository.getActiveWorlds();

    for (const world of activeWorlds) {
      const annualIssuance = calculateAnnualIssuance(world.physicalProperties);

      // Distribute issuance:
      // 40% → UBK pool (pays out to dynasties over the coming in-game year)
      // 30% → Commons Fund
      // 20% → Infrastructure Reserve (Lattice node maintenance)
      // 10% → Survey Corps Operations Fund
      const ubkPool        = (annualIssuance * 40n) / 100n;
      const commonsFund    = (annualIssuance * 30n) / 100n;
      const infraReserve   = (annualIssuance * 20n) / 100n;
      const surveyFund     = (annualIssuance * 10n) / 100n;

      await this.ledger.creditWorldPools({
        worldId: world.id,
        inGameYear,
        ubkPool,
        commonsFund,
        infraReserve,
        surveyFund,
      });

      // Emit event for Remembrance recording
      // Each year of issuance is a Remembrance-traceable economic fact
      await this.eventBus.emit('world.issuance.annual', {
        worldId: world.id,
        inGameYear,
        totalIssuance: annualIssuance,
        latticeIntegrity: world.physicalProperties.latticeIntegrity,
      });
    }
  }
}
```

---

### Remembrance Depth — The Compression Benefit

This is the design advantage of 3:1 that the Remembrance system should be built to exploit.

```typescript
// Remembrance depth scoring benefits directly from compression:
// A player writing 1 entry per real week has written 52 entries per real year
// But their dynasty is 3 in-game years old after 1 real year
// Their Remembrance entries are tagged with in-game dates
// So those 52 entries are distributed across 3 in-game years of history
// This makes newer players' dynasties feel historically deep much faster

export const REMEMBRANCE_DEPTH_SCORING = {
  // Base score per entry: unchanged
  BASE_ENTRY_SCORE: 1,

  // Cross-phase bonus: entries from earlier in-game eras are worth more
  // In-game Year 1-20: historical entries (earliest phase)
  // In-game Year 21-50: foundational entries
  // In-game Year 51+: contemporary entries (worth less as history compounds)

  PHASE_MULTIPLIERS: {
    'founding':     5.0,  // in-game Years 1–5
    'early':        3.0,  // in-game Years 6–25
    'expansion':    2.0,  // in-game Years 26–60
    'contemporary': 1.0,  // in-game Year 61+
  },

  // A dynasty founded in real year 2027 (in-game Year 1) that is still active
  // in real year 2062 (in-game Year 105) has Founding-era entries worth 5x
  // This is why long-running dynasties have irreplaceable Remembrance depth
  // It cannot be farmed — you had to be there
} as const;
```

---

### The Founding Mark Window — Recalculated

```typescript
export const FOUNDING_MARK = {
  // Opens: launch block height
  // Closes: launch block height + 43,200 blocks (~6 real days on most L2s)
  // This window covers approximately in-game days 1–18 (6 real days × 3)
  // The Founding Mark represents presence in the first 18 in-game days of civilisation

  WINDOW_BLOCKS: 43_200,
  REAL_DAYS_APPROX: 6,
  INGAME_DAYS_APPROX: 18,  // 6 × 3

  // Narrative significance: in-game day 18 of a civilisation is the equivalent of
  // being present in the first three weeks of recorded history.
  // Players who hold a Founding Mark were there before the civilisation had a month.
} as const;
```

---

### Player Progression Arc — What Players Will Feel

Document this in the product spec. Every designer and agent working on progression should internalize these milestones.

```
YEAR 1 OF REAL PLAY (In-game Years 1–3):
  Economic: 500 KALON genesis + ~360 KALON from UBK (36 monthly payments × 10)
  Total year-end: ~860–2,000 KALON (depending on trade, governance, Survey participation)
  Feel: Tight. Real constraints. Every KALON decision matters.
  Mortality: 3 lives. No earned lives yet. Collapse would hurt.
  Remembrance: ~52 entries if weekly. Dynasty 3 years old — early history, high phase multiplier.

YEAR 3 OF REAL PLAY (In-game Years 7–9):
  Economic: Likely 5,000–20,000 KALON for engaged player. Entering Prosperity Tier.
  Feel: The empire is taking shape. World ownership established. Trade routes running.
  Earned lives: Possibly +1 (survived 50 in-game years — achievable in real year 2 for active player)
  Remembrance: ~150 entries. Dynasty approaching 10 in-game years. Historical weight building.

YEAR 7 OF REAL PLAY (In-game Years 19–21):
  Economic: 50,000–200,000 KALON for well-run dynasty. Concentration Alert territory.
  Feel: Political heavyweight. Assembly influence. Other dynasties negotiate with you.
  Remembrance: ~350 entries. Dynasty 20+ in-game years old. Cross-phase entries accruing bonuses.
  Survey: Possibly holds multiple Survey Marks. World Mark likely.

YEAR 15 OF REAL PLAY (In-game Years 43–45):
  Economic: Approaching Structural Cap for the most successful. Forced to spend on civilisation.
  Feel: Ancient dynasty. Founding-era contemporaries rare. New players encounter your history first.
  Remembrance: 700+ entries. Some of the most historically weighted in the Concord.
  The Architect knows you. Specifically. By name.

YEAR 35 OF REAL PLAY (In-game Year 105):
  Real year: 2062. In-game: full 600 worlds open. Reckoning phase.
  A dynasty active since Year 1 is 105 in-game years old.
  Its Founding-era entries are 5x weighted in Remembrance depth scoring.
  There are perhaps a few hundred such dynasties in existence.
  The Remembrance knows them as the Anchors — the dynasties that remember when there were only 20 worlds.
```

---

### The Narrative Power of Year 105

The Reckoning at in-game Year 105 / real year 2062 deserves its own design note.

In-game Year 105 is within the span of a single human lifetime. A very old person who was born in the Concord's in-game Year 1 would be 105 years old at the Reckoning. The civilisation is young enough that living memory reaches its founding — but old enough that most dynasties have no personal connection to Year 1.

This creates the emotional texture of a civilisation at a hinge moment. The people who remember the beginning are still alive, but they are old, and they will not be alive much longer. The decisions made at Year 105 will be made without them. What they built — the Remembrance, the Covenant, the Assembly, the Survey Corps — will have to speak for them.

The Ascendancy has been operating for 85 in-game years by this point. The Lattice degradation, if the Osei-Adeyemi findings are ever made public, would now be measurable in transit data without needing a theoretical model. The founding wounds are distant enough to feel like history but recent enough that their consequences are still structurally present.

Year 105 is when The Concord's story becomes fully legible. Everything before it was prologue.

---

## UPDATED TIMELINE REFERENCE

| Real Year | In-Game Year | Worlds | Key Events |
|-----------|-------------|--------|------------|
| 2027 | Year 1 | 20 | Founding Event. Founding Mark window (6 real days). Genesis Vault seeded. |
| 2028 | Year 4 | 30 | First Survey marks awarded beyond launch worlds. |
| 2030 | Year 10 | 60 | Early Expansion. First political crisis in Assembly likely. |
| 2034 | Year 22 | 120 | In-game founding generation reaching middle age. Remembrance depth stratifying. |
| 2035 | Year 25 | 150 | Mid Expansion. Survey Corps fully institutionalised. |
| 2040 | Year 40 | 220 | Late Expansion begins. Ascendancy interference measurable. |
| 2042 | Year 46 | 300 | Half the worlds open. Assembly at maximum complexity. |
| 2047 | Year 61 | 380 | Founding-era dynasties (Year 1–5) now ancient. Some have already achieved Extinction. |
| 2052 | Year 76 | 500 | Warning phase. Ascendancy pressure at peak. Lattice degradation first player-detectable. |
| 2057 | Year 91 | 560 | 91 worlds remain. The final Survey race begins. |
| 2062 | Year 105 | 600 | The Reckoning. Full map open. Living memory of Year 1 nearly extinct. |

---

## LOCKED DECISIONS — THIS SESSION

| Decision | Value | Rationale |
|----------|-------|-----------|
| Time compression ratio | 3:1 (in-game:real) | Players need to feel empire growth. Dynasties need historical weight. |
| In-game year at real 2062 | Year 105 | 600 worlds fully open. Reckoning. |
| In-game month duration | ~10.14 real days | 36 UBK payments per real year |
| Day 91 protection in real time | ~30 real days (1 month) | New player protection = one real month |
| Founding-era phase multiplier | 5x Remembrance depth | Years 1–5 entries are historically irreplaceable |

---

## WHAT IS NOT CHANGING FROM v1.2

Everything in v1.2 remains in effect. The Stellar Standard economy, the three founding wounds, the eight characters, the faction architecture, the BigInt financial rules, the Permanence Covenant — all unchanged.

The only new input is the compression ratio. The implications above are exhaustive. There is no time-dependent system in the codebase that this does not touch. Update them all before shipping anything time-dependent.

---

## FILE CHANGES REQUIRED

1. **`src/services/time/TimeService.ts`** — implement in full as above
2. **`src/constants/mortality.ts`** — replace all grace period constants with `MORTALITY_TIMINGS` from this document
3. **`src/services/economy/WorldIssuanceService.ts`** — trigger on in-game year boundary, not real year
4. **`src/services/economy/UBKService.ts`** — payment interval from `TIME_CONFIG.MS_PER_INGAME_MONTH`
5. **`src/services/remembrance/DepthScoringService.ts`** — implement `PHASE_MULTIPLIERS` with in-game year tags
6. **`src/constants/survey.ts`** — implement `SURVEY_PACING` with phase-based world unlock schedule
7. **`src/constants/marks.ts`** — update `FOUNDING_MARK` with recalculated in-game day window
8. **All existing tests involving time** — update expected values to reflect 3:1 compression

---

*End of Agent Update v1.3*
*Read alongside Bible v1.1, Update v1.2, and this document.*
*Next update will contain: Initiation redesign with founding wounds woven in, Assembly constitutional mechanics, Survey Corps economic integration.*
