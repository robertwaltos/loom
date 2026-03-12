/**
 * Character Creation Service — Simulation Tests
 *
 * Tests the full player onboarding flow: dynasty founding,
 * KALON account creation, world census registration, and
 * archetype-specific starter item grants.
 *
 * Phase 9.21 — Player Onboarding
 * Thread: test/nakama-fabric/character-creation
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createCharacterCreationService,
  type CharacterDynastyPort,
  type CharacterLedgerPort,
  type CharacterCensusPort,
  type CharacterInventoryPort,
  type CharacterArchetype,
} from '../character-creation.js';

// ─── Fake Ports ─────────────────────────────────────────────────

function createFakeClock(startUs = 1_000_000n) {
  let now = startUs;
  return {
    nowMicroseconds: () => {
      const val = now;
      now += 1_000_000n;
      return val;
    },
  };
}

function createFakeIds(prefix = 'id') {
  let counter = 0;
  return { next: () => `${prefix}-${++counter}` };
}

interface DynastyCall {
  readonly dynastyName: string;
  readonly founderId: string;
  readonly tier: string;
}

function createFakeDynasty(): CharacterDynastyPort & { readonly calls: DynastyCall[] } {
  const calls: DynastyCall[] = [];
  let counter = 0;
  return {
    calls,
    foundDynasty: async (params) => {
      calls.push(params);
      return { dynastyId: `dynasty-${++counter}` };
    },
    getDynasty: async (dynastyId) => ({
      dynastyId,
      name: 'Test Dynasty',
      founderId: 'player-1',
      tier: 'standard',
    }),
  };
}

interface LedgerCall {
  readonly method: 'createAccount' | 'deposit';
  readonly accountId: string;
  readonly displayName?: string;
  readonly amount?: bigint;
  readonly reason?: string;
}

function createFakeLedger(): CharacterLedgerPort & { readonly calls: LedgerCall[] } {
  const calls: LedgerCall[] = [];
  return {
    calls,
    createAccount: async (accountId, displayName) => {
      calls.push({ method: 'createAccount', accountId, displayName });
    },
    deposit: async (accountId, amount, reason) => {
      calls.push({ method: 'deposit', accountId, amount, reason });
    },
  };
}

interface CensusCall {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly characterName: string;
}

function createFakeCensus(): CharacterCensusPort & { readonly calls: CensusCall[] } {
  const calls: CensusCall[] = [];
  return {
    calls,
    registerResidency: async (params) => { calls.push(params); },
  };
}

interface InventoryCall {
  readonly ownerId: string;
  readonly itemType: string;
  readonly quantity: number;
  readonly metadata: string;
}

function createFakeInventory(): CharacterInventoryPort & { readonly calls: InventoryCall[] } {
  const calls: InventoryCall[] = [];
  let counter = 0;
  return {
    calls,
    addItem: async (params) => {
      calls.push(params);
      return { itemId: `item-${++counter}` };
    },
  };
}

const DEFAULT_APPEARANCE = {
  bodyType: 1,
  skinTone: 3,
  hairStyle: 5,
  hairColor: 2,
  facePreset: 1,
  height: 175,
};

// ─── Tests ──────────────────────────────────────────────────────

describe('CharacterCreationService', () => {
  function setup() {
    const clock = createFakeClock();
    const ids = createFakeIds('char');
    const dynasty = createFakeDynasty();
    const ledger = createFakeLedger();
    const census = createFakeCensus();
    const inventory = createFakeInventory();
    const service = createCharacterCreationService({
      dynasty, ledger, census, inventory, clock, idGenerator: ids,
    });
    return { service, dynasty, ledger, census, inventory };
  }

  // ─── Basic Creation Flow ────────────────────────────────────

  describe('basic creation flow', () => {
    it('creates a character with all expected fields', async () => {
      const { service } = setup();

      const result = await service.createCharacter({
        playerId: 'player-1',
        dynastyName: 'House Starfall',
        characterName: 'Aurora',
        archetype: 'explorer',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'world-alpha',
        subscriptionTier: 'premium',
      });

      expect(result.characterId).toBe('char-1');
      expect(result.dynastyId).toBe('dynasty-1');
      expect(result.worldId).toBe('world-alpha');
      expect(result.createdAtUs).toBe(1_000_000n);
      expect(result.startingKalon).toBe(500_000_000n); // explorer
      expect(result.starterItems).toHaveLength(3); // explorer gets 3 items
    });

    it('founds a dynasty with correct parameters', async () => {
      const { service, dynasty } = setup();

      await service.createCharacter({
        playerId: 'player-42',
        dynastyName: 'Iron Forge',
        characterName: 'Dain',
        archetype: 'builder',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'world-beta',
        subscriptionTier: 'gold',
      });

      expect(dynasty.calls).toHaveLength(1);
      expect(dynasty.calls[0]!.dynastyName).toBe('Iron Forge');
      expect(dynasty.calls[0]!.founderId).toBe('player-42');
      expect(dynasty.calls[0]!.tier).toBe('gold');
    });

    it('creates ledger account and deposits starting KALON', async () => {
      const { service, ledger } = setup();

      await service.createCharacter({
        playerId: 'p1',
        dynastyName: 'Test',
        characterName: 'Hero',
        archetype: 'trader',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      });

      expect(ledger.calls).toHaveLength(2);
      expect(ledger.calls[0]!.method).toBe('createAccount');
      expect(ledger.calls[0]!.accountId).toBe('dynasty-1');
      expect(ledger.calls[1]!.method).toBe('deposit');
      expect(ledger.calls[1]!.amount).toBe(1_000_000_000n); // trader
      expect(ledger.calls[1]!.reason).toBe('character_creation_grant');
    });

    it('registers world census residency', async () => {
      const { service, census } = setup();

      await service.createCharacter({
        playerId: 'p1',
        dynastyName: 'Test',
        characterName: 'Scout',
        archetype: 'explorer',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'world-frontier',
        subscriptionTier: 'standard',
      });

      expect(census.calls).toHaveLength(1);
      expect(census.calls[0]!.dynastyId).toBe('dynasty-1');
      expect(census.calls[0]!.worldId).toBe('world-frontier');
      expect(census.calls[0]!.characterName).toBe('Scout');
    });
  });

  // ─── Archetype-specific Resources ──────────────────────────

  describe('archetype starting resources', () => {
    const archetypeKalon: Record<CharacterArchetype, bigint> = {
      explorer: 500_000_000n,
      builder: 750_000_000n,
      trader: 1_000_000_000n,
      diplomat: 600_000_000n,
      warrior: 400_000_000n,
    };

    const archetypeItemCounts: Record<CharacterArchetype, number> = {
      explorer: 3,
      builder: 3,
      trader: 3,
      diplomat: 3,
      warrior: 3,
    };

    for (const archetype of Object.keys(archetypeKalon) as CharacterArchetype[]) {
      it(`grants correct starting KALON for ${archetype}`, async () => {
        const { service } = setup();

        const result = await service.createCharacter({
          playerId: 'p1',
          dynastyName: 'Test',
          characterName: 'Hero',
          archetype,
          appearance: DEFAULT_APPEARANCE,
          startingWorldId: 'w1',
          subscriptionTier: 'standard',
        });

        expect(result.startingKalon).toBe(archetypeKalon[archetype]);
      });

      it(`grants correct starter items for ${archetype}`, async () => {
        const { service } = setup();

        const result = await service.createCharacter({
          playerId: 'p1',
          dynastyName: 'Test',
          characterName: 'Hero',
          archetype,
          appearance: DEFAULT_APPEARANCE,
          startingWorldId: 'w1',
          subscriptionTier: 'standard',
        });

        expect(result.starterItems).toHaveLength(archetypeItemCounts[archetype]);
      });
    }
  });

  // ─── Inventory Item Details ─────────────────────────────────

  describe('inventory item details', () => {
    it('explorer receives compass, survey_kit, and rations', async () => {
      const { service, inventory } = setup();

      await service.createCharacter({
        playerId: 'p1',
        dynastyName: 'T',
        characterName: 'H',
        archetype: 'explorer',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      });

      const types = inventory.calls.map(c => c.itemType);
      expect(types).toContain('compass');
      expect(types).toContain('survey_kit');
      expect(types).toContain('rations');
    });

    it('builder receives construction_tools, blueprint_basic, raw_materials', async () => {
      const { service, inventory } = setup();

      await service.createCharacter({
        playerId: 'p1',
        dynastyName: 'T',
        characterName: 'H',
        archetype: 'builder',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      });

      const types = inventory.calls.map(c => c.itemType);
      expect(types).toContain('construction_tools');
      expect(types).toContain('blueprint_basic');
      expect(types).toContain('raw_materials');
    });

    it('warrior receives basic_weapon, basic_armor, medical_kit', async () => {
      const { service, inventory } = setup();

      await service.createCharacter({
        playerId: 'p1',
        dynastyName: 'T',
        characterName: 'H',
        archetype: 'warrior',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      });

      const types = inventory.calls.map(c => c.itemType);
      expect(types).toContain('basic_weapon');
      expect(types).toContain('basic_armor');
      expect(types).toContain('medical_kit');
    });

    it('items include archetype metadata', async () => {
      const { service, inventory } = setup();

      await service.createCharacter({
        playerId: 'p1',
        dynastyName: 'T',
        characterName: 'H',
        archetype: 'diplomat',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      });

      for (const call of inventory.calls) {
        const meta = JSON.parse(call.metadata) as { source: string; archetype: string };
        expect(meta.source).toBe('character_creation');
        expect(meta.archetype).toBe('diplomat');
      }
    });

    it('items are owned by dynasty, not player', async () => {
      const { service, inventory } = setup();

      await service.createCharacter({
        playerId: 'player-99',
        dynastyName: 'T',
        characterName: 'H',
        archetype: 'trader',
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      });

      for (const call of inventory.calls) {
        expect(call.ownerId).toBe('dynasty-1');
        expect(call.ownerId).not.toBe('player-99');
      }
    });
  });

  // ─── Multiple Characters ────────────────────────────────────

  describe('multiple characters', () => {
    it('creates multiple characters with unique IDs', async () => {
      const { service } = setup();
      const params = {
        dynastyName: 'House A',
        characterName: 'Hero',
        archetype: 'explorer' as const,
        appearance: DEFAULT_APPEARANCE,
        startingWorldId: 'w1',
        subscriptionTier: 'standard',
      };

      const r1 = await service.createCharacter({ ...params, playerId: 'p1' });
      const r2 = await service.createCharacter({ ...params, playerId: 'p2' });

      expect(r1.characterId).not.toBe(r2.characterId);
      expect(r1.dynastyId).not.toBe(r2.dynastyId);
    });
  });
});
