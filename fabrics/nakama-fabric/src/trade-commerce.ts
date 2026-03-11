/**
 * Trade Commerce Engine — Full marketplace trade lifecycle with escrow.
 *
 * Bible v1.2: Dynasties trade goods, resources, artifacts, territory rights,
 * services, and information for KALON. Every trade follows a strict lifecycle:
 *
 *   LISTED   -> Seller creates a listing with a KALON price
 *   ACCEPTED -> Buyer agrees, buyer KALON goes into escrow
 *   ESCROW   -> Funds held while goods are confirmed delivered
 *   COMPLETED -> Trade finalized, seller receives KALON (minus fee)
 *   CANCELLED -> Cancelled before completion (refund if escrowed)
 *   EXPIRED  -> Listing expired before acceptance
 *   DISPUTED -> Buyer or seller filed a dispute (frozen)
 *
 * Transaction fee: 0.5% to the Commons Fund on every completed trade.
 * All KALON amounts in BigInt micro-KALON (10^6 precision).
 */

// ── Port Types ─────────────────────────────────────────────────────

export interface TradeClock {
  readonly nowMicroseconds: () => number;
}

export interface TradeIdGenerator {
  readonly generate: () => string;
}

export interface TradeCommerceEscrowPort {
  readonly hold: (from: string, amount: bigint) => boolean;
  readonly release: (to: string, amount: bigint) => void;
  readonly refund: (to: string, amount: bigint) => void;
}

export interface TradeFeePort {
  readonly collectFee: (amount: bigint) => void;
}

// ── Types ──────────────────────────────────────────────────────────

export type TradeOfferPhase =
  | 'LISTED'
  | 'ACCEPTED'
  | 'ESCROW'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

export type TradeCategory =
  | 'RESOURCES'
  | 'ARTIFACTS'
  | 'TERRITORY_RIGHTS'
  | 'SERVICES'
  | 'INFORMATION';

export interface TradeOffer {
  readonly offerId: string;
  readonly sellerId: string;
  readonly buyerId: string | null;
  readonly worldId: string;
  readonly category: TradeCategory;
  readonly itemDescription: string;
  readonly priceKalon: bigint;
  readonly phase: TradeOfferPhase;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly completedAt: number | null;
}

export interface CreateOfferParams {
  readonly sellerId: string;
  readonly worldId: string;
  readonly category: TradeCategory;
  readonly itemDescription: string;
  readonly priceKalon: bigint;
}

export interface TradeCommerceConfig {
  readonly defaultExpirationUs: number;
  readonly minPriceKalon: bigint;
  readonly maxPriceKalon: bigint;
  readonly feeRateBasisPoints: number;
}

export interface TradeCommerceDeps {
  readonly clock: TradeClock;
  readonly idGenerator: TradeIdGenerator;
  readonly escrow: TradeCommerceEscrowPort;
  readonly feeCollector: TradeFeePort;
  readonly config?: Partial<TradeCommerceConfig>;
}

export interface PriceHistoryEntry {
  readonly category: TradeCategory;
  readonly worldId: string;
  readonly priceKalon: bigint;
  readonly completedAt: number;
}

export interface TradeCommerceStats {
  readonly totalListed: number;
  readonly totalCompleted: number;
  readonly totalCancelled: number;
  readonly totalExpired: number;
  readonly totalDisputed: number;
  readonly totalFeesCollected: bigint;
  readonly activeTrades: number;
}

export interface TradeCommerceEngine {
  readonly createOffer: (params: CreateOfferParams) => TradeOffer;
  readonly acceptOffer: (offerId: string, buyerId: string) => TradeOffer;
  readonly confirmDelivery: (offerId: string) => TradeOffer;
  readonly cancelOffer: (offerId: string, cancelledBy: string) => TradeOffer;
  readonly disputeOffer: (offerId: string, filedBy: string) => TradeOffer;
  readonly resolveDispute: (offerId: string, refundBuyer: boolean) => TradeOffer;
  readonly getOffer: (offerId: string) => TradeOffer | undefined;
  readonly listBySeller: (sellerId: string) => ReadonlyArray<TradeOffer>;
  readonly listByBuyer: (buyerId: string) => ReadonlyArray<TradeOffer>;
  readonly listByWorld: (worldId: string) => ReadonlyArray<TradeOffer>;
  readonly listActive: () => ReadonlyArray<TradeOffer>;
  readonly sweep: () => number;
  readonly getPriceHistory: (
    category: TradeCategory,
    worldId: string,
  ) => ReadonlyArray<PriceHistoryEntry>;
  readonly getStats: () => TradeCommerceStats;
}

