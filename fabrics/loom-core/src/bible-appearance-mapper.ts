/**
 * bible-appearance-mapper.ts — Maps bible character data to ECS appearance components.
 *
 * Transforms the rich narrative data from CharacterEntry into two targets:
 *   1. CharacterAppearance — structured description for T2I generation (Fal.ai FLUX)
 *   2. AppearanceComponent — ECS component for MetaHuman binding in UE5
 *
 * The mapper is deterministic: same CharacterEntry always produces
 * the same appearance data. No randomness, no side effects.
 */

import type {
  CharacterEntry,
  CharacterAppearance,
  AppearanceComponent,
  ApparentSex,
  AgeRange,
  BodyBuild,
  HairDescription,
  FacialFeatures,
  AttireDescription,
} from '@loom/entities-contracts';

// ── Build Mapping ───────────────────────────────────────────────

const BUILD_MAP: ReadonlyMap<string, BodyBuild> = new Map([
  ['lean', 'lean'],
  ['slight', 'slight'],
  ['compact', 'athletic'],
  ['medium', 'average'],
  ['large', 'heavy'],
  ['broad', 'stocky'],
  ['angular', 'lean'],
  ['powerful', 'heavy'],
  ['rounded', 'stocky'],
]);

function mapBodyBuild(buildDesc: string): BodyBuild {
  const lower = buildDesc.toLowerCase();
  for (const [key, value] of BUILD_MAP) {
    if (lower.includes(key)) return value;
  }
  return 'average';
}

// ── Age Mapping ─────────────────────────────────────────────────

function mapAgeRange(ageApprox: string): AgeRange {
  const numbers = ageApprox.match(/\d+/);
  if (!numbers) return 'middle-aged';

  const age = parseInt(numbers[0], 10);
  if (age < 13) return 'child';
  if (age < 20) return 'adolescent';
  if (age < 35) return 'young-adult';
  if (age < 60) return 'middle-aged';
  if (age < 100) return 'elder';
  return 'ancient';
}

// ── Height Mapping ──────────────────────────────────────────────

const HEIGHT_SCALE_MAP: Readonly<Record<string, number>> = {
  short: 0.9,
  'medium-short': 0.95,
  medium: 1.0,
  tall: 1.08,
};

function mapHeightScale(height: string): number {
  return HEIGHT_SCALE_MAP[height] ?? 1.0;
}

// ── Hair Length Mapping ─────────────────────────────────────────

function mapHairLength(style: string): 'short' | 'medium' | 'long' | 'bald' {
  const lower = style.toLowerCase();
  if (lower.includes('bald') || lower.includes('shaved')) return 'bald';
  if (lower.includes('long') || lower.includes('flowing')) return 'long';
  if (lower.includes('medium')) return 'medium';
  return 'short';
}

// ── Sex Mapping ─────────────────────────────────────────────────

function mapApparentSex(sex: ApparentSex): ApparentSex {
  return sex; // Direct mapping — bible uses same terminology
}

// ── Attire Condition ────────────────────────────────────────────

function mapAttireCondition(detail: string): 'pristine' | 'well-kept' | 'worn' | 'battle-worn' | 'tattered' {
  const lower = detail.toLowerCase();
  if (lower.includes('worn') || lower.includes('soft') || lower.includes('wear')) return 'worn';
  if (lower.includes('immaculate') || lower.includes('perfect')) return 'pristine';
  if (lower.includes('battle') || lower.includes('field')) return 'battle-worn';
  return 'well-kept';
}

// ── CharacterAppearance Builder ─────────────────────────────────

/**
 * Map a CharacterEntry to a full CharacterAppearance for T2I generation.
 * This feeds the Shuttle → Fal.ai FLUX pipeline.
 */
