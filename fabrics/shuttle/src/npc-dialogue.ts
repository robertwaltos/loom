/**
 * npc-dialogue.ts — NPC dialogue state management.
 *
 * Manages active conversations between entities and NPCs. Tracks
 * dialogue trees with node-based navigation, topic transitions,
 * response selection, and conversation history. The dialogue content
 * itself is data-driven — this module manages the runtime state machine.
 */

// ── Ports ────────────────────────────────────────────────────────

interface DialogueIdGenerator {
  readonly next: () => string;
}

interface DialogueClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

interface DialogueNode {
  readonly nodeId: string;
  readonly speaker: 'npc' | 'player';
  readonly text: string;
  readonly responses: readonly DialogueResponse[];
  readonly tags: readonly string[];
}

interface DialogueResponse {
  readonly responseId: string;
  readonly text: string;
  readonly nextNodeId: string | null;
  readonly conditions: readonly string[];
}

interface DialogueTree {
  readonly treeId: string;
  readonly npcEntityId: string;
  readonly rootNodeId: string;
  readonly nodes: ReadonlyMap<string, DialogueNode>;
}

type ConversationStatus = 'active' | 'completed' | 'abandoned';

interface Conversation {
  readonly conversationId: string;
  readonly treeId: string;
  readonly npcEntityId: string;
  readonly playerEntityId: string;
  readonly currentNodeId: string;
  readonly status: ConversationStatus;
  readonly startedAt: number;
  readonly lastInteractionAt: number;
  readonly visitedNodes: readonly string[];
}

interface StartConversationParams {
  readonly treeId: string;
  readonly playerEntityId: string;
}

interface SelectResponseResult {
  readonly conversationId: string;
  readonly nextNode: DialogueNode | null;
  readonly conversationEnded: boolean;
}

interface DialogueStats {
  readonly totalTrees: number;
  readonly activeConversations: number;
  readonly totalStarted: number;
  readonly totalCompleted: number;
  readonly totalAbandoned: number;
}

// ── Public API ───────────────────────────────────────────────────

interface NpcDialogueManager {
  readonly registerTree: (tree: DialogueTree) => boolean;
  readonly removeTree: (treeId: string) => boolean;
  readonly getTree: (treeId: string) => DialogueTree | undefined;
  readonly startConversation: (
    params: StartConversationParams,
  ) => Conversation | undefined;
  readonly selectResponse: (
    conversationId: string,
    responseId: string,
  ) => SelectResponseResult | undefined;
  readonly abandonConversation: (conversationId: string) => boolean;
  readonly getConversation: (
    conversationId: string,
  ) => Conversation | undefined;
  readonly getActiveByPlayer: (
    playerEntityId: string,
  ) => Conversation | undefined;
  readonly getStats: () => DialogueStats;
}

interface NpcDialogueDeps {
  readonly idGenerator: DialogueIdGenerator;
  readonly clock: DialogueClock;
}

// ── State ────────────────────────────────────────────────────────

interface DialogueState {
  readonly trees: Map<string, DialogueTree>;
  readonly conversations: Map<string, MutableConversation>;
  readonly playerConversations: Map<string, string>;
  readonly deps: NpcDialogueDeps;
  totalStarted: number;
  totalCompleted: number;
  totalAbandoned: number;
}

interface MutableConversation {
  readonly conversationId: string;
  readonly treeId: string;
  readonly npcEntityId: string;
  readonly playerEntityId: string;
  currentNodeId: string;
  status: ConversationStatus;
  readonly startedAt: number;
  lastInteractionAt: number;
  readonly visitedNodes: string[];
}

// ── Operations ───────────────────────────────────────────────────

function registerTreeImpl(
  state: DialogueState,
  tree: DialogueTree,
): boolean {
  if (state.trees.has(tree.treeId)) return false;
  state.trees.set(tree.treeId, tree);
  return true;
}

function removeTreeImpl(state: DialogueState, treeId: string): boolean {
  return state.trees.delete(treeId);
}

function startConversationImpl(
  state: DialogueState,
  params: StartConversationParams,
): Conversation | undefined {
  const tree = state.trees.get(params.treeId);
  if (!tree) return undefined;
  if (state.playerConversations.has(params.playerEntityId)) {
    return undefined;
  }
  const now = state.deps.clock.nowMicroseconds();
  const id = state.deps.idGenerator.next();
  const conv: MutableConversation = {
    conversationId: id,
    treeId: params.treeId,
    npcEntityId: tree.npcEntityId,
    playerEntityId: params.playerEntityId,
    currentNodeId: tree.rootNodeId,
    status: 'active',
    startedAt: now,
    lastInteractionAt: now,
    visitedNodes: [tree.rootNodeId],
  };
  state.conversations.set(id, conv);
  state.playerConversations.set(params.playerEntityId, id);
  state.totalStarted++;
  return toConversation(conv);
}

