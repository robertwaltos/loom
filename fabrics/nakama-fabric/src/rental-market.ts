/**
 * Rental Market — Property and item rental with payment schedules.
 *
 * Landlords create listings for properties or items. Tenants start rentals
 * by making an initial payment covering one or more periods. Ongoing payments
 * extend the rental period. The system tracks all payment history and
 * computes market-wide volume statistics.
 *
 * All KALON amounts in bigint micro-KALON (10^6 precision).
 * All timestamps in bigint microseconds.
 */

export type RentalId = string;
export type LandlordId = string;
export type TenantId = string;
export type ListingId = string;

export type RentalStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DEFAULTED';

export type RentalError =
  | 'listing-not-found'
  | 'rental-not-found'
  | 'already-rented'
  | 'invalid-duration'
  | 'invalid-amount'
  | 'not-tenant'
  | 'rental-ended';

export interface RentalListing {
  readonly listingId: ListingId;
  readonly landlordId: LandlordId;
  readonly itemDescription: string;
  readonly pricePerPeriodKalon: bigint;
  readonly periodUs: bigint;
  readonly worldId: string;
  readonly available: boolean;
}

export interface Rental {
  readonly rentalId: RentalId;
  readonly listingId: ListingId;
  readonly landlordId: LandlordId;
  readonly tenantId: TenantId;
  readonly pricePerPeriodKalon: bigint;
  readonly periodUs: bigint;
  readonly startedAt: bigint;
  readonly currentPeriodEndsAt: bigint;
  readonly totalPaid: bigint;
  readonly status: RentalStatus;
}

export interface RentalPayment {
  readonly paymentId: string;
  readonly rentalId: RentalId;
  readonly amountKalon: bigint;
  readonly paidAt: bigint;
  readonly periodsCovered: number;
}

export interface RentalMarketStats {
  readonly totalListings: number;
  readonly availableListings: number;
  readonly activeRentals: number;
  readonly totalVolumeKalon: bigint;
}

export interface RentalMarketSystem {
  createListing(
    landlordId: LandlordId,
    itemDescription: string,
    pricePerPeriodKalon: bigint,
    periodUs: bigint,
    worldId: string,
  ): RentalListing | RentalError;
  startRental(
    listingId: ListingId,
    tenantId: TenantId,
    initialPaymentKalon: bigint,
  ):
    | { readonly success: true; readonly rental: Rental; readonly payment: RentalPayment }
    | { readonly success: false; readonly error: RentalError };
  makePayment(
    rentalId: RentalId,
    tenantId: TenantId,
    amountKalon: bigint,
  ):
    | { readonly success: true; readonly payment: RentalPayment; readonly periodsExtended: number }
    | { readonly success: false; readonly error: RentalError };
  terminateRental(
    rentalId: RentalId,
    tenantId: TenantId,
  ): { readonly success: true } | { readonly success: false; readonly error: RentalError };
  defaultRental(
    rentalId: RentalId,
  ): { readonly success: true } | { readonly success: false; readonly error: RentalError };
  getListing(listingId: ListingId): RentalListing | undefined;
  getRental(rentalId: RentalId): Rental | undefined;
  getPaymentHistory(rentalId: RentalId): ReadonlyArray<RentalPayment>;
  getStats(): RentalMarketStats;
}

interface MutableListing {
  readonly listingId: ListingId;
  readonly landlordId: LandlordId;
  readonly itemDescription: string;
  readonly pricePerPeriodKalon: bigint;
  readonly periodUs: bigint;
  readonly worldId: string;
  available: boolean;
}

interface MutableRental {
  readonly rentalId: RentalId;
  readonly listingId: ListingId;
  readonly landlordId: LandlordId;
  readonly tenantId: TenantId;
  readonly pricePerPeriodKalon: bigint;
  readonly periodUs: bigint;
  readonly startedAt: bigint;
  currentPeriodEndsAt: bigint;
  totalPaid: bigint;
  status: RentalStatus;
}

