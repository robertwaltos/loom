/**
 * Tests for nakama-client.ts
 * Mocks the global fetch API to isolate the HTTP adapter layer.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createNakamaClient,
  type NakamaClientConfig,
  type NakamaSession,
} from '../nakama-client.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Build a mock Response-like object that fetch returns. */
function mockResponse(data: unknown, ok = true, status = 200) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return Promise.resolve({
    ok,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response);
}

/**
 * Build a JWT-shaped token that parseJwtPayload can decode.
 * Uses btoa (available in Node.js 18+ and vitest environment).
 */
function makeToken(uid: string, usn: string, expSecs: number): string {
  const payload = btoa(JSON.stringify({ uid, usn, exp: expSecs }));
  return `header.${payload}.sig`;
}

const NOW_SECS = Math.floor(Date.now() / 1000);

const defaultConfig: NakamaClientConfig = {
  host: 'localhost',
  port: 7350,
  serverKey: 'defaultkey',
  useSSL: false,
  timeout: 5000,
};

/** A pre-built mock session to pass as the session argument. */
const mockSession: NakamaSession = {
  token: makeToken('user-1', 'testuser', NOW_SECS + 3600),
  refreshToken: 'refresh-tok',
  userId: 'user-1',
  username: 'testuser',
  expiresAt: (NOW_SECS + 3600) * 1000,
  isExpired: () => false,
};

// ─── Factory ─────────────────────────────────────────────────────────────────

describe('createNakamaClient — factory', () => {
  it('returns an adapter with all required methods', () => {
    const adapter = createNakamaClient(defaultConfig);
    const methods = [
      'authenticateEmail',
      'authenticateDevice',
      'authenticateCustom',
      'refreshSession',
      'updateStatus',
      'getUsers',
      'createMatch',
      'joinMatch',
      'leaveMatch',
      'listMatches',
      'writeLeaderboardRecord',
      'listLeaderboardRecords',
      'writeStorageObject',
      'readStorageObjects',
      'addFriend',
      'removeFriend',
      'listFriends',
      'disconnect',
    ] as const;
    for (const m of methods) {
      expect(typeof adapter[m]).toBe('function');
    }
  });

  it('builds an HTTP base URL when useSSL is false', async () => {
    const adapter = createNakamaClient({ ...defaultConfig, useSSL: false });
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateEmail('a@b.com', 'pass', false);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toMatch(/^http:\/\//);
  });

  it('builds an HTTPS base URL when useSSL is true', async () => {
    const adapter = createNakamaClient({ ...defaultConfig, useSSL: true });
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateEmail('a@b.com', 'pass', false);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toMatch(/^https:\/\//);
  });

  it('includes the configured port in the URL', async () => {
    const adapter = createNakamaClient({ ...defaultConfig, port: 7777 });
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateEmail('a@b.com', 'pass', false);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain(':7777');
  });

  it('includes the configured host in the URL', async () => {
    const adapter = createNakamaClient({ ...defaultConfig, host: 'game.example.com' });
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateEmail('a@b.com', 'pass', false);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('game.example.com');
  });
});

// ─── Auth — authenticateEmail ─────────────────────────────────────────────────

describe('authenticateEmail', () => {
  it('calls /v2/account/authenticate/email with correct create param', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateEmail('user@example.com', 'pw', true);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/account/authenticate/email');
    expect(url).toContain('create=true');
  });

  it('uses POST method', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateEmail('a@b.com', 'pw', false);
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(opts.method).toBe('POST');
  });

  it('parses userId from JWT', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('uid-777', 'hero', 9999), refresh_token: 'r' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'pw', false);
    expect(session.userId).toBe('uid-777');
  });

  it('parses username from JWT', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'dragonlord', 9999), refresh_token: 'r' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'pw', false);
    expect(session.username).toBe('dragonlord');
  });

  it('stores the refreshToken on the session', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'my-refresh' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'pw', false);
    expect(session.refreshToken).toBe('my-refresh');
  });

  it('throws on a non-ok HTTP response', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse('Unauthorized', false, 401));
    await expect(adapter.authenticateEmail('a@b.com', 'wrong', false)).rejects.toThrow(/401/);
  });
});

// ─── Auth — authenticateDevice ────────────────────────────────────────────────

