import { describe, it, expect } from 'vitest';
import {
  createBlackboard,
  createActionNode,
  createConditionNode,
  createSequenceNode,
  createSelectorNode,
  createBehaviorTree,
  createBehaviorTreeRegistry,
} from '../behavior-tree.js';
import type { BtTickContext, BtNodeStatus } from '../behavior-tree.js';

function makeCtx(overrides?: Partial<BtTickContext>): BtTickContext {
  return {
    npcId: 'npc-1',
    worldId: 'world-a',
    deltaUs: 16_666,
    blackboard: createBlackboard(),
    ...overrides,
  };
}

describe('BtBlackboard', () => {
  it('stores and retrieves values', () => {
    const bb = createBlackboard();
    bb.set('target', 'enemy-1');
    expect(bb.get('target')).toBe('enemy-1');
    expect(bb.has('target')).toBe(true);
  });

  it('returns undefined for missing keys', () => {
    const bb = createBlackboard();
    expect(bb.get('missing')).toBeUndefined();
    expect(bb.has('missing')).toBe(false);
  });

  it('clears all entries', () => {
    const bb = createBlackboard();
    bb.set('a', 1);
    bb.set('b', 2);
    bb.clear();
    expect(bb.keys()).toHaveLength(0);
  });

  it('lists keys', () => {
    const bb = createBlackboard();
    bb.set('x', 1);
    bb.set('y', 2);
    expect(bb.keys()).toContain('x');
    expect(bb.keys()).toContain('y');
  });
});

describe('BtActionNode', () => {
  it('returns success from action', () => {
    const node = createActionNode('attack', () => 'success');
    expect(node.tick(makeCtx())).toBe('success');
    expect(node.type).toBe('action');
  });

  it('returns running from action', () => {
    const node = createActionNode('move', () => 'running');
    expect(node.tick(makeCtx())).toBe('running');
  });

  it('returns failure from action', () => {
    const node = createActionNode('flee', () => 'failure');
    expect(node.tick(makeCtx())).toBe('failure');
  });
});

describe('BtConditionNode', () => {
  it('returns success when condition true', () => {
    const node = createConditionNode('has_target', () => true);
    expect(node.tick(makeCtx())).toBe('success');
    expect(node.type).toBe('condition');
  });

  it('returns failure when condition false', () => {
    const node = createConditionNode('has_target', () => false);
    expect(node.tick(makeCtx())).toBe('failure');
  });
});

describe('BtSequenceNode', () => {
  it('succeeds when all children succeed', () => {
    const node = createSequenceNode('patrol', [
      createActionNode('move_a', () => 'success'),
      createActionNode('move_b', () => 'success'),
    ]);
    expect(node.tick(makeCtx())).toBe('success');
  });

  it('fails on first child failure', () => {
    const node = createSequenceNode('patrol', [
      createActionNode('move_a', () => 'success'),
      createActionNode('blocked', () => 'failure'),
      createActionNode('move_b', () => 'success'),
    ]);
    expect(node.tick(makeCtx())).toBe('failure');
  });

  it('returns running and resumes from running child', () => {
    let callCount = 0;
    const node = createSequenceNode('long_task', [
      createActionNode('setup', () => 'success'),
      createActionNode('work', () => {
        callCount += 1;
        return callCount >= 2 ? 'success' : 'running';
      }),
      createActionNode('cleanup', () => 'success'),
    ]);

    const ctx = makeCtx();
    expect(node.tick(ctx)).toBe('running');
    expect(node.tick(ctx)).toBe('success');
  });
});

describe('BtSelectorNode', () => {
  it('succeeds on first successful child', () => {
    const node = createSelectorNode('find_food', [
      createActionNode('check_inventory', () => 'failure'),
      createActionNode('forage', () => 'success'),
      createActionNode('trade', () => 'success'),
    ]);
    expect(node.tick(makeCtx())).toBe('success');
  });

  it('fails when all children fail', () => {
    const node = createSelectorNode('find_food', [
      createActionNode('check_inventory', () => 'failure'),
      createActionNode('forage', () => 'failure'),
    ]);
    expect(node.tick(makeCtx())).toBe('failure');
  });

  it('returns running and resumes', () => {
    let attempt = 0;
    const node = createSelectorNode('retry', [
      createActionNode('try_once', () => {
        attempt += 1;
        return attempt >= 2 ? 'success' : 'running';
      }),
    ]);

    const ctx = makeCtx();
    expect(node.tick(ctx)).toBe('running');
    expect(node.tick(ctx)).toBe('success');
  });
});

describe('BehaviorTree', () => {
  it('ticks root node', () => {
    const tree = createBehaviorTree('idle', createActionNode('wait', () => 'success'));
    expect(tree.tick(makeCtx())).toBe('success');
    expect(tree.name).toBe('idle');
  });

  it('reset cascades to root', () => {
    let count = 0;
    const seq = createSequenceNode('seq', [
      createActionNode('first', () => 'success'),
      createActionNode('second', () => {
        count += 1;
        return count >= 2 ? 'success' : 'running';
      }),
    ]);

    const tree = createBehaviorTree('resettable', seq);
    const ctx = makeCtx();

    tree.tick(ctx);
    tree.reset();
    count = 0;
    expect(tree.tick(ctx)).toBe('running');
  });

  it('exposes root node', () => {
    const root = createActionNode('root', () => 'success');
    const tree = createBehaviorTree('simple', root);
    expect(tree.getRoot().name).toBe('root');
  });
});

describe('BehaviorTreeRegistry', () => {
  it('registers and retrieves trees', () => {
    const reg = createBehaviorTreeRegistry();
    const tree = createBehaviorTree('patrol', createActionNode('walk', () => 'success'));
    reg.register(tree);
    expect(reg.get('patrol')).toBeDefined();
    expect(reg.count()).toBe(1);
  });

  it('removes a tree', () => {
    const reg = createBehaviorTreeRegistry();
    reg.register(createBehaviorTree('patrol', createActionNode('walk', () => 'success')));
    expect(reg.remove('patrol')).toBe(true);
    expect(reg.count()).toBe(0);
  });

  it('ticks a registered tree and tracks stats', () => {
    const reg = createBehaviorTreeRegistry();
    reg.register(createBehaviorTree('patrol', createActionNode('walk', () => 'success')));

    const status = reg.tickTree('patrol', makeCtx());
    expect(status).toBe('success');

    const stats = reg.getStats('patrol');
    expect(stats?.totalTicks).toBe(1);
    expect(stats?.successCount).toBe(1);
  });

  it('returns failure for unknown tree name', () => {
    const reg = createBehaviorTreeRegistry();
    expect(reg.tickTree('unknown', makeCtx())).toBe('failure');
  });

  it('lists registered tree names', () => {
    const reg = createBehaviorTreeRegistry();
    reg.register(createBehaviorTree('a', createActionNode('n', () => 'success')));
    reg.register(createBehaviorTree('b', createActionNode('n', () => 'success')));
    expect(reg.list()).toContain('a');
    expect(reg.list()).toContain('b');
  });

  it('tracks failure and running stats', () => {
    const reg = createBehaviorTreeRegistry();
    let status: BtNodeStatus = 'running';
    const tree = createBehaviorTree('flaky', createActionNode('work', () => status));
    reg.register(tree);

    reg.tickTree('flaky', makeCtx());
    status = 'failure';
    reg.tickTree('flaky', makeCtx());

    const stats = reg.getStats('flaky');
    expect(stats?.runningCount).toBe(1);
    expect(stats?.failureCount).toBe(1);
  });
});
