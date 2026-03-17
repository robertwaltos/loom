import { describe, it, expect } from 'vitest';
import {
  createDevPortalServer,
  DEFAULT_DEVPORTAL_CONFIG,
} from '../devportal-server.js';
import type { ApiEndpointSpec, PluginShowcaseEntry } from '../devportal-server.js';

const CUSTOM_ENDPOINT: ApiEndpointSpec = {
  method: 'GET',
  path: '/v1/custom/hello',
  description: 'A custom test endpoint',
  auth: false,
  tags: ['custom', 'test'],
};

const SAMPLE_PLUGIN: PluginShowcaseEntry = {
  pluginId: 'plugin-alpha',
  name: 'Alpha Plugin',
  author: 'alice',
  version: '1.0.0',
  description: 'A modding showcase plugin for testing',
  downloadCount: 500,
  rating: 4.5,
  tags: ['crafting', 'automation'],
};

const SAMPLE_PLUGIN_B: PluginShowcaseEntry = {
  pluginId: 'plugin-beta',
  name: 'Beta Economy Tools',
  author: 'bob',
  version: '0.3.1',
  description: 'Economy display tools',
  downloadCount: 200,
  rating: 3.8,
  tags: ['economy', 'hud'],
};

describe('devportal-server', () => {
  describe('DEFAULT_DEVPORTAL_CONFIG', () => {
    it('has port 4200', () => {
      expect(DEFAULT_DEVPORTAL_CONFIG.port).toBe(4200);
    });

    it('has enablePlayground true', () => {
      expect(DEFAULT_DEVPORTAL_CONFIG.enablePlayground).toBe(true);
    });
  });

  describe('createDevPortalServer', () => {
    it('pre-loads 19 canonical endpoints', () => {
      const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
      const stats = portal.getStats();
      expect(stats.endpointCount).toBe(19);
    });

    it('starts with 0 plugins', () => {
      const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
      expect(portal.getStats().pluginCount).toBe(0);
    });

    describe('registerEndpoint / listEndpoints', () => {
      it('registers a new endpoint', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerEndpoint(CUSTOM_ENDPOINT);
        expect(portal.getStats().endpointCount).toBe(20);
      });

      it('lists all endpoints when no tag given', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerEndpoint(CUSTOM_ENDPOINT);
        const all = portal.listEndpoints();
        expect(all.length).toBe(20);
      });

      it('lists endpoints filtered by tag', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        const auth = portal.listEndpoints('auth');
        expect(auth.every((e) => e.tags.includes('auth'))).toBe(true);
        expect(auth.length).toBeGreaterThanOrEqual(2);
      });

      it('returns empty array for unknown tag', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        expect(portal.listEndpoints('nonexistent-tag')).toHaveLength(0);
      });

      it('overwrites existing endpoint on re-register with same method+path', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        const updated: ApiEndpointSpec = { ...CUSTOM_ENDPOINT, description: 'Updated' };
        portal.registerEndpoint(CUSTOM_ENDPOINT);
        portal.registerEndpoint(updated);
        const found = portal.searchEndpoints('/v1/custom/hello');
        expect(found[0].description).toBe('Updated');
      });
    });

    describe('searchEndpoints', () => {
      it('finds endpoints by path fragment', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        const results = portal.searchEndpoints('transit');
        expect(results.length).toBeGreaterThanOrEqual(2);
      });

      it('finds endpoints by description keyword', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        const results = portal.searchEndpoints('Authenticate');
        expect(results.length).toBeGreaterThanOrEqual(1);
      });

      it('finds endpoints by tag', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        const results = portal.searchEndpoints('assembly');
        expect(results.every((r) => r.tags.includes('assembly'))).toBe(true);
      });

      it('returns empty array for unknown term', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        expect(portal.searchEndpoints('xyzqqqqqq')).toHaveLength(0);
      });
    });

    describe('registerPlugin / getFeaturedPlugins / searchPlugins', () => {
      it('registers and retrieves a plugin', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        expect(portal.getStats().pluginCount).toBe(1);
      });

      it('getFeaturedPlugins returns by rating desc', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        portal.registerPlugin(SAMPLE_PLUGIN_B);
        const featured = portal.getFeaturedPlugins();
        expect(featured[0].rating).toBeGreaterThanOrEqual(featured[1].rating);
      });

      it('getFeaturedPlugins respects limit', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        portal.registerPlugin(SAMPLE_PLUGIN_B);
        expect(portal.getFeaturedPlugins(1)).toHaveLength(1);
      });

      it('searchPlugins matches by name', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        portal.registerPlugin(SAMPLE_PLUGIN_B);
        const results = portal.searchPlugins('alpha');
        expect(results.map((p) => p.pluginId)).toContain('plugin-alpha');
      });

      it('searchPlugins matches by author', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        portal.registerPlugin(SAMPLE_PLUGIN_B);
        const results = portal.searchPlugins('bob');
        expect(results.map((p) => p.pluginId)).toContain('plugin-beta');
      });

      it('searchPlugins matches by tag', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        portal.registerPlugin(SAMPLE_PLUGIN_B);
        const results = portal.searchPlugins('economy');
        expect(results.map((p) => p.pluginId)).toContain('plugin-beta');
      });
    });

    describe('getStats', () => {
      it('avgPluginRating is 0 with no plugins', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        expect(portal.getStats().avgPluginRating).toBe(0);
      });

      it('calculates average rating correctly', () => {
        const portal = createDevPortalServer(DEFAULT_DEVPORTAL_CONFIG);
        portal.registerPlugin(SAMPLE_PLUGIN);
        portal.registerPlugin(SAMPLE_PLUGIN_B);
        const avg = portal.getStats().avgPluginRating;
        expect(avg).toBeCloseTo((4.5 + 3.8) / 2, 5);
      });
    });
  });
});
