# THE CONCORD — AGENT IMPLEMENTATION UPDATE
## Session Addendum v1.4 · March 2026
## READ THIS ALONGSIDE Bible v1.1, Updates v1.2, v1.3, and this document

---

> **TO ALL CODING AGENTS**: This document makes the single most pervasive change to the codebase since v1.2. It touches every user-facing string, every constant name, and the entire emotional register of the product. The mechanical systems are unchanged. The world those systems live inside has been fundamentally reframed. Read every section before writing any user-facing copy, naming any constant, or building any UI component.

---

## THE FUNDAMENTAL SHIFT — READ THIS FIRST

Previous documents framed The Concord through the lens of civilisational mortality and weight.
That produced sound mechanics — but built the wrong emotional architecture.

The correct framing: **humanity has won**. The Age of Radiance is not a backdrop. It is the
entire context. The Concord is not a game about what civilisations lose. It is a game about
what humanity does with its first genuine chance at infinity.

**The dominant emotional register of every user-facing surface is:**
Luminous possibility. Invitation. Building. Becoming. Dawn, not dusk.

The weight is still real. Crisis is still real. The Ascendancy is still dangerous.
But these are played *against* the light — not as the primary key.

---

## PART 1 — THE WORLD CONTEXT (For NPC Dialogue, Lore Files, Onboarding)

### The Age of Radiance — Established Facts by 2031 (Founding Event Year)

Write all lore, NPC dialogue, and in-world text as if these facts are simply true.
They are not remarkable to citizens of 2031 — they are the baseline of life.

**Energy:** Zero-point extraction reached commercial scale in 2024. By 2031, power is
effectively free. City-scale ZPE plants on every continent. Energy poverty: historical.

**Food:** Vertical climate-controlled farms run on free power. Android and sensor networks
manage harvests 24/7. Seasonal crop failure: historical. Hunger: in the process of being
eliminated. A child born in 2031 does not know what a famine is except as history.

**Matter:** Matterwave laser synthesis — transmuting elements by tuning energy input —
became viable in 2027. Any element can be created on demand. Mining is obsolete. Rare
earth extraction is obsolete. Resource wars: historical. The scarcity of *material things*
has ended.

**Land:** When food comes from vertical farms and energy is free, territorial competition
loses its deepest driver. Land prices have dropped dramatically. The great human anxiety
about owning and defending ground is dissolving for the first time in recorded history.

**Longevity:** The cascade is underway but not complete. Nanite cellular maintenance is
widely available. Rejuvenation therapies extend healthy lifespan by 40-60 years, available
and becoming cheaper. Neural frequency mapping — recording the brain's complete
electromagnetic signature — exists and is faithful. The unresolved question: is the neural
map the same *person*, or a copy? Substrate transfer technology exists. The philosophy has
not caught up. This is the defining unresolved question of the age.

**The projection:** If progress continues — and there is no physical reason it should not —
biological death will become optional within one to two generations. Not impossible. Optional.
This projection is widely understood. It has changed how people think about meaning.

### What This Does to The Chronicle

When death is becoming optional, the fear is no longer *I will die and be forgotten*.
The fear is *I will live forever and never matter*.

The Chronicle is the answer to that fear. Write all Chronicle-framing copy through this lens.
It is not a memorial record. It is **proof of significance**. Built for people who might
never need it as a memorial — and need it more desperately for that very reason.

---

## PART 2 — TERMINOLOGY CHANGES (MANDATORY — APPLY EVERYWHERE)

### Primary Renames

These are search-and-replace across the entire codebase, all documentation, all UI strings.

