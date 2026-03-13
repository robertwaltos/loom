/**
 * Nakama Client Adapter - Simulation Tests
 *
 * Verifies request construction, auth/session handling,
 * mapping behavior, and adapter endpoint coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNakamaClient, type NakamaClientConfig } from '../nakama-client.js';

interface MockResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
}

function base64UrlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${base64UrlJson({ alg: 'HS256', typ: 'JWT' })}.${base64UrlJson(payload)}.sig`;
}

function makeResponse(status: number, body: unknown, ok = true): MockResponse {
  const jsonText = body === undefined ? '' : JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => jsonText,
  };
}

function makeConfig(): NakamaClientConfig {
  return {
    host: 'nakama.local',
    port: 7350,
    serverKey: 'server-key',
    useSSL: false,
    timeout: 10_000,
  };
}

function ensureBase64Globals() {
  if (typeof globalThis.btoa !== 'function') {
    Object.defineProperty(globalThis, 'btoa', {
      value: (input: string) => Buffer.from(input, 'binary').toString('base64'),
      configurable: true,
      writable: true,
    });
  }
  if (typeof globalThis.atob !== 'function') {
    Object.defineProperty(globalThis, 'atob', {
      value: (input: string) => Buffer.from(input, 'base64').toString('binary'),
      configurable: true,
      writable: true,
    });
  }
}

function makeSessionToken(expirationSeconds: number): string {
  return makeJwt({ uid: 'user-1', usn: 'kindler-one', exp: expirationSeconds });
}

describe('nakama client adapter', () => {
  beforeEach(() => {
    ensureBase64Globals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticateEmail posts expected payload and maps session fields', async () => {
    const token = makeSessionToken(4_102_444_800); // 2100-01-01
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(String(init?.headers && (init.headers as Record<string, string>).Authorization)).toContain('Basic');
      expect(String(init?.body)).toContain('kindler@example.com');
      return makeResponse(200, { token, refresh_token: 'refresh-1' });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const session = await client.authenticateEmail('kindler@example.com', 'secret', true);

    expect(session.userId).toBe('user-1');
    expect(session.username).toBe('kindler-one');
    expect(session.token).toBe(token);
    expect(session.refreshToken).toBe('refresh-1');
    expect(session.expiresAt).toBe(4_102_444_800_000);
    expect(session.isExpired()).toBe(false);
  });

  it('authenticateDevice sends device id body and create flag query', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain('/v2/account/authenticate/device?create=false');
      expect(String(init?.body)).toContain('device-abc');
      return makeResponse(200, { token, refresh_token: 'refresh-2' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const session = await client.authenticateDevice('device-abc', false);

    expect(session.userId).toBe('user-1');
  });

  it('authenticateCustom sends custom id body and maps session', async () => {
    const token = makeSessionToken(4_102_444_800);
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse(200, { token, refresh_token: 'refresh-3' })));

    const client = createNakamaClient(makeConfig());
    const session = await client.authenticateCustom('custom-id', true);

    expect(session.username).toBe('kindler-one');
  });

  it('refreshSession uses bearer auth and refresh token in body', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${token}`);
      expect(String(init?.body)).toContain('refresh-old');
      return makeResponse(200, { token, refresh_token: 'refresh-new' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const session = await client.refreshSession({
      token,
      refreshToken: 'refresh-old',
      userId: 'u',
      username: 'n',
      expiresAt: 0,
      isExpired: () => false,
    });

    expect(session.refreshToken).toBe('refresh-new');
  });

  it('updateStatus issues PUT to status endpoint', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      expect(String(input)).toContain('/v2/status');
      expect(init?.method).toBe('PUT');
      expect(String(init?.body)).toContain('Exploring');
      return makeResponse(200, undefined);
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    await client.updateStatus(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      'Exploring',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('getUsers maps user records into presence objects', async () => {
    const token = makeSessionToken(4_102_444_800);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse(200, {
          users: [
            { id: 'u1', username: 'A', session_id: 's1', status: 'online' },
            { user_id: 'u2', username: 'B', session_id: 's2', status: 'away' },
          ],
        })),
    );

    const client = createNakamaClient(makeConfig());
    const result = await client.getUsers(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      ['u1', 'u2'],
    );

    expect(result).toEqual([
      { userId: 'u1', username: 'A', sessionId: 's1', status: 'online' },
      { userId: 'u2', username: 'B', sessionId: 's2', status: 'away' },
    ]);
  });

  it('createMatch and joinMatch map match payloads', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse(200, { match_id: 'm1', label: 'ranked', size: 2, presences: [{ id: 'u1', username: 'A' }] }),
      )
      .mockResolvedValueOnce(
        makeResponse(200, { match_id: 'm1', label: 'ranked', size: 3, presences: [{ id: 'u2', username: 'B' }] }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const session = { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false };

    const created = await client.createMatch(session, 'ranked');
    const joined = await client.joinMatch(session, 'm1');

    expect(created.matchId).toBe('m1');
    expect(joined.size).toBe(3);
  });

  it('listMatches supports optional label filter', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (input: unknown) => {
      expect(String(input)).toContain('limit=10');
      expect(String(input)).toContain('label=duo');
      return makeResponse(200, { matches: [{ match_id: 'm2', label: 'duo', size: 2 }] });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const result = await client.listMatches(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      10,
      'duo',
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe('duo');
  });

  it('writeLeaderboardRecord stringifies score values and maps response', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(String(init?.body)).toContain('"score":"100"');
      expect(String(init?.body)).toContain('"subscore":"50"');
      return makeResponse(200, {
        owner_id: 'u1',
        username: 'Pilot',
        score: '100',
        subscore: '50',
        rank: '1',
        metadata: '{"season":1}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const record = await client.writeLeaderboardRecord(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      'pvp',
      100,
      50,
      '{"season":1}',
    );

    expect(record).toEqual({
      ownerId: 'u1',
      username: 'Pilot',
      score: 100,
      subscore: 50,
      rank: 1,
      metadata: '{"season":1}',
    });
  });

  it('listLeaderboardRecords maps all numeric fields', async () => {
    const token = makeSessionToken(4_102_444_800);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => makeResponse(200, { records: [{ owner_id: 'u1', username: 'A', score: '5', subscore: '2', rank: '9' }] })),
    );

    const client = createNakamaClient(makeConfig());
    const records = await client.listLeaderboardRecords(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      'lb-1',
      5,
    );

    expect(records[0]).toEqual({
      ownerId: 'u1',
      username: 'A',
      score: 5,
      subscore: 2,
      rank: 9,
      metadata: '{}',
    });
  });

  it('writeStorageObject posts collection/key/value object payload', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(String(init?.method)).toBe('PUT');
      expect(String(init?.body)).toContain('"collection":"profiles"');
      expect(String(init?.body)).toContain('"key":"k1"');
      expect(String(init?.body)).toContain('"value":"{\\"x\\":1}"');
      return makeResponse(200, undefined);
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    await client.writeStorageObject(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      'profiles',
      'k1',
      '{"x":1}',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('readStorageObjects maps returned storage objects', async () => {
    const token = makeSessionToken(4_102_444_800);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse(200, {
          objects: [
            { collection: 'profiles', key: 'k1', user_id: 'u1', value: '{"x":1}', version: 'v1' },
          ],
        })),
    );

    const client = createNakamaClient(makeConfig());
    const objects = await client.readStorageObjects(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      'profiles',
      ['k1'],
    );

    expect(objects).toEqual([{ collection: 'profiles', key: 'k1', userId: 'u1', value: '{"x":1}', version: 'v1' }]);
  });

  it('addFriend and removeFriend hit friend endpoint with expected verbs', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (_input: unknown) => makeResponse(200, undefined));
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    const session = { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false };

    await client.addFriend(session, 'friend-1');
    await client.removeFriend(session, 'friend-1');

    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('DELETE');
  });

  it('listFriends maps embedded user objects to presence objects', async () => {
    const token = makeSessionToken(4_102_444_800);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeResponse(200, {
          friends: [
            { user: { id: 'f1', username: 'FriendOne', session_id: 'sess-1', status: 'online' } },
          ],
        })),
    );

    const client = createNakamaClient(makeConfig());
    const result = await client.listFriends(
      { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
      10,
    );

    expect(result).toEqual([{ userId: 'f1', username: 'FriendOne', sessionId: 'sess-1', status: 'online' }]);
  });

  it('throws descriptive errors when API response is not ok', async () => {
    const token = makeSessionToken(4_102_444_800);
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse(500, 'boom', false)));

    const client = createNakamaClient(makeConfig());

    await expect(
      client.listMatches(
        { token, refreshToken: 'r', userId: 'u', username: 'n', expiresAt: 0, isExpired: () => false },
        5,
      ),
    ).rejects.toThrow('Nakama API GET /v2/match?limit=5: 500');
  });

  it('returns empty payload-derived session fields for malformed JWT', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse(200, { token: 'bad-token', refresh_token: 'r' })));

    const client = createNakamaClient(makeConfig());
    const session = await client.authenticateCustom('id', true);

    expect(session.userId).toBe('');
    expect(session.username).toBe('');
    expect(session.expiresAt).toBe(0);
  });

  it('disconnect resets abort controller and allows future requests', async () => {
    const token = makeSessionToken(4_102_444_800);
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(false);
      return makeResponse(200, { token, refresh_token: 'r' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createNakamaClient(makeConfig());
    client.disconnect();

    const session = await client.authenticateCustom('id', true);
    expect(session.refreshToken).toBe('r');
  });
});
