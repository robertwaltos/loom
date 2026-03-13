import { describe, it, expect, vi } from 'vitest';
import { createDialogueBridge, DIALOGUE_BRIDGE_PRIORITY } from '../dialogue-bridge.js';
import type {
  DialogueBridgeDeps,
  DialoguePort,
  TreeSelectorPort,
} from '../dialogue-bridge.js';

// ── Mock Factories ────────────────────────────────────────────

const FIRST_NODE = {
  nodeId: 'node-1',
  speaker: 'npc' as const,
  text: 'Hello traveller.',
  responses: [{ responseId: 'r1', text: 'Hello.', isTerminal: false }],
};

const SECOND_NODE = {
  nodeId: 'node-2',
  speaker: 'npc' as const,
  text: 'How can I help?',
  responses: [],
};

function makeDialoguePort(): DialoguePort {
  return {
    startConversation: vi.fn().mockReturnValue({
      conversationId: 'conv-1',
      treeId: 'tree-a',
      firstNode: FIRST_NODE,
    }),
    selectResponse: vi.fn().mockReturnValue({
      conversationId: 'conv-1',
      nextNode: SECOND_NODE,
      conversationEnded: false,
    }),
    abandonConversation: vi.fn().mockReturnValue(true),
  };
}

function makeTreeSelector(treeId: string | null = 'tree-a'): TreeSelectorPort {
  return { selectTree: vi.fn().mockReturnValue(treeId) };
}

interface DepsWithSpies {
  deps: DialogueBridgeDeps;
  onDialogueStarted: ReturnType<typeof vi.fn>;
  onDialogueLineSpoken: ReturnType<typeof vi.fn>;
  onDialogueCompleted: ReturnType<typeof vi.fn>;
  onInteractionCompleted: ReturnType<typeof vi.fn>;
  recordConversation: ReturnType<typeof vi.fn>;
}

function makeDeps(overrides: Partial<DialogueBridgeDeps> = {}): DepsWithSpies {
  const onDialogueStarted = vi.fn();
  const onDialogueLineSpoken = vi.fn();
  const onDialogueCompleted = vi.fn();
  const onInteractionCompleted = vi.fn();
  const recordConversation = vi.fn();
  const deps: DialogueBridgeDeps = {
    dialoguePort: makeDialoguePort(),
    treeSelector: makeTreeSelector(),
    clock: { nowMicroseconds: () => 0 },
    worldId: 'world-a',
    eventSink: { onDialogueStarted, onDialogueLineSpoken, onDialogueCompleted, onInteractionCompleted },
    chroniclePort: { recordConversation },
    ...overrides,
  };
  return { deps, onDialogueStarted, onDialogueLineSpoken, onDialogueCompleted, onInteractionCompleted, recordConversation };
}

// ── priority ───────────────────────────────────────────────────

describe('DIALOGUE_BRIDGE_PRIORITY', () => {
  it('is 185', () => {
    expect(DIALOGUE_BRIDGE_PRIORITY).toBe(185);
  });
});

// ── factory ────────────────────────────────────────────────────

describe('createDialogueBridge — initial state', () => {
  it('starts with zero active sessions', () => {
    expect(createDialogueBridge(makeDeps().deps).activeCount()).toBe(0);
  });
});

// ── onTalkStarted ──────────────────────────────────────────────

describe('onTalkStarted — success path', () => {
  it('returns true when tree and conversation exist', () => {
    const { deps } = makeDeps();
    const bridge = createDialogueBridge(deps);
    expect(bridge.onTalkStarted('p1', 'npc-1', 'Guard')).toBe(true);
  });

  it('increments activeCount on success', () => {
    const { deps } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    expect(bridge.activeCount()).toBe(1);
  });

  it('fires onDialogueStarted event', () => {
    const { deps, onDialogueStarted } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    expect(onDialogueStarted).toHaveBeenCalledWith(
      expect.objectContaining({ playerEntityId: 'p1', npcEntityId: 'npc-1' }),
    );
  });

  it('fires onDialogueLineSpoken for first node', () => {
    const { deps, onDialogueLineSpoken } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    expect(onDialogueLineSpoken).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'node-1', text: 'Hello traveller.' }),
    );
  });
});

