import { describe, it, expect } from 'vitest';
import {
  createBtV2Blackboard,
  createBtV2ActionNode,
  createBtV2ConditionNode,
  createBtV2SequenceNode,
  createBtV2SelectorNode,
  createBtV2ParallelNode,
  createBtV2DecoratorNode,
  createBtV2Tree,
  createBtV2TreeBuilder,
} from '../behavior-tree-v2.js';
import type { BtV2TickContext, BtV2TreeDeps } from '../behavior-tree-v2.js';

function makeDeps(): BtV2TreeDeps {
  let id = 0;
  return { idGenerator: { next: () => 'node-' + String(++id) } };
}

function makeCtx(overrides?: Partial<BtV2TickContext>): BtV2TickContext {
  return {
    npcId: overrides?.npcId ?? 'npc-1',
    worldId: overrides?.worldId ?? 'world-1',
    deltaUs: overrides?.deltaUs ?? 16_000,
    blackboard: overrides?.blackboard ?? createBtV2Blackboard(),
    tickCount: overrides?.tickCount ?? 0,
  };
}

describe('BtV2Blackboard', () => {
  it('stores and retrieves values', () => {
    const bb = createBtV2Blackboard();
    bb.set('health', 100);
    expect(bb.get('health')).toBe(100);
    expect(bb.has('health')).toBe(true);
    expect(bb.size()).toBe(1);
  });

  it('clears all values', () => {
    const bb = createBtV2Blackboard();
    bb.set('a', 1);
    bb.set('b', 2);
    bb.clear();
    expect(bb.size()).toBe(0);
    expect(bb.has('a')).toBe(false);
  });

  it('returns keys as array', () => {
    const bb = createBtV2Blackboard();
    bb.set('x', 10);
    bb.set('y', 20);
    expect(bb.keys()).toEqual(['x', 'y']);
  });

  it('creates a snapshot', () => {
    const bb = createBtV2Blackboard();
    bb.set('name', 'guard');
    bb.set('level', 5);
    const snap = bb.snapshot();
    expect(snap['name']).toBe('guard');
    expect(snap['level']).toBe(5);
  });
});

describe('BtV2 Action Node', () => {
  it('returns action result', () => {
    const node = createBtV2ActionNode('a1', 'attack', () => 'success');
    expect(node.tick(makeCtx())).toBe('success');
    expect(node.lastStatus()).toBe('success');
  });

  it('supports running state', () => {
    let count = 0;
    const node = createBtV2ActionNode('a2', 'patrol', () => {
      count++;
      return count < 3 ? 'running' : 'success';
    });
    const ctx = makeCtx();
    expect(node.tick(ctx)).toBe('running');
    expect(node.tick(ctx)).toBe('running');
    expect(node.tick(ctx)).toBe('success');
  });

  it('resets to idle', () => {
    const node = createBtV2ActionNode('a3', 'gather', () => 'success');
    node.tick(makeCtx());
    node.reset();
    expect(node.lastStatus()).toBe('idle');
  });
});

describe('BtV2 Condition Node', () => {
  it('returns success when condition is true', () => {
    const node = createBtV2ConditionNode('c1', 'has-weapon', () => true);
    expect(node.tick(makeCtx())).toBe('success');
  });

  it('returns failure when condition is false', () => {
    const node = createBtV2ConditionNode('c2', 'is-hungry', () => false);
    expect(node.tick(makeCtx())).toBe('failure');
  });
});

