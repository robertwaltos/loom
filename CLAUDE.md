# Koydo Universe — Forked from The Loom Engine

## What This Is

An immersive educational application for children ages 5–10, built on UE5, delivering 50 interconnected worlds where every lesson is a place, every concept is a character, and every test is an adventure. Forked from Project Loom (the engine). This is the PRODUCT, not the engine.

**Visual Style**: Studio Ghibli meets National Geographic
**Target Audience**: Ages 5–10 • Phones & Tablets & Consoles
**Revenue Model**: Subscription (parents, homeschool, supplementary ed)

## Fork Architecture

```
github.com/robertwaltos/loom          ← The Loom engine (UPSTREAM)
github.com/robertwaltos/Koydo_Loom    ← Fork: Koydo Universe (THIS REPO)
github.com/[org]/koydo                ← Koydo EdTech platform (SEPARATE — DO NOT TOUCH)
```

### What Flows Upstream (merge back to Loom)
- Core engine: Silfen Weave transitions, plugin loader, event bus, state sync
- AI conversation framework (generic, not character-specific prompts)
- World state management abstracted as generic world-property system
- Media pipeline infrastructure: job queue, worker pattern, provider abstraction
- Performance optimizations, bug fixes, security patches to engine code

### What Stays in the Fork (Koydo Universe only)
- All educational content: 50 characters, world designs, curriculum mappings, real-world entries
- The Fading mechanic (luminance tied to learning activity)
- Kindler progression, Spark mechanic, Chapter arc
- Character-specific LLM system prompts
- COPPA compliance, parental controls, child safety systems
- Koydo brand assets, SSO integration with EdTech platform
- Subscription and monetization logic

## PR Decision Checklist

1. Is this engine-level? Flag for upstream merge consideration
2. Does this PR import from the `koydo` EdTech repo? **REJECT**
3. Does this PR write to Koydo's Supabase project? **REJECT**
4. Does this PR contain content not appropriate for ages 5–10? **REJECT**
5. Does this PR modify engine code without tests? **REJECT**
6. Could The Concord benefit from this engine change? Write generically, PR upstream

## Multi-Agent Operating Rules

### Branch Naming

```
<thread-type>/<fabric>/<description>
```

Thread types for Koydo Universe:
- `silk/` — UI/UX, world rendering, Threadway transitions, Ghibli/NatGeo visual style
- `steel/` — State management, Supabase schema, luminance sync, sessions
- `cotton/` — Features: adventures, quizzes, progress, parent dashboard API
- `bridge/` — SSO with Koydo, progress API, media pipeline (fal.ai)
- `scribe/` — Content entries, curriculum mapping, character system prompts
- `sentinel/` — COPPA compliance, child data protection, content moderation
- `carbon/` — Performance optimization

### Commit Format

```
<type>(<fabric>): <description>

[body]

Thread: <thread-type>
Tier: <0|1|2|3|R|M>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`, `content`

## The Ten Commandments

1. Name things so clearly that comments become redundant
2. Functions under 30 lines
3. Never nest deeper than 3 levels
4. Make illegal states unrepresentable — TypeScript strict mode, no `any`, ever
5. Write tests before fixing bugs
6. Errors are first-class citizens — custom types, structured codes, correlation IDs
7. Log with purpose — structured JSON, never `console.log`
8. Don't optimize prematurely, but don't be lazy
9. Dependencies explicit — no global state, dependency injection everywhere
10. Delete dead code immediately

## Architecture Principles

- **Hexagonal (Ports & Adapters)**: Business logic never imports infrastructure
- **Event-driven**: Modules communicate through typed events, never direct calls
- **Plugin architecture**: Core is minimal, features are plugins (each world is a Fabric)
- **Binary protocols on hot paths**: FlatBuffers/MessagePack between Loom and UE5
- **The Loom is invisible to the frame budget**: < 0.5ms per game thread tick
- **Design for the ceiling**: Store highest quality, serve what device can handle
- **COPPA-first**: Every data decision starts from "is this legal for children under 13?"

## Directory Structure

