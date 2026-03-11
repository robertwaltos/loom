/**
 * Ability System — Entity abilities with cooldowns, resources, effects.
 *
 * Entities can activate abilities. Each ability costs resources (stamina/mana),
 * has a cooldown period, effect type, and range. Enforce cooldowns, validate
 * resources, apply effects to targets.
 */

export type EffectType = 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'TELEPORT' | 'SUMMON' | 'SHIELD';

export type ResourceType = 'STAMINA' | 'MANA' | 'HEALTH' | 'ENERGY';

export interface ResourceCost {
  readonly resourceType: ResourceType;
  readonly amount: bigint;
}

export interface Cooldown {
  readonly abilityId: string;
  readonly entityId: string;
  readonly startedAt: bigint;
  readonly durationUs: bigint;
  readonly endsAt: bigint;
}

export interface AbilityEffect {
  readonly effectType: EffectType;
  readonly magnitude: bigint;
  readonly durationUs: bigint;
  readonly targetEntityId: string;
}

export interface Ability {
  readonly abilityId: string;
  readonly name: string;
  readonly costs: ReadonlyArray<ResourceCost>;
  readonly cooldownUs: bigint;
  readonly effectType: EffectType;
  readonly effectMagnitude: bigint;
  readonly effectDurationUs: bigint;
  readonly range: bigint;
  readonly createdAt: bigint;
}

export interface EntityResources {
  readonly entityId: string;
  readonly resources: ReadonlyMap<ResourceType, bigint>;
}

export interface ActivationResult {
  readonly success: boolean;
  readonly abilityId: string;
  readonly entityId: string;
  readonly targetEntityId: string;
  readonly effects: ReadonlyArray<AbilityEffect>;
  readonly cooldownEndsAt: bigint;
  readonly activatedAt: bigint;
}

export interface AbilityReport {
  readonly abilityId: string;
  readonly totalActivations: number;
  readonly successfulActivations: number;
  readonly failedActivations: number;
  readonly totalDamage: bigint;
  readonly totalHealing: bigint;
  readonly generatedAt: bigint;
}

export interface EffectApplication {
  readonly effectId: string;
  readonly abilityId: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly effectType: EffectType;
  readonly magnitude: bigint;
  readonly appliedAt: bigint;
  readonly expiresAt: bigint;
}

export type AbilitySystemError =
  | 'ability-not-found'
  | 'entity-not-found'
  | 'insufficient-resources'
  | 'on-cooldown'
  | 'target-out-of-range'
  | 'invalid-magnitude'
  | 'invalid-duration';

interface Clock {
  nowUs(): bigint;
}

interface IdGenerator {
  generate(): string;
}

interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

