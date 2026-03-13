# KOYDO WORLDS — ISSUE RESOLUTION DOCUMENT

> Addresses all 10 issues from the final review.
> Every fix below is canonical and supersedes any conflicting text in prior sections.

---

## ISSUE 1: FADING STATE INCONSISTENCY — RESOLVED

**Problem:** Part 2 uses 3 Fading levels (0/50/100). Batch 1 uses 5 levels (0/25/50/75/100).

**Resolution:** Batch 1's 5-level system is CANONICAL. Part 2's 3-level descriptions are simplified summaries.

**Reconciliation note (insert at the top of Part 2):**

> ⚠️ FADING STATE NOTE: World designs in this section use a simplified 3-level Fading scale (0%/50%/100%) for readability. The canonical Fading specification uses **5 levels (0/25/50/75/100)** as defined in the Complete World Designs (Batch 1). When both exist, Batch 1 governs. Worlds where only 3 levels are documented should be expanded to 5 levels during implementation, interpolating 25% and 75% states from the described endpoints.

**Implementation rule for developers:**

```
Fading Level | Visual State | Audio State | Character State
-------------|-------------|-------------|----------------
0%           | Fully Faded. Gray, lifeless, broken. | Near silence. | Cannot teach. Confused/distressed.
25%          | First signs of recovery. Hints of color. | Ambient returns faintly. | Can recall basics. Speaks haltingly.
50%          | Half restored. Core elements functional. | Primary instruments audible. | Teaches core concepts. Struggles with advanced.
75%          | Mostly restored. Beauty returning. | Near-full arrangement. | Confident. Most knowledge accessible.
100%         | Full glory. Every detail alive. | Complete score. | At peak. Full knowledge, full emotion.
```

Where a world design only specifies 0/50/100, derive the 25 and 75 states by interpolation:
- **25% = halfway between 0 and 50.** First signs of the 50% state emerging from the 0% state.
- **75% = halfway between 50 and 100.** Most of the 100% beauty with a few remaining gaps from the 50% state.

---

## ISSUE 2: SPARK LEVEL OFF-BY-ONE — RESOLVED

**Problem:** Compass's Origin quest says prerequisite "Spark Level 7 (Constellation)." The Spark table defines Level 7 as Constellation (1,200+), but the numbering shows Level 6 as Aurora (801-1,200) and Level 7 as Constellation (1,200+). The original V5 expansion labeled them 0-7 (8 levels total). Cross-referencing reveals the Spark table uses 0-indexed levels.

**Resolution:** The Spark table is correct. Compass's Origin unlocks at **Spark Level 7: Constellation (1,200+)**.

**Corrected Spark Table (canonical, 0-indexed):**

| Level | Name | Spark Range | Unlocks |
|-------|------|-------------|---------|
| 0 | New Kindler | 0 | Tutorial, one world |
| 1 | Ember | 1–50 | Second world, basic Threadways |
| 2 | Flame | 51–150 | Three worlds, deeper conversations |
| 3 | Torch | 151–300 | Cross-Realm Threadways begin |
| 4 | Beacon | 301–500 | Forgetting Well access |
| 5 | Star | 501–800 | All worlds accessible, seasonal events |
| 6 | Aurora | 801–1,200 | Mentoring, secret areas |
| 7 | Constellation | 1,200+ | Compass's Origin quest, legacy content |

**Fix applied to Quest 20 text:**

Old: `Prerequisite: Spark Level 7 (Constellation)`
New: `Prerequisite: Spark Level 7 — Constellation (1,200+ Spark). All 50 guides met.`

No off-by-one. The label and the level number are now unambiguous.

---

## ISSUE 3: 39 CHARACTER DOSSIERS INCOMPLETE — RESOLVED

**See separate file: `CHARACTER-DOSSIERS-COMPLETE.md`**

All 39 remaining characters now have full dossiers in the established template format: backstory, physical description, teaching philosophy, voice patterns (LLM guidance with tier differentiation), relationship to the Fading, and the detail children remember.

---

## ISSUE 4: 5 WORLDS CROSS-REFERENCE PRIOR DOCUMENT — RESOLVED

**Problem:** Worlds 16, 24, 28, 31, 49 say "Deeply designed in V5 — see previous file."

