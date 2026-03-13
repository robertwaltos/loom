import { describe, expect, it } from 'vitest';
import {
  createRemembranceSystem,
  type CompressionResult,
  type DynastyGenealogy,
  type NpcBiography,
  type RemembranceEntry,
  type RemembranceStorePort,
  type SearchQuery,
  type SearchResult,
  type WorldTimeline,
} from '../remembrance-system.js';

function createClock(start = 1_000_000n) {
  let now = start;
  return {
    now: () => {
      now += 1_000n;
      return now;
    },
  };
}

function createIds(prefix = 'rem') {
  let seq = 0;
  return {
    next: () => `${prefix}-${++seq}`,
  };
}

function createStore() {
  const entries = new Map<string, RemembranceEntry>();
  const genealogy = new Map<string, DynastyGenealogy>();
  const timelines = new Map<string, WorldTimeline>();
  const biographies = new Map<string, NpcBiography>();
  const compressions: CompressionResult[] = [];
  let lastSearch: SearchQuery | undefined;

  const store: RemembranceStorePort = {
    saveEntry: async (entry) => {
      entries.set(entry.id, entry);
    },
    getEntry: async (entryId) => entries.get(entryId),
    searchEntries: async (query) => {
      lastSearch = query;
      const list = [...entries.values()];
      return {
        entries: list.slice(0, query.limit ?? 100),
        totalCount: list.length,
        query,
        durationMs: 1,
      } satisfies SearchResult;
    },
    getEntriesByDynasty: async (dynastyId, limit) =>
      [...entries.values()].filter((e) => e.dynastyId === dynastyId).slice(0, limit),
    getEntriesByWorld: async (worldId, limit) =>
      [...entries.values()].filter((e) => e.worldId === worldId).slice(0, limit),
    getEntriesByNpc: async (npcId) => [...entries.values()].filter((e) => e.npcId === npcId),
    saveGenealogy: async (g) => {
      genealogy.set(g.dynastyId, g);
    },
    getGenealogy: async (dynastyId) => genealogy.get(dynastyId),
    saveTimeline: async (timeline) => {
      timelines.set(timeline.worldId, timeline);
    },
    getTimeline: async (worldId) => timelines.get(worldId),
    saveBiography: async (biography) => {
      biographies.set(biography.npcId, biography);
    },
    getBiography: async (npcId) => biographies.get(npcId),
    saveCompression: async (compression) => {
      compressions.push(compression);
    },
  };

  return {
    store,
    entries,
    compressions,
    getLastSearch: () => lastSearch,
  };
}

function createSystem() {
  const events: string[] = [];
  const logs: string[] = [];
  const storeState = createStore();

  const system = createRemembranceSystem(
    {
      clock: createClock(),
      ids: createIds(),
      log: {
        info: (msg) => {
          logs.push(msg);
        },
        warn: (msg) => {
          logs.push(`warn:${msg}`);
        },
        error: (msg) => {
          logs.push(`error:${msg}`);
        },
      },
      events: {
        emit: (event) => {
          events.push(String(event.type));
        },
      },
      store: storeState.store,
      narrative: {
        compress: async (entries, periodLabel) =>
          `${periodLabel} :: ${entries.map((e) => e.title).join(' | ')}`,
        generateBiography: async (entries, npcName) =>
          `${npcName}: ${entries.map((e) => e.title).join(', ')}`,
      },
    },
    {
      maxSearchResults: 3,
      maxGenealogyDepth: 2,
      maxTimelineEras: 3,
      defaultFormat: 'json',
      schemaVersion: 9,
    },
  );

  return { system, events, logs, storeState };
}