describe('onTalkStarted — failure paths', () => {
  it('returns false when no tree is available', () => {
    const { deps } = makeDeps({ treeSelector: makeTreeSelector(null) });
    expect(createDialogueBridge(deps).onTalkStarted('p1', 'npc-1', 'Guard')).toBe(false);
  });

  it('returns false when dialoguePort returns null', () => {
    const port = makeDialoguePort();
    (port.startConversation as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const { deps } = makeDeps({ dialoguePort: port });
    expect(createDialogueBridge(deps).onTalkStarted('p1', 'npc-1', 'Guard')).toBe(false);
  });

  it('returns false when player already has an active session', () => {
    const { deps } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    expect(bridge.onTalkStarted('p1', 'npc-2', 'Scholar')).toBe(false);
  });
});

// ── selectResponse ─────────────────────────────────────────────

describe('selectResponse', () => {
  it('returns false when no active session exists', () => {
    const { deps } = makeDeps();
    expect(createDialogueBridge(deps).selectResponse('p1', 'r1')).toBe(false);
  });

  it('returns true and emits next line when advance succeeds', () => {
    const { deps, onDialogueLineSpoken } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    expect(bridge.selectResponse('p1', 'r1')).toBe(true);
    expect(onDialogueLineSpoken).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'node-2' }),
    );
  });

  it('completes session when conversationEnded is true', () => {
    const port = makeDialoguePort();
    (port.selectResponse as ReturnType<typeof vi.fn>).mockReturnValue({
      conversationId: 'conv-1',
      nextNode: null,
      conversationEnded: true,
    });
    const { deps } = makeDeps({ dialoguePort: port });
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    bridge.selectResponse('p1', 'r1');
    expect(bridge.activeCount()).toBe(0);
  });

  it('records conversation in chroniclePort on completion', () => {
    const port = makeDialoguePort();
    (port.selectResponse as ReturnType<typeof vi.fn>).mockReturnValue({
      conversationId: 'conv-1',
      nextNode: null,
      conversationEnded: true,
    });
    const { deps, recordConversation } = makeDeps({ dialoguePort: port });
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    bridge.selectResponse('p1', 'r1');
    expect(recordConversation).toHaveBeenCalledWith(
      expect.objectContaining({ endReason: 'natural', playerEntityId: 'p1' }),
    );
  });
});

// ── abandonDialogue ────────────────────────────────────────────

describe('abandonDialogue', () => {
  it('returns false when no active session', () => {
    const { deps } = makeDeps();
    expect(createDialogueBridge(deps).abandonDialogue('p1')).toBe(false);
  });

  it('returns true and ends session', () => {
    const { deps } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    expect(bridge.abandonDialogue('p1')).toBe(true);
    expect(bridge.activeCount()).toBe(0);
  });

  it('emits cancelled outcome on abandon', () => {
    const { deps, onInteractionCompleted } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    bridge.abandonDialogue('p1');
    expect(onInteractionCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'cancelled' }),
    );
  });
});

// ── checkTimeouts ──────────────────────────────────────────────

describe('checkTimeouts', () => {
  it('times out session after 300 ticks of inactivity', () => {
    const { deps, onInteractionCompleted } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    for (let i = 0; i < 300; i++) {
      bridge.checkTimeouts(i);
    }
    expect(bridge.activeCount()).toBe(0);
    expect(onInteractionCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'cancelled' }),
    );
  });
});

// ── getActiveSession ───────────────────────────────────────────

describe('getActiveSession', () => {
  it('returns undefined when no session exists', () => {
    const { deps } = makeDeps();
    expect(createDialogueBridge(deps).getActiveSession('p1')).toBeUndefined();
  });

  it('returns session with correct conversationId after start', () => {
    const { deps } = makeDeps();
    const bridge = createDialogueBridge(deps);
    bridge.onTalkStarted('p1', 'npc-1', 'Guard');
    const session = bridge.getActiveSession('p1');
    expect(session?.conversationId).toBe('conv-1');
    expect(session?.npcDisplayName).toBe('Guard');
  });
});
