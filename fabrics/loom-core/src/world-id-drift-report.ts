/**
 * World ID Drift Report
 *
 * Cross-registry audit of world ID references within loom-core. This read
 * model classifies each reference as canonical, alias-resolved, special
 * reference, unresolved legacy, or untracked noncanonical so downstream
 * cleanup work can be planned from measured drift instead of ad hoc searches.
 */

import { CHARACTER_DOSSIERS } from './character-dossiers.js';
import { createCurriculumMap } from './curriculum-map.js';
import { ENCYCLOPEDIA_ENTRIES } from './encyclopedia-entries.js';
import { createHiddenZones } from './hidden-zones.js';
import { CHARACTER_RELATIONSHIPS } from './npc-relationship-registry.js';
import { createQuestChains } from './quest-chains.js';
import {
  WORLD_ID_RESOLUTION,
  type WorldIdResolutionPort,
} from './world-id-resolution.js';
import {
  WORLD_SPECIAL_REFERENCE_REGISTRY,
  type WorldSpecialReferenceKind,
  type WorldSpecialReferenceRegistryPort,
} from './world-special-reference-registry.js';
import { createThreadwayNetwork } from './threadway-network.js';

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_ID_DRIFT_REGISTRIES = 7;

// ── Types ────────────────────────────────────────────────────────

export type WorldIdDriftRegistryId =
  | 'character-dossiers'
  | 'curriculum-map'
  | 'encyclopedia-entries'
  | 'npc-relationship-registry'
  | 'quest-chains'
  | 'threadway-network'
  | 'hidden-zones';

export type WorldIdDriftStatus =
  | 'canonical'
  | 'resolved-alias'
  | 'special-reference'
  | 'unresolved-legacy'
  | 'untracked-noncanonical';

export interface WorldIdDriftReference {
  readonly registryId: WorldIdDriftRegistryId;
  readonly recordId: string;
  readonly fieldPath: string;
  readonly referencedWorldId: string;
  readonly status: WorldIdDriftStatus;
  readonly specialReferenceKind?: WorldSpecialReferenceKind;
  readonly canonicalWorldId?: string;
  readonly canonicalWorldName?: string;
  readonly guideId?: string;
  readonly evidence: string;
}

export interface RegistryWorldIdDriftProfile {
  readonly registryId: WorldIdDriftRegistryId;
  readonly totalReferences: number;
  readonly canonicalReferences: number;
  readonly resolvedAliasReferences: number;
  readonly specialReferenceReferences: number;
  readonly unresolvedLegacyReferences: number;
  readonly untrackedNoncanonicalReferences: number;
  readonly uniqueNoncanonicalWorldIds: ReadonlyArray<string>;
}

export interface WorldIdDriftReportPort {
  readonly totalRegistries: number;
  readonly totalReferences: number;
  getRegistryProfiles(): ReadonlyArray<RegistryWorldIdDriftProfile>;
  getRegistryProfile(
    registryId: WorldIdDriftRegistryId,
  ): RegistryWorldIdDriftProfile | undefined;
  allReferences(): ReadonlyArray<WorldIdDriftReference>;
  getNoncanonicalReferences(): ReadonlyArray<WorldIdDriftReference>;
  getReferencesForWorldId(worldId: string): ReadonlyArray<WorldIdDriftReference>;
  getUntrackedWorldIds(): ReadonlyArray<string>;
  getRegistriesWithNoncanonicalReferences(): ReadonlyArray<RegistryWorldIdDriftProfile>;
}

interface ReferenceSeed {
  readonly registryId: WorldIdDriftRegistryId;
  readonly recordId: string;
  readonly fieldPath: string;
  readonly referencedWorldId: string;
}

// ── Extraction ───────────────────────────────────────────────────

