# The Concord — UE5 Plugin Reference

> **Engine version:** UE5.7 (canonical — installed and confirmed on dev machine)
> **Migration status:** Targeting 5.7 from day one — no 5.5 migration needed
> **Plugin location:** `fabrics/bridge-loom-ue5/`
> **UProject:** `fabrics/bridge-loom-ue5/KoydoWorldsGame/KoydoWorlds.uproject`
> **Stub project:** `ue5/KoydoLoom.uproject`
> **Last verified:** 2026-03-19 from ROADMAP.md and fabrics/bridge-loom-ue5/Source/

---

## Plugin Architecture Overview

The UE5 integration is split into two plugins inside `fabrics/bridge-loom-ue5/`:

```
fabrics/bridge-loom-ue5/
├── BridgeLoom.uplugin          # Main plugin descriptor
├── Source/
│   ├── BridgeLoom/             # Core engine bridge plugin
│   │   ├── Public/             # 57 .h headers
│   │   └── Private/            # 57 .cpp implementations
│   └── LoomGameFeatures/       # GameFeature plugin subsystem
│       └── ...
└── GameFeatures/
    └── LoomGameFeatures/       # GameFeature plugin files
```

**Design principle:** UE5 is the rendering fabric, not the brain. All game state lives on the Loom server. The plugin's job is to receive state from the server, render it, and send player inputs back.

---

## BridgeLoom Plugin — Complete Module Inventory

57 header + 57 implementation pairs. Grouped by subsystem:

### Core Framework

| Header | Purpose |
|---|---|
| `BridgeLoomModule.h` | Plugin module declaration and lifecycle. Loaded by UE on startup. |
| `BridgeLoomSubsystem.h` | Engine subsystem (UGameInstanceSubsystem) — singleton lifecycle manager for the entire bridge |
| `BridgeLoomConnection.h` | gRPC connection to the Loom selvage fabric. Manages reconnection and heartbeat. |
| `LoomGameMode.h` | Game mode base class — sets up server connection on map load |
| `LoomPlayerController.h` | Player controller — input handling via Enhanced Input, auth token management |
| `LoomCharacter.h` | Base pawn class for player characters. Drives movement and animation. |

### World Rendering and Streaming

| Header | Purpose |
|---|---|
| `BridgeLoomWorldStreamer.h` | Streams world chunks from server as player moves. Loads/unloads Level Streaming volumes. |
| `BridgeLoomRenderer.h` | Time-of-day, weather state, LOD bias. Drives sky atmosphere and directional light. |
| `BridgeLoomLumen.h` | Lumen global illumination settings. Hardware ray tracing configuration. |
| `BridgeLoomPostProcess.h` | Per-world post-process volumes. Color grading, depth of field, chromatic aberration. |
| `BridgeLoomVegetation.h` | SpeedTree vegetation. Interactive flora simulation. PCG-driven placement. |
| `BridgeLoomWater.h` | Water body simulation. Ocean, river, lake states received from weather system. |
| `BridgeLoomChaosPhysics.h` | Destructible terrain and objects via Chaos Physics. Server-authoritative state. |
| `BridgeLoomDayNightCycle.h` | Day/night cycle — receives world time from server, drives sky and lighting. |
| `BridgeLoomSeasonalContent.h` | Seasonal visual changes — snow accumulation, foliage cycles, festival decorations. |
| `BridgeLoomNavMesh.h` | Runtime NavMesh (Recast). Rebuilt when terrain changes. Used by BridgeLoomNPCAI. |
| `BridgeLoomNiagara.h` | Niagara VFX system — weather particles, magic effects, Weave transition FX, portal effects. |

### NPC Visual Layer

| Header | Purpose |
|---|---|
| `BridgeLoomMetaHuman.h` | MetaHuman facial rig. 52 ARKit blend shapes for lip sync driven by NPC speech data. |
| `BridgeLoomMetaHumanLibrary.h` | 50+ MetaHuman presets with runtime blending for population variation. |
| `BridgeLoomNPCAnimation.h` | Full-body IK, gesture system, locomotion blending. Driven by server NPC state. |
| `BridgeLoomMassEntity.h` | UE Mass Entity framework for 100K+ crowd NPCs. Tier-1 FSM NPCs. |
| `BridgeLoomCrowdSim.h` | Mass Entity crowd pathfinding and market/street simulation. |
| `BridgeLoomVisitorCharacters.h` | Visitor NPC management — characters temporarily present in the world. |
| `BridgeLoomBuildingStage.h` | Building construction stage visualization. Reflects server estate state. |
| `BridgeLoomNPCAI.h` | UE5-side NPC AI bridge. Receives behavior tree outputs from server and drives UE AI components. |

### Gameplay Systems

