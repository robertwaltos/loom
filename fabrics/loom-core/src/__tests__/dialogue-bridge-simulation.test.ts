/**
 * dialogue-bridge-simulation.test.ts — Tests the Interaction → Dialogue → Chronicle pipeline.
 *
 * Proves that:
 *   - Talk interaction triggers dialogue via DialoguePort
 *   - Dialogue events flow: started → line.spoken → completed
 *   - Player response selection advances the conversation
 *   - Terminal nodes complete the conversation naturally
 *   - Abandoning a conversation emits cancelled outcome
 *   - Timeout auto-abandons idle conversations
 *   - One dialogue per player enforced
 *   - ChroniclePort receives completed conversations
 *   - interaction.completed fires with correct outcome
 *   - NPC with no tree returns false
 *   - Bible characters can be wired through the bridge
 */

import { describe, it, expect } from 'vitest';
import {
  createDialogueBridge,
  DIALOGUE_BRIDGE_PRIORITY,
} from '../dialogue-bridge.js';
import type {
  DialoguePort,
  DialoguePortConversation,
  DialoguePortNode,
  DialoguePortAdvance,
  TreeSelectorPort,
  ChroniclePort,
  ChronicleConversationParams,
  DialogueBridgeStartedEvent,
  DialogueBridgeLineEvent,
  DialogueBridgeCompletedEvent,
  DialogueBridgeInteractionComplete,
} from '../dialogue-bridge.js';

// ── Test Helpers ────────────────────────────────────────────────

/** Simple dialogue tree: Greeting → Player response → NPC reply → END */
function createSimpleTree(): {
  treeId: string;
  nodes: Map<string, DialoguePortNode>;
  rootNodeId: string;
} {
  const nodes = new Map<string, DialoguePortNode>();

  nodes.set('greeting', {
    nodeId: 'greeting',
    speaker: 'npc',
    text: 'Welcome to Alkahest, traveller. What brings you here?',
    responses: [
      { responseId: 'r-curious', text: 'I seek knowledge of the Lattice.' },
      { responseId: 'r-trade', text: 'I come to trade.' },
      { responseId: 'r-leave', text: 'Nothing. Farewell.' },
    ],
  });

  nodes.set('lattice-talk', {
    nodeId: 'lattice-talk',
    speaker: 'npc',
    text: 'The Lattice connects all worlds through Concordium energy. Few understand it.',
    responses: [
      { responseId: 'r-more', text: 'Tell me more.' },
      { responseId: 'r-done', text: 'Thank you. That is enough.' },
    ],
  });

  nodes.set('trade-talk', {
    nodeId: 'trade-talk',
    speaker: 'npc',
    text: 'I have rare minerals from the Deep Tidal. Interested?',
    responses: [
      { responseId: 'r-yes', text: 'Show me what you have.' },
      { responseId: 'r-no', text: 'Not today.' },
    ],
  });

  nodes.set('deep-lattice', {
    nodeId: 'deep-lattice',
    speaker: 'npc',
    text: 'The Silfen taught the first weavers. That knowledge is lost to most.',
    responses: [], // Terminal: no responses = conversation ends
  });

  nodes.set('farewell', {
    nodeId: 'farewell',
    speaker: 'npc',
    text: 'Safe travels through the Weave.',
    responses: [],
  });

  return { treeId: 'tree-npc-1', nodes, rootNodeId: 'greeting' };
}

/** Response routing map: responseId → nextNodeId (null = end). */
const RESPONSE_ROUTES = new Map<string, string | null>([
  ['r-curious', 'lattice-talk'],
  ['r-trade', 'trade-talk'],
  ['r-leave', 'farewell'],
  ['r-more', 'deep-lattice'],
  ['r-done', 'farewell'],
  ['r-yes', 'farewell'],
  ['r-no', 'farewell'],
]);

