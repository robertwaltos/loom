import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldHistory,
  MAX_EVENTS_PER_WORLD,
  SIGNIFICANCE_WEIGHTS,
} from '../world-history.js';
import type { WorldHistory, WorldHistoryDeps } from '../world-history.js';

// -- Test Helpers ---------------------------------------------------------

function createDeps(): WorldHistoryDeps & { setTime: (t: number) => void } {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    idGenerator: {
      generate() {
        idCounter += 1;
        return 'wh-' + String(idCounter);
      },
    },
    setTime(t: number) {
      time = t;
    },
  };
}

let history: WorldHistory;
let deps: ReturnType<typeof createDeps>;

beforeEach(() => {
  deps = createDeps();
  history = createWorldHistory(deps);
});

// -- Initialize World -----------------------------------------------------

describe('WorldHistory initializeWorld', () => {
  it('initializes a new world', () => {
    history.initializeWorld('earth');
    expect(history.getEventCount('earth')).toBe(0);
  });

  it('is idempotent for existing worlds', () => {
    history.initializeWorld('earth');
    history.recordEvent('earth', {
      eventType: 'FOUNDING',
      title: 'Colony',
      description: 'Founded',
      significance: 'major',
    });
    history.initializeWorld('earth');
    expect(history.getEventCount('earth')).toBe(1);
  });
});

// -- Record Event ---------------------------------------------------------

describe('WorldHistory recordEvent', () => {
  it('records an event with correct metadata', () => {
    const event = history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'Siege of Haven',
      description: 'First major conflict',
      significance: 'major',
      participants: ['dynasty-1', 'dynasty-2'],
      locationId: 'loc-42',
    });
    expect(event.eventId).toBe('wh-1');
    expect(event.worldId).toBe('earth');
    expect(event.eventType).toBe('BATTLE');
    expect(event.title).toBe('Siege of Haven');
    expect(event.significance).toBe('major');
    expect(event.participants).toContain('dynasty-1');
    expect(event.locationId).toBe('loc-42');
    expect(event.sequenceNumber).toBe(0);
  });

  it('auto-creates world if not initialized', () => {
    history.recordEvent('mars', {
      eventType: 'FOUNDING',
      title: 'Mars Colony',
      description: 'First settlement',
      significance: 'legendary',
    });
    expect(history.getEventCount('mars')).toBe(1);
  });

  it('increments sequence numbers', () => {
    history.recordEvent('earth', {
      eventType: 'FOUNDING',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    const second = history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    expect(second.sequenceNumber).toBe(1);
  });

  it('defaults participants to empty and locationId to null', () => {
    const event = history.recordEvent('earth', {
      eventType: 'INNOVATION',
      title: 'FTL',
      description: 'Faster than light',
      significance: 'legendary',
    });
    expect(event.participants).toHaveLength(0);
    expect(event.locationId).toBeNull();
  });
});

// -- Record Event Limits --------------------------------------------------

describe('WorldHistory recordEvent limits', () => {
  it('enforces max events per world by evicting oldest', () => {
    history.initializeWorld('earth');
    for (let i = 0; i < MAX_EVENTS_PER_WORLD + 5; i++) {
      history.recordEvent('earth', {
        eventType: 'MIGRATION',
        title: 'Event ' + String(i),
        description: '',
        significance: 'minor',
      });
    }
    expect(history.getEventCount('earth')).toBe(MAX_EVENTS_PER_WORLD);
  });
});

// -- Record Discovery -----------------------------------------------------