describe('RemembranceSystem simulation', () => {
  it('records entries, clamps significance, and emits event', async () => {
    const { system, events, storeState } = createSystem();

    const entry = await system.recordEntry(
      'dynasty',
      'Founding',
      'A dynasty was founded.',
      12,
      ['founding'],
      99,
      { dynastyId: 'dyn-1', worldId: 'world-1' },
    );

    expect(entry.id).toBe('rem-1');
    expect(entry.significance).toBe(10);
    expect(entry.schemaVersion).toBe(9);
    expect(events).toContain('remembrance.entry-recorded');
    expect(storeState.entries.get(entry.id)?.title).toBe('Founding');
  });

  it('bounds search limit to configured max', async () => {
    const { system, storeState } = createSystem();
    await system.recordEntry('world', 'A', 'a', 1, [], 1, { worldId: 'w' });
    await system.recordEntry('world', 'B', 'b', 2, [], 2, { worldId: 'w' });
    await system.recordEntry('world', 'C', 'c', 3, [], 3, { worldId: 'w' });
    await system.recordEntry('world', 'D', 'd', 4, [], 4, { worldId: 'w' });

    const result = await system.search({ worldId: 'w', limit: 20 });

    expect(result.entries).toHaveLength(3);
    expect(storeState.getLastSearch()?.limit).toBe(3);
  });

  it('compresses decade entries and writes compressed summary entry', async () => {
    const { system, events, storeState } = createSystem();

    await system.recordEntry('world', 'Y10', 'n1', 10, [], 4, { worldId: 'w-1' });
    await system.recordEntry('world', 'Y11', 'n2', 11, [], 6, { worldId: 'w-1' });
    await system.recordEntry('world', 'Y25', 'n3', 25, [], 8, { worldId: 'w-1' });

    const compression = await system.compressDecade('w-1', 10);

    expect(compression.originalEntryCount).toBe(2);
    expect(compression.periodEnd).toBe(20);
    expect(compression.significance).toBe(5);
    expect(storeState.compressions).toHaveLength(1);
    expect(events).toContain('remembrance.decade-compressed');
    const savedCompressed = [...storeState.entries.values()].find((e) => e.compressed);
    expect(savedCompressed?.title).toContain('Years 10-20');
  });

  it('throws when compressing with no eligible decade entries', async () => {
    const { system } = createSystem();
    await expect(system.compressDecade('unknown', 0)).rejects.toThrow('No uncompressed entries');
  });

  it('builds genealogy with truncation and computed generations', async () => {
    const { system } = createSystem();

    const nodes = [
      {
        characterId: 'root',
        characterName: 'Root',
        birthYear: 1,
        parentIds: [],
        childIds: ['c1', 'c2'],
        spouseIds: [],
        keyEvents: [],
        titles: ['Founder'],
      },
      {
        characterId: 'c1',
        characterName: 'Child 1',
        birthYear: 10,
        parentIds: ['root'],
        childIds: ['gc1'],
        spouseIds: [],
        keyEvents: [],
        titles: [],
      },
      {
        characterId: 'c2',
        characterName: 'Child 2',
        birthYear: 11,
        parentIds: ['root'],
        childIds: [],
        spouseIds: [],
        keyEvents: [],
        titles: [],
      },
      {
        characterId: 'gc1',
        characterName: 'Grandchild',
        birthYear: 20,
        parentIds: ['c1'],
        childIds: [],
        spouseIds: [],
        keyEvents: [],
        titles: [],
      },
    ] as const;

    const genealogy = await system.buildGenealogy('dyn-1', 'House Test', nodes, 'root', 1);

    expect(genealogy.nodes).toHaveLength(4);
    expect(genealogy.generationCount).toBe(3);
    expect((await system.getGenealogy('dyn-1'))?.dynastyName).toBe('House Test');
  });

  it('builds empty timeline when no world entries exist', async () => {
    const { system } = createSystem();

    const timeline = await system.buildTimeline('w-empty', 'Void', 100);

    expect(timeline.eras).toHaveLength(0);
    expect(timeline.totalEvents).toBe(0);
  });

  it('builds timeline eras from world entries with dominant theme', async () => {
    const { system } = createSystem();

    await system.recordEntry('politics', 'Council', 'A', 10, [], 5, { worldId: 'w-2' });
    await system.recordEntry('politics', 'Vote', 'B', 12, [], 8, { worldId: 'w-2' });
    await system.recordEntry('combat', 'Skirmish', 'C', 14, [], 9, { worldId: 'w-2' });
    await system.recordEntry('politics', 'Treaty', 'D', 18, [], 7, { worldId: 'w-2' });

    const timeline = await system.buildTimeline('w-2', 'Atlas', 30);

    expect(timeline.eras.length).toBeGreaterThan(0);
    expect(timeline.totalEvents).toBe(4);
    expect(timeline.eras[0]?.name).toContain('Era of');
    expect((await system.getTimeline('w-2'))?.worldName).toBe('Atlas');
  });

  it('generates fallback biography when no npc entries exist', async () => {
    const { system } = createSystem();
    const biography = await system.generateBiography('npc-0', 'Echo', 'w', 1);
    expect(biography.narrative).toContain('quiet life');
    expect(biography.chapters).toHaveLength(0);
  });

  it('generates biography chapters, relationships, and achievements from history', async () => {
    const { system } = createSystem();

    await system.recordEntry('npc', 'Mentor', 'Trusted ally', 15, ['relationship'], 5, {
      npcId: 'npc-1',
      worldId: 'w',
    });
    await system.recordEntry('achievement', 'Crowned', 'Won the crown', 20, [], 9, {
      npcId: 'npc-1',
      worldId: 'w',
    });

    const biography = await system.generateBiography('npc-1', 'Iris', 'w', 10, 50);

    expect(biography.chapters.length).toBeGreaterThan(0);
    expect(biography.relationships).toHaveLength(1);
    expect(biography.achievements).toContain('Crowned');
    expect((await system.getBiography('npc-1'))?.npcName).toBe('Iris');
  });

  it('returns configured stats format/schema and default-limited histories', async () => {
    const { system } = createSystem();
    await system.recordEntry('dynasty', '1', 'a', 1, [], 1, { dynastyId: 'd', worldId: 'w' });
    await system.recordEntry('dynasty', '2', 'b', 2, [], 2, { dynastyId: 'd', worldId: 'w' });
    await system.recordEntry('dynasty', '3', 'c', 3, [], 3, { dynastyId: 'd', worldId: 'w' });
    await system.recordEntry('dynasty', '4', 'd', 4, [], 4, { dynastyId: 'd', worldId: 'w' });

    const dyn = await system.getDynastyHistory('d');
    const world = await system.getWorldHistory('w');
    const stats = await system.getStats();

    expect(dyn).toHaveLength(3);
    expect(world).toHaveLength(3);
    expect(stats.schemaVersion).toBe(9);
    expect(stats.storageFormat).toBe('json');
  });
});