function createFakeDialoguePort(): DialoguePort & {
  abandoned: string[];
} {
  const tree = createSimpleTree();
  const conversations = new Map<
    string,
    { currentNodeId: string; status: string; nodesVisited: string[] }
  >();
  let convCounter = 0;
  const abandoned: string[] = [];

  return {
    abandoned,

    startConversation(
      npcEntityId: string,
      playerEntityId: string,
      treeId: string,
    ): DialoguePortConversation | null {
      if (treeId !== tree.treeId) return null;

      convCounter++;
      const conversationId = `conv-${convCounter}`;
      const firstNode = tree.nodes.get(tree.rootNodeId)!;
      conversations.set(conversationId, {
        currentNodeId: tree.rootNodeId,
        status: 'active',
        nodesVisited: [tree.rootNodeId],
      });

      return { conversationId, treeId, firstNode };
    },

    selectResponse(
      conversationId: string,
      responseId: string,
    ): DialoguePortAdvance | null {
      const conv = conversations.get(conversationId);
      if (!conv || conv.status !== 'active') return null;

      const nextNodeId = RESPONSE_ROUTES.get(responseId);
      if (nextNodeId === undefined) return null;

      if (nextNodeId === null) {
        conv.status = 'completed';
        return { conversationId, nextNode: null, conversationEnded: true };
      }

      const nextNode = tree.nodes.get(nextNodeId);
      if (!nextNode) return null;

      conv.currentNodeId = nextNodeId;
      conv.nodesVisited.push(nextNodeId);

      const conversationEnded = nextNode.responses.length === 0;
      if (conversationEnded) {
        conv.status = 'completed';
      }

      return { conversationId, nextNode, conversationEnded };
    },

    abandonConversation(conversationId: string): boolean {
      const conv = conversations.get(conversationId);
      if (!conv || conv.status !== 'active') return false;
      conv.status = 'abandoned';
      abandoned.push(conversationId);
      return true;
    },
  };
}

function createFakeTreeSelector(
  mapping: Record<string, string>,
): TreeSelectorPort {
  return {
    selectTree(npcEntityId: string): string | null {
      return mapping[npcEntityId] ?? null;
    },
  };
}

interface EventLog {
  started: DialogueBridgeStartedEvent[];
  lines: DialogueBridgeLineEvent[];
  completed: DialogueBridgeCompletedEvent[];
  interactionCompleted: DialogueBridgeInteractionComplete[];
}

function createEventLog(): EventLog {
  return { started: [], lines: [], completed: [], interactionCompleted: [] };
}

function createEventSink(log: EventLog) {
  return {
    onDialogueStarted: (e: DialogueBridgeStartedEvent) => log.started.push(e),
    onDialogueLineSpoken: (e: DialogueBridgeLineEvent) => log.lines.push(e),
    onDialogueCompleted: (e: DialogueBridgeCompletedEvent) =>
      log.completed.push(e),
    onInteractionCompleted: (e: DialogueBridgeInteractionComplete) =>
      log.interactionCompleted.push(e),
  };
}

