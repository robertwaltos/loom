/**
 * World Physics — Per-world physics constants and modifiers
 *
 * Manages gravity, atmosphere, day length, magnetic fields per world.
 * Computes derived stats: fall damage, stamina drain, travel speed modifiers.
 * Validates physics coherence across worlds.
 */

// --- Ports (defined locally) ---

export interface Clock {
  nowMicros(): bigint;
}

export interface IdGenerator {
  nextId(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// --- Types ---

export type AtmosphereType = 'VACUUM' | 'THIN' | 'STANDARD' | 'DENSE' | 'TOXIC' | 'CRUSHING';

export type GravityClass = 'MICRO' | 'LOW' | 'STANDARD' | 'HIGH' | 'EXTREME';

export interface WorldPhysics {
  readonly worldId: string;
  readonly gravity: number;
  readonly gravityClass: GravityClass;
  readonly atmosphere: AtmosphereType;
  readonly dayLengthHours: number;
  readonly magneticFieldStrength: number;
  readonly radiationLevel: number;
  readonly surfacePressureKpa: number;
  readonly temperatureKelvin: number;
  readonly createdAt: bigint;
  readonly updatedAt: bigint;
}

export interface PhysicsModifiers {
  readonly worldId: string;
  readonly fallDamageMultiplier: number;
  readonly staminaDrainModifier: number;
  readonly travelSpeedModifier: number;
  readonly jumpHeightModifier: number;
  readonly carryCapacityModifier: number;
  readonly healthRegenModifier: number;
}

export interface PhysicsReport {
  readonly worldId: string;
  readonly physics: WorldPhysics;
  readonly modifiers: PhysicsModifiers;
  readonly habitabilityScore: number;
  readonly warnings: string[];
  readonly generatedAt: bigint;
}

export interface PhysicsConstraint {
  readonly worldId: string;
  readonly minGravity: number;
  readonly maxGravity: number;
  readonly allowedAtmospheres: AtmosphereType[];
  readonly minDayLength: number;
  readonly maxDayLength: number;
}

export interface WorldPhysicsState {
  readonly physics: Map<string, WorldPhysics>;
  readonly constraints: Map<string, PhysicsConstraint>;
  readonly clock: Clock;
  readonly idGen: IdGenerator;
  readonly logger: Logger;
}

export type WorldPhysicsError =
  | 'world-not-found'
  | 'physics-not-found'
  | 'constraint-not-found'
  | 'invalid-gravity'
  | 'invalid-atmosphere'
  | 'invalid-day-length'
  | 'invalid-temperature'
  | 'constraint-violation'
  | 'incoherent-physics';

// --- Constants ---

const EARTH_GRAVITY = 9.81;
const EARTH_PRESSURE = 101.325;
const EARTH_DAY_HOURS = 24;

// --- Factory ---

export function createWorldPhysicsState(
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): WorldPhysicsState {
  return {
    physics: new Map(),
    constraints: new Map(),
    clock,
    idGen,
    logger,
  };
}

// --- Core Functions ---

export function registerWorldPhysics(
  state: WorldPhysicsState,
  worldId: string,
  gravity: number,
  atmosphere: AtmosphereType,
  dayLengthHours: number,
  magneticFieldStrength: number,
  radiationLevel: number,
  surfacePressureKpa: number,
  temperatureKelvin: number,
): WorldPhysics | WorldPhysicsError {
  const gravityValidation = validateGravity(gravity);
  if (gravityValidation !== 'ok') {
    return gravityValidation;
  }

  const atmosphereValidation = validateAtmosphere(atmosphere);
  if (atmosphereValidation !== 'ok') {
    return atmosphereValidation;
  }

  const dayValidation = validateDayLength(dayLengthHours);
  if (dayValidation !== 'ok') {
    return dayValidation;
  }

  const tempValidation = validateTemperature(temperatureKelvin);
  if (tempValidation !== 'ok') {
    return tempValidation;
  }

  const constraint = state.constraints.get(worldId);
  if (constraint !== undefined) {
    const violation = checkConstraint(constraint, gravity, atmosphere, dayLengthHours);
    if (violation !== 'ok') {
      return violation;
    }
  }

  const coherence = validateCoherence(gravity, atmosphere, surfacePressureKpa, temperatureKelvin);
  if (coherence !== 'ok') {
    return coherence;
  }

  const gravityClass = classifyGravity(gravity);
  const now = state.clock.nowMicros();

  const existing = state.physics.get(worldId);

  const physics: WorldPhysics = {
    worldId,
    gravity,
    gravityClass,
    atmosphere,
    dayLengthHours,
    magneticFieldStrength,
    radiationLevel,
    surfacePressureKpa,
    temperatureKelvin,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  state.physics.set(worldId, physics);
  state.logger.info('Registered physics for world: ' + worldId);

  return physics;
}

function validateGravity(gravity: number): 'ok' | WorldPhysicsError {
  if (gravity < 0.1 || gravity > 30) {
    return 'invalid-gravity';
  }
  return 'ok';
}

function validateAtmosphere(atmosphere: AtmosphereType): 'ok' | WorldPhysicsError {
  const valid: AtmosphereType[] = ['VACUUM', 'THIN', 'STANDARD', 'DENSE', 'TOXIC', 'CRUSHING'];
  if (!valid.includes(atmosphere)) {
    return 'invalid-atmosphere';
  }
  return 'ok';
}

function validateDayLength(hours: number): 'ok' | WorldPhysicsError {
  if (hours <= 0 || hours > 1000) {
    return 'invalid-day-length';
  }
  return 'ok';
}

function validateTemperature(kelvin: number): 'ok' | WorldPhysicsError {
  if (kelvin < 0 || kelvin > 10000) {
    return 'invalid-temperature';
  }
  return 'ok';
}

function checkConstraint(
  constraint: PhysicsConstraint,
  gravity: number,
  atmosphere: AtmosphereType,
  dayLengthHours: number,
): 'ok' | WorldPhysicsError {
  if (gravity < constraint.minGravity || gravity > constraint.maxGravity) {
    return 'constraint-violation';
  }

  if (!constraint.allowedAtmospheres.includes(atmosphere)) {
    return 'constraint-violation';
  }

  if (dayLengthHours < constraint.minDayLength || dayLengthHours > constraint.maxDayLength) {
    return 'constraint-violation';
  }

  return 'ok';
}

function validateCoherence(
  gravity: number,
  atmosphere: AtmosphereType,
  pressureKpa: number,
  temperatureKelvin: number,
): 'ok' | WorldPhysicsError {
  if (atmosphere === 'VACUUM' && pressureKpa > 0.01) {
    return 'incoherent-physics';
  }

  if (atmosphere === 'CRUSHING' && pressureKpa < 1000) {
    return 'incoherent-physics';
  }

  if (gravity < 1 && atmosphere === 'CRUSHING') {
    return 'incoherent-physics';
  }

  if (temperatureKelvin < 50 && atmosphere === 'STANDARD') {
    return 'incoherent-physics';
  }

  return 'ok';
}

function classifyGravity(gravity: number): GravityClass {
  const earthRelative = gravity / EARTH_GRAVITY;

  if (earthRelative < 0.3) return 'MICRO';
  if (earthRelative < 0.7) return 'LOW';
  if (earthRelative < 1.3) return 'STANDARD';
  if (earthRelative < 2.0) return 'HIGH';
  return 'EXTREME';
}

export function updatePhysics(
  state: WorldPhysicsState,
  worldId: string,
  updates: {
    gravity?: number;
    atmosphere?: AtmosphereType;
    dayLengthHours?: number;
    magneticFieldStrength?: number;
    radiationLevel?: number;
    surfacePressureKpa?: number;
    temperatureKelvin?: number;
  },
): WorldPhysics | WorldPhysicsError {
  const existing = state.physics.get(worldId);
  if (existing === undefined) {
    return 'physics-not-found';
  }

  const newGravity = updates.gravity ?? existing.gravity;
  const newAtmosphere = updates.atmosphere ?? existing.atmosphere;
  const newDayLength = updates.dayLengthHours ?? existing.dayLengthHours;
  const newMagnetic = updates.magneticFieldStrength ?? existing.magneticFieldStrength;
  const newRadiation = updates.radiationLevel ?? existing.radiationLevel;
  const newPressure = updates.surfacePressureKpa ?? existing.surfacePressureKpa;
  const newTemp = updates.temperatureKelvin ?? existing.temperatureKelvin;

  return registerWorldPhysics(
    state,
    worldId,
    newGravity,
    newAtmosphere,
    newDayLength,
    newMagnetic,
    newRadiation,
    newPressure,
    newTemp,
  );
}

export function getModifiers(
  state: WorldPhysicsState,
  worldId: string,
): PhysicsModifiers | WorldPhysicsError {
  const physics = state.physics.get(worldId);
  if (physics === undefined) {
    return 'physics-not-found';
  }

  const earthRelative = physics.gravity / EARTH_GRAVITY;

  const fallDamage = computeFallDamageMultiplier(earthRelative, physics.atmosphere);
  const staminaDrain = computeStaminaDrainModifier(
    earthRelative,
    physics.atmosphere,
    physics.temperatureKelvin,
  );
  const travelSpeed = computeTravelSpeedModifier(earthRelative, physics.atmosphere);
  const jumpHeight = computeJumpHeightModifier(earthRelative, physics.atmosphere);
  const carryCapacity = computeCarryCapacityModifier(earthRelative);
  const healthRegen = computeHealthRegenModifier(
    physics.atmosphere,
    physics.radiationLevel,
    physics.temperatureKelvin,
  );

  return {
    worldId,
    fallDamageMultiplier: fallDamage,
    staminaDrainModifier: staminaDrain,
    travelSpeedModifier: travelSpeed,
    jumpHeightModifier: jumpHeight,
    carryCapacityModifier: carryCapacity,
    healthRegenModifier: healthRegen,
  };
}

function computeFallDamageMultiplier(gravityRelative: number, atmosphere: AtmosphereType): number {
  let base = gravityRelative;

  const atmosphereDrag: Record<AtmosphereType, number> = {
    VACUUM: 1.0,
    THIN: 0.95,
    STANDARD: 0.9,
    DENSE: 0.8,
    TOXIC: 0.85,
    CRUSHING: 0.7,
  };

  const drag = atmosphereDrag[atmosphere] || 1.0;
  return base * drag;
}

function computeStaminaDrainModifier(
  gravityRelative: number,
  atmosphere: AtmosphereType,
  temperatureKelvin: number,
): number {
  let base = 0.5 + gravityRelative * 0.5;

  const atmosphereCost: Record<AtmosphereType, number> = {
    VACUUM: 2.0,
    THIN: 1.5,
    STANDARD: 1.0,
    DENSE: 1.2,
    TOXIC: 1.8,
    CRUSHING: 2.5,
  };

  const atmoMod = atmosphereCost[atmosphere] || 1.0;
  base *= atmoMod;

  const idealTemp = 288;
  const tempDiff = Math.abs(temperatureKelvin - idealTemp);
  const tempMod = 1.0 + tempDiff / 500;

  return base * tempMod;
}

function computeTravelSpeedModifier(gravityRelative: number, atmosphere: AtmosphereType): number {
  let base = 1.0;

  if (gravityRelative < 0.5) {
    base = 1.0 + (0.5 - gravityRelative) * 0.5;
  } else if (gravityRelative > 1.5) {
    base = 1.0 - (gravityRelative - 1.5) * 0.3;
  }

  const atmospherePenalty: Record<AtmosphereType, number> = {
    VACUUM: 1.0,
    THIN: 0.98,
    STANDARD: 1.0,
    DENSE: 0.9,
    TOXIC: 0.95,
    CRUSHING: 0.7,
  };

  const atmoPenalty = atmospherePenalty[atmosphere] || 1.0;

  return Math.max(0.3, base * atmoPenalty);
}

function computeJumpHeightModifier(gravityRelative: number, atmosphere: AtmosphereType): number {
  let base = 1.0 / gravityRelative;

  const atmosphereBonus: Record<AtmosphereType, number> = {
    VACUUM: 1.0,
    THIN: 1.05,
    STANDARD: 1.0,
    DENSE: 0.95,
    TOXIC: 1.0,
    CRUSHING: 0.8,
  };

  const atmoBonus = atmosphereBonus[atmosphere] || 1.0;

  return base * atmoBonus;
}

function computeCarryCapacityModifier(gravityRelative: number): number {
  return Math.max(0.2, 1.0 / gravityRelative);
}

function computeHealthRegenModifier(
  atmosphere: AtmosphereType,
  radiationLevel: number,
  temperatureKelvin: number,
): number {
  let base = 1.0;

  const atmosphereHealth: Record<AtmosphereType, number> = {
    VACUUM: 0.0,
    THIN: 0.5,
    STANDARD: 1.0,
    DENSE: 0.9,
    TOXIC: 0.0,
    CRUSHING: 0.3,
  };

  base = atmosphereHealth[atmosphere] ?? 1.0;

  const radiationPenalty = Math.max(0, 1.0 - (radiationLevel * radiationLevel) / 100);
  base *= radiationPenalty;

  const idealTemp = 288;
  const tempDiff = Math.abs(temperatureKelvin - idealTemp);
  const tempPenalty = Math.max(0.1, 1.0 - tempDiff / 200);

  return base * tempPenalty;
}

export function validatePhysics(
  state: WorldPhysicsState,
  worldId: string,
): 'ok' | WorldPhysicsError {
  const physics = state.physics.get(worldId);
  if (physics === undefined) {
    return 'physics-not-found';
  }

  const gravityVal = validateGravity(physics.gravity);
  if (gravityVal !== 'ok') return gravityVal;

  const atmoVal = validateAtmosphere(physics.atmosphere);
  if (atmoVal !== 'ok') return atmoVal;

  const dayVal = validateDayLength(physics.dayLengthHours);
  if (dayVal !== 'ok') return dayVal;

  const tempVal = validateTemperature(physics.temperatureKelvin);
  if (tempVal !== 'ok') return tempVal;

  const coherence = validateCoherence(
    physics.gravity,
    physics.atmosphere,
    physics.surfacePressureKpa,
    physics.temperatureKelvin,
  );
  if (coherence !== 'ok') return coherence;

  return 'ok';
}

export function compareWorlds(
  state: WorldPhysicsState,
  worldId1: string,
  worldId2: string,
):
  | {
      gravityRatio: number;
      dayLengthRatio: number;
      pressureRatio: number;
      temperatureDiff: number;
      atmosphereMatch: boolean;
    }
  | WorldPhysicsError {
  const physics1 = state.physics.get(worldId1);
  const physics2 = state.physics.get(worldId2);

  if (physics1 === undefined || physics2 === undefined) {
    return 'physics-not-found';
  }

  return {
    gravityRatio: physics1.gravity / physics2.gravity,
    dayLengthRatio: physics1.dayLengthHours / physics2.dayLengthHours,
    pressureRatio: physics1.surfacePressureKpa / physics2.surfacePressureKpa,
    temperatureDiff: physics1.temperatureKelvin - physics2.temperatureKelvin,
    atmosphereMatch: physics1.atmosphere === physics2.atmosphere,
  };
}

export function getPhysicsReport(
  state: WorldPhysicsState,
  worldId: string,
): PhysicsReport | WorldPhysicsError {
  const physics = state.physics.get(worldId);
  if (physics === undefined) {
    return 'physics-not-found';
  }

  const modifiers = getModifiers(state, worldId);
  if (typeof modifiers === 'string') {
    return modifiers;
  }

  const warnings: string[] = [];
  const habitability = computeHabitabilityScore(physics, warnings);

  const now = state.clock.nowMicros();

  return {
    worldId,
    physics,
    modifiers,
    habitabilityScore: habitability,
    warnings,
    generatedAt: now,
  };
}

function computeHabitabilityScore(physics: WorldPhysics, warnings: string[]): number {
  let score = 100;

  const earthRelative = physics.gravity / EARTH_GRAVITY;
  if (earthRelative < 0.5 || earthRelative > 2.0) {
    score -= 30;
    warnings.push('Extreme gravity');
  } else if (earthRelative < 0.7 || earthRelative > 1.5) {
    score -= 15;
    warnings.push('Non-standard gravity');
  }

  if (physics.atmosphere === 'VACUUM' || physics.atmosphere === 'TOXIC') {
    score -= 40;
    warnings.push('Hostile atmosphere');
  } else if (physics.atmosphere === 'CRUSHING') {
    score -= 30;
    warnings.push('Crushing atmosphere');
  } else if (physics.atmosphere === 'THIN') {
    score -= 10;
    warnings.push('Thin atmosphere');
  }

  const idealTemp = 288;
  const tempDiff = Math.abs(physics.temperatureKelvin - idealTemp);
  if (tempDiff > 100) {
    score -= 30;
    warnings.push('Extreme temperature');
  } else if (tempDiff > 50) {
    score -= 15;
    warnings.push('Non-ideal temperature');
  }

  if (physics.radiationLevel > 5) {
    score -= 20;
    warnings.push('High radiation');
  } else if (physics.radiationLevel > 2) {
    score -= 10;
    warnings.push('Elevated radiation');
  }

  if (physics.dayLengthHours < 12 || physics.dayLengthHours > 48) {
    score -= 5;
    warnings.push('Unusual day length');
  }

  return Math.max(0, score);
}

export function setConstraint(
  state: WorldPhysicsState,
  worldId: string,
  minGravity: number,
  maxGravity: number,
  allowedAtmospheres: AtmosphereType[],
  minDayLength: number,
  maxDayLength: number,
): PhysicsConstraint | WorldPhysicsError {
  if (minGravity < 0 || maxGravity < minGravity) {
    return 'invalid-gravity';
  }

  if (minDayLength < 0 || maxDayLength < minDayLength) {
    return 'invalid-day-length';
  }

  const constraint: PhysicsConstraint = {
    worldId,
    minGravity,
    maxGravity,
    allowedAtmospheres,
    minDayLength,
    maxDayLength,
  };

  state.constraints.set(worldId, constraint);
  state.logger.info('Set physics constraint for world: ' + worldId);

  return constraint;
}

export function getPhysics(
  state: WorldPhysicsState,
  worldId: string,
): WorldPhysics | WorldPhysicsError {
  const physics = state.physics.get(worldId);
  if (physics === undefined) {
    return 'physics-not-found';
  }
  return physics;
}

export function getConstraint(
  state: WorldPhysicsState,
  worldId: string,
): PhysicsConstraint | WorldPhysicsError {
  const constraint = state.constraints.get(worldId);
  if (constraint === undefined) {
    return 'constraint-not-found';
  }
  return constraint;
}

export function getAllPhysics(state: WorldPhysicsState): WorldPhysics[] {
  return Array.from(state.physics.values());
}

export function getWorldsByGravityClass(
  state: WorldPhysicsState,
  gravityClass: GravityClass,
): WorldPhysics[] {
  const worlds: WorldPhysics[] = [];

  for (const physics of state.physics.values()) {
    if (physics.gravityClass === gravityClass) {
      worlds.push(physics);
    }
  }

  return worlds;
}

export function getWorldsByAtmosphere(
  state: WorldPhysicsState,
  atmosphere: AtmosphereType,
): WorldPhysics[] {
  const worlds: WorldPhysics[] = [];

  for (const physics of state.physics.values()) {
    if (physics.atmosphere === atmosphere) {
      worlds.push(physics);
    }
  }

  return worlds;
}

export function getHabitableWorlds(
  state: WorldPhysicsState,
  minScore: number,
): Array<{ worldId: string; score: number }> {
  const habitable: Array<{ worldId: string; score: number }> = [];

  for (const physics of state.physics.values()) {
    const warnings: string[] = [];
    const score = computeHabitabilityScore(physics, warnings);

    if (score >= minScore) {
      habitable.push({ worldId: physics.worldId, score });
    }
  }

  return habitable.sort((a, b) => b.score - a.score);
}

export function removePhysics(state: WorldPhysicsState, worldId: string): 'ok' | WorldPhysicsError {
  const physics = state.physics.get(worldId);
  if (physics === undefined) {
    return 'physics-not-found';
  }

  state.physics.delete(worldId);
  state.logger.info('Removed physics for world: ' + worldId);

  return 'ok';
}

export function removeConstraint(
  state: WorldPhysicsState,
  worldId: string,
): 'ok' | WorldPhysicsError {
  const constraint = state.constraints.get(worldId);
  if (constraint === undefined) {
    return 'constraint-not-found';
  }

  state.constraints.delete(worldId);
  state.logger.info('Removed constraint for world: ' + worldId);

  return 'ok';
}
