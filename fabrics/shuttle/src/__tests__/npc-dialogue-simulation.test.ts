import { describe, expect, it } from 'vitest';
import { createNpcDialogueManager } from '../npc-dialogue.js';

describe('npc-dialogue simulation', () => {
  it('simulates branching conversation to completion', () => {
    let id = 0;
    let now = 1_000_000;
    const mgr = createNpcDialogueManager({
      idGenerator: { next: () => `conv-${++id}` },
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    const nodes = new Map();
    nodes.set('root', {
      nodeId: 'root',
      speaker: 'npc',
      text: 'Greetings',
      tags: [],
      responses: [
        { responseId: 'r1', text: 'Hello', nextNodeId: 'info', conditions: [] },
        { responseId: 'r2', text: 'Bye', nextNodeId: null, conditions: [] },
      ],
    });
    nodes.set('info', {
      nodeId: 'info',
      speaker: 'npc',
      text: 'Take this map',
      tags: [],
      responses: [{ responseId: 'r3', text: 'Thanks', nextNodeId: null, conditions: [] }],
    });

    mgr.registerTree({ treeId: 'tree-1', npcEntityId: 'npc-1', rootNodeId: 'root', nodes });
    const conv = mgr.startConversation({ treeId: 'tree-1', playerEntityId: 'player-1' });
    expect(conv).toBeDefined();
    if (!conv) return;

    const step1 = mgr.selectResponse(conv.conversationId, 'r1');
    expect(step1?.conversationEnded).toBe(false);
    const step2 = mgr.selectResponse(conv.conversationId, 'r3');
    expect(step2?.conversationEnded).toBe(true);
    expect(mgr.getStats().totalCompleted).toBe(1);
  });
});