interface RentalMarketState {
  readonly listings: Map<ListingId, MutableListing>;
  readonly rentals: Map<RentalId, MutableRental>;
  readonly payments: Map<RentalId, RentalPayment[]>;
  totalVolumeKalon: bigint;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}

export function createRentalMarketSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}): RentalMarketSystem {
  const state: RentalMarketState = {
    listings: new Map(),
    rentals: new Map(),
    payments: new Map(),
    totalVolumeKalon: 0n,
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    createListing: (landlordId, desc, price, period, worldId) =>
      createListingImpl(state, landlordId, desc, price, period, worldId),
    startRental: (listingId, tenantId, payment) =>
      startRentalImpl(state, listingId, tenantId, payment),
    makePayment: (rentalId, tenantId, amount) => makePaymentImpl(state, rentalId, tenantId, amount),
    terminateRental: (rentalId, tenantId) => terminateRentalImpl(state, rentalId, tenantId),
    defaultRental: (rentalId) => defaultRentalImpl(state, rentalId),
    getListing: (listingId) => state.listings.get(listingId),
    getRental: (rentalId) => state.rentals.get(rentalId),
    getPaymentHistory: (rentalId) => state.payments.get(rentalId) ?? [],
    getStats: () => getStatsImpl(state),
  };
}

function createListingImpl(
  state: RentalMarketState,
  landlordId: LandlordId,
  itemDescription: string,
  pricePerPeriodKalon: bigint,
  periodUs: bigint,
  worldId: string,
): RentalListing | RentalError {
  if (pricePerPeriodKalon < 1n) return 'invalid-amount';
  if (periodUs < 1n) return 'invalid-duration';

  const listingId = state.idGen.generateId();
  const listing: MutableListing = {
    listingId,
    landlordId,
    itemDescription,
    pricePerPeriodKalon,
    periodUs,
    worldId,
    available: true,
  };

  state.listings.set(listingId, listing);
  state.logger.info('Rental listing created', { listingId, landlordId, worldId });
  return listing;
}

function buildRental(
  listing: MutableListing,
  tenantId: TenantId,
  rentalId: RentalId,
  initialPaymentKalon: bigint,
  now: bigint,
): MutableRental {
  const periodsCovered = BigInt(Number(initialPaymentKalon / listing.pricePerPeriodKalon));
  return {
    rentalId,
    listingId: listing.listingId,
    landlordId: listing.landlordId,
    tenantId,
    pricePerPeriodKalon: listing.pricePerPeriodKalon,
    periodUs: listing.periodUs,
    startedAt: now,
    currentPeriodEndsAt: now + periodsCovered * listing.periodUs,
    totalPaid: initialPaymentKalon,
    status: 'ACTIVE',
  };
}

function buildInitialPayment(
  rentalId: RentalId,
  paymentId: string,
  listing: MutableListing,
  initialPaymentKalon: bigint,
  now: bigint,
): RentalPayment {
  return {
    paymentId,
    rentalId,
    amountKalon: initialPaymentKalon,
    paidAt: now,
    periodsCovered: Number(initialPaymentKalon / listing.pricePerPeriodKalon),
  };
}

function commitStartRental(
  state: RentalMarketState,
  listing: MutableListing,
  tenantId: TenantId,
  initialPaymentKalon: bigint,
): { readonly rental: Rental; readonly payment: RentalPayment } {
  const now = state.clock.nowMicroseconds();
  const rentalId = state.idGen.generateId();
  const rental = buildRental(listing, tenantId, rentalId, initialPaymentKalon, now);
  const payment = buildInitialPayment(
    rentalId,
    state.idGen.generateId(),
    listing,
    initialPaymentKalon,
    now,
  );
  listing.available = false;
  state.rentals.set(rentalId, rental);
  state.payments.set(rentalId, [payment]);
  state.totalVolumeKalon += initialPaymentKalon;
  state.logger.info('Rental started', { rentalId, listingId: listing.listingId, tenantId });
  return { rental, payment };
}