// ── Constants ──────────────────────────────────────────────────────

const ONE_HOUR_US = 3_600_000_000;
const TWENTY_FOUR_HOURS_US = ONE_HOUR_US * 24;

export const DEFAULT_COMMERCE_CONFIG: TradeCommerceConfig = {
  defaultExpirationUs: TWENTY_FOUR_HOURS_US,
  minPriceKalon: 1n,
  maxPriceKalon: 1_000_000_000_000n,
  feeRateBasisPoints: 50,
};

const TERMINAL_PHASES: ReadonlyArray<TradeOfferPhase> = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

// ── State ──────────────────────────────────────────────────────────

interface MutableOffer {
  readonly offerId: string;
  readonly sellerId: string;
  buyerId: string | null;
  readonly worldId: string;
  readonly category: TradeCategory;
  readonly itemDescription: string;
  readonly priceKalon: bigint;
  phase: TradeOfferPhase;
  readonly createdAt: number;
  readonly expiresAt: number;
  completedAt: number | null;
}

interface CommerceState {
  readonly offers: Map<string, MutableOffer>;
  readonly priceHistory: PriceHistoryEntry[];
  readonly clock: TradeClock;
  readonly idGenerator: TradeIdGenerator;
  readonly escrow: TradeCommerceEscrowPort;
  readonly feeCollector: TradeFeePort;
  readonly config: TradeCommerceConfig;
  totalListed: number;
  totalCompleted: number;
  totalCancelled: number;
  totalExpired: number;
  totalDisputed: number;
  totalFeesCollected: bigint;
}

// ── Factory ────────────────────────────────────────────────────────

function initState(deps: TradeCommerceDeps): CommerceState {
  return {
    offers: new Map(),
    priceHistory: [],
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    escrow: deps.escrow,
    feeCollector: deps.feeCollector,
    config: mergeConfig(deps.config),
    totalListed: 0,
    totalCompleted: 0,
    totalCancelled: 0,
    totalExpired: 0,
    totalDisputed: 0,
    totalFeesCollected: 0n,
  };
}

export function createTradeCommerceEngine(deps: TradeCommerceDeps): TradeCommerceEngine {
  const state = initState(deps);
  return buildEngine(state);
}

function buildEngine(state: CommerceState): TradeCommerceEngine {
  return {
    createOffer: (p) => createOfferImpl(state, p),
    acceptOffer: (oid, bid) => acceptOfferImpl(state, oid, bid),
    confirmDelivery: (oid) => confirmDeliveryImpl(state, oid),
    cancelOffer: (oid, by) => cancelOfferImpl(state, oid, by),
    disputeOffer: (oid, by) => disputeOfferImpl(state, oid, by),
    resolveDispute: (oid, refund) => resolveDisputeImpl(state, oid, refund),
    getOffer: (oid) => getOfferImpl(state, oid),
    listBySeller: (sid) => listBySellerImpl(state, sid),
    listByBuyer: (bid) => listByBuyerImpl(state, bid),
    listByWorld: (wid) => listByWorldImpl(state, wid),
    listActive: () => listActiveImpl(state),
    sweep: () => sweepImpl(state),
    getPriceHistory: (cat, wid) => getPriceHistoryImpl(state, cat, wid),
    getStats: () => computeStats(state),
  };
}

function mergeConfig(overrides?: Partial<TradeCommerceConfig>): TradeCommerceConfig {
  if (overrides === undefined) return DEFAULT_COMMERCE_CONFIG;
  return {
    defaultExpirationUs:
      overrides.defaultExpirationUs ?? DEFAULT_COMMERCE_CONFIG.defaultExpirationUs,
    minPriceKalon: overrides.minPriceKalon ?? DEFAULT_COMMERCE_CONFIG.minPriceKalon,
    maxPriceKalon: overrides.maxPriceKalon ?? DEFAULT_COMMERCE_CONFIG.maxPriceKalon,
    feeRateBasisPoints: overrides.feeRateBasisPoints ?? DEFAULT_COMMERCE_CONFIG.feeRateBasisPoints,
  };
}

// ── Create Offer ───────────────────────────────────────────────────

function validateCreateOffer(state: CommerceState, params: CreateOfferParams): void {
  if (params.priceKalon < state.config.minPriceKalon) {
    throw new Error('Price below minimum: ' + String(params.priceKalon));
  }
  if (params.priceKalon > state.config.maxPriceKalon) {
    throw new Error('Price exceeds maximum: ' + String(params.priceKalon));
  }
  if (params.itemDescription.length === 0) {
    throw new Error('Item description cannot be empty');
  }
}

