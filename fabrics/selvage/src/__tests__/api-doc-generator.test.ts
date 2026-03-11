/**
 * Tests for API Doc Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDocGenerator,
  registerEndpoint,
  tagEndpoint,
  deprecateEndpoint,
  generateCatalog,
  getEndpointsByTag,
  getEndpointsByVersion,
  getDeprecatedEndpoints,
  compareVersions,
  deprecateVersion,
  listVersions,
  getLatestVersion,
  searchEndpoints,
  searchByPath,
  searchByMethod,
  getDocReport,
  getTagReport,
  listTags,
  getEndpointById,
  getEndpointByMethodPath,
  clearAllEndpoints,
  exportCatalogJson,
  getEndpointCount,
  getTagCount,
  getVersionCount,
  type DocGenState,
  type ClockPort,
  type IdPort,
  type LogPort,
  type HttpMethod,
  type ParamLocation,
  type EndpointParam,
  type ResponseSchema,
} from '../api-doc-generator.js';

// ============================================================================
// Test Ports
// ============================================================================

function createTestClock(): ClockPort {
  let currentMicros = 1_000_000_000n;
  return {
    nowMicros: () => {
      currentMicros = currentMicros + 1000n;
      return currentMicros;
    },
  };
}

function createTestId(): IdPort {
  let counter = 0;
  return {
    generate: () => {
      counter++;
      return 'endpoint-' + String(counter);
    },
  };
}

function createTestLog(): LogPort {
  const logs: Array<string> = [];
  return {
    info: (msg: string) => logs.push('INFO: ' + msg),
    warn: (msg: string) => logs.push('WARN: ' + msg),
    error: (msg: string) => logs.push('ERROR: ' + msg),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('API Doc Generator', () => {
  let state: DocGenState;
  let clock: ClockPort;
  let id: IdPort;
  let log: LogPort;

  beforeEach(() => {
    clock = createTestClock();
    id = createTestId();
    log = createTestLog();
    state = createDocGenerator(clock, id, log);
  });

  // ============================================================================
  // Endpoint Registration
  // ============================================================================

  describe('registerEndpoint', () => {
    it('should register a new GET endpoint', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get all users',
        'Returns a list of all users',
        params,
        responses,
        'v1',
      );

      expect(result).not.toBe('endpoint-exists');
      if (typeof result !== 'string') {
        expect(result.method).toBe('GET');
        expect(result.path).toBe('/users');
        expect(result.version).toBe('v1');
      }
    });

    it('should register a POST endpoint', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'POST',
        '/users',
        'Create user',
        'Creates a new user',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.method).toBe('POST');
      }
    });

    it('should register a PUT endpoint', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'PUT',
        '/users/123',
        'Update user',
        'Updates a user',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.method).toBe('PUT');
      }
    });

    it('should register a DELETE endpoint', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'DELETE',
        '/users/123',
        'Delete user',
        'Deletes a user',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.method).toBe('DELETE');
      }
    });

    it('should return endpoint-exists if already registered', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];

      registerEndpoint(state, 'GET', '/users', 'Get users', 'List', params, responses, 'v1');
      const result = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get users v2',
        'List v2',
        params,
        responses,
        'v2',
      );

      expect(result).toBe('endpoint-exists');
    });

    it('should allow same path with different methods', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];

      const r1 = registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      const r2 = registerEndpoint(
        state,
        'POST',
        '/users',
        'Create',
        'New',
        params,
        responses,
        'v1',
      );

      expect(r1).not.toBe('endpoint-exists');
      expect(r2).not.toBe('endpoint-exists');
    });

    it('should track registration timestamp', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get',
        'List',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.registeredAtMicros).toBeGreaterThan(0n);
      }
    });

    it('should initialize with empty tags', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get',
        'List',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.tags).toEqual([]);
      }
    });

    it('should initialize deprecated as false', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get',
        'List',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.deprecated).toBe(false);
      }
    });

    it('should store endpoint parameters', () => {
      const params: Array<EndpointParam> = [
        {
          name: 'id',
          location: 'PATH',
          required: true,
          type: 'string',
          description: 'User ID',
        },
      ];
      const responses: Array<ResponseSchema> = [];
      const result = registerEndpoint(
        state,
        'GET',
        '/users/id',
        'Get',
        'By ID',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.params.length).toBe(1);
        expect(result.params[0]?.name).toBe('id');
      }
    });

    it('should store response schemas', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [
        {
          statusCode: 200,
          contentType: 'application/json',
          schema: '{ "users": [] }',
        },
      ];
      const result = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get',
        'List',
        params,
        responses,
        'v1',
      );

      if (typeof result !== 'string') {
        expect(result.responses.length).toBe(1);
        expect(result.responses[0]?.statusCode).toBe(200);
      }
    });
  });

  // ============================================================================
  // Tagging
  // ============================================================================

  describe('tagEndpoint', () => {
    beforeEach(() => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get users', 'List all', params, responses, 'v1');
    });

    it('should tag an endpoint', () => {
      const result = tagEndpoint(state, 'GET', '/users', 'users', 'User management endpoints');

      if (typeof result !== 'string') {
        expect(result.tags).toContain('users');
      }
    });

    it('should return endpoint-not-found for unknown endpoint', () => {
      const result = tagEndpoint(state, 'GET', '/unknown', 'users', 'User endpoints');
      expect(result).toBe('endpoint-not-found');
    });

    it('should create tag if it does not exist', () => {
      tagEndpoint(state, 'GET', '/users', 'users', 'User management');
      const tags = listTags(state);
      expect(tags.length).toBe(1);
      expect(tags[0]?.name).toBe('users');
    });

    it('should not duplicate tags on same endpoint', () => {
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');

      const endpoint = getEndpointByMethodPath(state, 'GET', '/users');
      if (typeof endpoint !== 'string') {
        expect(endpoint.tags.length).toBe(1);
      }
    });

    it('should allow multiple tags on same endpoint', () => {
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      tagEndpoint(state, 'GET', '/users', 'public', 'Public endpoints');

      const endpoint = getEndpointByMethodPath(state, 'GET', '/users');
      if (typeof endpoint !== 'string') {
        expect(endpoint.tags.length).toBe(2);
      }
    });

    it('should increment tag endpoint count', () => {
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      const tag = getTagReport(state, 'users');

      if (typeof tag !== 'string') {
        expect(tag.endpointCount).toBe(1);
      }
    });
  });

  // ============================================================================
  // Deprecation
  // ============================================================================

  describe('deprecateEndpoint', () => {
    it('should return endpoint-not-found for unknown endpoint', () => {
      const result = deprecateEndpoint(state, 'GET', '/unknown');
      expect(result).toBe('endpoint-not-found');
    });

    it('should mark endpoint as deprecated', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get users', 'List', params, responses, 'v1');

      const result = deprecateEndpoint(state, 'GET', '/users');
      if (typeof result !== 'string') {
        expect(result.deprecated).toBe(true);
      }
    });

    it('should appear in deprecated endpoints list', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get users', 'List', params, responses, 'v1');
      deprecateEndpoint(state, 'GET', '/users');

      const deprecated = getDeprecatedEndpoints(state);
      expect(deprecated.length).toBe(1);
    });
  });

  // ============================================================================
  // Catalog Generation
  // ============================================================================

  describe('generateCatalog', () => {
    it('should generate empty catalog', () => {
      const catalog = generateCatalog(state);
      expect(catalog.totalEndpoints).toBe(0);
      expect(catalog.versions.length).toBe(0);
      expect(catalog.tags.length).toBe(0);
    });

    it('should include all endpoints', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'POST', '/users', 'Create', 'New', params, responses, 'v1');

      const catalog = generateCatalog(state);
      expect(catalog.totalEndpoints).toBe(2);
      expect(catalog.endpoints.length).toBe(2);
    });

    it('should include all versions', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get v1', 'V1', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get v2', 'V2', params, responses, 'v2');

      const catalog = generateCatalog(state);
      expect(catalog.versions.length).toBe(2);
    });

    it('should include all tags', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');

      const catalog = generateCatalog(state);
      expect(catalog.tags.length).toBe(1);
    });

    it('should have generation timestamp', () => {
      const catalog = generateCatalog(state);
      expect(catalog.generatedAtMicros).toBeGreaterThan(0n);
    });
  });

  // ============================================================================
  // Querying
  // ============================================================================

  describe('getEndpointsByTag', () => {
    it('should return empty array for unknown tag', () => {
      const endpoints = getEndpointsByTag(state, 'unknown');
      expect(endpoints).toEqual([]);
    });

    it('should return endpoints with specified tag', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'POST', '/users', 'Create', 'New', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      tagEndpoint(state, 'POST', '/users', 'users', 'User endpoints');

      const endpoints = getEndpointsByTag(state, 'users');
      expect(endpoints.length).toBe(2);
    });

    it('should only return endpoints with that specific tag', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/orders', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      tagEndpoint(state, 'GET', '/orders', 'orders', 'Order endpoints');

      const endpoints = getEndpointsByTag(state, 'users');
      expect(endpoints.length).toBe(1);
    });
  });

  describe('getEndpointsByVersion', () => {
    it('should return empty array for unknown version', () => {
      const endpoints = getEndpointsByVersion(state, 'v99');
      expect(endpoints).toEqual([]);
    });

    it('should return endpoints for specified version', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get v1', 'V1', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get v2', 'V2', params, responses, 'v2');

      const endpoints = getEndpointsByVersion(state, 'v1');
      expect(endpoints.length).toBe(1);
    });
  });

  describe('getDeprecatedEndpoints', () => {
    it('should return empty array when no deprecated endpoints', () => {
      const deprecated = getDeprecatedEndpoints(state);
      expect(deprecated).toEqual([]);
    });

    it('should return all deprecated endpoints', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'POST', '/users', 'Create', 'New', params, responses, 'v1');
      deprecateEndpoint(state, 'GET', '/users');

      const deprecated = getDeprecatedEndpoints(state);
      expect(deprecated.length).toBe(1);
    });
  });

  // ============================================================================
  // Version Management
  // ============================================================================

  describe('compareVersions', () => {
    it('should return version-not-found if version A does not exist', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const result = compareVersions(state, 'v99', 'v1');
      expect(result).toBe('version-not-found');
    });

    it('should return version-not-found if version B does not exist', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const result = compareVersions(state, 'v1', 'v99');
      expect(result).toBe('version-not-found');
    });

    it('should return equal if versions have same timestamp', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const now = clock.nowMicros();
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const result = compareVersions(state, 'v1', 'v1');
      expect(result).toBe('equal');
    });

    it('should return a-newer if version A is newer', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get', 'List', params, responses, 'v2');

      const result = compareVersions(state, 'v2', 'v1');
      expect(result).toBe('a-newer');
    });

    it('should return b-newer if version B is newer', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get', 'List', params, responses, 'v2');

      const result = compareVersions(state, 'v1', 'v2');
      expect(result).toBe('b-newer');
    });
  });

  describe('deprecateVersion', () => {
    it('should return version-not-found for unknown version', () => {
      const result = deprecateVersion(state, 'v99');
      expect(result).toBe('version-not-found');
    });

    it('should mark version as deprecated', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const result = deprecateVersion(state, 'v1');
      if (typeof result !== 'string') {
        expect(result.deprecated).toBe(true);
      }
    });
  });

  describe('listVersions', () => {
    it('should return empty array when no versions', () => {
      const versions = listVersions(state);
      expect(versions).toEqual([]);
    });

    it('should return all versions', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get', 'List', params, responses, 'v2');

      const versions = listVersions(state);
      expect(versions.length).toBe(2);
    });
  });

  describe('getLatestVersion', () => {
    it('should return no-versions when no versions exist', () => {
      const result = getLatestVersion(state);
      expect(result).toBe('no-versions');
    });

    it('should return the most recent version', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get', 'List', params, responses, 'v2');

      const result = getLatestVersion(state);
      if (typeof result !== 'string') {
        expect(result.version).toBe('v2');
      }
    });
  });

  // ============================================================================
  // Search
  // ============================================================================

  describe('searchEndpoints', () => {
    beforeEach(() => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(
        state,
        'GET',
        '/users',
        'Get users',
        'List all users',
        params,
        responses,
        'v1',
      );
      registerEndpoint(
        state,
        'GET',
        '/orders',
        'Get orders',
        'List orders',
        params,
        responses,
        'v1',
      );
    });

    it('should search by path', () => {
      const results = searchEndpoints(state, 'users');
      expect(results.length).toBe(1);
    });

    it('should search by summary', () => {
      const results = searchEndpoints(state, 'orders');
      expect(results.length).toBe(1);
    });

    it('should search by description', () => {
      const results = searchEndpoints(state, 'list');
      expect(results.length).toBe(2);
    });

    it('should be case insensitive', () => {
      const results = searchEndpoints(state, 'USERS');
      expect(results.length).toBe(1);
    });
  });

  describe('searchByPath', () => {
    it('should find endpoints matching path pattern', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users/123', 'Get', 'By ID', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/users/456', 'Get', 'By ID', params, responses, 'v1');

      const results = searchByPath(state, '/users/');
      expect(results.length).toBe(2);
    });
  });

  describe('searchByMethod', () => {
    it('should find all endpoints with specified method', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/orders', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'POST', '/users', 'Create', 'New', params, responses, 'v1');

      const results = searchByMethod(state, 'GET');
      expect(results.length).toBe(2);
    });
  });

  // ============================================================================
  // Reports
  // ============================================================================

  describe('getDocReport', () => {
    it('should report zero stats for empty generator', () => {
      const report = getDocReport(state);
      expect(report.totalEndpoints).toBe(0);
      expect(report.deprecatedCount).toBe(0);
      expect(report.tagCount).toBe(0);
      expect(report.versionCount).toBe(0);
    });

    it('should count total endpoints', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'POST', '/users', 'Create', 'New', params, responses, 'v1');

      const report = getDocReport(state);
      expect(report.totalEndpoints).toBe(2);
    });

    it('should count deprecated endpoints', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      deprecateEndpoint(state, 'GET', '/users');

      const report = getDocReport(state);
      expect(report.deprecatedCount).toBe(1);
    });

    it('should count tags', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');

      const report = getDocReport(state);
      expect(report.tagCount).toBe(1);
    });

    it('should count versions', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const report = getDocReport(state);
      expect(report.versionCount).toBe(1);
    });

    it('should calculate coverage percent', () => {
      const params: Array<EndpointParam> = [
        { name: 'id', location: 'PATH', required: true, type: 'string', description: 'ID' },
      ];
      const responses: Array<ResponseSchema> = [
        { statusCode: 200, contentType: 'application/json', schema: '{}' },
      ];
      registerEndpoint(
        state,
        'GET',
        '/users',
        'Get users',
        'List all users',
        params,
        responses,
        'v1',
      );

      const report = getDocReport(state);
      expect(report.coveragePercent).toBeGreaterThan(0);
    });
  });

  describe('getTagReport', () => {
    it('should return tag-not-found for unknown tag', () => {
      const result = getTagReport(state, 'unknown');
      expect(result).toBe('tag-not-found');
    });

    it('should return tag details', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User management');

      const result = getTagReport(state, 'users');
      if (typeof result !== 'string') {
        expect(result.name).toBe('users');
        expect(result.description).toBe('User management');
      }
    });
  });

  describe('listTags', () => {
    it('should return empty array when no tags', () => {
      const tags = listTags(state);
      expect(tags).toEqual([]);
    });

    it('should return all tags', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      tagEndpoint(state, 'GET', '/users', 'public', 'Public endpoints');

      const tags = listTags(state);
      expect(tags.length).toBe(2);
    });
  });

  // ============================================================================
  // Getters
  // ============================================================================

  describe('getEndpointById', () => {
    it('should return not-found for unknown id', () => {
      const result = getEndpointById(state, 'unknown');
      expect(result).toBe('not-found');
    });

    it('should return endpoint by id', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      const endpoint = registerEndpoint(
        state,
        'GET',
        '/users',
        'Get',
        'List',
        params,
        responses,
        'v1',
      );

      if (typeof endpoint !== 'string') {
        const result = getEndpointById(state, endpoint.id);
        if (typeof result !== 'string') {
          expect(result.id).toBe(endpoint.id);
        }
      }
    });
  });

  describe('getEndpointByMethodPath', () => {
    it('should return not-found for unknown endpoint', () => {
      const result = getEndpointByMethodPath(state, 'GET', '/unknown');
      expect(result).toBe('not-found');
    });

    it('should return endpoint by method and path', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const result = getEndpointByMethodPath(state, 'GET', '/users');
      if (typeof result !== 'string') {
        expect(result.method).toBe('GET');
        expect(result.path).toBe('/users');
      }
    });
  });

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  describe('clearAllEndpoints', () => {
    it('should clear all endpoints', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      clearAllEndpoints(state);

      expect(getEndpointCount(state)).toBe(0);
    });

    it('should clear all tags', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      clearAllEndpoints(state);

      expect(getTagCount(state)).toBe(0);
    });

    it('should clear all versions', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      clearAllEndpoints(state);

      expect(getVersionCount(state)).toBe(0);
    });
  });

  describe('exportCatalogJson', () => {
    it('should export catalog as JSON string', () => {
      const json = exportCatalogJson(state);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all catalog data', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');

      const json = exportCatalogJson(state);
      const parsed = JSON.parse(json);
      expect(parsed.totalEndpoints).toBe(1);
    });
  });

  describe('getEndpointCount', () => {
    it('should return zero when no endpoints', () => {
      expect(getEndpointCount(state)).toBe(0);
    });

    it('should return total endpoint count', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'POST', '/users', 'Create', 'New', params, responses, 'v1');

      expect(getEndpointCount(state)).toBe(2);
    });
  });

  describe('getTagCount', () => {
    it('should return zero when no tags', () => {
      expect(getTagCount(state)).toBe(0);
    });

    it('should return total tag count', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      tagEndpoint(state, 'GET', '/users', 'users', 'User endpoints');
      tagEndpoint(state, 'GET', '/users', 'public', 'Public endpoints');

      expect(getTagCount(state)).toBe(2);
    });
  });

  describe('getVersionCount', () => {
    it('should return zero when no versions', () => {
      expect(getVersionCount(state)).toBe(0);
    });

    it('should return total version count', () => {
      const params: Array<EndpointParam> = [];
      const responses: Array<ResponseSchema> = [];
      registerEndpoint(state, 'GET', '/users', 'Get', 'List', params, responses, 'v1');
      registerEndpoint(state, 'GET', '/v2/users', 'Get', 'List', params, responses, 'v2');

      expect(getVersionCount(state)).toBe(2);
    });
  });
});
