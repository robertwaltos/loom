import { describe, it, expect, beforeEach } from 'vitest';
import {
  createChronicleBuilder,
  MAX_ENTRIES_PER_WORLD,
  ERA_MINIMUM_DURATION_US,
} from '../chronicle-builder.js';
import type { ChronicleBuilder, ChronicleDeps } from '../chronicle-builder.js';

// -- Test Helpers ---------------------------------------------------------

function createDeps(): ChronicleDeps & { setTime: (t: number) => void } {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    idGenerator: {
      generate() {
        idCounter += 1;
        return 'cb-' + String(idCounter);
      },
    },
    setTime(t: number) {
      time = t;
    },
  };
}

let builder: ChronicleBuilder;
let deps: ReturnType<typeof createDeps>;

beforeEach(() => {
  deps = createDeps();
  builder = createChronicleBuilder(deps);
});

// -- Create Chronicle -----------------------------------------------------

describe('ChronicleBuilder createChronicle', () => {
  it('creates a timeline for a new world', () => {
    const timeline = builder.createChronicle('earth');
    expect(timeline.worldId).toBe('earth');
    expect(timeline.entryCount).toBe(0);
    expect(timeline.eraCount).toBe(0);
    expect(timeline.currentEraId).toBeNull();
  });

  it('returns existing timeline if world already exists', () => {
    builder.createChronicle('earth');
    builder.addEntry('earth', { content: 'first event' });
    const timeline = builder.createChronicle('earth');
    expect(timeline.entryCount).toBe(1);
  });

  it('records creation timestamp', () => {
    const timeline = builder.createChronicle('earth');
    expect(timeline.createdAt).toBe(1_000_000);
  });
});

// -- Add Entry ------------------------------------------------------------

describe('ChronicleBuilder addEntry', () => {
  it('adds an entry to a world', () => {
    const entry = builder.addEntry('earth', { content: 'colony established' });
    expect(entry.worldId).toBe('earth');
    expect(entry.content).toBe('colony established');
    expect(entry.isMilestone).toBe(false);
    expect(entry.milestoneType).toBeNull();
  });

  it('auto-creates world if not initialized', () => {
    builder.addEntry('mars', { content: 'first landing' });
    const timeline = builder.getTimeline('mars');
    expect(timeline).toBeDefined();
    expect(timeline?.entryCount).toBe(1);
  });

  it('associates entry with current era', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    const entry = builder.addEntry('earth', { content: 'building begins' });
    expect(entry.eraId).not.toBeNull();
  });

  it('stores tags on entries', () => {
    const entry = builder.addEntry('earth', {
      content: 'tagged event',
      tags: ['war', 'politics'],
    });
    expect(entry.tags).toContain('war');
    expect(entry.tags).toContain('politics');
  });

  it('defaults tags to empty array', () => {
    const entry = builder.addEntry('earth', { content: 'no tags' });
    expect(entry.tags).toHaveLength(0);
  });

  it('enforces max entries per world by evicting oldest', () => {
    builder.createChronicle('earth');
    for (let i = 0; i < MAX_ENTRIES_PER_WORLD + 5; i++) {
      builder.addEntry('earth', { content: 'entry ' + String(i) });
    }
    const timeline = builder.getTimeline('earth');
    expect(timeline?.entryCount).toBe(MAX_ENTRIES_PER_WORLD);
  });
});

// -- Declare Era ----------------------------------------------------------

describe('ChronicleBuilder declareEra', () => {
  it('declares a new era for a world', () => {
    builder.createChronicle('earth');
    const result = builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.eraType).toBe('founding');
      expect(result.name).toBe('Genesis');
      expect(result.endedAt).toBeNull();
    }
  });

  it('returns error when era is already active', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    const result = builder.declareEra('earth', { eraType: 'expansion', name: 'Growth' });
    expect(result).toBe('era_already_active');
  });

  it('sets current era on timeline', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    const era = builder.getCurrentEra('earth');
    expect(era).toBeDefined();
    expect(era?.name).toBe('Genesis');
  });
});

