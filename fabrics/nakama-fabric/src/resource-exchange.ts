/**
 * Resource Exchange — Order-book marketplace for resource trading.
 *
 * Dynasties trade 8 resource types through buy/sell limit orders.
 * Orders are matched via price-time priority. Maker/taker fee
 * separation incentivises liquidity provision. Each dynasty has
 * a maximum number of open orders to prevent spam.
 *
 * Order Lifecycle:
 *   open      → Order placed, awaiting match
 *   filled    → Fully matched against counterparty (terminal)
 *   partial   → Partially filled, remainder still open
 *   cancelled → Removed by placer before fill (terminal)
 */

// ─── Port Interfaces ─────────────────────────────────────────────────

interface ExchangeClockPort {
  readonly nowMicroseconds: () => number;
}

interface ExchangeIdGeneratorPort {
  readonly next: () => string;
}

interface ExchangeKalonPort {
  readonly debit: (dynastyId: string, amount: bigint) => boolean;
  readonly credit: (dynastyId: string, amount: bigint) => void;
}

interface ExchangeDeps {
  readonly clock: ExchangeClockPort;
  readonly idGenerator: ExchangeIdGeneratorPort;
  readonly kalon: ExchangeKalonPort;
}

// ─── Types ───────────────────────────────────────────────────────────

type ResourceType =
  | 'minerals'
  | 'energy'
  | 'food'
  | 'technology'
  | 'alloys'
  | 'textiles'
  | 'medicine'
  | 'luxuries';

type OrderSide = 'buy' | 'sell';

type OrderStatus = 'open' | 'filled' | 'partial' | 'cancelled';

type ExchangeError =
  | 'ORDER_NOT_FOUND'
  | 'MAX_ORDERS_REACHED'
  | 'INVALID_QUANTITY'
  | 'INVALID_PRICE'
  | 'INSUFFICIENT_FUNDS'
  | 'ALREADY_TERMINAL'
  | 'NOT_ORDER_OWNER';

interface ExchangeOrder {
  readonly orderId: string;
  readonly dynastyId: string;
  readonly resource: ResourceType;
  readonly side: OrderSide;
  readonly pricePerUnit: bigint;
  readonly quantity: number;
  readonly filledQuantity: number;
  readonly status: OrderStatus;
  readonly createdAt: number;
}

interface PlaceOrderParams {
  readonly dynastyId: string;
  readonly resource: ResourceType;
  readonly side: OrderSide;
  readonly pricePerUnit: bigint;
  readonly quantity: number;
}

interface ExchangeTransaction {
  readonly transactionId: string;
  readonly resource: ResourceType;
  readonly buyOrderId: string;
  readonly sellOrderId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly pricePerUnit: bigint;
  readonly quantity: number;
  readonly makerFee: bigint;
  readonly takerFee: bigint;
  readonly executedAt: number;
}

interface PricePoint {
  readonly pricePerUnit: bigint;
  readonly timestamp: number;
  readonly quantity: number;
}

interface MarketDepth {
  readonly resource: ResourceType;
  readonly bids: readonly DepthLevel[];
  readonly asks: readonly DepthLevel[];
}

interface DepthLevel {
  readonly pricePerUnit: bigint;
  readonly totalQuantity: number;
  readonly orderCount: number;
}

interface ExchangeStats {
  readonly totalOrdersPlaced: number;
  readonly totalOrdersFilled: number;
  readonly totalOrdersCancelled: number;
  readonly totalTransactions: number;
  readonly activeOrders: number;
}

interface ResourceExchangeService {
  readonly placeOrder: (params: PlaceOrderParams) => ExchangeOrder | ExchangeError;
  readonly cancelOrder: (orderId: string, dynastyId: string) => ExchangeOrder | ExchangeError;
  readonly matchOrders: (resource: ResourceType) => readonly ExchangeTransaction[];
  readonly getOrderBook: (resource: ResourceType) => readonly ExchangeOrder[];
  readonly getPriceHistory: (resource: ResourceType, limit: number) => readonly PricePoint[];
  readonly getMarketDepth: (resource: ResourceType) => MarketDepth;
  readonly getOrdersByDynasty: (dynastyId: string) => readonly ExchangeOrder[];
  readonly getOrder: (orderId: string) => ExchangeOrder | undefined;
  readonly getStats: () => ExchangeStats;
}

