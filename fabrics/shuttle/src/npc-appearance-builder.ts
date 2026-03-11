/**
 * NPC Appearance Builder
 *
 * Converts NPC personality, traits, archetype, and tier data
 * into a structured CharacterAppearance for T2I generation.
 *
 * This is the semantic bridge between "who the NPC is" (Shuttle)
 * and "what the NPC looks like" (T2I / MetaHuman).
 *
 * Personality → Visual mapping:
 *   High Extraversion → vibrant colors, open expression
 *   High Neuroticism → weathered, tense expression
 *   High Agreeableness → warm skin tones, kind expression
 *   High Conscientiousness → neat attire, sharp features
 *   High Openness → unusual accessories, curious expression
 *
 * Thread: shuttle/character-t2i
 * Tier: 2
 */

import type {
  CharacterAppearance,
  ApparentSex,
  AgeRange,
  BodyBuild,
  HairDescription,
  FacialFeatures,
  AttireDescription,
} from '@loom/entities-contracts';

// ── Input Types ─────────────────────────────────────────────────

export interface NpcAppearanceInput {
  readonly entityId: string;
  readonly displayName: string;
  readonly archetype: string;
  readonly npcTier: number;
  readonly personality: PersonalityScores;
  readonly dominantTraitCategory?: string;
  readonly factionAffinity?: string;
  readonly age?: number;
  readonly seed?: number;
}

export interface PersonalityScores {
  readonly openness: number;
  readonly conscientiousness: number;
  readonly extraversion: number;
  readonly agreeableness: number;
  readonly neuroticism: number;
}

// ── Deterministic PRNG ──────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function pick<T>(items: ReadonlyArray<T>, rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

// ── Builder ─────────────────────────────────────────────────────

export function buildNpcAppearance(
  input: NpcAppearanceInput,
): CharacterAppearance {
  const seed =
    input.seed ?? hashString(input.entityId + input.displayName);
  const rng = seededRandom(seed);

  const apparentSex = pickApparentSex(rng);
  const ageRange = pickAgeRange(input.age, rng);
  const bodyBuild = pickBodyBuild(input.archetype, input.personality, rng);
  const skinTone = pickSkinTone(rng);
  const hair = buildHair(apparentSex, ageRange, input.personality, rng);
  const facialFeatures = buildFacialFeatures(
    input.personality, input.archetype, rng);
  const distinguishingMarks = buildDistinguishingMarks(
    input.archetype, input.npcTier, rng);
  const attire = buildAttire(
    input.archetype, input.personality, input.factionAffinity, rng);
  const culturalStyle = pickCulturalStyle(rng);
  const visualMood = pickVisualMood(input.personality);

  return {
    entityId: input.entityId,
    displayName: input.displayName,
    apparentSex,
    ageRange,
    bodyBuild,
    skinTone,
    hair,
    facialFeatures,
    distinguishingMarks,
    attire,
    archetype: input.archetype,
    culturalStyle,
    visualMood,
  };
}

// ── Sub-builders ────────────────────────────────────────────────

function pickApparentSex(rng: () => number): ApparentSex {
  const roll = rng();
  if (roll < 0.45) return 'masculine';
  if (roll < 0.90) return 'feminine';
  return 'androgynous';
}

function pickAgeRange(
  age: number | undefined, rng: () => number,
): AgeRange {
  if (age !== undefined) {
    if (age < 13) return 'child';
    if (age < 18) return 'adolescent';
    if (age < 30) return 'young-adult';
    if (age < 55) return 'middle-aged';
    if (age < 80) return 'elder';
    return 'ancient';
  }
  return pick(
    ['young-adult', 'young-adult', 'middle-aged', 'middle-aged',
     'elder', 'adolescent'] as const,
    rng,
  );
}

function pickBodyBuild(
  archetype: string, personality: PersonalityScores, rng: () => number,
): BodyBuild {
  const archetypeBuilds: Record<string, ReadonlyArray<BodyBuild>> = {
    warrior: ['athletic', 'stocky', 'heavy', 'towering'],
    guard: ['athletic', 'stocky', 'heavy'],
    blacksmith: ['stocky', 'heavy', 'athletic'],
    farmer: ['stocky', 'average', 'athletic'],
    merchant: ['average', 'heavy', 'stocky'],
    scholar: ['slight', 'lean', 'average'],
    mystic: ['slight', 'lean', 'average'],
    priest: ['average', 'slight', 'lean'],
    thief: ['lean', 'slight', 'average'],
    recluse: ['slight', 'lean', 'average'],
    adventurer: ['athletic', 'lean', 'average'],
    noble: ['average', 'lean', 'slight'],
    healer: ['slight', 'average', 'lean'],
    bard: ['lean', 'average', 'slight'],
    diplomat: ['average', 'lean', 'slight'],
  };

  const options = archetypeBuilds[archetype] ??
    ['slight', 'lean', 'average', 'athletic', 'stocky'] as const;
  return pick(options, rng);
}