function createClock() {
  let time = 1000000;
  return {
    nowMicroseconds: () => {
      time += 1000;
      return time;
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('DialogueBridge', () => {
  describe('priority', () => {
    it('has priority after interaction system', () => {
      expect(DIALOGUE_BRIDGE_PRIORITY).toBe(185);
    });
  });

  describe('starting dialogue', () => {
    it('starts dialogue on talk interaction', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      const result = bridge.onTalkStarted('player-1', 'npc-1', 'Elder Oluwande');

      expect(result).toBe(true);
      expect(bridge.activeCount()).toBe(1);
      expect(log.started).toHaveLength(1);
      expect(log.started[0]!.npcDisplayName).toBe('Elder Oluwande');
      expect(log.started[0]!.worldId).toBe('alkahest');
    });

    it('emits first dialogue line on start', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder Oluwande');

      expect(log.lines).toHaveLength(1);
      expect(log.lines[0]!.speaker).toBe('npc');
      expect(log.lines[0]!.text).toContain('Welcome to Alkahest');
      expect(log.lines[0]!.availableResponses).toHaveLength(3);
    });

    it('returns false if NPC has no tree', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({}), // no mappings
        clock: createClock(),
        worldId: 'alkahest',
      });

      const result = bridge.onTalkStarted('player-1', 'npc-unknown', 'Nobody');
      expect(result).toBe(false);
      expect(bridge.activeCount()).toBe(0);
    });

    it('prevents concurrent dialogues for same player', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({
          'npc-1': 'tree-npc-1',
          'npc-2': 'tree-npc-1',
        }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      expect(bridge.onTalkStarted('player-1', 'npc-1', 'Elder')).toBe(true);
      expect(bridge.onTalkStarted('player-1', 'npc-2', 'Merchant')).toBe(false);
      expect(bridge.activeCount()).toBe(1);
    });

    it('different players can have concurrent dialogues', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({
          'npc-1': 'tree-npc-1',
          'npc-2': 'tree-npc-1',
        }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      expect(bridge.onTalkStarted('player-1', 'npc-1', 'Elder')).toBe(true);
      expect(bridge.onTalkStarted('player-2', 'npc-2', 'Merchant')).toBe(true);
      expect(bridge.activeCount()).toBe(2);
    });
  });

  describe('response selection', () => {
    it('advances conversation on response', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      const result = bridge.selectResponse('player-1', 'r-curious');

      expect(result).toBe(true);
      expect(log.lines).toHaveLength(2); // greeting + lattice-talk
      expect(log.lines[1]!.text).toContain('Lattice connects all worlds');
    });

    it('completes conversation on terminal node', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-curious');    // → lattice-talk
      bridge.selectResponse('player-1', 'r-more');        // → deep-lattice (terminal)

      expect(log.completed).toHaveLength(1);
      expect(log.completed[0]!.endReason).toBe('natural');
      expect(log.completed[0]!.nodesVisited).toBe(3);
      expect(bridge.activeCount()).toBe(0);
    });

    it('completes via farewell path', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-leave');       // → farewell (terminal)

      expect(log.completed).toHaveLength(1);
      expect(log.completed[0]!.endReason).toBe('natural');
      expect(log.completed[0]!.nodesVisited).toBe(2);
    });

    it('returns false for invalid response', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      const result = bridge.selectResponse('player-1', 'r-nonexistent');
      expect(result).toBe(false);
    });

    it('returns false if player has no active dialogue', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({}),
        clock: createClock(),
        worldId: 'alkahest',
      });

      expect(bridge.selectResponse('player-1', 'r-curious')).toBe(false);
    });
  });

  describe('abandoning dialogue', () => {
    it('abandons active conversation', () => {
      const log = createEventLog();
      const port = createFakeDialoguePort();
      const bridge = createDialogueBridge({
        dialoguePort: port,
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      const result = bridge.abandonDialogue('player-1');

      expect(result).toBe(true);
      expect(bridge.activeCount()).toBe(0);
      expect(log.completed).toHaveLength(1);
      expect(log.completed[0]!.endReason).toBe('abandoned');
      expect(port.abandoned).toHaveLength(1);
    });

    it('returns false if no active dialogue', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({}),
        clock: createClock(),
        worldId: 'alkahest',
      });

      expect(bridge.abandonDialogue('player-1')).toBe(false);
    });
  });

  describe('timeout', () => {
    it('auto-abandons idle conversations after timeout', () => {
      const log = createEventLog();
      const port = createFakeDialoguePort();
      const bridge = createDialogueBridge({
        dialoguePort: port,
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');

      // Simulate 300 ticks of inactivity
      for (let t = 1; t <= 300; t++) {
        bridge.checkTimeouts(t);
      }

      expect(bridge.activeCount()).toBe(0);
      expect(log.completed).toHaveLength(1);
      expect(log.completed[0]!.endReason).toBe('timeout');
      expect(port.abandoned).toHaveLength(1);
    });

    it('does not timeout if player responds', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');

      // 200 ticks idle then respond (resets timer)
      for (let t = 1; t <= 200; t++) {
        bridge.checkTimeouts(t);
      }
      bridge.selectResponse('player-1', 'r-curious');

      // Another 200 ticks — should NOT timeout since timer reset
      for (let t = 201; t <= 400; t++) {
        bridge.checkTimeouts(t);
      }

      expect(bridge.activeCount()).toBe(1);
      expect(log.completed).toHaveLength(0);
    });
  });

  describe('interaction completed events', () => {
    it('emits success on natural completion', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-leave'); // terminal

      expect(log.interactionCompleted).toHaveLength(1);
      expect(log.interactionCompleted[0]!.outcome).toBe('success');
      expect(log.interactionCompleted[0]!.interactionKind).toBe('talk');
    });

    it('emits cancelled on abandon', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.abandonDialogue('player-1');

      expect(log.interactionCompleted).toHaveLength(1);
      expect(log.interactionCompleted[0]!.outcome).toBe('cancelled');
    });

    it('emits cancelled on timeout', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      for (let t = 1; t <= 300; t++) {
        bridge.checkTimeouts(t);
      }

      expect(log.interactionCompleted).toHaveLength(1);
      expect(log.interactionCompleted[0]!.outcome).toBe('cancelled');
    });
  });

  describe('chronicle integration', () => {
    it('records completed conversation to chronicle', () => {
      const records: ChronicleConversationParams[] = [];
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        chroniclePort: {
          recordConversation: (p) => records.push(p),
        },
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder Oluwande');
      bridge.selectResponse('player-1', 'r-curious');    // lattice-talk
      bridge.selectResponse('player-1', 'r-more');        // deep-lattice (terminal)

      expect(records).toHaveLength(1);
      expect(records[0]!.npcDisplayName).toBe('Elder Oluwande');
      expect(records[0]!.nodesVisited).toBe(3);
      expect(records[0]!.endReason).toBe('natural');
      expect(records[0]!.worldId).toBe('alkahest');
    });

    it('records abandoned conversation too', () => {
      const records: ChronicleConversationParams[] = [];
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        chroniclePort: {
          recordConversation: (p) => records.push(p),
        },
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.abandonDialogue('player-1');

      expect(records).toHaveLength(1);
      expect(records[0]!.endReason).toBe('abandoned');
    });
  });

  describe('session tracking', () => {
    it('tracks active session per player', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      expect(bridge.getActiveSession('player-1')).toBeUndefined();

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      const session = bridge.getActiveSession('player-1');

      expect(session).toBeDefined();
      expect(session!.npcDisplayName).toBe('Elder');
      expect(session!.nodesVisited).toBe(1);
    });

    it('clears session on completion', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-leave'); // terminal

      expect(bridge.getActiveSession('player-1')).toBeUndefined();
      expect(bridge.activeCount()).toBe(0);
    });

    it('allows new dialogue after completion', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-leave');

      // Should be able to start a new dialogue
      expect(bridge.onTalkStarted('player-1', 'npc-1', 'Elder')).toBe(true);
    });
  });

  describe('no event sink', () => {
    it('works without event sink', () => {
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-curious');
      bridge.selectResponse('player-1', 'r-done');

      // No crash, conversation completed
      expect(bridge.activeCount()).toBe(0);
    });
  });

  describe('multi-path conversation', () => {
    it('trade path through dialogue tree', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Merchant');
      bridge.selectResponse('player-1', 'r-trade');     // → trade-talk
      bridge.selectResponse('player-1', 'r-yes');        // → farewell (terminal)

      expect(log.lines).toHaveLength(3); // greeting + trade-talk + farewell
      expect(log.lines[1]!.text).toContain('rare minerals');
      expect(log.lines[2]!.text).toContain('Safe travels');
      expect(log.completed).toHaveLength(1);
      expect(log.completed[0]!.nodesVisited).toBe(3);
    });

    it('deep lattice path through dialogue tree', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Sage');
      bridge.selectResponse('player-1', 'r-curious');    // → lattice-talk
      bridge.selectResponse('player-1', 'r-more');        // → deep-lattice (terminal)

      expect(log.lines).toHaveLength(3);
      expect(log.lines[2]!.text).toContain('Silfen taught');
      expect(log.completed[0]!.nodesVisited).toBe(3);
    });

    it('short farewell path', () => {
      const log = createEventLog();
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: createEventSink(log),
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'NPC');
      bridge.selectResponse('player-1', 'r-leave');       // → farewell

      // 2 nodes: greeting + farewell
      expect(log.lines).toHaveLength(2);
      expect(log.completed[0]!.nodesVisited).toBe(2);
    });
  });

  describe('full pipeline event ordering', () => {
    it('events flow in correct order: started → lines → completed → interaction', () => {
      const events: string[] = [];
      const bridge = createDialogueBridge({
        dialoguePort: createFakeDialoguePort(),
        treeSelector: createFakeTreeSelector({ 'npc-1': 'tree-npc-1' }),
        clock: createClock(),
        worldId: 'alkahest',
        eventSink: {
          onDialogueStarted: () => events.push('started'),
          onDialogueLineSpoken: () => events.push('line'),
          onDialogueCompleted: () => events.push('completed'),
          onInteractionCompleted: () => events.push('interaction-done'),
        },
        chroniclePort: {
          recordConversation: () => events.push('chronicle'),
        },
      });

      bridge.onTalkStarted('player-1', 'npc-1', 'Elder');
      bridge.selectResponse('player-1', 'r-leave');

      expect(events).toEqual([
        'started',
        'line',          // greeting
        'line',          // farewell (terminal triggers line + complete)
        'completed',
        'interaction-done',
        'chronicle',
      ]);
    });
  });
});
