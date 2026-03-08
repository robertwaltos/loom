import { describe, it, expect } from 'vitest';
import { createNpcDialogueManager } from '../npc-dialogue.js';
import type {
  NpcDialogueDeps,
  DialogueTree,
  DialogueNode,
} from '../npc-dialogue.js';

function makeDeps(): NpcDialogueDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'conv-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

function makeNode(
  nodeId: string,
  text: string,
  responses: DialogueNode['responses'] = [],
): DialogueNode {
  return { nodeId, speaker: 'npc', text, responses, tags: [] };
}

function makeTree(): DialogueTree {
  const greeting = makeNode('greet', 'Hello traveler!', [
    { responseId: 'r1', text: 'Hello', nextNodeId: 'info', conditions: [] },
    { responseId: 'r2', text: 'Goodbye', nextNodeId: null, conditions: [] },
  ]);
  const info = makeNode('info', 'Welcome to the village.', [
    { responseId: 'r3', text: 'Thanks', nextNodeId: null, conditions: [] },
  ]);
  const nodes = new Map<string, DialogueNode>();
  nodes.set('greet', greeting);
  nodes.set('info', info);
  return {
    treeId: 'tree-1',
    npcEntityId: 'npc-1',
    rootNodeId: 'greet',
    nodes,
  };
}

describe('NpcDialogueManager — tree registration', () => {
  it('registers a dialogue tree', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    expect(mgr.registerTree(makeTree())).toBe(true);
    expect(mgr.getTree('tree-1')).toBeDefined();
  });

  it('rejects duplicate tree', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    expect(mgr.registerTree(makeTree())).toBe(false);
  });

  it('removes a tree', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    expect(mgr.removeTree('tree-1')).toBe(true);
    expect(mgr.getTree('tree-1')).toBeUndefined();
  });
});

describe('NpcDialogueManager — start conversation', () => {
  it('starts a conversation at root node', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'player-1',
    });
    expect(conv?.conversationId).toBe('conv-1');
    expect(conv?.currentNodeId).toBe('greet');
    expect(conv?.status).toBe('active');
  });

  it('returns undefined for unknown tree', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    const conv = mgr.startConversation({
      treeId: 'unknown',
      playerEntityId: 'player-1',
    });
    expect(conv).toBeUndefined();
  });

  it('prevents player from having two conversations', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    mgr.startConversation({ treeId: 'tree-1', playerEntityId: 'p1' });
    const second = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    expect(second).toBeUndefined();
  });
});

describe('NpcDialogueManager — response selection', () => {
  it('advances to next node on response', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    const result = mgr.selectResponse(conv?.conversationId ?? '', 'r1');
    expect(result?.conversationEnded).toBe(false);
    expect(result?.nextNode?.nodeId).toBe('info');
  });

  it('ends conversation when nextNodeId is null', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    const result = mgr.selectResponse(conv?.conversationId ?? '', 'r2');
    expect(result?.conversationEnded).toBe(true);
    expect(result?.nextNode).toBeNull();
  });

  it('tracks visited nodes', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    mgr.selectResponse(conv?.conversationId ?? '', 'r1');
    const updated = mgr.getConversation(conv?.conversationId ?? '');
    expect(updated?.visitedNodes).toEqual(['greet', 'info']);
  });

  it('returns undefined for invalid response', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    const result = mgr.selectResponse(conv?.conversationId ?? '', 'invalid');
    expect(result).toBeUndefined();
  });

  it('returns undefined for completed conversation', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    mgr.selectResponse(conv?.conversationId ?? '', 'r2');
    const result = mgr.selectResponse(conv?.conversationId ?? '', 'r1');
    expect(result).toBeUndefined();
  });
});

describe('NpcDialogueManager — abandon', () => {
  it('abandons an active conversation', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    expect(mgr.abandonConversation(conv?.conversationId ?? '')).toBe(true);
    const updated = mgr.getConversation(conv?.conversationId ?? '');
    expect(updated?.status).toBe('abandoned');
  });

  it('allows new conversation after abandon', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const conv = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    mgr.abandonConversation(conv?.conversationId ?? '');
    const next = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    expect(next).toBeDefined();
  });

  it('returns false for non-active conversation', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    expect(mgr.abandonConversation('unknown')).toBe(false);
  });
});

describe('NpcDialogueManager — queries', () => {
  it('gets active conversation by player', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    mgr.startConversation({ treeId: 'tree-1', playerEntityId: 'p1' });
    const active = mgr.getActiveByPlayer('p1');
    expect(active?.playerEntityId).toBe('p1');
    expect(active?.status).toBe('active');
  });

  it('returns undefined when no active for player', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    expect(mgr.getActiveByPlayer('p1')).toBeUndefined();
  });
});

describe('NpcDialogueManager — stats', () => {
  it('tracks aggregate statistics', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    mgr.registerTree(makeTree());
    const c1 = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p1',
    });
    mgr.selectResponse(c1?.conversationId ?? '', 'r2');
    const c2 = mgr.startConversation({
      treeId: 'tree-1',
      playerEntityId: 'p2',
    });
    mgr.abandonConversation(c2?.conversationId ?? '');

    const stats = mgr.getStats();
    expect(stats.totalTrees).toBe(1);
    expect(stats.totalStarted).toBe(2);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.totalAbandoned).toBe(1);
    expect(stats.activeConversations).toBe(0);
  });

  it('starts with zero stats', () => {
    const mgr = createNpcDialogueManager(makeDeps());
    const stats = mgr.getStats();
    expect(stats.totalTrees).toBe(0);
    expect(stats.totalStarted).toBe(0);
  });
});
