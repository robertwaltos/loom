/**
 * DevPortal Server — API explorer and documentation server scaffold.
 *
 * Provides the community modder and plugin developer portal for
 * The Concord's Loom game platform.
 *
 * Phase 16.4 — Wave GGGG
 */

// ─── Types ───────────────────────────────────────────────────────────

export type DevPortalConfig = {
  readonly port: number;
  readonly apiBaseUrl: string;
  readonly gameVersion: string;
  readonly modsdkVersion: string;
  readonly enablePlayground: boolean;
};

export type ApiEndpointSpec = {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly description: string;
  readonly auth: boolean;
  readonly requestSchema?: string;
  readonly responseSchema?: string;
  readonly tags: string[];
};

export type PluginShowcaseEntry = {
  readonly pluginId: string;
  readonly name: string;
  readonly author: string;
  readonly version: string;
  readonly description: string;
  readonly downloadCount: number;
  readonly rating: number;
  readonly tags: string[];
};

// ─── DevPortal Service ───────────────────────────────────────────────

export interface DevPortalServer {
  readonly registerEndpoint: (spec: ApiEndpointSpec) => void;
  readonly listEndpoints: (tag?: string) => ApiEndpointSpec[];
  readonly searchEndpoints: (query: string) => ApiEndpointSpec[];
  readonly registerPlugin: (entry: PluginShowcaseEntry) => void;
  readonly getFeaturedPlugins: (limit?: number) => PluginShowcaseEntry[];
  readonly searchPlugins: (query: string) => PluginShowcaseEntry[];
  readonly getStats: () => {
    endpointCount: number;
    pluginCount: number;
    avgPluginRating: number;
  };
}

// ─── Canonical Loom API Endpoints ────────────────────────────────────

const CANONICAL_ENDPOINTS: readonly ApiEndpointSpec[] = [
  {
    method: 'POST',
    path: '/v1/auth/login',
    description: 'Authenticate a player and obtain a session token',
    auth: false,
    requestSchema: '{ dynastyId: string; secret: string }',
    responseSchema: '{ token: string; expiresAt: number }',
    tags: ['auth'],
  },
  {
    method: 'POST',
    path: '/v1/auth/refresh',
    description: 'Refresh an expiring session token',
    auth: true,
    tags: ['auth'],
  },
  {
    method: 'POST',
    path: '/v1/transit/request',
    description: 'Request inter-world transit for a character',
    auth: true,
    requestSchema: '{ characterId: string; destinationWorldId: string }',
    responseSchema: '{ transitId: string; estimatedArrival: number }',
    tags: ['transit'],
  },
  {
    method: 'GET',
    path: '/v1/transit/routes',
    description: 'List all available canonical transit routes',
    auth: false,
    responseSchema: '{ routes: TransitRoute[] }',
    tags: ['transit'],
  },
  {
    method: 'GET',
    path: '/v1/economy/kalon/balance',
    description: 'Get the KALON balance for the authenticated dynasty',
    auth: true,
    responseSchema: '{ balance: string; walletId: string }',
    tags: ['economy'],
  },
  {
    method: 'POST',
    path: '/v1/economy/exchange/order',
    description: 'Place a buy or sell order on the resource exchange',
    auth: true,
    requestSchema:
      '{ resource: ResourceType; side: "buy"|"sell"; pricePerUnit: string; quantity: number }',
    responseSchema: '{ orderId: string; status: OrderStatus }',
    tags: ['economy', 'exchange'],
  },
  {
    method: 'GET',
    path: '/v1/economy/exchange/depth',
    description: 'Get the current order book depth for a resource',
    auth: false,
    responseSchema: '{ bids: DepthLevel[]; asks: DepthLevel[] }',
    tags: ['economy', 'exchange'],
  },
  {
    method: 'POST',
    path: '/v1/assembly/motion',
    description: 'Propose a new motion to the Assembly chamber',
    auth: true,
    requestSchema: '{ title: string; body: string; worldId: string }',
    tags: ['assembly'],
  },
  {
    method: 'GET',
    path: '/v1/assembly/motions',
    description: 'List all active motions in the Assembly',
    auth: false,
    responseSchema: '{ motions: Motion[] }',
    tags: ['assembly'],
  },
  {
    method: 'POST',
    path: '/v1/assembly/vote',
    description: 'Cast a vote on an active Assembly motion',
    auth: true,
    requestSchema: '{ motionId: string; vote: "aye"|"nay"|"abstain" }',
    tags: ['assembly'],
  },
  {
    method: 'POST',
    path: '/v1/dynasty/found',
    description: 'Found a new dynasty in The Concord',
    auth: true,
    requestSchema:
      '{ name: string; homeWorldId: string; founderCharacterId: string }',
    responseSchema: '{ dynastyId: string; foundedAt: number }',
    tags: ['dynasty'],
  },
  {
    method: 'GET',
    path: '/v1/dynasty/:dynastyId',
    description: 'Get the public profile of a dynasty',
    auth: false,
    tags: ['dynasty'],
  },
  {
    method: 'POST',
    path: '/v1/character/create',
    description: 'Create a new character within the authenticated dynasty',
    auth: true,
    requestSchema: '{ name: string; worldId: string; archetype: string }',
    responseSchema: '{ characterId: string }',
    tags: ['character'],
  },
  {
    method: 'GET',
    path: '/v1/character/:characterId',
    description: 'Get the details of a specific character',
    auth: false,
    tags: ['character'],
  },
  {
    method: 'POST',
    path: '/v1/chat/send',
    description: 'Send a message in a world or guild chat channel',
    auth: true,
    requestSchema: '{ channelId: string; content: string }',
    tags: ['chat'],
  },
  {
    method: 'GET',
    path: '/v1/events/upcoming',
    description: 'List upcoming scheduled in-game events',
    auth: false,
    responseSchema: '{ events: GameEvent[] }',
    tags: ['events'],
  },
  {
    method: 'POST',
    path: '/v1/survey/mission',
    description: 'Start a new Survey Corps mission',
    auth: true,
    requestSchema: '{ worldId: string; missionType: string }',
    tags: ['survey'],
  },
  {
    method: 'GET',
    path: '/v1/modding/plugins',
    description: 'List all registered modding plugins',
    auth: false,
    responseSchema: '{ plugins: Plugin[] }',
    tags: ['modding'],
  },
  {
    method: 'POST',
    path: '/v1/modding/plugin/register',
    description: 'Register a new community plugin with the mod system',
    auth: true,
    requestSchema:
      '{ pluginId: string; name: string; version: string; entrypoint: string }',
    tags: ['modding'],
  },
];