function selectResponseImpl(
  state: DialogueState,
  conversationId: string,
  responseId: string,
): SelectResponseResult | undefined {
  const conv = state.conversations.get(conversationId);
  if (!conv || conv.status !== 'active') return undefined;
  const tree = state.trees.get(conv.treeId);
  if (!tree) return undefined;
  const currentNode = tree.nodes.get(conv.currentNodeId);
  if (!currentNode) return undefined;
  const response = currentNode.responses.find(
    (r) => r.responseId === responseId,
  );
  if (!response) return undefined;
  conv.lastInteractionAt = state.deps.clock.nowMicroseconds();
  if (response.nextNodeId === null) {
    return completeConversation(state, conv);
  }
  const nextNode = tree.nodes.get(response.nextNodeId);
  if (!nextNode) return completeConversation(state, conv);
  conv.currentNodeId = response.nextNodeId;
  conv.visitedNodes.push(response.nextNodeId);
  return {
    conversationId,
    nextNode,
    conversationEnded: false,
  };
}

function completeConversation(
  state: DialogueState,
  conv: MutableConversation,
): SelectResponseResult {
  conv.status = 'completed';
  state.playerConversations.delete(conv.playerEntityId);
  state.totalCompleted++;
  return {
    conversationId: conv.conversationId,
    nextNode: null,
    conversationEnded: true,
  };
}

function abandonConversationImpl(
  state: DialogueState,
  conversationId: string,
): boolean {
  const conv = state.conversations.get(conversationId);
  if (!conv || conv.status !== 'active') return false;
  conv.status = 'abandoned';
  state.playerConversations.delete(conv.playerEntityId);
  state.totalAbandoned++;
  return true;
}

function toConversation(conv: MutableConversation): Conversation {
  return {
    conversationId: conv.conversationId,
    treeId: conv.treeId,
    npcEntityId: conv.npcEntityId,
    playerEntityId: conv.playerEntityId,
    currentNodeId: conv.currentNodeId,
    status: conv.status,
    startedAt: conv.startedAt,
    lastInteractionAt: conv.lastInteractionAt,
    visitedNodes: [...conv.visitedNodes],
  };
}

function getStatsImpl(state: DialogueState): DialogueStats {
  let active = 0;
  for (const conv of state.conversations.values()) {
    if (conv.status === 'active') active++;
  }
  return {
    totalTrees: state.trees.size,
    activeConversations: active,
    totalStarted: state.totalStarted,
    totalCompleted: state.totalCompleted,
    totalAbandoned: state.totalAbandoned,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function getConversationImpl(
  state: DialogueState,
  id: string,
): Conversation | undefined {
  const c = state.conversations.get(id);
  return c ? toConversation(c) : undefined;
}

function getActiveByPlayerImpl(
  state: DialogueState,
  pid: string,
): Conversation | undefined {
  const cid = state.playerConversations.get(pid);
  if (cid === undefined) return undefined;
  const c = state.conversations.get(cid);
  return c ? toConversation(c) : undefined;
}

function initState(deps: NpcDialogueDeps): DialogueState {
  return {
    trees: new Map(),
    conversations: new Map(),
    playerConversations: new Map(),
    deps,
    totalStarted: 0,
    totalCompleted: 0,
    totalAbandoned: 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcDialogueManager(
  deps: NpcDialogueDeps,
): NpcDialogueManager {
  const state = initState(deps);
  return {
    registerTree: (t) => registerTreeImpl(state, t),
    removeTree: (id) => removeTreeImpl(state, id),
    getTree: (id) => state.trees.get(id),
    startConversation: (p) => startConversationImpl(state, p),
    selectResponse: (cid, rid) => selectResponseImpl(state, cid, rid),
    abandonConversation: (id) => abandonConversationImpl(state, id),
    getConversation: (id) => getConversationImpl(state, id),
    getActiveByPlayer: (pid) => getActiveByPlayerImpl(state, pid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcDialogueManager };
export type {
  NpcDialogueManager,
  NpcDialogueDeps,
  DialogueTree,
  DialogueNode,
  DialogueResponse,
  Conversation,
  ConversationStatus,
  StartConversationParams,
  SelectResponseResult,
  DialogueStats,
};
