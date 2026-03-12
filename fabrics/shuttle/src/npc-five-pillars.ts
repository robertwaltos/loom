/**
 * NPC Five-Pillar Architecture — Deep character psychology framework.
 *
 * Bible v2.0: Every Notable+ NPC is built on five interlocking pillars
 * that drive behavior, dialogue, and narrative arc. These are server-only
 * data — never exposed to clients.
 *
 * The Five Pillars:
 *   1. Wound — The defining trauma or loss that shaped the NPC
 *   2. Limitation — A constraint they cannot overcome alone
 *   3. Competence — What they are genuinely excellent at
 *   4. Question — The existential question they're trying to answer
 *   5. Secret — Something they know/did that would change player perception
 */

// ─── Pillar Types ───────────────────────────────────────────────────

export interface NpcWound {
  readonly description: string;
  readonly origin: string;
  readonly behavioralEffect: string;
}

export interface NpcLimitation {
  readonly description: string;
  readonly scope: 'physical' | 'social' | 'cognitive' | 'moral';
  readonly canBeOvercome: boolean;
}

export interface NpcCompetence {
  readonly domain: string;
  readonly proficiencyLevel: 'capable' | 'skilled' | 'expert' | 'master';
  readonly isRecognized: boolean;
}

export interface NpcQuestion {
  readonly text: string;
  readonly theme: 'identity' | 'purpose' | 'morality' | 'belonging' | 'legacy';
  readonly canBeResolved: boolean;
}

export interface NpcSecret {
  readonly content: string;
  readonly severity: 'minor' | 'significant' | 'world_altering';
  readonly discoverable: boolean;
  readonly triggerCondition: string | null;
}

// ─── Five-Pillar Profile ────────────────────────────────────────────

export interface FivePillarProfile {
  readonly npcId: string;
  readonly wound: NpcWound;
  readonly limitation: NpcLimitation;
  readonly competence: NpcCompetence;
  readonly question: NpcQuestion;
  readonly secret: NpcSecret;
}

// ─── Validation ─────────────────────────────────────────────────────

export type PillarValidationError =
  | 'MISSING_WOUND'
  | 'MISSING_LIMITATION'
  | 'MISSING_COMPETENCE'
  | 'MISSING_QUESTION'
  | 'MISSING_SECRET'
  | 'EMPTY_DESCRIPTION';

export function validatePillarProfile(
  profile: Partial<FivePillarProfile>,
): ReadonlyArray<PillarValidationError> {
  const errors: PillarValidationError[] = [];

  if (profile.wound === undefined) errors.push('MISSING_WOUND');
  else if (profile.wound.description.length === 0) errors.push('EMPTY_DESCRIPTION');

  if (profile.limitation === undefined) errors.push('MISSING_LIMITATION');
  else if (profile.limitation.description.length === 0) errors.push('EMPTY_DESCRIPTION');

  if (profile.competence === undefined) errors.push('MISSING_COMPETENCE');
  else if (profile.competence.domain.length === 0) errors.push('EMPTY_DESCRIPTION');

  if (profile.question === undefined) errors.push('MISSING_QUESTION');
  else if (profile.question.text.length === 0) errors.push('EMPTY_DESCRIPTION');

  if (profile.secret === undefined) errors.push('MISSING_SECRET');
  else if (profile.secret.content.length === 0) errors.push('EMPTY_DESCRIPTION');

  return errors;
}
