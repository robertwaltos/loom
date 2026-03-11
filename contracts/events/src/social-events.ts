/**
 * Social Events — Chat, Alliances, Governance, and Player-Driven Events
 *
 * All social interactions flow through typed events on the event bus.
 * Chat messages, alliance state changes, governance actions,
 * and player-driven festivals are first-class citizens.
 */

import type { LoomEvent } from './event.js';

// ── Chat Events ─────────────────────────────────────────────────

export type ChatChannelType =
  | 'world-local'
  | 'dynasty'
  | 'assembly'
  | 'whisper'
  | 'trade'
  | 'alliance'
  | 'party'
  | 'global';

export type ChatMessageSentEvent = LoomEvent<
  'chat.message.sent',
  {
    readonly messageId: string;
    readonly channelId: string;
    readonly channelType: ChatChannelType;
    readonly senderId: string;
    readonly senderDisplayName: string;
    readonly content: string;
    readonly worldId: string;
    readonly replyToMessageId: string | null;
  }
>;

export type ChatMessageModeratedEvent = LoomEvent<
  'chat.message.moderated',
  {
    readonly messageId: string;
    readonly channelId: string;
    readonly senderId: string;
    readonly action: 'filtered' | 'blocked' | 'flagged';
    readonly reason: string;
    readonly moderationType: 'automated' | 'manual';
    readonly originalContent: string;
  }
>;

export type ChatChannelJoinedEvent = LoomEvent<
  'chat.channel.joined',
  {
    readonly channelId: string;
    readonly channelType: ChatChannelType;
    readonly playerId: string;
    readonly worldId: string;
  }
>;

export type ChatChannelLeftEvent = LoomEvent<
  'chat.channel.left',
  {
    readonly channelId: string;
    readonly channelType: ChatChannelType;
    readonly playerId: string;
    readonly reason: 'voluntary' | 'kicked' | 'banned' | 'disconnect';
  }
>;

export type ChatReactionAddedEvent = LoomEvent<
  'chat.reaction.added',
  {
    readonly messageId: string;
    readonly channelId: string;
    readonly playerId: string;
    readonly emoji: string;
  }
>;

export type ChatPlayerMutedEvent = LoomEvent<
  'chat.player.muted',
  {
    readonly playerId: string;
    readonly channelId: string | null;
    readonly mutedBy: string;
    readonly durationMs: number;
    readonly reason: string;
  }
>;

// ── Alliance Events ─────────────────────────────────────────────

export type AllianceFormedEvent = LoomEvent<
  'alliance.formed',
  {
    readonly allianceId: string;
    readonly allianceName: string;
    readonly founderId: string;
    readonly allianceType: string;
    readonly memberDynastyIds: ReadonlyArray<string>;
  }
>;

export type AllianceWarDeclaredEvent = LoomEvent<
  'alliance.war.declared',
  {
    readonly warId: string;
    readonly attackerAllianceId: string;
    readonly defenderAllianceId: string;
    readonly declarationReason: string;
    readonly preparationEndsAt: number;
  }
>;

export type AllianceTreatyBrokenEvent = LoomEvent<
  'alliance.treaty.broken',
  {
    readonly treatyId: string;
    readonly breakingDynastyId: string;
    readonly victimDynastyId: string;
    readonly violationType: string;
    readonly kalonPenalty: bigint;
  }
>;

export type AlliancePeaceNegotiatedEvent = LoomEvent<
  'alliance.peace.negotiated',
  {
    readonly warId: string;
    readonly initiatorId: string;
    readonly responderId: string;
    readonly reparationsKalon: bigint;
    readonly territoryConcessions: ReadonlyArray<string>;
  }
>;

// ── Governance Events ───────────────────────────────────────────

export type GovernanceProposalSubmittedEvent = LoomEvent<
  'governance.proposal.submitted',
  {
    readonly proposalId: string;
    readonly worldId: string;
    readonly proposerId: string;
    readonly category: 'economic' | 'territorial' | 'social' | 'constitutional';
    readonly title: string;
    readonly description: string;
    readonly debateEndsAt: number;
  }
>;

export type GovernanceVoteCastEvent = LoomEvent<
  'governance.vote.cast',
  {
    readonly proposalId: string;
    readonly voterId: string;
    readonly choice: 'for' | 'against' | 'abstain';
    readonly weight: number;
    readonly worldId: string;
  }
>;

export type GovernanceLegislationEnactedEvent = LoomEvent<
  'governance.legislation.enacted',
  {
    readonly proposalId: string;
    readonly worldId: string;
    readonly category: string;
    readonly title: string;
    readonly effectParameters: Readonly<Record<string, number>>;
    readonly enactedAt: number;
  }
>;

export type GovernanceElectionHeldEvent = LoomEvent<
  'governance.election.held',
  {
    readonly electionId: string;
    readonly worldId: string;
    readonly role: string;
    readonly winnerId: string;
    readonly totalVotes: number;
    readonly turnout: number;
  }
>;

// ── Player Event / Festival Events ──────────────────────────────

export type PlayerEventProposedEvent = LoomEvent<
  'player.event.proposed',
  {
    readonly eventId: string;
    readonly worldId: string;
    readonly proposerId: string;
    readonly eventType: 'festival' | 'tournament' | 'expedition' | 'ceremony' | 'market-fair';
    readonly title: string;
    readonly description: string;
    readonly scheduledStartAt: number;
    readonly scheduledEndAt: number;
    readonly maxParticipants: number;
  }
>;

export type PlayerEventStartedEvent = LoomEvent<
  'player.event.started',
  {
    readonly eventId: string;
    readonly worldId: string;
    readonly eventType: string;
    readonly participantCount: number;
  }
>;

export type TournamentMatchCompletedEvent = LoomEvent<
  'tournament.match.completed',
  {
    readonly tournamentId: string;
    readonly matchId: string;
    readonly roundNumber: number;
    readonly winnerId: string;
    readonly loserId: string;
    readonly bracket: 'winners' | 'losers' | 'finals';
  }
>;

export type FestivalEconomyBoostEvent = LoomEvent<
  'festival.economy.boost',
  {
    readonly eventId: string;
    readonly worldId: string;
    readonly tradeBonus: number;
    readonly craftingBonus: number;
    readonly durationMs: number;
  }
>;
