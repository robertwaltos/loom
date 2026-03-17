/**
 * Anti-Cheat Module — Server-authoritative violation detection and response.
 *
 * Extends input-validation.ts with:
 *   - Persistent violation ledger per player
 *   - Escalating response tiers (warn → kick → ban)
 *   - Action audit log for post-hoc review
 *   - Rate-limited action execution
 *
 * Thread: silk/launch-readiness
 * Tier: 1
 */

import type {
  InputValidationConfig,
  ViolationType,
} from './input-validation.js';

export { DEFAULT_VALIDATION_CONFIG } from './input-validation.js';

// ─── Types ───────────────────────────────────────────────────────

export type ActionResult = 'allowed' | 'rate_limited' | 'rejected';
export type PenaltyTier = 'warn' | 'kick' | 'ban';

export interface ViolationRecord {
  readonly playerId: string;
  readonly violationType: ViolationType;
  readonly detectedAt: string;
  readonly details: string;
  readonly severity: number;
}

export interface PlayerViolationSummary {
  readonly playerId: string;
  readonly totalViolations: number;
  readonly severityScore: number;
  readonly activePenalty: PenaltyTier | null;
  readonly bannedUntil: string | null;
  readonly lastViolation: string | null;
}

export interface AntiCheatConfig extends InputValidationConfig {
  readonly warnThreshold: number;
  readonly kickThreshold: number;
  readonly banThreshold: number;
  readonly banDurationMs: number;
  readonly auditLogMaxEntries: number;
}

export interface AntiCheatSystem {
  validateMove(
    playerId: string,
    position: { x: number; y: number; z: number },
    previousPosition: { x: number; y: number; z: number },
    deltaMs: number,
  ): ActionResult;
  validateAction(
    playerId: string,
    action: string,
    sequenceNumber: number,
  ): ActionResult;
  getSummary(playerId: string): PlayerViolationSummary;
  getAuditLog(playerId: string): readonly ViolationRecord[];
  clearPlayer(playerId: string): void;
  isBanned(playerId: string): boolean;
}

// ─── Constants ───────────────────────────────────────────────────

export const DEFAULT_ANTI_CHEAT_CONFIG: AntiCheatConfig = {
  maxSpeedUnitsPerSecond: 12.0,
  maxActionsPerSecond: 20,
  maxSequenceGap: 120,
  positionToleranceUnits: 2.0,
  teleportThresholdUnits: 100.0,
  warnThreshold: 3,
  kickThreshold: 7,
  banThreshold: 15,
  banDurationMs: 24 * 60 * 60 * 1000,
  auditLogMaxEntries: 200,
};

const VIOLATION_SEVERITY: Record<string, number> = {
  speed_hack: 5,
  teleport: 8,
  rapid_fire: 2,
  sequence_replay: 6,
  position_anomaly: 4,
  sequence_gap: 3,
  position_desync: 4,
};

// ─── Implementation ──────────────────────────────────────────────

interface PlayerState {
  violations: ViolationRecord[];
  severityScore: number;
  activePenalty: PenaltyTier | null;
  bannedUntil: number | null;
  actionSequences: Map<string, number>;
  lastActionTimes: Map<string, number>;
}

