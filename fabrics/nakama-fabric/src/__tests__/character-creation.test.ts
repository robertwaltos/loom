import { describe, it, expect, vi } from 'vitest';
import { createCharacterCreationService } from '../character-creation.js';
import type {
  CharacterCreationDeps,
  CreateCharacterParams,
} from '../character-creation.js';

// ── Helpers ────────────────────────────────────────────────────────

const BASE_APPEARANCE = {
  bodyType: 1, skinTone: 3, hairStyle: 2, hairColor: 4, facePreset: 0, height: 175,
};

const BASE_PARAMS: CreateCharacterParams = {
  playerId: 'user-1',
  dynastyName: 'House Silfen',
  characterName: 'Aria',
  archetype: 'explorer',
  appearance: BASE_APPEARANCE,
  startingWorldId: 'world-prime',
  subscriptionTier: 'patron',
};

let itemCounter = 0;

function makeDeps(): CharacterCreationDeps {
  itemCounter = 0;
  return {
    dynasty: {
      foundDynasty: vi.fn().mockResolvedValue({ dynastyId: 'dynasty-abc' }),
      getDynasty: vi.fn().mockResolvedValue(undefined),
    },
    ledger: {
      createAccount: vi.fn().mockResolvedValue(undefined),
      deposit: vi.fn().mockResolvedValue(undefined),
    },
    census: {
      registerResidency: vi.fn().mockResolvedValue(undefined),
    },
    inventory: {
      addItem: vi.fn().mockImplementation(() => {
        itemCounter++;
        return Promise.resolve({ itemId: `item-${String(itemCounter)}` });
      }),
    },
    clock: { nowMicroseconds: () => 123_456n },
    idGenerator: { next: () => 'char-xyz' },
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('createCharacter — result fields', () => {
  it('returns characterId from idGenerator', async () => {
    const deps = makeDeps();
    const svc = createCharacterCreationService(deps);
    const result = await svc.createCharacter(BASE_PARAMS);
    expect(result.characterId).toBe('char-xyz');
  });

  it('returns dynastyId from dynasty.foundDynasty', async () => {
    const deps = makeDeps();
    const svc = createCharacterCreationService(deps);
    const result = await svc.createCharacter(BASE_PARAMS);
    expect(result.dynastyId).toBe('dynasty-abc');
  });

  it('returns startingWorldId as worldId', async () => {
    const deps = makeDeps();
    const svc = createCharacterCreationService(deps);
    const result = await svc.createCharacter(BASE_PARAMS);
    expect(result.worldId).toBe('world-prime');
  });

  it('returns createdAtUs from clock', async () => {
    const deps = makeDeps();
    const svc = createCharacterCreationService(deps);
    const result = await svc.createCharacter(BASE_PARAMS);
    expect(result.createdAtUs).toBe(123_456n);
  });
});

describe('createCharacter — starting KALON by archetype', () => {
  it('grants 500 KALON for explorer', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(result.startingKalon).toBe(500_000_000n);
  });

  it('grants 750 KALON for builder', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter({
      ...BASE_PARAMS, archetype: 'builder',
    });
    expect(result.startingKalon).toBe(750_000_000n);
  });

  it('grants 1000 KALON for trader', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter({
      ...BASE_PARAMS, archetype: 'trader',
    });
    expect(result.startingKalon).toBe(1_000_000_000n);
  });

  it('grants 600 KALON for diplomat', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter({
      ...BASE_PARAMS, archetype: 'diplomat',
    });
    expect(result.startingKalon).toBe(600_000_000n);
  });

  it('grants 400 KALON for warrior', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter({
      ...BASE_PARAMS, archetype: 'warrior',
    });
    expect(result.startingKalon).toBe(400_000_000n);
  });
});

describe('createCharacter — starter items', () => {
  it('grants correct number of starter items for explorer', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(result.starterItems).toHaveLength(3); // compass, survey_kit, rations
  });

  it('grants correct number of starter items for trader', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter({
      ...BASE_PARAMS, archetype: 'trader',
    });
    expect(result.starterItems).toHaveLength(3);
  });

  it('item IDs come from inventory.addItem responses', async () => {
    const deps = makeDeps();
    const result = await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(result.starterItems[0]).toBe('item-1');
    expect(result.starterItems[1]).toBe('item-2');
    expect(result.starterItems[2]).toBe('item-3');
  });
});

describe('createCharacter — port interactions', () => {
  it('calls dynasty.foundDynasty with dynasty name and player id', async () => {
    const deps = makeDeps();
    await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(deps.dynasty.foundDynasty).toHaveBeenCalledWith({
      dynastyName: 'House Silfen',
      founderId: 'user-1',
      tier: 'patron',
    });
  });

  it('calls ledger.createAccount with dynastyId and characterName', async () => {
    const deps = makeDeps();
    await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(deps.ledger.createAccount).toHaveBeenCalledWith('dynasty-abc', 'Aria');
  });

  it('calls ledger.deposit with dynastyId, startingKalon and reason', async () => {
    const deps = makeDeps();
    await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(deps.ledger.deposit).toHaveBeenCalledWith(
      'dynasty-abc', 500_000_000n, 'character_creation_grant',
    );
  });

  it('calls census.registerResidency with correct params', async () => {
    const deps = makeDeps();
    await createCharacterCreationService(deps).createCharacter(BASE_PARAMS);
    expect(deps.census.registerResidency).toHaveBeenCalledWith({
      dynastyId: 'dynasty-abc',
      worldId: 'world-prime',
      characterName: 'Aria',
    });
  });
});
