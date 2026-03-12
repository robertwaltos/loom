/**
 * dialogue-bridge.ts — Connects Interaction → Dialogue → Chronicle.
 *
 * The bridge observes interaction events, initiates dialogue via a
 * hexagonal DialoguePort (implemented by shuttle's NpcDialogueManager),
 * emits dialogue events for the UE5 bridge to render, and on completion
 * creates Chronicle entries and emits interaction.completed.
 *
 * This module lives in loom-core because it orchestrates the pipeline
 * between core systems. Shuttle provides the dialogue content engine;
 * loom-core owns the lifecycle and event flow.
 *
 * Pipeline:
 *   PlayerInput('talk')
 *     → InteractionSystem emits interaction.started(talk)
 *       → DialogueBridge.onTalkStarted()
 *         → DialoguePort.startConversation()
 *           → dialogue.started event
 *             → dialogue.line.spoken events (per node)
 *               → Player response → advance → more lines
 *                 → Terminal node or abandon
 *                   → dialogue.completed event
 *                     → interaction.completed(talk, success|cancelled)
 *                       → ChroniclePort.recordConversation()
 */

import type { EntityId } from '@loom/entities-contracts';
import type { InteractionKind } from '@loom/events-contracts';
import type {
  DialogueEndReason,
  DialogueResponseOption,
  DialogueSpeaker,
} from '@loom/events-contracts';

// ── Constants ───────────────────────────────────────────────────

/** Max ticks a dialogue can stay idle before auto-abandoning. */
const DIALOGUE_TIMEOUT_TICKS = 300; // ~5 seconds at 60fps

/** Priority this bridge checks for timeouts (after interaction 180). */
export const DIALOGUE_BRIDGE_PRIORITY = 185;

// ── Ports (hexagonal boundaries) ────────────────────────────────

/** What a dialogue content provider must implement. */
export interface DialoguePort {
  /** Start a conversation with an NPC, returns conversation state or null. */
  startConversation(
    npcEntityId: string,
    playerEntityId: string,
    treeId: string,
  ): DialoguePortConversation | null;

  /** Player selects a response, advances conversation. */
  selectResponse(
    conversationId: string,
    responseId: string,
  ): DialoguePortAdvance | null;

  /** Abandon a conversation. */
  abandonConversation(conversationId: string): boolean;
}

/** Result of starting a conversation via the port. */
export interface DialoguePortConversation {
  readonly conversationId: string;
  readonly treeId: string;
  readonly firstNode: DialoguePortNode;
}

/** A dialogue node as seen through the port. */
export interface DialoguePortNode {
  readonly nodeId: string;
  readonly speaker: DialogueSpeaker;
  readonly text: string;
  readonly responses: readonly DialogueResponseOption[];
}

/** Result of advancing a conversation. */
export interface DialoguePortAdvance {
  readonly conversationId: string;
  readonly nextNode: DialoguePortNode | null;
  readonly conversationEnded: boolean;
}

/** Port for selecting which dialogue tree fits an NPC. */
export interface TreeSelectorPort {
  /**
   * Given an NPC entity, return the treeId to use.
   * Returns null if the NPC has no dialogue trees registered.
   */
  selectTree(npcEntityId: string): string | null;
}

/** Port for recording completed conversations to the Chronicle. */
export interface ChroniclePort {
  recordConversation(params: ChronicleConversationParams): void;
}

export interface ChronicleConversationParams {
  readonly playerEntityId: string;
  readonly npcEntityId: string;
  readonly npcDisplayName: string;
  readonly worldId: string;
  readonly nodesVisited: number;
  readonly endReason: DialogueEndReason;
}

// ── Event Sink ──────────────────────────────────────────────────

/** Emits dialogue events (consumed by UE5 bridge, archive, etc.). */
export interface DialogueEventSink {
  onDialogueStarted(event: DialogueBridgeStartedEvent): void;
  onDialogueLineSpoken(event: DialogueBridgeLineEvent): void;
  onDialogueCompleted(event: DialogueBridgeCompletedEvent): void;
  onInteractionCompleted(event: DialogueBridgeInteractionComplete): void;
}

export interface DialogueBridgeStartedEvent {
  readonly conversationId: string;
  readonly playerEntityId: string;
  readonly npcEntityId: string;
  readonly npcDisplayName: string;
  readonly worldId: string;
  readonly treeId: string;
  readonly timestamp: number;
}

export interface DialogueBridgeLineEvent {
  readonly conversationId: string;
  readonly playerEntityId: string;
  readonly npcEntityId: string;
  readonly speaker: DialogueSpeaker;
  readonly nodeId: string;
  readonly text: string;
  readonly availableResponses: readonly DialogueResponseOption[];
  readonly worldId: string;
  readonly timestamp: number;
}

export interface DialogueBridgeCompletedEvent {
  readonly conversationId: string;
  readonly playerEntityId: string;
  readonly npcEntityId: string;
  readonly npcDisplayName: string;
  readonly worldId: string;
  readonly endReason: DialogueEndReason;
  readonly nodesVisited: number;
  readonly timestamp: number;
}

export interface DialogueBridgeInteractionComplete {
  readonly playerEntityId: string;
  readonly targetEntityId: string;
  readonly interactionKind: InteractionKind;
  readonly worldId: string;
  readonly outcome: 'success' | 'cancelled';
  readonly timestamp: number;
}

// ── Dependencies ────────────────────────────────────────────────

export interface DialogueBridgeDeps {
  readonly dialoguePort: DialoguePort;
  readonly treeSelector: TreeSelectorPort;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly worldId: string;
  readonly eventSink?: DialogueEventSink;
  readonly chroniclePort?: ChroniclePort;
}

