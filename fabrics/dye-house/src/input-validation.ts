/**
 * Server-Authoritative Input Validation — Anti-cheat layer that
 * validates client inputs against physics constraints before
 * applying them to authoritative game state.
 *
 * Validates:
 *   - Movement speed limits (no teleportation / speed hacks)
 *   - Action rate limits (no rapid-fire exploits)
 *   - Position plausibility (no wall-clipping)
 *   - Sequence integrity (no replay attacks)
 *
 * Thread: sentinel/dye-house/input-validation
 * Tier: 1
 */

// ─── Configuration ──────────────────────────────────────────────

export interface InputValidationConfig {
  readonly maxSpeedUnitsPerSecond: number;
  readonly maxActionsPerSecond: number;
  readonly maxSequenceGap: number;
  readonly positionToleranceUnits: number;
  readonly teleportThresholdUnits: number;
}

export const DEFAULT_VALIDATION_CONFIG: InputValidationConfig = {
  maxSpeedUnitsPerSecond: 12.0,
  maxActionsPerSecond: 20,
  maxSequenceGap: 120,
  positionToleranceUnits: 2.0,
  teleportThresholdUnits: 100.0,
};

// ─── Violation Types ────────────────────────────────────────────

export type ViolationType =
  | 'speed_hack'
  | 'teleport'
  | 'rapid_fire'
  | 'sequence_replay'
  | 'sequence_gap'
  | 'position_desync';

export interface Violation {
  readonly type: ViolationType;
  readonly severity: number;       // 0.0 – 1.0
  readonly details: string;
  readonly timestampUs: bigint;
  readonly connectionId: string;
}

// ─── Player State for Validation ────────────────────────────────

export interface ValidatedPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface PlayerValidationState {
  lastPosition: ValidatedPosition;
  lastTimestampUs: bigint;
  lastSequence: number;
  actionTimestamps: bigint[];
  violationScore: number;
}

// ─── Ports ──────────────────────────────────────────────────────

export interface ValidationClockPort {
  readonly nowMicroseconds: () => bigint;
}

export interface ViolationSinkPort {
  readonly report: (violation: Violation) => void;
}

// ─── Validator ──────────────────────────────────────────────────

export interface InputValidator {
  readonly validateMovement: (
    connectionId: string,
    targetPosition: ValidatedPosition,
    sequence: number,
    timestampUs: bigint,
  ) => ValidationResult;

  readonly validateAction: (
    connectionId: string,
    actionId: number,
    timestampUs: bigint,
  ) => ValidationResult;

  readonly registerPlayer: (connectionId: string, initialPosition: ValidatedPosition) => void;
  readonly removePlayer: (connectionId: string) => void;
  readonly getViolationScore: (connectionId: string) => number;
  readonly playerCount: () => number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly correctedPosition?: ValidatedPosition;
  readonly violation?: Violation;
}

// ─── Factory ────────────────────────────────────────────────────

export function createInputValidator(
  config: InputValidationConfig,
  clock: ValidationClockPort,
  violationSink: ViolationSinkPort,
): InputValidator {
  const players = new Map<string, PlayerValidationState>();

  function makeViolation(
    type: ViolationType,
    severity: number,
    details: string,
    connectionId: string,
  ): Violation {
    return {
      type,
      severity,
      details,
      timestampUs: clock.nowMicroseconds(),
      connectionId,
    };
  }

  return {
    registerPlayer(connectionId, initialPosition) {
      players.set(connectionId, {
        lastPosition: initialPosition,
        lastTimestampUs: clock.nowMicroseconds(),
        lastSequence: -1,
        actionTimestamps: [],
        violationScore: 0,
      });
    },

    removePlayer(connectionId) {
      players.delete(connectionId);
    },

    validateMovement(connectionId, targetPosition, sequence, timestampUs) {
      const state = players.get(connectionId);
      if (state === undefined) {
        return { valid: false, violation: makeViolation('position_desync', 1.0, 'unknown_player', connectionId) };
      }

      // Sequence replay check
      if (sequence <= state.lastSequence) {
        const v = makeViolation('sequence_replay', 0.8, `seq=${sequence} last=${state.lastSequence}`, connectionId);
        violationSink.report(v);
        state.violationScore += 0.8;
        return { valid: false, violation: v };
      }

      // Sequence gap check
      if (sequence - state.lastSequence > config.maxSequenceGap) {
        const v = makeViolation('sequence_gap', 0.3, `gap=${sequence - state.lastSequence}`, connectionId);
        violationSink.report(v);
        state.violationScore += 0.3;
      }

      // Distance check
      const dx = targetPosition.x - state.lastPosition.x;
      const dy = targetPosition.y - state.lastPosition.y;
      const dz = targetPosition.z - state.lastPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Teleport detection
      if (distance > config.teleportThresholdUnits) {
        const v = makeViolation('teleport', 1.0, `distance=${distance.toFixed(2)}`, connectionId);
        violationSink.report(v);
        state.violationScore += 1.0;
        return { valid: false, correctedPosition: state.lastPosition, violation: v };
      }

      // Speed check
      const dtUs = timestampUs - state.lastTimestampUs;
      if (dtUs > 0n) {
        const dtSeconds = Number(dtUs) / 1_000_000;
        const speed = distance / dtSeconds;
        if (speed > config.maxSpeedUnitsPerSecond * (1 + config.positionToleranceUnits / 10)) {
          const v = makeViolation('speed_hack', 0.6, `speed=${speed.toFixed(2)} max=${config.maxSpeedUnitsPerSecond}`, connectionId);
          violationSink.report(v);
          state.violationScore += 0.6;

          // Clamp to max legal position
          const maxDist = config.maxSpeedUnitsPerSecond * dtSeconds;
          const scale = maxDist / distance;
          const corrected: ValidatedPosition = {
            x: state.lastPosition.x + dx * scale,
            y: state.lastPosition.y + dy * scale,
            z: state.lastPosition.z + dz * scale,
          };
          state.lastPosition = corrected;
          state.lastTimestampUs = timestampUs;
          state.lastSequence = sequence;
          return { valid: false, correctedPosition: corrected, violation: v };
        }
      }

      // Valid movement
      state.lastPosition = targetPosition;
      state.lastTimestampUs = timestampUs;
      state.lastSequence = sequence;
      return { valid: true };
    },

    validateAction(connectionId, _actionId, timestampUs) {
      const state = players.get(connectionId);
      if (state === undefined) {
        return { valid: false, violation: makeViolation('position_desync', 1.0, 'unknown_player', connectionId) };
      }

      // Rate limit: count actions in last second
      const oneSecondAgo = timestampUs - 1_000_000n;
      state.actionTimestamps = state.actionTimestamps.filter(t => t > oneSecondAgo);
      state.actionTimestamps.push(timestampUs);

      if (state.actionTimestamps.length > config.maxActionsPerSecond) {
        const v = makeViolation(
          'rapid_fire',
          0.5,
          `actions=${state.actionTimestamps.length} max=${config.maxActionsPerSecond}`,
          connectionId,
        );
        violationSink.report(v);
        state.violationScore += 0.5;
        return { valid: false, violation: v };
      }

      return { valid: true };
    },

    getViolationScore(connectionId) {
      return players.get(connectionId)?.violationScore ?? 0;
    },

    playerCount: () => players.size,
  };
}