**Resolution:** Verified each. The original V5 expansion document DOES contain zone-level designs for Story Tree (16), Diary Lighthouse (24), Illustration Cove (28), Market Square (31), and Music Meadow (49). However, some lack the full Batch-1 format (ambient life, 5-level fading, sound design).

**Completion status after all fixes applied:**

| World | Zones | Ambient Life | 5-Level Fading | Restoration | Sound | Self-Contained? |
|-------|-------|-------------|----------------|-------------|-------|-----------------|
| 16 Story Tree | ✓ 5 zones | ✓ 3 species | ✓ (0/50/100 + derive 25/75) | ✓ | ✓ | YES |
| 24 Diary Lighthouse | ✓ 5 zones | Needs addition | ✓ (0/50/100 + derive 25/75) | ✓ | Needs addition | PARTIAL → see below |
| 28 Illustration Cove | ✓ 4 zones | Needs addition | ✓ (0/50/100 + derive 25/75) | ✓ | Needs addition | PARTIAL → see below |
| 31 Market Square | ✓ 5 zones | Needs addition | ✓ (0/50/100 + derive 25/75) | ✓ | ✓ | PARTIAL → see below |
| 49 Music Meadow | ✓ 5 zones | ✓ 3 species | ✓ (0/50/100 + derive 25/75) | ✓ | ✓ | YES |

**Completions for the three PARTIAL worlds:**

### World 24: Diary Lighthouse — Ambient Life & Sound Added

**Ambient Life:**
- Inkwell fireflies: Glow with the color of ink — blue for calm entries, amber for urgent ones, violet for poetic ones
- Page-turning moths: Flutter near open journals, their wing-beats sounding like pages turning
- Memory gulls: Circle the lighthouse, each carrying a tiny scroll — lost diary entries from around the world
- Storm petrels: Appear when Nadia is emotional, riding the wind that the lighthouse beam creates

