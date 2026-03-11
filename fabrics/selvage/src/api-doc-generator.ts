/**
 * API Doc Generator — Runtime API documentation
 * Generates endpoint catalog, schema introspection, version tracking
 */

// ============================================================================
// Ports (zero external dependencies)
// ============================================================================

type ClockPort = {
  nowMicros: () => bigint;
};

type IdPort = {
  generate: () => string;
};

type LogPort = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

// ============================================================================
// Types
// ============================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

type ParamLocation = 'PATH' | 'QUERY' | 'BODY' | 'HEADER';

type EndpointParam = {
  readonly name: string;
  readonly location: ParamLocation;
  readonly required: boolean;
  readonly type: string;
  readonly description: string;
};

type ResponseSchema = {
  readonly statusCode: number;
  readonly contentType: string;
  readonly schema: string;
  readonly example?: unknown;
};

type ApiEndpoint = {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly summary: string;
  readonly description: string;
  readonly params: Array<EndpointParam>;
  readonly responses: Array<ResponseSchema>;
  readonly tags: Array<string>;
  readonly version: string;
  readonly deprecated: boolean;
  readonly registeredAtMicros: bigint;
};

type DocTag = {
  readonly name: string;
  readonly description: string;
  readonly endpointCount: number;
  readonly createdAtMicros: bigint;
};

type ApiVersion = {
  readonly version: string;
  readonly endpointCount: number;
  readonly releasedAtMicros: bigint;
  readonly deprecated: boolean;
};

type ApiCatalog = {
  readonly totalEndpoints: number;
  readonly versions: Array<ApiVersion>;
  readonly tags: Array<DocTag>;
  readonly endpoints: Array<ApiEndpoint>;
  readonly generatedAtMicros: bigint;
};

type DocReport = {
  readonly totalEndpoints: number;
  readonly deprecatedCount: number;
  readonly tagCount: number;
  readonly versionCount: number;
  readonly coveragePercent: number;
  readonly generatedAtMicros: bigint;
};

// ============================================================================
// State
// ============================================================================

type DocGenState = {
  readonly clock: ClockPort;
  readonly id: IdPort;
  readonly log: LogPort;
  readonly endpoints: Map<string, ApiEndpoint>;
  readonly tags: Map<string, DocTag>;
  readonly versions: Map<string, ApiVersion>;
  readonly endpointsByTag: Map<string, Set<string>>;
  readonly endpointsByVersion: Map<string, Set<string>>;
};

// ============================================================================
// Factory
// ============================================================================

export function createDocGenerator(clock: ClockPort, id: IdPort, log: LogPort): DocGenState {
  return {
    clock,
    id,
    log,
    endpoints: new Map(),
    tags: new Map(),
    versions: new Map(),
    endpointsByTag: new Map(),
    endpointsByVersion: new Map(),
  };
}

// ============================================================================
// Endpoint Registration
// ============================================================================

export function registerEndpoint(
  state: DocGenState,
  method: HttpMethod,
  path: string,
  summary: string,
  description: string,
  params: Array<EndpointParam>,
  responses: Array<ResponseSchema>,
  version: string,
): ApiEndpoint | 'endpoint-exists' {
  const key = makeEndpointKey(method, path);

  if (state.endpoints.has(key)) {
    return 'endpoint-exists';
  }

  const endpoint: ApiEndpoint = {
    id: state.id.generate(),
    method,
    path,
    summary,
    description,
    params,
    responses,
    tags: [],
    version,
    deprecated: false,
    registeredAtMicros: state.clock.nowMicros(),
  };

  state.endpoints.set(key, endpoint);
  registerVersionIfNeeded(state, version);
  addEndpointToVersion(state, version, key);

  const msg = 'Endpoint registered: ' + method + ' ' + path;
  state.log.info(msg);
  return endpoint;
}

export function tagEndpoint(
  state: DocGenState,
  method: HttpMethod,
  path: string,
  tagName: string,
  tagDescription: string,
): ApiEndpoint | 'endpoint-not-found' {
  const key = makeEndpointKey(method, path);
  const endpoint = state.endpoints.get(key);

  if (!endpoint) {
    return 'endpoint-not-found';
  }

  if (!state.tags.has(tagName)) {
    const tag: DocTag = {
      name: tagName,
      description: tagDescription,
      endpointCount: 0,
      createdAtMicros: state.clock.nowMicros(),
    };
    state.tags.set(tagName, tag);
    state.endpointsByTag.set(tagName, new Set());
  }

  if (endpoint.tags.includes(tagName)) {
    return endpoint;
  }

  const updated: ApiEndpoint = {
    ...endpoint,
    tags: [...endpoint.tags, tagName],
  };

  state.endpoints.set(key, updated);
  addEndpointToTag(state, tagName, key);

  const msg = 'Tag added: ' + tagName + ' to ' + method + ' ' + path;
  state.log.info(msg);
  return updated;
}

