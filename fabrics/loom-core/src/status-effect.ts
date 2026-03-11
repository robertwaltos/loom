/**
 * Status Effect System — Buffs, debuffs, stacking, immunity, tick effects.
 *
 * Status effects applied to entities. Stacking behaviors: REPLACE, EXTEND,
 * STACK, REFRESH. Immunity grants. Tick effects (apply per second).
 */

export type EffectType =
  | 'POISON'
  | 'BURN'
  | 'FREEZE'
  | 'STUN'
  | 'SLOW'
  | 'HASTE'
  | 'REGEN'
  | 'SHIELD'
  | 'WEAKNESS'
  | 'STRENGTH';

export type StackBehavior = 'REPLACE' | 'EXTEND' | 'STACK' | 'REFRESH';

export interface StatusEffect {
  readonly effectId: string;
  readonly effectType: EffectType;
  readonly magnitude: bigint;
  readonly durationUs: bigint;
  readonly stackBehavior: StackBehavior;
  readonly tickIntervalUs: bigint;
  readonly appliedAt: bigint;
  readonly expiresAt: bigint;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
}

export interface ActiveEffect {
  readonly effectId: string;
  readonly effectType: EffectType;
  readonly magnitude: bigint;
  readonly remainingDurationUs: bigint;
  readonly stackCount: number;
  readonly lastTickAt: bigint;
}

export interface ImmunityRecord {
  readonly entityId: string;
  readonly effectType: EffectType;
  readonly grantedAt: bigint;
  readonly expiresAt: bigint;
}

export interface StatusReport {
  readonly entityId: string;
  readonly activeEffects: ReadonlyArray<ActiveEffect>;
  readonly immunities: ReadonlyArray<ImmunityRecord>;
  readonly totalEffects: number;
  readonly generatedAt: bigint;
}

export interface TickResult {
  readonly entityId: string;
  readonly effectId: string;
  readonly effectType: EffectType;
  readonly magnitude: bigint;
  readonly tickedAt: bigint;
}

export type StatusEffectError =
  | 'entity-not-found'
  | 'effect-not-found'
  | 'immune-to-effect'
  | 'invalid-magnitude'
  | 'invalid-duration'
  | 'invalid-tick-interval';

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

