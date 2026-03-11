/**
 * Nakama Client Adapter — Real Nakama SDK integration for
 * identity, matchmaking, presence, and social features.
 *
 * Wraps the Nakama JS client behind the existing nakama-fabric
 * ports so the game simulation never imports Nakama directly.
 * Provides session management, real-time presence, matchmaking,
 * leaderboards, and storage operations.
 *
 * Thread: steel/nakama-fabric/nakama-client
 * Tier: 1
 */

// ─── Configuration ──────────────────────────────────────────────

export interface NakamaClientConfig {
  readonly host: string;
  readonly port: number;
  readonly serverKey: string;
  readonly useSSL: boolean;
  readonly timeout: number;
}

// ─── Session ────────────────────────────────────────────────────

export interface NakamaSession {
  readonly token: string;
  readonly refreshToken: string;
  readonly userId: string;
  readonly username: string;
  readonly expiresAt: number;
  readonly isExpired: () => boolean;
}

// ─── Presence ───────────────────────────────────────────────────

export interface NakamaPresence {
  readonly userId: string;
  readonly username: string;
  readonly sessionId: string;
  readonly status: string;
}

// ─── Match ──────────────────────────────────────────────────────

export interface NakamaMatch {
  readonly matchId: string;
  readonly label: string;
  readonly size: number;
  readonly presences: ReadonlyArray<NakamaPresence>;
}

// ─── Leaderboard ────────────────────────────────────────────────

export interface NakamaLeaderboardRecord {
  readonly ownerId: string;
  readonly username: string;
  readonly score: number;
  readonly subscore: number;
  readonly rank: number;
  readonly metadata: string;
}

// ─── Storage Object ─────────────────────────────────────────────

export interface NakamaStorageObject {
  readonly collection: string;
  readonly key: string;
  readonly userId: string;
  readonly value: string;
  readonly version: string;
}

// ─── Adapter Interface ──────────────────────────────────────────

export interface NakamaClientAdapter {
  // Auth
  readonly authenticateEmail: (email: string, password: string, create: boolean) => Promise<NakamaSession>;
  readonly authenticateDevice: (deviceId: string, create: boolean) => Promise<NakamaSession>;
  readonly authenticateCustom: (customId: string, create: boolean) => Promise<NakamaSession>;
  readonly refreshSession: (session: NakamaSession) => Promise<NakamaSession>;

  // Presence
  readonly updateStatus: (session: NakamaSession, status: string) => Promise<void>;
  readonly getUsers: (session: NakamaSession, userIds: ReadonlyArray<string>) => Promise<ReadonlyArray<NakamaPresence>>;

  // Matchmaking
  readonly createMatch: (session: NakamaSession, label: string) => Promise<NakamaMatch>;
  readonly joinMatch: (session: NakamaSession, matchId: string) => Promise<NakamaMatch>;
  readonly leaveMatch: (session: NakamaSession, matchId: string) => Promise<void>;
  readonly listMatches: (session: NakamaSession, limit: number, label?: string) => Promise<ReadonlyArray<NakamaMatch>>;

  // Leaderboards
  readonly writeLeaderboardRecord: (
    session: NakamaSession,
    leaderboardId: string,
    score: number,
    subscore?: number,
    metadata?: string,
  ) => Promise<NakamaLeaderboardRecord>;
  readonly listLeaderboardRecords: (
    session: NakamaSession,
    leaderboardId: string,
    limit: number,
  ) => Promise<ReadonlyArray<NakamaLeaderboardRecord>>;

  // Storage
  readonly writeStorageObject: (
    session: NakamaSession,
    collection: string,
    key: string,
    value: string,
  ) => Promise<void>;
  readonly readStorageObjects: (
    session: NakamaSession,
    collection: string,
    keys: ReadonlyArray<string>,
  ) => Promise<ReadonlyArray<NakamaStorageObject>>;

  // Friends
  readonly addFriend: (session: NakamaSession, userId: string) => Promise<void>;
  readonly removeFriend: (session: NakamaSession, userId: string) => Promise<void>;
  readonly listFriends: (session: NakamaSession, limit: number) => Promise<ReadonlyArray<NakamaPresence>>;

  // Connection lifecycle
  readonly disconnect: () => void;
}

// ─── HTTP Client (adapter layer) ────────────────────────────────

