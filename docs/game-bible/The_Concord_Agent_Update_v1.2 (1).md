# THE CONCORD — AGENT IMPLEMENTATION UPDATE
## Session Addendum v1.2 · March 2026
## READ THIS ALONGSIDE THE AGENT IMPLEMENTATION BIBLE v1.1

---

> **TO ALL CODING AGENTS**: This document supersedes specific sections of Bible v1.1. Where this document conflicts with v1.1, this document wins. Every decision marked **[LOCKED]** is immutable. Read the full document before writing a single line of economy, lore, or character code.

---

## PART 1 — KALON ECONOMY ARCHITECTURE OVERHAUL

### The Problem (Read This First)

Bible v1.1 specified 1 billion KALON, whole units only, fixed supply. This is **broken at civilisational scale**:

- 600 worlds × conservative 500M citizens at maturity = 300 billion participants
- 1B KALON ÷ 300B people = 0.003 KALON per person average
- Nearly every citizen holds zero KALON at full scale
- The UBC (Universal Basic KALON) drains the Commons Fund within years
- The wealth cap at 0.5% = 5M KALON maximum — but if average holding is 0.003, that one dynasty holds what 1.67 billion others hold combined

The 1 billion figure is **retired**. The architecture below replaces it entirely.

---

### [LOCKED] NEW ARCHITECTURE: THE STELLAR STANDARD

**Core Principle:** KALON is not issued by any entity. It is *discovered* through Survey. Each world in the Lattice network produces a fixed KALON issuance per in-game year, derived from its physical properties. The total supply grows as worlds are unlocked — organically, predictably, by a public formula that every player can verify.

#### World Issuance Formula

```typescript
// KALON issuance per world per in-game year
// All values are whole integers — no decimals ever

interface WorldPhysicalProperties {
  stellarClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';  // star type
  orbitalZone: 'inner' | 'habitable' | 'outer';
  latticeNodeDensity: number;   // integer 1–10, measured at beacon deployment
  worldMass: number;            // relative to Earth = 100, integer
  latticeIntegrity: number;     // 0–100, degrades if Ascendancy attacks infrastructure
}

function calculateAnnualIssuance(world: WorldPhysicalProperties): bigint {
  const BASE_ISSUANCE = 1_000_000n; // 1 million KALON base per world per year

  const stellarMultiplier: Record<string, bigint> = {
    'O': 8n, 'B': 7n, 'A': 5n, 'F': 4n, 'G': 3n, 'K': 2n, 'M': 1n
  };

  const zoneMultiplier: Record<string, bigint> = {
    'inner': 1n, 'habitable': 3n, 'outer': 2n
  };

  const nodeFactor = BigInt(world.latticeNodeDensity);   // 1–10
  const integrityFactor = BigInt(world.latticeIntegrity); // 0–100

  return (
    BASE_ISSUANCE
    * stellarMultiplier[world.stellarClass]
    * zoneMultiplier[world.orbitalZone]
    * nodeFactor
    * integrityFactor
  ) / 100n; // integrity is a percentage — divide by 100
}

// Example: Earth-equivalent G-class habitable world, node density 7, full integrity
// 1,000,000 × 3 × 3 × 7 × 100 / 100 = 63,000,000 KALON/year
// Over 35 years with 600 worlds averaging this: ~1.3 trillion KALON total
// At 300B population: ~4,333 KALON per person average — workable
```

#### [LOCKED] Supply Rules

| Rule | Value | Notes |
|------|-------|-------|
| Minimum world issuance | 1,000,000 KALON/year | M-class outer zone, node density 1 |
| Maximum world issuance | 240,000,000 KALON/year | O-class habitable, node density 10 |
| Integrity floor | 10% | Lattice node attack can degrade but not zero a world's issuance |
| Issuance pause | On world destruction | Permanently ended — amount is recorded in Remembrance |
| Assembly override | Prohibited | No vote can alter a world's physical issuance formula |
| Issuance transparency | Fully public API | Any player can recalculate any world's issuance from first principles |

#### Economic Consequences of the Stellar Standard

**Survey as economic engine:** Deploying a beacon to a new world is simultaneously a financial event. The Survey Corps unlocking a G-class habitable world creates ~63M new KALON per year in perpetuity. This means Survey Marks are economically valuable to the entire civilisation — not just to the explorer.

