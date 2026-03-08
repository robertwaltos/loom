/**
 * npc-inventory.ts — NPC item ownership and management.
 *
 * Tracks items owned by NPCs with quantity, category, and
 * capacity limits. Supports add, remove, transfer between
 * NPCs, and inventory queries.
 */

// ── Ports ────────────────────────────────────────────────────────

interface InventoryClock {
  readonly nowMicroseconds: () => number;
}

interface InventoryIdGenerator {
  readonly next: () => string;
}

interface NpcInventoryDeps {
  readonly clock: InventoryClock;
  readonly idGenerator: InventoryIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ItemCategory = 'weapon' | 'armour' | 'tool' | 'consumable' | 'material' | 'currency' | 'quest';

interface InventoryItem {
  readonly itemId: string;
  readonly npcId: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly quantity: number;
  readonly addedAt: number;
}

interface AddItemParams {
  readonly npcId: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly quantity: number;
}

interface TransferResult {
  readonly success: boolean;
  readonly reason: string;
}

interface NpcInventoryStats {
  readonly totalNpcs: number;
  readonly totalItems: number;
  readonly totalQuantity: number;
}

interface NpcInventoryConfig {
  readonly maxItemsPerNpc: number;
}

interface NpcInventoryService {
  readonly addItem: (params: AddItemParams) => InventoryItem;
  readonly removeItem: (npcId: string, itemId: string) => boolean;
  readonly getItems: (npcId: string) => readonly InventoryItem[];
  readonly getByCategory: (npcId: string, category: ItemCategory) => readonly InventoryItem[];
  readonly transfer: (fromNpcId: string, toNpcId: string, itemId: string) => TransferResult;
  readonly getItemCount: (npcId: string) => number;
  readonly getStats: () => NpcInventoryStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_INVENTORY_CONFIG: NpcInventoryConfig = {
  maxItemsPerNpc: 50,
};

// ── State ────────────────────────────────────────────────────────

interface MutableItem {
  readonly itemId: string;
  npcId: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly quantity: number;
  readonly addedAt: number;
}

interface InventoryState {
  readonly deps: NpcInventoryDeps;
  readonly config: NpcInventoryConfig;
  readonly inventories: Map<string, MutableItem[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(item: MutableItem): InventoryItem {
  return {
    itemId: item.itemId,
    npcId: item.npcId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    addedAt: item.addedAt,
  };
}

function getOrCreateInventory(state: InventoryState, npcId: string): MutableItem[] {
  let inv = state.inventories.get(npcId);
  if (!inv) {
    inv = [];
    state.inventories.set(npcId, inv);
  }
  return inv;
}

// ── Operations ───────────────────────────────────────────────────

function addItemImpl(state: InventoryState, params: AddItemParams): InventoryItem {
  const inv = getOrCreateInventory(state, params.npcId);
  const item: MutableItem = {
    itemId: state.deps.idGenerator.next(),
    npcId: params.npcId,
    name: params.name,
    category: params.category,
    quantity: params.quantity,
    addedAt: state.deps.clock.nowMicroseconds(),
  };
  inv.push(item);
  return toReadonly(item);
}

function removeItemImpl(state: InventoryState, npcId: string, itemId: string): boolean {
  const inv = state.inventories.get(npcId);
  if (!inv) return false;
  const idx = inv.findIndex((i) => i.itemId === itemId);
  if (idx === -1) return false;
  inv.splice(idx, 1);
  return true;
}

function transferImpl(state: InventoryState, from: string, to: string, itemId: string): TransferResult {
  const fromInv = state.inventories.get(from);
  if (!fromInv) return { success: false, reason: 'source npc has no inventory' };
  const idx = fromInv.findIndex((i) => i.itemId === itemId);
  if (idx === -1) return { success: false, reason: 'item not found in source' };
  const toInv = getOrCreateInventory(state, to);
  if (toInv.length >= state.config.maxItemsPerNpc) {
    return { success: false, reason: 'target inventory full' };
  }
  const item = fromInv[idx];
  if (item === undefined) return { success: false, reason: 'item not found in source' };
  fromInv.splice(idx, 1);
  item.npcId = to;
  toInv.push(item);
  return { success: true, reason: 'transferred' };
}

function getByCategoryImpl(state: InventoryState, npcId: string, category: ItemCategory): InventoryItem[] {
  const inv = state.inventories.get(npcId);
  if (!inv) return [];
  return inv.filter((i) => i.category === category).map(toReadonly);
}

function getStatsImpl(state: InventoryState): NpcInventoryStats {
  let totalItems = 0;
  let totalQuantity = 0;
  for (const inv of state.inventories.values()) {
    totalItems += inv.length;
    for (const item of inv) {
      totalQuantity += item.quantity;
    }
  }
  return {
    totalNpcs: state.inventories.size,
    totalItems,
    totalQuantity,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcInventoryService(
  deps: NpcInventoryDeps,
  config: NpcInventoryConfig = DEFAULT_INVENTORY_CONFIG,
): NpcInventoryService {
  const state: InventoryState = { deps, config, inventories: new Map() };
  return {
    addItem: (p) => addItemImpl(state, p),
    removeItem: (npc, id) => removeItemImpl(state, npc, id),
    getItems: (npc) => (state.inventories.get(npc) ?? []).map(toReadonly),
    getByCategory: (npc, cat) => getByCategoryImpl(state, npc, cat),
    transfer: (from, to, id) => transferImpl(state, from, to, id),
    getItemCount: (npc) => (state.inventories.get(npc) ?? []).length,
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcInventoryService, DEFAULT_INVENTORY_CONFIG };
export type {
  NpcInventoryService,
  NpcInventoryDeps,
  NpcInventoryConfig,
  ItemCategory,
  InventoryItem,
  AddItemParams,
  TransferResult,
  NpcInventoryStats,
};
