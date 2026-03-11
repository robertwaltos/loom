/**
 * IP Filter — IP-based access control, geo-blocking
 * Fabric: dye-house
 * Thread tier: M (Multi-agent orchestration)
 */

// ============================================================================
// Port Definitions (duplicated per fabric isolation)
// ============================================================================

interface IpFilterLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type FilterAction = 'ALLOW' | 'BLOCK';

export interface CidrRange {
  readonly network: string;
  readonly prefixLength: number;
  readonly action: FilterAction;
  readonly reason: string;
}

export interface FilterRule {
  readonly id: string;
  readonly type: 'CIDR' | 'GEO' | 'EXACT';
  readonly value: string;
  readonly action: FilterAction;
  readonly reason: string;
  readonly priority: number;
}

export interface GeoBlock {
  readonly countryCode: string;
  readonly action: FilterAction;
  readonly reason: string;
}

export interface IpCheckResult {
  readonly action: FilterAction;
  readonly reason: string;
  readonly matchedRule: string;
}

// ============================================================================
// State
// ============================================================================

interface IpFilterState {
  readonly rules: Map<string, FilterRule>;
  readonly geoBlocks: Map<string, GeoBlock>;
  readonly exactMatches: Map<string, FilterRule>;
  totalChecks: bigint;
  totalBlocked: bigint;
  totalAllowed: bigint;
  defaultAction: FilterAction;
}

export interface IpFilterDeps {
  readonly logger: IpFilterLoggerPort;
}