interface StatusEffectState {
  effects: Map<string, Array<StatusEffect>>;
  immunities: Map<string, Array<ImmunityRecord>>;
  lastTicks: Map<string, bigint>;
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

interface StatusEffectDeps {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

export function createStatusEffectSystem(deps: StatusEffectDeps): StatusEffectState {
  return {
    effects: new Map(),
    immunities: new Map(),
    lastTicks: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
}

function isImmune(state: StatusEffectState, entityId: string, effectType: EffectType): boolean {
  const immunityList = state.immunities.get(entityId);
  if (immunityList === undefined) {
    return false;
  }
  const now = state.clock.nowUs();
  for (const imm of immunityList) {
    if (imm.effectType === effectType && imm.expiresAt > now) {
      return true;
    }
  }
  return false;
}

function findExistingEffect(
  effects: StatusEffect[],
  effectType: EffectType,
): StatusEffect | undefined {
  for (const eff of effects) {
    if (eff.effectType === effectType) {
      return eff;
    }
  }
  return undefined;
}

function handleReplaceStack(
  state: StatusEffectState,
  effects: StatusEffect[],
  newEffect: StatusEffect,
): StatusEffect[] {
  const filtered: StatusEffect[] = [];
  for (const eff of effects) {
    if (eff.effectType !== newEffect.effectType) {
      filtered.push(eff);
    }
  }
  filtered.push(newEffect);
  return filtered;
}

function handleExtendStack(
  state: StatusEffectState,
  effects: StatusEffect[],
  newEffect: StatusEffect,
): StatusEffect[] {
  const existing = findExistingEffect(effects, newEffect.effectType);
  if (existing === undefined) {
    return [...effects, newEffect];
  }
  const extendedDuration = existing.durationUs + newEffect.durationUs;
  const extendedExpiresAt = existing.expiresAt + newEffect.durationUs;
  const extended: StatusEffect = {
    ...existing,
    durationUs: extendedDuration,
    expiresAt: extendedExpiresAt,
  };
  const updated: StatusEffect[] = [];
  for (const eff of effects) {
    if (eff.effectId === existing.effectId) {
      updated.push(extended);
    } else {
      updated.push(eff);
    }
  }
  return updated;
}

function handleStackStack(
  state: StatusEffectState,
  effects: StatusEffect[],
  newEffect: StatusEffect,
): StatusEffect[] {
  return [...effects, newEffect];
}

function handleRefreshStack(
  state: StatusEffectState,
  effects: StatusEffect[],
  newEffect: StatusEffect,
): StatusEffect[] {
  const existing = findExistingEffect(effects, newEffect.effectType);
  if (existing === undefined) {
    return [...effects, newEffect];
  }
  const now = state.clock.nowUs();
  const refreshed: StatusEffect = {
    ...existing,
    magnitude: newEffect.magnitude,
    durationUs: newEffect.durationUs,
    appliedAt: now,
    expiresAt: now + newEffect.durationUs,
  };
  const updated: StatusEffect[] = [];
  for (const eff of effects) {
    if (eff.effectId === existing.effectId) {
      updated.push(refreshed);
    } else {
      updated.push(eff);
    }
  }
  return updated;
}

export function applyEffect(
  state: StatusEffectState,
  sourceEntityId: string,
  targetEntityId: string,
  effectType: EffectType,
  magnitude: bigint,
  durationUs: bigint,
  stackBehavior: StackBehavior,
  tickIntervalUs: bigint,
): StatusEffect | StatusEffectError {
  if (magnitude < 0n) {
    return 'invalid-magnitude';
  }
  if (durationUs <= 0n) {
    return 'invalid-duration';
  }
  if (tickIntervalUs <= 0n) {
    return 'invalid-tick-interval';
  }
  if (isImmune(state, targetEntityId, effectType)) {
    return 'immune-to-effect';
  }
  const now = state.clock.nowUs();
  const effectId = state.idGen.generate();
  const newEffect: StatusEffect = {
    effectId,
    effectType,
    magnitude,
    durationUs,
    stackBehavior,
    tickIntervalUs,
    appliedAt: now,
    expiresAt: now + durationUs,
    sourceEntityId,
    targetEntityId,
  };
  const existingEffects = state.effects.get(targetEntityId);
  if (existingEffects === undefined) {
    state.effects.set(targetEntityId, [newEffect]);
  } else {
    let updated: StatusEffect[];
    if (stackBehavior === 'REPLACE') {
      updated = handleReplaceStack(state, existingEffects, newEffect);
    } else if (stackBehavior === 'EXTEND') {
      updated = handleExtendStack(state, existingEffects, newEffect);
    } else if (stackBehavior === 'STACK') {
      updated = handleStackStack(state, existingEffects, newEffect);
    } else {
      updated = handleRefreshStack(state, existingEffects, newEffect);
    }
    state.effects.set(targetEntityId, updated);
  }
  state.logger.info('effect-applied id=' + effectId + ' target=' + targetEntityId);
  return newEffect;
}

export function removeEffect(
  state: StatusEffectState,
  entityId: string,
  effectId: string,
): 'ok' | StatusEffectError {
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return 'entity-not-found';
  }
  const filtered: StatusEffect[] = [];
  let found = false;
  for (const eff of effects) {
    if (eff.effectId === effectId) {
      found = true;
    } else {
      filtered.push(eff);
    }
  }
  if (!found) {
    return 'effect-not-found';
  }
  state.effects.set(entityId, filtered);
  state.logger.info('effect-removed id=' + effectId + ' entity=' + entityId);
  return 'ok';
}

export function grantImmunity(
  state: StatusEffectState,
  entityId: string,
  effectType: EffectType,
  durationUs: bigint,
): ImmunityRecord | StatusEffectError {
  if (durationUs <= 0n) {
    return 'invalid-duration';
  }
  const now = state.clock.nowUs();
  const immunity: ImmunityRecord = {
    entityId,
    effectType,
    grantedAt: now,
    expiresAt: now + durationUs,
  };
  const existing = state.immunities.get(entityId);
  if (existing === undefined) {
    state.immunities.set(entityId, [immunity]);
  } else {
    existing.push(immunity);
  }
  state.logger.info('immunity-granted entity=' + entityId + ' type=' + effectType);
  return immunity;
}

export function revokeImmunity(
  state: StatusEffectState,
  entityId: string,
  effectType: EffectType,
): 'ok' | StatusEffectError {
  const immunities = state.immunities.get(entityId);
  if (immunities === undefined) {
    return 'entity-not-found';
  }
  const filtered: ImmunityRecord[] = [];
  for (const imm of immunities) {
    if (imm.effectType !== effectType) {
      filtered.push(imm);
    }
  }
  state.immunities.set(entityId, filtered);
  state.logger.info('immunity-revoked entity=' + entityId + ' type=' + effectType);
  return 'ok';
}

function cleanExpiredEffects(state: StatusEffectState, entityId: string): void {
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return;
  }
  const now = state.clock.nowUs();
  const active: StatusEffect[] = [];
  for (const eff of effects) {
    if (eff.expiresAt > now) {
      active.push(eff);
    }
  }
  state.effects.set(entityId, active);
}

export function tickEffects(
  state: StatusEffectState,
  entityId: string,
): ReadonlyArray<TickResult> | StatusEffectError {
  cleanExpiredEffects(state, entityId);
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return [];
  }
  const now = state.clock.nowUs();
  const results: TickResult[] = [];
  for (const eff of effects) {
    const lastTickKey = eff.effectId;
    const lastTick = state.lastTicks.get(lastTickKey);
    const shouldTick = lastTick === undefined || now - lastTick >= eff.tickIntervalUs;
    if (shouldTick) {
      const tickResult: TickResult = {
        entityId,
        effectId: eff.effectId,
        effectType: eff.effectType,
        magnitude: eff.magnitude,
        tickedAt: now,
      };
      results.push(tickResult);
      state.lastTicks.set(lastTickKey, now);
      state.logger.debug('effect-ticked id=' + eff.effectId + ' entity=' + entityId);
    }
  }
  return results;
}