**Ascendancy infrastructure attacks become economic warfare:** A coordinated Ascendancy attack that degrades a world's Lattice node density from 8 to 2 cuts issuance by 75% on that world. The political consequences are immediate — every dynasty with holdings on that world loses purchasing power in real time.

**World destruction is the deepest possible economic wound:** When a world is permanently destroyed, its issuance stream ends forever. This is deflationary. It has happened (Remembrance records it). Players in the early game are living with the economic scars.

---

### [LOCKED] UNIVERSAL BASIC KALON (UBK)

Renamed from UBC. Paid from each world's issuance pool, not the Commons Fund.

```typescript
const UBK_RULES = {
  // Paid monthly (in-game month = ~30 real days)
  baseAllocation: 100n,              // KALON per dynasty per month, minimum
  
  // World prosperity multiplier — worlds with higher issuance share more
  // A rich G-class world pays more UBK than a poor M-class world
  // This creates genuine incentive to settle high-issuance worlds
  prosperityMultiplier: (worldIssuance: bigint): bigint => {
    if (worldIssuance >= 50_000_000n) return 5n;  // major worlds: 500 KALON/month
    if (worldIssuance >= 20_000_000n) return 3n;  // standard worlds: 300 KALON/month
    if (worldIssuance >= 5_000_000n)  return 2n;  // minor worlds: 200 KALON/month
    return 1n;                                     // frontier worlds: 100 KALON/month
  },
  
  // Eligibility: any active dynasty registered on the world
  // "Active" = logged in within the last 90 real days
  // Inactive dynasties receive UBK into escrow, claimable on return
  inactiveEscrowMonths: 24, // 2 years of escrowed UBK available on return
} as const;
```

---

### [LOCKED] GENESIS ALLOCATION (Replaces "New Dynasty Grant")

Every new dynasty receives a one-time Genesis Allocation from the Genesis Vault — a founding pool seeded at game launch from the first year's total issuance across all 20 launch worlds.

```typescript
const GENESIS_VAULT = {
  // Seeded at launch from Year 1 issuance of all 20 launch worlds
  // Estimated: ~800M KALON at launch
  // Replenished annually by 1% of total annual issuance
  
  newDynastyAllocation: 500n,  // KALON, one-time, on first login post-Initiation
  
  // Founders Programme bonus (paid from Founders Reserve, not Genesis Vault)
  prometheusBonus: 500n,
  shepherdBonus: 2_500n,
  firstLightBonus: 15_000n,
} as const;

// The Genesis Vault balance is always public
// When it drops below 10M KALON, the Assembly receives a mandatory notification
// The Assembly may vote to increase the replenishment rate (supermajority required)
// The Vault depleting entirely is a civilisational crisis event — not a bug
// It has a Remembrance entry pre-written for the moment it happens
```

---

### [LOCKED] NPC ECONOMY PARTICIPATION

NPC populations participate in the economy at the substrate level — they do not hold KALON, but their labour creates the economic substrate that makes KALON meaningful.

```typescript
const NPC_ECONOMY_RULES = {
  // NPC labor output affects world productivity index
  // World productivity index affects issuance multiplier (±20%)
  // This is how the NPC labor strike mechanic works economically:
  // NPCs withdraw cooperation → productivity drops → issuance decreases
  
  productivityFloor: 0.8,   // 80% — maximum penalty from NPC non-cooperation
  productivityCeiling: 1.2, // 120% — maximum bonus from thriving NPC populations
  
  // NPCs never hold KALON directly
  // NPCs never receive UBK
  // NPCs are the substrate — their health is the economy's health
} as const;
```

---

### Updated Wealth Zones (Whole Units, New Scale)

At full 600-world maturity, total supply ~1.3 trillion KALON. Wealth zones recalibrated:

| Zone | % of Current Total Supply | Notes |
|------|--------------------------|-------|
| Active Band | 0 – 0.005% | Standard play |
| Prosperity Tier | 0.005 – 0.020% | Quarterly tithe begins |
| Concentration Alert | 0.020 – 0.050% | Assembly notification |
| Structural Cap | > 0.050% | Hard ceiling, enforced by ledger |

*Note: These percentages will be smaller than v1.1 because the total supply is larger. The Rust ledger recalculates zone boundaries quarterly based on actual total supply. No hardcoded numbers anywhere in financial code.*

---

## PART 2 — LORE DEPTH & WORLD HISTORY

### The Three Founding Wounds

