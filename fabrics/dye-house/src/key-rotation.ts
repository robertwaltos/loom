/**
 * key-rotation.ts — Encryption key lifecycle management.
 *
 * Tracks encryption keys through their lifecycle: active → rotated
 * → retired. Enforces rotation schedules, maintains key history,
 * and supports configurable rotation intervals.
 */

// ── Ports ────────────────────────────────────────────────────────

interface KeyRotationClock {
  readonly nowMicroseconds: () => number;
}

interface KeyRotationIdGenerator {
  readonly next: () => string;
}

interface KeyRotationDeps {
  readonly clock: KeyRotationClock;
  readonly idGenerator: KeyRotationIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type KeyStatus = 'active' | 'rotated' | 'retired';

interface ManagedKey {
  readonly keyId: string;
  readonly purpose: string;
  readonly createdAt: number;
  status: KeyStatus;
  rotatedAt: number | undefined;
  retiredAt: number | undefined;
}

interface RegisterKeyParams {
  readonly purpose: string;
}

interface KeyRotationConfig {
  readonly rotationIntervalMicro: number;
}

interface KeyRotationStats {
  readonly totalKeys: number;
  readonly activeKeys: number;
  readonly rotatedKeys: number;
  readonly retiredKeys: number;
}

interface KeyRotationService {
  readonly register: (params: RegisterKeyParams) => ManagedKey;
  readonly rotate: (keyId: string) => ManagedKey | undefined;
  readonly retire: (keyId: string) => boolean;
  readonly getKey: (keyId: string) => ManagedKey | undefined;
  readonly getActiveForPurpose: (purpose: string) => ManagedKey | undefined;
  readonly getDueForRotation: (config: KeyRotationConfig) => readonly ManagedKey[];
  readonly getStats: () => KeyRotationStats;
}

// ── State ────────────────────────────────────────────────────────

interface KeyRotationState {
  readonly deps: KeyRotationDeps;
  readonly keys: Map<string, ManagedKey>;
}

// ── Operations ───────────────────────────────────────────────────

function rotateImpl(state: KeyRotationState, keyId: string): ManagedKey | undefined {
  const key = state.keys.get(keyId);
  if (!key) return undefined;
  if (key.status !== 'active') return undefined;
  key.status = 'rotated';
  key.rotatedAt = state.deps.clock.nowMicroseconds();
  return { ...key };
}

function retireImpl(state: KeyRotationState, keyId: string): boolean {
  const key = state.keys.get(keyId);
  if (!key) return false;
  if (key.status === 'retired') return false;
  key.status = 'retired';
  key.retiredAt = state.deps.clock.nowMicroseconds();
  return true;
}

function getActiveForPurposeImpl(state: KeyRotationState, purpose: string): ManagedKey | undefined {
  for (const key of state.keys.values()) {
    if (key.purpose === purpose && key.status === 'active') return { ...key };
  }
  return undefined;
}

function getDueForRotationImpl(state: KeyRotationState, config: KeyRotationConfig): readonly ManagedKey[] {
  const now = state.deps.clock.nowMicroseconds();
  const due: ManagedKey[] = [];
  for (const key of state.keys.values()) {
    if (key.status === 'active' && now - key.createdAt >= config.rotationIntervalMicro) {
      due.push({ ...key });
    }
  }
  return due;
}

function getStatsImpl(state: KeyRotationState): KeyRotationStats {
  let active = 0;
  let rotated = 0;
  let retired = 0;
  for (const key of state.keys.values()) {
    if (key.status === 'active') active++;
    else if (key.status === 'rotated') rotated++;
    else retired++;
  }
  return { totalKeys: state.keys.size, activeKeys: active, rotatedKeys: rotated, retiredKeys: retired };
}

// ── Factory ──────────────────────────────────────────────────────

function createKeyRotationService(deps: KeyRotationDeps): KeyRotationService {
  const state: KeyRotationState = { deps, keys: new Map() };
  return {
    register: (p) => {
      const key: ManagedKey = {
        keyId: deps.idGenerator.next(),
        purpose: p.purpose,
        createdAt: deps.clock.nowMicroseconds(),
        status: 'active',
        rotatedAt: undefined,
        retiredAt: undefined,
      };
      state.keys.set(key.keyId, key);
      return { ...key };
    },
    rotate: (id) => rotateImpl(state, id),
    retire: (id) => retireImpl(state, id),
    getKey: (id) => { const k = state.keys.get(id); return k ? { ...k } : undefined; },
    getActiveForPurpose: (p) => getActiveForPurposeImpl(state, p),
    getDueForRotation: (c) => getDueForRotationImpl(state, c),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createKeyRotationService };
export type {
  KeyRotationService,
  KeyRotationDeps,
  KeyStatus,
  ManagedKey,
  RegisterKeyParams as KeyRegisterParams,
  KeyRotationConfig,
  KeyRotationStats,
};
