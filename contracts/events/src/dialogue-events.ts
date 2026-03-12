/**
 * Dialogue Events
 *
 * Events emitted during NPC conversations. These flow through the
 * event bus so the UE5 bridge can render dialogue UI, the Chronicle
 * can record notable conversations, and systems can react to
 * dialogue outcomes (faction reputation, trade offers, quest hooks).
 */

import type { LoomEvent } from './event.js';

// ── Dialogue Event Types ────────────────────────────────────────

/**
 * A dialogue conversation has been initiated between player and NPC.
 * UI should open the dialogue panel.
 */
export type DialogueStartedEvent = LoomEvent<
  'dialogue.started',
  {
    readonly conversationId: string;
    readonly playerEntityId: string;
    readonly npcEntityId: string;
    readonly npcDisplayName: string;
    readonly worldId: string;
    readonly treeId: string;
  }
>;

/**
 * An NPC or player spoke a line of dialogue.
 * UI should display the text and any available responses.
 */
export type DialogueLineSpokenEvent = LoomEvent<
  'dialogue.line.spoken',
  {
    readonly conversationId: string;
    readonly playerEntityId: string;
    readonly npcEntityId: string;
    readonly speaker: DialogueSpeaker;
    readonly nodeId: string;
    readonly text: string;
    readonly availableResponses: readonly DialogueResponseOption[];
    readonly worldId: string;
  }
>;

export type DialogueSpeaker = 'npc' | 'player';

export interface DialogueResponseOption {
  readonly responseId: string;
  readonly text: string;
}

/**
 * A conversation has ended, either by reaching a terminal node,
 * player abandoning, or timeout.
 */
export type DialogueCompletedEvent = LoomEvent<
  'dialogue.completed',
  {
    readonly conversationId: string;
    readonly playerEntityId: string;
    readonly npcEntityId: string;
    readonly npcDisplayName: string;
    readonly worldId: string;
    readonly endReason: DialogueEndReason;
    readonly nodesVisited: number;
  }
>;

export type DialogueEndReason = 'natural' | 'abandoned' | 'timeout';
