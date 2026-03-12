/**
 * character-bible-types.ts — Canonical types for the Concord Character Bible.
 *
 * These types encode the structured character data from the game bible
 * into the entity system. Every NPC in the Concord is built from a
 * CharacterEntry, which drives identity, appearance, AI tier, faction,
 * and world placement.
 *
 * Bible volumes are append-only once published. These types model the
 * immutable canonical character data that the world-seed system consumes.
 */

import type { ApparentSex, AgeRange, BodyBuild } from './character-appearance.js';

// ── Faction Classification ──────────────────────────────────────

/**
 * Top-level factions from the Concord bible.
 * These determine Assembly politics, world sovereignty, and NPC allegiance.
 */
export type ConcordFaction =
  | 'singular'
  | 'independent'
  | 'continuationist'
  | 'returnist'
  | 'survey-corps'
  | 'lattice-covenant'
  | 'kalon-oversight'
  | 'academic'
  | 'defence-forces'
  | 'founding'
  | 'ascendancy'
  | 'assembly'
  | 'industrial-consortium'
  | 'free-port-compact';

/**
 * Bible character tier — matches NPC tier system.
 *   TIER_4: Architect's Circle (singular or near-singular)
 *   TIER_3: Assembly Members & Institutional Figures
 *   TIER_2: Notables (world-level leaders, scholars)
 *   TIER_1: Inhabitants (daily routines, local presence)
 *   TIER_0: Ambient (crowd members, unnamed)
 */
export type BibleTier = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';

// ── MetaHuman Mapping ───────────────────────────────────────────

/**
 * MetaHuman Creator configuration derived from the Visual Manifest CSV.
 * These values map directly to MetaHuman blueprint parameters.
 */
export interface MetaHumanConfig {
  /** Base preset from MetaHuman Creator (e.g. 'F_AfricanAmerican_03'). */
  readonly presetBase: string;
  /** Age slider [0-100]. */
  readonly ageSlider: number;
  /** Weight slider [0-100]. */
  readonly weightSlider: number;
  /** Muscle slider [0-100]. */
  readonly muscleSlider: number;
  /** Skin complexity level. */
  readonly skinComplexity: 'low_complexity' | 'medium_complexity' | 'high_complexity' | 'maximum_complexity';
}

// ── Expression States ───────────────────────────────────────────

/**
 * Three-state expression system from the Character Bible.
 * Each NPC has default, secondary, and rare expressions
 * that drive facial animation blend shapes.
 */
export interface ExpressionSet {
  /** Resting expression — shown most of the time. */
  readonly defaultExpression: string;
  /** Contextual shift — triggered by specific interactions. */
  readonly secondaryExpression: string;
  /** Rare tell — visible only in specific emotional moments. */
  readonly rareExpression: string;
}

// ── Appearance Description ──────────────────────────────────────

/**
 * Physical appearance data from the Visual Manifest CSV.
 * This is the canonical visual spec for each character.
 */
export interface BibleAppearance {
  readonly apparentSex: ApparentSex;
  readonly ageApprox: string;
  readonly ethnicityInspiration: string;
  readonly build: string;
  readonly height: 'short' | 'medium-short' | 'medium' | 'tall';
  readonly hairColor: string;
  readonly hairStyle: string;
  readonly eyeColor: string;
  readonly skinTone: string;
  readonly distinguishingFeatures: string;
}

// ── Costume ─────────────────────────────────────────────────────

/**
 * Costume data from the Visual Manifest — drives outfit
 * asset selection and accessory binding in UE5.
 */
export interface BibleCostume {
  readonly primary: string;
  readonly detail: string;
  readonly accessories: string;
}

// ── Image Generation Prompts ────────────────────────────────────

/**
 * Pre-authored T2I prompts from the Visual Manifest.
 * These are optimized for Gemini and Grok image generation
 * pipelines and produce consistent character portraits.
 */