function extractReferenceSeeds(): ReadonlyArray<ReferenceSeed> {
  const curriculum = createCurriculumMap();
  const quests = createQuestChains();
  const threadways = createThreadwayNetwork();
  const hiddenZones = createHiddenZones();

  const curriculumSeeds: ReadonlyArray<ReferenceSeed> = [
    ...curriculum.getSTEMAlignments().map((alignment) => ({
      registryId: 'curriculum-map' as const,
      recordId: alignment.worldName,
      fieldPath: 'stem.worldId',
      referencedWorldId: alignment.worldId,
    })),
    ...curriculum.getLanguageArtsAlignments().map((alignment) => ({
      registryId: 'curriculum-map' as const,
      recordId: alignment.worldName,
      fieldPath: 'languageArts.worldId',
      referencedWorldId: alignment.worldId,
    })),
    ...curriculum.getFinancialAlignments().map((alignment) => ({
      registryId: 'curriculum-map' as const,
      recordId: alignment.worldName,
      fieldPath: 'financial.worldId',
      referencedWorldId: alignment.worldId,
    })),
    ...curriculum.getCrossCurricularHighlights().map((highlight) => ({
      registryId: 'curriculum-map' as const,
      recordId: highlight.entryName,
      fieldPath: 'crossCurricular.worldId',
      referencedWorldId: highlight.worldId,
    })),
  ];

  const questSeeds = quests.getAllQuests().flatMap((quest) => [
    ...quest.worldIds.map((worldId, index) => ({
      registryId: 'quest-chains' as const,
      recordId: quest.questId,
      fieldPath: `worldIds[${index}]`,
      referencedWorldId: worldId,
    })),
    ...quest.steps.map((step) => ({
      registryId: 'quest-chains' as const,
      recordId: quest.questId,
      fieldPath: `steps[${step.stepIndex}].worldId`,
      referencedWorldId: step.worldId,
    })),
  ]);

  const threadwaySeeds = threadways.getAllThreadways().flatMap((threadway) => [
    {
      registryId: 'threadway-network' as const,
      recordId: threadway.threadwayId,
      fieldPath: 'fromWorldId',
      referencedWorldId: threadway.fromWorldId,
    },
    {
      registryId: 'threadway-network' as const,
      recordId: threadway.threadwayId,
      fieldPath: 'toWorldId',
      referencedWorldId: threadway.toWorldId,
    },
  ]);

  const hiddenZoneSeeds = hiddenZones.getAllZones().flatMap((zone) => [
    {
      registryId: 'hidden-zones' as const,
      recordId: zone.zoneId,
      fieldPath: 'accessWorldId',
      referencedWorldId: zone.accessWorldId,
    },
    ...(zone.discoveryTrigger.requiredWorldId === null
      ? []
      : [{
          registryId: 'hidden-zones' as const,
          recordId: zone.zoneId,
          fieldPath: 'discoveryTrigger.requiredWorldId',
          referencedWorldId: zone.discoveryTrigger.requiredWorldId,
        }]),
  ]);

  return [
    ...CHARACTER_DOSSIERS.map((dossier) => ({
      registryId: 'character-dossiers' as const,
      recordId: dossier.characterId,
      fieldPath: 'primaryWorld',
      referencedWorldId: dossier.primaryWorld,
    })),
    ...curriculumSeeds,
    ...ENCYCLOPEDIA_ENTRIES.map((entry) => ({
      registryId: 'encyclopedia-entries' as const,
      recordId: entry.entryId,
      fieldPath: 'worldId',
      referencedWorldId: entry.worldId,
    })),
    ...CHARACTER_RELATIONSHIPS.flatMap((relationship) => [
      {
        registryId: 'npc-relationship-registry' as const,
        recordId: relationship.relationshipId,
        fieldPath: 'characterAWorldId',
        referencedWorldId: relationship.characterAWorldId,
      },
      {
        registryId: 'npc-relationship-registry' as const,
        recordId: relationship.relationshipId,
        fieldPath: 'characterBWorldId',
        referencedWorldId: relationship.characterBWorldId,
      },
    ]),
    ...questSeeds,
    ...threadwaySeeds,
    ...hiddenZoneSeeds,
  ];
}

// ── Classification ──────────────────────────────────────────────

function classifyReference(
  seed: ReferenceSeed,
  resolution: WorldIdResolutionPort,
  specialReferences: WorldSpecialReferenceRegistryPort,
): WorldIdDriftReference {
  const specialReference = specialReferences.getReference(seed.referencedWorldId);

  if (specialReference) {
    return {
      ...seed,
      status: 'special-reference',
      specialReferenceKind: specialReference.kind,
      evidence: specialReference.evidence,
    };
  }

  const result = resolution.resolve(seed.referencedWorldId);

  if (!result) {
    return {
      ...seed,
      status: 'untracked-noncanonical',
      evidence:
        'Reference does not match a canonical world ID and is not covered by the current alias or unresolved legacy registry.',
    };
  }

  return {
    ...seed,
    status: result.status,
    canonicalWorldId: result.canonicalWorldId,
    canonicalWorldName: result.canonicalWorldName,
    guideId: result.guideId,
    evidence: result.evidence,
  };
}