export function getActiveEffects(
  state: StatusEffectState,
  entityId: string,
): ReadonlyArray<ActiveEffect> {
  cleanExpiredEffects(state, entityId);
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return [];
  }
  const now = state.clock.nowUs();
  const active: ActiveEffect[] = [];
  const typeCounts = new Map<EffectType, number>();
  for (const eff of effects) {
    const count = typeCounts.get(eff.effectType);
    if (count === undefined) {
      typeCounts.set(eff.effectType, 1);
    } else {
      typeCounts.set(eff.effectType, count + 1);
    }
  }
  for (const eff of effects) {
    const remaining = eff.expiresAt - now;
    const lastTickKey = eff.effectId;
    const lastTick = state.lastTicks.get(lastTickKey);
    const stackCount = typeCounts.get(eff.effectType);
    const activeEff: ActiveEffect = {
      effectId: eff.effectId,
      effectType: eff.effectType,
      magnitude: eff.magnitude,
      remainingDurationUs: remaining,
      stackCount: stackCount !== undefined ? stackCount : 1,
      lastTickAt: lastTick !== undefined ? lastTick : 0n,
    };
    active.push(activeEff);
  }
  return active;
}

export function getStatusReport(state: StatusEffectState, entityId: string): StatusReport {
  const activeEffects = getActiveEffects(state, entityId);
  const immunityList = state.immunities.get(entityId);
  const now = state.clock.nowUs();
  const activeImmunities: ImmunityRecord[] = [];
  if (immunityList !== undefined) {
    for (const imm of immunityList) {
      if (imm.expiresAt > now) {
        activeImmunities.push(imm);
      }
    }
  }
  return {
    entityId,
    activeEffects,
    immunities: activeImmunities,
    totalEffects: activeEffects.length,
    generatedAt: now,
  };
}

export function clearAllEffects(
  state: StatusEffectState,
  entityId: string,
): 'ok' | StatusEffectError {
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return 'entity-not-found';
  }
  state.effects.set(entityId, []);
  state.logger.info('effects-cleared entity=' + entityId);
  return 'ok';
}

export function clearAllImmunities(
  state: StatusEffectState,
  entityId: string,
): 'ok' | StatusEffectError {
  const immunities = state.immunities.get(entityId);
  if (immunities === undefined) {
    return 'entity-not-found';
  }
  state.immunities.set(entityId, []);
  state.logger.info('immunities-cleared entity=' + entityId);
  return 'ok';
}

export function removeEffectsByType(
  state: StatusEffectState,
  entityId: string,
  effectType: EffectType,
): 'ok' | StatusEffectError {
  const effects = state.effects.get(entityId);
  if (effects === undefined) {
    return 'entity-not-found';
  }
  const filtered: StatusEffect[] = [];
  for (const eff of effects) {
    if (eff.effectType !== effectType) {
      filtered.push(eff);
    }
  }
  state.effects.set(entityId, filtered);
  state.logger.info('effects-removed-by-type entity=' + entityId + ' type=' + effectType);
  return 'ok';
}
