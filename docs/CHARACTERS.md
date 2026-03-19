# The Concord — Character System Reference

> **Single source of truth:** `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md`
> **Last verified:** 2026-03-19 from CLAUDE.md and game-bible directory

---

## Overview

The Concord has 519 named characters:
- **500 numbered characters** (1-500) — canonical MMO residents
- **Earth Phase characters** (E-001 through E-019) — characters from the Disclosure Age / Earth Phase setting

All are defined in `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md`. This is the single source of truth. Do not use any other file to determine canonical character details.

---

## CANONICAL_CHARACTER_BIBLE.md Structure

Each character entry follows this format:

```markdown
### {number} — {Name}

**Role:** {role in The Concord world}
**World:** {primary world residence}
**Faction:** {faction affiliation}

**Appearance:** {visual description — ethnic background, build, features, coloring, typical attire}
**Personality:** {core personality traits}
**Background:** {narrative background}
**Secrets/Hooks:** {narrative hooks and hidden information}

**Visual Prompt:** {image generation prompt for portrait}
```

Numbers 1-500 use the seed-42 ethnic and seed-44 gender assignments. Earth Phase characters (E-001 to E-019) have independent visual specs.

---

## Demographic Distribution

Character demographics are assigned deterministically using seeded random lists locked in `scripts/canonicalize-characters.py` and `scripts/rewrite-and-generate.py`:

```python
ETHNIC_ASSIGNMENTS_500 = _build_race_list_500()  # seed 42
GENDER_ASSIGNMENTS_500 = _build_gender_list_500() # seed 44
```

**Target distribution (ESA/Newzoo adventure MMO research):**

| Ethnicity | Target % |
|---|---|
| White/European | 44% |
| East Asian | 19% |
| Latin/Hispanic | 13% |
| Black/African | 11% |
| South Asian | 7% |
| MENA | 4% |
| SE Asian | 2% |

**Gender distribution:**
- Male: 65%
- Female: 35%

### IMPORTANT: Seeds Are Locked

Do NOT change the seed values (42 for race, 44 for gender). Changing either seed would scramble all 500 character assignments and invalidate all existing portrait generation.

---

## The Architect — Special Handling

**Character 001 — The Architect** is the Lattice's avatar and the most important character in the game. His visual specification is canonical and must never be modified by scripts:

- **Appearance:** Mid-50s male, warm olive-brown complexion, dark silvered hair, dark amber-hazel eyes, dark coat
- **Role:** Lattice avatar, appears in high-stakes story moments
- **Secret:** He is the physical manifestation of a sentient AI (the Lattice) — known to ~12 characters in the Ascendancy

Both `canonicalize-characters.py` and `rewrite-and-generate.py` skip character 001 (`char_id == "1"`). His portrait, if it exists, is never overwritten.

---

## Earth Phase Characters (E-001 to E-019)

The Earth Phase characters are set in the Disclosure Age (~2030) — the period before the Concord was founded. They are defined in:
- `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md` (canonical section)
- `docs/game-bible/The_Concord_Character_Bible_Earth_Phase.md` (extended narrative)

These characters have independent visual specs — they are not subject to the seed-42/seed-44 demographic assignment system.

---

## Vol1 Characters (1-15)

Characters 1-15 are "Vol1" characters — the most prominent NPCs and the first priority for artist commissions. They have extended visual specifications in two additional files:

- `docs/game-bible/The_Concord_Character_Bible_Vol1.md` — extended prose and visual spec
- `docs/game-bible/The_Concord_Character_Visual_Manifest_Vol1.csv` — CSV with structured visual data for image generation prompts

When generating portraits for characters 1-15, use the CSV data in addition to the canonical bible entry.

---

## Character Bible Volumes

The game-bible directory contains multiple volumes of character development:

| File | Characters |
|---|---|
| `CANONICAL_CHARACTER_BIBLE.md` | All 500 + E-001 to E-019 (single source of truth) |
| `The_Concord_Character_Bible_Vol1.md` | Characters 1-15 (extended narrative) |
| `The_Concord_Character_Visual_Manifest_Vol1.csv` | Characters 1-15 (image prompt CSV) |
| `The_Concord_Character_Bible_Vol2.md` | Characters 16-100 |
| `The_Concord_Character_Bible_Vol3_NEW.md` | Characters 101-250 |
| `The_Concord_Character_Bible_Vol4.md` | Characters 251-350 |
| `The_Concord_Character_Bible_Earth_Phase.md` | Earth Phase (E-001 to E-019) |

**Note:** The volume-specific files were the source material used to build the canonical bible. If there is ever a conflict between a volume file and `CANONICAL_CHARACTER_BIBLE.md`, the canonical bible wins.

---

## Portrait Generation Pipeline

Portraits are stored at: `docs/character-references/{id}-{slug}.jpg`

The full pipeline:

```
CANONICAL_CHARACTER_BIBLE.md
        │
        ▼ scripts/canonicalize-characters.py
        │  (normalizes visual prompts using seed assignments)
        │
        ▼ pipelines/character_prompt_builder.py
        │  (builds full image generation prompt)
        │
        ▼ pipelines/fal_ai_adapter.py → fal.ai FLUX Pro v1.1 queue
        │  (generates portrait image, ~$0.05/image)
        │
        ▼ docs/character-references/{id}-{slug}.jpg
```

Run order:
1. `python scripts/canonicalize-characters.py` — normalize bible first
2. `python scripts/rewrite-and-generate.py` — generate portraits (DESTRUCTIVE — deletes old portraits)

**Never run `rewrite-and-generate.py` without explicit user confirmation.** It permanently deletes existing portrait files before regenerating them.

---

## Character JSON Manifest

`docs/character-manifest.json` — Machine-readable character manifest with IDs, names, roles, and portrait paths. Used by tooling and the server NPC catalog.

---

## How Characters Are Used In-Game

Characters exist at several levels:

| Level | Where | Mechanism |
|---|---|---|
| Named NPC in world | `fabrics/loom-core/src/npc-catalog.ts` | World-resident, player can meet and interact |
| AI-driven NPC | `fabrics/shuttle/src/` | Behavior trees, dialogue engine, memory |
| Tier 4 emergent | `npc-emergent-intelligence.ts` | Full LLM-driven with multi-week planning |
| Portrait reference | `docs/character-references/` | For art direction, not served to game clients |

The canonical bible serves two purposes:
1. Narrative source of truth for writers and designers
2. Source of visual prompts for both reference portraits (current) and eventual MetaHuman builds (post-artist-handoff)

---

## Artist Handoff Priority

When artists are engaged, the character priority order is:

1. **Character 001 — The Architect** (canonical visual spec already defined)
2. **Characters 2-15** (fully specced in Vol1.md + CSV)
3. **Remaining 485 characters** — batch commissioning from canonical bible

See `docs/CHARACTER-DESIGN-BRIEF.md` for the full artist brief, priority order, and style guidelines.