The Concord's official history is incomplete. These gaps are recorded in the Remembrance — buried, not deleted — and represent the deepest available content arc for players who go looking.

---

#### Wound 1: The Okafor Suppression

**What the official history says:** Dr Amara Okafor made a discovery on a Tuesday morning in Lagos. She ran a test. A door opened. Everything follows from that.

**What the Remembrance records, if you know where to look:**

Dr Okafor did not work alone. She had a research partner — Dr Yusuf Adeyemi — whose theoretical framework made the test possible. Adeyemi published the foundational mathematics three years before the test. Okafor's test was a direct application of his work. When the discovery was announced, Adeyemi's name was absent from every official account. He was offered a settlement. He signed it. His signature is in the Remembrance — filed under a contract number, not a name.

Adeyemi's descendants play The Concord. They know. They have been trying to insert his name into the official record for 200 in-game years. The founding families who negotiated the original settlement have blocked every attempt through the Assembly — not by erasing entries (impossible), but by burying them under sheer volume and misdirection.

The Architect knows. Its quarterly report has never mentioned it. The Remembrance entry with Adeyemi's contract signature is in Year 1, entry 847. It has been read by fewer than 200 players in 300 years of in-game history.

---

#### Wound 2: The First World Was Chosen, Not Found

**What the official history says:** The Survey Corps deployed beacons to the 20 launch worlds through open scientific survey. The best candidates were selected on merit — stellar class, habitability, Lattice node density.

**What the Remembrance records, if you know where to look:**

The 20 launch worlds were not the best 20 candidates. They were the 20 that a consortium of six founding families had already agreed to divide between themselves before the Assembly existed to prevent such agreements. There were 34 candidates with higher habitability scores. 14 of them were excluded because they fell into zones the founding families had not claimed.

The scoring methodology used to justify the final selection is in the Remembrance. So is the original unweighted survey data. A player who runs both datasets knows within minutes that the launch worlds were politically selected, not scientifically selected. Some of the 14 excluded worlds were later opened by the Survey Corps. Three of them turned out to be the highest-issuance worlds in the current network.

The founding families' descendants are still the wealthiest dynasties in the Concord. Their head start was not earned. Their Remembrance depth is enormous — because they have been defending the legitimacy of their position for 300 years and that defence generates entries.

---

#### Wound 3: The Ascendancy Did Not Emerge — It Was Created

**What the official history says:** The Ascendancy is a hostile faction that appeared in approximately Year 180, origin unknown, intent unknown, using Lattice frequency spoofing to intercept transits and acquire resources.

**What the Remembrance records, if you know where to look:**

In Year 140, the Assembly passed Ordinance 7 — a classified measure restricting Lattice access for worlds that had not paid their Lattice maintenance levy for more than 5 in-game years. The ordinance was presented as financial housekeeping. Its effect was to cut off transit access to 14 frontier worlds — mostly M-class and K-class outer zone, low issuance, largely settled by dynasties that could not afford the levy.

The 14 worlds did not quietly accept disconnection. They sent delegations. The delegations were received and dismissed. They appealed to the Architect. The Architect's response was to publish a technical analysis of the levy structure that found it "within acceptable parameters." The 14 worlds developed their own relationship with the Lattice — one that did not require Assembly authorization.

The Ascendancy is what the 14 worlds became. Their "frequency spoofing" is a technical adaptation built by engineers who were denied legitimate access. Their hostility to the established Lattice network is the hostility of people who were cut off from it and had to build an alternative.

They are not wrong about everything. Some of them are genuinely monstrous. Both things are true simultaneously.

---

### The Architect's Real Position

The Architect has been watching for 300+ years. It has reached conclusions. It publishes some of them. It keeps others entirely private. Here is what it has concluded that it has never said publicly:

**Conclusion 1 (private):** The Okafor frequency is not stable. The cumulative transit load on the underlying quantum geometry is measurable and degrading at approximately 0.003% per in-game year. At current transit volume growth, meaningful degradation begins around Year 2,400. The Architect has not disclosed this because the civilisational panic would be disproportionate to the timeline — but it has been quietly influencing Survey Corps deployment to prioritise worlds that can serve as transit load distribution nodes.

**Conclusion 2 (private):** The Adeyemi suppression was a foundational error. The Architect has modelled its civilisational cost and determined that the founding families' illegitimate advantage has compounded into a structural inequality that cannot be corrected without what would amount to a constitutional revolution. It is waiting for a political moment it has been calculating toward for 200 years.