export function createNakamaClient(config: NakamaClientConfig): NakamaClientAdapter {
  const baseUrl = `${config.useSSL ? 'https' : 'http'}://${config.host}:${config.port}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${btoa(config.serverKey + ':')}`,
  };
  let abortController = new AbortController();

  async function apiCall<T>(
    session: NakamaSession | null,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const reqHeaders: Record<string, string> = { ...headers };
    if (session !== null) {
      reqHeaders['Authorization'] = `Bearer ${session.token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nakama API ${method} ${path}: ${response.status} ${errorText}`);
    }

    const text = await response.text();
    return text.length > 0 ? (JSON.parse(text) as T) : ({} as T);
  }

  function toSession(raw: Record<string, unknown>): NakamaSession {
    const token = String(raw['token'] ?? '');
    const refreshToken = String(raw['refresh_token'] ?? '');
    const payload = parseJwtPayload(token);
    return {
      token,
      refreshToken,
      userId: String(payload['uid'] ?? ''),
      username: String(payload['usn'] ?? ''),
      expiresAt: Number(payload['exp'] ?? 0) * 1000,
      isExpired: () => Date.now() > Number(payload['exp'] ?? 0) * 1000,
    };
  }

  return {
    authenticateEmail: async (email, password, create) => {
      const raw = await apiCall<Record<string, unknown>>(
        null, 'POST',
        `/v2/account/authenticate/email?create=${create}`,
        { email, password },
      );
      return toSession(raw);
    },

    authenticateDevice: async (deviceId, create) => {
      const raw = await apiCall<Record<string, unknown>>(
        null, 'POST',
        `/v2/account/authenticate/device?create=${create}`,
        { id: deviceId },
      );
      return toSession(raw);
    },

    authenticateCustom: async (customId, create) => {
      const raw = await apiCall<Record<string, unknown>>(
        null, 'POST',
        `/v2/account/authenticate/custom?create=${create}`,
        { id: customId },
      );
      return toSession(raw);
    },

    refreshSession: async (session) => {
      const raw = await apiCall<Record<string, unknown>>(
        session, 'POST',
        '/v2/account/session/refresh',
        { token: session.refreshToken },
      );
      return toSession(raw);
    },

    updateStatus: async (session, status) => {
      await apiCall(session, 'PUT', '/v2/status', { status });
    },

    getUsers: async (session, userIds) => {
      const ids = userIds.join('&ids=');
      const raw = await apiCall<{ users?: Array<Record<string, unknown>> }>(
        session, 'GET', `/v2/user?ids=${ids}`,
      );
      return (raw.users ?? []).map(toPresence);
    },

    createMatch: async (session, label) => {
      const raw = await apiCall<Record<string, unknown>>(
        session, 'POST', '/v2/match', { label },
      );
      return toMatch(raw);
    },

    joinMatch: async (session, matchId) => {
      const raw = await apiCall<Record<string, unknown>>(
        session, 'POST', `/v2/match/${encodeURIComponent(matchId)}/join`,
      );
      return toMatch(raw);
    },

    leaveMatch: async (session, matchId) => {
      await apiCall(session, 'POST', `/v2/match/${encodeURIComponent(matchId)}/leave`);
    },

    listMatches: async (session, limit, label) => {
      const params = [`limit=${limit}`];
      if (label !== undefined) params.push(`label=${encodeURIComponent(label)}`);
      const raw = await apiCall<{ matches?: Array<Record<string, unknown>> }>(
        session, 'GET', `/v2/match?${params.join('&')}`,
      );
      return (raw.matches ?? []).map(toMatch);
    },

    writeLeaderboardRecord: async (session, leaderboardId, score, subscore, metadata) => {
      const raw = await apiCall<Record<string, unknown>>(
        session, 'POST',
        `/v2/leaderboard/${encodeURIComponent(leaderboardId)}`,
        { score: String(score), subscore: subscore !== undefined ? String(subscore) : undefined, metadata },
      );
      return toLeaderboardRecord(raw);
    },

    listLeaderboardRecords: async (session, leaderboardId, limit) => {
      const raw = await apiCall<{ records?: Array<Record<string, unknown>> }>(
        session, 'GET',
        `/v2/leaderboard/${encodeURIComponent(leaderboardId)}?limit=${limit}`,
      );
      return (raw.records ?? []).map(toLeaderboardRecord);
    },

    writeStorageObject: async (session, collection, key, value) => {
      await apiCall(session, 'PUT', '/v2/storage', {
        objects: [{ collection, key, value }],
      });
    },

    readStorageObjects: async (session, collection, keys) => {
      const objectIds = keys.map(k => ({ collection, key: k }));
      const raw = await apiCall<{ objects?: Array<Record<string, unknown>> }>(
        session, 'POST', '/v2/storage', { object_ids: objectIds },
      );
      return (raw.objects ?? []).map(toStorageObject);
    },

    addFriend: async (session, userId) => {
      await apiCall(session, 'POST', `/v2/friend?ids=${userId}`);
    },

    removeFriend: async (session, userId) => {
      await apiCall(session, 'DELETE', `/v2/friend?ids=${userId}`);
    },

    listFriends: async (session, limit) => {
      const raw = await apiCall<{ friends?: Array<{ user: Record<string, unknown> }> }>(
        session, 'GET', `/v2/friend?limit=${limit}`,
      );
      return (raw.friends ?? []).map(f => toPresence(f.user));
    },

    disconnect: () => {
      abortController.abort();
      abortController = new AbortController();
    },
  };
}

// ─── Mappers ────────────────────────────────────────────────────

function toPresence(raw: Record<string, unknown>): NakamaPresence {
  return {
    userId: String(raw['id'] ?? raw['user_id'] ?? ''),
    username: String(raw['username'] ?? ''),
    sessionId: String(raw['session_id'] ?? ''),
    status: String(raw['status'] ?? 'online'),
  };
}

function toMatch(raw: Record<string, unknown>): NakamaMatch {
  const presences = Array.isArray(raw['presences'])
    ? (raw['presences'] as Array<Record<string, unknown>>).map(toPresence)
    : [];
  return {
    matchId: String(raw['match_id'] ?? ''),
    label: String(raw['label'] ?? ''),
    size: Number(raw['size'] ?? 0),
    presences,
  };
}

function toLeaderboardRecord(raw: Record<string, unknown>): NakamaLeaderboardRecord {
  return {
    ownerId: String(raw['owner_id'] ?? ''),
    username: String(raw['username'] ?? ''),
    score: Number(raw['score'] ?? 0),
    subscore: Number(raw['subscore'] ?? 0),
    rank: Number(raw['rank'] ?? 0),
    metadata: String(raw['metadata'] ?? '{}'),
  };
}

function toStorageObject(raw: Record<string, unknown>): NakamaStorageObject {
  return {
    collection: String(raw['collection'] ?? ''),
    key: String(raw['key'] ?? ''),
    userId: String(raw['user_id'] ?? ''),
    value: String(raw['value'] ?? '{}'),
    version: String(raw['version'] ?? ''),
  };
}

function parseJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  const segment = parts[1];
  if (segment === undefined) return {};
  try {
    const decoded = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}
