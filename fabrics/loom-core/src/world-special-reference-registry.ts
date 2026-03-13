/**
 * World Special Reference Registry
 *
 * Source-backed non-world identifiers that intentionally appear across
 * loom-core registries. These references are valid domain concepts, but they
 * are not part of the numbered 50-world atlas and must not be conflated with
 * either rename-style aliases or unknown drift.
 */

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_SPECIAL_REFERENCES = 4;

// ── Types ────────────────────────────────────────────────────────

export type WorldSpecialReferenceKind =
  | 'special-space'
  | 'network-space'
  | 'scope-selector';

export interface WorldSpecialReference {
  readonly referenceId: string;
  readonly referenceName: string;
  readonly kind: WorldSpecialReferenceKind;
  readonly evidence: string;
}

export interface WorldSpecialReferenceRegistryPort {
  readonly totalReferences: number;
  getAllReferences(): ReadonlyArray<WorldSpecialReference>;
  getReference(referenceId: string): WorldSpecialReference | undefined;
  isSpecialReference(referenceId: string): boolean;
}

// ── Source-Backed Special References ─────────────────────────────

export const WORLD_SPECIAL_REFERENCES: ReadonlyArray<WorldSpecialReference> = [
  {
    referenceId: 'forgetting-well',
    referenceName: 'The Forgetting Well',
    kind: 'special-space',
    evidence:
      'Expansion Bible v5 Part 5 defines the Forgetting Well as a Chapter 4 hidden space accessed through the Threadways, not a numbered world.',
  },
  {
    referenceId: 'threadway-network',
    referenceName: 'The Threadway Network',
    kind: 'network-space',
    evidence:
      'Expansion Bible v5 Part 1 defines the Threadway Network as the connective traversal fabric between worlds rather than one of the 50 worlds.',
  },
  {
    referenceId: 'all-worlds',
    referenceName: 'All Worlds',
    kind: 'scope-selector',
    evidence:
      'Expansion Bible v5 uses all-world scope language for cross-world entities and artifacts that belong to no single numbered world.',
  },
  {
    referenceId: 'any-threadway',
    referenceName: 'Any Threadway',
    kind: 'scope-selector',
    evidence:
      'Expansion Bible v5 describes hidden access that can occur from any Threadway, making this a traversal scope selector rather than a world ID.',
  },
];

const SPECIAL_REFERENCE_BY_ID = new Map(
  WORLD_SPECIAL_REFERENCES.map((reference) => [reference.referenceId, reference]),
);

// ── Public Registry ─────────────────────────────────────────────

export function createWorldSpecialReferenceRegistry(): WorldSpecialReferenceRegistryPort {
  return {
    totalReferences: TOTAL_WORLD_SPECIAL_REFERENCES,

    getAllReferences(): ReadonlyArray<WorldSpecialReference> {
      return WORLD_SPECIAL_REFERENCES;
    },

    getReference(referenceId: string): WorldSpecialReference | undefined {
      return SPECIAL_REFERENCE_BY_ID.get(referenceId);
    },

    isSpecialReference(referenceId: string): boolean {
      return SPECIAL_REFERENCE_BY_ID.has(referenceId);
    },
  };
}

export const WORLD_SPECIAL_REFERENCE_REGISTRY =
  createWorldSpecialReferenceRegistry();