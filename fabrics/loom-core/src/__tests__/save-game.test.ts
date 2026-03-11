/**
 * Save Game System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSaveGameSystem, type SaveGameSystem, type SaveError } from '../save-game.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs += deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

function makeDeps() {
  return {
    clock: new TestClock(),
    idGen: new TestIdGenerator(),
    logger: new TestLogger(),
  };
}

describe('SaveGame — registerPlayer', () => {
  let system: SaveGameSystem;

  beforeEach(() => {
    system = createSaveGameSystem(makeDeps());
  });

  it('registers a new player successfully', () => {
    expect(system.registerPlayer('player-1').success).toBe(true);
  });

  it('rejects duplicate player registration', () => {
    system.registerPlayer('player-1');
    const result = system.registerPlayer('player-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<SaveError>('already-registered');
  });
});

describe('SaveGame — createSlot', () => {
  let system: SaveGameSystem;

  beforeEach(() => {
    system = createSaveGameSystem(makeDeps());
  });

  it('creates a slot for a registered player', () => {
    system.registerPlayer('player-1');
    const result = system.createSlot('player-1', 'Main Save');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.name).toBe('Main Save');
      expect(result.playerId).toBe('player-1');
      expect(result.saveCount).toBe(0);
      expect(result.sizeBytes).toBe(0n);
    }
  });

  it('rejects slot creation for unknown player', () => {
    expect(system.createSlot('unknown', 'Slot')).toBe<SaveError>('player-not-found');
  });

  it('rejects empty slot name', () => {
    system.registerPlayer('player-1');
    expect(system.createSlot('player-1', '')).toBe<SaveError>('invalid-name');
  });

  it('rejects whitespace-only slot name', () => {
    system.registerPlayer('player-1');
    expect(system.createSlot('player-1', '   ')).toBe<SaveError>('invalid-name');
  });

  it('enforces max 5 slots per player', () => {
    system.registerPlayer('player-1');
    for (let i = 1; i <= 5; i++) system.createSlot('player-1', 'Slot ' + String(i));
    expect(system.createSlot('player-1', 'Slot 6')).toBe<SaveError>('max-slots-exceeded');
  });

  it('allows different players to each have 5 slots', () => {
    system.registerPlayer('player-1');
    system.registerPlayer('player-2');
    for (let i = 1; i <= 5; i++) system.createSlot('player-1', 'Slot ' + String(i));
    expect(typeof system.createSlot('player-2', 'My Slot')).not.toBe('string');
  });
});

describe('SaveGame — deleteSlot', () => {
  let system: SaveGameSystem;

  beforeEach(() => {
    system = createSaveGameSystem(makeDeps());
    system.registerPlayer('player-1');
  });

  it('deletes an existing slot', () => {
    const slot = system.createSlot('player-1', 'To Delete');
    if (typeof slot !== 'string') {
      expect(system.deleteSlot(slot.slotId).success).toBe(true);
    }
  });

  it('rejects deleting unknown slot', () => {
    const result = system.deleteSlot('nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe<SaveError>('slot-not-found');
  });

  it('removes all saves when slot is deleted', () => {
    const slot = system.createSlot('player-1', 'Slot A');
    if (typeof slot !== 'string') {
      system.saveState(slot.slotId, { level: 1 });
      system.saveState(slot.slotId, { level: 2 });
      system.deleteSlot(slot.slotId);
      expect(system.listSaves(slot.slotId).length).toBe(0);
    }
  });
});

describe('SaveGame — saveState', () => {
  let system: SaveGameSystem;

  beforeEach(() => {
    system = createSaveGameSystem(makeDeps());
    system.registerPlayer('player-1');
  });

  it('saves state to a slot', () => {
    const slot = system.createSlot('player-1', 'Main');
    if (typeof slot !== 'string') {
      const result = system.saveState(slot.slotId, { health: 100, name: 'Hero' });
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.slotId).toBe(slot.slotId);
        expect(result.checksum).toContain(slot.slotId);
      }
    }
  });

  it('rejects saving to unknown slot', () => {
    expect(system.saveState('bad-slot', { x: 1 })).toBe<SaveError>('slot-not-found');
  });

  it('increments slot saveCount on each save', () => {
    const slot = system.createSlot('player-1', 'Slot');
    if (typeof slot !== 'string') {
      system.saveState(slot.slotId, { v: 1 });
      system.saveState(slot.slotId, { v: 2 });
      const updated = system.listSlots('player-1').find((s) => s.slotId === slot.slotId);
      expect(updated?.saveCount).toBe(2);
    }
  });

  it('accumulates sizeBytes with each save', () => {
    const slot = system.createSlot('player-1', 'Slot');
    if (typeof slot !== 'string') {
      system.saveState(slot.slotId, { a: 1, b: 2 });
      const updated = system.listSlots('player-1').find((s) => s.slotId === slot.slotId);
      expect(updated?.sizeBytes).toBe(128n); // 2 keys * 64
    }
  });
});

describe('SaveGame — loadLatest', () => {
  let system: SaveGameSystem;

  beforeEach(() => {
    const deps = makeDeps();
    system = createSaveGameSystem(deps);
    system.registerPlayer('player-1');
  });

  it('loads the most recent save by savedAt', () => {
    const slot = system.createSlot('player-1', 'Slot');
    if (typeof slot !== 'string') {
      system.saveState(slot.slotId, { v: 1 });
      system.saveState(slot.slotId, { v: 2 });
      const result = system.loadLatest(slot.slotId);
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') expect(result.data['v']).toBe(2);
    }
  });

  it('returns save-not-found when no saves exist', () => {
    const slot = system.createSlot('player-1', 'Empty');
    if (typeof slot !== 'string') {
      expect(system.loadLatest(slot.slotId)).toBe<SaveError>('save-not-found');
    }
  });

  it('returns slot-not-found for unknown slot', () => {
    expect(system.loadLatest('bad-slot')).toBe<SaveError>('slot-not-found');
  });
});

describe('SaveGame — getSave and getSummary', () => {
  let system: SaveGameSystem;

  beforeEach(() => {
    system = createSaveGameSystem(makeDeps());
    system.registerPlayer('player-1');
  });

  it('retrieves a save by ID', () => {
    const slot = system.createSlot('player-1', 'Slot');
    if (typeof slot !== 'string') {
      const saved = system.saveState(slot.slotId, { x: 42 });
      if (typeof saved !== 'string') {
        expect(system.getSave(saved.saveId)?.data['x']).toBe(42);
      }
    }
  });

  it('returns undefined for unknown saveId', () => {
    expect(system.getSave('unknown-save')).toBeUndefined();
  });

  it('returns summary with correct totals', () => {
    const slot = system.createSlot('player-1', 'Slot');
    if (typeof slot !== 'string') {
      system.saveState(slot.slotId, { a: 1 });
      system.saveState(slot.slotId, { b: 2 });
      const summary = system.getSummary('player-1');
      expect(summary?.totalSlots).toBe(1);
      expect(summary?.totalSaves).toBe(2);
      expect(summary?.totalSizeBytes).toBe(128n);
    }
  });

  it('returns undefined summary for unknown player', () => {
    expect(system.getSummary('nobody')).toBeUndefined();
  });

  it('returns zero-value summary for new player', () => {
    const summary = system.getSummary('player-1');
    expect(summary?.totalSlots).toBe(0);
    expect(summary?.totalSaves).toBe(0);
    expect(summary?.totalSizeBytes).toBe(0n);
  });
});
