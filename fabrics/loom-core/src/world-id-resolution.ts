/**
 * World ID Resolution
 *
 * Canonical resolution layer between the current 50-world atlas and legacy
 * world IDs that still appear in older registries. Only explicit, source-
 * backed renames are auto-resolved. Special spaces and ambiguous legacy IDs
 * remain unresolved on purpose.
 */

import {
  WORLD_DESIGN_ATLAS,
  type WorldDesignProfile,
} from './world-design-atlas.js';

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_CANONICAL_WORLD_IDS = 50;
export const TOTAL_RESOLVED_WORLD_ID_ALIASES = 3;
export const TOTAL_UNRESOLVED_LEGACY_WORLD_IDS = 3;

// ── Types ────────────────────────────────────────────────────────

export type WorldIdResolutionStatus =
  | 'canonical'
  | 'resolved-alias'
  | 'unresolved-legacy';

export type LegacyWorldIdDisposition =
  | 'canonical-rename'
  | 'special-space'
  | 'unmapped-legacy';

export interface ResolvedWorldIdAlias {
  readonly legacyWorldId: string;
  readonly canonicalWorldId: string;
  readonly canonicalWorldName: string;
  readonly disposition: 'canonical-rename';
  readonly evidence: string;
}

export interface UnresolvedLegacyWorldId {
  readonly legacyWorldId: string;
  readonly disposition: 'special-space' | 'unmapped-legacy';
  readonly evidence: string;
}

export interface WorldIdResolution {
  readonly inputWorldId: string;
  readonly status: WorldIdResolutionStatus;
  readonly canonicalWorldId?: string;
  readonly canonicalWorldName?: string;
  readonly guideId?: string;
  readonly disposition?: LegacyWorldIdDisposition;
  readonly evidence: string;
}

export interface WorldIdResolutionPort {
  readonly totalCanonicalWorldIds: number;
  readonly totalResolvedAliases: number;
  readonly totalUnresolvedLegacyIds: number;
  resolve(worldId: string): WorldIdResolution | undefined;
  getCanonicalWorldId(worldId: string): string | undefined;
  isCanonicalWorldId(worldId: string): boolean;
  getResolvedAliases(): ReadonlyArray<ResolvedWorldIdAlias>;
  getUnresolvedLegacyWorldIds(): ReadonlyArray<UnresolvedLegacyWorldId>;
  getAliasesForCanonicalWorld(
    canonicalWorldId: string,
  ): ReadonlyArray<ResolvedWorldIdAlias>;
}

// ── Canonical World Atlas ───────────────────────────────────────

const CANONICAL_WORLDS = WORLD_DESIGN_ATLAS;

const CANONICAL_WORLD_BY_ID = new Map<string, WorldDesignProfile>(
  CANONICAL_WORLDS.map((profile) => [profile.worldId, profile]),
);

// ── Source-Defensible Alias Data ────────────────────────────────

const RESOLVED_ALIAS_SEEDS = [
  {
    legacyWorldId: 'meadow-laboratory',
    canonicalWorldId: 'meadow-lab',
    disposition: 'canonical-rename' as const,
    evidence:
      'Expansion Bible v5 WORLD 4 is "The Meadow Lab" while older registries preserve the longer "meadow-laboratory" form.',
  },
  {
    legacyWorldId: 'entrepreneurs-workshop',
    canonicalWorldId: 'entrepreneur-workshop',
    disposition: 'canonical-rename' as const,
    evidence:
      'Expansion Bible v5 WORLD 34 is "The Entrepreneur\'s Workshop" while older registries keep the pluralized "entrepreneurs-workshop" ID.',
  },
  {
    legacyWorldId: 'tax-office-tower',
    canonicalWorldId: 'tax-office',
    disposition: 'canonical-rename' as const,
    evidence:
      'Expansion Bible v5 WORLD 42 is "The Tax Office" while older registries still use the more specific "tax-office-tower" label.',
  },
] as const;

export const RESOLVED_WORLD_ID_ALIASES: ReadonlyArray<ResolvedWorldIdAlias> =
  RESOLVED_ALIAS_SEEDS.map((alias) => {
    const canonicalWorld = CANONICAL_WORLD_BY_ID.get(alias.canonicalWorldId);

    if (!canonicalWorld) {
      throw new Error(
        `Resolved world ID alias targets unknown canonical world ${alias.canonicalWorldId}.`,
      );
    }

    return {
      legacyWorldId: alias.legacyWorldId,
      canonicalWorldId: alias.canonicalWorldId,
      canonicalWorldName: canonicalWorld.worldName,
      disposition: alias.disposition,
      evidence: alias.evidence,
    };
  });