// ─── Constants ───────────────────────────────────────────────────────

const MAX_ORDERS_PER_DYNASTY = 50;
const MIN_ORDER_SIZE = 1;
const MAKER_FEE_BPS = 10n;
const TAKER_FEE_BPS = 25n;
const BPS_DIVISOR = 10000n;
const MAX_PRICE_HISTORY = 1000;

const ALL_RESOURCES: readonly ResourceType[] = [
  'minerals',
  'energy',
  'food',
  'technology',
  'alloys',
  'textiles',
  'medicine',
  'luxuries',
];

// ─── Internal State ──────────────────────────────────────────────────

interface MutableOrder {
  readonly orderId: string;
  readonly dynastyId: string;
  readonly resource: ResourceType;
  readonly side: OrderSide;
  readonly pricePerUnit: bigint;
  readonly quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  readonly createdAt: number;
}

interface ResourceOrderBook {
  readonly buys: MutableOrder[];
  readonly sells: MutableOrder[];
}

interface ExchangeState {
  readonly deps: ExchangeDeps;
  readonly orders: Map<string, MutableOrder>;
  readonly books: Map<ResourceType, ResourceOrderBook>;
  readonly transactions: ExchangeTransaction[];
  readonly priceHistory: Map<ResourceType, PricePoint[]>;
  readonly dynastyOrderCount: Map<string, number>;
  totalOrdersPlaced: number;
  totalOrdersFilled: number;
  totalOrdersCancelled: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

function createResourceExchange(deps: ExchangeDeps): ResourceExchangeService {
  const state: ExchangeState = {
    deps,
    orders: new Map(),
    books: initBooks(),
    transactions: [],
    priceHistory: initPriceHistory(),
    dynastyOrderCount: new Map(),
    totalOrdersPlaced: 0,
    totalOrdersFilled: 0,
    totalOrdersCancelled: 0,
  };

  return {
    placeOrder: (p) => placeOrderImpl(state, p),
    cancelOrder: (oid, did) => cancelOrderImpl(state, oid, did),
    matchOrders: (r) => matchOrdersImpl(state, r),
    getOrderBook: (r) => getOrderBookImpl(state, r),
    getPriceHistory: (r, lim) => getPriceHistoryImpl(state, r, lim),
    getMarketDepth: (r) => getMarketDepthImpl(state, r),
    getOrdersByDynasty: (did) => getOrdersByDynastyImpl(state, did),
    getOrder: (oid) => getOrderImpl(state, oid),
    getStats: () => getStatsImpl(state),
  };
}

function initBooks(): Map<ResourceType, ResourceOrderBook> {
  const books = new Map<ResourceType, ResourceOrderBook>();
  for (const r of ALL_RESOURCES) {
    books.set(r, { buys: [], sells: [] });
  }
  return books;
}

function initPriceHistory(): Map<ResourceType, PricePoint[]> {
  const history = new Map<ResourceType, PricePoint[]>();
  for (const r of ALL_RESOURCES) {
    history.set(r, []);
  }
  return history;
}

// ─── Place Order ─────────────────────────────────────────────────────

function validateOrder(state: ExchangeState, params: PlaceOrderParams): ExchangeError | null {
  if (params.quantity < MIN_ORDER_SIZE) return 'INVALID_QUANTITY';
  if (params.pricePerUnit <= 0n) return 'INVALID_PRICE';
  const currentCount = state.dynastyOrderCount.get(params.dynastyId) ?? 0;
  if (currentCount >= MAX_ORDERS_PER_DYNASTY) return 'MAX_ORDERS_REACHED';
  return null;
}

function placeOrderImpl(
  state: ExchangeState,
  params: PlaceOrderParams,
): ExchangeOrder | ExchangeError {
  const validationError = validateOrder(state, params);
  if (validationError !== null) return validationError;

  if (params.side === 'buy') {
    const cost = params.pricePerUnit * BigInt(params.quantity);
    const debited = state.deps.kalon.debit(params.dynastyId, cost);
    if (!debited) return 'INSUFFICIENT_FUNDS';
  }

  const order = buildOrder(state, params);
  insertOrder(state, order);
  return toReadonlyOrder(order);
}

function buildOrder(state: ExchangeState, params: PlaceOrderParams): MutableOrder {
  return {
    orderId: state.deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    resource: params.resource,
    side: params.side,
    pricePerUnit: params.pricePerUnit,
    quantity: params.quantity,
    filledQuantity: 0,
    status: 'open',
    createdAt: state.deps.clock.nowMicroseconds(),
  };
}

function insertOrder(state: ExchangeState, order: MutableOrder): void {
  state.orders.set(order.orderId, order);
  const book = state.books.get(order.resource);
  if (book === undefined) return;
  if (order.side === 'buy') {
    book.buys.push(order);
  } else {
    book.sells.push(order);
  }
  incrementDynastyCount(state, order.dynastyId);
  state.totalOrdersPlaced++;
}

function incrementDynastyCount(state: ExchangeState, dynastyId: string): void {
  const current = state.dynastyOrderCount.get(dynastyId) ?? 0;
  state.dynastyOrderCount.set(dynastyId, current + 1);
}

function decrementDynastyCount(state: ExchangeState, dynastyId: string): void {
  const current = state.dynastyOrderCount.get(dynastyId) ?? 0;
  if (current > 0) {
    state.dynastyOrderCount.set(dynastyId, current - 1);
  }
}

// ─── Cancel Order ────────────────────────────────────────────────────

function cancelOrderImpl(
  state: ExchangeState,
  orderId: string,
  dynastyId: string,
): ExchangeOrder | ExchangeError {
  const order = state.orders.get(orderId);
  if (order === undefined) return 'ORDER_NOT_FOUND';
  if (order.dynastyId !== dynastyId) return 'NOT_ORDER_OWNER';
  if (order.status === 'filled' || order.status === 'cancelled') return 'ALREADY_TERMINAL';

  order.status = 'cancelled';
  refundRemainder(state, order);
  removeFromBook(state, order);
  decrementDynastyCount(state, order.dynastyId);
  state.totalOrdersCancelled++;
  return toReadonlyOrder(order);
}

function refundRemainder(state: ExchangeState, order: MutableOrder): void {
  if (order.side !== 'buy') return;
  const remaining = order.quantity - order.filledQuantity;
  if (remaining <= 0) return;
  const refundAmount = order.pricePerUnit * BigInt(remaining);
  state.deps.kalon.credit(order.dynastyId, refundAmount);
}

function removeFromBook(state: ExchangeState, order: MutableOrder): void {
  const book = state.books.get(order.resource);
  if (book === undefined) return;
  const list = order.side === 'buy' ? book.buys : book.sells;
  const idx = list.indexOf(order);
  if (idx >= 0) list.splice(idx, 1);
}

// ─── Match Orders ────────────────────────────────────────────────────

function matchOrdersImpl(
  state: ExchangeState,
  resource: ResourceType,
): readonly ExchangeTransaction[] {
  const book = state.books.get(resource);
  if (book === undefined) return [];

  sortBuysDescending(book.buys);
  sortSellsAscending(book.sells);

  const matched: ExchangeTransaction[] = [];
  matchBookOrders(state, book, resource, matched);
  cleanFilledOrders(state, book);
  return matched;
}

function sortBuysDescending(buys: MutableOrder[]): void {
  buys.sort((a, b) => {
    const priceDiff = Number(b.pricePerUnit - a.pricePerUnit);
    if (priceDiff !== 0) return priceDiff;
    return a.createdAt - b.createdAt;
  });
}

function sortSellsAscending(sells: MutableOrder[]): void {
  sells.sort((a, b) => {
    const priceDiff = Number(a.pricePerUnit - b.pricePerUnit);
    if (priceDiff !== 0) return priceDiff;
    return a.createdAt - b.createdAt;
  });
}

function matchBookOrders(
  state: ExchangeState,
  book: ResourceOrderBook,
  resource: ResourceType,
  matched: ExchangeTransaction[],
): void {
  let buyIdx = 0;
  let sellIdx = 0;
  while (buyIdx < book.buys.length && sellIdx < book.sells.length) {
    const buy = book.buys[buyIdx];
    const sell = book.sells[sellIdx];
    if (buy === undefined || sell === undefined) break;
    if (!canMatch(buy, sell)) break;
    const txn = executeMatch(state, buy, sell, resource);
    matched.push(txn);
    if (remainingQty(buy) <= 0) buyIdx++;
    if (remainingQty(sell) <= 0) sellIdx++;
  }
}

function canMatch(buy: MutableOrder, sell: MutableOrder): boolean {
  if (buy.dynastyId === sell.dynastyId) return false;
  return buy.pricePerUnit >= sell.pricePerUnit;
}

function remainingQty(order: MutableOrder): number {
  return order.quantity - order.filledQuantity;
}

function executeMatch(
  state: ExchangeState,
  buy: MutableOrder,
  sell: MutableOrder,
  resource: ResourceType,
): ExchangeTransaction {
  const matchQty = Math.min(remainingQty(buy), remainingQty(sell));
  const matchPrice = sell.pricePerUnit;
  const totalCost = matchPrice * BigInt(matchQty);

  const makerFee = computeFee(totalCost, MAKER_FEE_BPS);
  const takerFee = computeFee(totalCost, TAKER_FEE_BPS);

  settleFunds(state, buy, sell, totalCost, makerFee, takerFee);
  updateFillStatus(buy, matchQty);
  updateFillStatus(sell, matchQty);
  recordPricePoint(state, resource, matchPrice, matchQty);

  const txn = buildTransaction(
    state,
    buy,
    sell,
    resource,
    matchPrice,
    matchQty,
    makerFee,
    takerFee,
  );
  state.transactions.push(txn);
  return txn;
}

function computeFee(amount: bigint, bps: bigint): bigint {
  return (amount * bps) / BPS_DIVISOR;
}

function settleFunds(
  state: ExchangeState,
  buy: MutableOrder,
  sell: MutableOrder,
  totalCost: bigint,
  _makerFee: bigint,
  _takerFee: bigint,
): void {
  const buyerRefund =
    buy.pricePerUnit * BigInt(Math.min(remainingQty(buy), remainingQty(sell))) - totalCost;
  if (buyerRefund > 0n) {
    state.deps.kalon.credit(buy.dynastyId, buyerRefund);
  }
  const sellerProceeds = totalCost - _makerFee;
  state.deps.kalon.credit(sell.dynastyId, sellerProceeds);
}

function updateFillStatus(order: MutableOrder, qty: number): void {
  order.filledQuantity += qty;
  if (order.filledQuantity >= order.quantity) {
    order.status = 'filled';
  } else {
    order.status = 'partial';
  }
}

function recordPricePoint(
  state: ExchangeState,
  resource: ResourceType,
  price: bigint,
  quantity: number,
): void {
  const history = state.priceHistory.get(resource);
  if (history === undefined) return;
  history.push({
    pricePerUnit: price,
    timestamp: state.deps.clock.nowMicroseconds(),
    quantity,
  });
  if (history.length > MAX_PRICE_HISTORY) {
    history.splice(0, history.length - MAX_PRICE_HISTORY);
  }
}

function buildTransaction(
  state: ExchangeState,
  buy: MutableOrder,
  sell: MutableOrder,
  resource: ResourceType,
  price: bigint,
  quantity: number,
  makerFee: bigint,
  takerFee: bigint,
): ExchangeTransaction {
  return {
    transactionId: state.deps.idGenerator.next(),
    resource,
    buyOrderId: buy.orderId,
    sellOrderId: sell.orderId,
    buyerId: buy.dynastyId,
    sellerId: sell.dynastyId,
    pricePerUnit: price,
    quantity,
    makerFee,
    takerFee,
    executedAt: state.deps.clock.nowMicroseconds(),
  };
}

function cleanFilledOrders(state: ExchangeState, book: ResourceOrderBook): void {
  cleanFilledFromList(state, book.buys);
  cleanFilledFromList(state, book.sells);
}

function cleanFilledFromList(state: ExchangeState, list: MutableOrder[]): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const order = list[i];
    if (order !== undefined && order.status === 'filled') {
      list.splice(i, 1);
      decrementDynastyCount(state, order.dynastyId);
      state.totalOrdersFilled++;
    }
  }
}