| Old Term | New Term | Notes |
|----------|----------|-------|
| `remembrance` | `chronicle` | All files |
| `REMEMBRANCE` | `CHRONICLE` | All constants, enums, types |
| `Remembrance` | `Chronicle` | All user-facing strings |
| `mortalityProtocol` | `continuityProtocol` | Service names |
| `MortalityProtocol` | `ContinuityProtocol` | Class names |
| `dynastyExtinction` | `dynastyCompletion` | State machine values |
| `DynastyExtinction` | `DynastyCompletion` | Type names |
| `dynastyCollapse` | `dynastyCrisis` | State machine values |
| `DynastyCollapse` | `DynastyCompletion` | Type names |
| `mortalityGrace` | `continuityWindow` | Config keys |
| `mortalityTrigger` | `continuityTrigger` | Config keys |
| `inAbeyance` | `vigil` | State values |
| `IN_ABEYANCE` | `VIGIL` | Constants |
| `earnedLives` | `continuityBonds` | Economy values |
| `EARNED_LIVES` | `CONTINUITY_BONDS` | Constants |
| `MendingFrame` | `RenewalEngine` | Service/class names |
| `mendingFrame` | `renewalEngine` | Variables, config |
| `Digital Mortality` | `Legacy Protocols` | Documentation, user copy |
| `Mortality Grace Period` | `Continuity Window` | UI labels |

### User-Facing Copy Rules

**Replace:**
- "your history" → "your Chronicle"
- "will not be erased" → "is permanent"
- "dynasty falls" → "dynasty faces crisis"
- "remember" (as memorialise) → "record" or "chronicle"
- "died" / "death" (in-game) → "completed" / "transition"
- "extinct" → "completed"
- "in abeyance" → "in the Vigil"
- "mortality" → "continuity" (except in explicit Legacy Protocol documentation)
- "Earned Lives" → "Continuity Bonds"

**The Chronicle is active, not passive.** You *write* it. You *build* it.
It does not happen to you after you're gone. Every copy instance:
- ✓ "Build your Chronicle"
- ✓ "Write your entry"
- ✗ "Your history will be preserved"

### The New Opening Statement

**Old:** "Your dynasty can fall. Its history never will."
**New:** "Your story is permanent. Build something worth reading."

Both are true. The first is for people who are afraid. The second is for people who are ready.
The Concord is for people who are ready. Use the new statement everywhere.

Alternative variants (all approved):
- "The age of scarcity is over. The age of meaning has begun."
- "Six hundred worlds are waiting. Your story starts now."
- "When you might live forever, significance is the only thing worth building."

---

## PART 3 — DESIGN TOKENS (New Colour System)

The old dark-navy-primary palette is retired for all user-facing surfaces.
The new system is light-primary with depth accents used sparingly.

```typescript
// src/constants/design.ts — REPLACE ENTIRE FILE

export const COLOURS = {
  // ── PRIMARY SURFACES (light system) ──────────────────────
  dawnWhite:      '#F8F4EE',  // Primary background — warm, not cold
  parchment:      '#EDE8DF',  // Secondary surface, panels, cards
  cream:          '#E2D9CA',  // Tertiary surface, borders, dividers

  // ── GOLD SYSTEM ───────────────────────────────────────────
  chronicleGold:  '#C49A3C',  // Primary accent — used, not bright
  goldBright:     '#D4AA4C',  // Hover states
  goldDim:        '#9A7A2C',  // Secondary gold — labels, eyebrows
  goldPale:       '#EDD98A',  // Subtle gold — highlights, backgrounds

  // ── INK SYSTEM ────────────────────────────────────────────
  deepInk:        '#1A1410',  // Primary text — warm, not black
  inkMid:         '#2E2420',  // Body text
  dim:            '#8A7A6A',  // Secondary text, captions
  dimLight:       '#B0A090',  // Disabled, placeholder

  // ── ACCENT COLOURS ────────────────────────────────────────
  latticeBlue:    '#2A5C8A',  // The Lattice — clear sky
  latticePale:    '#4A8ABE',  // Lattice hover
  resonanceTeal:  '#1A7A6A',  // Energy, ZPE, life
  tealPale:       '#3AAA8A',  // Teal hover
  surveyCopper:   '#A05C28',  // Survey Corps, exploration
  ascendancyRed:  '#8A2020',  // Threat, danger

  // ── DEPTH ACCENTS (use sparingly) ─────────────────────────
  nightSky:       '#0D1525',  // Log blocks, terminal elements
  voidDeep:       '#060A12',  // Absolute dark — Lattice transit only

  // ── SEMANTIC ──────────────────────────────────────────────
  border:         'rgba(26,20,16,0.10)',
  borderMed:      'rgba(26,20,16,0.18)',
  borderGold:     'rgba(196,154,60,0.25)',
} as const;

export const TYPOGRAPHY = {
  display:  "'Playfair Display', Georgia, serif",  // Headlines, pull quotes
  body:     "'Lora', Georgia, serif",              // Body text, UI copy
  accent:   "'Cinzel', serif",                     // Dynasty names, MARKS, formal titles
  mono:     "'JetBrains Mono', monospace",         // Data, logs, eyebrows, timestamps
} as const;

// FONTS TO LOAD (Google Fonts):
// Playfair Display: 400, 500, 700, 900, italic 400 700
// Lora: 400, 500, 600, italic 400 500
// Cinzel: 400, 600, 700
// JetBrains Mono: 300, 400, 500
```