describe('authenticateDevice', () => {
  it('calls /v2/account/authenticate/device', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateDevice('device-abc', true);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/account/authenticate/device');
  });

  it('uses POST method', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateDevice('device-abc', false);
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(opts.method).toBe('POST');
  });

  it('returns a session with userId from token', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('dev-uid', 'devuser', 9999), refresh_token: 'r' }),
    );
    const session = await adapter.authenticateDevice('device-abc', false);
    expect(session.userId).toBe('dev-uid');
  });
});

// ─── Auth — authenticateCustom ────────────────────────────────────────────────

describe('authenticateCustom', () => {
  it('calls /v2/account/authenticate/custom', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateCustom('custom-id', false);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/account/authenticate/custom');
  });

  it('sets create param in URL', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'r' }),
    );
    await adapter.authenticateCustom('custom-id', true);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('create=true');
  });
});

// ─── Auth — refreshSession ────────────────────────────────────────────────────

describe('refreshSession', () => {
  it('calls /v2/account/session/refresh', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', 9999), refresh_token: 'new-r' }),
    );
    await adapter.refreshSession(mockSession);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/account/session/refresh');
  });

  it('returns a new session object', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u2', 'refreshed', 9999), refresh_token: 'new-r' }),
    );
    const newSession = await adapter.refreshSession(mockSession);
    expect(newSession.userId).toBe('u2');
    expect(newSession.username).toBe('refreshed');
  });
});

// ─── Presence — updateStatus ──────────────────────────────────────────────────