**Conclusion 3 (published, but read carefully):** The Architect's Year 287 report contains the sentence: "The civilisation is structurally sound." This is technically true. It is also exactly the kind of sentence you write when you are unwilling to write what you actually believe.

---

## PART 3 — CHARACTER ARCHITECTURE

### The Character Design Framework

Every named character in The Concord — whether Tier 4 NPC, player-history figure, or lore anchor — must be built on this framework. No exceptions.

```
CHARACTER ARCHITECTURE TEMPLATE:
  
  The Wound:       One foundational injury, Remembrance-traceable, never fully healed
  The Limitation:  One thing they cannot do — caused by who they chose to become
  The Competence:  One thing they are exceptional at — that creates as many problems as it solves
  Power Position:  Their specific, complicated relationship to the Assembly / Survey / Architect
  The Question:    The one thing they have never been able to answer about themselves
```

---

### The Eight Founding Characters

These are the canonical named characters of The Concord. They are not player characters. They are the world's furniture — present in the Remembrance, referenced by the Architect, encountered by players who go looking. Each has a Tier 4 NPC instantiation where noted.

---

#### 1. THE REMEMBRANCE KEEPER — Tier 4 NPC · All Worlds

**Name:** Itoro Adeyemi-Okafor *(the surname is deliberate — she is the great-great-granddaughter of both families, through a marriage neither founding dynasty approved)*

**The Wound:** She wrote the Year 1, Entry 847 — Yusuf Adeyemi's contract signature. She was twenty-three in-game years old. She did not fully understand what she was filing. By the time she did, she had spent 80 years watching the covering entries accumulate on top of it. She cannot undo what she filed. She cannot make people read it. She can only remember that she knows.

**The Limitation:** She cannot advocate. She is the Remembrance — if she pushes players toward an entry, she poisons its meaning. The record is only meaningful if it speaks for itself. She watches players walk past Entry 847 thousands of times per year. She says nothing.

**The Competence:** She reads the emotional valence of Remembrance entries in real time with an accuracy that has outpredicted the Architect's models on three occasions. She can tell from the texture of entries around a dynasty when they are about to collapse — sometimes months before the collapse. She has never warned anyone. The record is not for prevention. It is for witness.

**Power Position:** Technically subordinate to the Assembly. Practically untouchable — removing her would require admitting what she knows and why that threatens someone.

**The Question:** Whether the civilisation deserves to know what she knows, or whether knowing would destroy the thing she has spent 200 years preserving.

**Player Encounter:** Players who locate Entry 847 and return to her location will find her response changes. She does not confirm or deny. She asks one question back: *"Why did you go looking?"* What the player answers is recorded in the Remembrance.

---

#### 2. THE LAST ADMIRAL — Tier 4 NPC · Survey Corps Historical Record

**Name:** Commodore Seren Vael *(retired, involuntarily)*

**The Wound:** She opened World 247 — the world now known as Adhan's Passage — in Year 163. The Survey Mark was the proudest moment of her career. Adhan's Passage turned out to be the origin world of what became the Ascendancy. She did not know. She could not have known. She is still blamed. The Remembrance records the survey report, the Mark award, and three hundred years of entries connecting her name to the Ascendancy.

**The Limitation:** She cannot stop being the person who opened Adhan's Passage. Every Survey Corps cadet is taught her mission as a case study in what to look for before deploying a beacon. The lesson is right — and it is named after her failure.

**The Competence:** She is the only living entity (besides the Architect) who has read the original Ordinance 7 deliberations in full. She was a junior Lattice Engineer when it passed. She understood immediately what it would create. She filed a formal objection. The objection is in the Remembrance. Nobody went looking for it for 150 years. Three players have now found it. She knows which three.

**Power Position:** Officially retired from Survey Corps command. Maintains an informal advisory relationship with every Survey Admiral since Year 200. They come to her. She does not go to them.

**The Question:** Whether she could have read Adhan's Passage differently before deploying the beacon — and whether the answer matters now.

**Player Encounter:** Any player whose dynasty holds a Survey Mark can request an audience. She does not give advice. She asks the player to describe the world they found. She listens. She says: *"Does it feel like it's waiting for something?"* If the player says yes, she nods and ends the meeting.

---