function createOfferImpl(state: CommerceState, params: CreateOfferParams): TradeOffer {
  validateCreateOffer(state, params);
  const now = state.clock.nowMicroseconds();
  const offerId = state.idGenerator.generate();
  const offer: MutableOffer = {
    offerId,
    sellerId: params.sellerId,
    buyerId: null,
    worldId: params.worldId,
    category: params.category,
    itemDescription: params.itemDescription,
    priceKalon: params.priceKalon,
    phase: 'LISTED',
    createdAt: now,
    expiresAt: now + state.config.defaultExpirationUs,
    completedAt: null,
  };
  state.offers.set(offerId, offer);
  state.totalListed++;
  return toReadonly(offer);
}

// ── Accept Offer ───────────────────────────────────────────────────

function acceptOfferImpl(state: CommerceState, offerId: string, buyerId: string): TradeOffer {
  const offer = requireOffer(state, offerId);
  checkExpiry(state, offer);
  if (offer.phase !== 'LISTED') {
    throw new Error('Offer ' + offerId + ' is not LISTED');
  }
  if (buyerId === offer.sellerId) {
    throw new Error('Seller cannot buy own offer');
  }
  const held = state.escrow.hold(buyerId, offer.priceKalon);
  if (!held) {
    throw new Error('Buyer has insufficient balance for escrow');
  }
  offer.buyerId = buyerId;
  offer.phase = 'ESCROW';
  return toReadonly(offer);
}

// ── Confirm Delivery ───────────────────────────────────────────────

function confirmDeliveryImpl(state: CommerceState, offerId: string): TradeOffer {
  const offer = requireOffer(state, offerId);
  if (offer.phase !== 'ESCROW') {
    throw new Error('Offer ' + offerId + ' is not in ESCROW');
  }
  const fee = calculateFee(offer.priceKalon, state.config.feeRateBasisPoints);
  const sellerReceives = offer.priceKalon - fee;
  state.escrow.release(offer.sellerId, sellerReceives);
  state.feeCollector.collectFee(fee);
  state.totalFeesCollected += fee;
  offer.phase = 'COMPLETED';
  offer.completedAt = state.clock.nowMicroseconds();
  state.totalCompleted++;
  recordPriceHistory(state, offer);
  return toReadonly(offer);
}

// ── Cancel Offer ───────────────────────────────────────────────────

function cancelOfferImpl(state: CommerceState, offerId: string, cancelledBy: string): TradeOffer {
  const offer = requireOffer(state, offerId);
  if (isTerminal(offer.phase)) {
    throw new Error('Offer ' + offerId + ' is already terminal');
  }
  if (offer.phase === 'DISPUTED') {
    throw new Error('Cannot cancel a disputed offer');
  }
  const isParty = cancelledBy === offer.sellerId || cancelledBy === offer.buyerId;
  if (!isParty) {
    throw new Error('Only trade parties can cancel');
  }
  if (offer.phase === 'ESCROW' && offer.buyerId !== null) {
    state.escrow.refund(offer.buyerId, offer.priceKalon);
  }
  offer.phase = 'CANCELLED';
  state.totalCancelled++;
  return toReadonly(offer);
}

// ── Dispute ────────────────────────────────────────────────────────

function disputeOfferImpl(state: CommerceState, offerId: string, filedBy: string): TradeOffer {
  const offer = requireOffer(state, offerId);
  if (offer.phase !== 'ESCROW') {
    throw new Error('Only ESCROW offers can be disputed');
  }
  const isParty = filedBy === offer.sellerId || filedBy === offer.buyerId;
  if (!isParty) {
    throw new Error('Only trade parties can file disputes');
  }
  offer.phase = 'DISPUTED';
  state.totalDisputed++;
  return toReadonly(offer);
}

function resolveDisputeImpl(
  state: CommerceState,
  offerId: string,
  refundBuyer: boolean,
): TradeOffer {
  const offer = requireOffer(state, offerId);
  if (offer.phase !== 'DISPUTED') {
    throw new Error('Offer ' + offerId + ' is not DISPUTED');
  }
  if (refundBuyer && offer.buyerId !== null) {
    state.escrow.refund(offer.buyerId, offer.priceKalon);
    offer.phase = 'CANCELLED';
    state.totalCancelled++;
  } else {
    const fee = calculateFee(offer.priceKalon, state.config.feeRateBasisPoints);
    const sellerReceives = offer.priceKalon - fee;
    state.escrow.release(offer.sellerId, sellerReceives);
    state.feeCollector.collectFee(fee);
    state.totalFeesCollected += fee;
    offer.phase = 'COMPLETED';
    offer.completedAt = state.clock.nowMicroseconds();
    state.totalCompleted++;
    recordPriceHistory(state, offer);
  }
  return toReadonly(offer);
}