// -- End Current Era ------------------------------------------------------

describe('ChronicleBuilder endCurrentEra', () => {
  it('ends the current era with a reason', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    deps.setTime(1_000_000 + ERA_MINIMUM_DURATION_US + 1);
    const result = builder.endCurrentEra('earth', 'war broke out');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.endedAt).not.toBeNull();
      expect(result.endReason).toBe('war broke out');
    }
  });

  it('returns error when world not found', () => {
    const result = builder.endCurrentEra('nonexistent', 'reason');
    expect(result).toBe('world_not_found');
  });

  it('returns error when no era is active', () => {
    builder.createChronicle('earth');
    const result = builder.endCurrentEra('earth', 'reason');
    expect(result).toBe('no_active_era');
  });

  it('returns error when era is too short', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    deps.setTime(1_000_000 + 100);
    const result = builder.endCurrentEra('earth', 'too soon');
    expect(result).toBe('era_too_short');
  });

  it('clears current era after ending', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    deps.setTime(1_000_000 + ERA_MINIMUM_DURATION_US + 1);
    builder.endCurrentEra('earth', 'done');
    expect(builder.getCurrentEra('earth')).toBeUndefined();
  });

  it('allows declaring a new era after ending one', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    deps.setTime(1_000_000 + ERA_MINIMUM_DURATION_US + 1);
    builder.endCurrentEra('earth', 'done');
    const result = builder.declareEra('earth', { eraType: 'expansion', name: 'Growth' });
    expect(typeof result).not.toBe('string');
  });
});

// -- Record Milestone -----------------------------------------------------

describe('ChronicleBuilder recordMilestone', () => {
  it('records a milestone entry', () => {
    const entry = builder.recordMilestone('earth', 'first_settlement', 'colony alpha founded');
    expect(entry.isMilestone).toBe(true);
    expect(entry.milestoneType).toBe('first_settlement');
    expect(entry.content).toBe('colony alpha founded');
  });

  it('tags milestones automatically', () => {
    const entry = builder.recordMilestone('earth', 'technology_breakthrough', 'FTL drive');
    expect(entry.tags).toContain('milestone');
  });

  it('increments milestone count in stats', () => {
    builder.recordMilestone('earth', 'first_settlement', 'colony');
    builder.recordMilestone('earth', 'population_threshold', '1M people');
    const stats = builder.getStats();
    expect(stats.totalMilestones).toBe(2);
  });
});

// -- Query ----------------------------------------------------------------

describe('ChronicleBuilder query', () => {
  it('queries by era', () => {
    builder.createChronicle('earth');
    builder.addEntry('earth', { content: 'before era' });
    const era = builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    if (typeof era !== 'string') {
      builder.addEntry('earth', { content: 'during era' });
      const results = builder.query('earth', { eraId: era.eraId });
      expect(results).toHaveLength(1);
      expect(results[0]?.content).toBe('during era');
    }
  });

  it('queries milestone-only entries', () => {
    builder.addEntry('earth', { content: 'normal' });
    builder.recordMilestone('earth', 'first_settlement', 'colony');
    const results = builder.query('earth', { milestoneOnly: true });
    expect(results).toHaveLength(1);
    expect(results[0]?.isMilestone).toBe(true);
  });

  it('queries by time range', () => {
    deps.setTime(100);
    builder.addEntry('earth', { content: 'early' });
    deps.setTime(500);
    builder.addEntry('earth', { content: 'mid' });
    deps.setTime(900);
    builder.addEntry('earth', { content: 'late' });
    const results = builder.query('earth', { fromTime: 200, toTime: 600 });
    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('mid');
  });

  it('queries by tag', () => {
    builder.addEntry('earth', { content: 'tagged', tags: ['war'] });
    builder.addEntry('earth', { content: 'untagged' });
    const results = builder.query('earth', { tag: 'war' });
    expect(results).toHaveLength(1);
  });

  it('returns empty array for unknown world', () => {
    const results = builder.query('nonexistent', {});
    expect(results).toHaveLength(0);
  });

  it('returns all entries with empty query', () => {
    builder.addEntry('earth', { content: 'a' });
    builder.addEntry('earth', { content: 'b' });
    expect(builder.query('earth', {})).toHaveLength(2);
  });
});

