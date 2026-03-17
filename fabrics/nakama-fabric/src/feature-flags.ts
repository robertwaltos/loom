/**
 * Feature Flag Engine — runtime flag evaluation with rollout, allow/deny lists, and overrides.
 *
 * Precedence (highest → lowest):
 *   runtime override > denyList > allowList > rollout percentage
 */

export type FlagValue = boolean | string | number;

export interface FlagDefinition<T extends FlagValue = boolean> {
  readonly name: string;
  readonly defaultValue: T;
  readonly description: string;
  /** 0–100 percentage rollout. 100 = full rollout. Defaults to 0 (off). */
  readonly rolloutPct?: number;
  /** Explicit allow-list of playerIds — always enabled for these. */
  readonly allowList?: ReadonlyArray<string>;
  /** Explicit deny-list — always disabled for these. */
  readonly denyList?: ReadonlyArray<string>;
}

export interface FeatureFlagEngine {
  /** Register a flag definition (idempotent). */
  define<T extends FlagValue>(def: FlagDefinition<T>): void;
  /** Check if flag is enabled for a player (boolean flags only). */
  isEnabled(flagName: string, playerId: string): boolean;
  /** Get flag value for a player. Returns defaultValue when active, fallback otherwise. */
  getValue<T extends FlagValue>(flagName: string, playerId: string, fallback: T): T;
  /** Override a flag at runtime (ops use — e.g. kill switch). */
  override(flagName: string, enabled: boolean): void;
  /** Remove a runtime override. */
  clearOverride(flagName: string): void;
  /** List all defined flags with their current effective state. */
  listFlags(): ReadonlyArray<{ name: string; enabled: boolean; rolloutPct: number }>;
}

/** djb2 hash — deterministic 0–99 bucket for a (playerId, flagName) pair. */
function djb2Hash(playerId: string, flagName: string): number {
  const str = `${playerId}:${flagName}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0) % 100;
}

export function createFeatureFlagEngine(
  deps?: { hashFn?: (playerId: string, flagName: string) => number },
): FeatureFlagEngine {
  const flags = new Map<string, FlagDefinition<FlagValue>>();
  const overrides = new Map<string, boolean>();
  const hashFn = deps?.hashFn ?? djb2Hash;

  function isActive(flagName: string, playerId: string): boolean {
    const overrideVal = overrides.get(flagName);
    if (overrideVal !== undefined) return overrideVal;

    const def = flags.get(flagName);
    if (def === undefined) return false;

    if (def.denyList?.includes(playerId) === true) return false;
    if (def.allowList?.includes(playerId) === true) return true;

    const rollout = def.rolloutPct ?? 0;
    return hashFn(playerId, flagName) < rollout;
  }

  return {
    define<T extends FlagValue>(def: FlagDefinition<T>): void {
      if (!flags.has(def.name)) {
        flags.set(def.name, def);
      }
    },

    isEnabled(flagName: string, playerId: string): boolean {
      return isActive(flagName, playerId);
    },

    getValue<T extends FlagValue>(flagName: string, playerId: string, fallback: T): T {
      const def = flags.get(flagName);
      if (def === undefined) return fallback;
      if (!isActive(flagName, playerId)) return fallback;
      const v = def.defaultValue;
      return (typeof v === typeof fallback ? v : fallback) as T;
    },

    override(flagName: string, enabled: boolean): void {
      overrides.set(flagName, enabled);
    },

    clearOverride(flagName: string): void {
      overrides.delete(flagName);
    },

    listFlags(): ReadonlyArray<{ name: string; enabled: boolean; rolloutPct: number }> {
      return Array.from(flags.values()).map(def => {
        const ov = overrides.get(def.name);
        const enabled = ov !== undefined ? ov : (def.rolloutPct ?? 0) === 100;
        return { name: def.name, enabled, rolloutPct: def.rolloutPct ?? 0 };
      });
    },
  };
}