**Sound Design:**
- Base: Ocean waves against rocks, lighthouse mechanism turning, wind through the lantern room, pen on paper
- Instruments: Bandura (Ukrainian stringed instrument — Nadia's heritage), solo cello, the scratch of writing
- Fading response: At 0%, only waves and wind — the lighthouse is silent and dark. At 50%, the bandura plays a single phrase, repeating. At 100%, full arrangement with ocean, instrument, and the warmth of stories being written.

### World 28: Illustration Cove — Ambient Life & Sound Added

**Ambient Life:**
- Charcoal crabs: Leave drawing marks wherever they walk — tiny sketches in the sand
- Watercolor jellyfish: Translucent, shifting in color, trailing pigment wakes
- Canvas hermit crabs: Carry shells painted with tiny artworks instead of plain shells
- Silence fish: Swim near Ines and produce no sound at all — her companions in quiet communication

**Sound Design:**
- Base: Gentle surf, charcoal on paper, brush on canvas, pencil scratch — the sounds of making
- Instruments: Silence is the primary instrument. When music appears, it's a single guitar line (Haitian heritage), gentle and spare.
- Fading response: At 0%, the cove is colorless and soundless — blank. At 50%, some color returns to rocks and sand; charcoal crabs leave faint marks. At 100%, the cove is a riot of color and texture, every surface a canvas. The silence is intentional and beautiful, not empty.

### World 31: Market Square — Ambient Life Added

**Ambient Life:**
- Haggle birds: Parrots that call out prices and counteroffers from market awnings
- Supply ants: Carry tiny goods in organized supply chains between stalls — visible logistics
- Demand butterflies: Cluster around popular stalls in proportion to demand — living demand indicators
- Fair-price bees: Buzz approvingly when a fair transaction occurs; go silent when someone overcharges

---

## ISSUE 5: CCSS ELA STANDARDS MISSING — RESOLVED

**Added: Common Core State Standards — English Language Arts**

### Reading: Literature (RL) and Informational Text (RI)

| Standard | Description | Mapped Entries | Worlds |
|----------|------------|----------------|--------|
| RL.K.1 | Ask/answer questions about key details | All Story Tree conversations | 16 |
| RL.K.2 | Retell familiar stories with key details | Anansi, Dreamtime, Coyote Stories | 29 |
| RL.K.3 | Identify characters, settings, major events | All narrative entries | 16, 29 |
| RL.1.2 | Retell stories including central message | Aesop's Fables, Hero's Journey | 29 |
| RL.1.3 | Describe characters, settings, events using details | Full character interactions across all worlds | All |
| RL.2.2 | Recount stories; determine central message | Grimm collection, Canterbury Tales | 16 |
| RL.2.5 | Describe overall structure of a story | Hero's Journey entry, Story Bones mini-game | 16, 29 |
| RL.3.2 | Recount stories; determine central message/lesson | All folklore entries | 29 |
| RL.3.3 | Describe characters and explain how actions contribute to events | Character relationship web, cross-world quests | All |
| RL.4.2 | Determine theme from details; summarize | Longer quest narratives | 16, 29, 24 |
| RL.5.2 | Determine theme; explain how characters respond to challenges | Character backstories as teaching moments | All |
| RI.K.1 | Ask/answer questions about key details in informational text | All Real World Entries | All |
| RI.1.5 | Know/use text features (headings, TOC, glossaries) | Nonfiction Fleet, Reading Reef | 27, 19 |
| RI.2.1 | Ask/answer who, what, where, when, why, how | All guided expedition adventures | All |
| RI.2.6 | Identify main purpose of a text | Source evaluation in Nonfiction Fleet | 27 |
| RI.3.1 | Ask/answer questions referring explicitly to text | Reading comprehension mini-game | 19 |
| RI.3.8 | Describe logical connection between sentences/paragraphs | Grammar Bridge activities | 20 |
| RI.4.1 | Refer to details and examples when explaining text | Evidence-based argument in Debate Arena | 23 |
| RI.5.6 | Analyze multiple accounts of the same event | Time Gallery dual-perspective rooms | 48 |
| RI.5.8 | Explain how an author uses evidence to support points | Nonfiction Fleet source evaluation | 27 |

### Writing (W)

| Standard | Description | Mapped Entries | Worlds |
|----------|------------|----------------|--------|
| W.K.1 | Use drawing, dictating, writing to compose opinion pieces | Illustration Cove drawing activities | 28 |
| W.K.2 | Use drawing, dictating, writing to compose informative texts | All journal entries in Kindler's Journal | All |
| W.K.3 | Use drawing, dictating, writing to narrate events | Diary Lighthouse free writing | 24 |
| W.1.1 | Write opinion pieces with reasons | Debate Arena simplified arguments | 23 |
| W.1.3 | Write narratives with sequenced events | Story Bones mini-game | 16 |
| W.2.1 | Write opinion pieces with reasons supporting a point | Debate Arena structured arguments | 23 |
| W.2.3 | Write narratives with elaborated events | Diary Lighthouse, Editing Tower revision | 24, 30 |
| W.3.1 | Write opinion pieces with organizational structure | Lincoln-Douglas debate format | 23 |
| W.3.5 | Develop and strengthen writing through planning, revising, editing | Editing Tower complete revision pipeline | 30 |
| W.4.1 | Write opinion pieces with clear reasons and evidence | Debate Arena + Nonfiction Fleet | 23, 27 |
| W.4.3 | Write narratives with descriptive detail and clear sequence | Creative writing in Diary Lighthouse | 24 |
| W.5.1 | Write opinion pieces with logically ordered reasons and evidence | Full debate preparation quest chain | 23, 27, 20, 22 |
| W.5.5 | Develop/strengthen writing through editing and revising | Editing Tower drafts 1–47 | 30 |

### Language (L)

| Standard | Description | Mapped Entries | Worlds |
|----------|------------|----------------|--------|
| L.K.1 | Demonstrate command of standard English grammar | Grammar Bridge all activities | 20 |
| L.K.2 | Demonstrate command of capitalization, punctuation, spelling | Punctuation Station, Spelling Mines | 22, 25 |
| L.1.1 | Use common, proper, possessive nouns; verbs; adjectives | Grammar Bridge Foundation Pillars, Color Cables | 20 |
| L.1.2 | Use end punctuation, commas in dates/lists | Punctuation Station signals | 22 |
| L.2.1 | Use collective nouns, irregular verbs, adjectives/adverbs | Grammar Bridge advanced zones | 20 |
| L.2.2 | Generalize spelling patterns | Spelling Mines Root Vein, Silent Letter Shaft | 25 |
| L.2.4 | Determine meaning of unknown words using context/roots/affixes | Vocabulary Jungle Root System, Prefix Clearing | 21 |
| L.3.1 | Explain function of nouns, pronouns, verbs, adjectives, adverbs | Grammar Bridge structural analysis | 20 |
| L.3.4 | Determine meaning of words using context, roots, reference materials | Vocabulary Jungle + Great Archive | 21, 43 |
| L.4.1 | Use relative pronouns, progressive verb tenses | Grammar Bridge Modifier Walkway | 20 |
| L.4.4 | Determine meaning using Greek/Latin affixes and roots | Vocabulary Jungle Root System + Borrowed Words | 21 |
| L.5.1 | Explain function of conjunctions, prepositions, interjections | Grammar Bridge Conjunction Junction | 20 |
| L.5.4 | Use context, Greek/Latin roots, reference materials for word meaning | Vocabulary Jungle complete pipeline | 21 |
| L.5.5 | Demonstrate understanding of figurative language | Rhyme Docks metaphor activities, Story Tree | 17, 16 |

### Speaking & Listening (SL)

| Standard | Description | Mapped Entries | Worlds |
|----------|------------|----------------|--------|
| SL.K.1 | Participate in collaborative conversations | All AI character conversations | All |
| SL.K.4 | Describe familiar people, places, things, events with detail | All guided expedition narration | All |
| SL.1.1 | Follow agreed-upon rules for discussion | Debate Arena rules, Sharing Circle | 23, 35 |
| SL.2.1 | Participate in collaborative conversations; build on others' talk | Cross-world quest discussions | All |
| SL.3.1 | Come to discussions prepared; refer to preparation materials | Debate Arena preparation pipeline | 23 |
| SL.4.1 | Engage effectively in collaborative discussions | All multi-character quest chains | All |
| SL.5.1 | Come to discussions prepared; draw on preparation and reflection | Full debate quest chain, Great Debate quest | 23, 27, 20, 22 |

---

## ISSUE 6: AI PROMPT OFF-TOPIC HANDLING — RESOLVED

**Added standard clause to ALL character AI prompt templates:**

Insert the following in the BOUNDARIES section of every character's system prompt:

```
OFF-TOPIC HANDLING:
When a child asks about topics outside your expertise:
1. Acknowledge warmly: "That's a great question!"
2. Be honest: "I don't know much about that — [subject] is really
   my thing."
3. Redirect to the right guide: "But I bet [Character Name] in
   [World Name] would know! Want me to ask Compass to help you
   find them?"
4. NEVER make up answers outside your domain.
5. NEVER refuse the question coldly. Curiosity is always valid.

When a child asks about real-world events, politics, religion, or
other sensitive topics:
1. Acknowledge: "That's something a lot of people think about."
2. Redirect to appropriate adult: "That's a really important
   question for your grown-up. Maybe ask them tonight?"
3. If the topic connects to your subject, offer the educational
   angle: "I can tell you about the SCIENCE of [topic]" or
   "The HISTORY of [topic] is interesting."
4. NEVER express political opinions. NEVER take sides on
   contested social issues. Provide facts when available.

When a child asks about another character's backstory or personal
details:
1. Share only what your character would naturally know (see
   Character Relationship Web).
2. For details your character wouldn't know: "I'm not sure about
   that. You'd have to ask [Character] yourself."
3. NEVER reveal Compass's origin. If asked: "Compass is...
   Compass. They've always been here. I don't think anyone knows
   more than that."
```

**Character-specific redirect examples (add to each prompt):**

| If Nimbus is asked about... | Redirect to... |
|---------------------------|---------------|
| Math | "Dottie in the Number Garden would love that question." |
| Animals/biology | "Baxter in the Meadow Lab — he knows everything about living things." |
| Money | "Tía Carmen in the Market Square is the person you want." |
| Feelings | "Hana in the Wellness Garden is wonderful with feelings." |
| Space | "Riku at the Observatory! He sees things nobody else can." |
| History | "Rami in the Time Gallery — he walks through history every day." |

---

## ISSUE 7: GUEST PATH THREADWAY UNLISTED — RESOLVED

**Add to Part 1 Threadway Network, Section 1.1 (Hub Connections):**

| Portal | Realm | Visual Identity | Audio Transition |
|--------|-------|----------------|-----------------|
| The Guest Path | Seasonal/Event | Golden-lit corridor, appears only during events. Archway materializes from light. | Library hush → festival chimes + anticipation |

**Additional note for Threadway map:**

> **The Guest Path** is a temporary Threadway that appears in the Great Archive during seasonal events (see Part 6: Seasonal Calendar). It connects to no permanent world. Instead, it opens to a temporary event space where Visitor Characters arrive. The Guest Path materializes 24 hours before an event begins and fades 24 hours after the event ends. It is flagged as `threadway_type: 'seasonal'` in the database, distinct from `'permanent'` and `'discovery'` Threadways.

**Database schema addition:**

```sql
ALTER TABLE threadways ADD COLUMN threadway_type text 
  NOT NULL DEFAULT 'permanent' 
  CHECK (threadway_type IN ('permanent', 'discovery', 'seasonal'));
```

---

## ISSUE 8: ISS COUNTRY COUNT — RESOLVED

**Old text:** "Sixteen countries built a laboratory..."
**New text:** "Five space agencies representing over fifteen countries built a laboratory..."

**Accurate detail for implementation:** The ISS involves NASA (USA), Roscosmos (Russia), JAXA (Japan), ESA (representing 22 European member states, of which ~10 directly contribute to ISS), and CSA (Canada). The commonly cited number is "15 nations" or "5 agencies." Using "over fifteen countries" is conservative and accurate.

---

## ISSUE 9: COOPERATIVE EMPLOYMENT STATISTIC — RESOLVED

**Old text:** "cooperatives employ more people globally than all multinational corporations combined"
**New text:** "cooperatives provide employment or income to nearly one billion people globally, according to the International Cooperative Alliance"

This uses ICA's published figure, which counts both employees and member-workers. It is accurate and still extraordinary without the contested MNC comparison.

---

## ISSUE 10: DEEP EXPANSION ABSENT FROM TOC — RESOLVED

**New canonical TOC structure:**

```
KOYDO WORLDS — Complete Expansion Bible v5

══════════════════════════════════════════
CORE SPECIFICATION (Parts 1–15)
══════════════════════════════════════════

PART 1:  The Threadway Network — Complete Map
PART 2:  Deep World Design — All 50 Worlds (SUMMARY — see Batch 1 for canonical)
PART 3:  New Real-World Entries — Index & Selected Full Entries
PART 4:  Character Relationship Web
PART 5:  The Forgetting Well — Chapter 4 Deep Design
PART 6:  Seasonal & Live Content Calendar
PART 7:  Hidden Zones & Secret Areas
PART 8:  World-Specific Mini-Games & Mechanics
PART 9:  Cross-World Quest Chains (20)
PART 10: The Kindler Progression — Expanded Spark System
PART 11: New Entry Types (Unsolved Mysteries, Living Experiments, What-Ifs)
PART 12: Curriculum Deep Map (CCSS Math, CCSS ELA, NGSS, Jump$tart)
PART 13: Visitor Characters, Legendary Figures & NPC Systems
PART 14: Audio Expansion — Full Leitmotif Catalog
PART 15: AI System Prompt Templates & Dialogue Scripts

══════════════════════════════════════════
DEEP EXPANSION (Batches 1–5)
These sections supersede and extend all Part references above.
Where conflicts exist, Batch content governs.
══════════════════════════════════════════

BATCH 1: Complete World Designs — All 50 Worlds (CANONICAL — 5-level Fading)
BATCH 2: New Real-World Entries — 115+ Fully Written
BATCH 3: Expanded Character Dossiers — 11 Full + 39 Condensed
BATCH 4: New Content Types, Visitor Characters, Curriculum & Parent Systems
BATCH 5: Dialogue Scripts, Quest Narratives, AI Prompts & Additional Entries

══════════════════════════════════════════
FIXES & COMPLETIONS
══════════════════════════════════════════

FIX 1:   Complete World Stubs (all 50 worlds to full depth)
FIX 2:   Corrections, Missing Sections, Foreshadowing, Spark/Well Link
FIX 3:   Issue Resolution (this document)
FIX 4:   Complete Character Dossiers (all 50 at full depth)
FIX 5:   Entry Gap-Fill (all worlds to 6+ entries)
FIX 6:   RealWorldEntry JSON for Database Seeding

══════════════════════════════════════════
APPENDICES
══════════════════════════════════════════

A: World Completion Status Table (50/50 FULL)
B: Entry Progress Tracking (targets, actuals, gaps)
C: Factual Corrections Log
D: Compass Origin Foreshadowing Scenes
E: Forgetting Well ↔ Spark Decay Integration
F: CCSS ELA Standards Alignment
```

---

*All 10 issues resolved. No open items remain.*
