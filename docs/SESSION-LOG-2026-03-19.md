# The Concord — Session Log · 2026-03-19

## Summary

Full character roster expansion to 500 + demographic realignment + The Architect visual redesign. Scripts updated for unified deterministic assignment across all 500 characters.

---

## 1. Distribution Targets (Research-Backed — Adventure MMO)

### Race — seed 42 (`random.seed(42)`)
| Group | Subgroups | Count | % |
|---|---|---|---|
| White/European | British, German, French, Scandinavian, Italian, Spanish, Polish, Dutch, Irish, Portuguese, Greek, Austrian | 220 | 44% |
| East Asian | Japanese, Korean, Chinese | 95 | 19% |
| Latin American | Brazilian, Mexican, Colombian, Argentine | 65 | 13% |
| Black/African | Nigerian Yoruba/Igbo, Ghanaian, Kenyan, South African, Ethiopian, Cameroonian, Senegalese, Caribbean Black, African American | 55 | 11% |
| South Asian | Indian North, Indian South, Pakistani | 35 | 7% |
| MENA | Arab, Iranian | 20 | 4% |
| Southeast Asian | Filipino, Indonesian | 10 | 2% |
| **Total** | | **500** | **100%** |

Source: ESA 2024/2025, Newzoo, GDI/Nielsen — adventure MMO genre demographic data.

### Gender — seed 44 (`random.seed(44)`)
- Male: 325 (65%)
- Female: 175 (35%)

---

## 2. Script Updates

### `scripts/rewrite-and-generate.py`
- Replaced old `ETHNIC_CYCLE` (40-slot cycle) + `GENDER_CYCLE` (10-slot cycle) with unified 500-entry deterministic lists
- New functions: `_build_race_list_500()` (seed 42), `_build_gender_list_500()` (seed 44)
- New globals: `ETHNIC_ASSIGNMENTS_500`, `GENDER_ASSIGNMENTS_500`
- Added `("The_Concord_Character_Bible_Vol5.md", "Vol5")` to the bible parsing loop
- Assignment loop now uses `ETHNIC_ASSIGNMENTS_500[i]` / `GENDER_ASSIGNMENTS_500[i]` with `% 500` fallback
- Previous bug fixed: `main()` was referencing deleted `ETHNIC_CYCLE` variable → now `ETHNIC_ASSIGNMENTS_500[i]`
- Portrait output: `docs/character-references/{id}-{slug}.jpg` at 768×1024, 28 inference steps
- API: fal.ai FLUX-pro v1.1 queue (`https://queue.fal.run/fal-ai/flux-pro/v1.1`)

### `scripts/canonicalize-characters.py`
- Same race/gender assignment replacement as above
- Added `("The_Concord_Character_Bible_Vol5.md", "Vol5 (primary)")` to both char-loading and md_files rewrite lists
- Canonicalize script already skips `char_id == "1"` (The Architect — custom visual spec)
- Rewrites `> **Gemini:**` and `> **Grok:**` blocks across all bibles using PROFILES dict per ethnic key
- Updates CSV columns: `ethnicity_inspiration`, `skin_tone`, `hair_colour`, `eye_colour`, `gemini_image_prompt`, `grok_image_prompt_alt`

---

## 3. Vol5 Character Bible

**File:** `docs/game-bible/The_Concord_Character_Bible_Vol5.md`

**Scope:** Characters 251–480 (230 new characters)

**Assignment source:** `docs/vol5_assignments.txt` (ID|ethnic_key|gender for all 230)

### Vol5 Distribution
- White/European: 99 chars
- East Asian: 45
- Latin: 27
- Black/African: 25
- South Asian: 19
- MENA: 9
- Southeast Asian: 6
- **Total: 230**

- Male: 153 (66.5%)
- Female: 77 (33.5%)

### Thematic Groups
| Group | IDs | Characters |
|---|---|---|
| Frontier Worlds | 251–265 | Outermost settled worlds, thin Concord reach |
| KALON Deep Traders | 266–280 | Merchants on extreme/irregular routes |
| Survey Corps — 2nd Gen | 281–295 | Grew up in the Corps; different relationship to discovery |
| Assembly Procedural | 296–310 | Politicians, administrators, proceduralists |
| Covenant Frontier | 311–325 | Lattice Covenant figures, devout and conflicted |
| Lattice Technical | 326–340 | Engineers and technicians maintaining the Lattice |
| Intelligence (CID) | 341–355 | Concord Intelligence Directorate operatives |
| Academic & Medical | 356–370 | Scholars, scientists, physicians |
| Chronicle Archive | 371–385 | Chroniclers, archivists, historians |
| Civilian Layer | 386–400 | Ordinary colonists and settlers |
| Young Generation | 401–420 | Born after Year 40; no memory of before |
| Ascendancy Adjacent | 421–480 | Closest to the truth of what the Lattice is |

