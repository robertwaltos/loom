/**
 * Character Appearance Contract
 *
 * Describes how a character LOOKS in text form — the semantic bridge
 * between NPC personality/archetype and visual generation.
 *
 * The Shuttle owns character identity. This contract defines the
 * appearance description that drives T2I generation via Fal.ai
 * and MetaHuman preset selection.
 *
 * Flow:
 *   Shuttle (personality + archetype + traits)
 *     → CharacterAppearance (structured description)
 *       → T2I pipeline (Fal.ai FLUX)
 *         → GeneratedPortrait (image URL + content hash)
 *           → VisualMeshComponent (MetaHuman preset binding)
 */

// ── Appearance Description ──────────────────────────────────────

/** Biological sex presentation for visual generation. */
export type ApparentSex = 'masculine' | 'feminine' | 'androgynous';

/** Approximate age bracket for visual generation. */
export type AgeRange = 'child' | 'adolescent' | 'young-adult' | 'middle-aged' | 'elder' | 'ancient';

/** Body build archetype. */
export type BodyBuild = 'slight' | 'lean' | 'average' | 'athletic' | 'stocky' | 'heavy' | 'towering';

/**
 * Structured character appearance — enough detail to drive
 * both T2I prompt construction and MetaHuman preset selection.
 */
export interface CharacterAppearance {
  /** Reference to the entity this appearance belongs to. */
  readonly entityId: string;

  /** Display name for the character. */
  readonly displayName: string;

  /** Apparent biological sex presentation. */
  readonly apparentSex: ApparentSex;

  /** Age bracket — drives wrinkle maps, hair graying, posture. */
  readonly ageRange: AgeRange;

  /** Body build — drives mesh selection and proportions. */
  readonly bodyBuild: BodyBuild;

  /** Skin tone description (e.g., "warm bronze", "pale ivory", "deep ebony"). */
  readonly skinTone: string;

  /** Hair description. */
  readonly hair: HairDescription;

  /** Facial feature details. */
  readonly facialFeatures: FacialFeatures;

  /** Distinguishing marks — scars, tattoos, birthmarks. */
  readonly distinguishingMarks: ReadonlyArray<string>;

  /** Clothing/armor style driven by archetype and wealth. */
  readonly attire: AttireDescription;

  /** Archetype tag for style consistency (e.g., "merchant", "warrior", "mystic"). */
  readonly archetype: string;

  /** Cultural/regional style influence. */
  readonly culturalStyle: string;

  /** Overall visual mood (e.g., "weathered", "regal", "haunted", "jovial"). */
  readonly visualMood: string;
}

export interface HairDescription {
  /** Color (e.g., "raven black", "copper red", "silver-streaked brown"). */
  readonly color: string;
  /** Style (e.g., "braided", "cropped", "flowing", "shaved", "topknot"). */
  readonly style: string;
  /** Length: short, medium, long. */
  readonly length: 'short' | 'medium' | 'long' | 'bald';
  /** Facial hair for applicable characters. */
  readonly facialHair?: string;
}

export interface FacialFeatures {
  /** Eye color and shape (e.g., "sharp green eyes", "hooded dark eyes"). */
  readonly eyes: string;
  /** Nose description. */
  readonly nose: string;
  /** Jaw and chin shape. */
  readonly jaw: string;
  /** Expression tendency (e.g., "perpetual smirk", "stern brow", "kind eyes"). */
  readonly expressionTendency: string;
}

export interface AttireDescription {
  /** Primary garment (e.g., "leather armor", "silk robes", "roughspun tunic"). */
  readonly primaryGarment: string;
  /** Notable accessories (e.g., "gold circlet", "bone necklace"). */
  readonly accessories: ReadonlyArray<string>;
  /** Color palette for clothing (e.g., "earth tones", "royal purple and gold"). */
  readonly colorPalette: string;
  /** Wear condition (e.g., "pristine", "battle-worn", "tattered"). */
  readonly condition: 'pristine' | 'well-kept' | 'worn' | 'battle-worn' | 'tattered';
}

// ── Generation Request & Result ─────────────────────────────────

/** Image output format. */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/** Generation model selection. */
export type T2IModel =
  | 'fal-ai/flux-pro/v1.1'
  | 'fal-ai/flux/dev'
  | 'fal-ai/flux-pro/v1.1-ultra';

/** Image size preset — portrait-oriented for character art. */
export type ImageSize =
  | 'portrait_4_3'
  | 'portrait_3_4'
  | 'square_hd'
  | 'square';

/**
 * Request to generate a character portrait.
 * Submitted to the T2I pipeline service.
 */
export interface CharacterImageRequest {
  /** The structured appearance to generate from. */
  readonly appearance: CharacterAppearance;

  /** Which model to use (default: flux-pro v1.1). */
  readonly model: T2IModel;

  /** Image dimensions preset. */
  readonly imageSize: ImageSize;

  /** Output format. */
  readonly format: ImageFormat;

  /** Artistic style modifier (e.g., "fantasy oil painting", "character concept art"). */
  readonly stylePreset: string;

  /** Number of images to generate (1–4). */
  readonly numImages: number;

  /** Random seed for reproducibility. Omit for random. */
  readonly seed?: number;

  /** Guidance scale for prompt adherence (1.0–20.0, default 3.5). */
  readonly guidanceScale: number;

  /** Number of inference steps (1–50, default 28). */
  readonly inferenceSteps: number;

  /** Negative prompt — things to avoid. */
  readonly negativePrompt?: string;

  /** NPC tier — affects quality budget. */
  readonly npcTier: number;

  /** Correlation ID for tracing through the system. */
  readonly correlationId: string;
}

/**
 * Result of a successful character portrait generation.
 */
export interface CharacterImageResult {
  /** The entity this portrait belongs to. */
  readonly entityId: string;

  /** Content-addressed hash of the generated image. */
  readonly contentHash: string;

  /** URL of the generated image (temporary, from Fal.ai CDN). */
  readonly imageUrl: string;

  /** Image dimensions. */
  readonly width: number;
  readonly height: number;

  /** The prompt that was actually sent to the model. */
  readonly resolvedPrompt: string;

  /** Seed used (for reproducibility). */
  readonly seed: number;

  /** Generation latency in milliseconds. */
  readonly latencyMs: number;

  /** NSFW detection score (0.0–1.0). Rejected if > 0.5. */
  readonly nsfwScore: number;

  /** Moderation status. */
  readonly moderationStatus: 'approved' | 'flagged' | 'rejected';

  /** Correlation ID for tracing. */
  readonly correlationId: string;

  /** Fal.ai request ID for audit trail. */
  readonly falRequestId: string;
}