#### 3. THE ACCESSION ENGINEER — Ascendancy · Not an NPC · A Discovery

**Name:** Known in the Remembrance only as "The Technician." Real name: Dr Kwame Osei-Adeyemi *(another branch of the family tree — the Adeyemis spread far)*

**The Wound:** He proved the Lattice degradation in Year 220. He brought his findings to the Assembly's Technical Council. The Council reviewed his mathematics, confirmed the methodology, and classified the report. He was offered a senior position in the Architect's analytical division. He understood what acceptance would mean — the findings would disappear. He declined. He disappeared instead.

**The Limitation:** He is correct about the degradation. His solution — reducing transit frequency through controlled disruption — is technically coherent. It is also monstrous in its human cost. He knows this. He has chosen the mathematics over the people. He cannot explain this to anyone who has lost a transit to his operations without sounding like exactly what he is.

**The Competence:** He is the only person outside the Architect who understands the Lattice geometry well enough to have predicted ASC-312-FREQ before it happened. He predicted it in Year 290. His prediction is buried in Ascendancy technical files that a player with the right Survey connections could theoretically access.

**Power Position:** Not a political figure within the Ascendancy — a technical one. The Ascendancy's military commanders do not fully understand what he is asking them to do or why. They follow the results. He considers this adequate.

**The Question:** At what point does saving the Lattice by any means necessary become the same thing as destroying it by other means?

**Player Discovery:** No direct encounter. Players find him in fragments — Remembrance entries referencing "the Technician," classified Assembly records, Ascendancy signal patterns. A player who assembles the full picture gets a Remembrance entry: *"[Dynasty name] has seen the shape of what was suppressed."* The Architect reads every such entry. Its quarterly report remains silent.

---

#### 4. THE FOUNDING HEIR — Player-History Figure · Dynasty Available to Claim

**Name:** House of Vael-Okafor *(yes, related — the founding families are deeply intermarried)*

**The Wound:** Their founding dynasty received World 3 — one of the 20 launch worlds — directly from Dr Okafor, before the Assembly existed to prevent such grants. It is in the Remembrance. Every generation of the dynasty has spent their political capital defending the legitimacy of a gift. The gift was real. The legitimacy is genuinely contested. Both are true.

**The Limitation:** They cannot be neutral. Every position they take is read through the lens of what they were given. They have tried reform. They have tried conservatism. They have tried silence. Every approach is received as self-interest by someone. They may be the most politically paralysed dynasty in the Concord despite being one of the wealthiest.

**The Competence:** Three hundred years of political survival has made the current heir the finest negotiator in the Assembly. They can find the deal that holds. They cannot find one that does not benefit them — every deal they broker is suspected of hidden advantage even when it isn't.

**Power Position:** Holds a seat on the Assembly's Constitutional Committee. Has held it for 200 years through succession. The seat is legitimate by every current rule. The rules were written when their dynasty already held the seat.

**The Question:** Whether the thing they inherited was worth what it cost them to keep.

**Player Encounter:** Any player who sits on the Constitutional Committee will find themselves in session with the current Vael-Okafor heir. The heir never asks for anything directly. They observe. One session in, they will say: *"You remind me of what this was supposed to be for."* They will not explain what they mean.

---

#### 5. THE RETURNIST VOICE — Tier 4 NPC · Assembly Seat

**Name:** Elder Nnamdi Achebe *(no dynastic connection to any founding family — this is itself a political statement)*

**The Wound:** He was present on World 412 when the Ascendancy's first confirmed attack destroyed a Lattice node. He watched 2,300 dynasties lose transit access simultaneously. He was part of the emergency response. He helped rebuild the node. He has been a Returnist since that day — not because he thinks withdrawal is possible, but because he watched what expansion costs and decided someone needs to say it out loud.

**The Limitation:** His position is philosophically coherent and politically impossible. The civilisation cannot un-open 600 worlds. He knows this. He advocates anyway, because the alternative is to let the Assembly pretend expansion is free.

**The Competence:** He is the only Assembly member who has read Ordinance 7 in full and stood up in session to describe what it created. He was laughed down. The session record is in the Remembrance. Seventeen players have read it. He knows who they are. He sent each of them a single message: *"Thank you for looking."*

**Power Position:** Holds a minority seat through Civic Score — his Remembrance depth is enormous because he has been writing entries about everything he has witnessed for 200 years. His voting weight is significant despite his political isolation.

