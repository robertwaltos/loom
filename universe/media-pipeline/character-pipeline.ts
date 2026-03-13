/**
 * Media Pipeline — Character Art Generation
 *
 * Orchestrates the full pipeline from character definition → fal.ai → Supabase storage.
 *
 * Pipeline stages:
 * 1. Build image prompt from CharacterProfile
 * 2. Submit to fal.ai Flux Pro queue
 * 3. Poll for completion with exponential backoff
 * 4. Validate output (content hash, dimensions, COPPA content check)
 * 5. Upload to Supabase Storage bucket: koydo-character-art
 * 6. Register EntryMediaAsset record in DB
 *
 * Protocol: HTTP/JSON — this pipeline is not on a hot path.
 * The fal.ai adapter (Python) in pipelines/fal_ai_adapter.py handles
 * the raw API calls. This TypeScript module coordinates the Loom side.
 *
 * NOTE: MetaHuman handoff is a MANUAL step — this pipeline generates the
 * reference concept art. A human artist uses art as the MetaHuman brief.
 */
import type { EntryMediaAsset } from '../content/types.js';
import type { CharacterProfile } from '../characters/types.js';

// ─── Pipeline Input/Output ─────────────────────────────────────────

export interface CharacterArtRequest {
  readonly character: CharacterProfile;
  readonly artStyle: ArtStyleVariant;
  readonly lightingMood: string;
  readonly backgroundColor: string;
}

export type ArtStyleVariant =
  | 'portrait_3_4'       // 3/4 view — primary MetaHuman reference
  | 'portrait_front'     // Straight-on — UI avatar
  | 'full_body'          // Full character sheet
  | 'expression_sheet';  // 6-panel emotion sheet (ACE animation reference)

export interface CharacterArtResult {
  readonly ok: boolean;
  readonly assetId: string | null;
  readonly imageUrl: string | null;
  readonly contentHash: string | null;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly error: string | null;
  readonly generatedAt: number;
}

// ─── Fal.ai Job Tracking ───────────────────────────────────────────

export interface FalAiJob {
  readonly jobId: string;
  readonly characterId: string;
  readonly artStyle: ArtStyleVariant;
  readonly submittedAt: number;
  readonly status: FalAiJobStatus;
  readonly resultUrl: string | null;
  readonly errorMessage: string | null;
  readonly attempts: number;
}

export type FalAiJobStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'content_rejected';

// ─── Prompt Construction ───────────────────────────────────────────

/**
 * Build a fal.ai image prompt for a character portrait.
 * The Python fal_ai_adapter.py handles the raw API call;
 * this function builds the prompt string it receives.
 */
export function buildCharacterImagePrompt(req: CharacterArtRequest): string {
  const { character, artStyle, lightingMood, backgroundColor } = req;

  const styleGuide = buildStyleGuide(artStyle);
  const disabilityNote = buildDisabilityNote(character);

  return [
    `Character portrait of ${character.name}, ${character.visualDescription}.`,
    disabilityNote,
    `Art style: Studio Ghibli meets National Geographic — painterly, warm, educational illustration.`,
    `Lighting: ${lightingMood}. Background: ${backgroundColor}.`,
    `${styleGuide}`,
    `Character is a guide for children ages 5-10. Expression: ${buildDefaultExpression(character)}.`,
    `Culturally authentic representation of ${character.culturalOrigin}.`,
    `Highly detailed, 4K resolution, illustration style, not photorealistic.`,
  ]
    .filter((line) => line.trim().length > 0)
    .join(' ');
}

function buildStyleGuide(artStyle: ArtStyleVariant): string {
  const guides: Record<ArtStyleVariant, string> = {
    portrait_3_4: 'Three-quarter view, upper body visible, slight tilt toward viewer, welcoming posture.',
    portrait_front: 'Front-facing portrait, centered, clean background, suitable for circular UI avatar crop.',
    full_body: 'Full body character sheet, neutral pose, showing all costume and physical design details.',
    expression_sheet: '6-panel expression reference sheet on white background: neutral, happy, curious, thinking, gentle correction, excited.',
  };
  return guides[artStyle];
}

