# The Concord — API Reference

> **Base URL:** All routes are prefixed `/v1/`
> **Auth:** Bearer token (Nakama JWT) in `Authorization: Bearer <token>` header
> **Format:** JSON request/response bodies. Hot paths use FlatBuffers/MsgPack via WebSocket/gRPC.
> **Error shape:** `{ ok: false, error: string, code: string }`
> **Success shape:** `{ ok: true, ...data }`
> **Last verified:** 2026-03-19 from src/routes/ source files

---

## Route Index

50 route files in `src/routes/`. Grouped by domain below.

---

## Auth and Session

### `auth.ts`

Player account creation and session management. Delegates identity storage to Nakama.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/auth/register` | Create a new player account |
| POST | `/v1/auth/login` | Authenticate and get session token |
| GET | `/v1/auth/me` | Get current session info (requires Bearer token) |

**Register body:** `{ username, email, password, displayName?, ageTier?, parentalConsentToken? }`
- `ageTier`: 1 = age 5-6, 2 = age 7-8, 3 = age 9-10. Values 1-3 trigger COPPA gate.
- Players with `ageTier` 1-3 require `parentalConsentToken` or receive 403 `parental_consent_required`.
- Delegates to Nakama `/v2/account/authenticate/email?create=true`.

**Login body:** `{ email, password }`

**Register response (201):** `{ ok, token, playerId, displayName, createdAt }`

### `session.ts`

Core game loop API: enter world → complete entries → earn Spark → restore worlds → advance Chapter.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/session/start` | Start a game session for a Kindler |
| POST | `/v1/session/:sessionId/complete-entry` | Record an entry (lesson) completion |
| POST | `/v1/session/:sessionId/mark-world-restored` | Mark a world as restored |
| POST | `/v1/session/:sessionId/end` | End session and persist |
| GET | `/v1/session/:sessionId` | Get session state |

**Start body:** `{ kindlerId }`
**Complete-entry body:** `{ entryId, worldId, adventureType, score? }`
- Triggers world luminance restoration via `onEntryCompleted` callback
- Returns spark delta and cause

**Mark-world-restored body:** `{ worldId }`
- Spark delta: +0.10 (fixed, cause: `world_restored`)

**End body:** `{ worldsVisited: string[], guidesInteracted: string[], entriesCompleted: string[] }`

### `account.ts`

Player account management.

### `save-game.ts`

Client-side save state persistence.

---

## World and Navigation

### `worlds.ts`

World discovery, luminance state, and entry access. 4 realms: `discovery`, `expression`, `exchange`, `crossroads`.

| Method | Path | Description |
|---|---|---|
| GET | `/v1/worlds` | List all worlds (optional `?realm=` filter) |
| GET | `/v1/worlds/realm/:realm` | Worlds filtered by realm |
| GET | `/v1/worlds/:worldId` | World detail + current luminance |
| GET | `/v1/worlds/:worldId/luminance` | Dedicated luminance snapshot |
| GET | `/v1/worlds/:worldId/luminance/history` | Luminance change log (requires pgLuminanceRepo) |
| GET | `/v1/worlds/:worldId/entries` | Published entries for a world |
| POST | `/v1/worlds/:worldId/restore` | Trigger manual world restore (Kindler action) |

**WorldSummary fields:** `id, name, realm, subject, guideId, description, colorPalette, luminance, stage, totalKindlersContributed`

**WorldDetail adds:** `lightingMood, biomeKit, entryCount, threadwayConnections, lastRestoredAt, activeKindlerCount`

**Luminance stages:** `dimming` | `restored` | ... (from WorldLuminance type)

**Restore body:** `{ kindlerId: string, difficultyTier: 1|2|3 }`

### `threadways.ts`

Inter-world conceptual connections. Read-only. Discovery state tracked client-side.

| Method | Path | Description |
|---|---|---|
| GET | `/v1/threadways` | All threadway definitions |
| GET | `/v1/threadways/:threadwayId` | Single threadway |
| GET | `/v1/threadways/world/:worldId` | Threadways for a specific world |
| GET | `/v1/threadways/realm/:realm` | Threadways for a realm |
| GET | `/v1/threadways/tier/:tier` | Threadways by discovery tier (1, 2, or 3) |

