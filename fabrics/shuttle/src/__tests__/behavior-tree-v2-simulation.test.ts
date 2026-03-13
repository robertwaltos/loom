import { describe, expect, it } from 'vitest';
import {
  createBtV2ActionNode,
  createBtV2ConditionNode,
  createBtV2SequenceNode,
  createBtV2Tree,
  createBtV2Blackboard,
} from '../behavior-tree-v2.js';

describe('behavior-tree-v2 simulation', () => {
  it('simulates a patrol-then-engage decision loop across ticks', () => {
    let patrolTicks = 0;
    const bb = createBtV2Blackboard();
    bb.set('enemyVisible', false);

    const patrol = createBtV2ActionNode('a1', 'patrol', () => {
      patrolTicks += 1;
      if (patrolTicks >= 2) bb.set('enemyVisible', true);
      return 'success';
    });
    const hasEnemy = createBtV2ConditionNode('c1', 'enemy-visible', (ctx) => ctx.blackboard.get('enemyVisible') === true);
    const attack = createBtV2ActionNode('a2', 'attack', () => 'success');
    const root = createBtV2SequenceNode('s1', 'root-seq', [patrol, hasEnemy, attack]);
    const tree = createBtV2Tree('combat-tree-id', 'combat-tree', root);

    const ctx = {
      npcId: 'npc-1',
      worldId: 'world-1',
      deltaUs: 16_000,
      blackboard: bb,
      tickCount: 0,
    };

    expect(tree.tick(ctx)).toBe('failure');
    expect(tree.tick({ ...ctx, tickCount: 1 })).toBe('success');
  });
});