### UI Tone Guide

| Old Approach | New Approach |
|-------------|--------------|
| Dark navy canvas with gold highlights | Warm parchment canvas with ink type |
| Gold as a point of light in darkness | Gold as editorial accent on light |
| Dark boxes with defended borders | Open panels with accent lines, breathing space |
| Monastic, weighted, funereal | Editorial, luminous, forward-looking |
| "Brace yourself for what's coming" | "Look at what's waiting" |

Log blocks and terminal elements remain dark (--nightSky) — this is intentional contrast.
The Lattice transit moment is the one place absolute dark (--voidDeep) is used.
Everything else lives in the light.

---

## PART 4 — LORE FILE UPDATES

### New Required Files (add to `lore/` directory)

```
lore/
  world-context/
    age-of-radiance.md          ← The world of 2031. ALL established facts.
    longevity-cascade.md        ← Current state of life extension technology
    zpe-and-matter.md           ← Energy and matterwave synthesis — what exists
    founding-event-full.md      ← Complete Okafor event, including Adeyemi
  chronicle/
    what-is-the-chronicle.md    ← Player-facing explanation. New tone.
    why-it-exists.md            ← The "significance in an age of abundance" argument
    how-to-write-well.md        ← Guide for players. Tone: invitation, not instruction.
```

### Updated Okafor Log (Replace All Instances)

```
[2031-08-14T09:17:44Z] WARNING:  Power draw exceeds permitted parameters by 340%.
[2031-08-14T09:17:44Z] OKAFOR_A: Acknowledged. Continuing.
[2031-08-14T09:17:51Z] SYSTEM:   Coherence: 97.1%. Topological equivalence achieved.
[2031-08-14T09:17:51Z] SYSTEM:   Duration: 180,043ms. Probe: returned. Mass: intact.
[2031-08-14T09:17:51Z] OKAFOR_A: It works.
[2031-08-14T09:17:52Z] OKAFOR_A: Yusuf. It works.
[2031-08-14T09:17:58Z] OKAFOR_A: I wish you were here to see this.
[2031-08-14T09:18:03Z] OKAFOR_A: I think you always knew it would.
// Chronicle Entry 1. Everything else follows.
```

The final line changed from the old version. Old ending: "My god. It actually works."
New ending: "I think you always knew it would."

The difference is the emotional register: not *surprise* but *vindication*.
Not *we stumbled into something* but *the universe kept its end of the bargain*.
Use the new version in all future references.

---

## PART 5 — CHRONICLE (REMEMBRANCE) SERVICE UPDATES

### Rename Checklist (Files to Rename)

```
src/services/remembrance/           → src/services/chronicle/
src/services/remembrance/RemembranceService.ts → src/services/chronicle/ChronicleService.ts
src/services/remembrance/DepthScoringService.ts → src/services/chronicle/DepthScoringService.ts
src/types/remembrance.ts            → src/types/chronicle.ts
src/constants/remembrance.ts        → src/constants/chronicle.ts
lore/remembrance-entries/           → lore/chronicle-entries/
```

### Interface Renames