| Header | Purpose |
|---|---|
| `BridgeLoomDialogue.h` | NPC dialogue system. Lip sync via MetaHuman blend shapes, subtitle overlay, audio playback. |
| `BridgeLoomAbility.h` | Ability system (GAS-inspired but custom). Maps server ability state to UE5 gameplay effects. |
| `BridgeLoomInteraction.h` | Interaction system — proximity detection, context actions, NPC conversation entry. |
| `BridgeLoomInputComponent.h` | Input component — gamepad, keyboard/mouse, and touch. Enhanced Input bindings. |
| `BridgeLoomMovement.h` | Character movement. Reconciles client prediction with server-authoritative position. |
| `BridgeLoomSpawnSystem.h` | Entity spawning — receives server spawn budget and instantiates entities in the level. |
| `BridgeLoomStatusEffect.h` | Status effect visualization — VFX, UI indicators, ability modification overlays. |
| `BridgeLoomSaveGame.h` | Save game bridge — client-side checkpoint persistence, synced to server on session end. |
| `BridgeLoomQuestChains.h` | Quest chain UI — tracker, objective markers, journal. |
| `BridgeLoomLootTable.h` | Loot drop visualization and inventory UI. |
| `BridgeLoomHiddenZones.h` | Hidden zone discovery — fog of war removal, zone unlock VFX. |
| `BridgeLoomEstate.h` | Estate visual system — player and NPC building ownership, construction stages. |
| `BridgeLoomEntityManager.h` | Entity lifecycle on UE5 side — spawn, despawn, component updates from server. |
| `BridgeLoomRespawn.h` | Player respawn flow — death camera, respawn selection UI. |

### World Transition (Silfen Weave)

| Header | Purpose |
|---|---|
| `BridgeLoomWeaveZone.h` | Weave transition shader zone. Fullscreen transition effect when entering a corridor. |
| `BridgeLoomThreadwayNetwork.h` | Threadway connection visualization — world map connections, corridor entry portals. |
| `BridgeLoomLattice.h` | Lattice network visual — energy conduit effects, node status indicators. |

### Platform and Streaming

| Header | Purpose |
|---|---|
| `BridgeLoomPixelStreaming.h` | WebRTC pixel streaming for browser/cloud play. Handles input forwarding and bitrate adaptation. |
| `BridgeLoomMobile.h` | iOS/Android adaptations — touch controls, mobile rendering settings, haptic bridge. |
| `BridgeLoomHaptics.h` | Haptic feedback — controller rumble and mobile haptics. |
| `BridgeLoomAccessibility.h` | Colorblind modes, subtitle sizing, control remapping, motor accessibility. |
| `BridgeLoomVR.h` | VR support — headset tracking, controller mapping, comfort settings. |
| `BridgeLoomCrossReality.h` | Cross-reality bridge — shared session state between VR and flat-screen players. |
| `BridgeLoomStreamProcessor.h` | Server-driven stream processing — handles delta frames and state reconciliation. |

### Progression and Curriculum

| Header | Purpose |
|---|---|
| `BridgeLoomKindlerProgression.h` | Kindler (child player) progression HUD — Spark level, Chapter indicator. |
| `BridgeLoomPlayerProgression.h` | Adult player progression — MARKS specializations, Chronicle depth indicator. |
| `BridgeLoomCurriculumMap.h` | Curriculum standards display for parent-facing session reports. |
| `BridgeLoomMiniGames.h` | Mini-game session management on UE5 side. |
| `BridgeLoomEntryTypes.h` | Entry type UI components — adventure type selectors, difficulty indicators. |
| `BridgeLoomLeitmotifCatalog.h` | Leitmotif audio catalog. Maps worldId to audio asset and crossfade settings. |
| `BridgeLoomAchievement.h` | Achievement unlock notifications and display. |

### Dungeon and Procedural

| Header | Purpose |
|---|---|
| `BridgeLoomDungeonGenerator.h` | Dungeon generator integration — receives server dungeon layout and builds UE5 level geometry. |

---

## LoomGameFeatures Plugin

Located in `fabrics/bridge-loom-ue5/GameFeatures/LoomGameFeatures/`.

The `LoomGameFeatures` plugin handles:
- Core feature registration
- Component lifecycle for Game Feature Actions
- Async activation (default in UE5.7+)

Game Features allow content to be loaded/unloaded at runtime without restarting the game. This is used for world-specific content packs (biomes, NPC sets, seasonal content).

---

## How to Open the Project in UE5.7

1. Open `ue5/KoydoLoom.uproject` in UE 5.7.
2. On first open, UE will ask to compile the BridgeLoom plugin. Click "Yes".
3. After compilation, the editor opens with the plugin loaded.
4. The stub project at `ue5/KoydoLoom.uproject` is a minimal host for testing plugin code in isolation.

---

## UE5.7 Migration Notes

The project targets UE5.7 natively. A plain world with terrain and geometric figures has already been created and confirmed working in 5.7. The following known API changes from prior engine versions must be addressed when the C++ plugins are compiled against 5.7:

### Step-by-Step Migration Plan