export function deprecateEndpoint(
  state: DocGenState,
  method: HttpMethod,
  path: string,
): ApiEndpoint | 'endpoint-not-found' {
  const key = makeEndpointKey(method, path);
  const endpoint = state.endpoints.get(key);

  if (!endpoint) {
    return 'endpoint-not-found';
  }

  const updated: ApiEndpoint = {
    ...endpoint,
    deprecated: true,
  };

  state.endpoints.set(key, updated);
  const msg = 'Endpoint deprecated: ' + method + ' ' + path;
  state.log.warn(msg);
  return updated;
}

// ============================================================================
// Catalog Generation
// ============================================================================

export function generateCatalog(state: DocGenState): ApiCatalog {
  const endpoints = Array.from(state.endpoints.values());
  const versions = Array.from(state.versions.values());
  const tags = Array.from(state.tags.values());

  return {
    totalEndpoints: endpoints.length,
    versions,
    tags,
    endpoints,
    generatedAtMicros: state.clock.nowMicros(),
  };
}

export function getEndpointsByTag(state: DocGenState, tagName: string): Array<ApiEndpoint> {
  const endpointKeys = state.endpointsByTag.get(tagName);
  if (!endpointKeys) {
    return [];
  }

  const endpoints: Array<ApiEndpoint> = [];
  for (const key of endpointKeys) {
    const endpoint = state.endpoints.get(key);
    if (endpoint) {
      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

export function getEndpointsByVersion(state: DocGenState, version: string): Array<ApiEndpoint> {
  const endpointKeys = state.endpointsByVersion.get(version);
  if (!endpointKeys) {
    return [];
  }

  const endpoints: Array<ApiEndpoint> = [];
  for (const key of endpointKeys) {
    const endpoint = state.endpoints.get(key);
    if (endpoint) {
      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

export function getDeprecatedEndpoints(state: DocGenState): Array<ApiEndpoint> {
  const deprecated: Array<ApiEndpoint> = [];

  for (const endpoint of state.endpoints.values()) {
    if (endpoint.deprecated) {
      deprecated.push(endpoint);
    }
  }

  return deprecated;
}

// ============================================================================
// Version Management
// ============================================================================

export function compareVersions(
  state: DocGenState,
  versionA: string,
  versionB: string,
): 'equal' | 'a-newer' | 'b-newer' | 'version-not-found' {
  const a = state.versions.get(versionA);
  const b = state.versions.get(versionB);

  if (!a || !b) {
    return 'version-not-found';
  }

  if (a.releasedAtMicros === b.releasedAtMicros) {
    return 'equal';
  }

  return a.releasedAtMicros > b.releasedAtMicros ? 'a-newer' : 'b-newer';
}

export function deprecateVersion(
  state: DocGenState,
  version: string,
): ApiVersion | 'version-not-found' {
  const ver = state.versions.get(version);
  if (!ver) {
    return 'version-not-found';
  }

  const updated: ApiVersion = {
    ...ver,
    deprecated: true,
  };

  state.versions.set(version, updated);
  const msg = 'Version deprecated: ' + version;
  state.log.warn(msg);
  return updated;
}

export function listVersions(state: DocGenState): Array<ApiVersion> {
  return Array.from(state.versions.values());
}

export function getLatestVersion(state: DocGenState): ApiVersion | 'no-versions' {
  const versions = Array.from(state.versions.values());

  if (versions.length === 0) {
    return 'no-versions';
  }

  let latest = versions[0];
  if (!latest) {
    return 'no-versions';
  }

  for (const version of versions) {
    if (version.releasedAtMicros > latest.releasedAtMicros) {
      latest = version;
    }
  }

  return latest;
}

// ============================================================================
// Search
// ============================================================================

export function searchEndpoints(state: DocGenState, query: string): Array<ApiEndpoint> {
  const lowerQuery = query.toLowerCase();
  const results: Array<ApiEndpoint> = [];

  for (const endpoint of state.endpoints.values()) {
    if (matchesQuery(endpoint, lowerQuery)) {
      results.push(endpoint);
    }
  }

  return results;
}

export function searchByPath(state: DocGenState, pathPattern: string): Array<ApiEndpoint> {
  const results: Array<ApiEndpoint> = [];

  for (const endpoint of state.endpoints.values()) {
    if (endpoint.path.includes(pathPattern)) {
      results.push(endpoint);
    }
  }

  return results;
}

export function searchByMethod(state: DocGenState, method: HttpMethod): Array<ApiEndpoint> {
  const results: Array<ApiEndpoint> = [];

  for (const endpoint of state.endpoints.values()) {
    if (endpoint.method === method) {
      results.push(endpoint);
    }
  }

  return results;
}

// ============================================================================
// Reports
// ============================================================================

export function getDocReport(state: DocGenState): DocReport {
  const totalEndpoints = state.endpoints.size;
  const deprecatedCount = countDeprecated(state);
  const tagCount = state.tags.size;
  const versionCount = state.versions.size;
  const coveragePercent = calculateCoveragePercent(state);

  return {
    totalEndpoints,
    deprecatedCount,
    tagCount,
    versionCount,
    coveragePercent,
    generatedAtMicros: state.clock.nowMicros(),
  };
}

export function getTagReport(state: DocGenState, tagName: string): DocTag | 'tag-not-found' {
  const tag = state.tags.get(tagName);
  return tag || 'tag-not-found';
}

export function listTags(state: DocGenState): Array<DocTag> {
  return Array.from(state.tags.values());
}

export function getEndpointById(state: DocGenState, id: string): ApiEndpoint | 'not-found' {
  for (const endpoint of state.endpoints.values()) {
    if (endpoint.id === id) {
      return endpoint;
    }
  }
  return 'not-found';
}

export function getEndpointByMethodPath(
  state: DocGenState,
  method: HttpMethod,
  path: string,
): ApiEndpoint | 'not-found' {
  const key = makeEndpointKey(method, path);
  const endpoint = state.endpoints.get(key);
  return endpoint || 'not-found';
}

// ============================================================================
// Helpers
// ============================================================================

function makeEndpointKey(method: HttpMethod, path: string): string {
  return method + ' ' + path;
}

function registerVersionIfNeeded(state: DocGenState, version: string): void {
  if (state.versions.has(version)) {
    return;
  }

  const ver: ApiVersion = {
    version,
    endpointCount: 0,
    releasedAtMicros: state.clock.nowMicros(),
    deprecated: false,
  };

  state.versions.set(version, ver);
  state.endpointsByVersion.set(version, new Set());
}

function addEndpointToVersion(state: DocGenState, version: string, endpointKey: string): void {
  const ver = state.versions.get(version);
  if (!ver) {
    return;
  }

  const updated: ApiVersion = {
    ...ver,
    endpointCount: ver.endpointCount + 1,
  };

  state.versions.set(version, updated);

  const endpoints = state.endpointsByVersion.get(version);
  if (endpoints) {
    endpoints.add(endpointKey);
  }
}

function addEndpointToTag(state: DocGenState, tagName: string, endpointKey: string): void {
  const tag = state.tags.get(tagName);
  if (!tag) {
    return;
  }

  const updated: DocTag = {
    ...tag,
    endpointCount: tag.endpointCount + 1,
  };

  state.tags.set(tagName, updated);

  const endpoints = state.endpointsByTag.get(tagName);
  if (endpoints) {
    endpoints.add(endpointKey);
  }
}

function matchesQuery(endpoint: ApiEndpoint, query: string): boolean {
  const pathMatch = endpoint.path.toLowerCase().includes(query);
  const summaryMatch = endpoint.summary.toLowerCase().includes(query);
  const descMatch = endpoint.description.toLowerCase().includes(query);
  return pathMatch || summaryMatch || descMatch;
}

function countDeprecated(state: DocGenState): number {
  let count = 0;
  for (const endpoint of state.endpoints.values()) {
    if (endpoint.deprecated) {
      count++;
    }
  }
  return count;
}

function calculateCoveragePercent(state: DocGenState): number {
  if (state.endpoints.size === 0) {
    return 0;
  }

  let documented = 0;
  for (const endpoint of state.endpoints.values()) {
    if (hasDocumentation(endpoint)) {
      documented++;
    }
  }

  return Math.floor((documented / state.endpoints.size) * 100);
}

function hasDocumentation(endpoint: ApiEndpoint): boolean {
  const hasSummary = endpoint.summary.length > 0;
  const hasDescription = endpoint.description.length > 0;
  const hasParams = endpoint.params.length > 0;
  const hasResponses = endpoint.responses.length > 0;
  return hasSummary && hasDescription && (hasParams || hasResponses);
}

// ============================================================================
// Bulk Operations
// ============================================================================

export function clearAllEndpoints(state: DocGenState): void {
  state.endpoints.clear();
  state.tags.clear();
  state.versions.clear();
  state.endpointsByTag.clear();
  state.endpointsByVersion.clear();
  state.log.info('All endpoints cleared');
}

export function exportCatalogJson(state: DocGenState): string {
  const catalog = generateCatalog(state);
  return JSON.stringify(
    catalog,
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );
}

export function getEndpointCount(state: DocGenState): number {
  return state.endpoints.size;
}

export function getTagCount(state: DocGenState): number {
  return state.tags.size;
}

export function getVersionCount(state: DocGenState): number {
  return state.versions.size;
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ClockPort,
  IdPort,
  LogPort,
  HttpMethod,
  ParamLocation,
  EndpointParam,
  ResponseSchema,
  ApiEndpoint,
  DocTag,
  ApiVersion,
  ApiCatalog,
  DocReport,
  DocGenState,
};
