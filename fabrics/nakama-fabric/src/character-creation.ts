/**
 * Character Creation Service — Orchestrates character creation
 * flow for new and returning players.
 *
 * Connects dynasty system, subscription tiers, and world census
 * to produce fully-initialized player characters with proper
 * starting resources, tutorial flags, and world placement.
 *
 * Thread: steel/nakama-fabric/character-creation
 * Tier: 1
 */

// ─── Ports (dependencies injected) ──────────────────────────────

export interface CharacterDynastyPort {
  readonly foundDynasty: (params: {
    readonly dynastyName: string;
    readonly founderId: string;
    readonly tier: string;
  }) => Promise<{ readonly dynastyId: string }>;
  readonly getDynasty: (dynastyId: string) => Promise<CharacterDynastyInfo | undefined>;
}

export interface CharacterDynastyInfo {
  readonly dynastyId: string;
  readonly name: string;
  readonly founderId: string;
  readonly tier: string;
}

export interface CharacterLedgerPort {
  readonly createAccount: (accountId: string, displayName: string) => Promise<void>;
  readonly deposit: (accountId: string, amount: bigint, reason: string) => Promise<void>;
}

export interface CharacterCensusPort {
  readonly registerResidency: (params: {
    readonly dynastyId: string;
    readonly worldId: string;
    readonly characterName: string;
  }) => Promise<void>;
}

export interface CharacterInventoryPort {
  readonly addItem: (params: {
    readonly ownerId: string;
    readonly itemType: string;
    readonly quantity: number;
    readonly metadata: string;
  }) => Promise<{ readonly itemId: string }>;
}

export interface CharacterClockPort {
  readonly nowMicroseconds: () => bigint;
}

export interface CharacterIdPort {
  readonly next: () => string;
}

// ─── Character Template ─────────────────────────────────────────

export type CharacterArchetype = 'explorer' | 'builder' | 'trader' | 'diplomat' | 'warrior';

export interface CharacterAppearance {
  readonly bodyType: number;
  readonly skinTone: number;
  readonly hairStyle: number;
  readonly hairColor: number;
  readonly facePreset: number;
  readonly height: number;
}

export interface CreateCharacterParams {
  readonly playerId: string;
  readonly dynastyName: string;
  readonly characterName: string;
  readonly archetype: CharacterArchetype;
  readonly appearance: CharacterAppearance;
  readonly startingWorldId: string;
  readonly subscriptionTier: string;
}

export interface CharacterCreationResult {
  readonly characterId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly startingKalon: bigint;
  readonly starterItems: ReadonlyArray<string>;
  readonly createdAtUs: bigint;
}

// ─── Starting Resources by Archetype ────────────────────────────

const STARTING_KALON: Record<CharacterArchetype, bigint> = {
  explorer: 500_000_000n,  // 500 KALON
  builder: 750_000_000n,   // 750 KALON
  trader: 1_000_000_000n,  // 1000 KALON
  diplomat: 600_000_000n,  // 600 KALON
  warrior: 400_000_000n,   // 400 KALON
};

const STARTER_ITEMS: Record<CharacterArchetype, ReadonlyArray<{ type: string; qty: number }>> = {
  explorer: [
    { type: 'compass', qty: 1 },
    { type: 'survey_kit', qty: 3 },
    { type: 'rations', qty: 10 },
  ],
  builder: [
    { type: 'construction_tools', qty: 1 },
    { type: 'blueprint_basic', qty: 5 },
    { type: 'raw_materials', qty: 50 },
  ],
  trader: [
    { type: 'trade_license', qty: 1 },
    { type: 'market_stall', qty: 1 },
    { type: 'sample_goods', qty: 20 },
  ],
  diplomat: [
    { type: 'diplomatic_seal', qty: 1 },
    { type: 'treaty_scrolls', qty: 5 },
    { type: 'gift_basket', qty: 3 },
  ],
  warrior: [
    { type: 'basic_weapon', qty: 1 },
    { type: 'basic_armor', qty: 1 },
    { type: 'medical_kit', qty: 5 },
  ],
};

// ─── Service ────────────────────────────────────────────────────

export interface CharacterCreationService {
  readonly createCharacter: (params: CreateCharacterParams) => Promise<CharacterCreationResult>;
}

export interface CharacterCreationDeps {
  readonly dynasty: CharacterDynastyPort;
  readonly ledger: CharacterLedgerPort;
  readonly census: CharacterCensusPort;
  readonly inventory: CharacterInventoryPort;
  readonly clock: CharacterClockPort;
  readonly idGenerator: CharacterIdPort;
}

export function createCharacterCreationService(
  deps: CharacterCreationDeps,
): CharacterCreationService {
  return {
    async createCharacter(params) {
      const characterId = deps.idGenerator.next();
      const now = deps.clock.nowMicroseconds();

      // 1. Found dynasty
      const { dynastyId } = await deps.dynasty.foundDynasty({
        dynastyName: params.dynastyName,
        founderId: params.playerId,
        tier: params.subscriptionTier,
      });

      // 2. Create KALON account & grant starting funds
      const startingKalon = STARTING_KALON[params.archetype];
      await deps.ledger.createAccount(dynastyId, params.characterName);
      await deps.ledger.deposit(dynastyId, startingKalon, 'character_creation_grant');

      // 3. Register in world census
      await deps.census.registerResidency({
        dynastyId,
        worldId: params.startingWorldId,
        characterName: params.characterName,
      });

      // 4. Grant starter items
      const items = STARTER_ITEMS[params.archetype];
      const itemIds: string[] = [];
      for (const item of items) {
        const { itemId } = await deps.inventory.addItem({
          ownerId: dynastyId,
          itemType: item.type,
          quantity: item.qty,
          metadata: JSON.stringify({ source: 'character_creation', archetype: params.archetype }),
        });
        itemIds.push(itemId);
      }

      return {
        characterId,
        dynastyId,
        worldId: params.startingWorldId,
        startingKalon,
        starterItems: itemIds,
        createdAtUs: now,
      };
    },
  };
}
