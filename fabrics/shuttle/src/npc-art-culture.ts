/**
 * npc-art-culture.ts — NPC cultural expression and artistic creation.
 *
 * Models NPC creation of artworks (music, painting, story, sculpture, dance).
 * Art quality is determined by creator skill and inspiration. Cultural movements
 * can emerge and spread through populations. Art diffuses via trade routes and
 * migration. Cultural prestige affects faction standing and diplomatic relations.
 */

// -- Ports ────────────────────────────────────────────────────────

interface CultureClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface CultureIdGeneratorPort {
  readonly next: () => string;
}

interface CultureLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface CultureDeps {
  readonly clock: CultureClockPort;
  readonly idGenerator: CultureIdGeneratorPort;
  readonly logger: CultureLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type ArtForm = 'MUSIC' | 'PAINTING' | 'STORY' | 'SCULPTURE' | 'DANCE';

interface ArtWork {
  readonly artId: string;
  readonly creatorId: string;
  readonly artForm: ArtForm;
  readonly title: string;
  readonly qualityScore: number;
  readonly inspirationScore: number;
  readonly createdAt: bigint;
  readonly worldId: string;
  readonly viewCount: number;
}

interface CulturalMovement {
  readonly movementId: string;
  readonly name: string;
  readonly artForm: ArtForm;
  readonly founderId: string;
  readonly worldId: string;
  readonly startedAt: bigint;
  readonly followerCount: number;
  readonly artworksProduced: number;
}

interface InspirationScore {
  readonly npcId: string;
  readonly worldId: string;
  readonly baseInspiration: number;
  readonly environmentBonus: number;
  readonly totalInspiration: number;
}

interface CulturalDiffusion {
  readonly diffusionId: string;
  readonly artId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly diffusionMethod: 'TRADE' | 'MIGRATION' | 'DIPLOMACY';
  readonly occurredAt: bigint;
}

interface CultureReport {
  readonly totalArtworks: number;
  readonly totalMovements: number;
  readonly totalDiffusions: number;
  readonly mostPopularArtForm: ArtForm | undefined;
  readonly highestPrestigeWorld: string | undefined;
  readonly averageQuality: number;
}

type CreateArtworkError = 'invalid_quality' | 'invalid_inspiration' | 'npc_not_found';
type SpreadCultureError = 'artwork_not_found' | 'invalid_world';
type RateArtworkError = 'artwork_not_found';
type StartMovementError = 'npc_not_found' | 'movement_exists';

// -- Constants ────────────────────────────────────────────────────

const QUALITY_MIN = 0;
const QUALITY_MAX = 100;
const INSPIRATION_MIN = 0;
const INSPIRATION_MAX = 100;
const ENVIRONMENT_BONUS_MAX = 20;
const MOVEMENT_FOLLOWER_THRESHOLD = 5;
const PRESTIGE_PER_QUALITY_POINT = 0.5;
const PRESTIGE_MOVEMENT_MULTIPLIER = 1.5;

// -- State ────────────────────────────────────────────────────────

interface CultureSystemState {
  readonly artworks: Map<string, ArtWork>;
  readonly movements: Map<string, CulturalMovement>;
  readonly diffusions: CulturalDiffusion[];
  readonly inspirations: Map<string, InspirationScore>;
  readonly worldPrestige: Map<string, number>;
}

// -- Factory ──────────────────────────────────────────────────────

export interface CultureSystem {
  readonly createArtwork: (
    creatorId: string,
    artForm: ArtForm,
    title: string,
    worldId: string,
    skillLevel: number,
    inspiration: number,
  ) => CreateArtworkError | string;
  readonly spreadCulture: (
    artId: string,
    fromWorldId: string,
    toWorldId: string,
    method: 'TRADE' | 'MIGRATION' | 'DIPLOMACY',
  ) => SpreadCultureError | 'ok';
  readonly rateArtwork: (artId: string) => RateArtworkError | number;
  readonly startMovement: (
    founderId: string,
    name: string,
    artForm: ArtForm,
    worldId: string,
  ) => StartMovementError | string;
  readonly getCulturalReport: () => CultureReport;
  readonly getMostInfluentialWorks: (limit: number) => ArtWork[];
  readonly computePrestige: (worldId: string) => number;
}

export function createCultureSystem(deps: CultureDeps): CultureSystem {
  const state: CultureSystemState = {
    artworks: new Map(),
    movements: new Map(),
    diffusions: [],
    inspirations: new Map(),
    worldPrestige: new Map(),
  };
  return {
    createArtwork: (creatorId, artForm, title, worldId, skillLevel, inspiration) =>
      createArtwork(state, deps, creatorId, artForm, title, worldId, skillLevel, inspiration),
    spreadCulture: (artId, fromWorldId, toWorldId, method) =>
      spreadCulture(state, deps, artId, fromWorldId, toWorldId, method),
    rateArtwork: (artId) => rateArtwork(state, artId),
    startMovement: (founderId, name, artForm, worldId) =>
      startMovement(state, deps, founderId, name, artForm, worldId),
    getCulturalReport: () => getCulturalReport(state),
    getMostInfluentialWorks: (limit) => getMostInfluentialWorks(state, limit),
    computePrestige: (worldId) => computePrestige(state, worldId),
  };
}

// -- Module-level functions ───────────────────────────────────────

function createArtwork(
  state: CultureSystemState,
  deps: CultureDeps,
  creatorId: string,
  artForm: ArtForm,
  title: string,
  worldId: string,
  skillLevel: number,
  inspiration: number,
): CreateArtworkError | string {
  if (skillLevel < QUALITY_MIN || skillLevel > QUALITY_MAX) {
    return 'invalid_quality';
  }
  if (inspiration < INSPIRATION_MIN || inspiration > INSPIRATION_MAX) {
    return 'invalid_inspiration';
  }
  const artId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const inspirationKey = creatorId + '_' + worldId;
  let environmentBonus = 0;
  const existing = state.inspirations.get(inspirationKey);
  if (existing !== undefined) {
    environmentBonus = existing.environmentBonus;
  } else {
    environmentBonus = Math.floor(Math.random() * ENVIRONMENT_BONUS_MAX);
    const inspScore: InspirationScore = {
      npcId: creatorId,
      worldId,
      baseInspiration: inspiration,
      environmentBonus,
      totalInspiration: inspiration + environmentBonus,
    };
    state.inspirations.set(inspirationKey, inspScore);
  }
  const qualityScore = Math.min(
    QUALITY_MAX,
    Math.floor((skillLevel + inspiration + environmentBonus) / 3),
  );
  const artwork: ArtWork = {
    artId,
    creatorId,
    artForm,
    title,
    qualityScore,
    inspirationScore: inspiration,
    createdAt: now,
    worldId,
    viewCount: 0,
  };
  state.artworks.set(artId, artwork);
  const currentPrestige = state.worldPrestige.get(worldId);
  const prestigeBoost = qualityScore * PRESTIGE_PER_QUALITY_POINT;
  const newPrestige = (currentPrestige !== undefined ? currentPrestige : 0) + prestigeBoost;
  state.worldPrestige.set(worldId, newPrestige);
  deps.logger.info('artwork_created', { artId, creatorId, artForm, qualityScore });
  return artId;
}

function spreadCulture(
  state: CultureSystemState,
  deps: CultureDeps,
  artId: string,
  fromWorldId: string,
  toWorldId: string,
  method: 'TRADE' | 'MIGRATION' | 'DIPLOMACY',
): SpreadCultureError | 'ok' {
  const artwork = state.artworks.get(artId);
  if (artwork === undefined) {
    return 'artwork_not_found';
  }
  if (fromWorldId === toWorldId) {
    return 'invalid_world';
  }
  const now = deps.clock.nowMicroseconds();
  const diffusionId = deps.idGenerator.next();
  const diffusion: CulturalDiffusion = {
    diffusionId,
    artId,
    fromWorldId,
    toWorldId,
    diffusionMethod: method,
    occurredAt: now,
  };
  state.diffusions.push(diffusion);
  const updatedArtwork: ArtWork = {
    ...artwork,
    viewCount: artwork.viewCount + 1,
  };
  state.artworks.set(artId, updatedArtwork);
  const prestigeBoost = artwork.qualityScore * PRESTIGE_PER_QUALITY_POINT * 0.5;
  const currentPrestige = state.worldPrestige.get(toWorldId);
  const newPrestige = (currentPrestige !== undefined ? currentPrestige : 0) + prestigeBoost;
  state.worldPrestige.set(toWorldId, newPrestige);
  deps.logger.info('culture_spread', { artId, fromWorldId, toWorldId, method });
  return 'ok';
}

function rateArtwork(state: CultureSystemState, artId: string): RateArtworkError | number {
  const artwork = state.artworks.get(artId);
  if (artwork === undefined) {
    return 'artwork_not_found';
  }
  return artwork.qualityScore;
}

function startMovement(
  state: CultureSystemState,
  deps: CultureDeps,
  founderId: string,
  name: string,
  artForm: ArtForm,
  worldId: string,
): StartMovementError | string {
  const movementKey = founderId + '_' + name;
  const existingMovement = state.movements.get(movementKey);
  if (existingMovement !== undefined) {
    return 'movement_exists';
  }
  const movementId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const movement: CulturalMovement = {
    movementId,
    name,
    artForm,
    founderId,
    worldId,
    startedAt: now,
    followerCount: 1,
    artworksProduced: 0,
  };
  state.movements.set(movementKey, movement);
  deps.logger.info('movement_started', { movementId, founderId, name, artForm });
  return movementId;
}

function getCulturalReport(state: CultureSystemState): CultureReport {
  const artFormCounts: Record<ArtForm, number> = {
    MUSIC: 0,
    PAINTING: 0,
    STORY: 0,
    SCULPTURE: 0,
    DANCE: 0,
  };
  let totalQuality = 0;
  for (const artwork of state.artworks.values()) {
    const count = artFormCounts[artwork.artForm];
    if (count !== undefined) {
      artFormCounts[artwork.artForm] = count + 1;
    }
    totalQuality = totalQuality + artwork.qualityScore;
  }
  let mostPopularArtForm: ArtForm | undefined = undefined;
  let maxCount = 0;
  const artForms: ArtForm[] = ['MUSIC', 'PAINTING', 'STORY', 'SCULPTURE', 'DANCE'];
  for (let i = 0; i < artForms.length; i = i + 1) {
    const form = artForms[i];
    if (form === undefined) {
      continue;
    }
    const count = artFormCounts[form];
    if (count !== undefined && count > maxCount) {
      maxCount = count;
      mostPopularArtForm = form;
    }
  }
  let highestPrestigeWorld: string | undefined = undefined;
  let maxPrestige = 0;
  for (const entry of state.worldPrestige.entries()) {
    const worldId = entry[0];
    const prestige = entry[1];
    if (prestige > maxPrestige) {
      maxPrestige = prestige;
      highestPrestigeWorld = worldId;
    }
  }
  const averageQuality = state.artworks.size > 0 ? totalQuality / state.artworks.size : 0;
  return {
    totalArtworks: state.artworks.size,
    totalMovements: state.movements.size,
    totalDiffusions: state.diffusions.length,
    mostPopularArtForm,
    highestPrestigeWorld,
    averageQuality,
  };
}

function getMostInfluentialWorks(state: CultureSystemState, limit: number): ArtWork[] {
  const allWorks: ArtWork[] = [];
  for (const work of state.artworks.values()) {
    allWorks.push(work);
  }
  allWorks.sort((a, b) => {
    const scoreA = a.qualityScore * 100 + a.viewCount;
    const scoreB = b.qualityScore * 100 + b.viewCount;
    if (scoreB > scoreA) {
      return 1;
    }
    if (scoreB < scoreA) {
      return -1;
    }
    return 0;
  });
  const result: ArtWork[] = [];
  for (let i = 0; i < Math.min(limit, allWorks.length); i = i + 1) {
    const work = allWorks[i];
    if (work !== undefined) {
      result.push(work);
    }
  }
  return result;
}

function computePrestige(state: CultureSystemState, worldId: string): number {
  const basePrestige = state.worldPrestige.get(worldId);
  if (basePrestige === undefined) {
    return 0;
  }
  let movementBonus = 0;
  for (const movement of state.movements.values()) {
    if (movement.worldId === worldId) {
      movementBonus = movementBonus + movement.followerCount * PRESTIGE_MOVEMENT_MULTIPLIER;
    }
  }
  return basePrestige + movementBonus;
}