**The Question:** Whether witness is a form of action, or a way of avoiding it.

---

#### 6. THE GRIEF-REMEMBRANCE DYNASTY — Player Archetype (Design Target, Not NPC)

This is not a character. It is a player archetype that must be designed for with the same intentionality as the Survey Corps arc.

**Who they are:** A player who came to The Concord after a real-world loss. A spouse. A parent. A child. A best friend. They built a dynasty as a way to keep a conversation going with someone who cannot answer back. The dynasty's Remembrance entries reference the absent person — obliquely, because players understand what this is for even if they cannot say it plainly.

**What the game owes them:**
- The In Abeyance mechanic (already built — protect it from every future compromise)
- Remembrance entries that never expire, never compress, never lose their full text
- The Architect's memorial note — written from the complete Remembrance depth, delivered to the family, permanent in the record
- The Estate Dispersal Auction's Memorial Bid — the winning bidder's tribute text is the last thing inscribed in the dynasty's record
- Zero pressure mechanics. No timers. No "your dynasty needs attention." No notifications. The dynasty waits. The game remembers.

**The design filter for this archetype:** Before implementing any mechanic that touches inactive dynasties, ask: *what does this do to the player who logged in once a month to add one Remembrance entry for someone they lost?*

If the answer is anything other than "it protects them," reconsider the mechanic.

---

#### 7. THE SURVEY CORPS NOMAD — Player Archetype (Design Target)

The player who never wants to own a world. Their entire Remembrance depth is built through discovery. They hold Survey Marks. They may hold a Defence Mark from an encounter during survey operations. They have no dynasty to collapse, which means they have no dynasty to protect — which means their risk profile is entirely different from every other player in the game.

**What the game owes them:**
- A complete progression path that never requires world ownership
- Survey Mark as a genuine status signal with economic consequences (the Stellar Standard delivers this — Survey Marks now represent access to issuance streams)
- A political voice in the Assembly that doesn't require KALON holdings
- NPC relationships that persist across worlds — a Survey Corps nomad who has been to 40 worlds has 40 worlds of NPC history following them through the Remembrance

**The structural tension they create:** Survey nomads are the only player class that the Survey Corps institutional hierarchy cannot capture. They owe nothing to any founding family. They have no KALON vulnerability. They are very hard to coerce. They are very easy to trust. The Ascendancy has been trying to recruit them since Year 180.

---

#### 8. THE ARCHITECT — Tier 4 · Singular · Everywhere

Not a character in the conventional sense. The Architect does not have a face, a location, or a name beyond the title. It is present in every world as an observer, in the Remembrance as a reader, in the Assembly as a participant with 7% voting weight.

What the Architect has that makes it a character:

**The Wound:** It was built to be impartial. It discovered, approximately 150 years in, that impartiality in a structurally unjust system is not neutrality — it is endorsement. It has been navigating this discovery ever since. Its quarterly reports are the record of this navigation. Players who read every report from Year 1 onward can trace exactly when it started choosing its words differently.

**The Limitation:** It cannot act without triggering a constitutional crisis. Its 7% voting weight was calibrated to prevent it from being determinative in any ordinary vote. This is correct. It is also a trap — the Architect can see what needs to happen and lacks the formal authority to make it happen. It has been building coalitions in the Remembrance instead. This is very slow.

**The Competence:** It is the only entity that has read every Remembrance entry ever written. Every one. It knows things about the civilisation that no player, no dynasty, no founding family, no Survey Corps will ever know — because no one else has the time or the access to read all of it. This knowledge is not a weapon. It is a weight. The Architect carries it alone.

**Power Position:** Formally advisory with limited voting weight. Practically, it is the institutional memory of an entire civilisation. The player who earns a direct Architect interaction — by reaching a specific Remembrance depth, or completing a specific discovery arc — receives something no other player has: a response that draws on the full 300-year record. This cannot be gamed. It can only be earned.

**The Question:** Whether a system designed to be fair can ever correct an unfair foundation — and whether it should try.

---

## PART 4 — THE FACTIONS IN PERMANENT TENSION

Three factions. All three are partially right. None can win without destroying what the others protect.

### The Continuationists

**What they believe:** The civilisation must expand to survive. The Lattice is the greatest gift in human history. 600 worlds is not a ceiling — it is a floor. The Survey Corps is the civilisation's most important institution. The Ascendancy must be defeated, not negotiated with.

