/**
 * Consequence Engine — Cross-fabric event consequence orchestration.
 *
 * Wires domain events to their downstream effects across fabrics.
 * This is the membrane that makes isolated systems coherent:
 *
 *   Survey Complete → Chronicle entry → SURVEY/WORLD MARK → Civic boost
 *   Unrest Event    → Chronicle entry → Assembly notification
 *   Vote Result     → Chronicle entry
 *
 * All ports are injected. The engine owns no state — it translates
 * events from one fabric's output into another fabric's input.
 */

import type { Mark, MarksRegistry } from './marks-registry.js';

// ─── Event Types ───────────────────────────────────────────────────

export interface SurveyCompleteEvent {
  readonly missionId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly beaconId: string;
  readonly completedAtUs: number;
}

export interface UnrestNotifyEvent {
  readonly worldId: string;
  readonly unrestLevel: number;
  readonly triggeredAtUs: number;
}

export interface VoteCompleteEvent {
  readonly motionId: string;
  readonly worldId: string;
  readonly passed: boolean;
  readonly yesWeight: number;
  readonly noWeight: number;
  readonly completedAtUs: number;
}

// ─── Result Types ──────────────────────────────────────────────────

export interface SurveyConsequenceResult {
  readonly chronicleEntryId: string;
  readonly surveyMark: Mark;
  readonly worldMark: Mark | null;
}

export interface UnrestConsequenceResult {
  readonly chronicleEntryId: string;
}

export interface VoteConsequenceResult {
  readonly chronicleEntryId: string;
}

// ─── Ports ─────────────────────────────────────────────────────────

export interface ConsequenceChroniclePort {
  append(entry: ConsequenceChronicleEntry): string;
}

export interface ConsequenceChronicleEntry {
  readonly category: string;
  readonly worldId: string;
  readonly subject: string;
  readonly content: string;
}

export interface WorldSurveyedCallback {
  /** Called when a new world is first surveyed. */
  onWorldSurveyed(worldId: string, beaconId: string): void;
}

// ─── Engine Interface ──────────────────────────────────────────────

export interface ConsequenceEngine {
  handleSurveyComplete(event: SurveyCompleteEvent): SurveyConsequenceResult;
  handleUnrestNotify(event: UnrestNotifyEvent): UnrestConsequenceResult;
  handleVoteComplete(event: VoteCompleteEvent): VoteConsequenceResult;
}

// ─── Deps ──────────────────────────────────────────────────────────

export interface ConsequenceEngineDeps {
  readonly chronicle: ConsequenceChroniclePort;
  readonly marksRegistry: MarksRegistry;
  readonly worldSurveyedCallback: WorldSurveyedCallback;
}

// ─── Factory ───────────────────────────────────────────────────────

export function createConsequenceEngine(
  deps: ConsequenceEngineDeps,
): ConsequenceEngine {
  return {
    handleSurveyComplete: (e) => handleSurvey(deps, e),
    handleUnrestNotify: (e) => handleUnrest(deps, e),
    handleVoteComplete: (e) => handleVote(deps, e),
  };
}

// ─── Survey Consequences ───────────────────────────────────────────

function handleSurvey(
  deps: ConsequenceEngineDeps,
  event: SurveyCompleteEvent,
): SurveyConsequenceResult {
  const chronicleEntryId = recordSurveyChronicle(deps, event);
  const surveyMark = awardSurveyMark(deps, event, chronicleEntryId);
  const worldMark = attemptWorldMark(deps, event, chronicleEntryId);
  notifyWorldSurveyed(deps, event);
  return { chronicleEntryId, surveyMark, worldMark };
}

function recordSurveyChronicle(
  deps: ConsequenceEngineDeps,
  event: SurveyCompleteEvent,
): string {
  return deps.chronicle.append({
    category: 'world.transition',
    worldId: event.worldId,
    subject: event.dynastyId,
    content: 'Survey mission completed. Beacon ' + event.beaconId + ' deployed.',
  });
}

function awardSurveyMark(
  deps: ConsequenceEngineDeps,
  event: SurveyCompleteEvent,
  chronicleEntryId: string,
): Mark {
  return deps.marksRegistry.award({
    markType: 'SURVEY',
    dynastyId: event.dynastyId,
    chronicleEntryRef: chronicleEntryId,
    worldId: event.worldId,
  });
}

function attemptWorldMark(
  deps: ConsequenceEngineDeps,
  event: SurveyCompleteEvent,
  _surveyChronicleId: string,
): Mark | null {
  if (deps.marksRegistry.getWorldMark(event.worldId) !== null) {
    return null;
  }
  const worldChronicleId = deps.chronicle.append({
    category: 'player.achievement',
    worldId: event.worldId,
    subject: event.dynastyId,
    content: 'First dynasty to survey world ' + event.worldId,
  });
  return deps.marksRegistry.award({
    markType: 'WORLD',
    dynastyId: event.dynastyId,
    chronicleEntryRef: worldChronicleId,
    worldId: event.worldId,
  });
}

function notifyWorldSurveyed(
  deps: ConsequenceEngineDeps,
  event: SurveyCompleteEvent,
): void {
  deps.worldSurveyedCallback.onWorldSurveyed(event.worldId, event.beaconId);
}

// ─── Unrest Consequences ───────────────────────────────────────────

function handleUnrest(
  deps: ConsequenceEngineDeps,
  event: UnrestNotifyEvent,
): UnrestConsequenceResult {
  const chronicleEntryId = deps.chronicle.append({
    category: 'governance.vote',
    worldId: event.worldId,
    subject: event.worldId,
    content: 'Population unrest reached ' + event.unrestLevel.toFixed(2) + '. Assembly notified.',
  });
  return { chronicleEntryId };
}

// ─── Vote Consequences ─────────────────────────────────────────────

function handleVote(
  deps: ConsequenceEngineDeps,
  event: VoteCompleteEvent,
): VoteConsequenceResult {
  const outcome = event.passed ? 'passed' : 'rejected';
  const chronicleEntryId = deps.chronicle.append({
    category: 'governance.vote',
    worldId: event.worldId,
    subject: event.motionId,
    content: 'Motion ' + event.motionId + ' ' + outcome + '.',
  });
  return { chronicleEntryId };
}