function buildRegistryProfiles(
  references: ReadonlyArray<WorldIdDriftReference>,
): ReadonlyArray<RegistryWorldIdDriftProfile> {
  const registryIds: ReadonlyArray<WorldIdDriftRegistryId> = [
    'character-dossiers',
    'curriculum-map',
    'encyclopedia-entries',
    'npc-relationship-registry',
    'quest-chains',
    'threadway-network',
    'hidden-zones',
  ];

  return registryIds.map((registryId) => {
    const registryReferences = references.filter(
      (reference) => reference.registryId === registryId,
    );

    return {
      registryId,
      totalReferences: registryReferences.length,
      canonicalReferences: registryReferences.filter(
        (reference) => reference.status === 'canonical',
      ).length,
      resolvedAliasReferences: registryReferences.filter(
        (reference) => reference.status === 'resolved-alias',
      ).length,
      specialReferenceReferences: registryReferences.filter(
        (reference) => reference.status === 'special-reference',
      ).length,
      unresolvedLegacyReferences: registryReferences.filter(
        (reference) => reference.status === 'unresolved-legacy',
      ).length,
      untrackedNoncanonicalReferences: registryReferences.filter(
        (reference) => reference.status === 'untracked-noncanonical',
      ).length,
      uniqueNoncanonicalWorldIds: [...new Set(
        registryReferences
          .filter((reference) => reference.status !== 'canonical')
          .map((reference) => reference.referencedWorldId),
      )].sort(),
    };
  });
}

const WORLD_ID_DRIFT_REFERENCES: ReadonlyArray<WorldIdDriftReference> =
  extractReferenceSeeds().map((seed) =>
    classifyReference(
      seed,
      WORLD_ID_RESOLUTION,
      WORLD_SPECIAL_REFERENCE_REGISTRY,
    ),
  );

const REGISTRY_WORLD_ID_DRIFT_PROFILES = buildRegistryProfiles(
  WORLD_ID_DRIFT_REFERENCES,
);

const REGISTRY_PROFILE_BY_ID = new Map(
  REGISTRY_WORLD_ID_DRIFT_PROFILES.map((profile) => [profile.registryId, profile]),
);

// ── Public API ──────────────────────────────────────────────────

export function createWorldIdDriftReport(): WorldIdDriftReportPort {
  return {
    totalRegistries: TOTAL_WORLD_ID_DRIFT_REGISTRIES,
    totalReferences: WORLD_ID_DRIFT_REFERENCES.length,

    getRegistryProfiles(): ReadonlyArray<RegistryWorldIdDriftProfile> {
      return REGISTRY_WORLD_ID_DRIFT_PROFILES;
    },

    getRegistryProfile(
      registryId: WorldIdDriftRegistryId,
    ): RegistryWorldIdDriftProfile | undefined {
      return REGISTRY_PROFILE_BY_ID.get(registryId);
    },

    allReferences(): ReadonlyArray<WorldIdDriftReference> {
      return WORLD_ID_DRIFT_REFERENCES;
    },

    getNoncanonicalReferences(): ReadonlyArray<WorldIdDriftReference> {
      return WORLD_ID_DRIFT_REFERENCES.filter(
        (reference) => reference.status !== 'canonical',
      );
    },

    getReferencesForWorldId(worldId: string): ReadonlyArray<WorldIdDriftReference> {
      return WORLD_ID_DRIFT_REFERENCES.filter(
        (reference) => reference.referencedWorldId === worldId,
      );
    },

    getUntrackedWorldIds(): ReadonlyArray<string> {
      return [...new Set(
        WORLD_ID_DRIFT_REFERENCES
          .filter((reference) => reference.status === 'untracked-noncanonical')
          .map((reference) => reference.referencedWorldId),
      )].sort();
    },

    getRegistriesWithNoncanonicalReferences(): ReadonlyArray<RegistryWorldIdDriftProfile> {
      return REGISTRY_WORLD_ID_DRIFT_PROFILES.filter(
        (profile) =>
          profile.resolvedAliasReferences > 0 ||
          profile.specialReferenceReferences > 0 ||
          profile.unresolvedLegacyReferences > 0 ||
          profile.untrackedNoncanonicalReferences > 0,
      );
    },
  };
}

export const WORLD_ID_DRIFT_REPORT = createWorldIdDriftReport();