export interface IpFilter {
  readonly addAllowRule: (id: string, cidr: string, reason: string) => 'OK' | string;
  readonly addBlockRule: (id: string, cidr: string, reason: string) => 'OK' | string;
  readonly addExactRule: (id: string, ip: string, action: FilterAction, reason: string) => 'OK';
  readonly addGeoBlock: (countryCode: string, action: FilterAction, reason: string) => 'OK';
  readonly checkIp: (ip: string, countryCode?: string) => IpCheckResult;
  readonly removeRule: (id: string) => 'OK' | 'RULE_NOT_FOUND';
  readonly removeGeoBlock: (countryCode: string) => 'OK' | 'GEO_BLOCK_NOT_FOUND';
  readonly getRules: () => FilterRule[];
  readonly setDefaultAction: (action: FilterAction) => void;
  readonly getStats: () => {
    readonly totalChecks: bigint;
    readonly totalBlocked: bigint;
    readonly totalAllowed: bigint;
    readonly ruleCount: number;
    readonly geoBlockCount: number;
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createIpFilter(deps: IpFilterDeps): IpFilter {
  const state: IpFilterState = {
    rules: new Map(),
    geoBlocks: new Map(),
    exactMatches: new Map(),
    totalChecks: 0n,
    totalBlocked: 0n,
    totalAllowed: 0n,
    defaultAction: 'ALLOW',
  };

  return {
    addAllowRule: (id, cidr, reason) => addAllowRule(state, deps, id, cidr, reason),
    addBlockRule: (id, cidr, reason) => addBlockRule(state, deps, id, cidr, reason),
    addExactRule: (id, ip, action, reason) => addExactRule(state, deps, id, ip, action, reason),
    addGeoBlock: (cc, action, reason) => addGeoBlock(state, deps, cc, action, reason),
    checkIp: (ip, cc) => checkIp(state, deps, ip, cc),
    removeRule: (id) => removeRule(state, deps, id),
    removeGeoBlock: (cc) => removeGeoBlock(state, deps, cc),
    getRules: () => getRules(state),
    setDefaultAction: (action) => setDefaultAction(state, action),
    getStats: () => getStats(state),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

function addAllowRule(
  state: IpFilterState,
  deps: IpFilterDeps,
  id: string,
  cidr: string,
  reason: string,
): 'OK' | string {
  const parsed = parseCidr(cidr);
  if (typeof parsed === 'string') {
    return parsed;
  }

  const rule: FilterRule = {
    id,
    type: 'CIDR',
    value: cidr,
    action: 'ALLOW',
    reason,
    priority: 20,
  };

  state.rules.set(id, rule);

  deps.logger.info('Allow rule added', { id, cidr, reason });
  return 'OK';
}

function addBlockRule(
  state: IpFilterState,
  deps: IpFilterDeps,
  id: string,
  cidr: string,
  reason: string,
): 'OK' | string {
  const parsed = parseCidr(cidr);
  if (typeof parsed === 'string') {
    return parsed;
  }

  const rule: FilterRule = {
    id,
    type: 'CIDR',
    value: cidr,
    action: 'BLOCK',
    reason,
    priority: 100,
  };

  state.rules.set(id, rule);

  deps.logger.info('Block rule added', { id, cidr, reason });
  return 'OK';
}

function addExactRule(
  state: IpFilterState,
  deps: IpFilterDeps,
  id: string,
  ip: string,
  action: FilterAction,
  reason: string,
): 'OK' {
  const rule: FilterRule = {
    id,
    type: 'EXACT',
    value: ip,
    action,
    reason,
    priority: 150,
  };

  state.exactMatches.set(ip, rule);
  state.rules.set(id, rule);

  deps.logger.info('Exact rule added', { id, ip, action, reason });
  return 'OK';
}

function addGeoBlock(
  state: IpFilterState,
  deps: IpFilterDeps,
  countryCode: string,
  action: FilterAction,
  reason: string,
): 'OK' {
  const geoBlock: GeoBlock = {
    countryCode,
    action,
    reason,
  };

  state.geoBlocks.set(countryCode, geoBlock);

  deps.logger.info('Geo block added', { countryCode, action, reason });
  return 'OK';
}

function checkIp(
  state: IpFilterState,
  deps: IpFilterDeps,
  ip: string,
  countryCode?: string,
): IpCheckResult {
  state.totalChecks = state.totalChecks + 1n;

  const exactMatch = state.exactMatches.get(ip);
  if (exactMatch !== undefined) {
    return recordResult(state, deps, exactMatch.action, exactMatch.reason, 'EXACT:' + ip);
  }

  const matchedRules: FilterRule[] = [];
  for (const rule of state.rules.values()) {
    if (rule.type === 'CIDR') {
      const parsed = parseCidr(rule.value);
      if (typeof parsed !== 'string' && ipMatchesCidr(ip, parsed)) {
        matchedRules.push(rule);
      }
    }
  }

  if (matchedRules.length > 0) {
    const highestPriority = matchedRules.reduce((prev, curr) =>
      curr.priority > prev.priority ? curr : prev,
    );

    return recordResult(
      state,
      deps,
      highestPriority.action,
      highestPriority.reason,
      'CIDR:' + highestPriority.id,
    );
  }

  if (countryCode !== undefined) {
    const geoBlock = state.geoBlocks.get(countryCode);
    if (geoBlock !== undefined) {
      return recordResult(state, deps, geoBlock.action, geoBlock.reason, 'GEO:' + countryCode);
    }
  }

  return recordResult(state, deps, state.defaultAction, 'Default action', 'DEFAULT');
}

function recordResult(
  state: IpFilterState,
  deps: IpFilterDeps,
  action: FilterAction,
  reason: string,
  matchedRule: string,
): IpCheckResult {
  if (action === 'BLOCK') {
    state.totalBlocked = state.totalBlocked + 1n;
    deps.logger.warn('IP blocked', { matchedRule, reason });
  } else {
    state.totalAllowed = state.totalAllowed + 1n;
  }

  return { action, reason, matchedRule };
}

function removeRule(state: IpFilterState, deps: IpFilterDeps, id: string): 'OK' | 'RULE_NOT_FOUND' {
  const rule = state.rules.get(id);
  if (rule === undefined) {
    return 'RULE_NOT_FOUND';
  }

  state.rules.delete(id);

  if (rule.type === 'EXACT') {
    state.exactMatches.delete(rule.value);
  }

  deps.logger.info('Rule removed', { id });
  return 'OK';
}

function removeGeoBlock(
  state: IpFilterState,
  deps: IpFilterDeps,
  countryCode: string,
): 'OK' | 'GEO_BLOCK_NOT_FOUND' {
  if (!state.geoBlocks.has(countryCode)) {
    return 'GEO_BLOCK_NOT_FOUND';
  }

  state.geoBlocks.delete(countryCode);

  deps.logger.info('Geo block removed', { countryCode });
  return 'OK';
}

function getRules(state: IpFilterState): FilterRule[] {
  return Array.from(state.rules.values()).sort((a, b) => b.priority - a.priority);
}

function setDefaultAction(state: IpFilterState, action: FilterAction): void {
  state.defaultAction = action;
}

function getStats(state: IpFilterState) {
  return {
    totalChecks: state.totalChecks,
    totalBlocked: state.totalBlocked,
    totalAllowed: state.totalAllowed,
    ruleCount: state.rules.size,
    geoBlockCount: state.geoBlocks.size,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ParsedCidr {
  readonly octets: number[];
  readonly prefixLength: number;
}

function parseCidr(cidr: string): ParsedCidr | string {
  const parts = cidr.split('/');
  const ipPart = parts[0];
  const prefixPart = parts[1];

  if (ipPart === undefined || prefixPart === undefined) {
    return 'Invalid CIDR format';
  }

  const octets = ipPart.split('.').map((s) => parseInt(s, 10));

  if (octets.length !== 4) {
    return 'Invalid IP address';
  }

  for (const octet of octets) {
    if (isNaN(octet) || octet < 0 || octet > 255) {
      return 'Invalid IP octet';
    }
  }

  const prefixLength = parseInt(prefixPart, 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return 'Invalid prefix length';
  }

  return { octets, prefixLength };
}

function ipMatchesCidr(ip: string, cidr: ParsedCidr): boolean {
  const ipOctets = ip.split('.').map((s) => parseInt(s, 10));

  if (ipOctets.length !== 4) {
    return false;
  }

  const ipBits = ipOctetsToBits(ipOctets);
  const cidrBits = ipOctetsToBits(cidr.octets);

  for (let i = 0; i < cidr.prefixLength; i = i + 1) {
    const ipBit = ipBits[i];
    const cidrBit = cidrBits[i];

    if (ipBit !== cidrBit) {
      return false;
    }
  }

  return true;
}

function ipOctetsToBits(octets: number[]): boolean[] {
  const bits: boolean[] = [];

  for (const octet of octets) {
    for (let i = 7; i >= 0; i = i - 1) {
      const mask = 1 << i;
      bits.push((octet & mask) !== 0);
    }
  }

  return bits;
}
