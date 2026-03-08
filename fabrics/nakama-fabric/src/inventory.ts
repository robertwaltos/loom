/**
 * Inventory Service — Dynasty-owned items and resource tracking.
 *
 * Each dynasty has an inventory of typed, quantified items.
 * Items can be added, removed, transferred between dynasties,
 * and queried. Supports stack limits and item metadata.
 *
 * Item quantities are always non-negative integers.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface InventoryItem {
  readonly itemId: string;
  readonly itemType: string;
  readonly quantity: number;
  readonly maxStack: number;
  readonly metadata?: Record<string, unknown>;
  readonly addedAt: number;
}

export interface AddItemParams {
  readonly dynastyId: string;
  readonly itemType: string;
  readonly quantity: number;
  readonly maxStack?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface RemoveItemResult {
  readonly removed: number;
  readonly remaining: number;
}

export interface TransferResult {
  readonly transferred: number;
  readonly fromRemaining: number;
  readonly toQuantity: number;
}

export interface InventoryStats {
  readonly totalDynasties: number;
  readonly totalItems: number;
  readonly totalQuantity: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface InventoryDeps {
  readonly idGenerator: { next(): string };
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface InventoryService {
  addItem(params: AddItemParams): InventoryItem;
  removeItem(dynastyId: string, itemType: string, quantity: number): RemoveItemResult;
  getItem(dynastyId: string, itemType: string): InventoryItem | undefined;
  getInventory(dynastyId: string): ReadonlyArray<InventoryItem>;
  transfer(from: string, to: string, itemType: string, quantity: number): TransferResult;
  hasItem(dynastyId: string, itemType: string, quantity: number): boolean;
  clearInventory(dynastyId: string): number;
  getStats(): InventoryStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface MutableItem {
  readonly itemId: string;
  readonly itemType: string;
  quantity: number;
  readonly maxStack: number;
  readonly metadata?: Record<string, unknown>;
  readonly addedAt: number;
}

interface ServiceState {
  readonly inventories: Map<string, Map<string, MutableItem>>;
  readonly deps: InventoryDeps;
}

const DEFAULT_MAX_STACK = 9999;

// ─── Factory ────────────────────────────────────────────────────────

export function createInventoryService(
  deps: InventoryDeps,
): InventoryService {
  const state: ServiceState = { inventories: new Map(), deps };

  return {
    addItem: (p) => addItemImpl(state, p),
    removeItem: (did, itype, qty) => removeImpl(state, did, itype, qty),
    getItem: (did, itype) => getItemImpl(state, did, itype),
    getInventory: (did) => inventoryImpl(state, did),
    transfer: (f, t, itype, qty) => transferImpl(state, f, t, itype, qty),
    hasItem: (did, itype, qty) => hasImpl(state, did, itype, qty),
    clearInventory: (did) => clearImpl(state, did),
    getStats: () => computeStats(state),
  };
}

// ─── Add ────────────────────────────────────────────────────────────

function addItemImpl(state: ServiceState, params: AddItemParams): InventoryItem {
  const inv = getOrCreateInventory(state, params.dynastyId);
  const existing = inv.get(params.itemType);
  const maxStack = params.maxStack ?? DEFAULT_MAX_STACK;
  if (existing !== undefined) {
    existing.quantity = Math.min(existing.quantity + params.quantity, maxStack);
    return toReadonly(existing);
  }
  const item: MutableItem = {
    itemId: state.deps.idGenerator.next(),
    itemType: params.itemType,
    quantity: Math.min(params.quantity, maxStack),
    maxStack,
    metadata: params.metadata,
    addedAt: state.deps.clock.nowMicroseconds(),
  };
  inv.set(params.itemType, item);
  return toReadonly(item);
}

function getOrCreateInventory(
  state: ServiceState,
  dynastyId: string,
): Map<string, MutableItem> {
  let inv = state.inventories.get(dynastyId);
  if (inv === undefined) {
    inv = new Map();
    state.inventories.set(dynastyId, inv);
  }
  return inv;
}

// ─── Remove ─────────────────────────────────────────────────────────

function removeImpl(
  state: ServiceState,
  dynastyId: string,
  itemType: string,
  quantity: number,
): RemoveItemResult {
  const inv = state.inventories.get(dynastyId);
  if (inv === undefined) return { removed: 0, remaining: 0 };
  const item = inv.get(itemType);
  if (item === undefined) return { removed: 0, remaining: 0 };
  const removed = Math.min(quantity, item.quantity);
  item.quantity -= removed;
  if (item.quantity <= 0) inv.delete(itemType);
  return { removed, remaining: item.quantity };
}

// ─── Transfer ───────────────────────────────────────────────────────

function transferImpl(
  state: ServiceState,
  from: string,
  to: string,
  itemType: string,
  quantity: number,
): TransferResult {
  const fromInv = state.inventories.get(from);
  const fromItem = fromInv?.get(itemType);
  if (fromItem === undefined) return { transferred: 0, fromRemaining: 0, toQuantity: 0 };
  const actual = Math.min(quantity, fromItem.quantity);
  fromItem.quantity -= actual;
  if (fromItem.quantity <= 0) fromInv?.delete(itemType);
  const added = addItemImpl(state, { dynastyId: to, itemType, quantity: actual });
  return {
    transferred: actual,
    fromRemaining: fromItem.quantity,
    toQuantity: added.quantity,
  };
}

// ─── Queries ────────────────────────────────────────────────────────

function getItemImpl(
  state: ServiceState,
  dynastyId: string,
  itemType: string,
): InventoryItem | undefined {
  const inv = state.inventories.get(dynastyId);
  const item = inv?.get(itemType);
  return item !== undefined ? toReadonly(item) : undefined;
}

function inventoryImpl(
  state: ServiceState,
  dynastyId: string,
): ReadonlyArray<InventoryItem> {
  const inv = state.inventories.get(dynastyId);
  if (inv === undefined) return [];
  const result: InventoryItem[] = [];
  for (const item of inv.values()) {
    result.push(toReadonly(item));
  }
  return result;
}

function hasImpl(
  state: ServiceState,
  dynastyId: string,
  itemType: string,
  quantity: number,
): boolean {
  const inv = state.inventories.get(dynastyId);
  const item = inv?.get(itemType);
  return item !== undefined && item.quantity >= quantity;
}

function clearImpl(state: ServiceState, dynastyId: string): number {
  const inv = state.inventories.get(dynastyId);
  if (inv === undefined) return 0;
  const count = inv.size;
  state.inventories.delete(dynastyId);
  return count;
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonly(item: MutableItem): InventoryItem {
  return item;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ServiceState): InventoryStats {
  let totalItems = 0;
  let totalQuantity = 0;
  for (const inv of state.inventories.values()) {
    totalItems += inv.size;
    for (const item of inv.values()) {
      totalQuantity += item.quantity;
    }
  }
  return {
    totalDynasties: state.inventories.size,
    totalItems,
    totalQuantity,
  };
}
