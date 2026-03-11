/**
 * Trading Post System — Fixed-location trade hubs with inventory and price discovery.
 *
 * Posts are physical locations on worlds where traders buy and sell goods.
 * Each post maintains its own inventory and transaction history. Tax (bps) is
 * applied to every transaction. Price discovery is emergent from listing prices.
 */

// ============================================================================
// Types
// ============================================================================

export type PostId = string;
export type ItemId = string;
export type TraderDynastyId = string;
export type WorldId = string;

export type TradingError =
  | 'post-not-found'
  | 'item-not-found'
  | 'trader-not-found'
  | 'insufficient-stock'
  | 'insufficient-funds'
  | 'invalid-price'
  | 'invalid-quantity'
  | 'already-registered';

export interface TradingPost {
  readonly postId: PostId;
  readonly name: string;
  readonly worldId: WorldId;
  readonly location: string;
  readonly taxRateBps: number;
  readonly active: boolean;
  readonly createdAt: bigint;
}

export interface PostInventory {
  readonly postId: PostId;
  readonly itemId: ItemId;
  readonly itemName: string;
  readonly quantityAvailable: bigint;
  readonly listPriceKalon: bigint;
  readonly lastUpdatedAt: bigint;
}

export interface TradeTransaction {
  readonly transactionId: string;
  readonly postId: PostId;
  readonly traderId: TraderDynastyId;
  readonly itemId: ItemId;
  readonly quantity: bigint;
  readonly pricePerUnitKalon: bigint;
  readonly taxKalon: bigint;
  readonly type: 'BUY' | 'SELL';
  readonly executedAt: bigint;
}

export interface PostSummary {
  readonly postId: PostId;
  readonly totalItems: number;
  readonly totalTransactions: number;
  readonly totalVolumeKalon: bigint;
}

export interface TradingPostSystem {
  registerPost(
    name: string,
    worldId: WorldId,
    location: string,
    taxRateBps: number,
  ): TradingPost | TradingError;
  registerTrader(
    traderId: TraderDynastyId,
  ): { success: true } | { success: false; error: TradingError };
  listItem(
    postId: PostId,
    itemId: ItemId,
    itemName: string,
    quantity: bigint,
    priceKalon: bigint,
  ): PostInventory | TradingError;
  restock(
    postId: PostId,
    itemId: ItemId,
    additionalQuantity: bigint,
  ): { success: true } | { success: false; error: TradingError };
  buy(
    postId: PostId,
    traderId: TraderDynastyId,
    itemId: ItemId,
    quantity: bigint,
  ): { success: true; transaction: TradeTransaction } | { success: false; error: TradingError };
  sell(
    postId: PostId,
    traderId: TraderDynastyId,
    itemId: ItemId,
    itemName: string,
    quantity: bigint,
    offerPriceKalon: bigint,
  ): { success: true; transaction: TradeTransaction } | { success: false; error: TradingError };
  getInventory(postId: PostId, itemId: ItemId): PostInventory | undefined;
  getPostSummary(postId: PostId): PostSummary | undefined;
  getTransactionHistory(postId: PostId, limit: number): ReadonlyArray<TradeTransaction>;
}

// ============================================================================
// Internal State
// ============================================================================

type InventoryKey = `${PostId}:${ItemId}`;

interface MutableInventory {
  postId: PostId;
  itemId: ItemId;
  itemName: string;
  quantityAvailable: bigint;
  listPriceKalon: bigint;
  lastUpdatedAt: bigint;
}

interface TradingPostState {
  readonly posts: Map<PostId, TradingPost>;
  readonly traders: Set<TraderDynastyId>;
  readonly inventory: Map<InventoryKey, MutableInventory>;
  readonly transactions: Map<PostId, TradeTransaction[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generate(): string };
  readonly logger: { info(msg: string, ctx: Record<string, unknown>): void };
}

function inventoryKey(postId: PostId, itemId: ItemId): InventoryKey {
  return `${postId}:${itemId}`;
}