describe('BtV2 Sequence Node', () => {
  it('succeeds when all children succeed', () => {
    const children = [
      createBtV2ActionNode('s1', 'step1', () => 'success'),
      createBtV2ActionNode('s2', 'step2', () => 'success'),
    ];
    const seq = createBtV2SequenceNode('seq1', 'do-all', children);
    expect(seq.tick(makeCtx())).toBe('success');
  });

  it('fails on first child failure', () => {
    const children = [
      createBtV2ActionNode('s1', 'step1', () => 'failure'),
      createBtV2ActionNode('s2', 'step2', () => 'success'),
    ];
    const seq = createBtV2SequenceNode('seq2', 'try-all', children);
    expect(seq.tick(makeCtx())).toBe('failure');
  });

  it('remembers running child index', () => {
    let calls = 0;
    const children = [
      createBtV2ActionNode('s1', 'quick', () => 'success'),
      createBtV2ActionNode('s2', 'slow', () => {
        calls++;
        return calls >= 2 ? 'success' : 'running';
      }),
    ];
    const seq = createBtV2SequenceNode('seq3', 'multi-tick', children);
    const ctx = makeCtx();
    expect(seq.tick(ctx)).toBe('running');
    expect(seq.tick(ctx)).toBe('success');
  });
});

describe('BtV2 Selector Node', () => {
  it('succeeds on first child success', () => {
    const children = [
      createBtV2ActionNode('sel1', 'try-a', () => 'failure'),
      createBtV2ActionNode('sel2', 'try-b', () => 'success'),
    ];
    const sel = createBtV2SelectorNode('selector1', 'fallback', children);
    expect(sel.tick(makeCtx())).toBe('success');
  });

  it('fails when all children fail', () => {
    const children = [
      createBtV2ActionNode('sel1', 'try-a', () => 'failure'),
      createBtV2ActionNode('sel2', 'try-b', () => 'failure'),
    ];
    const sel = createBtV2SelectorNode('selector2', 'all-fail', children);
    expect(sel.tick(makeCtx())).toBe('failure');
  });
});

describe('BtV2 Parallel Node', () => {
  it('requires all to succeed with require_all policy', () => {
    const children = [
      createBtV2ActionNode('p1', 'a', () => 'success'),
      createBtV2ActionNode('p2', 'b', () => 'success'),
    ];
    const par = createBtV2ParallelNode('par1', 'both', children, 'require_all');
    expect(par.tick(makeCtx())).toBe('success');
  });

  it('fails on any failure with require_all policy', () => {
    const children = [
      createBtV2ActionNode('p1', 'a', () => 'success'),
      createBtV2ActionNode('p2', 'b', () => 'failure'),
    ];
    const par = createBtV2ParallelNode('par2', 'one-fails', children, 'require_all');
    expect(par.tick(makeCtx())).toBe('failure');
  });

  it('succeeds on any success with require_one policy', () => {
    const children = [
      createBtV2ActionNode('p1', 'a', () => 'failure'),
      createBtV2ActionNode('p2', 'b', () => 'success'),
    ];
    const par = createBtV2ParallelNode('par3', 'any-one', children, 'require_one');
    expect(par.tick(makeCtx())).toBe('success');
  });

  it('returns running when none complete with require_all', () => {
    const children = [
      createBtV2ActionNode('p1', 'a', () => 'success'),
      createBtV2ActionNode('p2', 'b', () => 'running'),
    ];
    const par = createBtV2ParallelNode('par4', 'wait', children, 'require_all');
    expect(par.tick(makeCtx())).toBe('running');
  });
});