**ThreadwaySummary fields:** `threadwayId, fromWorldId, toWorldId, conceptLink, tier, realm, transition { visualDescription, audioTransition }`

### `terrain.ts`

Terrain data and heightmap queries for world regions.

### `biome.ts`

Biome definitions, biome-to-world mappings, and biome-specific content.

### `weather.ts`

World weather state — current conditions and forecast for a world.

### `day-night.ts`

Day/night cycle state for a world. World time is independent per world.

### `settlements.ts`

Settlement registry — towns, outposts, cities within a world. Static definitions.

### `hidden-zones.ts`

Hidden zone discovery tracking. Records which zones a player has found.

### `fading.ts`

World fading/restoration system. Tracks luminance decay and the restoration pipeline.

---

## NPCs and Characters

### `npcs.ts`

World-resident character catalog. All data is read-only, in-memory.

| Method | Path | Description |
|---|---|---|
| GET | `/v1/npcs` | All NPCs (optional `?role=` or `?tier=` filter) |
| GET | `/v1/npcs/:npcId` | Single NPC detail |
| GET | `/v1/npcs/world/:worldId` | All NPCs resident in a world |
| GET | `/v1/npcs/guides` | All primary guides (tier-1 greeter NPCs) |

**Valid roles:** `primary-guide, scholar, scientist, artist, merchant, explorer, storyteller, engineer, healer, archivist`

**Valid tiers:** 1, 2, 3

### `guide.ts`

Guide character endpoints — primary NPCs assigned to each world who greet and orient players.

### `npc-relationships.ts`

NPC-to-player and NPC-to-NPC relationship state. Tracks reputation, affinity, and history.

### `visitor-characters.ts`

Visitor characters — NPCs who are temporarily present in a world (not permanent residents).

### `character-dossiers.ts`

Player-accessible dossiers for named characters. Reveals lore in stages as Chronicle depth increases.

### `ascendancy.ts`

Ascendancy inner-circle system. Tracks Lattice anomalies observable by Ascendancy members.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/ascendancy/anomalies` | Report a Lattice frequency anomaly |
| GET | `/v1/ascendancy/nodes/:nodeId/anomalies` | Get all anomalies for a Lattice node |
| ... | ... | Additional anomaly and member endpoints |

**Anomaly body:** `{ nodeId, worldId, suspectedVector (CompromiseType), detectionConfidence, affectedHarmonicIndex, harmonicDeviation }`

---

## Gameplay Systems

### `combat.ts`

Entity abilities, cooldowns, and status effect tracking. Times in milliseconds (stored internally as bigint µs). BigInt fields in responses are serialized as strings.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/combat/abilities` | Register an ability |
| GET | `/v1/combat/abilities` | List all abilities |
| GET | `/v1/combat/abilities/:abilityId` | Get ability definition |
| GET | `/v1/combat/abilities/:abilityId/report` | Activation report |
| POST | `/v1/combat/entities/:entityId/resources` | Set entity resources |
| GET | `/v1/combat/entities/:entityId/resources` | Get entity resources |
| GET | `/v1/combat/entities/:entityId/cooldowns` | Active cooldowns |
| GET | `/v1/combat/entities/:entityId/effects` | Applied status effects |
| POST | `/v1/combat/entities/:entityId/activate/:abilityId` | Activate ability |
| POST | `/v1/combat/entities/:entityId/cooldowns/:abilityId/reset` | Reset cooldown (admin only) |

**Valid effect types:** `DAMAGE, HEAL, BUFF, DEBUFF, TELEPORT, SUMMON, SHIELD`
**Valid resource types:** `STAMINA, MANA, HEALTH, ENERGY`

### `status-effects.ts`

Status effect application, expiration, and stacking logic.

### `adventures.ts`

Adventure (field trip) session management and completion.

### `dungeons.ts`

Dungeon instance creation, floor tracking, and completion rewards.

### `loot-tables.ts`