export interface GenerationPrompts {
  readonly geminiPrompt: string;
  readonly grokPrompt: string;
}

// ── Character Entry ─────────────────────────────────────────────

/**
 * A single canonical character from the Concord Bible.
 *
 * This is the source-of-truth for NPC identity, appearance,
 * personality, and world placement. The world-seed system
 * transforms CharacterEntries into live entities with full
 * component stacks.
 */
export interface CharacterEntry {
  /** Bible character ID (1-based, matches CSV character_id). */
  readonly characterId: number;
  /** Display name (e.g. 'Itoro Adeyemi-Okafor'). */
  readonly displayName: string;
  /** Title if any (e.g. 'Commodore (Ret.)', 'Dr.', 'Brother'). */
  readonly title: string | null;
  /** Bible tier classification. */
  readonly tier: BibleTier;
  /** Faction affiliation. */
  readonly faction: ConcordFaction;
  /** Appearance specification. */
  readonly appearance: BibleAppearance;
  /** Costume specification. */
  readonly costume: BibleCostume;
  /** Expression states for facial animation. */
  readonly expressions: ExpressionSet;
  /** MetaHuman Creator configuration. */
  readonly metaHuman: MetaHumanConfig;
  /** T2I generation prompts. */
  readonly generationPrompts: GenerationPrompts;
  /** Home world ID (e.g. 'alkahest', 'meridians-rest'). */
  readonly homeWorldId: string | null;
  /** Whether this character can be encountered on multiple worlds. */
  readonly isMultiWorld: boolean;
  /** Default hostility toward players. */
  readonly hostility: 'friendly' | 'neutral' | 'hostile';
  /** Available interactions. */
  readonly interactions: ReadonlyArray<'talk' | 'trade' | 'inspect' | 'use'>;
  /** Canonical health pool. */
  readonly baseHealth: number;
  /** Awareness radius in world units. */
  readonly awarenessRadius: number;
}

// ── World Properties ────────────────────────────────────────────

/**
 * Stellar classification per the World Design Bible.
 * Determines KALON issuance multiplier and habitability.
 */
export type StellarClass = 'G' | 'K' | 'M' | 'F' | 'binary' | 'anomalous';

/**
 * Sovereignty type — who governs this world.
 */
export type SovereigntyType =
  | 'assembly-common-trust'
  | 'founding-family'
  | 'commonwealth-trust'
  | 'industrial-consortium'
  | 'lattice-covenant'
  | 'contested'
  | 'survey-corps'
  | 'free-port-compact'
  | 'player-dynasty'
  | 'npc-regent';

/**
 * A canonical world from the World Design Bible.
 * The five properties (stellar class, node density, lattice integrity,
 * population, historical state hash) plus narrative context.
 */
export interface WorldEntry {
  /** World number (1-based, matches bible ordering). */
  readonly worldNumber: number;
  /** Canonical world name. */
  readonly name: string;
  /** URL-safe identifier (e.g. 'alkahest', 'meridians-rest'). */
  readonly worldId: string;
  /** Stellar classification with subtype. */
  readonly stellarClassFull: string;
  /** Simplified stellar class for issuance multiplier. */
  readonly stellarClass: StellarClass;
  /** Lattice node density [1-10]. */
  readonly nodeDensity: number;
  /** NPC population count. */
  readonly population: number;
  /** Transient population (traders, visitors). */
  readonly transientPopulation: number;
  /** KALON issuance per year in millions. */
  readonly kalonIssuanceMillions: number;
  /** Lattice integrity [0-100]%. */
  readonly latticeIntegrity: number;
  /** Current sovereignty type. */
  readonly sovereignty: SovereigntyType;
  /** Year of first Lattice lock. */
  readonly surveyYear: number;
  /** One-line character description. */
  readonly characterSummary: string;
  /** Assigned bible character IDs for this world. */
  readonly residentCharacterIds: ReadonlyArray<number>;
}
