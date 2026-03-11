/**
 * Input Mapper System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInputMapperSystem,
  type InputMapperSystem,
  type InputMapperError,
} from '../input-mapper.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'evt-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

describe('InputMapper — registerAction', () => {
  let mapper: InputMapperSystem;

  beforeEach(() => {
    mapper = createInputMapperSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
  });

  it('registers an action successfully', () => {
    const result = mapper.registerAction('jump', 'Jump', 'Make entity jump', 'Space');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.actionId).toBe('jump');
    expect(result.currentBinding).toBe('Space');
    expect(result.defaultBinding).toBe('Space');
    expect(result.lastTriggeredAt).toBeNull();
  });

  it('returns action-already-exists for duplicate actionId', () => {
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
    const result = mapper.registerAction('jump', 'Jump2', 'Desc', 'KeyJ');
    expect(result).toBe('action-already-exists' satisfies InputMapperError);
  });

  it('adds action to listActions', () => {
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
    mapper.registerAction('attack', 'Attack', 'Desc', 'MouseLeft');
    expect(mapper.listActions()).toHaveLength(2);
  });
});

describe('InputMapper — bindAction', () => {
  let mapper: InputMapperSystem;

  beforeEach(() => {
    mapper = createInputMapperSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
    mapper.registerAction('attack', 'Attack', 'Desc', 'MouseLeft');
  });

  it('rebinds an action to a new key', () => {
    const result = mapper.bindAction('jump', 'KeyJ');
    expect(result).toEqual({ success: true });
    expect(mapper.getAction('jump')?.currentBinding).toBe('KeyJ');
  });

  it('returns action-not-found for unknown action', () => {
    const result = mapper.bindAction('ghost', 'Space');
    expect(result).toEqual({ success: false, error: 'action-not-found' });
  });

  it('returns already-bound with conflict when key is taken by another action', () => {
    const result = mapper.bindAction('attack', 'Space');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-bound');
    expect(result.conflict?.existingActionId).toBe('jump');
    expect(result.conflict?.requestedActionId).toBe('attack');
  });

  it('returns success (no-op) when binding same inputCode to same action', () => {
    const result = mapper.bindAction('jump', 'Space');
    expect(result).toEqual({ success: true });
  });

  it('resolves old binding when rebinding', () => {
    mapper.bindAction('jump', 'KeyJ');
    // Space should now be free
    const result = mapper.bindAction('attack', 'Space');
    expect(result).toEqual({ success: true });
  });
});

describe('InputMapper — unbindAction / resetToDefault', () => {
  let mapper: InputMapperSystem;

  beforeEach(() => {
    mapper = createInputMapperSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
  });

  it('unbinds an action (sets currentBinding to empty string)', () => {
    const result = mapper.unbindAction('jump');
    expect(result).toEqual({ success: true });
    expect(mapper.getAction('jump')?.currentBinding).toBe('');
  });

  it('after unbind, Space key is free for another action', () => {
    mapper.registerAction('attack', 'Attack', 'Desc', 'MouseLeft');
    mapper.unbindAction('jump');
    const result = mapper.bindAction('attack', 'Space');
    expect(result).toEqual({ success: true });
  });

  it('returns action-not-found for unknown action on unbind', () => {
    expect(mapper.unbindAction('ghost')).toEqual({ success: false, error: 'action-not-found' });
  });

  it('resetToDefault restores original binding', () => {
    mapper.bindAction('jump', 'KeyJ');
    const result = mapper.resetToDefault('jump');
    expect(result).toEqual({ success: true });
    expect(mapper.getAction('jump')?.currentBinding).toBe('Space');
  });

  it('returns action-not-found for unknown action on resetToDefault', () => {
    expect(mapper.resetToDefault('ghost')).toEqual({ success: false, error: 'action-not-found' });
  });
});

describe('InputMapper — processInput', () => {
  let clock: TestClock;
  let mapper: InputMapperSystem;

  beforeEach(() => {
    clock = new TestClock();
    mapper = createInputMapperSystem({
      clock,
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
  });

  it('resolves inputCode to actionId when bound', () => {
    const event = mapper.processInput('Space');
    expect(event.inputCode).toBe('Space');
    expect(event.actionId).toBe('jump');
  });

  it('resolves actionId as null for unmapped key', () => {
    const event = mapper.processInput('KeyX');
    expect(event.actionId).toBeNull();
  });

  it('updates lastTriggeredAt on matched action', () => {
    clock.advance(500_000n);
    mapper.processInput('Space');
    const action = mapper.getAction('jump');
    expect(action?.lastTriggeredAt).toBe(1_000_500_000n);
  });

  it('appends to history', () => {
    mapper.processInput('Space');
    mapper.processInput('KeyX');
    expect(mapper.getInputHistory(10)).toHaveLength(2);
  });

  it('returns most-recent-first from history', () => {
    mapper.processInput('Space');
    mapper.processInput('KeyX');
    const history = mapper.getInputHistory(10);
    expect(history[0]?.inputCode).toBe('KeyX');
    expect(history[1]?.inputCode).toBe('Space');
  });

  it('getInputHistory respects limit', () => {
    for (let i = 0; i < 5; i++) mapper.processInput('Space');
    expect(mapper.getInputHistory(3)).toHaveLength(3);
  });

  it('always records event even when unmapped', () => {
    mapper.processInput('Escape');
    expect(mapper.getInputHistory(1)).toHaveLength(1);
  });
});

describe('InputMapper — getActionForInput', () => {
  let mapper: InputMapperSystem;

  beforeEach(() => {
    mapper = createInputMapperSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
  });

  it('returns the action for a bound key', () => {
    const action = mapper.getActionForInput('Space');
    expect(action?.actionId).toBe('jump');
  });

  it('returns undefined for an unbound key', () => {
    expect(mapper.getActionForInput('KeyZ')).toBeUndefined();
  });

  it('returns undefined after unbind', () => {
    mapper.unbindAction('jump');
    expect(mapper.getActionForInput('Space')).toBeUndefined();
  });
});

describe('InputMapper — getAction', () => {
  let mapper: InputMapperSystem;

  beforeEach(() => {
    mapper = createInputMapperSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    mapper.registerAction('jump', 'Jump', 'Desc', 'Space');
  });

  it('returns the action by actionId', () => {
    expect(mapper.getAction('jump')?.name).toBe('Jump');
  });

  it('returns undefined for unknown actionId', () => {
    expect(mapper.getAction('ghost')).toBeUndefined();
  });
});