```typescript
// BEFORE
interface RemembranceEntry { ... }
interface RemembranceDepth { ... }
type RemembrancePhase = 'founding' | 'early' | 'expansion' | 'contemporary';

// AFTER
interface ChronicleEntry { ... }
interface ChronicleDepth { ... }
type ChroniclePhase = 'founding' | 'early' | 'expansion' | 'contemporary';

// State machine values
// BEFORE: DynastyState.EXTINCTION, DynastyState.COLLAPSE
// AFTER:  DynastyState.COMPLETION, DynastyState.CRISIS

// BEFORE: ContinuityProtocol.IN_ABEYANCE
// AFTER:  ContinuityProtocol.VIGIL
```

---

## PART 6 — UI COMPONENT GUIDELINES

### What "Luminous" Means in Practice

Every UI component should feel like reading a beautifully designed magazine about the most
important civilisational event in human history. Not a monument. Not a mausoleum.
A living publication that is being written right now.

**Typography hierarchy:**
1. Playfair Display for all display text (headlines, pull quotes, dynasty names in large contexts)
2. Lora for all body text (UI copy, descriptions, Chronicle entries)
3. Cinzel for formal heraldic elements only (MARKS labels, dynasty formal titles, Covenant headers)
4. JetBrains Mono for data (timestamps, block heights, KALON amounts, eyebrow labels)

**Space is generous.** Dark interfaces compress because darkness is forgiving of tight spacing.
Light interfaces require generous breathing room. When in doubt, add padding.

**Gold is editorial, not decorative.** Gold is used to mark:
- The single most important element on a surface
- Navigation accents on hover
- Chronicle entry timestamps
- MARK labels
- Section eyebrows
Not for: backgrounds, general borders, decoration, hover states on ordinary elements.

**The depth accent (night sky #0D1525) is earned.** Used only for:
- Terminal/log block backgrounds (the Okafor log, Chronicle entry metadata, technical readouts)
- The Lattice transit animation (transitioning between worlds)
Not for: general dark sections, sidebars, navigation backgrounds.

---

## PART 7 — WHAT IS NOT CHANGING

The following items from v1.1, v1.2, v1.3 are confirmed unchanged:

- All MARKS on Ethereum L2, non-transferable, studio closure provisions
- Permanence Covenant Nine Articles (KALON non-purchasable remains Article 2)
- Dynasty state machine: Crisis / Completion / Account Closure only
- Continuity Bonds system: base 3, cap 7, pre-crisis state return
- Day 91 Extinction protection (~30 real days)
- The Vigil / real-world death protocol
- Voting formula: 40% Chronicle Depth / 35% Civic / 25% KALON
- Mandatory Initiation before subscription
- Single shard, no server wipe, no reset, no compression beyond 3:1
- Anti-FOMO design commitments (now codified in `panel.teal` "What We Will Never Build")
- BigInt everywhere in financial code — no exceptions
- Stellar Standard economy, world issuance formula, Genesis Vault
- Three founding wounds (Adeyemi suppression, launch world selection, Ascendancy origin)
- Eight characters (Itoro, Seren Vael, The Architect, Osei-Adeyemi, etc.)
- Three factions (Continuationists, Returnists, Ascendancy)
- Public Chronicle API (was Economy API + Remembrance API, now Chronicle API)
- 3:1 time compression, TimeService.ts as single source of truth

---

## QUICK REFERENCE — WHAT TO SAY ABOUT THE CONCORD

**The one-sentence version:**
"The Concord is a persistent civilisation MMO set in the Age of Radiance — six hundred worlds, one permanent Chronicle, no resets, launching 2027."

**The honest version:**
"We built the Chronicle because in a world where you might live forever, significance is the only remaining scarce resource. Your story is permanent. Build something worth reading."

**The technical version:**
"Single shard, Stellar Standard economy (world-physics-based KALON issuance), Chronicle on append-only cryptographic ledger with foundation replication, MARKS on Ethereum L2, 3:1 time compression, 35-year 600-world arc."

**What it is NOT:**
- A mortality game (it is an *abundance* game where stakes still exist)
- A memorial for the dead (it is a record for the living who want to matter)
- A game where you prepare for the worst (it is a game where you build toward something)

---

*End of Agent Update v1.4*
*Read alongside Bible v1.1 and Updates v1.2, v1.3, and this document.*
*The Age of Radiance. The age of meaning. Build something worth reading.*