// ── Queries ────────────────────────────────────────────────────────

function getOfferImpl(state: CommerceState, offerId: string): TradeOffer | undefined {
  const offer = state.offers.get(offerId);
  if (offer === undefined) return undefined;
  checkExpiry(state, offer);
  return toReadonly(offer);
}

function listBySellerImpl(state: CommerceState, sellerId: string): TradeOffer[] {
  const results: TradeOffer[] = [];
  for (const offer of state.offers.values()) {
    checkExpiry(state, offer);
    if (offer.sellerId === sellerId) results.push(toReadonly(offer));
  }
  return results;
}

function listByBuyerImpl(state: CommerceState, buyerId: string): TradeOffer[] {
  const results: TradeOffer[] = [];
  for (const offer of state.offers.values()) {
    checkExpiry(state, offer);
    if (offer.buyerId === buyerId) results.push(toReadonly(offer));
  }
  return results;
}

function listByWorldImpl(state: CommerceState, worldId: string): TradeOffer[] {
  const results: TradeOffer[] = [];
  for (const offer of state.offers.values()) {
    checkExpiry(state, offer);
    if (offer.worldId === worldId) results.push(toReadonly(offer));
  }
  return results;
}

function listActiveImpl(state: CommerceState): TradeOffer[] {
  const results: TradeOffer[] = [];
  for (const offer of state.offers.values()) {
    checkExpiry(state, offer);
    if (!isTerminal(offer.phase)) results.push(toReadonly(offer));
  }
  return results;
}

// ── Sweep & Price History ──────────────────────────────────────────

function sweepImpl(state: CommerceState): number {
  const toRemove: string[] = [];
  for (const offer of state.offers.values()) {
    checkExpiry(state, offer);
    if (isTerminal(offer.phase)) toRemove.push(offer.offerId);
  }
  for (const oid of toRemove) {
    state.offers.delete(oid);
  }
  return toRemove.length;
}

function getPriceHistoryImpl(
  state: CommerceState,
  category: TradeCategory,
  worldId: string,
): PriceHistoryEntry[] {
  return state.priceHistory.filter((e) => e.category === category && e.worldId === worldId);
}

function recordPriceHistory(state: CommerceState, offer: MutableOffer): void {
  state.priceHistory.push({
    category: offer.category,
    worldId: offer.worldId,
    priceKalon: offer.priceKalon,
    completedAt: offer.completedAt ?? state.clock.nowMicroseconds(),
  });
}

// ── Stats ──────────────────────────────────────────────────────────

function computeStats(state: CommerceState): TradeCommerceStats {
  let activeTrades = 0;
  for (const offer of state.offers.values()) {
    checkExpiry(state, offer);
    if (!isTerminal(offer.phase)) activeTrades++;
  }
  return {
    totalListed: state.totalListed,
    totalCompleted: state.totalCompleted,
    totalCancelled: state.totalCancelled,
    totalExpired: state.totalExpired,
    totalDisputed: state.totalDisputed,
    totalFeesCollected: state.totalFeesCollected,
    activeTrades,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function requireOffer(state: CommerceState, offerId: string): MutableOffer {
  const offer = state.offers.get(offerId);
  if (offer === undefined) {
    throw new Error('Offer ' + offerId + ' not found');
  }
  return offer;
}

function checkExpiry(state: CommerceState, offer: MutableOffer): void {
  if (isTerminal(offer.phase) || offer.phase === 'DISPUTED') return;
  if (offer.phase !== 'LISTED') return;
  const now = state.clock.nowMicroseconds();
  if (now >= offer.expiresAt) {
    offer.phase = 'EXPIRED';
    state.totalExpired++;
  }
}

function isTerminal(phase: TradeOfferPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

function calculateFee(amount: bigint, rateBasisPoints: number): bigint {
  return (amount * BigInt(rateBasisPoints)) / 10_000n;
}

function toReadonly(offer: MutableOffer): TradeOffer {
  return {
    offerId: offer.offerId,
    sellerId: offer.sellerId,
    buyerId: offer.buyerId,
    worldId: offer.worldId,
    category: offer.category,
    itemDescription: offer.itemDescription,
    priceKalon: offer.priceKalon,
    phase: offer.phase,
    createdAt: offer.createdAt,
    expiresAt: offer.expiresAt,
    completedAt: offer.completedAt,
  };
}
