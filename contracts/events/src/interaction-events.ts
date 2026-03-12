/**
 * Interaction & Chronicle Events
 *
 * Events emitted when players interact with NPCs, objects, and
 * Chronicle terminals. These flow through the event bus so any
 * fabric can react — shuttle for AI dialogue, nakama for economy,
 * archive for Chronicle persistence.
 */

import type { LoomEvent } from './event.js';

// ── Interaction Types ───────────────────────────────────────────

export type InteractionKind = 'talk' | 'trade' | 'inspect' | 'use' | 'pickup';

// ── Interaction Events ──────────────────────────────────────────

/**
 * Player entered interaction range of an interactable entity.
 * UI should show the interaction prompt.
 */
export type InteractionAvailableEvent = LoomEvent<
  'interaction.available',
  {
    readonly playerEntityId: string;
    readonly targetEntityId: string;
    readonly targetDisplayName: string;
    readonly availableInteractions: ReadonlyArray<InteractionKind>;
    readonly worldId: string;
  }
>;

/**
 * Player left interaction range — hide the prompt.
 */
export type InteractionUnavailableEvent = LoomEvent<
  'interaction.unavailable',
  {
    readonly playerEntityId: string;
    readonly targetEntityId: string;
    readonly worldId: string;
  }
>;

/**
 * Player initiated an interaction with an entity.
 */
export type InteractionStartedEvent = LoomEvent<
  'interaction.started',
  {
    readonly playerEntityId: string;
    readonly targetEntityId: string;
    readonly targetDisplayName: string;
    readonly interactionKind: InteractionKind;
    readonly worldId: string;
  }
>;

/**
 * Interaction completed (dialogue finished, trade closed, item picked up).
 */
export type InteractionCompletedEvent = LoomEvent<
  'interaction.completed',
  {
    readonly playerEntityId: string;
    readonly targetEntityId: string;
    readonly interactionKind: InteractionKind;
    readonly worldId: string;
    readonly outcome: InteractionOutcome;
  }
>;

export type InteractionOutcome =
  | 'success'
  | 'cancelled'
  | 'failed'
  | 'blocked';

// ── Chronicle Events ────────────────────────────────────────────

/**
 * Player accessed a Chronicle terminal and read an entry.
 */
export type ChronicleEntryReadEvent = LoomEvent<
  'chronicle.entry.read',
  {
    readonly playerEntityId: string;
    readonly terminalEntityId: string;
    readonly entryId: string;
    readonly worldId: string;
  }
>;

/**
 * A new Chronicle entry was created by a player or NPC action.
 * Chronicle entries are immutable once written (Permanence Covenant).
 */
export type ChronicleEntryCreatedEvent = LoomEvent<
  'chronicle.entry.created',
  {
    readonly entryId: string;
    readonly authorEntityId: string;
    readonly worldId: string;
    readonly entryType: ChronicleEntryType;
    readonly summary: string;
    readonly timestamp: number;
  }
>;

export type ChronicleEntryType =
  | 'governance'
  | 'economic'
  | 'social'
  | 'military'
  | 'discovery'
  | 'personal';

/**
 * Player searched the Chronicle and received results.
 */
export type ChronicleSearchEvent = LoomEvent<
  'chronicle.search',
  {
    readonly playerEntityId: string;
    readonly terminalEntityId: string;
    readonly query: string;
    readonly resultCount: number;
    readonly worldId: string;
  }
>;
