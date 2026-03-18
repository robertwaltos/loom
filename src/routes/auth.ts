/**
 * Auth Routes — Player account creation and session management.
 *
 * POST /v1/auth/register  — Create a new player account
 * POST /v1/auth/login     — Authenticate and get session token
 * GET  /v1/auth/me        — Get current session info (requires Authorization: Bearer <token>)
 *
 * Delegates identity storage to Nakama; locally creates a dynasty entry.
 *
 * Thread: silk/launch-readiness
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';

// ─── Request / Response Shapes ───────────────────────────────────

interface RegisterRequest {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly displayName?: string;
  readonly ageTier?: number;
  readonly parentalConsentToken?: string;
}

interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

interface AuthResponse {
  readonly ok: true;
  readonly token: string;
  readonly playerId: string;
  readonly displayName: string;
  readonly createdAt: string;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Validation ──────────────────────────────────────────────────

function validateRegisterInput(body: unknown): RegisterRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b['username'] !== 'string' || b['username'].length < 3) return null;
  if (typeof b['email'] !== 'string' || !b['email'].includes('@')) return null;
  if (typeof b['password'] !== 'string' || b['password'].length < 8) return null;
  return {
    username: b['username'],
    email: b['email'],
    password: b['password'],
    displayName: typeof b['displayName'] === 'string' ? b['displayName'] : b['username'],
    ageTier: typeof b['ageTier'] === 'number' ? b['ageTier'] : undefined,
    parentalConsentToken: typeof b['parentalConsentToken'] === 'string' ? b['parentalConsentToken'] : undefined,
  };
}

/** Returns true if the ageTier indicates a player under 13 (all Kindler tiers are ages 5–10). */
function isUnderThirteen(ageTier: number | undefined): boolean {
  return ageTier === 1 || ageTier === 2 || ageTier === 3;
}

function validateLoginInput(body: unknown): LoginRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b['email'] !== 'string' || !b['email'].includes('@')) return null;
  if (typeof b['password'] !== 'string') return null;
  return { email: b['email'], password: b['password'] };
}

// ─── Token utilities ─────────────────────────────────────────────

function extractBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== 'string') return null;
  const parts = authHeader.split(' ');
  if (parts[0] !== 'Bearer' || parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

// ─── Route Registrar ─────────────────────────────────────────────

export function createAuthRoutes(deps: {
  readonly nakamaHost: string;
  readonly nakamaPort: number;
  readonly serverKey: string;
}): (app: FastifyAppLike) => Promise<void> {
  const baseUrl = `http://${deps.nakamaHost}:${deps.nakamaPort}`;

  return async (app) => {
    // POST /v1/auth/register
    app.post('/v1/auth/register', async (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };
      const input = validateRegisterInput((req as { body: unknown }).body);

      if (!input) {
        return r.code(400).send({
          ok: false,
          error: 'Invalid input: username ≥3 chars, valid email, password ≥8 chars required',
          code: 'INVALID_INPUT',
        } satisfies ErrorResponse);
      }

      // ── Age Gate (COPPA) ─────────────────────────────────────────
      if (isUnderThirteen(input.ageTier) && !input.parentalConsentToken) {
        return r.code(403).send({
          ok: false,
          error: 'Players under 13 require parental consent. Please complete verification at /v1/auth/parental-consent.',
          code: 'parental_consent_required',
        } satisfies ErrorResponse);
      }

      const credentials = Buffer.from(`${input.email}:${input.password}`).toString('base64');
      const nakamaRes = await fetch(
        `${baseUrl}/v2/account/authenticate/email?create=true&username=${encodeURIComponent(input.username)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${deps.serverKey}:`).toString('base64')}`,
          },
          body: JSON.stringify({ email: input.email, password: input.password }),
        },
      ).catch(() => null);

      if (!nakamaRes || !nakamaRes.ok) {
        const status = nakamaRes?.status ?? 0;
        if (status === 409) {
          return r.code(409).send({
            ok: false,
            error: 'An account with this email already exists',
            code: 'ACCOUNT_EXISTS',
          } satisfies ErrorResponse);
        }
        return r.code(502).send({
          ok: false,
          error: 'Account service unavailable',
          code: 'SERVICE_UNAVAILABLE',
        } satisfies ErrorResponse);
      }

      const session = await nakamaRes.json() as { token?: string; refresh_token?: string };
      if (!session.token) {
        return r.code(502).send({
          ok: false,
          error: 'Account service returned invalid session',
          code: 'SERVICE_ERROR',
        } satisfies ErrorResponse);
      }

      const playerId = extractPlayerIdFromToken(session.token);
      const displayName = input.displayName ?? input.username;
      r.code(201).send({
        ok: true,
        token: session.token,
        playerId,
        displayName,
        createdAt: new Date().toISOString(),
      } satisfies AuthResponse);
      void credentials; // suppress lint
    });

    // POST /v1/auth/login
    app.post('/v1/auth/login', async (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };
      const input = validateLoginInput((req as { body: unknown }).body);

      if (!input) {
        return r.code(400).send({
          ok: false,
          error: 'Invalid input: valid email and password required',
          code: 'INVALID_INPUT',
        } satisfies ErrorResponse);
      }

      const nakamaRes = await fetch(
        `${baseUrl}/v2/account/authenticate/email?create=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${deps.serverKey}:`).toString('base64')}`,
          },
          body: JSON.stringify({ email: input.email, password: input.password }),
        },
      ).catch(() => null);

      if (!nakamaRes || !nakamaRes.ok) {
        const status = nakamaRes?.status ?? 0;
        if (status === 401) {
          return r.code(401).send({
            ok: false,
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          } satisfies ErrorResponse);
        }
        return r.code(502).send({
          ok: false,
          error: 'Account service unavailable',
          code: 'SERVICE_UNAVAILABLE',
        } satisfies ErrorResponse);
      }

      const session = await nakamaRes.json() as { token?: string };
      if (!session.token) {
        return r.code(502).send({
          ok: false,
          error: 'Account service returned invalid session',
          code: 'SERVICE_ERROR',
        } satisfies ErrorResponse);
      }

      r.send({
        ok: true,
        token: session.token,
        playerId: extractPlayerIdFromToken(session.token),
        displayName: '',
        createdAt: new Date().toISOString(),
      } satisfies AuthResponse);
    });

    // GET /v1/auth/me
    app.get('/v1/auth/me', async (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };
      const headers = (req as { headers: Record<string, unknown> }).headers;
      const token = extractBearerToken(headers['authorization']);

      if (!token) {
        return r.code(401).send({
          ok: false,
          error: 'Missing or malformed Authorization header',
          code: 'UNAUTHORIZED',
        } satisfies ErrorResponse);
      }

      const nakamaRes = await fetch(`${baseUrl}/v2/account`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (!nakamaRes || !nakamaRes.ok) {
        return r.code(401).send({
          ok: false,
          error: 'Session expired or invalid',
          code: 'SESSION_EXPIRED',
        } satisfies ErrorResponse);
      }

      const account = await nakamaRes.json() as {
        user?: { id?: string; display_name?: string; create_time?: string };
      };

      r.send({
        ok: true,
        token,
        playerId: account.user?.id ?? '',
        displayName: account.user?.display_name ?? '',
        createdAt: account.user?.create_time ?? '',
      } satisfies AuthResponse);
    });
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function extractPlayerIdFromToken(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return '';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
      uid?: string;
      sub?: string;
    };
    return payload.uid ?? payload.sub ?? '';
  } catch {
    return '';
  }
}
