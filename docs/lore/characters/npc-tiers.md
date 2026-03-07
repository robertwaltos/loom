# NPC Tier Architecture

## Overview

NPCs in The Concord exist on a four-tier hierarchy, each with distinct AI capabilities, memory persistence, and narrative significance.

## Tier 1 — Crowd Agents

- **Count:** ~100,000 per world
- **Technology:** Mass Entity Framework, rule-based behavior
- **Memory:** None (stateless)
- **Identity:** Anonymous, no Chronicle entry
- **Purpose:** Population atmosphere, economic background activity

## Tier 2 — Inhabitants

- **Count:** ~10,000 per world
- **Technology:** Behavior trees with limited context
- **Memory:** 90-day rolling window
- **Identity:** Named but not recorded in Chronicle
- **Purpose:** Quest givers, merchants, service providers

## Tier 3 — Notable Agents

- **Count:** ~1,000 per world
- **Technology:** LLM-powered (Claude Haiku)
- **Memory:** Permanent, cross-session
- **Identity:** Full character history, relationships, goals. Recorded in Chronicle
- **Purpose:** Political figures, faction leaders, knowledge keepers, economic movers

## Tier 4 — Architect's Agents

- **Count:** 10-50 across all worlds
- **Technology:** Claude Opus, highest-tier AI
- **Memory:** Permanent, universe-scale awareness
- **Identity:** Canonical lore figures, first-class Chronicle entities
- **Purpose:** Drive world-scale narrative events, embody civilisational forces, serve as The Architect's presence in the world

## Design Constraints

- Tier 1 MUST use Mass Entity Framework (never Character Blueprint for crowds)
- Tier 3+ NPCs are economic participants — they hold KALON, trade, and are subject to wealth zones
- Tier 4 NPCs persist even if their host world is compromised — they migrate via Silfen Weave
- All Tier 3+ transitions are permanent and recorded in The Chronicle
- NPC dynasties follow the same continuity rules as player dynasties
