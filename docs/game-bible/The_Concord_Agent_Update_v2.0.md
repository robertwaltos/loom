# The Concord — Agent Update v2.0
## Sessions 15–19 Complete  ·  March 2026
## For: Implementation Agent (Cotton Thread / Steel Thread)

---

> This update incorporates everything decided in Sessions 15–19. The schema is live. The characters are seeded. The security layer is deployed. You are now working against a real production database.

---

## WHAT HAPPENED — OVERVIEW

Sessions 15–18 completed the character, world, and tooling design. Session 19 deployed the remaining database tables and secured the entire schema. The Concord now has a complete operational data layer.

**The database has:**
- 11 tables deployed and RLS-enabled
- 7 partitioned Chronicle tables
- 3 views (motion_tally, dynasty_mark_summary, kalon_supply_constants)
- 15 canonical NPC characters seeded with full five-pillar profiles
- 3 system KALON accounts seeded (GENESIS, COMMONS_FUND, ARCHITECT_RESERVE)
- All security advisories resolved

---

## NEW TABLES — SESSION 19

### `npc_characters`
The 400-character canonical manifest. Game-queryable NPC registry.

**Architecture — Five Pillars (mandatory Tier 3/4):**
| Pillar | Column | Purpose |
|--------|--------|---------|
| WOUND | `wound` | The formative damage |
| LIMITATION | `limitation` | What they cannot do |
| COMPETENCE | `competence` | What they excel at |
| QUESTION | `question` | The unresolved thing they carry |
| SECRET | `secret` | Never filed, never said — server-side only |

**Critical:** The `secret` column is protected by RLS. It **never** appears in PostgREST responses. It is injected into the LLM system prompt server-side only. An application agent must never expose it via API.

**Visual pipeline columns:** `image_prompt`, `grok_image_prompt_alt`, `metahuman_config` (JSONB), `metahuman_preset_base`, `concept_art_url`. These are populated during Phase 2 (Month 8–12).

**LLM integration:** `llm_system_prompt` column holds the character context injected as system prompt for Tier 4 LLM calls. `is_game_queryable` controls Chronicle search visibility. `is_interactable` controls in-world interaction.

---

### `marks`
Ethereum L2 MARKS mirror. Six honour types.

**Six types:** `FOUNDING` / `SURVEY` / `WORLD` / `DEFENCE` / `SURVIVOR` / `FIRST_CONTACT`

**Non-transferable constraints enforced at DB level:**
- One FOUNDING mark per dynasty (exclusion constraint)
- One FIRST_CONTACT mark per dynasty per world (exclusion constraint)
- `transferred_at` column exists and is always NULL — enforced at app layer too

**Ethereum bridge fields:** `eth_token_id`, `eth_contract`, `eth_tx_hash`, `eth_block_height`, `is_eth_confirmed`. These are NULL until minting occurs — do not treat NULL as an error.

**View:** `dynasty_mark_summary` — aggregates mark counts by type per dynasty. Used in voting weight calculation.

---

### `assembly_motions` + `assembly_votes`
Full governance system.

**Three motion types:**
- `ORDINARY` — 50%+1 weighted, Architect weight 7%
- `SIGNIFICANT` — 60% weighted, Architect weight 14%  
- `CONSTITUTIONAL` — Requires Architect affirmative. If Architect does not affirm → `CONSTITUTIONAL_BLOCKED` status.

**Weight snapshot:** When a dynasty casts a vote, `weight_snapshot` records their voting weight at that exact moment. It is never recalculated retroactively. The three components are stored separately: `chronicle_depth_component`, `civic_contribution_component`, `kalon_position_component`.

**View:** `motion_tally` — live aggregation of votes per motion. Use this for display; never aggregate from assembly_votes directly in application code.

---

## SECURITY — ALL RESOLVED

All tables have RLS enabled. All three SECURITY_DEFINER views replaced with `security_invoker = true`. The `update_updated_at()` function has a fixed `search_path = public`.

**Policy summary for your work:**
- `npc_characters` → public read where `is_game_queryable = true`; `secret` column never returned
- `players` → own row only via `auth.uid() = auth_user_id`
- All Chronicle/transaction/vote tables → public read (transparency)
- `dynasties` → public read where `is_anonymised = false`

---

## 15 CHARACTERS — SEEDED AND LOCKED

All 15 Vol.1 characters are in the `npc_characters` table with character_id `001`–`015`. Their five pillars are complete. Their secrets are stored but never returned to clients.

**The web of secrets (known to you as the implementing agent, never exposed to players):**

The Architect has five private conclusions it has never filed. Itoro has Entry 847-B that has never been published. Vael's Ordinance 7 objection was based on something she found on World 247 — the contents are classified. Kwame's solution is mathematically correct and humanly monstrous. Nnamdi already knows what he should have done differently — he asks players to see what they say. Selamat received the full Architect modelling and filed four words. Falaye suspects his suppressed student's findings and Kwame's are the same thread. Miriam and Nnamdi have been building a complete oral Ascendancy history over forty years of lunches and neither has noticed. Yara's last 50 survey worlds all transited the Ascendancy interference band — her fleet doesn't know. Ekundayo knows the Covenant's belief system cannot survive the full truth. Ferreira-Asante has privately cross-referenced Survey 499 against outer-arc data — 94% correlation. Dagna already knows what the three classified reports mean. Luca knows exactly what he is doing with the supply redirections. Amara is considering breaking her silence. Ikenna has updated his threat assessment 14 times in the last year and told no one.