describe('updateStatus', () => {
  it('calls /v2/status with PUT', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.updateStatus(mockSession, 'in-game');
    const url = mockFetch.mock.calls[0]![0] as string;
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(url).toContain('/v2/status');
    expect(opts.method).toBe('PUT');
  });

  it('uses Bearer auth header', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.updateStatus(mockSession, 'idle');
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${mockSession.token}`);
  });
});

// ─── Presence — getUsers ──────────────────────────────────────────────────────

describe('getUsers', () => {
  it('calls /v2/user with user ids in query string', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ users: [] }));
    await adapter.getUsers(mockSession, ['uid1', 'uid2']);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/user');
    expect(url).toContain('uid1');
  });

  it('returns mapped presences', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({
        users: [{ id: 'p1', username: 'player1', session_id: 'sess-1', status: 'online' }],
      }),
    );
    const presences = await adapter.getUsers(mockSession, ['p1']);
    expect(presences).toHaveLength(1);
    expect(presences[0]!.userId).toBe('p1');
    expect(presences[0]!.username).toBe('player1');
    expect(presences[0]!.status).toBe('online');
  });

  it('returns empty array when users field is absent', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({}));
    const presences = await adapter.getUsers(mockSession, []);
    expect(presences).toHaveLength(0);
  });
});

// ─── Matchmaking — createMatch ────────────────────────────────────────────────

describe('createMatch', () => {
  it('calls /v2/match with POST', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ match_id: 'm1', label: 'pve', size: 0, presences: [] }),
    );
    await adapter.createMatch(mockSession, 'pve');
    const url = mockFetch.mock.calls[0]![0] as string;
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(url).toContain('/v2/match');
    expect(opts.method).toBe('POST');
  });

  it('returns a mapped match object', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ match_id: 'match-99', label: 'pvp', size: 4, presences: [] }),
    );
    const match = await adapter.createMatch(mockSession, 'pvp');
    expect(match.matchId).toBe('match-99');
    expect(match.label).toBe('pvp');
    expect(match.size).toBe(4);
  });

  it('maps presences within match', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({
        match_id: 'm1',
        label: 'x',
        size: 1,
        presences: [{ id: 'u1', username: 'p1', session_id: 's1', status: 'online' }],
      }),
    );
    const match = await adapter.createMatch(mockSession, 'x');
    expect(match.presences).toHaveLength(1);
    expect(match.presences[0]!.userId).toBe('u1');
  });
});

// ─── Matchmaking — joinMatch ──────────────────────────────────────────────────

describe('joinMatch', () => {
  it('calls join endpoint for the given matchId', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ match_id: 'm2', label: '', size: 2, presences: [] }),
    );
    await adapter.joinMatch(mockSession, 'match-abc');
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('match-abc');
    expect(url).toContain('join');
  });
});

// ─── Matchmaking — leaveMatch ─────────────────────────────────────────────────

describe('leaveMatch', () => {
  it('calls leave endpoint for the given matchId', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.leaveMatch(mockSession, 'match-abc');
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('match-abc');
    expect(url).toContain('leave');
  });
});

// ─── Matchmaking — listMatches ────────────────────────────────────────────────

describe('listMatches', () => {
  it('calls /v2/match with limit param', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ matches: [] }));
    await adapter.listMatches(mockSession, 10);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/match');
    expect(url).toContain('limit=10');
  });

  it('appends label filter when provided', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ matches: [] }));
    await adapter.listMatches(mockSession, 5, 'pvp');
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('label=pvp');
  });

  it('does not append label when not provided', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ matches: [] }));
    await adapter.listMatches(mockSession, 5);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).not.toContain('label=');
  });

  it('returns empty array when matches field is absent', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({}));
    const matches = await adapter.listMatches(mockSession, 10);
    expect(matches).toHaveLength(0);
  });
});

// ─── Leaderboards — writeLeaderboardRecord ────────────────────────────────────

describe('writeLeaderboardRecord', () => {
  it('calls the leaderboard endpoint with the board id', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({ owner_id: 'u1', username: 'p', score: 100, subscore: 0, rank: 1, metadata: '{}' }),
    );
    await adapter.writeLeaderboardRecord(mockSession, 'wealth-lb', 100);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/leaderboard/wealth-lb');
  });

  it('returns a mapped leaderboard record', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({
        owner_id: 'u2',
        username: 'champion',
        score: 9000,
        subscore: 5,
        rank: 1,
        metadata: '{"x":1}',
      }),
    );
    const record = await adapter.writeLeaderboardRecord(mockSession, 'lb', 9000, 5, '{"x":1}');
    expect(record.ownerId).toBe('u2');
    expect(record.username).toBe('champion');
    expect(record.score).toBe(9000);
    expect(record.subscore).toBe(5);
    expect(record.rank).toBe(1);
  });
});

// ─── Leaderboards — listLeaderboardRecords ────────────────────────────────────

describe('listLeaderboardRecords', () => {
  it('calls the leaderboard GET endpoint with limit', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ records: [] }));
    await adapter.listLeaderboardRecords(mockSession, 'wealth-lb', 20);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/leaderboard/wealth-lb');
    expect(url).toContain('limit=20');
  });

  it('returns empty array when records field is absent', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({}));
    const records = await adapter.listLeaderboardRecords(mockSession, 'lb', 10);
    expect(records).toHaveLength(0);
  });
});

// ─── Storage — writeStorageObject ─────────────────────────────────────────────

describe('writeStorageObject', () => {
  it('calls /v2/storage with PUT', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.writeStorageObject(mockSession, 'profile', 'avatar', '{"color":"red"}');
    const url = mockFetch.mock.calls[0]![0] as string;
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(url).toContain('/v2/storage');
    expect(opts.method).toBe('PUT');
  });
});

// ─── Storage — readStorageObjects ─────────────────────────────────────────────

describe('readStorageObjects', () => {
  it('calls /v2/storage with POST', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ objects: [] }));
    await adapter.readStorageObjects(mockSession, 'profile', ['avatar', 'bio']);
    const url = mockFetch.mock.calls[0]![0] as string;
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(url).toContain('/v2/storage');
    expect(opts.method).toBe('POST');
  });

  it('returns mapped storage objects', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({
        objects: [
          { collection: 'profile', key: 'avatar', user_id: 'u1', value: '{"x":1}', version: 'v1' },
        ],
      }),
    );
    const objects = await adapter.readStorageObjects(mockSession, 'profile', ['avatar']);
    expect(objects).toHaveLength(1);
    expect(objects[0]!.collection).toBe('profile');
    expect(objects[0]!.key).toBe('avatar');
    expect(objects[0]!.value).toBe('{"x":1}');
    expect(objects[0]!.version).toBe('v1');
  });

  it('returns empty array when objects field is absent', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({}));
    const objects = await adapter.readStorageObjects(mockSession, 'col', []);
    expect(objects).toHaveLength(0);
  });
});

// ─── Friends ──────────────────────────────────────────────────────────────────

describe('addFriend', () => {
  it('calls /v2/friend with POST and userId in query', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.addFriend(mockSession, 'friend-uid-1');
    const url = mockFetch.mock.calls[0]![0] as string;
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(url).toContain('/v2/friend');
    expect(url).toContain('friend-uid-1');
    expect(opts.method).toBe('POST');
  });
});

describe('removeFriend', () => {
  it('calls /v2/friend with DELETE', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.removeFriend(mockSession, 'friend-uid-2');
    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(opts.method).toBe('DELETE');
  });

  it('includes userId in the friend DELETE URL', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await adapter.removeFriend(mockSession, 'friend-uid-2');
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('friend-uid-2');
  });
});

describe('listFriends', () => {
  it('calls /v2/friend GET with limit', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({ friends: [] }));
    await adapter.listFriends(mockSession, 25);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/v2/friend');
    expect(url).toContain('limit=25');
  });

  it('maps nested user objects to presences', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(
      mockResponse({
        friends: [
          { user: { id: 'f1', username: 'friend1', session_id: '', status: 'offline' } },
          { user: { id: 'f2', username: 'friend2', session_id: '', status: 'online' } },
        ],
      }),
    );
    const friends = await adapter.listFriends(mockSession, 10);
    expect(friends).toHaveLength(2);
    expect(friends[0]!.userId).toBe('f1');
    expect(friends[1]!.userId).toBe('f2');
  });

  it('returns empty array when friends field is absent', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse({}));
    const friends = await adapter.listFriends(mockSession, 10);
    expect(friends).toHaveLength(0);
  });
});

// ─── disconnect ───────────────────────────────────────────────────────────────

describe('disconnect', () => {
  it('does not throw when called', () => {
    const adapter = createNakamaClient(defaultConfig);
    expect(() => adapter.disconnect()).not.toThrow();
  });

  it('can be called multiple times without error', () => {
    const adapter = createNakamaClient(defaultConfig);
    expect(() => {
      adapter.disconnect();
      adapter.disconnect();
      adapter.disconnect();
    }).not.toThrow();
  });

  it('adapter remains usable after disconnect', async () => {
    const adapter = createNakamaClient(defaultConfig);
    adapter.disconnect();
    mockFetch.mockReturnValue(mockResponse({ matches: [] }));
    const matches = await adapter.listMatches(mockSession, 5);
    expect(matches).toHaveLength(0);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws with status code on API error', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse('Not Found', false, 404));
    await expect(adapter.listMatches(mockSession, 10)).rejects.toThrow(/404/);
  });

  it('throws on 403 forbidden response', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse('Forbidden', false, 403));
    await expect(adapter.writeStorageObject(mockSession, 'col', 'key', '{}')).rejects.toThrow(/403/);
  });

  it('handles empty response body gracefully', async () => {
    const adapter = createNakamaClient(defaultConfig);
    mockFetch.mockReturnValue(mockResponse(''));
    await expect(adapter.leaveMatch(mockSession, 'match-1')).resolves.not.toThrow();
  });
});

// ─── Session expiry helpers ────────────────────────────────────────────────────

describe('session expiry', () => {
  it('isExpired returns false for a future token', async () => {
    const adapter = createNakamaClient(defaultConfig);
    const futureExp = Math.floor(Date.now() / 1000) + 7200;
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', futureExp), refresh_token: 'r' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'p', false);
    expect(session.isExpired()).toBe(false);
  });

  it('isExpired returns true for an expired token', async () => {
    const adapter = createNakamaClient(defaultConfig);
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', pastExp), refresh_token: 'r' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'p', false);
    expect(session.isExpired()).toBe(true);
  });

  it('expiresAt is stored in milliseconds', async () => {
    const adapter = createNakamaClient(defaultConfig);
    const expSecs = 1_700_000_000;
    mockFetch.mockReturnValue(
      mockResponse({ token: makeToken('u', 'n', expSecs), refresh_token: 'r' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'p', false);
    expect(session.expiresAt).toBe(expSecs * 1000);
  });

  it('handles a malformed JWT payload gracefully (falls back to empty defaults)', async () => {
    const adapter = createNakamaClient(defaultConfig);
    // Bad token: second segment is not valid base64 JSON
    mockFetch.mockReturnValue(
      mockResponse({ token: 'bad.!!!.sig', refresh_token: 'r' }),
    );
    const session = await adapter.authenticateEmail('a@b.com', 'p', false);
    expect(session.userId).toBe('');
    expect(session.username).toBe('');
  });
});
