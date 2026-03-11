# Koydo Universe — Product Code

This directory contains ALL product-specific code for Koydo Universe.
Nothing in this directory should ever be merged upstream to The Loom engine.

## Structure

| Directory | Purpose |
|-----------|---------|
| `worlds/` | World definitions and configurations (50 worlds) |
| `characters/` | Character profiles and LLM system prompts (50 guides) |
| `content/` | RealWorldEntry data and curriculum mappings |
| `adventures/` | Adventure type implementations (7 types) |
| `fading/` | The Fading mechanic — luminance tied to learning activity |
| `kindler/` | Player progression system — Spark, chapters |
| `safety/` | COPPA compliance, content moderation, parental controls |
| `parent-dashboard/` | Parent-facing web API and dashboard |
| `media-pipeline/` | fal.ai → MetaHuman → UE5 asset pipeline |
| `revenue/` | Subscription management, Epic royalty tracking |

## Rules

1. **Never import from `koydo` (EdTech) repo** — these are separate codebases
2. **Engine abstractions only** — use Loom engine Ports & Adapters, never bypass
3. **COPPA compliance is mandatory** — no PII without parental consent
4. **Age-appropriate content only** — target ages 5–10
5. **Fact-check everything** — all RealWorldEntry content must be verifiable