describe('WorldHistory recordDiscovery', () => {
  it('records a discovery with full metadata', () => {
    const discovery = history.recordDiscovery('earth', {
      discovererIds: ['player-1', 'player-2'],
      title: 'Crystal Caves',
      description: 'Vast underground caverns',
      significance: 'major',
      coordinates: { x: 10, y: 20, z: -5 },
      category: 'terrain',
    });
    expect(discovery.discoveryId).toBe('wh-1');
    expect(discovery.worldId).toBe('earth');
    expect(discovery.discovererIds).toContain('player-1');
    expect(discovery.title).toBe('Crystal Caves');
    expect(discovery.coordinates?.x).toBe(10);
    expect(discovery.category).toBe('terrain');
  });

  it('defaults coordinates to null', () => {
    const discovery = history.recordDiscovery('earth', {
      discovererIds: ['player-1'],
      title: 'New Species',
      description: 'Bioluminescent jellyfish',
      significance: 'notable',
      category: 'species',
    });
    expect(discovery.coordinates).toBeNull();
  });

  it('stores discovery in world list', () => {
    history.recordDiscovery('earth', {
      discovererIds: ['player-1'],
      title: 'Ancient Ruins',
      description: 'Precursor site',
      significance: 'legendary',
      category: 'structure',
    });
    const discoveries = history.getDiscoveries('earth');
    expect(discoveries).toHaveLength(1);
    expect(discoveries[0]?.title).toBe('Ancient Ruins');
  });
});

// -- Query Events ---------------------------------------------------------

describe('WorldHistory queryEvents', () => {
  it('queries by event type', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'C',
      description: '',
      significance: 'minor',
    });
    const results = history.queryEvents('earth', { eventType: 'BATTLE' });
    expect(results).toHaveLength(2);
  });

  it('queries by significance', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'B',
      description: '',
      significance: 'legendary',
    });
    const results = history.queryEvents('earth', { significance: 'legendary' });
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('B');
  });

  it('queries by time range', () => {
    deps.setTime(100);
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'early',
      description: '',
      significance: 'minor',
    });
    deps.setTime(500);
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'mid',
      description: '',
      significance: 'minor',
    });
    deps.setTime(900);
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'late',
      description: '',
      significance: 'minor',
    });
    const results = history.queryEvents('earth', { fromTime: 200, toTime: 600 });
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('mid');
  });
});

// -- Query Events Advanced ------------------------------------------------

describe('WorldHistory queryEvents advanced', () => {
  it('queries by participant', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
      participants: ['dynasty-1'],
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'B',
      description: '',
      significance: 'minor',
      participants: ['dynasty-2'],
    });
    const results = history.queryEvents('earth', { participantId: 'dynasty-1' });
    expect(results).toHaveLength(1);
  });

  it('queries by location', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
      locationId: 'loc-1',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'B',
      description: '',
      significance: 'minor',
      locationId: 'loc-2',
    });
    const results = history.queryEvents('earth', { locationId: 'loc-1' });
    expect(results).toHaveLength(1);
  });

  it('combines multiple filters', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'major',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'major',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'C',
      description: '',
      significance: 'minor',
    });
    const results = history.queryEvents('earth', { eventType: 'BATTLE', significance: 'major' });
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('A');
  });

  it('returns empty for unknown world', () => {
    expect(history.queryEvents('nonexistent', {})).toHaveLength(0);
  });

  it('returns all events with empty query', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    expect(history.queryEvents('earth', {})).toHaveLength(2);
  });
});

// -- Get Discoveries ------------------------------------------------------

describe('WorldHistory getDiscoveries', () => {
  it('returns empty for unknown world', () => {
    expect(history.getDiscoveries('nonexistent')).toHaveLength(0);
  });

  it('returns all discoveries for a world', () => {
    history.recordDiscovery('earth', {
      discovererIds: ['p1'],
      title: 'Cave',
      description: '',
      significance: 'minor',
      category: 'terrain',
    });
    history.recordDiscovery('earth', {
      discovererIds: ['p2'],
      title: 'Ore',
      description: '',
      significance: 'notable',
      category: 'resource',
    });
    expect(history.getDiscoveries('earth')).toHaveLength(2);
  });
});

// -- Get Recent Events ----------------------------------------------------