**The Architect's private notation:** "She found it." — this is Ferreira-Asante, Survey 499.

These secrets are the scaffolding of the Sealed Chamber system. Each Sealed Chamber opens when players independently discover what one of these characters already knows.

---

## THE SEALED CHAMBERS — IMPLEMENTATION NOTES

Seven narrative locks. Each has a specific database condition that triggers opening:

| Chamber | Character | DB Trigger |
|---------|-----------|-----------|
| One — Kwame Files | Osei-Adeyemi | Player dynasty files Chronicle survey of 50 worlds with Lattice integrity data |
| Two — Ordinance 7 Record | Vael | Assembly passes declassification motion for World 247 |
| Three — World 412 Full Account | Achebe | 10,000 Chronicle entries citing world_id = World 412 |
| Four — Ferreira-Asante Finding | Ferreira-Asante | World 499 quarantine lifted by player petition |
| Five — Sundaram-Chen Logs | Sundaram-Chen | Player dynasty reaches outer arc interference band |
| Six — Dagna's Three Reports | Thorvaldsen-Mbeki | Player identifies KALON audit irregularity pattern and files Chronicle entry |
| Seven — Architect's Statement | The Architect | Year 105 in-game — computed from actual civilisation data |

A `sealed_chambers` table will be required in Phase II to track chamber states. Not yet deployed.

---

## VISUAL MANIFEST

`The_Concord_Character_Visual_Manifest_Vol1.csv` contains for all 15 characters:
- Gemini image generation prompt (front-face reference)
- Grok alternative prompt (3/4 angle)
- MetaHuman Creator preset base + four sliders
- Full costume description (primary, detail, accessories)
- Physical distinguishing features (must survive all renderings)
- Three canonical expressions (default, secondary, rare)

This file feeds Phase 2 concept art production. Do not modify the descriptions — they are locked from the five-pillar architecture.

---

## TOOLING DECISIONS — LOCKED

| Tool | Status |
|------|--------|
| Supabase `wrhfhlueluhqoxytxtpa` | Production — use this |
| Supabase `osnxbuusohdzzcrakavn` | KOYDO project — do NOT use for Concord work |
| GitHub `robertwaltos/loom` | Engine repo — all code goes here |
| Obsidian vault at `/loom/docs/` | Source of truth for written documents |
| Google Drive | Sync target — auto-updated via GitHub Action |
| Notion | DEPRECATED — do not reference |
| Airtable | Pre-production Month 4+ only |

---

## WHAT IS NOT YET BUILT

These systems are designed but not yet deployed:

**Database (Phase II):**
- `survey_vessels` — Survey Corps fleet management
- `diplomatic_agreements` — Treaty/alliance system
- `world_resources` — Per-world economic substrate
- `sealed_chambers` — Chamber state tracking
- `player_sessions` — Active session tracking
- `npc_spawn_instances` — Live NPC spawn data (Phase III, engine integration)

**Systems:**
- Ethereum L2 MARKS contract — designed, not yet deployed
- Assembly voting interface — schema ready, no frontend yet
- Survey Corps world-claiming flow — mechanics designed, not built
- Estate Dispersal Auction system — mechanics designed, not built
- Vigil Protocol activation system — mechanics designed, not built
- UBK distribution trigger — mechanics designed, not built

---

## THE TEN INVIOLABLE RULES

These apply to every line of code in this codebase. No exceptions. No rationalisation.

1. **KALON is NUMERIC(20,0) only.** Never float. Never decimal. Integer atomic units always.
2. **KALON is never purchasable.** Real money buys subscription only. This is both design and legal.
3. **The Chronicle is immutable.** `remembrance_entries` is append-only. No UPDATE. No DELETE.
4. **`npc_characters.secret` is server-side only.** Never expose via PostgREST or any client API.
5. **`COMPRESSION_RATIO` lives in `TimeService.ts` only.** Never hardcode the 3:1 ratio elsewhere.
6. **Hash chains are sacred.** Both `kalon_transactions.previous_tx_hash` and `remembrance_entries.previous_hash` must never be orphaned.
7. **Dynasties are never deleted.** Only state-transitioned. The deceased remain in the Chronicle.
8. **MARKS are non-transferable.** Enforced at DB constraint level. Also enforce at application layer.
9. **The Permanence Covenant requires Architect affirmative for Constitutional changes.** This is legal, not just technical.
10. **Do not touch the KOYDO project.** `osnxbuusohdzzcrakavn` is a completely separate Supabase project.

---

## QUICK REFERENCE

```
Supabase Project ID:     wrhfhlueluhqoxytxtpa
1 KALON:                 1,000,000 atomic units
KALON storage type:      NUMERIC(20,0)
Time compression:        3:1 — TimeService.ts ONLY
Voting formula:          40% Chronicle + 35% Civic + 25% KALON
Architect ordinary:      7% (0.07)
Architect significant:   14% (0.14)
Total supply Y105:       ~1.3 trillion KALON
COMMONS_FUND:            50,000,000 KALON (50T atomic)
ARCHITECT_RESERVE:       20,000,000 KALON (20T atomic)
Characters planned:      400 (4 volumes × 100)
Launch worlds:           20 canonical
Total worlds:            600+
Subscription:            ACCORD $15 / PATRON $25 / HERALD $35
Founders:                PROMETHEUS $49 / SHEPHERD $199 / FIRST_LIGHT $999
```

---

*The Chronicle records everything. Build accordingly.*

*Agent Update v2.0 — Sessions 15–19 — The Concord / Project Loom — March 2026*