// ============================================================================
// Core Implementation Functions
// ============================================================================

function registerPostImpl(
  state: TradingPostState,
  name: string,
  worldId: WorldId,
  location: string,
  taxRateBps: number,
): TradingPost | TradingError {
  if (taxRateBps < 0 || taxRateBps > 10000) return 'invalid-price';

  const postId = state.idGen.generate();
  const post: TradingPost = {
    postId,
    name,
    worldId,
    location,
    taxRateBps,
    active: true,
    createdAt: state.clock.nowMicroseconds(),
  };
  state.posts.set(postId, post);
  state.transactions.set(postId, []);
  state.logger.info('Trading post registered', { postId, name, worldId, location });
  return post;
}

function registerTraderImpl(
  state: TradingPostState,
  traderId: TraderDynastyId,
): { success: true } | { success: false; error: TradingError } {
  if (state.traders.has(traderId)) return { success: false, error: 'already-registered' };
  state.traders.add(traderId);
  return { success: true };
}

function listItemImpl(
  state: TradingPostState,
  postId: PostId,
  itemId: ItemId,
  itemName: string,
  quantity: bigint,
  priceKalon: bigint,
): PostInventory | TradingError {
  if (!state.posts.has(postId)) return 'post-not-found';
  if (priceKalon < 1n) return 'invalid-price';
  if (quantity < 1n) return 'invalid-quantity';

  const key = inventoryKey(postId, itemId);
  const now = state.clock.nowMicroseconds();
  const existing = state.inventory.get(key);

  if (existing) {
    existing.quantityAvailable += quantity;
    existing.listPriceKalon = priceKalon;
    existing.lastUpdatedAt = now;
    return existing;
  }

  const entry: MutableInventory = {
    postId,
    itemId,
    itemName,
    quantityAvailable: quantity,
    listPriceKalon: priceKalon,
    lastUpdatedAt: now,
  };
  state.inventory.set(key, entry);
  return entry;
}

function restockImpl(
  state: TradingPostState,
  postId: PostId,
  itemId: ItemId,
  additionalQuantity: bigint,
): { success: true } | { success: false; error: TradingError } {
  if (!state.posts.has(postId)) return { success: false, error: 'post-not-found' };
  const key = inventoryKey(postId, itemId);
  const entry = state.inventory.get(key);
  if (!entry) return { success: false, error: 'item-not-found' };
  if (additionalQuantity < 1n) return { success: false, error: 'invalid-quantity' };

  entry.quantityAvailable += additionalQuantity;
  entry.lastUpdatedAt = state.clock.nowMicroseconds();
  return { success: true };
}

function computeTax(quantity: bigint, price: bigint, bps: number): bigint {
  return (quantity * price * BigInt(bps)) / 10000n;
}

function buyImpl(
  state: TradingPostState,
  postId: PostId,
  traderId: TraderDynastyId,
  itemId: ItemId,
  quantity: bigint,
): { success: true; transaction: TradeTransaction } | { success: false; error: TradingError } {
  const post = state.posts.get(postId);
  if (!post) return { success: false, error: 'post-not-found' };
  if (!state.traders.has(traderId)) return { success: false, error: 'trader-not-found' };
  if (quantity < 1n) return { success: false, error: 'invalid-quantity' };

  const key = inventoryKey(postId, itemId);
  const entry = state.inventory.get(key);
  if (!entry) return { success: false, error: 'item-not-found' };
  if (entry.quantityAvailable < quantity) return { success: false, error: 'insufficient-stock' };

  entry.quantityAvailable -= quantity;
  entry.lastUpdatedAt = state.clock.nowMicroseconds();

  const taxKalon = computeTax(quantity, entry.listPriceKalon, post.taxRateBps);
  const transaction: TradeTransaction = {
    transactionId: state.idGen.generate(),
    postId,
    traderId,
    itemId,
    quantity,
    pricePerUnitKalon: entry.listPriceKalon,
    taxKalon,
    type: 'BUY',
    executedAt: state.clock.nowMicroseconds(),
  };

  state.transactions.get(postId)?.push(transaction);
  state.logger.info('Buy executed', { transactionId: transaction.transactionId, postId, itemId });
  return { success: true, transaction };
}

