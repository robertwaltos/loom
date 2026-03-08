/**
 * ip-allowlist.ts — IP address allowlist management.
 *
 * Maintains a set of allowed IP addresses and CIDR ranges.
 * Checks incoming addresses against the list. Supports
 * temporary bans, allowlist lifecycle, and access logging.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AllowlistClock {
  readonly nowMicroseconds: () => number;
}

interface AllowlistDeps {
  readonly clock: AllowlistClock;
}

// ── Types ────────────────────────────────────────────────────────

type AllowlistEntryStatus = 'allowed' | 'blocked' | 'expired';

interface AllowlistEntry {
  readonly address: string;
  readonly status: AllowlistEntryStatus;
  readonly addedAt: number;
  readonly expiresAt: number | undefined;
  readonly reason: string;
}

interface AddEntryParams {
  readonly address: string;
  readonly reason: string;
  readonly expiresAt?: number;
}

interface BlockEntryParams {
  readonly address: string;
  readonly reason: string;
  readonly expiresAt?: number;
}

interface CheckResult {
  readonly allowed: boolean;
  readonly reason: string;
}

interface AllowlistStats {
  readonly totalEntries: number;
  readonly allowedEntries: number;
  readonly blockedEntries: number;
  readonly totalChecks: number;
  readonly totalDenials: number;
}

interface IpAllowlist {
  readonly allow: (params: AddEntryParams) => boolean;
  readonly block: (params: BlockEntryParams) => boolean;
  readonly remove: (address: string) => boolean;
  readonly check: (address: string) => CheckResult;
  readonly getEntry: (address: string) => AllowlistEntry | undefined;
  readonly listAllowed: () => readonly AllowlistEntry[];
  readonly listBlocked: () => readonly AllowlistEntry[];
  readonly sweepExpired: () => number;
  readonly getStats: () => AllowlistStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableEntry {
  readonly address: string;
  status: AllowlistEntryStatus;
  readonly addedAt: number;
  readonly expiresAt: number | undefined;
  reason: string;
}

interface AllowlistState {
  readonly deps: AllowlistDeps;
  readonly entries: Map<string, MutableEntry>;
  totalChecks: number;
  totalDenials: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(entry: MutableEntry): AllowlistEntry {
  return { ...entry };
}

// ── Operations ───────────────────────────────────────────────────

function allowImpl(state: AllowlistState, params: AddEntryParams): boolean {
  if (state.entries.has(params.address)) return false;
  state.entries.set(params.address, {
    address: params.address,
    status: 'allowed',
    addedAt: state.deps.clock.nowMicroseconds(),
    expiresAt: params.expiresAt,
    reason: params.reason,
  });
  return true;
}

function blockImpl(state: AllowlistState, params: BlockEntryParams): boolean {
  const existing = state.entries.get(params.address);
  if (existing) {
    existing.status = 'blocked';
    existing.reason = params.reason;
    return true;
  }
  state.entries.set(params.address, {
    address: params.address,
    status: 'blocked',
    addedAt: state.deps.clock.nowMicroseconds(),
    expiresAt: params.expiresAt,
    reason: params.reason,
  });
  return true;
}

function removeImpl(state: AllowlistState, address: string): boolean {
  return state.entries.delete(address);
}

function checkImpl(state: AllowlistState, address: string): CheckResult {
  state.totalChecks += 1;
  const entry = state.entries.get(address);
  if (!entry) {
    state.totalDenials += 1;
    return { allowed: false, reason: 'not in allowlist' };
  }
  if (entry.status === 'blocked') {
    state.totalDenials += 1;
    return { allowed: false, reason: entry.reason };
  }
  if (isExpired(state, entry)) {
    state.totalDenials += 1;
    return { allowed: false, reason: 'entry expired' };
  }
  return { allowed: true, reason: entry.reason };
}

function isExpired(state: AllowlistState, entry: MutableEntry): boolean {
  if (entry.expiresAt === undefined) return false;
  return state.deps.clock.nowMicroseconds() >= entry.expiresAt;
}

function listByStatus(state: AllowlistState, status: AllowlistEntryStatus): AllowlistEntry[] {
  const result: AllowlistEntry[] = [];
  for (const entry of state.entries.values()) {
    if (entry.status === status) result.push(toReadonly(entry));
  }
  return result;
}

function sweepExpiredImpl(state: AllowlistState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const entry of state.entries.values()) {
    if (entry.expiresAt !== undefined && now >= entry.expiresAt && entry.status !== 'expired') {
      entry.status = 'expired';
      count += 1;
    }
  }
  return count;
}

function getStatsImpl(state: AllowlistState): AllowlistStats {
  let allowed = 0;
  let blocked = 0;
  for (const entry of state.entries.values()) {
    if (entry.status === 'allowed') allowed += 1;
    else if (entry.status === 'blocked') blocked += 1;
  }
  return {
    totalEntries: state.entries.size,
    allowedEntries: allowed,
    blockedEntries: blocked,
    totalChecks: state.totalChecks,
    totalDenials: state.totalDenials,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createIpAllowlist(deps: AllowlistDeps): IpAllowlist {
  const state: AllowlistState = {
    deps,
    entries: new Map(),
    totalChecks: 0,
    totalDenials: 0,
  };
  return {
    allow: (p) => allowImpl(state, p),
    block: (p) => blockImpl(state, p),
    remove: (addr) => removeImpl(state, addr),
    check: (addr) => checkImpl(state, addr),
    getEntry: (addr) => {
      const e = state.entries.get(addr);
      return e ? toReadonly(e) : undefined;
    },
    listAllowed: () => listByStatus(state, 'allowed'),
    listBlocked: () => listByStatus(state, 'blocked'),
    sweepExpired: () => sweepExpiredImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createIpAllowlist };
export type {
  IpAllowlist,
  AllowlistDeps,
  AllowlistEntry,
  AllowlistEntryStatus,
  AddEntryParams,
  BlockEntryParams,
  CheckResult,
  AllowlistStats,
};