// -- Get Timeline ---------------------------------------------------------

describe('ChronicleBuilder getTimeline', () => {
  it('returns undefined for unknown world', () => {
    expect(builder.getTimeline('nonexistent')).toBeUndefined();
  });

  it('returns current timeline state', () => {
    builder.createChronicle('earth');
    builder.addEntry('earth', { content: 'event' });
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    const timeline = builder.getTimeline('earth');
    expect(timeline?.entryCount).toBe(1);
    expect(timeline?.eraCount).toBe(1);
    expect(timeline?.currentEraId).not.toBeNull();
  });
});

// -- Get Era History ------------------------------------------------------

describe('ChronicleBuilder getEraHistory', () => {
  it('returns empty array for unknown world', () => {
    expect(builder.getEraHistory('nonexistent')).toHaveLength(0);
  });

  it('returns all eras in order', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    deps.setTime(1_000_000 + ERA_MINIMUM_DURATION_US + 1);
    builder.endCurrentEra('earth', 'done');
    deps.setTime(1_000_000 + ERA_MINIMUM_DURATION_US + 2);
    builder.declareEra('earth', { eraType: 'expansion', name: 'Growth' });
    const eras = builder.getEraHistory('earth');
    expect(eras).toHaveLength(2);
    expect(eras[0]?.name).toBe('Genesis');
    expect(eras[1]?.name).toBe('Growth');
  });
});

// -- Generate Summary -----------------------------------------------------

describe('ChronicleBuilder generateSummary', () => {
  it('generates a text summary for a time range', () => {
    deps.setTime(100);
    builder.addEntry('earth', { content: 'event one' });
    deps.setTime(500);
    builder.recordMilestone('earth', 'first_settlement', 'colony alpha');
    const summary = builder.generateSummary('earth', 0, 1000);
    expect(summary).toContain('Chronicle Summary for earth');
    expect(summary).toContain('Entries: 2');
    expect(summary).toContain('Milestones: 1');
    expect(summary).toContain('colony alpha');
  });

  it('returns informative message for unknown world', () => {
    const summary = builder.generateSummary('nonexistent', 0, 1000);
    expect(summary).toContain('No chronicle found');
  });

  it('includes eras in summary', () => {
    builder.createChronicle('earth');
    builder.declareEra('earth', { eraType: 'golden_age', name: 'Prosperity' });
    const summary = builder.generateSummary('earth', 0, 2_000_000);
    expect(summary).toContain('Prosperity');
    expect(summary).toContain('golden_age');
  });
});

// -- Stats ----------------------------------------------------------------

describe('ChronicleBuilder stats', () => {
  it('reports empty stats initially', () => {
    const stats = builder.getStats();
    expect(stats.totalWorlds).toBe(0);
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalEras).toBe(0);
    expect(stats.totalMilestones).toBe(0);
  });

  it('tracks aggregate statistics across worlds', () => {
    builder.addEntry('earth', { content: 'a' });
    builder.addEntry('mars', { content: 'b' });
    builder.recordMilestone('earth', 'first_settlement', 'colony');
    builder.declareEra('earth', { eraType: 'founding', name: 'Genesis' });
    const stats = builder.getStats();
    expect(stats.totalWorlds).toBe(2);
    expect(stats.totalEntries).toBe(3);
    expect(stats.totalEras).toBe(1);
    expect(stats.totalMilestones).toBe(1);
  });
});