function buildDisabilityNote(character: CharacterProfile): string {
  if (character.disability === 'none') return '';

  const notes: Partial<Record<typeof character.disability, string>> = {
    prosthetic_hand: 'Character has a prosthetic right hand — show it naturally, matter-of-factly, not as the focal point.',
    blindness: 'Character is blind — eyes are gently closed or have a calm, unfocused quality. They navigate by sound and touch.',
    hearing_aids: 'Character wears hearing aids — visible and styled, not hidden. Part of their identity.',
    hand_tremor: 'Character has a hand tremor — hands are in a relaxed, natural position. Not emphasized.',
    autism: 'Character has autism — no visual marker required. Expression is genuine and specific, not generic.',
    wheelchair_user: 'Character uses a wheelchair — show the full chair, include it naturally in the composition.',
    dyslexia: 'No visual marker for dyslexia in portrait — disability affects reading, not appearance.',
    stutter: 'No visual marker for stutter in portrait — disability affects speech, not appearance.',
  };
  return notes[character.disability] ?? '';
}

function buildDefaultExpression(character: CharacterProfile): string {
  const emotionToExpression: Record<string, string> = {
    warm: 'warm, inviting smile — approachable and safe',
    curious: 'bright eyes, slight forward lean — genuinely interested',
    encouraging: 'open smile, engaged — celebrating the viewer',
    playful: 'gentle grin, hint of mischief — friendly and fun',
    thoughtful: 'calm, reflective expression — wisdom without severity',
    contemplative: 'peaceful, interior expression — ancient and patient',
  };
  const firstEmotion = character.personality.emotionalRange[0] ?? 'warm';
  return emotionToExpression[firstEmotion] ?? 'warm, welcoming, educator energy';
}

// ─── Negative Prompt ──────────────────────────────────────────────

export const STANDARD_NEGATIVE_PROMPT =
  'photorealistic, photography, dark themes, violence, gore, scary, horror, ' +
  'sexualized content, adult content, weapon emphasis, realistic human skin texture, ' +
  'watermark, blurry, low quality, distorted anatomy, extra limbs, ' +
  'stereotypical disability representation, pity framing, inspirational poster cliche.';

// ─── MetaHuman Handoff Document ───────────────────────────────────

/**
 * Generates a MetaHuman artist brief for a character.
 * Human artist uses this + the fal.ai concept art to build the MetaHuman.
 * This is NOT automated — it produces a document for a human to act on.
 */
export function buildMetaHumanBrief(character: CharacterProfile, conceptArtUrl: string): MetaHumanBrief {
  return {
    characterId: character.id,
    characterName: character.name,
    conceptArtUrl,
    metahumanClass: character.metahumanClass,
    physicalNotes: character.visualDescription,
    disabilityImplementationNotes: buildDisabilityNote(character),
    culturalAuthenticityNotes: `Ensure cultural authenticity for ${character.culturalOrigin}. Consult cultural advisor before final approval.`,
    aceFacialAnimationPriority: buildAcePriority(character),
    lipsyncRequired: true,
    eyeMovementStyle: 'natural_engaged',    // Not idle — always learning-focused movement
    status: 'brief_ready',
    createdAt: Date.now(),
  };
}

export interface MetaHumanBrief {
  readonly characterId: string;
  readonly characterName: string;
  readonly conceptArtUrl: string;
  readonly metahumanClass: string;
  readonly physicalNotes: string;
  readonly disabilityImplementationNotes: string;
  readonly culturalAuthenticityNotes: string;
  readonly aceFacialAnimationPriority: readonly string[];
  readonly lipsyncRequired: boolean;
  readonly eyeMovementStyle: string;
  readonly status: 'brief_ready' | 'in_production' | 'approved' | 'revision_requested';
  readonly createdAt: number;
}

function buildAcePriority(character: CharacterProfile): readonly string[] {
  return [
    ...character.personality.emotionalRange,
    'gentle_correction',  // All guides must express this — never harsh
    'listening',          // All guides must express active listening
  ];
}

// ─── Media Asset Registration ─────────────────────────────────────

/**
 * Build the EntryMediaAsset record to insert into Supabase after
 * a successful fal.ai generation.
 */
export function buildMediaAssetRecord(params: {
  readonly characterId: string;
  readonly artStyle: ArtStyleVariant;
  readonly storageUrl: string;
  readonly generatedAt: number;
}): EntryMediaAsset {
  return {
    id: `asset-${params.characterId}-${params.artStyle}-${params.generatedAt}`,
    entryId: params.characterId,   // Characters map 1:1 to their world's entry catalog
    assetType: 'artifact_visual',
    url: params.storageUrl,
    generatedAt: params.generatedAt,
    provider: 'fal_ai',
  };
}