const SKIN_TONES = [
  'warm bronze', 'deep ebony', 'pale ivory', 'golden brown',
  'olive', 'copper', 'tawny', 'porcelain', 'mahogany',
  'sand', 'umber', 'peach', 'sienna', 'caramel',
  'honey', 'chestnut', 'amber', 'mocha', 'cream',
] as const;

function pickSkinTone(rng: () => number): string {
  return pick(SKIN_TONES, rng);
}

const HAIR_COLORS = [
  'raven black', 'chestnut brown', 'copper red', 'golden blonde',
  'silver-streaked brown', 'steel grey', 'auburn', 'dark brown',
  'sandy blonde', 'jet black', 'honey brown', 'ash blonde',
  'russet', 'midnight blue-black', 'rust red',
] as const;

const HAIR_STYLES = [
  'braided', 'cropped', 'flowing', 'topknot', 'tied back',
  'loose waves', 'tight curls', 'shaved sides', 'shoulder-length',
  'wild and unkempt', 'elaborate updo', 'dreadlocked',
  'ponytail', 'plaited',
] as const;

const FACIAL_HAIR_OPTIONS = [
  'full beard', 'short stubble', 'handlebar mustache',
  'goatee', 'long braided beard', 'clean-shaven', 'sideburns',
  'thin mustache', null,
] as const;

function buildHair(
  sex: ApparentSex,
  age: AgeRange,
  personality: PersonalityScores,
  rng: () => number,
): HairDescription {
  const length =
    age === 'ancient' && rng() < 0.3 ? 'bald' as const :
    personality.openness > 0.7 ? pick(['long', 'medium'] as const, rng) :
    personality.conscientiousness > 0.7 ? pick(['short', 'medium'] as const, rng) :
    pick(['short', 'medium', 'long'] as const, rng);

  let color: string = pick(HAIR_COLORS, rng);
  if (age === 'elder' || age === 'ancient') {
    color = rng() < 0.6 ? 'silver-streaked ' + color : 'white';
  }

  const facialHair =
    sex === 'masculine' ? pick(FACIAL_HAIR_OPTIONS, rng) ?? undefined :
    undefined;

  return {
    color,
    style: pick(HAIR_STYLES, rng),
    length,
    facialHair,
  };
}

function buildFacialFeatures(
  personality: PersonalityScores,
  archetype: string,
  rng: () => number,
): FacialFeatures {
  const eyeColors = [
    'deep brown', 'bright green', 'steel grey', 'warm amber',
    'striking blue', 'hazel', 'dark', 'pale blue',
  ];

  const eyeShapes = [
    'sharp', 'wide', 'narrow', 'almond-shaped', 'hooded',
    'round', 'deep-set',
  ];

  const noses = [
    'straight nose', 'aquiline nose', 'broad nose', 'button nose',
    'crooked nose', 'sharp nose', 'prominent nose',
  ];

  const jaws = [
    'strong jaw', 'angular jaw', 'soft jawline', 'square jaw',
    'pointed chin', 'rounded chin', 'cleft chin',
  ];

  const expressionMap: Record<string, string> = {
    warrior: 'battle-hardened stare',
    merchant: 'calculating gaze',
    mystic: 'distant, otherworldly expression',
    scholar: 'thoughtful, inquisitive brow',
    priest: 'serene, contemplative expression',
    farmer: 'honest, weather-worn expression',
    guard: 'vigilant, watchful expression',
    thief: 'wary, darting eyes',
    noble: 'imperious, confident bearing',
    healer: 'compassionate, gentle expression',
    adventurer: 'eager, confident grin',
    recluse: 'guarded, suspicious expression',
    bard: 'animated, expressive features',
    diplomat: 'measured, diplomatic smile',
    blacksmith: 'focused, determined expression',
  };

  let expression = expressionMap[archetype] ?? 'neutral expression';

  // Personality modifiers
  if (personality.neuroticism > 0.7) {
    expression = 'tense, anxious ' + expression;
  } else if (personality.agreeableness > 0.7) {
    expression = 'warm, kind ' + expression;
  } else if (personality.extraversion < 0.3) {
    expression = 'reserved, quiet ' + expression;
  }

  return {
    eyes: `${pick(eyeShapes, rng)} ${pick(eyeColors, rng)} eyes`,
    nose: pick(noses, rng),
    jaw: pick(jaws, rng),
    expressionTendency: expression,
  };
}