// ─── Factory ─────────────────────────────────────────────────────────

export function createDevPortalServer(config: DevPortalConfig): DevPortalServer {
  const endpoints = new Map<string, ApiEndpointSpec>();
  const plugins = new Map<string, PluginShowcaseEntry>();

  function endpointKey(spec: ApiEndpointSpec): string {
    return `${spec.method}:${spec.path}`;
  }

  for (const spec of CANONICAL_ENDPOINTS) {
    endpoints.set(endpointKey(spec), spec);
  }

  return {
    registerEndpoint(spec: ApiEndpointSpec): void {
      endpoints.set(endpointKey(spec), spec);
    },

    listEndpoints(tag?: string): ApiEndpointSpec[] {
      const all = Array.from(endpoints.values());
      if (tag === undefined || tag === '') return all;
      return all.filter((e) => e.tags.includes(tag));
    },

    searchEndpoints(query: string): ApiEndpointSpec[] {
      const q = query.toLowerCase();
      return Array.from(endpoints.values()).filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    },

    registerPlugin(entry: PluginShowcaseEntry): void {
      plugins.set(entry.pluginId, entry);
    },

    getFeaturedPlugins(limit?: number): PluginShowcaseEntry[] {
      const sorted = Array.from(plugins.values()).sort(
        (a, b) => b.rating - a.rating,
      );
      if (limit === undefined) return sorted;
      return sorted.slice(0, limit);
    },

    searchPlugins(query: string): PluginShowcaseEntry[] {
      const q = query.toLowerCase();
      return Array.from(plugins.values()).filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    },

    getStats(): { endpointCount: number; pluginCount: number; avgPluginRating: number } {
      const pluginList = Array.from(plugins.values());
      const avgPluginRating =
        pluginList.length === 0
          ? 0
          : pluginList.reduce((sum, p) => sum + p.rating, 0) / pluginList.length;
      return {
        endpointCount: endpoints.size,
        pluginCount: plugins.size,
        avgPluginRating,
      };
    },
  };
}

// ─── Default Config ──────────────────────────────────────────────────

export const DEFAULT_DEVPORTAL_CONFIG: DevPortalConfig = {
  port: 4200,
  apiBaseUrl: 'https://api.theconcord.loom',
  gameVersion: '1.0.0',
  modsdkVersion: '0.16.4',
  enablePlayground: true,
};