// ── Active Session ──────────────────────────────────────────────

interface ActiveSession {
  readonly conversationId: string;
  readonly playerEntityId: string;
  readonly npcEntityId: string;
  readonly npcDisplayName: string;
  readonly treeId: string;
  nodesVisited: number;
  lastActivityTick: number;
}

// ── Service Interface ───────────────────────────────────────────

export interface DialogueBridgeService {
  /**
   * Called when a talk interaction starts. Returns true if dialogue began.
   */
  onTalkStarted(
    playerEntityId: string,
    npcEntityId: string,
    npcDisplayName: string,
  ): boolean;

  /**
   * Player selects a dialogue response. Advances conversation.
   */
  selectResponse(
    playerEntityId: string,
    responseId: string,
  ): boolean;

  /**
   * Player abandons the current dialogue.
   */
  abandonDialogue(playerEntityId: string): boolean;

  /**
   * Check for timed-out conversations. Called per tick.
   */
  checkTimeouts(tickNumber: number): void;

  /**
   * Get the active session for a player, if any.
   */
  getActiveSession(playerEntityId: string): ActiveSession | undefined;

  /** Number of active dialogue sessions. */
  activeCount(): number;
}

// ── Factory ─────────────────────────────────────────────────────

export function createDialogueBridge(
  deps: DialogueBridgeDeps,
): DialogueBridgeService {
  const sessions = new Map<string, ActiveSession>();
  const { dialoguePort, treeSelector, clock, worldId, eventSink, chroniclePort } = deps;

  function onTalkStarted(
    playerEntityId: string,
    npcEntityId: string,
    npcDisplayName: string,
  ): boolean {
    // One dialogue per player at a time
    if (sessions.has(playerEntityId)) {
      return false;
    }

    const treeId = treeSelector.selectTree(npcEntityId);
    if (treeId === null) {
      return false;
    }

    const result = dialoguePort.startConversation(npcEntityId, playerEntityId, treeId);
    if (result === null) {
      return false;
    }

    const session: ActiveSession = {
      conversationId: result.conversationId,
      playerEntityId,
      npcEntityId,
      npcDisplayName,
      treeId: result.treeId,
      nodesVisited: 1,
      lastActivityTick: 0,
    };
    sessions.set(playerEntityId, session);

    eventSink?.onDialogueStarted({
      conversationId: result.conversationId,
      playerEntityId,
      npcEntityId,
      npcDisplayName,
      worldId,
      treeId: result.treeId,
      timestamp: clock.nowMicroseconds(),
    });

    emitLine(session, result.firstNode);

    return true;
  }

  function selectResponse(
    playerEntityId: string,
    responseId: string,
  ): boolean {
    const session = sessions.get(playerEntityId);
    if (!session) {
      return false;
    }

    const advance = dialoguePort.selectResponse(session.conversationId, responseId);
    if (!advance) {
      return false;
    }

    session.lastActivityTick = 0;

    if (advance.nextNode !== null) {
      session.nodesVisited += 1;
      emitLine(session, advance.nextNode);
    }

    if (advance.conversationEnded || advance.nextNode === null) {
      completeSession(session, 'natural');
    }

    return true;
  }

  function abandonDialogue(playerEntityId: string): boolean {
    const session = sessions.get(playerEntityId);
    if (!session) {
      return false;
    }

    dialoguePort.abandonConversation(session.conversationId);
    completeSession(session, 'abandoned');
    return true;
  }

  function checkTimeouts(tickNumber: number): void {
    for (const [playerId, session] of sessions) {
      session.lastActivityTick += 1;
      if (session.lastActivityTick >= DIALOGUE_TIMEOUT_TICKS) {
        dialoguePort.abandonConversation(session.conversationId);
        completeSession(session, 'timeout');
      }
    }
  }

  function emitLine(session: ActiveSession, node: DialoguePortNode): void {
    eventSink?.onDialogueLineSpoken({
      conversationId: session.conversationId,
      playerEntityId: session.playerEntityId,
      npcEntityId: session.npcEntityId,
      speaker: node.speaker,
      nodeId: node.nodeId,
      text: node.text,
      availableResponses: node.responses,
      worldId,
      timestamp: clock.nowMicroseconds(),
    });
  }

  function completeSession(
    session: ActiveSession,
    endReason: DialogueEndReason,
  ): void {
    sessions.delete(session.playerEntityId);

    eventSink?.onDialogueCompleted({
      conversationId: session.conversationId,
      playerEntityId: session.playerEntityId,
      npcEntityId: session.npcEntityId,
      npcDisplayName: session.npcDisplayName,
      worldId,
      endReason,
      nodesVisited: session.nodesVisited,
      timestamp: clock.nowMicroseconds(),
    });

    const outcome = endReason === 'abandoned' || endReason === 'timeout'
      ? 'cancelled'
      : 'success';

    eventSink?.onInteractionCompleted({
      playerEntityId: session.playerEntityId,
      targetEntityId: session.npcEntityId,
      interactionKind: 'talk',
      worldId,
      outcome,
      timestamp: clock.nowMicroseconds(),
    });

    chroniclePort?.recordConversation({
      playerEntityId: session.playerEntityId,
      npcEntityId: session.npcEntityId,
      npcDisplayName: session.npcDisplayName,
      worldId,
      nodesVisited: session.nodesVisited,
      endReason,
    });
  }

  function getActiveSession(playerEntityId: string): ActiveSession | undefined {
    return sessions.get(playerEntityId);
  }

  function activeCount(): number {
    return sessions.size;
  }

  return {
    onTalkStarted,
    selectResponse,
    abandonDialogue,
    checkTimeouts,
    getActiveSession,
    activeCount,
  };
}
