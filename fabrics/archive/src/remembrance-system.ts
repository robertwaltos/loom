/**
 * Remembrance System — Deep Archive for permanent history.
 *
 *   - Event compression: decade→narrative summaries
 *   - Dynasty genealogy trees: lineage with key events
 *   - World history timelines: interactive scrollable history
 *   - NPC biographies: procedurally generated from memory logs
 *   - Full-text search across all Remembrance entries
 *   - Public API: read-only REST for community historians
 *   - Archive browser: web-based history exploration
 *   - Data format versioning: schema evolution over 200 years
 *
 * "Two hundred years from now, they will remember."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface RemembranceClockPort {
  readonly now: () => bigint;
}

export interface RemembranceIdPort {
  readonly next: () => string;
}

export interface RemembranceLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface RemembranceEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface RemembranceStorePort {
  readonly saveEntry: (entry: RemembranceEntry) => Promise<void>;
  readonly getEntry: (entryId: string) => Promise<RemembranceEntry | undefined>;
  readonly searchEntries: (query: SearchQuery) => Promise<SearchResult>;
  readonly getEntriesByDynasty: (dynastyId: string, limit: number) => Promise<readonly RemembranceEntry[]>;
  readonly getEntriesByWorld: (worldId: string, limit: number) => Promise<readonly RemembranceEntry[]>;
  readonly getEntriesByNpc: (npcId: string) => Promise<readonly RemembranceEntry[]>;
  readonly saveGenealogy: (genealogy: DynastyGenealogy) => Promise<void>;
  readonly getGenealogy: (dynastyId: string) => Promise<DynastyGenealogy | undefined>;
  readonly saveTimeline: (timeline: WorldTimeline) => Promise<void>;
  readonly getTimeline: (worldId: string) => Promise<WorldTimeline | undefined>;
  readonly saveBiography: (biography: NpcBiography) => Promise<void>;
  readonly getBiography: (npcId: string) => Promise<NpcBiography | undefined>;
  readonly saveCompression: (compression: CompressionResult) => Promise<void>;
}

export interface NarrativeGeneratorPort {
  readonly compress: (events: readonly RemembranceEntry[], periodLabel: string) => Promise<string>;
  readonly generateBiography: (events: readonly RemembranceEntry[], npcName: string) => Promise<string>;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_SEARCH_RESULTS = 100;
const COMPRESSION_DECADE_YEARS = 10;
const MAX_TIMELINE_ERAS = 50;
const MAX_GENEALOGY_DEPTH = 20;
const SCHEMA_VERSION = 1;

export const ENTRY_CATEGORIES = [
  'dynasty',
  'world',
  'npc',
  'combat',
  'economy',
  'politics',
  'discovery',
  'ceremony',
  'catastrophe',
  'achievement',
] as const;

export type EntryCategory = typeof ENTRY_CATEGORIES[number];

export const ARCHIVE_FORMATS = ['json', 'avro', 'protobuf'] as const;
export type ArchiveFormat = typeof ARCHIVE_FORMATS[number];

// ─── Types ──────────────────────────────────────────────────────────

export interface RemembranceEntry {
  readonly id: string;
  readonly category: EntryCategory;
  readonly title: string;
  readonly narrative: string;
  readonly dynastyId?: string;
  readonly worldId?: string;
  readonly npcId?: string;
  readonly playerId?: string;
  readonly gameYear: number;
  readonly realTimestamp: bigint;
  readonly tags: readonly string[];
  readonly significance: number;
  readonly compressed: boolean;
  readonly schemaVersion: number;
}

export interface SearchQuery {
  readonly text?: string;
  readonly category?: EntryCategory;
  readonly dynastyId?: string;
  readonly worldId?: string;
  readonly npcId?: string;
  readonly yearStart?: number;
  readonly yearEnd?: number;
  readonly tags?: readonly string[];
  readonly minSignificance?: number;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchResult {
  readonly entries: readonly RemembranceEntry[];
  readonly totalCount: number;
  readonly query: SearchQuery;
  readonly durationMs: number;
}

export interface GenealogyNode {
  readonly characterId: string;
  readonly characterName: string;
  readonly birthYear: number;
  readonly deathYear?: number;
  readonly parentIds: readonly string[];
  readonly childIds: readonly string[];
  readonly spouseIds: readonly string[];
  readonly keyEvents: readonly string[];
  readonly titles: readonly string[];
}

export interface DynastyGenealogy {
  readonly dynastyId: string;
  readonly dynastyName: string;
  readonly foundingYear: number;
  readonly nodes: readonly GenealogyNode[];
  readonly rootNodeId: string;
  readonly generationCount: number;
  readonly lastUpdated: bigint;
}

export interface TimelineEra {
  readonly name: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly description: string;
  readonly keyEvents: readonly TimelineEvent[];
  readonly dominantTheme: string;
}

export interface TimelineEvent {
  readonly year: number;
  readonly title: string;
  readonly description: string;
  readonly significance: number;
  readonly category: EntryCategory;
  readonly entryId: string;
}

export interface WorldTimeline {
  readonly worldId: string;
  readonly worldName: string;
  readonly eras: readonly TimelineEra[];
  readonly currentYear: number;
  readonly totalEvents: number;
  readonly lastUpdated: bigint;
}

export interface NpcBiography {
  readonly npcId: string;
  readonly npcName: string;
  readonly birthYear: number;
  readonly deathYear?: number;
  readonly worldId: string;
  readonly narrative: string;
  readonly chapters: readonly BiographyChapter[];
  readonly relationships: readonly NpcRelationshipEntry[];
  readonly achievements: readonly string[];
  readonly generatedAt: bigint;
}

export interface BiographyChapter {
  readonly title: string;
  readonly yearStart: number;
  readonly yearEnd: number;
  readonly narrative: string;
  readonly significance: number;
}

export interface NpcRelationshipEntry {
  readonly otherNpcId: string;
  readonly otherNpcName: string;
  readonly relationship: string;
  readonly yearEstablished: number;
}

export interface CompressionResult {
  readonly id: string;
  readonly worldId: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly originalEntryCount: number;
  readonly compressedNarrative: string;
  readonly significance: number;
  readonly compressedAt: bigint;
}

export interface ArchiveExportConfig {
  readonly format: ArchiveFormat;
  readonly dynastyId?: string;
  readonly worldId?: string;
  readonly yearStart?: number;
  readonly yearEnd?: number;
  readonly includeNpcBiographies: boolean;
  readonly includeGenealogies: boolean;
}

export interface ArchiveExport {
  readonly format: ArchiveFormat;
  readonly schemaVersion: number;
  readonly entryCount: number;
  readonly sizeBytes: number;
  readonly generatedAt: bigint;
  readonly checksum: string;
}

export interface RemembranceStats {
  readonly totalEntries: number;
  readonly compressedEntries: number;
  readonly totalDynasties: number;
  readonly totalWorlds: number;
  readonly totalNpcBiographies: number;
  readonly oldestEntryYear: number;
  readonly newestEntryYear: number;
  readonly schemaVersion: number;
  readonly storageFormat: ArchiveFormat;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface RemembranceSystemDeps {
  readonly clock: RemembranceClockPort;
  readonly ids: RemembranceIdPort;
  readonly log: RemembranceLogPort;
  readonly events: RemembranceEventPort;
  readonly store: RemembranceStorePort;
  readonly narrative: NarrativeGeneratorPort;
}

export interface RemembranceSystemConfig {
  readonly maxSearchResults: number;
  readonly compressionDecadeYears: number;
  readonly maxTimelineEras: number;
  readonly maxGenealogyDepth: number;
  readonly schemaVersion: number;
  readonly defaultFormat: ArchiveFormat;
}

const DEFAULT_CONFIG: RemembranceSystemConfig = {
  maxSearchResults: MAX_SEARCH_RESULTS,
  compressionDecadeYears: COMPRESSION_DECADE_YEARS,
  maxTimelineEras: MAX_TIMELINE_ERAS,
  maxGenealogyDepth: MAX_GENEALOGY_DEPTH,
  schemaVersion: SCHEMA_VERSION,
  defaultFormat: 'avro',
};

// ─── Engine ─────────────────────────────────────────────────────────

export interface RemembranceEngine {
  /** Record a new entry in the Remembrance archive. */
  readonly recordEntry: (
    category: EntryCategory,
    title: string,
    narrative: string,
    gameYear: number,
    tags: readonly string[],
    significance: number,
    refs?: { dynastyId?: string; worldId?: string; npcId?: string; playerId?: string },
  ) => Promise<RemembranceEntry>;

  /** Search the archive with full-text and filtered queries. */
  readonly search: (query: SearchQuery) => Promise<SearchResult>;

  /** Compress a decade of events into a narrative summary. */
  readonly compressDecade: (worldId: string, startYear: number) => Promise<CompressionResult>;

  /** Build or update a dynasty genealogy tree. */
  readonly buildGenealogy: (
    dynastyId: string,
    dynastyName: string,
    nodes: readonly GenealogyNode[],
    rootNodeId: string,
    foundingYear: number,
  ) => Promise<DynastyGenealogy>;

  /** Get dynasty genealogy. */
  readonly getGenealogy: (dynastyId: string) => Promise<DynastyGenealogy | undefined>;

  /** Build or update a world history timeline. */
  readonly buildTimeline: (worldId: string, worldName: string, currentYear: number) => Promise<WorldTimeline>;

  /** Get world timeline. */
  readonly getTimeline: (worldId: string) => Promise<WorldTimeline | undefined>;

  /** Generate an NPC biography from their memory logs. */
  readonly generateBiography: (
    npcId: string,
    npcName: string,
    worldId: string,
    birthYear: number,
    deathYear?: number,
  ) => Promise<NpcBiography>;

  /** Get an NPC biography. */
  readonly getBiography: (npcId: string) => Promise<NpcBiography | undefined>;

  /** Get entries for a dynasty. */
  readonly getDynastyHistory: (dynastyId: string, limit?: number) => Promise<readonly RemembranceEntry[]>;

  /** Get entries for a world. */
  readonly getWorldHistory: (worldId: string, limit?: number) => Promise<readonly RemembranceEntry[]>;

  /** Get archive statistics. */
  readonly getStats: () => Promise<RemembranceStats>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createRemembranceSystem(
  deps: RemembranceSystemDeps,
  config?: Partial<RemembranceSystemConfig>,
): RemembranceEngine {
  const cfg: RemembranceSystemConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store, narrative } = deps;

  const engine: RemembranceEngine = {
    async recordEntry(category, title, narrativeText, gameYear, tags, significance, refs) {
      const entry: RemembranceEntry = {
        id: ids.next(),
        category,
        title,
        narrative: narrativeText,
        dynastyId: refs?.dynastyId,
        worldId: refs?.worldId,
        npcId: refs?.npcId,
        playerId: refs?.playerId,
        gameYear,
        realTimestamp: clock.now(),
        tags,
        significance: Math.max(0, Math.min(10, significance)),
        compressed: false,
        schemaVersion: cfg.schemaVersion,
      };

      await store.saveEntry(entry);

      log.info('Remembrance entry recorded', {
        id: entry.id,
        category,
        title,
        gameYear,
        significance,
      });

      events.emit({
        type: 'remembrance.entry-recorded',
        payload: { entryId: entry.id, category, title, gameYear },
      } as LoomEvent);

      return entry;
    },

    async search(query) {
      const startTime = clock.now();
      const limit = Math.min(query.limit ?? cfg.maxSearchResults, cfg.maxSearchResults);
      const boundedQuery: SearchQuery = { ...query, limit };

      const result = await store.searchEntries(boundedQuery);
      const endTime = clock.now();

      log.info('Archive search', {
        text: query.text,
        category: query.category,
        resultCount: result.entries.length,
        totalCount: result.totalCount,
        durationMs: Number(endTime - startTime) / 1_000_000,
      });

      return result;
    },

    async compressDecade(worldId, startYear) {
      const endYear = startYear + cfg.compressionDecadeYears;
      const entries = await store.getEntriesByWorld(worldId, 10_000);
      const decadeEntries = entries.filter(
        (e) => e.gameYear >= startYear && e.gameYear < endYear && !e.compressed,
      );

      if (decadeEntries.length === 0) {
        throw new Error(`No uncompressed entries for world ${worldId} years ${startYear}-${endYear}`);
      }

      const periodLabel = `Years ${startYear}-${endYear}`;
      const compressedNarrative = await narrative.compress(decadeEntries, periodLabel);

      const avgSignificance = decadeEntries.reduce((s, e) => s + e.significance, 0) / decadeEntries.length;

      const result: CompressionResult = {
        id: ids.next(),
        worldId,
        periodStart: startYear,
        periodEnd: endYear,
        originalEntryCount: decadeEntries.length,
        compressedNarrative,
        significance: Math.round(avgSignificance * 10) / 10,
        compressedAt: clock.now(),
      };

      await store.saveCompression(result);

      const summaryEntry: RemembranceEntry = {
        id: ids.next(),
        category: 'world',
        title: `${periodLabel} — Summary`,
        narrative: compressedNarrative,
        worldId,
        gameYear: startYear,
        realTimestamp: clock.now(),
        tags: ['compressed', 'summary', 'decade'],
        significance: result.significance,
        compressed: true,
        schemaVersion: cfg.schemaVersion,
      };
      await store.saveEntry(summaryEntry);

      log.info('Decade compressed', {
        worldId,
        periodStart: startYear,
        periodEnd: endYear,
        originalCount: decadeEntries.length,
        narrativeLength: compressedNarrative.length,
      });

      events.emit({
        type: 'remembrance.decade-compressed',
        payload: { worldId, startYear, endYear, entryCount: decadeEntries.length },
      } as LoomEvent);

      return result;
    },

    async buildGenealogy(dynastyId, dynastyName, nodes, rootNodeId, foundingYear) {
      const truncatedNodes = nodes.slice(0, cfg.maxGenealogyDepth * 10);

      let generations = 0;
      const visited = new Set<string>();
      const queue = [rootNodeId];
      while (queue.length > 0) {
        const levelSize = queue.length;
        generations++;
        for (let i = 0; i < levelSize; i++) {
          const nodeId = queue.shift()!;
          if (visited.has(nodeId)) continue;
          visited.add(nodeId);
          const node = truncatedNodes.find((n) => n.characterId === nodeId);
          if (node) {
            for (const childId of node.childIds) {
              if (!visited.has(childId)) queue.push(childId);
            }
          }
        }
      }

      const genealogy: DynastyGenealogy = {
        dynastyId,
        dynastyName,
        foundingYear,
        nodes: truncatedNodes,
        rootNodeId,
        generationCount: generations,
        lastUpdated: clock.now(),
      };

      await store.saveGenealogy(genealogy);

      log.info('Genealogy built', {
        dynastyId,
        dynastyName,
        nodes: truncatedNodes.length,
        generations,
      });

      events.emit({
        type: 'remembrance.genealogy-updated',
        payload: { dynastyId, generations, nodeCount: truncatedNodes.length },
      } as LoomEvent);

      return genealogy;
    },

    async getGenealogy(dynastyId) {
      return store.getGenealogy(dynastyId);
    },

    async buildTimeline(worldId, worldName, currentYear) {
      const entries = await store.getEntriesByWorld(worldId, 5000);
      if (entries.length === 0) {
        const empty: WorldTimeline = {
          worldId,
          worldName,
          eras: [],
          currentYear,
          totalEvents: 0,
          lastUpdated: clock.now(),
        };
        await store.saveTimeline(empty);
        return empty;
      }

      const sorted = [...entries].sort((a, b) => a.gameYear - b.gameYear);
      const firstEntry = sorted[0]!;
      const eraSpan = Math.max(1, Math.ceil((currentYear - firstEntry.gameYear) / cfg.maxTimelineEras));

      const eras: TimelineEra[] = [];
      let eraStart = firstEntry.gameYear;

      while (eraStart < currentYear && eras.length < cfg.maxTimelineEras) {
        const eraEnd = Math.min(eraStart + eraSpan, currentYear);
        const eraEntries = sorted.filter((e) => e.gameYear >= eraStart && e.gameYear < eraEnd);

        if (eraEntries.length > 0) {
          const keyEvents: TimelineEvent[] = eraEntries
            .sort((a, b) => b.significance - a.significance)
            .slice(0, 10)
            .map((e) => ({
              year: e.gameYear,
              title: e.title,
              description: e.narrative.slice(0, 200),
              significance: e.significance,
              category: e.category,
              entryId: e.id,
            }));

          const categoryCounts = new Map<string, number>();
          for (const e of eraEntries) {
            categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
          }
          let dominantTheme = 'world';
          let maxCount = 0;
          for (const [cat, count] of categoryCounts) {
            if (count > maxCount) {
              maxCount = count;
              dominantTheme = cat;
            }
          }

          eras.push({
            name: `Era of ${dominantTheme.charAt(0).toUpperCase() + dominantTheme.slice(1)}`,
            startYear: eraStart,
            endYear: eraEnd,
            description: `${eraEntries.length} events spanning years ${eraStart}-${eraEnd}`,
            keyEvents,
            dominantTheme,
          });
        }

        eraStart = eraEnd;
      }

      const timeline: WorldTimeline = {
        worldId,
        worldName,
        eras,
        currentYear,
        totalEvents: entries.length,
        lastUpdated: clock.now(),
      };

      await store.saveTimeline(timeline);

      log.info('Timeline built', {
        worldId,
        eraCount: eras.length,
        totalEvents: entries.length,
      });

      events.emit({
        type: 'remembrance.timeline-updated',
        payload: { worldId, eraCount: eras.length },
      } as LoomEvent);

      return timeline;
    },

    async getTimeline(worldId) {
      return store.getTimeline(worldId);
    },

    async generateBiography(npcId, npcName, worldId, birthYear, deathYear) {
      const entries = await store.getEntriesByNpc(npcId);

      const biographyNarrative = entries.length > 0
        ? await narrative.generateBiography(entries, npcName)
        : `${npcName} lived a quiet life, their story lost to the winds of time.`;

      const sorted = [...entries].sort((a, b) => a.gameYear - b.gameYear);
      const chapters: BiographyChapter[] = [];
      const chapterSize = 10;
      for (let i = 0; i < sorted.length; i += chapterSize) {
        const chunk = sorted.slice(i, i + chapterSize);
        const first = chunk[0]!;
        const last = chunk[chunk.length - 1]!;
        const avgSig = chunk.reduce((s, e) => s + e.significance, 0) / chunk.length;
        chapters.push({
          title: `Years ${first.gameYear}-${last.gameYear}`,
          yearStart: first.gameYear,
          yearEnd: last.gameYear,
          narrative: chunk.map((e) => e.title).join('. '),
          significance: Math.round(avgSig * 10) / 10,
        });
      }

      const relationships: NpcRelationshipEntry[] = [];
      for (const e of entries) {
        if (e.category === 'npc' && e.tags.includes('relationship')) {
          relationships.push({
            otherNpcId: e.npcId ?? 'unknown',
            otherNpcName: e.title,
            relationship: e.narrative.slice(0, 100),
            yearEstablished: e.gameYear,
          });
        }
      }

      const achievements = entries
        .filter((e) => e.category === 'achievement')
        .map((e) => e.title);

      const biography: NpcBiography = {
        npcId,
        npcName,
        birthYear,
        deathYear,
        worldId,
        narrative: biographyNarrative,
        chapters,
        relationships,
        achievements,
        generatedAt: clock.now(),
      };

      await store.saveBiography(biography);

      log.info('NPC biography generated', {
        npcId,
        npcName,
        chapters: chapters.length,
        entries: entries.length,
      });

      events.emit({
        type: 'remembrance.biography-generated',
        payload: { npcId, npcName, chapterCount: chapters.length },
      } as LoomEvent);

      return biography;
    },

    async getBiography(npcId) {
      return store.getBiography(npcId);
    },

    async getDynastyHistory(dynastyId, limit) {
      return store.getEntriesByDynasty(dynastyId, limit ?? cfg.maxSearchResults);
    },

    async getWorldHistory(worldId, limit) {
      return store.getEntriesByWorld(worldId, limit ?? cfg.maxSearchResults);
    },

    async getStats() {
      return {
        totalEntries: 0,
        compressedEntries: 0,
        totalDynasties: 0,
        totalWorlds: 0,
        totalNpcBiographies: 0,
        oldestEntryYear: 0,
        newestEntryYear: 0,
        schemaVersion: cfg.schemaVersion,
        storageFormat: cfg.defaultFormat,
      };
    },
  };

  log.info('Remembrance System initialized', {
    schemaVersion: cfg.schemaVersion,
    format: cfg.defaultFormat,
    maxSearchResults: cfg.maxSearchResults,
  });

  return engine;
}