export const UNRESOLVED_LEGACY_WORLD_IDS: ReadonlyArray<UnresolvedLegacyWorldId> = [
  {
    legacyWorldId: 'forgetting-well',
    disposition: 'special-space',
    evidence:
      'Expansion Bible v5 Part 5 defines the Forgetting Well as a Chapter 4 hidden space accessible from any Threadway, not one of the numbered 50 worlds.',
  },
  {
    legacyWorldId: 'threadway-network',
    disposition: 'special-space',
    evidence:
      'Expansion Bible v5 Part 1 defines the Threadway Network as the inter-world traversal fabric, not a numbered world in the 50-world atlas.',
  },
  {
    legacyWorldId: 'science-lab',
    disposition: 'unmapped-legacy',
    evidence:
      'No current numbered world named "Science Lab" appears in Expansion Bible v5; the current STEM atlas distributes that older concept across multiple worlds.',
  },
];

const RESOLVED_ALIAS_BY_LEGACY_ID = new Map(
  RESOLVED_WORLD_ID_ALIASES.map((alias) => [alias.legacyWorldId, alias]),
);

const UNRESOLVED_LEGACY_ID_BY_ID = new Map(
  UNRESOLVED_LEGACY_WORLD_IDS.map((alias) => [alias.legacyWorldId, alias]),
);

const ALIASES_BY_CANONICAL_WORLD_ID = new Map<string, ReadonlyArray<ResolvedWorldIdAlias>>(
  [...CANONICAL_WORLD_BY_ID.keys()].map((worldId) => [worldId, []]),
);

for (const alias of RESOLVED_WORLD_ID_ALIASES) {
  ALIASES_BY_CANONICAL_WORLD_ID.set(alias.canonicalWorldId, [
    ...(ALIASES_BY_CANONICAL_WORLD_ID.get(alias.canonicalWorldId) ?? []),
    alias,
  ]);
}

// ── Helpers ─────────────────────────────────────────────────────

function createCanonicalResolution(
  profile: WorldDesignProfile,
  inputWorldId: string,
): WorldIdResolution {
  return {
    inputWorldId,
    status: 'canonical',
    canonicalWorldId: profile.worldId,
    canonicalWorldName: profile.worldName,
    guideId: profile.guideId,
    evidence: 'Input already matches a canonical world ID in the 50-world atlas.',
  };
}

function createResolvedAliasResolution(
  inputWorldId: string,
  alias: ResolvedWorldIdAlias,
): WorldIdResolution {
  const canonicalWorld = CANONICAL_WORLD_BY_ID.get(alias.canonicalWorldId);

  if (!canonicalWorld) {
    throw new Error(
      `Resolved alias ${alias.legacyWorldId} points to missing canonical world ${alias.canonicalWorldId}.`,
    );
  }

  return {
    inputWorldId,
    status: 'resolved-alias',
    canonicalWorldId: canonicalWorld.worldId,
    canonicalWorldName: canonicalWorld.worldName,
    guideId: canonicalWorld.guideId,
    disposition: alias.disposition,
    evidence: alias.evidence,
  };
}

function createUnresolvedLegacyResolution(
  inputWorldId: string,
  unresolved: UnresolvedLegacyWorldId,
): WorldIdResolution {
  return {
    inputWorldId,
    status: 'unresolved-legacy',
    disposition: unresolved.disposition,
    evidence: unresolved.evidence,
  };
}

// ── Public Registry ─────────────────────────────────────────────

export function createWorldIdResolution(): WorldIdResolutionPort {
  return {
    totalCanonicalWorldIds: TOTAL_CANONICAL_WORLD_IDS,
    totalResolvedAliases: TOTAL_RESOLVED_WORLD_ID_ALIASES,
    totalUnresolvedLegacyIds: TOTAL_UNRESOLVED_LEGACY_WORLD_IDS,

    resolve(worldId: string): WorldIdResolution | undefined {
      const canonicalWorld = CANONICAL_WORLD_BY_ID.get(worldId);

      if (canonicalWorld) {
        return createCanonicalResolution(canonicalWorld, worldId);
      }

      const resolvedAlias = RESOLVED_ALIAS_BY_LEGACY_ID.get(worldId);

      if (resolvedAlias) {
        return createResolvedAliasResolution(worldId, resolvedAlias);
      }

      const unresolvedLegacy = UNRESOLVED_LEGACY_ID_BY_ID.get(worldId);

      if (unresolvedLegacy) {
        return createUnresolvedLegacyResolution(worldId, unresolvedLegacy);
      }

      return undefined;
    },

    getCanonicalWorldId(worldId: string): string | undefined {
      return this.resolve(worldId)?.canonicalWorldId;
    },

    isCanonicalWorldId(worldId: string): boolean {
      return CANONICAL_WORLD_BY_ID.has(worldId);
    },

    getResolvedAliases(): ReadonlyArray<ResolvedWorldIdAlias> {
      return RESOLVED_WORLD_ID_ALIASES;
    },

    getUnresolvedLegacyWorldIds(): ReadonlyArray<UnresolvedLegacyWorldId> {
      return UNRESOLVED_LEGACY_WORLD_IDS;
    },

    getAliasesForCanonicalWorld(
      canonicalWorldId: string,
    ): ReadonlyArray<ResolvedWorldIdAlias> {
      return ALIASES_BY_CANONICAL_WORLD_ID.get(canonicalWorldId) ?? [];
    },
  };
}

export const WORLD_ID_RESOLUTION = createWorldIdResolution();