export function createAntiCheatSystem(
  config: Partial<AntiCheatConfig> = {},
): AntiCheatSystem {
  const cfg: AntiCheatConfig = { ...DEFAULT_ANTI_CHEAT_CONFIG, ...config };
  const players = new Map<string, PlayerState>();

  function getOrCreate(playerId: string): PlayerState {
    let state = players.get(playerId);
    if (!state) {
      state = {
        violations: [],
        severityScore: 0,
        activePenalty: null,
        bannedUntil: null,
        actionSequences: new Map(),
        lastActionTimes: new Map(),
      };
      players.set(playerId, state);
    }
    return state;
  }

  function recordViolation(
    state: PlayerState,
    playerId: string,
    violationType: ViolationType,
    details: string,
  ): ActionResult {
    const severity = VIOLATION_SEVERITY[violationType] ?? 1;
    const record: ViolationRecord = {
      playerId,
      violationType,
      detectedAt: new Date().toISOString(),
      details,
      severity,
    };

    state.violations.push(record);
    if (state.violations.length > cfg.auditLogMaxEntries) {
      state.violations.splice(0, state.violations.length - cfg.auditLogMaxEntries);
    }

    state.severityScore += severity;

    if (state.severityScore >= cfg.banThreshold) {
      state.activePenalty = 'ban';
      state.bannedUntil = Date.now() + cfg.banDurationMs;
    } else if (state.severityScore >= cfg.kickThreshold) {
      state.activePenalty = 'kick';
    } else if (state.severityScore >= cfg.warnThreshold) {
      state.activePenalty = 'warn';
    }

    return state.activePenalty === 'ban' ? 'rejected' : 'rate_limited';
  }

  function isCurrentlyBanned(state: PlayerState): boolean {
    if (state.activePenalty !== 'ban') return false;
    if (state.bannedUntil === null) return false;
    if (Date.now() > state.bannedUntil) {
      state.activePenalty = null;
      state.bannedUntil = null;
      state.severityScore = Math.max(0, state.severityScore - cfg.kickThreshold);
      return false;
    }
    return true;
  }

  return {
    validateMove(playerId, position, previousPosition, deltaMs) {
      const state = getOrCreate(playerId);
      if (isCurrentlyBanned(state)) return 'rejected';

      const dx = position.x - previousPosition.x;
      const dy = position.y - previousPosition.y;
      const dz = position.z - previousPosition.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > cfg.teleportThresholdUnits) {
        return recordViolation(
          state,
          playerId,
          'teleport',
          `dist=${dist.toFixed(1)} threshold=${cfg.teleportThresholdUnits}`,
        );
      }

      const deltaSeconds = deltaMs / 1000;
      if (deltaSeconds > 0) {
        const speed = dist / deltaSeconds;
        if (speed > cfg.maxSpeedUnitsPerSecond + cfg.positionToleranceUnits) {
          return recordViolation(
            state,
            playerId,
            'speed_hack',
            `speed=${speed.toFixed(1)} max=${cfg.maxSpeedUnitsPerSecond}`,
          );
        }
      }

      return 'allowed';
    },

    validateAction(playerId, action, sequenceNumber) {
      const state = getOrCreate(playerId);
      if (isCurrentlyBanned(state)) return 'rejected';

      const now = Date.now();
      const lastTime = state.lastActionTimes.get(action) ?? 0;
      const minIntervalMs = 1000 / cfg.maxActionsPerSecond;

      if (now - lastTime < minIntervalMs) {
        return recordViolation(
          state,
          playerId,
          'rapid_fire',
          `action=${action} interval=${now - lastTime}ms min=${minIntervalMs.toFixed(0)}ms`,
        );
      }

      const lastSeq = state.actionSequences.get(action) ?? -1;
      if (sequenceNumber <= lastSeq) {
        return recordViolation(
          state,
          playerId,
          'sequence_replay',
          `action=${action} seq=${sequenceNumber} lastSeq=${lastSeq}`,
        );
      }

      state.lastActionTimes.set(action, now);
      state.actionSequences.set(action, sequenceNumber);
      return 'allowed';
    },

    getSummary(playerId) {
      const state = players.get(playerId);
      if (!state) {
        return {
          playerId,
          totalViolations: 0,
          severityScore: 0,
          activePenalty: null,
          bannedUntil: null,
          lastViolation: null,
        };
      }
      isCurrentlyBanned(state);
      const last = state.violations[state.violations.length - 1];
      return {
        playerId,
        totalViolations: state.violations.length,
        severityScore: state.severityScore,
        activePenalty: state.activePenalty,
        bannedUntil: state.bannedUntil
          ? new Date(state.bannedUntil).toISOString()
          : null,
        lastViolation: last?.detectedAt ?? null,
      };
    },

    getAuditLog(playerId) {
      return players.get(playerId)?.violations ?? [];
    },

    clearPlayer(playerId) {
      players.delete(playerId);
    },

    isBanned(playerId) {
      const state = players.get(playerId);
      if (!state) return false;
      return isCurrentlyBanned(state);
    },
  };
}