// ─── Queries ─────────────────────────────────────────────────────────

function getOrderBookImpl(state: ExchangeState, resource: ResourceType): readonly ExchangeOrder[] {
  const book = state.books.get(resource);
  if (book === undefined) return [];
  const result: ExchangeOrder[] = [];
  for (const o of book.buys) result.push(toReadonlyOrder(o));
  for (const o of book.sells) result.push(toReadonlyOrder(o));
  return result;
}

function getPriceHistoryImpl(
  state: ExchangeState,
  resource: ResourceType,
  limit: number,
): readonly PricePoint[] {
  const history = state.priceHistory.get(resource);
  if (history === undefined) return [];
  if (limit >= history.length) return [...history];
  return history.slice(history.length - limit);
}

function getMarketDepthImpl(state: ExchangeState, resource: ResourceType): MarketDepth {
  const book = state.books.get(resource);
  if (book === undefined) {
    return { resource, bids: [], asks: [] };
  }
  return {
    resource,
    bids: aggregateDepth(book.buys),
    asks: aggregateDepth(book.sells),
  };
}

function aggregateDepth(orders: readonly MutableOrder[]): readonly DepthLevel[] {
  const levelMap = new Map<bigint, { totalQuantity: number; orderCount: number }>();
  for (const order of orders) {
    if (order.status === 'filled' || order.status === 'cancelled') continue;
    const existing = levelMap.get(order.pricePerUnit);
    const qty = remainingQty(order);
    if (existing !== undefined) {
      existing.totalQuantity += qty;
      existing.orderCount += 1;
    } else {
      levelMap.set(order.pricePerUnit, { totalQuantity: qty, orderCount: 1 });
    }
  }
  const levels: DepthLevel[] = [];
  for (const [price, data] of levelMap.entries()) {
    levels.push({
      pricePerUnit: price,
      totalQuantity: data.totalQuantity,
      orderCount: data.orderCount,
    });
  }
  return levels;
}