Loot table definitions and roll results for encounters and world events.

### `mini-games.ts`

Mini-game session creation, score submission, and leaderboard integration.

### `quiz.ts`

Quiz question delivery, answer validation, and score recording.

---

## Quests and Progression

### `quest-chains.ts`

Multi-step quest chain management. Chains span multiple sessions.

### `quest-tracker.ts`

Per-player active quest state — objectives, progress, and completion.

### `procedural-quests.ts`

Procedurally generated one-shot quests based on world state and player profile.

### `progression.ts`

Player progression state — Chapter, MARKS specializations, and milestone tracking.

### `achievements.ts`

Achievement unlock tracking and progress reporting.

### `leaderboard.ts`

Leaderboard queries — global, world-scoped, and friend-scoped rankings.

---

## Content

### `content.ts`

Real-world entry (lesson) delivery. The ContentEngine serves entries by world, difficulty tier, and adventure type.

### `entry-types.ts`

Entry type definitions — adventure types, era classifications, continent codes.

### `encyclopedia.ts`

In-game encyclopedia — indexed lore articles unlocked through play.

### `curriculum.ts`

Curriculum standards mapping — Common Core, NGSS, state financial literacy standards. Used for parent dashboard reports.

### `kindler.ts`

Kindler (player character) profile — age tier, Spark level, Chapter, worlds visited.

---

## World Simulation

### `world-events.ts`

World event system — time-limited events affecting world state.

### `seasonal.ts`

Seasonal content calendar — what seasonal events are active in each world.

### `spawn-budget.ts`

Entity spawn budget management per world — prevents over-population.

### `forgetting-well.ts`

The Forgetting Well — a lore mechanic where players can erase NPC memories (limited, costly).

### `audio.ts`

World audio state — ambient soundscape and leitmotif selection per world.

### `leitmotifs.ts`

Leitmotif catalog — 8 of 50 world leitmotifs currently exist. Mapping of worldId to audio asset.

---

## Social and Communication

### `notifications.ts`

Player notification delivery — quest updates, social events, system messages.

---

## Moderation and Safety

### `moderation.ts`

Moderation actions — content review, flagging, and resolution.

### `safety.ts`

Player safety tools — block lists, report submission, emergency stop.

### `parent-dashboard.ts`

Parental control dashboard — session summaries, progress reports, time limits. COPPA: no PII in responses.

---

## Admin and Internal

### `revenue.ts`

Epic royalty tracking. Admin-facing, not exposed to game clients.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/revenue/events` | Record a revenue event |
| GET | `/v1/revenue/royalty/current-quarter` | Current quarter royalty summary |
| ... | ... | Additional royalty and reporting endpoints |

**UE5 Royalty rule:** $0 on first $1M lifetime gross, then 5% (3.5% with Epic Store). Tracked in `royalty_ledger` table.

**Event body:** `{ eventType: 'subscription'|'iap'|'other', grossAmountUsd, netAmountUsd, platform, paymentProcessor, userId, transactionId }`

**Platforms:** `ios, android, epic, console, web`
**Payment processors:** `apple, google, stripe, epic, other`

### `analytics.ts`

Game analytics event ingestion. No PII in events.

### `feature-flags.ts`

Feature flag management — enable/disable features per player cohort or globally.

### `accessibility.ts`

Accessibility profile management — colorblind modes, subtitle settings, control remapping.

---

## Auth Requirements

All endpoints except `POST /v1/auth/register` and `POST /v1/auth/login` require `Authorization: Bearer <token>`. Tokens are Nakama JWTs. The server validates them against Nakama on each request.

The `GET /v1/auth/me` endpoint proxies the token to Nakama's `/v2/account` and returns the result.

---

## Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | Validation failure |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 401 | `SESSION_EXPIRED` | Token expired |
| 403 | `parental_consent_required` | COPPA gate not cleared |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `ACCOUNT_EXISTS` | Email already registered |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `SERVICE_UNAVAILABLE` | Nakama or backing service unreachable |
| 503 | `UNAVAILABLE` | Optional feature not configured |