function buildDistinguishingMarks(
  archetype: string,
  tier: number,
  rng: () => number,
): ReadonlyArray<string> {
  const marks: string[] = [];

  // Higher tier NPCs have more unique features
  const markChance = tier >= 3 ? 0.7 : 0.3;

  const scars = [
    'thin scar across left cheek', 'battle scar on brow',
    'burn mark on forearm', 'old wound on jaw',
  ];

  const tattoos = [
    'faded faction tattoo on neck', 'runic tattoo on wrist',
    'ceremonial markings on hands', 'trade guild brand on shoulder',
  ];

  const birthmarks = [
    'small birthmark below eye', 'distinctive mole',
    'freckled across nose and cheeks',
  ];

  if (rng() < markChance) {
    if (archetype === 'warrior' || archetype === 'guard' ||
        archetype === 'adventurer') {
      marks.push(pick(scars, rng));
    } else if (archetype === 'mystic' || archetype === 'priest') {
      marks.push(pick(tattoos, rng));
    } else {
      marks.push(pick(birthmarks, rng));
    }
  }

  if (tier >= 4 && rng() < 0.5) {
    marks.push(pick([...scars, ...tattoos, ...birthmarks], rng));
  }

  return marks;
}

const ARCHETYPE_ATTIRE: Record<string, ReadonlyArray<string>> = {
  warrior: ['plate armor', 'chain mail', 'leather armor', 'brigandine'],
  guard: ['city watch uniform', 'leather armor with insignia', 'half-plate'],
  merchant: ['fine silk robes', 'embroidered vest', 'merchant traveling clothes'],
  scholar: ['academic robes', 'ink-stained tunic', 'simple linen with books'],
  mystic: ['flowing mystical robes', 'ritual garments', 'star-patterned cloak'],
  priest: ['ceremonial vestments', 'simple holy robes', 'pilgrim garb'],
  farmer: ['roughspun tunic', 'leather work apron', 'simple homespun clothes'],
  thief: ['dark leather armor', 'hooded cloak', 'nondescript traveling clothes'],
  noble: ['courtly finery', 'silk doublet', 'velvet and ermine robes'],
  healer: ['herbalist apron', 'white linen robes', 'forest green cloak'],
  adventurer: ['travel-worn gear', 'mixed armor pieces', 'expedition outfit'],
  recluse: ['tattered hermit robes', 'patchwork clothing', 'weathered cloak'],
  bard: ['colorful performer outfit', 'feathered cap and doublet', 'theatrical garb'],
  diplomat: ['formal diplomatic attire', 'embroidered coat', 'state robes'],
  blacksmith: ['heavy leather apron', 'soot-stained shirt', 'work clothes'],
};

function buildAttire(
  archetype: string,
  personality: PersonalityScores,
  faction: string | undefined,
  rng: () => number,
): AttireDescription {
  const garments = ARCHETYPE_ATTIRE[archetype] ?? ['roughspun tunic'];
  const primaryGarment = pick(garments, rng);

  const accessories: string[] = [];
  if (rng() < 0.5) {
    accessories.push(pick([
      'leather belt with pouches', 'bone necklace', 'signet ring',
      'pendant', 'woven bracelet', 'silver earring',
      'carved wooden charm', 'glass bead bracelet',
    ], rng));
  }
  if (faction && rng() < 0.6) {
    accessories.push(`${faction} faction emblem`);
  }

  const palettes: string[] = [];
  if (personality.extraversion > 0.7) {
    palettes.push('vibrant reds and golds', 'bright blues and yellows');
  } else if (personality.neuroticism > 0.7) {
    palettes.push('muted greys and browns', 'dark tones');
  } else if (personality.openness > 0.7) {
    palettes.push('unusual purples and teals', 'rich jewel tones');
  } else {
    palettes.push('earth tones', 'natural browns and greens');
  }
  if (personality.conscientiousness > 0.7) {
    palettes.push('clean whites and navy');
  }

  const conditionMap: Record<string, ReadonlyArray<AttireDescription['condition']>> = {
    warrior: ['battle-worn', 'worn', 'well-kept'],
    noble: ['pristine', 'well-kept'],
    farmer: ['worn', 'tattered'],
    thief: ['worn', 'battle-worn'],
    scholar: ['well-kept', 'worn'],
    recluse: ['tattered', 'worn'],
  };

  const conditions = conditionMap[archetype] ??
    ['worn', 'well-kept'] as const;

  return {
    primaryGarment,
    accessories,
    colorPalette: pick(palettes, rng),
    condition: pick(conditions, rng),
  };
}

const CULTURAL_STYLES = [
  'medieval european', 'east asian', 'middle eastern',
  'norse viking', 'mediterranean', 'celtic', 'moorish',
  'byzantine', 'sub-saharan african', 'south asian',
  'mesoamerican', 'polynesian', 'slavic', 'steppe nomad',
] as const;

function pickCulturalStyle(rng: () => number): string {
  return pick(CULTURAL_STYLES, rng);
}

function pickVisualMood(personality: PersonalityScores): string {
  if (personality.neuroticism > 0.7) return 'haunted';
  if (personality.extraversion > 0.7) return 'jovial';
  if (personality.agreeableness > 0.7) return 'warm';
  if (personality.conscientiousness > 0.7) return 'disciplined';
  if (personality.openness > 0.7) return 'enigmatic';
  return 'stoic';
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
