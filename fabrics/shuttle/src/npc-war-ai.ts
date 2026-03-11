/**
 * NPC War AI - Military decision-making, troop management, and battle execution
 *
 * NPCs assess military strength, select tactics, manage morale and fatigue,
 * record battle outcomes, and track war exhaustion over time. Surrender is possible.
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type Tactic = 'ASSAULT' | 'SIEGE' | 'AMBUSH' | 'RETREAT' | 'FORTIFY' | 'SKIRMISH';

export type TroopType = 'INFANTRY' | 'CAVALRY' | 'ARCHERS' | 'SIEGE_ENGINES';

export type MilitaryForce = {
  dynastyId: string;
  troops: Map<TroopType, number>;
  morale: number; // 0-100
  fatigue: number; // 0-100
  combatPower: number;
  defensivePower: number;
  updatedAt: bigint;
};

export type BattleOrder = {
  id: string;
  attackerDynasty: string;
  defenderDynasty: string;
  tactic: Tactic;
  attackerForce: number;
  defenderForce: number;
  terrain: TerrainType;
  issuedAt: bigint;
};

export type TerrainType = 'OPEN' | 'FOREST' | 'MOUNTAINS' | 'URBAN' | 'COASTAL';

export type BattleOutcome = {
  id: string;
  battleId: string;
  victor: string; // dynastyId
  attackerCasualties: number;
  defenderCasualties: number;
  moraleChange: number; // for victor
  spoilsTaken: bigint; // KALON
  territoryGained: number; // square km
  recordedAt: bigint;
};

export type WarExhaustion = {
  dynastyId: string;
  level: number; // 0-100
  battlesEngaged: number;
  casualtiesSuffered: number;
  consecutiveLosses: number;
  exhaustionRate: number; // per battle
  updatedAt: bigint;
};

export type MilitaryReport = {
  dynastyId: string;
  force: MilitaryForce;
  exhaustion: WarExhaustion;
  recentBattles: BattleOutcome[];
  winsLast10: number;
  lossesLast10: number;
  totalCasualties: number;
  generatedAt: bigint;
};

export type TacticModifiers = {
  tactic: Tactic;
  terrain: TerrainType;
  attackBonus: number; // 0.0-2.0
  defenseBonus: number;
  casualtyMultiplier: number;
};

export type MilitaryState = {
  forces: Map<string, MilitaryForce>;
  orders: Map<string, BattleOrder>;
  outcomes: Map<string, BattleOutcome>;
  exhaustion: Map<string, WarExhaustion>;
};

export type WarError =
  | 'invalid-dynasty'
  | 'invalid-morale'
  | 'invalid-fatigue'
  | 'invalid-power'
  | 'invalid-tactic'
  | 'invalid-force'
  | 'invalid-terrain'
  | 'invalid-level'
  | 'force-not-found'
  | 'order-not-found'
  | 'outcome-not-found'
  | 'exhaustion-not-found'
  | 'insufficient-troops';

// ============================================================================
// FACTORY
// ============================================================================

export function createMilitaryState(): MilitaryState {
  return {
    forces: new Map(),
    orders: new Map(),
    outcomes: new Map(),
    exhaustion: new Map(),
  };
}

// ============================================================================
// FORCE MANAGEMENT
// ============================================================================

export function registerForce(
  state: MilitaryState,
  dynastyId: string,
  troops: Map<TroopType, number>,
  morale: number,
  fatigue: number,
  clock: Clock,
): MilitaryForce | WarError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';
  if (morale < 0 || morale > 100) return 'invalid-morale';
  if (fatigue < 0 || fatigue > 100) return 'invalid-fatigue';

  const combatPower = calculateCombatPower(troops, morale, fatigue);
  const defensivePower = calculateDefensivePower(troops, morale, fatigue);

  const force: MilitaryForce = {
    dynastyId,
    troops,
    morale,
    fatigue,
    combatPower,
    defensivePower,
    updatedAt: clock.now(),
  };

  state.forces.set(dynastyId, force);
  return force;
}

function calculateCombatPower(
  troops: Map<TroopType, number>,
  morale: number,
  fatigue: number,
): number {
  const infantry = troops.get('INFANTRY') || 0;
  const cavalry = troops.get('CAVALRY') || 0;
  const archers = troops.get('ARCHERS') || 0;
  const siege = troops.get('SIEGE_ENGINES') || 0;

  const raw = infantry * 1 + cavalry * 2.5 + archers * 1.5 + siege * 3;
  const moraleMultiplier = 0.5 + (morale / 100) * 0.5;
  const fatigueMultiplier = 1.0 - (fatigue / 100) * 0.4;

  return raw * moraleMultiplier * fatigueMultiplier;
}

function calculateDefensivePower(
  troops: Map<TroopType, number>,
  morale: number,
  fatigue: number,
): number {
  const infantry = troops.get('INFANTRY') || 0;
  const archers = troops.get('ARCHERS') || 0;
  const siege = troops.get('SIEGE_ENGINES') || 0;

  const raw = infantry * 1.5 + archers * 2 + siege * 1;
  const moraleMultiplier = 0.6 + (morale / 100) * 0.4;
  const fatigueMultiplier = 1.0 - (fatigue / 100) * 0.3;

  return raw * moraleMultiplier * fatigueMultiplier;
}

export function getForce(state: MilitaryState, dynastyId: string): MilitaryForce | WarError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';
  const force = state.forces.get(dynastyId);
  if (!force) return 'force-not-found';
  return force;
}

export function updateMorale(
  state: MilitaryState,
  dynastyId: string,
  delta: number,
  clock: Clock,
): MilitaryForce | WarError {
  const force = getForce(state, dynastyId);
  if (typeof force === 'string') return force;

  const newMorale = Math.max(0, Math.min(100, force.morale + delta));
  return registerForce(state, dynastyId, force.troops, newMorale, force.fatigue, clock);
}

export function updateFatigue(
  state: MilitaryState,
  dynastyId: string,
  delta: number,
  clock: Clock,
): MilitaryForce | WarError {
  const force = getForce(state, dynastyId);
  if (typeof force === 'string') return force;

  const newFatigue = Math.max(0, Math.min(100, force.fatigue + delta));
  return registerForce(state, dynastyId, force.troops, force.morale, newFatigue, clock);
}

export function adjustTroops(
  state: MilitaryState,
  dynastyId: string,
  troopType: TroopType,
  delta: number,
  clock: Clock,
): MilitaryForce | WarError {
  const force = getForce(state, dynastyId);
  if (typeof force === 'string') return force;

  const current = force.troops.get(troopType) || 0;
  const newCount = Math.max(0, current + delta);

  const newTroops = new Map(force.troops);
  newTroops.set(troopType, newCount);

  return registerForce(state, dynastyId, newTroops, force.morale, force.fatigue, clock);
}

// ============================================================================
// MILITARY ASSESSMENT
// ============================================================================

export function assessMilitary(
  state: MilitaryState,
  attackerDynasty: string,
  defenderDynasty: string,
): { powerRatio: number; recommendation: Tactic } | WarError {
  const attackerForce = getForce(state, attackerDynasty);
  if (typeof attackerForce === 'string') return attackerForce;

  const defenderForce = getForce(state, defenderDynasty);
  if (typeof defenderForce === 'string') return defenderForce;

  const powerRatio = attackerForce.combatPower / Math.max(1, defenderForce.defensivePower);
  const recommendation = recommendTactic(powerRatio, attackerForce);

  return { powerRatio, recommendation };
}

function recommendTactic(powerRatio: number, force: MilitaryForce): Tactic {
  if (force.fatigue > 70 || force.morale < 30) return 'RETREAT';
  if (powerRatio >= 2.0) return 'ASSAULT';
  if (powerRatio >= 1.3) return 'SKIRMISH';
  if (powerRatio >= 0.8) return 'SIEGE';
  if (powerRatio >= 0.5) return 'AMBUSH';
  return 'FORTIFY';
}

// ============================================================================
// TACTIC SELECTION
// ============================================================================

export function selectTactic(
  state: MilitaryState,
  dynastyId: string,
  enemyDynasty: string,
  terrain: TerrainType,
): Tactic | WarError {
  const assessment = assessMilitary(state, dynastyId, enemyDynasty);
  if (typeof assessment === 'string') return assessment;

  const baseTactic = assessment.recommendation;
  return adjustTacticForTerrain(baseTactic, terrain);
}

function adjustTacticForTerrain(tactic: Tactic, terrain: TerrainType): Tactic {
  if (terrain === 'MOUNTAINS' && tactic === 'ASSAULT') return 'AMBUSH';
  if (terrain === 'FOREST' && tactic === 'SIEGE') return 'SKIRMISH';
  if (terrain === 'URBAN' && tactic === 'AMBUSH') return 'SIEGE';
  if (terrain === 'COASTAL' && tactic === 'FORTIFY') return 'SKIRMISH';
  return tactic;
}

export function getTacticModifiers(tactic: Tactic, terrain: TerrainType): TacticModifiers {
  const base: TacticModifiers = {
    tactic,
    terrain,
    attackBonus: 1.0,
    defenseBonus: 1.0,
    casualtyMultiplier: 1.0,
  };

  if (tactic === 'ASSAULT') {
    base.attackBonus = 1.5;
    base.casualtyMultiplier = 1.8;
  }

  if (tactic === 'SIEGE') {
    base.defenseBonus = 0.7;
    base.casualtyMultiplier = 0.6;
  }

  if (tactic === 'AMBUSH') {
    base.attackBonus = 1.3;
    base.defenseBonus = 0.9;
  }

  if (tactic === 'RETREAT') {
    base.attackBonus = 0.3;
    base.defenseBonus = 0.5;
    base.casualtyMultiplier = 0.4;
  }

  if (tactic === 'FORTIFY') {
    base.attackBonus = 0.5;
    base.defenseBonus = 1.8;
    base.casualtyMultiplier = 0.5;
  }

  if (tactic === 'SKIRMISH') {
    base.attackBonus = 0.9;
    base.defenseBonus = 1.1;
    base.casualtyMultiplier = 0.7;
  }

  applyTerrainModifiers(base, terrain);
  return base;
}

function applyTerrainModifiers(mods: TacticModifiers, terrain: TerrainType): void {
  if (terrain === 'MOUNTAINS') {
    mods.defenseBonus = mods.defenseBonus * 1.3;
    mods.casualtyMultiplier = mods.casualtyMultiplier * 1.2;
  }

  if (terrain === 'FOREST' && mods.tactic === 'AMBUSH') {
    mods.attackBonus = mods.attackBonus * 1.4;
  }

  if (terrain === 'URBAN' && mods.tactic === 'SIEGE') {
    mods.attackBonus = mods.attackBonus * 1.3;
  }

  if (terrain === 'OPEN' && mods.tactic === 'ASSAULT') {
    mods.attackBonus = mods.attackBonus * 1.2;
  }
}

// ============================================================================
// BATTLE ORDERS
// ============================================================================

export function orderBattle(
  state: MilitaryState,
  attackerDynasty: string,
  defenderDynasty: string,
  tactic: Tactic,
  terrain: TerrainType,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): BattleOrder | WarError {
  if (!attackerDynasty || attackerDynasty.length === 0) return 'invalid-dynasty';
  if (!defenderDynasty || defenderDynasty.length === 0) return 'invalid-dynasty';
  if (!isValidTactic(tactic)) return 'invalid-tactic';
  if (!isValidTerrain(terrain)) return 'invalid-terrain';

  const attackerForce = getForce(state, attackerDynasty);
  if (typeof attackerForce === 'string') return attackerForce;

  const defenderForce = getForce(state, defenderDynasty);
  if (typeof defenderForce === 'string') return defenderForce;

  const order: BattleOrder = {
    id: idGen.generate(),
    attackerDynasty,
    defenderDynasty,
    tactic,
    attackerForce: attackerForce.combatPower,
    defenderForce: defenderForce.defensivePower,
    terrain,
    issuedAt: clock.now(),
  };

  state.orders.set(order.id, order);

  const msg =
    'Battle ordered: ' +
    attackerDynasty +
    ' vs ' +
    defenderDynasty +
    ' (' +
    tactic +
    ' on ' +
    terrain +
    ')';
  logger.info(msg);

  return order;
}

function isValidTactic(tactic: Tactic): boolean {
  const valid: Tactic[] = ['ASSAULT', 'SIEGE', 'AMBUSH', 'RETREAT', 'FORTIFY', 'SKIRMISH'];
  return valid.includes(tactic);
}

function isValidTerrain(terrain: TerrainType): boolean {
  const valid: TerrainType[] = ['OPEN', 'FOREST', 'MOUNTAINS', 'URBAN', 'COASTAL'];
  return valid.includes(terrain);
}

// ============================================================================
// BATTLE OUTCOMES
// ============================================================================

export function recordOutcome(
  state: MilitaryState,
  battleId: string,
  victor: string,
  attackerCasualties: number,
  defenderCasualties: number,
  moraleChange: number,
  spoilsTaken: bigint,
  territoryGained: number,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): BattleOutcome | WarError {
  const order = state.orders.get(battleId);
  if (!order) return 'order-not-found';

  if (attackerCasualties < 0 || defenderCasualties < 0) return 'invalid-force';

  const outcome: BattleOutcome = {
    id: idGen.generate(),
    battleId,
    victor,
    attackerCasualties,
    defenderCasualties,
    moraleChange,
    spoilsTaken,
    territoryGained,
    recordedAt: clock.now(),
  };

  state.outcomes.set(outcome.id, outcome);

  applyBattleEffects(state, order, outcome, clock);

  const msg =
    'Battle outcome: ' +
    victor +
    ' victory, ' +
    String(attackerCasualties + defenderCasualties) +
    ' casualties';
  logger.info(msg);

  return outcome;
}

function applyBattleEffects(
  state: MilitaryState,
  order: BattleOrder,
  outcome: BattleOutcome,
  clock: Clock,
): void {
  const loser =
    outcome.victor === order.attackerDynasty ? order.defenderDynasty : order.attackerDynasty;

  updateMorale(state, outcome.victor, outcome.moraleChange, clock);
  updateMorale(state, loser, -outcome.moraleChange, clock);

  updateFatigue(state, order.attackerDynasty, 15, clock);
  updateFatigue(state, order.defenderDynasty, 10, clock);

  adjustTroops(state, order.attackerDynasty, 'INFANTRY', -outcome.attackerCasualties, clock);
  adjustTroops(state, order.defenderDynasty, 'INFANTRY', -outcome.defenderCasualties, clock);

  incrementExhaustion(
    state,
    order.attackerDynasty,
    outcome.attackerCasualties,
    outcome.victor === order.attackerDynasty,
    clock,
  );
  incrementExhaustion(
    state,
    order.defenderDynasty,
    outcome.defenderCasualties,
    outcome.victor === order.defenderDynasty,
    clock,
  );
}

// ============================================================================
// WAR EXHAUSTION
// ============================================================================

export function initializeExhaustion(
  state: MilitaryState,
  dynastyId: string,
  clock: Clock,
): WarExhaustion | WarError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';

  const exhaustion: WarExhaustion = {
    dynastyId,
    level: 0,
    battlesEngaged: 0,
    casualtiesSuffered: 0,
    consecutiveLosses: 0,
    exhaustionRate: 2,
    updatedAt: clock.now(),
  };

  state.exhaustion.set(dynastyId, exhaustion);
  return exhaustion;
}

function incrementExhaustion(
  state: MilitaryState,
  dynastyId: string,
  casualties: number,
  isVictory: boolean,
  clock: Clock,
): void {
  let exhaustion = state.exhaustion.get(dynastyId);
  if (!exhaustion) {
    exhaustion = {
      dynastyId,
      level: 0,
      battlesEngaged: 0,
      casualtiesSuffered: 0,
      consecutiveLosses: 0,
      exhaustionRate: 2,
      updatedAt: clock.now(),
    };
  }

  exhaustion.battlesEngaged = exhaustion.battlesEngaged + 1;
  exhaustion.casualtiesSuffered = exhaustion.casualtiesSuffered + casualties;
  exhaustion.consecutiveLosses = isVictory ? 0 : exhaustion.consecutiveLosses + 1;

  const casualtyImpact = (casualties / 100) * 5;
  const lossImpact = exhaustion.consecutiveLosses * 3;
  const increment = exhaustion.exhaustionRate + casualtyImpact + lossImpact;

  exhaustion.level = Math.min(100, exhaustion.level + increment);
  exhaustion.updatedAt = clock.now();

  state.exhaustion.set(dynastyId, exhaustion);
}

export function computeExhaustion(
  state: MilitaryState,
  dynastyId: string,
): WarExhaustion | WarError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';
  const exhaustion = state.exhaustion.get(dynastyId);
  if (!exhaustion) return 'exhaustion-not-found';
  return exhaustion;
}

export function shouldSurrender(state: MilitaryState, dynastyId: string): boolean {
  const exhaustion = state.exhaustion.get(dynastyId);
  if (!exhaustion) return false;

  const force = state.forces.get(dynastyId);
  if (!force) return false;

  if (exhaustion.level >= 85) return true;
  if (exhaustion.consecutiveLosses >= 5 && force.morale < 20) return true;
  if (force.morale < 10 && exhaustion.level > 60) return true;

  return false;
}

export function surrender(
  state: MilitaryState,
  dynastyId: string,
  logger: Logger,
): 'surrendered' | WarError {
  const force = getForce(state, dynastyId);
  if (typeof force === 'string') return force;

  const msg = 'Dynasty ' + dynastyId + ' has surrendered';
  logger.error(msg);

  return 'surrendered';
}

// ============================================================================
// REPORTING
// ============================================================================

export function getMilitaryReport(
  state: MilitaryState,
  dynastyId: string,
  clock: Clock,
): MilitaryReport | WarError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';

  const force = getForce(state, dynastyId);
  if (typeof force === 'string') return force;

  const exhaustion = state.exhaustion.get(dynastyId) || {
    dynastyId,
    level: 0,
    battlesEngaged: 0,
    casualtiesSuffered: 0,
    consecutiveLosses: 0,
    exhaustionRate: 2,
    updatedAt: clock.now(),
  };

  const recentBattles: BattleOutcome[] = [];
  let winsLast10 = 0;
  let lossesLast10 = 0;

  for (const [id, outcome] of state.outcomes) {
    const order = state.orders.get(outcome.battleId);
    if (!order) continue;

    const involved = order.attackerDynasty === dynastyId || order.defenderDynasty === dynastyId;
    if (!involved) continue;

    recentBattles.push(outcome);
    if (recentBattles.length <= 10) {
      if (outcome.victor === dynastyId) {
        winsLast10 = winsLast10 + 1;
      } else {
        lossesLast10 = lossesLast10 + 1;
      }
    }
  }

  recentBattles.sort((a, b) => (a.recordedAt > b.recordedAt ? -1 : 1));
  const recent10 = recentBattles.slice(0, 10);

  return {
    dynastyId,
    force,
    exhaustion,
    recentBattles: recent10,
    winsLast10,
    lossesLast10,
    totalCasualties: exhaustion.casualtiesSuffered,
    generatedAt: clock.now(),
  };
}