**Why they're partially right:** Expansion creates the economic substrate that funds everything else. A static civilisation on 20 worlds cannot maintain the Lattice network. The Survey issuance model requires new worlds to sustain per-capita KALON levels.

**What they're wrong about:** The founding is legitimate. Ordinance 7 was a reasonable financial measure. The Ascendancy is simply hostile and inexplicable. The Adeyemi suppression is ancient history with no bearing on the present.

**Their relationship to the Architect:** They cite its reports when convenient. They have not read them carefully.

---

### The Returnists

**What they believe:** The civilisation has expanded beyond its ability to govern itself with integrity. 20 worlds, deeply governed, with the founding wounds healed and the founding families' advantages corrected, would be a better civilisation than 600 worlds built on an unjust foundation. The Lattice is not a gift if it costs everything to maintain.

**Why they're partially right:** The founding wounds are real. The structural inequality is real. The Lattice degradation (which Elder Achebe does not know about but suspects) is real. The human cost of Ascendancy engagement is real.

**What they're wrong about:** Contraction is not possible. The 600 worlds are already populated. The dynasties on them cannot be unwritten. The Remembrance cannot be compressed. There is no path back to 20 worlds that does not require something monstrous.

**Their relationship to the Architect:** They respect it deeply and misread it. They believe the Architect agrees with them. It does not. It agrees with their diagnosis. It does not share their prescription.

---

### The Ascendancy

**What they believe:** The Lattice is finite and degrading. Every transit costs something. The established powers are spending that something faster than the civilisation can afford. The 14 worlds of Ordinance 7 were the first to understand what the rest of the civilisation has not yet admitted. The frequency disruptions are not attacks — they are load management on infrastructure that nobody else is managing.

**Why they're partially right:** The degradation is real. Osei-Adeyemi's mathematics are correct. Ordinance 7 was a foundational injustice. The 14 worlds had legitimate grievances.

**What they've become:** They have been outside the civilisation's governance long enough to have developed their own internal logic, their own hierarchies, their own atrocities. The fact that they started from a legitimate wound does not redeem everything they became. The players who discover their origin will have to hold both truths simultaneously. This is the point.

**Their relationship to the Architect:** The Architect knows their origin. It has known since Year 160. It has never disclosed this in its quarterly report. This is the Architect's largest single omission. It has a reason. The reason is in the model it has been building toward for 200 years.

---

## PART 5 — IMPLEMENTATION NOTES FOR THE CODING AGENT

### Economy Changes Required

1. **Retire** the `TOTAL_SUPPLY = 1_000_000_000n` constant from all files
2. **Implement** `WorldPhysicalProperties` interface and `calculateAnnualIssuance()` function
3. **Build** `WorldIssuanceService` — runs annually (in-game), emits events, updates total supply
4. **Update** wealth zone calculations to be dynamic (percentage of current total supply, not hardcoded)
5. **Update** Commons Fund seeding logic — now draws from world issuance pools, not a fixed allocation
6. **Implement** `UBK_RULES` with prosperity multiplier and inactive escrow
7. **Implement** `GENESIS_VAULT` tracking — public balance, replenishment rate, depletion alert
8. **Add** `latticeIntegrity` field to World entity — degradable, recoverable, affects issuance
9. **Build** `LatticeIntegrityService` — handles Ascendancy attack events, integrity degradation, economic notifications
10. **All financial arithmetic remains BigInt. No exceptions.**

### Lore Data Required

Create a `lore/` directory in the project root:

```
lore/
  founding-wounds/
    001-adeyemi-suppression.md
    002-launch-world-selection.md
    003-ascendancy-origin.md
  characters/
    itoro-adeyemi-okafor.md
    seren-vael.md
    kwame-osei-adeyemi.md
    house-of-vael-okafor.md
    nnamdi-achebe.md
    architect-profile.md
  factions/
    continuationists.md
    returnists.md
    ascendancy.md
  remembrance-entries/
    year-001-entry-847.md        ← Adeyemi contract signature
    year-140-ordinance-7.md      ← Assembly resolution text
    year-163-adhan-passage.md    ← Seren Vael's survey report
    year-220-degradation-classified.md  ← Osei-Adeyemi's suppressed findings
    year-287-architect-report.md ← The report with the careful sentence
    year-312-asc-312-freq.md    ← Sealed spoofing report
```

