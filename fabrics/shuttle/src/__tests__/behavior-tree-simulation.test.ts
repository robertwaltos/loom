/**
 * Behavior Tree — Simulation Tests
 *
 * Exercises the pure-logic behavior tree: blackboard state, sequence/selector
 * node evaluation, action/condition leaves, tree ticking, and registry with
 * statistics tracking.
 */

import { describe, it, expect } from 'vitest';
import {
  createBlackboard,
  createSequenceNode,
  createSelectorNode,
  createActionNode,
  createConditionNode,
  createBehaviorTree,
  createBehaviorTreeRegistry,
} from '../behavior-tree.js';
import type { BtNodeStatus, BtTickContext, BtBlackboard } from '../behavior-tree.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeContext(overrides: Partial<BtTickContext> = {}): BtTickContext {
  return {
    npcId: overrides.npcId ?? 'npc-1',
    worldId: overrides.worldId ?? 'world-1',
    deltaUs: overrides.deltaUs ?? 16_667n,
    blackboard: overrides.blackboard ?? createBlackboard(),
  };
}

// ── Blackboard ──────────────────────────────────────────────────

describe('Behavior Tree', () => {
  describe('Blackboard', () => {
    it('stores and retrieves values by key', () => {
      const bb = createBlackboard();
      bb.set('health', 100);
      bb.set('target', 'enemy-3');
      expect(bb.get('health')).toBe(100);
      expect(bb.get('target')).toBe('enemy-3');
    });

    it('reports key existence', () => {
      const bb = createBlackboard();
      expect(bb.has('health')).toBe(false);
      bb.set('health', 100);
      expect(bb.has('health')).toBe(true);
    });

    it('returns undefined for missing keys', () => {
      const bb = createBlackboard();
      expect(bb.get('missing')).toBeUndefined();
    });

    it('lists all keys', () => {
      const bb = createBlackboard();
      bb.set('a', 1);
      bb.set('b', 2);
      bb.set('c', 3);
      const keys = bb.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
      expect(keys.length).toBe(3);
    });

    it('clears all entries', () => {
      const bb = createBlackboard();
      bb.set('x', 1);
      bb.set('y', 2);
      bb.clear();
      expect(bb.has('x')).toBe(false);
      expect(bb.keys().length).toBe(0);
    });
  });

  // ── Action Node ─────────────────────────────────────────────────

  describe('ActionNode', () => {
    it('returns the action function result', () => {
      const node = createActionNode('attack', () => 'success' as BtNodeStatus);
      const ctx = makeContext();
      expect(node.tick(ctx)).toBe('success');
    });

    it('can return running status', () => {
      let calls = 0;
      const node = createActionNode('move', () => {
        calls++;
        return (calls < 3 ? 'running' : 'success') as BtNodeStatus;
      });
      const ctx = makeContext();
      expect(node.tick(ctx)).toBe('running');
      expect(node.tick(ctx)).toBe('running');
      expect(node.tick(ctx)).toBe('success');
    });

    it('has correct name', () => {
      const node = createActionNode('patrol', () => 'success' as BtNodeStatus);
      expect(node.name).toBe('patrol');
    });
  });

  // ── Condition Node ──────────────────────────────────────────────

  describe('ConditionNode', () => {
    it('returns success when condition is true', () => {
      const ctx = makeContext();
      ctx.blackboard.set('hasAmmo', true);
      const node = createConditionNode('check-ammo', (c) => c.blackboard.get('hasAmmo') === true);
      expect(node.tick(ctx)).toBe('success');
    });

    it('returns failure when condition is false', () => {
      const ctx = makeContext();
      ctx.blackboard.set('hasAmmo', false);
      const node = createConditionNode('check-ammo', (c) => c.blackboard.get('hasAmmo') === true);
      expect(node.tick(ctx)).toBe('failure');
    });
  });

  // ── Sequence Node ───────────────────────────────────────────────

  describe('SequenceNode', () => {
    it('succeeds when all children succeed', () => {
      const seq = createSequenceNode('all-pass', [
        createActionNode('a', () => 'success'),
        createActionNode('b', () => 'success'),
        createActionNode('c', () => 'success'),
      ]);
      expect(seq.tick(makeContext())).toBe('success');
    });

    it('fails on first failing child', () => {
      const order: string[] = [];
      const seq = createSequenceNode('fail-mid', [
        createActionNode('a', () => { order.push('a'); return 'success'; }),
        createActionNode('b', () => { order.push('b'); return 'failure'; }),
        createActionNode('c', () => { order.push('c'); return 'success'; }),
      ]);
      expect(seq.tick(makeContext())).toBe('failure');
      expect(order).toEqual(['a', 'b']);
    });

    it('returns running and resumes from running child', () => {
      let moveCalls = 0;
      const seq = createSequenceNode('move-then-attack', [
        createActionNode('move', () => {
          moveCalls++;
          return moveCalls >= 2 ? 'success' : 'running';
        }),
        createActionNode('attack', () => 'success'),
      ]);
      const ctx = makeContext();
      expect(seq.tick(ctx)).toBe('running');
      // On second tick, move succeeds and attack runs
      expect(seq.tick(ctx)).toBe('success');
    });

    it('resets running index after completion', () => {
      let counter = 0;
      const seq = createSequenceNode('resetable', [
        createActionNode('count', () => {
          counter++;
          return 'success';
        }),
      ]);
      const ctx = makeContext();
      seq.tick(ctx);
      seq.tick(ctx);
      expect(counter).toBe(2);
    });
  });

  // ── Selector Node ───────────────────────────────────────────────

  describe('SelectorNode', () => {
    it('succeeds on first successful child', () => {
      const order: string[] = [];
      const sel = createSelectorNode('pick-one', [
        createActionNode('a', () => { order.push('a'); return 'failure'; }),
        createActionNode('b', () => { order.push('b'); return 'success'; }),
        createActionNode('c', () => { order.push('c'); return 'success'; }),
      ]);
      expect(sel.tick(makeContext())).toBe('success');
      expect(order).toEqual(['a', 'b']);
    });

    it('fails when all children fail', () => {
      const sel = createSelectorNode('all-fail', [
        createActionNode('a', () => 'failure'),
        createActionNode('b', () => 'failure'),
        createActionNode('c', () => 'failure'),
      ]);
      expect(sel.tick(makeContext())).toBe('failure');
    });

    it('returns running from first running child', () => {
      let runCount = 0;
      const sel = createSelectorNode('run-first', [
        createActionNode('a', () => 'failure'),
        createActionNode('b', () => {
          runCount++;
          return runCount >= 2 ? 'success' : 'running';
        }),
      ]);
      const ctx = makeContext();
      expect(sel.tick(ctx)).toBe('running');
      expect(sel.tick(ctx)).toBe('success');
    });
  });

  // ── Behavior Tree ───────────────────────────────────────────────

  describe('BehaviorTree', () => {
    it('ticks the root node', () => {
      const tree = createBehaviorTree('patrol-tree', createActionNode('patrol', () => 'success'));
      expect(tree.tick(makeContext())).toBe('success');
    });

    it('exposes tree name', () => {
      const tree = createBehaviorTree('guard-tree', createActionNode('guard', () => 'success'));
      expect(tree.name).toBe('guard-tree');
    });
  });

  // ── Registry ────────────────────────────────────────────────────

  describe('BehaviorTreeRegistry', () => {
    it('registers and retrieves trees', () => {
      const registry = createBehaviorTreeRegistry();
      const tree = createBehaviorTree('combat', createActionNode('fight', () => 'success'));
      registry.register(tree);
      expect(registry.get('combat')).toBe(tree);
    });

    it('returns undefined for unregistered tree', () => {
      const registry = createBehaviorTreeRegistry();
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('removes trees', () => {
      const registry = createBehaviorTreeRegistry();
      const tree = createBehaviorTree('temp', createActionNode('noop', () => 'success'));
      registry.register(tree);
      registry.remove('temp');
      expect(registry.get('temp')).toBeUndefined();
    });

    it('lists all registered tree names', () => {
      const registry = createBehaviorTreeRegistry();
      registry.register(createBehaviorTree('a', createActionNode('a', () => 'success')));
      registry.register(createBehaviorTree('b', createActionNode('b', () => 'success')));
      const names = registry.list();
      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names.length).toBe(2);
    });

    it('tracks tick count', () => {
      const registry = createBehaviorTreeRegistry();
      const tree = createBehaviorTree('counter', createActionNode('act', () => 'success'));
      registry.register(tree);
      const ctx = makeContext();
      registry.tickTree('counter', ctx);
      registry.tickTree('counter', ctx);
      registry.tickTree('counter', ctx);
      expect(registry.count()).toBe(1);
    });

    it('tracks stats per tree', () => {
      const registry = createBehaviorTreeRegistry();
      const tree = createBehaviorTree('patrol', createActionNode('walk', () => 'success'));
      registry.register(tree);
      const ctx = makeContext();
      registry.tickTree('patrol', ctx);
      registry.tickTree('patrol', ctx);
      const stats = registry.getStats('patrol');
      expect(stats).toBeDefined();
      expect(stats!.totalTicks).toBe(2);
    });

    it('returns undefined stats for unregistered tree', () => {
      const registry = createBehaviorTreeRegistry();
      expect(registry.getStats('ghost')).toBeUndefined();
    });
  });
});