```
Bible/              ← Product bibles (.docx). THE SOURCE OF TRUTH.
contracts/          ← Shared interfaces (inherited from Loom engine)
  bridge-loom/      ← Interface any rendering engine must implement
  events/           ← Event type definitions
  entities/         ← Entity component schemas
  protocols/        ← Wire protocol definitions

fabrics/            ← Independent modules. ONE AGENT PER FABRIC.
  loom-core/        ← The Loom: entity system, event bus, world state
  shuttle/          ← The Shuttle: AI agent orchestration (Temporal)
  silfen-weave/     ← Seamless world transition orchestration
  nakama-fabric/    ← Identity, economy, matchmaking (wraps Nakama)
  bridge-loom-ue5/  ← UE5 C++ plugin: Bridge Loom implementation
  inspector/        ← Monitoring, metrics, quality control
  selvage/          ← API gateway, external interface
  dye-house/        ← Security, auth, encryption
  archive/          ← Document storage, state persistence

universe/           ← PRODUCT-SPECIFIC (Koydo Universe only)
  worlds/           ← World definitions and configurations (50 worlds)
  characters/       ← Character bibles, LLM system prompts (50 guides)
  content/          ← RealWorldEntry data, curriculum maps
  adventures/       ← Adventure type implementations
  fading/           ← The Fading mechanic (luminance system)
  kindler/          ← Player progression, Spark system
  safety/           ← COPPA compliance, content moderation, parental controls
  parent-dashboard/ ← Parent API and web dashboard
  media-pipeline/   ← fal.ai → MetaHuman → UE5 asset pipeline
  revenue/          ← Subscription, Epic royalty tracking

agents/             ← AI agent personas and configurations
prompts/            ← Prompt templates and orchestration
tools/              ← Build tools, code generation, scripts
tests/              ← Integration, E2E, perceptual tests
docs/               ← Architecture docs, game bible, API specs
```

## Tech Stack

- **TypeScript** (primary) — strict mode, no `any`, ES2023 target
- **Rust** (performance-critical) — event bus hot paths, binary serialization
- **C++** (UE5 plugin) — Bridge Loom, gRPC bridge
- **Python** (AI/ML) — NPC behavior training, procedural generation ML
- **Node.js 22+** — runtime for TypeScript services
- **npm workspaces** — monorepo management

### Product-Specific Stack
- **Unreal Engine 5** — rendering (MetaHuman, Lumen, Nanite on mobile)
- **NVIDIA ACE** — real-time AI facial animation during LLM conversations
- **fal.ai** — concept art generation pipeline
- **Anthropic Claude Sonnet** — character LLM via The Needle (MCP)
- **Supabase** — database (separate project from Koydo EdTech)
- **ElevenLabs** (or equivalent) — TTS for character voices

## Key Concepts

### The Fading
Worlds dim when knowledge is forgotten. Children restore light through learning.
Not a villain — entropy. Knowledge unused is knowledge lost.

### Kindlers
Every child is a Kindler — their Spark grows with learning, dims gently with absence (never punitively).

### The Five Chapters
1. The First Light (onboarding)
2. The Threadways Open (cross-disciplinary connections)
3. The Deep Fade (harder content, collaboration)
4. The Source (The Forgetting Well)
5. The Kindlers' Legacy (mentoring, ongoing)

### 50 Worlds Across 4 Realms
- **Realm of Discovery** (STEM) — 15 worlds
- **Realm of Expression** (Language Arts) — 15 worlds
- **Realm of Exchange** (Financial Literacy) — 12 worlds
- **The Crossroads** (Cross-Disciplinary Hub) — 8 worlds

### Device Tiers
- **Low**: Entry phones (2GB RAM) — baked lighting, LOD4-5
- **Medium**: Mid-range phones/tablets — partial Lumen, LOD2-3
- **High**: Flagships, recent iPads — full Lumen, LOD1-2
- **Ultra**: PS5, high-end tablets — max quality, local NVIDIA ACE

## Content Rules

- NO likenesses of real people. Name + contribution only
- Quotes attributed with exact source. Uncertain attribution noted
- Indigenous cultural content presented with acknowledgment of living cultures. Not "myths"
- Historical accuracy verifiable. Simplify complexity for ages 5–10, never simplify truth
- No hagiography. Real people had flaws
- MetaHuman characters are original designs, not resemblances

## Quality Gates (Every PR)

1. `npm run format` — Prettier
2. `npm run lint` — ESLint (zero warnings)
3. `npm run typecheck` — TypeScript strict (zero errors)
4. `npm run test` — All tests pass
5. Coverage ≥ 80% on changed files
6. No `any` types
7. No functions > 30 lines
8. No nesting > 3 levels
9. Security scan passes
10. COPPA compliance check (no PII storage without parental consent)
11. Age-appropriateness review for all new content
12. AI cross-model review score ≥ 8/10

## Bible Documents (Source of Truth)

Always check `Bible/` for new files before starting work:
- `koydo-universe-unified-bible-v3.docx` — Latest/comprehensive (vision, architecture, tech stack, characters, content, implementation)
- `koydo-universe-realworld-bible-v2.docx` — Detailed real-world entries with full descriptions
- `koydo-universe-realworld-bible.docx` — Original real-world entries (v1)