describe('BtV2 Decorator Node', () => {
  it('inverter swaps success to failure', () => {
    const child = createBtV2ActionNode('d1', 'child', () => 'success');
    const inv = createBtV2DecoratorNode('dec1', 'not', 'inverter', child, {
      maxRepeats: 1,
      guardFn: null,
    });
    expect(inv.tick(makeCtx())).toBe('failure');
  });

  it('inverter swaps failure to success', () => {
    const child = createBtV2ActionNode('d2', 'child', () => 'failure');
    const inv = createBtV2DecoratorNode('dec2', 'not', 'inverter', child, {
      maxRepeats: 1,
      guardFn: null,
    });
    expect(inv.tick(makeCtx())).toBe('success');
  });

  it('succeeder always returns success', () => {
    const child = createBtV2ActionNode('d3', 'child', () => 'failure');
    const succ = createBtV2DecoratorNode('dec3', 'always-ok', 'succeeder', child, {
      maxRepeats: 1,
      guardFn: null,
    });
    expect(succ.tick(makeCtx())).toBe('success');
  });

  it('guard blocks child when guard returns false', () => {
    const child = createBtV2ActionNode('d4', 'child', () => 'success');
    const g = createBtV2DecoratorNode('dec4', 'gated', 'guard', child, {
      maxRepeats: 1,
      guardFn: () => false,
    });
    expect(g.tick(makeCtx())).toBe('failure');
  });

  it('guard allows child when guard returns true', () => {
    const child = createBtV2ActionNode('d5', 'child', () => 'success');
    const g = createBtV2DecoratorNode('dec5', 'open', 'guard', child, {
      maxRepeats: 1,
      guardFn: () => true,
    });
    expect(g.tick(makeCtx())).toBe('success');
  });

  it('repeater repeats child until maxRepeats', () => {
    let count = 0;
    const child = createBtV2ActionNode('d6', 'child', () => {
      count++;
      return 'success';
    });
    const rep = createBtV2DecoratorNode('dec6', 'repeat3', 'repeater', child, {
      maxRepeats: 3,
      guardFn: null,
    });
    const ctx = makeCtx();
    expect(rep.tick(ctx)).toBe('running');
    expect(rep.tick(ctx)).toBe('running');
    expect(rep.tick(ctx)).toBe('success');
    expect(count).toBe(3);
  });
});

describe('BtV2 Tree', () => {
  it('creates and ticks a tree', () => {
    const root = createBtV2ActionNode('r1', 'root', () => 'success');
    const tree = createBtV2Tree('tree-1', 'simple', root);
    expect(tree.tick(makeCtx())).toBe('success');
    expect(tree.name).toBe('simple');
  });

  it('resets the tree', () => {
    const root = createBtV2ActionNode('r2', 'root', () => 'success');
    const tree = createBtV2Tree('tree-2', 'resettable', root);
    tree.tick(makeCtx());
    tree.reset();
    expect(tree.getRoot().lastStatus()).toBe('idle');
  });

  it('reports node count', () => {
    const root = createBtV2ActionNode('r3', 'root', () => 'success');
    const tree = createBtV2Tree('tree-3', 'counted', root);
    expect(tree.nodeCount()).toBe(1);
  });
});

describe('BtV2 Tree Builder', () => {
  it('builds a simple sequence tree', () => {
    const deps = makeDeps();
    const tree = createBtV2TreeBuilder(deps)
      .sequence('root-seq')
      .action('step1', () => 'success')
      .action('step2', () => 'success')
      .end()
      .build('tree-built', 'built-tree');

    expect(tree.tick(makeCtx())).toBe('success');
    expect(tree.name).toBe('built-tree');
  });

  it('builds nested selector inside sequence', () => {
    const deps = makeDeps();
    const tree = createBtV2TreeBuilder(deps)
      .sequence('root')
      .selector('pick')
      .action('fail', () => 'failure')
      .action('win', () => 'success')
      .end()
      .action('final', () => 'success')
      .end()
      .build('tree-nested', 'nested');

    expect(tree.tick(makeCtx())).toBe('success');
  });

  it('builds tree with inverter decorator', () => {
    const deps = makeDeps();
    const tree = createBtV2TreeBuilder(deps)
      .inverter('flip')
      .action('fail', () => 'failure')
      .end()
      .build('tree-inv', 'inverted');

    expect(tree.tick(makeCtx())).toBe('success');
  });

  it('builds tree with parallel node', () => {
    const deps = makeDeps();
    const tree = createBtV2TreeBuilder(deps)
      .parallel('both', 'require_all')
      .action('a', () => 'success')
      .action('b', () => 'success')
      .end()
      .build('tree-par', 'parallel-tree');

    expect(tree.tick(makeCtx())).toBe('success');
  });
});