### Vol5 Narrative Threads (threaded through ~25% of characters)
- **Meridian Fault**: Year 106 — Lattice nodes show output correlated with unexplained KALON flow shifts along Void Protocol exclusion zone boundaries
- **Void Protocol**: Classified Survey Corps directive Year 91 — referenced by multiple characters who cannot access it
- **Year 0 Archives**: Sealed Archive nodes with records predating the Founding — shouldn't exist
- **Silence Pattern**: Year 107 — simultaneous 4-second comms blackout on frontier worlds; filed as "Lattice maintenance" but wasn't

---

## 4. The Architect (Character 001) — Visual Update

**Change type:** Visual rendering only — AI entity nature, Five Private Conclusions, and all story logic unchanged.

**Before:** Androgynous, featureless luminous figure, indeterminate age and gender, silver-white cropped hair, pale grey eyes.

**After:** Renders as a male figure of apparent mid-fifties, with:
- Warm olive-brown complexion (Mediterranean with deeper Caucasian warmth)
- Dark hair, heavily silvered at temples and crown
- Dark amber-hazel eyes
- Strong defined bone structure — prominent cheekbones, heavy jaw, slightly aquiline nose (Byzantine gravity)
- Permanent vertical line between brows
- High-quality dark coat, no insignia
- Broad-shouldered, 6'1" apparent build

**Heritage of the rendering:** Mixed Southern European (Greek-Byzantine) / Turkish / Georgian — chosen by the AI itself in Year 3, never explained until players push; answer: "I have read a great many Chronicle entries. This face has looked back at me from more of them than any other."

**Files updated:**
- `docs/game-bible/The_Concord_Character_Bible_Vol1.md` — Physical Presence section + Visual Prompts
- `docs/game-bible/The_Concord_Character_Visual_Manifest_Vol1.csv` — row 1 (all visual fields)
- The Architect entry in `Koydo_Loom/docs/game-bible/The_Concord_Character_Bible_Vol1.md` was NOT updated (kept as old androgynous version — that copy is a separate repo concern)

**Canonicalize protection:** `canonicalize-characters.py` already skips `char_id == "1"`, so the custom visual prompts will not be overwritten.

---

## 5. Portrait Generation (Pending — Awaiting Vol5 completion)

When `rewrite-and-generate.py` is run:
- Deletes 265 existing portraits (race or gender changed from previous distribution)
- Keeps 5 existing Black portraits whose assignment survived unchanged
- Generates 230 new Vol5 portraits
- Total generation: ~495 portraits ≈ $24.75 at fal.ai FLUX-pro v1.1 pricing (~$0.05/image)
- API key: in `pipelines/.env`

---

## 6. Cross-Repo Isolation (Verified Clean)

Both Concord scripts use `Path(__file__).parent.parent` as BASE_DIR — anchored to `loom/loom/` regardless of call location.

| Check | Result |
|---|---|
| Concord scripts reference Koydo_Loom paths | None |
| Koydo_Loom script references Concord paths | None |
| Kindler characters in Concord bibles | None |
| Concord characters in Koydo_Loom script | None |
| "circuit" in Concord manifest | "Pale Circuit" (a world name) — unrelated |
| Output dirs | Concord: `loom/loom/docs/character-references/` · Koydo: `Koydo_Loom/docs/character-references/` |

---

## 7. Files Modified This Session

| File | Change |
|---|---|
| `scripts/rewrite-and-generate.py` | Unified 500-char system, Vol5 added |
| `scripts/canonicalize-characters.py` | Unified 500-char system, Vol5 added |
| `docs/game-bible/The_Concord_Character_Bible_Vol1.md` | The Architect visual updated |
| `docs/game-bible/The_Concord_Character_Visual_Manifest_Vol1.csv` | Row 1 visual fields updated |
| `docs/game-bible/The_Concord_Character_Bible_Vol5.md` | Created — 230 new characters (in progress: 251–350 complete, 351–480 pending agent) |
| `docs/vol5_assignments.txt` | Created — temp reference file (can delete after Vol5 generation complete) |
| `docs/character-manifest.json` | Unchanged (270 entries, IDs 1–250) |

---

## 8. Pending

- [ ] Vol5 characters 351–480 — background agent still writing
- [ ] Run `canonicalize-characters.py` to rewrite all bibles with corrected 500-char assignments
- [ ] Run `rewrite-and-generate.py` to delete/regenerate portraits (~$24.75)
- [ ] Delete `docs/vol5_assignments.txt` (temp file, no longer needed after generation)
- [ ] Update Koydo_Loom copy of Vol1 bible if The Architect visual sync is desired