interface AbilitySystemState {
  abilities: Map<string, Ability>;
  cooldowns: Map<string, Cooldown>;
  entityResources: Map<string, Map<ResourceType, bigint>>;
  activations: Map<string, Array<ActivationResult>>;
  effects: Map<string, Array<EffectApplication>>;
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

interface AbilitySystemDeps {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

export function createAbilitySystem(deps: AbilitySystemDeps): AbilitySystemState {
  return {
    abilities: new Map(),
    cooldowns: new Map(),
    entityResources: new Map(),
    activations: new Map(),
    effects: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
}

export function registerAbility(
  state: AbilitySystemState,
  name: string,
  costs: ResourceCost[],
  cooldownUs: bigint,
  effectType: EffectType,
  magnitude: bigint,
  durationUs: bigint,
  range: bigint,
): Ability | AbilitySystemError {
  if (magnitude < 0n) {
    return 'invalid-magnitude';
  }
  if (durationUs < 0n) {
    return 'invalid-duration';
  }
  const abilityId = state.idGen.generate();
  const ability: Ability = {
    abilityId,
    name,
    costs,
    cooldownUs,
    effectType,
    effectMagnitude: magnitude,
    effectDurationUs: durationUs,
    range,
    createdAt: state.clock.nowUs(),
  };
  state.abilities.set(abilityId, ability);
  state.logger.info('ability-registered id=' + abilityId + ' name=' + name);
  return ability;
}

export function setEntityResources(
  state: AbilitySystemState,
  entityId: string,
  resources: Map<ResourceType, bigint>,
): 'ok' {
  state.entityResources.set(entityId, new Map(resources));
  return 'ok';
}

export function getEntityResources(
  state: AbilitySystemState,
  entityId: string,
): EntityResources | AbilitySystemError {
  const resources = state.entityResources.get(entityId);
  if (resources === undefined) {
    return 'entity-not-found';
  }
  return { entityId, resources: new Map(resources) };
}

function cooldownKey(entityId: string, abilityId: string): string {
  return entityId + ':' + abilityId;
}

export function isOnCooldown(
  state: AbilitySystemState,
  entityId: string,
  abilityId: string,
): boolean {
  const key = cooldownKey(entityId, abilityId);
  const cd = state.cooldowns.get(key);
  if (cd === undefined) {
    return false;
  }
  const now = state.clock.nowUs();
  return now < cd.endsAt;
}

function deductResources(
  state: AbilitySystemState,
  entityId: string,
  costs: ReadonlyArray<ResourceCost>,
): 'ok' | AbilitySystemError {
  const resources = state.entityResources.get(entityId);
  if (resources === undefined) {
    return 'entity-not-found';
  }
  for (const cost of costs) {
    const current = resources.get(cost.resourceType);
    if (current === undefined || current < cost.amount) {
      return 'insufficient-resources';
    }
  }
  for (const cost of costs) {
    const current = resources.get(cost.resourceType);
    if (current !== undefined) {
      resources.set(cost.resourceType, current - cost.amount);
    }
  }
  return 'ok';
}

export function validateResources(
  state: AbilitySystemState,
  entityId: string,
  abilityId: string,
): 'ok' | AbilitySystemError {
  const ability = state.abilities.get(abilityId);
  if (ability === undefined) {
    return 'ability-not-found';
  }
  const resources = state.entityResources.get(entityId);
  if (resources === undefined) {
    return 'entity-not-found';
  }
  for (const cost of ability.costs) {
    const current = resources.get(cost.resourceType);
    if (current === undefined || current < cost.amount) {
      return 'insufficient-resources';
    }
  }
  return 'ok';
}

function calculateDistance(entityId: string, targetId: string): bigint {
  const hash1 = hashString(entityId);
  const hash2 = hashString(targetId);
  const diff = hash1 > hash2 ? hash1 - hash2 : hash2 - hash1;
  return BigInt(diff % 1000);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i = i + 1) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash | 0;
  }
  return hash > 0 ? hash : -hash;
}

export function activateAbility(
  state: AbilitySystemState,
  entityId: string,
  abilityId: string,
  targetEntityId: string,
): ActivationResult | AbilitySystemError {
  const ability = state.abilities.get(abilityId);
  if (ability === undefined) {
    return 'ability-not-found';
  }
  if (isOnCooldown(state, entityId, abilityId)) {
    return 'on-cooldown';
  }
  const validationResult = validateResources(state, entityId, abilityId);
  if (validationResult !== 'ok') {
    return validationResult;
  }
  const distance = calculateDistance(entityId, targetEntityId);
  if (distance > ability.range) {
    return 'target-out-of-range';
  }
  const deductResult = deductResources(state, entityId, ability.costs);
  if (deductResult !== 'ok') {
    return deductResult;
  }
  const now = state.clock.nowUs();
  const effect: AbilityEffect = {
    effectType: ability.effectType,
    magnitude: ability.effectMagnitude,
    durationUs: ability.effectDurationUs,
    targetEntityId,
  };
  const cooldownEnd = now + ability.cooldownUs;
  const cdKey = cooldownKey(entityId, abilityId);
  const cooldown: Cooldown = {
    abilityId,
    entityId,
    startedAt: now,
    durationUs: ability.cooldownUs,
    endsAt: cooldownEnd,
  };
  state.cooldowns.set(cdKey, cooldown);
  const activation: ActivationResult = {
    success: true,
    abilityId,
    entityId,
    targetEntityId,
    effects: [effect],
    cooldownEndsAt: cooldownEnd,
    activatedAt: now,
  };
  const arr = state.activations.get(abilityId);
  if (arr === undefined) {
    state.activations.set(abilityId, [activation]);
  } else {
    arr.push(activation);
  }
  state.logger.info('ability-activated id=' + abilityId + ' entity=' + entityId);
  return activation;
}

export function applyEffect(
  state: AbilitySystemState,
  abilityId: string,
  sourceEntityId: string,
  targetEntityId: string,
  effectType: EffectType,
  magnitude: bigint,
  durationUs: bigint,
): EffectApplication | AbilitySystemError {
  if (magnitude < 0n) {
    return 'invalid-magnitude';
  }
  if (durationUs < 0n) {
    return 'invalid-duration';
  }
  const now = state.clock.nowUs();
  const effectId = state.idGen.generate();
  const application: EffectApplication = {
    effectId,
    abilityId,
    sourceEntityId,
    targetEntityId,
    effectType,
    magnitude,
    appliedAt: now,
    expiresAt: now + durationUs,
  };
  const arr = state.effects.get(targetEntityId);
  if (arr === undefined) {
    state.effects.set(targetEntityId, [application]);
  } else {
    arr.push(application);
  }
  state.logger.debug('effect-applied id=' + effectId + ' target=' + targetEntityId);
  return application;
}

export function resetCooldown(
  state: AbilitySystemState,
  entityId: string,
  abilityId: string,
): 'ok' | AbilitySystemError {
  const key = cooldownKey(entityId, abilityId);
  const cd = state.cooldowns.get(key);
  if (cd === undefined) {
    return 'ability-not-found';
  }
  state.cooldowns.delete(key);
  state.logger.info('cooldown-reset entity=' + entityId + ' ability=' + abilityId);
  return 'ok';
}

export function getAbilityReport(
  state: AbilitySystemState,
  abilityId: string,
): AbilityReport | AbilitySystemError {
  const ability = state.abilities.get(abilityId);
  if (ability === undefined) {
    return 'ability-not-found';
  }
  const activations = state.activations.get(abilityId);
  if (activations === undefined) {
    return {
      abilityId,
      totalActivations: 0,
      successfulActivations: 0,
      failedActivations: 0,
      totalDamage: 0n,
      totalHealing: 0n,
      generatedAt: state.clock.nowUs(),
    };
  }
  let totalAct = 0;
  let successAct = 0;
  let failedAct = 0;
  let totalDmg = 0n;
  let totalHeal = 0n;
  for (const act of activations) {
    totalAct = totalAct + 1;
    if (act.success) {
      successAct = successAct + 1;
    } else {
      failedAct = failedAct + 1;
    }
    for (const eff of act.effects) {
      if (eff.effectType === 'DAMAGE') {
        totalDmg = totalDmg + eff.magnitude;
      }
      if (eff.effectType === 'HEAL') {
        totalHeal = totalHeal + eff.magnitude;
      }
    }
  }
  return {
    abilityId,
    totalActivations: totalAct,
    successfulActivations: successAct,
    failedActivations: failedAct,
    totalDamage: totalDmg,
    totalHealing: totalHeal,
    generatedAt: state.clock.nowUs(),
  };
}

export function getActiveEffects(
  state: AbilitySystemState,
  entityId: string,
): ReadonlyArray<EffectApplication> {
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return [];
  }
  const now = state.clock.nowUs();
  const active: EffectApplication[] = [];
  for (const eff of effects) {
    if (eff.expiresAt > now) {
      active.push(eff);
    }
  }
  return active;
}

export function listAbilities(state: AbilitySystemState): ReadonlyArray<Ability> {
  return Array.from(state.abilities.values());
}

export function getAbility(
  state: AbilitySystemState,
  abilityId: string,
): Ability | AbilitySystemError {
  const ability = state.abilities.get(abilityId);
  if (ability === undefined) {
    return 'ability-not-found';
  }
  return ability;
}
