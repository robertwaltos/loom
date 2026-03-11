import { describe, it, expect } from 'vitest';
import {
  createLoreCompendium,
  type LoreDeps,
  type LoreClockPort,
  type LoreIdPort,
  type LoreLoggerPort,
} from '../lore-compendium.js';

function createTestDeps(): LoreDeps {
  let idCounter = 0;
  let now = 1000000;
  const clock: LoreClockPort = {
    nowMicroseconds: () => now,
  };
  const idGenerator: LoreIdPort = {
    generate: () => {
      idCounter++;
      return 'lore-' + String(idCounter);
    },
  };
  const logger: LoreLoggerPort = {
    info: () => {},
  };
  return { clock, idGenerator, logger };
}

describe('LoreCompendium', () => {
  describe('addEntry', () => {
    it('should add a basic lore entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'The Great Founding',
        content: 'Long ago...',
        tags: ['founding', 'epic'],
      });
      expect(entry.entryId).toBe('lore-1');
      expect(entry.worldId).toBe('world-001');
      expect(entry.category).toBe('HISTORY');
      expect(entry.title).toBe('The Great Founding');
      expect(entry.content).toBe('Long ago...');
      expect(entry.tags).toEqual(['founding', 'epic']);
      expect(entry.lock.locked).toBe(false);
    });

    it('should add a locked entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'The Dark Secret',
        content: 'Hidden knowledge...',
        tags: ['secret'],
        locked: true,
        unlockCondition: 'Discover the artifact',
      });
      expect(entry.lock.locked).toBe(true);
      expect(entry.lock.unlockCondition).toBe('Discover the artifact');
    });

    it('should add entry with author', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-002',
        category: 'BIOGRAPHY',
        title: 'Lord Varen',
        content: 'A great leader...',
        tags: ['leader', 'warrior'],
        authorDynastyId: 'dynasty-123',
      });
      expect(entry.authorDynastyId).toBe('dynasty-123');
    });

    it('should index entry by tags', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'War of the Ancients',
        content: 'A great war...',
        tags: ['war', 'ancient'],
      });
      const results = compendium.queryByTags({ tags: ['war'] });
      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('War of the Ancients');
    });

    it('should index entry by world', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'The Titan Myth',
        content: 'Gods and titans...',
        tags: ['mythology'],
      });
      const results = compendium.queryByWorld('world-001', false);
      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('The Titan Myth');
    });

    it('should index entry by category', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'FACTION',
        title: 'The Red Guard',
        content: 'Elite warriors...',
        tags: ['faction'],
      });
      const results = compendium.queryByCategory('FACTION');
      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('The Red Guard');
    });

    it('should generate sequential IDs', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry1 = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'First Event',
        content: 'Content 1',
        tags: [],
      });
      const entry2 = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Second Event',
        content: 'Content 2',
        tags: [],
      });
      expect(entry1.entryId).toBe('lore-1');
      expect(entry2.entryId).toBe('lore-2');
    });
  });

  describe('getEntry', () => {
    it('should retrieve entry by ID', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const added = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'The Event',
        content: 'It happened...',
        tags: [],
      });
      const retrieved = compendium.getEntry(added.entryId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('The Event');
    });

    it('should return undefined for missing entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const result = compendium.getEntry('missing-id');
      expect(result).toBeUndefined();
    });
  });

  describe('updateEntry', () => {
    it('should update entry content', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'The Event',
        content: 'Original content',
        tags: [],
      });
      const updated = compendium.updateEntry({
        entryId: entry.entryId,
        content: 'Updated content',
      });
      expect(typeof updated).toBe('object');
      if (typeof updated === 'string') return;
      expect(updated.content).toBe('Updated content');
    });

    it('should update entry tags', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'The Event',
        content: 'Content',
        tags: ['old-tag'],
      });
      const updated = compendium.updateEntry({
        entryId: entry.entryId,
        tags: ['new-tag'],
      });
      expect(typeof updated).toBe('object');
      if (typeof updated === 'string') return;
      expect(updated.tags).toEqual(['new-tag']);
    });

    it('should return error for missing entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const result = compendium.updateEntry({
        entryId: 'missing-id',
        content: 'New content',
      });
      expect(result).toBe('ENTRY_NOT_FOUND');
    });

    it('should return error for locked entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret',
        content: 'Hidden',
        tags: [],
        locked: true,
      });
      const result = compendium.updateEntry({
        entryId: entry.entryId,
        content: 'Try to update',
      });
      expect(result).toBe('ENTRY_LOCKED');
    });

    it('should reindex tags after update', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Event',
        content: 'Content',
        tags: ['tag-a'],
      });
      compendium.updateEntry({
        entryId: entry.entryId,
        tags: ['tag-b'],
      });
      const resultA = compendium.queryByTags({ tags: ['tag-a'] });
      const resultB = compendium.queryByTags({ tags: ['tag-b'] });
      expect(resultA.length).toBe(0);
      expect(resultB.length).toBe(1);
    });
  });

  describe('unlockEntry', () => {
    it('should unlock a locked entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret Knowledge',
        content: 'Hidden...',
        tags: [],
        locked: true,
        unlockCondition: 'Find the key',
      });
      const result = compendium.unlockEntry(entry.entryId, 'dynasty-123');
      expect(result.success).toBe(true);
      const unlocked = compendium.getEntry(entry.entryId);
      expect(unlocked?.lock.locked).toBe(false);
      expect(unlocked?.lock.unlockedBy).toBe('dynasty-123');
    });

    it('should return error for missing entry', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const result = compendium.unlockEntry('missing-id', 'dynasty-123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ENTRY_NOT_FOUND');
    });

    it('should return error if already unlocked', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const entry = compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Public Knowledge',
        content: 'Known to all...',
        tags: [],
        locked: false,
      });
      const result = compendium.unlockEntry(entry.entryId, 'dynasty-123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ALREADY_UNLOCKED');
    });
  });

  describe('queryByTags', () => {
    it('should find entries with matching tags', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'War Event',
        content: 'A war...',
        tags: ['war', 'conflict'],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Peace Treaty',
        content: 'Peace...',
        tags: ['peace', 'treaty'],
      });
      const results = compendium.queryByTags({ tags: ['war'] });
      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('War Event');
    });

    it('should require all tags to match', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Epic War',
        content: 'A great war...',
        tags: ['war', 'epic', 'ancient'],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Minor Skirmish',
        content: 'A small fight...',
        tags: ['war'],
      });
      const results = compendium.queryByTags({ tags: ['war', 'epic'] });
      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('Epic War');
    });

    it('should filter by world', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'World 1 Event',
        content: 'Event...',
        tags: ['event'],
      });
      compendium.addEntry({
        worldId: 'world-002',
        category: 'HISTORY',
        title: 'World 2 Event',
        content: 'Event...',
        tags: ['event'],
      });
      const results = compendium.queryByTags({ worldId: 'world-001', tags: ['event'] });
      expect(results.length).toBe(1);
      expect(results[0]?.worldId).toBe('world-001');
    });

    it('should filter by category', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Historical Event',
        content: 'History...',
        tags: ['important'],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'Mythical Tale',
        content: 'Myth...',
        tags: ['important'],
      });
      const results = compendium.queryByTags({ category: 'HISTORY', tags: ['important'] });
      expect(results.length).toBe(1);
      expect(results[0]?.category).toBe('HISTORY');
    });

    it('should exclude locked entries by default', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Public Event',
        content: 'Public...',
        tags: ['event'],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret Event',
        content: 'Secret...',
        tags: ['event'],
        locked: true,
      });
      const results = compendium.queryByTags({ tags: ['event'] });
      expect(results.length).toBe(1);
      expect(results[0]?.title).toBe('Public Event');
    });

    it('should include locked entries if requested', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Public Event',
        content: 'Public...',
        tags: ['event'],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret Event',
        content: 'Secret...',
        tags: ['event'],
        locked: true,
      });
      const results = compendium.queryByTags({ tags: ['event'], includeSecret: true });
      expect(results.length).toBe(2);
    });
  });

  describe('queryByWorld', () => {
    it('should find all entries for a world', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Event 1',
        content: 'Content 1',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'Event 2',
        content: 'Content 2',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-002',
        category: 'HISTORY',
        title: 'Event 3',
        content: 'Content 3',
        tags: [],
      });
      const results = compendium.queryByWorld('world-001', false);
      expect(results.length).toBe(2);
    });

    it('should exclude locked entries by default', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Public',
        content: 'Public...',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret',
        content: 'Secret...',
        tags: [],
        locked: true,
      });
      const results = compendium.queryByWorld('world-001', false);
      expect(results.length).toBe(1);
    });

    it('should include locked entries if requested', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Public',
        content: 'Public...',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret',
        content: 'Secret...',
        tags: [],
        locked: true,
      });
      const results = compendium.queryByWorld('world-001', true);
      expect(results.length).toBe(2);
    });

    it('should return empty array for unknown world', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const results = compendium.queryByWorld('missing-world', false);
      expect(results.length).toBe(0);
    });
  });

  describe('queryByCategory', () => {
    it('should find all entries in a category', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Historical Event',
        content: 'History...',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-002',
        category: 'HISTORY',
        title: 'Another History',
        content: 'More history...',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'Mythical Tale',
        content: 'Myth...',
        tags: [],
      });
      const results = compendium.queryByCategory('HISTORY');
      expect(results.length).toBe(2);
    });

    it('should return empty array for unused category', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const results = compendium.queryByCategory('GEOGRAPHY');
      expect(results.length).toBe(0);
    });

    it('should include locked entries', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Public Prophecy',
        content: 'Known prophecy...',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret Prophecy',
        content: 'Hidden prophecy...',
        tags: [],
        locked: true,
      });
      const results = compendium.queryByCategory('PROPHECY');
      expect(results.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty compendium', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      const stats = compendium.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.lockedEntries).toBe(0);
      expect(stats.totalTags).toBe(0);
      expect(stats.worldCount).toBe(0);
    });

    it('should count total entries', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Event 1',
        content: 'Content 1',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'Event 2',
        content: 'Content 2',
        tags: [],
      });
      const stats = compendium.getStats();
      expect(stats.totalEntries).toBe(2);
    });

    it('should count locked entries', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Public',
        content: 'Public...',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'PROPHECY',
        title: 'Secret',
        content: 'Secret...',
        tags: [],
        locked: true,
      });
      const stats = compendium.getStats();
      expect(stats.lockedEntries).toBe(1);
    });

    it('should count entries by category', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'History 1',
        content: 'Content',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'History 2',
        content: 'Content',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'Myth 1',
        content: 'Content',
        tags: [],
      });
      const stats = compendium.getStats();
      expect(stats.entriesByCategory.HISTORY).toBe(2);
      expect(stats.entriesByCategory.MYTHOLOGY).toBe(1);
      expect(stats.entriesByCategory.FACTION).toBe(0);
    });

    it('should count unique tags', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Event 1',
        content: 'Content',
        tags: ['tag-a', 'tag-b'],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Event 2',
        content: 'Content',
        tags: ['tag-b', 'tag-c'],
      });
      const stats = compendium.getStats();
      expect(stats.totalTags).toBe(3);
    });

    it('should count unique worlds', () => {
      const deps = createTestDeps();
      const compendium = createLoreCompendium(deps);
      compendium.addEntry({
        worldId: 'world-001',
        category: 'HISTORY',
        title: 'Event 1',
        content: 'Content',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-001',
        category: 'MYTHOLOGY',
        title: 'Event 2',
        content: 'Content',
        tags: [],
      });
      compendium.addEntry({
        worldId: 'world-002',
        category: 'HISTORY',
        title: 'Event 3',
        content: 'Content',
        tags: [],
      });
      const stats = compendium.getStats();
      expect(stats.worldCount).toBe(2);
    });
  });
});