function sellImpl(
  state: TradingPostState,
  postId: PostId,
  traderId: TraderDynastyId,
  itemId: ItemId,
  itemName: string,
  quantity: bigint,
  offerPriceKalon: bigint,
): { success: true; transaction: TradeTransaction } | { success: false; error: TradingError } {
  const post = state.posts.get(postId);
  if (!post) return { success: false, error: 'post-not-found' };
  if (!state.traders.has(traderId)) return { success: false, error: 'trader-not-found' };
  if (quantity < 1n) return { success: false, error: 'invalid-quantity' };
  if (offerPriceKalon < 1n) return { success: false, error: 'invalid-price' };

  const key = inventoryKey(postId, itemId);
  const now = state.clock.nowMicroseconds();
  const existing = state.inventory.get(key);

  if (existing) {
    existing.quantityAvailable += quantity;
    existing.lastUpdatedAt = now;
  } else {
    state.inventory.set(key, {
      postId,
      itemId,
      itemName,
      quantityAvailable: quantity,
      listPriceKalon: offerPriceKalon,
      lastUpdatedAt: now,
    });
  }

  const taxKalon = computeTax(quantity, offerPriceKalon, post.taxRateBps);
  const transaction: TradeTransaction = {
    transactionId: state.idGen.generate(),
    postId,
    traderId,
    itemId,
    quantity,
    pricePerUnitKalon: offerPriceKalon,
    taxKalon,
    type: 'SELL',
    executedAt: now,
  };

  state.transactions.get(postId)?.push(transaction);
  state.logger.info('Sell executed', { transactionId: transaction.transactionId, postId, itemId });
  return { success: true, transaction };
}

function buildSummary(state: TradingPostState, postId: PostId): PostSummary {
  const transactions = state.transactions.get(postId) ?? [];
  const totalVolumeKalon = transactions.reduce(
    (sum, t) => sum + t.quantity * t.pricePerUnitKalon + t.taxKalon,
    0n,
  );
  const itemCount = [...state.inventory.keys()].filter((k) => k.startsWith(`${postId}:`)).length;
  return {
    postId,
    totalItems: itemCount,
    totalTransactions: transactions.length,
    totalVolumeKalon,
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createTradingPostSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generate(): string };
  readonly logger: { info(msg: string, ctx: Record<string, unknown>): void };
}): TradingPostSystem {
  const state: TradingPostState = {
    posts: new Map(),
    traders: new Set(),
    inventory: new Map(),
    transactions: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerPost: (name, worldId, location, taxRateBps) =>
      registerPostImpl(state, name, worldId, location, taxRateBps),
    registerTrader: (traderId) => registerTraderImpl(state, traderId),
    listItem: (postId, itemId, itemName, quantity, priceKalon) =>
      listItemImpl(state, postId, itemId, itemName, quantity, priceKalon),
    restock: (postId, itemId, additionalQuantity) =>
      restockImpl(state, postId, itemId, additionalQuantity),
    buy: (postId, traderId, itemId, quantity) => buyImpl(state, postId, traderId, itemId, quantity),
    sell: (postId, traderId, itemId, itemName, quantity, offerPriceKalon) =>
      sellImpl(state, postId, traderId, itemId, itemName, quantity, offerPriceKalon),
    getInventory: (postId, itemId) => state.inventory.get(inventoryKey(postId, itemId)),
    getPostSummary: (postId) => {
      if (!state.posts.has(postId)) return undefined;
      return buildSummary(state, postId);
    },
    getTransactionHistory: (postId, limit) => {
      const all = state.transactions.get(postId) ?? [];
      return limit > 0 ? all.slice(-limit) : all;
    },
  };
}