describe('WorldHistory getRecentEvents', () => {
  it('returns most recent events', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'FOUNDING',
      title: 'C',
      description: '',
      significance: 'minor',
    });
    const recent = history.getRecentEvents('earth', 2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.title).toBe('B');
    expect(recent[1]?.title).toBe('C');
  });

  it('returns all when count exceeds total', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    expect(history.getRecentEvents('earth', 10)).toHaveLength(1);
  });

  it('returns empty for unknown world', () => {
    expect(history.getRecentEvents('nonexistent', 5)).toHaveLength(0);
  });
});

// -- Get Events By Type ---------------------------------------------------

describe('WorldHistory getEventsByType', () => {
  it('filters events by type', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'C',
      description: '',
      significance: 'minor',
    });
    const battles = history.getEventsByType('earth', 'BATTLE');
    expect(battles).toHaveLength(2);
  });

  it('returns empty for unknown world', () => {
    expect(history.getEventsByType('nonexistent', 'BATTLE')).toHaveLength(0);
  });
});

// -- Get Event Count ------------------------------------------------------

describe('WorldHistory getEventCount', () => {
  it('returns zero for unknown world', () => {
    expect(history.getEventCount('nonexistent')).toBe(0);
  });

  it('returns correct count', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    expect(history.getEventCount('earth')).toBe(2);
  });
});

// -- Get Significant Events -----------------------------------------------

describe('WorldHistory getSignificantEvents', () => {
  it('filters by minimum significance level', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'minor',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'notable',
      description: '',
      significance: 'notable',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'major',
      description: '',
      significance: 'major',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'legendary',
      description: '',
      significance: 'legendary',
    });
    const results = history.getSignificantEvents('earth', 'major');
    expect(results).toHaveLength(2);
    expect(results[0]?.title).toBe('major');
    expect(results[1]?.title).toBe('legendary');
  });

  it('returns all events for minor minimum', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'B',
      description: '',
      significance: 'legendary',
    });
    const results = history.getSignificantEvents('earth', 'minor');
    expect(results).toHaveLength(2);
  });

  it('returns empty for unknown world', () => {
    expect(history.getSignificantEvents('nonexistent', 'minor')).toHaveLength(0);
  });
});

// -- SIGNIFICANCE_WEIGHTS -------------------------------------------------

describe('SIGNIFICANCE_WEIGHTS', () => {
  it('assigns increasing weights to significance levels', () => {
    expect(SIGNIFICANCE_WEIGHTS.minor).toBeLessThan(SIGNIFICANCE_WEIGHTS.notable);
    expect(SIGNIFICANCE_WEIGHTS.notable).toBeLessThan(SIGNIFICANCE_WEIGHTS.major);
    expect(SIGNIFICANCE_WEIGHTS.major).toBeLessThan(SIGNIFICANCE_WEIGHTS.legendary);
  });
});

// -- Stats ----------------------------------------------------------------

describe('WorldHistory stats', () => {
  it('reports empty stats initially', () => {
    const stats = history.getStats();
    expect(stats.totalWorlds).toBe(0);
    expect(stats.totalEvents).toBe(0);
    expect(stats.totalDiscoveries).toBe(0);
    expect(stats.eventsByType.BATTLE).toBe(0);
  });

  it('tracks aggregate statistics across worlds', () => {
    history.recordEvent('earth', {
      eventType: 'BATTLE',
      title: 'A',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('earth', {
      eventType: 'TREATY',
      title: 'B',
      description: '',
      significance: 'minor',
    });
    history.recordEvent('mars', {
      eventType: 'BATTLE',
      title: 'C',
      description: '',
      significance: 'minor',
    });
    history.recordDiscovery('earth', {
      discovererIds: ['p1'],
      title: 'Cave',
      description: '',
      significance: 'minor',
      category: 'terrain',
    });
    const stats = history.getStats();
    expect(stats.totalWorlds).toBe(2);
    expect(stats.totalEvents).toBe(3);
    expect(stats.totalDiscoveries).toBe(1);
    expect(stats.eventsByType.BATTLE).toBe(2);
    expect(stats.eventsByType.TREATY).toBe(1);
    expect(stats.eventsByType.FOUNDING).toBe(0);
  });
});