function getOrdersByDynastyImpl(state: ExchangeState, dynastyId: string): readonly ExchangeOrder[] {
  const result: ExchangeOrder[] = [];
  for (const order of state.orders.values()) {
    if (order.dynastyId === dynastyId) {
      result.push(toReadonlyOrder(order));
    }
  }
  return result;
}

function getOrderImpl(state: ExchangeState, orderId: string): ExchangeOrder | undefined {
  const order = state.orders.get(orderId);
  if (order === undefined) return undefined;
  return toReadonlyOrder(order);
}

function getStatsImpl(state: ExchangeState): ExchangeStats {
  let activeOrders = 0;
  for (const order of state.orders.values()) {
    if (order.status === 'open' || order.status === 'partial') {
      activeOrders++;
    }
  }
  return {
    totalOrdersPlaced: state.totalOrdersPlaced,
    totalOrdersFilled: state.totalOrdersFilled,
    totalOrdersCancelled: state.totalOrdersCancelled,
    totalTransactions: state.transactions.length,
    activeOrders,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function toReadonlyOrder(order: MutableOrder): ExchangeOrder {
  return {
    orderId: order.orderId,
    dynastyId: order.dynastyId,
    resource: order.resource,
    side: order.side,
    pricePerUnit: order.pricePerUnit,
    quantity: order.quantity,
    filledQuantity: order.filledQuantity,
    status: order.status,
    createdAt: order.createdAt,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────

export {
  createResourceExchange,
  MAX_ORDERS_PER_DYNASTY,
  MIN_ORDER_SIZE,
  MAKER_FEE_BPS,
  TAKER_FEE_BPS,
  ALL_RESOURCES,
};

export type {
  ResourceExchangeService,
  ExchangeDeps,
  ExchangeClockPort,
  ExchangeIdGeneratorPort,
  ExchangeKalonPort,
  ResourceType,
  OrderSide,
  OrderStatus,
  ExchangeError,
  ExchangeOrder,
  PlaceOrderParams,
  ExchangeTransaction,
  PricePoint,
  MarketDepth,
  DepthLevel,
  ExchangeStats,
};
