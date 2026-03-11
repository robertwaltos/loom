/**
 * Koydo Universe — Core Content Types
 *
 * The RealWorldEntry schema and related types from the Bible.
 * These define the knowledge graph that underpins every world.
 */

// ─── Entry Classification ─────────────────────────────────────────

export type EntryType =
  | 'event'
  | 'invention'
  | 'discovery'
  | 'person'
  | 'place'
  | 'quote'
  | 'artifact'
  | 'expedition'
  | 'natural_wonder'
  | 'cultural_milestone'
  | 'scientific_principle';

export type Era =
  | 'ancient'
  | 'classical'
  | 'medieval'
  | 'renaissance'
  | 'enlightenment'
  | 'industrial'
  | 'modern'
  | 'contemporary';

export type AdventureType =
  | 'remembrance_wall'
  | 'guided_expedition'
  | 'artifact_hunt'
  | 'reenactment'
  | 'field_trip'
  | 'time_window'
  | 'natural_exploration';

export type DifficultyTier = 1 | 2 | 3; // 1=ages 5-6, 2=ages 7-8, 3=ages 9-10

export type EntryStatus = 'draft' | 'reviewed' | 'published';

// ─── Geographic Data ───────────────────────────────────────────────

export interface GeoLocation {
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
}

// ─── RealWorldEntry — The Core Content Node ────────────────────────

export interface RealWorldEntry {
  readonly id: string;
  readonly type: EntryType;
  readonly title: string;
  readonly year: number | null;
  readonly yearDisplay: string;
  readonly era: Era;
  readonly descriptionChild: string;
  readonly descriptionOlder: string;
  readonly descriptionParent: string;
  readonly realPeople: readonly string[];
  readonly quote: string | null;
  readonly quoteAttribution: string | null;
  readonly geographicLocation: GeoLocation | null;
  readonly continent: string | null;
  readonly subjectTags: readonly string[];
  readonly worldId: string;
  readonly guideId: string;
  readonly adventureType: AdventureType;
  readonly difficultyTier: DifficultyTier;
  readonly prerequisites: readonly string[];
  readonly unlocks: readonly string[];
  readonly funFact: string;
  readonly imagePrompt: string;
  readonly status: EntryStatus;
}

// ─── Entry Connections (Knowledge Graph Edges) ─────────────────────

export interface EntryConnection {
  readonly id: string;
  readonly fromEntryId: string;
  readonly toEntryId: string;
  readonly connectionType: 'related' | 'prerequisite' | 'unlocks' | 'cross_world';
}

// ─── Curriculum Mapping ────────────────────────────────────────────

export type CurriculumStandard = 'common_core' | 'ngss' | 'state_financial_literacy';

export interface EntryCurriculumMap {
  readonly id: string;
  readonly entryId: string;
  readonly standard: CurriculumStandard;
  readonly standardCode: string;
  readonly description: string;
}

// ─── Media Assets ──────────────────────────────────────────────────

export type MediaAssetType = 'remembrance_art' | 'field_trip_env' | 'artifact_visual' | 'audio' | 'render';

export interface EntryMediaAsset {
  readonly id: string;
  readonly entryId: string;
  readonly assetType: MediaAssetType;
  readonly url: string;
  readonly generatedAt: number;
  readonly provider: 'fal_ai' | 'manual' | 'metahuman';
}

// ─── Quiz / Assessment ─────────────────────────────────────────────

export interface EntryQuizQuestion {
  readonly id: string;
  readonly entryId: string;
  readonly difficultyTier: DifficultyTier;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}