```
Step 1 (S): Update engine version in .uplugin + .uproject
  → BridgeLoom.uplugin: change EngineVersion field
  → KoydoWorlds.uproject: update EngineAssociation

Step 2 (M): Build on 5.7, collect compile errors

Step 3 (M): Fix MassEntity processor registration (known breaking change)
  → UE5.7: Entity Handle type changes, Processor registration API updated
  → Review BridgeLoomMassEntity.cpp ProcessorGroups registration

Step 4 (M): Fix MetaHuman RigLogic plugin dependency
  → UE5.6+: RigLogic moved to standalone RigLogicModule plugin
  → Add RigLogicModule to plugin dependency list in BridgeLoom.uplugin
  → Review BridgeLoomMetaHuman.cpp and BridgeLoomMetaHumanLibrary.cpp

Step 5 (S): Fix CommonUI plugin registration
  → UE5.6: CommonUI plugin registration moved to Plugins array in .uproject
  → Update KoydoWorlds.uproject plugin list

Step 6 (S): Verify Enhanced Input bindings
  → UE5.5+ fully replaced Legacy Input System
  → Verify LoomPlayerController Enhanced Input setup still works

Step 7 (M): Test white-box level end-to-end on 5.7

Step 8 (S): Update CI to build on 5.7 image
```

### Breaking Change Details (UE5.6 and UE5.7)

| Change | Files Affected | Action |
|---|---|---|
| CommonUI plugin registration moved | KoydoWorlds.uproject | Update Plugins array |
| MetaHuman RigLogic is now standalone | BridgeLoomMetaHuman.cpp, BridgeLoomMetaHumanLibrary.cpp | Add plugin dependency |
| Enhanced Input fully replaced legacy | LoomPlayerController.cpp | Verify bindings |
| Nanite Tessellation out of experimental (5.5+) | Terrain materials | Optional: add for detail |
| Mass AI Entity Handle type changes (5.7) | BridgeLoomMassEntity.cpp | Fix ProcessorGroups API |
| Substrate materials default in new projects (5.7) | All materials | Do NOT enable unless art team requests |
| LumenRT scene capture new API (5.7) | BridgeLoomRenderer.cpp | Opportunity: improve Chronicle screenshots |
| MetaHuman Animator new runtime retargeting (5.7) | BridgeLoomNPCAnimation.cpp | Potential IK improvement |
| Game Feature Actions: async activation now default (5.7) | LoomGameFeatures actions | Verify async activation subclasses |

---

## Mass AI Usage

Mass Entity is used for Tier-1 crowd NPCs (100K+ scale). `BridgeLoomMassEntity.cpp` registers Mass processors for:
- Crowd pathfinding on city streets and markets
- Ambient NPC behavior (idle, walk, gather, scatter)
- Performance LOD: Mass entities switch to simple animation at distance

Named NPCs (Tier 2-4) are not Mass entities — they are full UCharacter instances managed by `BridgeLoomEntityManager` and `BridgeLoomNPCAI`.

**UE5.7 note:** Mass API had processor registration changes. `ProcessorGroups` registration in `BridgeLoomMassEntity.cpp` requires targeted review before the 5.7 migration can close.

---

## MetaHuman Integration

`BridgeLoomMetaHuman.cpp` drives the 52 ARKit blend shapes for facial animation on named NPCs. Blend shape targets come from the Loom server's NPC dialogue synthesis output (phoneme timings from `npc-speech-synthesis.ts`).

`BridgeLoomMetaHumanLibrary.cpp` maintains a library of 50+ MetaHuman presets. At runtime, the server's demographic assignment for an NPC maps to a base preset, which is then blended to produce variation. This is how the game creates population diversity without requiring an individual artist-created MetaHuman for every NPC.

**UE5.7 note:** MetaHuman Animator adds a new runtime retargeting API that could improve IK chain quality in `BridgeLoomNPCAnimation.cpp`.

---

## Niagara VFX System

`BridgeLoomNiagara.cpp` drives Niagara particle systems triggered by server events:
- Weather: rain, snow, dust storms, fog
- Magic effects: ability activations, status effects
- Silfen Weave transition: corridor entry/exit portal effects
- World events: luminance change pulses, world restoration celebrations
- Lattice: energy conduit flow visualization

---

## gRPC Bridge

`BridgeLoomConnection.cpp` connects to the Loom selvage fabric via gRPC. The connection uses:
- Binary FlatBuffers encoding for world state deltas
- 15-byte compressed delta frames for high-frequency position updates
- MessagePack for less frequent structured updates
- Heartbeat with automatic reconnection

The `selvage` fabric's `bridge-grpc-server.ts` and `bridge-grpc-transport.ts` are the server-side counterparts.

---

## Sync to Kindler

The following UE5 files are shared with the Kindler project and managed by `scripts/sync-to-kindler.sh`:
- `BridgeLoomAudio.cpp` — audio bridge
- `BridgeLoomGRPC.cpp` — gRPC connection (shared base)
- `BridgeLoomMetaHuman.cpp` — MetaHuman renderer
- `BridgeLoomNiagara.cpp` — particle systems
- `BridgeLoomTelemetry.cpp` — telemetry/analytics
- `BridgeLoomWorldStream.cpp` — world streaming base
- `SilfenWeave.cpp` — Weave transition shader

LOOM is the canonical source. Never modify these in Kindler directly.