export function mapToCharacterAppearance(
  entry: CharacterEntry,
  entityId: string,
): CharacterAppearance {
  const hair: HairDescription = {
    color: entry.appearance.hairColor,
    style: entry.appearance.hairStyle,
    length: mapHairLength(entry.appearance.hairStyle),
  };

  const facialFeatures: FacialFeatures = {
    eyes: entry.appearance.eyeColor,
    nose: 'proportionate', // Bible doesn't specify nose separately
    jaw: entry.appearance.build.includes('angular') ? 'angular' : 'proportionate',
    expressionTendency: entry.expressions.defaultExpression,
  };

  const attire: AttireDescription = {
    primaryGarment: entry.costume.primary,
    accessories: entry.costume.accessories
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    colorPalette: extractColorPalette(entry.costume.primary),
    condition: mapAttireCondition(entry.costume.detail),
  };

  return {
    entityId,
    displayName: formatDisplayName(entry),
    apparentSex: mapApparentSex(entry.appearance.apparentSex),
    ageRange: mapAgeRange(entry.appearance.ageApprox),
    bodyBuild: mapBodyBuild(entry.appearance.build),
    skinTone: entry.appearance.skinTone,
    hair,
    facialFeatures,
    distinguishingMarks: entry.appearance.distinguishingFeatures
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    attire,
    archetype: mapTierToArchetype(entry.tier),
    culturalStyle: entry.appearance.ethnicityInspiration,
    visualMood: entry.expressions.defaultExpression,
  };
}

// ── AppearanceComponent Builder ─────────────────────────────────

/**
 * Map a CharacterEntry to an AppearanceComponent for the ECS.
 * This feeds the MetaHuman binding in UE5.
 */
export function mapToAppearanceComponent(entry: CharacterEntry): AppearanceComponent {
  return {
    metaHumanPresetId: entry.metaHuman.presetBase,
    bodyBuild: mapBodyBuild(entry.appearance.build),
    ageRange: mapAgeRange(entry.appearance.ageApprox),
    skinTone: entry.appearance.skinTone,
    hairStyle: entry.appearance.hairStyle,
    hairColor: extractHairHex(entry.appearance.hairColor),
    eyeColor: extractEyeHex(entry.appearance.eyeColor),
    heightScale: mapHeightScale(entry.appearance.height),
    outfitAssetId: `outfit_${entry.metaHuman.presetBase.toLowerCase()}`,
    accessories: extractAccessoryIds(entry.costume.accessories),
    facialOverrides: buildFacialOverrides(entry),
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDisplayName(entry: CharacterEntry): string {
  return entry.title
    ? `${entry.title} ${entry.displayName}`
    : entry.displayName;
}

function mapTierToArchetype(tier: CharacterEntry['tier']): string {
  const map: Record<string, string> = {
    TIER_4: 'legendary',
    TIER_3: 'notable',
    TIER_2: 'notable',
    TIER_1: 'inhabitant',
    TIER_0: 'ambient',
  };
  return map[tier] ?? 'ambient';
}

function extractColorPalette(costumeDesc: string): string {
  const colors = [
    'grey', 'teal', 'navy', 'burgundy', 'ochre', 'charcoal',
    'rust', 'violet', 'black', 'midnight', 'silver',
  ];
  const found = colors.filter((c) => costumeDesc.toLowerCase().includes(c));
  return found.length > 0 ? found.join(' and ') : 'neutral tones';
}

/**
 * Map hair color description to a hex approximation.
 * Used by AppearanceComponent for MetaHuman material binding.
 */
function extractHairHex(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes('silver') || lower.includes('white')) return '#C0C0C0';
  if (lower.includes('blonde')) return '#D4B87A';
  if (lower.includes('red') || lower.includes('auburn')) return '#8B3A3A';
  if (lower.includes('grey') || lower.includes('salt')) return '#808080';
  return '#1C1C1C'; // Default dark
}

function extractEyeHex(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes('green')) return '#5B8C5A';
  if (lower.includes('blue')) return '#6B8FAF';
  if (lower.includes('grey')) return '#7F8C8D';
  if (lower.includes('brown') || lower.includes('dark')) return '#3B2F2F';
  return '#3B2F2F';
}

function extractAccessoryIds(accessoryDesc: string): ReadonlyArray<string> {
  if (accessoryDesc.toLowerCase().includes('none') || accessoryDesc.trim().length === 0) {
    return [];
  }
  return accessoryDesc
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) =>
      `acc_${s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    );
}

function buildFacialOverrides(entry: CharacterEntry): Readonly<Record<string, number>> {
  const overrides: Record<string, number> = {};

  // Map MetaHuman sliders to blend shape weights
  overrides['age_intensity'] = entry.metaHuman.ageSlider / 100;
  overrides['weight_intensity'] = entry.metaHuman.weightSlider / 100;
  overrides['muscle_definition'] = entry.metaHuman.muscleSlider / 100;

  return overrides;
}