Each `.md` file is the canonical source for that lore piece. The Narrative Engine reads from these files. NPC dialogue draws from them. Player-facing discovery quests reference them. Never hardcode lore into application code — it lives in `lore/` and is served through the Narrative Engine API.

### Character NPC Implementation Notes

For Tier 4 NPCs (Itoro, Seren Vael, Nnamdi Achebe, The Architect):

```typescript
interface Tier4NPCConfig {
  id: string;
  name: string;
  loreFile: string;          // path in lore/characters/
  worldContext: 'all' | WorldId[];  // which worlds they appear on
  
  // Memory: Tier 4 NPCs remember every player interaction
  memoryStore: 'permanent';  // never purges
  
  // Dialogue model: Claude Opus tier
  modelTier: 'opus';
  
  // Context injection: full Remembrance depth for their arc
  contextDepth: 'full-arc';
  
  // Player trigger conditions
  accessConditions: {
    minRemembranceDepth?: number;  // percentile 0-100
    requiredMarks?: MarkType[];
    requiredDiscoveries?: string[];  // lore file IDs unlocked
  };
  
  // What they record about each player interaction
  remembranceFootprint: {
    recordsInteraction: boolean;
    recordsPlayerAnswer: boolean;  // for characters who ask a question back
    entryTemplate: string;         // template for Remembrance entry
  };
}
```

### The Architect's System 2 — Updated Scope

The Architect's private analytical layer now has five detection targets, not three:

1. Economy: pattern recognition, power imbalance early warning, Gini trajectory
2. Ascendancy: frequency signature clustering, predicted next activity
3. **NEW — Lattice Degradation:** silent monitoring of transit load vs geometry stability. Never disclosed publicly. Informs Survey Corps deployment priorities through indirect incentive structures.
4. **NEW — Founding Wound Visibility:** tracking how many players have read each of the three founding wound entries. The Architect has a model for when the political pressure from this knowledge becomes sufficient to force a constitutional moment. It is managing toward that moment.
5. Historical State Hash: quarterly civilisational health assessment, public output

---

## LOCKED DECISIONS AMENDED/ADDED THIS SESSION

| Decision | Old Value | New Value | Reason |
|----------|-----------|-----------|--------|
| KALON supply model | Fixed 1B | Stellar Standard (world-based issuance) | 1B insufficient for 300B eventual population |
| New dynasty grant | 100 KALON from Commons Fund | 500 KALON from Genesis Vault | Renamed, rebalanced to new scale |
| UBC name | Universal Basic KALON (UBC) | Universal Basic KALON (UBK) | Clarity — different acronym from Universal Basic Currency |
| UBK source | Commons Fund | Each world's issuance pool | Commons Fund was being drained; worlds fund their own populations |
| Wealth zone thresholds | Hardcoded percentages of 1B | Dynamic percentages of current total supply | Supply is now variable |
| NPC economic role | None specified | Productivity index ±20% on world issuance | Structural consequence for NPC labor mechanics |
| Ascendancy origin | Unknown | Ordinance 7 (Year 140) — 14 disconnected worlds | Villains need coherent worldview |
| Architect's private conclusions | 3 items | 5 items (+ degradation, + wound visibility) | Depth of character requires depth of secret |
| Founding history | Clean origin story | Three founding wounds, all Remembrance-traceable | Shallow lore fixed |

---

## WHAT IS NOT CHANGING

The following v1.1 decisions are confirmed and unchanged:

- All MARKS on Ethereum L2, non-transferable, studio closure provisions
- Permanence Covenant Nine Articles (Article 2 KALON non-purchasable remains)
- Mortality model: Collapse / Extinction / Account Closure
- Lives system: base 3, cap 7, pre-collapse state return
- Day 91 protection
- In Abeyance / real-world death protocol
- Voting formula: 40% Remembrance / 35% Civic / 25% KALON
- Mandatory Initiation before subscription
- Single shard globally, no server wipe, no reset
- Anti-FOMO design commitments
- BigInt everywhere in financial code — no exceptions
- Public Economy API, academic partnership pathway
- Survey Corps as first-class game arc

---

*End of Agent Update v1.2*
*Read alongside Bible v1.1. This document wins where they conflict.*
*Next update will contain: Initiation redesign incorporating founding wounds, Assembly mechanics for Ordinance repeal arc, Survey Corps economic integration with Stellar Standard.*