function startRentalImpl(
  state: RentalMarketState,
  listingId: ListingId,
  tenantId: TenantId,
  initialPaymentKalon: bigint,
):
  | { readonly success: true; readonly rental: Rental; readonly payment: RentalPayment }
  | { readonly success: false; readonly error: RentalError } {
  const listing = state.listings.get(listingId);
  if (!listing) return { success: false, error: 'listing-not-found' };
  if (!listing.available) return { success: false, error: 'already-rented' };
  if (initialPaymentKalon < listing.pricePerPeriodKalon) {
    return { success: false, error: 'invalid-amount' };
  }

  const { rental, payment } = commitStartRental(state, listing, tenantId, initialPaymentKalon);
  return { success: true, rental, payment };
}

function applyPaymentToRental(
  state: RentalMarketState,
  rental: MutableRental,
  payment: RentalPayment,
  periodsExtended: number,
): void {
  rental.currentPeriodEndsAt += BigInt(periodsExtended) * rental.periodUs;
  rental.totalPaid += payment.amountKalon;
  state.totalVolumeKalon += payment.amountKalon;
  const history = state.payments.get(rental.rentalId) ?? [];
  history.push(payment);
  state.payments.set(rental.rentalId, history);
}

function makePaymentImpl(
  state: RentalMarketState,
  rentalId: RentalId,
  tenantId: TenantId,
  amountKalon: bigint,
):
  | { readonly success: true; readonly payment: RentalPayment; readonly periodsExtended: number }
  | { readonly success: false; readonly error: RentalError } {
  const rental = state.rentals.get(rentalId);
  if (!rental) return { success: false, error: 'rental-not-found' };
  if (rental.status !== 'ACTIVE') return { success: false, error: 'rental-ended' };
  if (rental.tenantId !== tenantId) return { success: false, error: 'not-tenant' };
  if (amountKalon < 1n) return { success: false, error: 'invalid-amount' };

  const periodsExtended = Number(amountKalon / rental.pricePerPeriodKalon);
  const payment: RentalPayment = {
    paymentId: state.idGen.generateId(),
    rentalId,
    amountKalon,
    paidAt: state.clock.nowMicroseconds(),
    periodsCovered: periodsExtended,
  };

  applyPaymentToRental(state, rental, payment, periodsExtended);
  state.logger.info('Rental payment made', { rentalId, amountKalon: String(amountKalon) });
  return { success: true, payment, periodsExtended };
}

function terminateRentalImpl(
  state: RentalMarketState,
  rentalId: RentalId,
  tenantId: TenantId,
): { readonly success: true } | { readonly success: false; readonly error: RentalError } {
  const rental = state.rentals.get(rentalId);
  if (!rental) return { success: false, error: 'rental-not-found' };
  if (rental.tenantId !== tenantId) return { success: false, error: 'not-tenant' };
  if (rental.status !== 'ACTIVE') return { success: false, error: 'rental-ended' };

  rental.status = 'TERMINATED';
  const listing = state.listings.get(rental.listingId);
  if (listing) listing.available = true;

  state.logger.info('Rental terminated', { rentalId, tenantId });
  return { success: true };
}

function defaultRentalImpl(
  state: RentalMarketState,
  rentalId: RentalId,
): { readonly success: true } | { readonly success: false; readonly error: RentalError } {
  const rental = state.rentals.get(rentalId);
  if (!rental) return { success: false, error: 'rental-not-found' };
  if (rental.status !== 'ACTIVE') return { success: false, error: 'rental-ended' };

  rental.status = 'DEFAULTED';
  const listing = state.listings.get(rental.listingId);
  if (listing) listing.available = true;

  state.logger.info('Rental defaulted', { rentalId });
  return { success: true };
}

function getStatsImpl(state: RentalMarketState): RentalMarketStats {
  let totalListings = 0;
  let availableListings = 0;

  for (const listing of state.listings.values()) {
    totalListings += 1;
    if (listing.available) availableListings += 1;
  }

  let activeRentals = 0;
  for (const rental of state.rentals.values()) {
    if (rental.status === 'ACTIVE') activeRentals += 1;
  }

  return {
    totalListings,
    availableListings,
    activeRentals,
    totalVolumeKalon: state.totalVolumeKalon,
  };
}
