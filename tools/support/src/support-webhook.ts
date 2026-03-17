/**
 * Player Support Webhook — Report submission, escalation, and moderation.
 *
 * Accepts inbound support tickets, fans out to Discord + internal queue,
 * provides scaffolding for ban/mute actions.
 *
 * Endpoints (Fastify plugin):
 *   POST /v1/support/report   — Submit a player report
 *   POST /v1/support/ban      — Internal: ban a player (shared secret auth)
 *   POST /v1/support/mute     — Internal: mute a player (shared secret auth)
 *   GET  /v1/support/ticket/:id — Get ticket status
 *
 * Thread: silk/launch-readiness
 * Tier: 1
 */

// ─── Types ───────────────────────────────────────────────────────

export type ReportCategory =
  | 'cheating'
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'bug'
  | 'other';

export interface SupportReport {
  readonly reporterId: string;
  readonly targetPlayerId?: string;
  readonly category: ReportCategory;
  readonly description: string;
  readonly worldId?: string;
  readonly evidenceUrl?: string;
}

export interface SupportTicket {
  readonly ticketId: string;
  readonly createdAt: string;
  readonly category: ReportCategory;
  readonly status: 'open' | 'investigating' | 'resolved' | 'closed';
  readonly reporterId: string;
}

export interface ModerationAction {
  readonly targetPlayerId: string;
  readonly action: 'ban' | 'mute';
  readonly durationMs?: number;
  readonly reason: string;
  readonly moderatorId: string;
}

// ─── Ticket Store (in-memory, replace with DB for production) ────

const ticketStore = new Map<string, SupportTicket & { report: SupportReport }>();

function generateTicketId(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// ─── Discord Notification ─────────────────────────────────────────

async function notifyDiscord(
  webhookUrl: string,
  ticket: SupportTicket,
  report: SupportReport,
): Promise<void> {
  const categoryEmoji: Record<ReportCategory, string> = {
    cheating: '🚨',
    harassment: '⚠️',
    spam: '📢',
    inappropriate_content: '🔞',
    bug: '🐛',
    other: '📝',
  };

  const payload = {
    embeds: [
      {
        title: `${categoryEmoji[report.category]} Support Ticket ${ticket.ticketId}`,
        color: report.category === 'cheating' ? 0xff4444 : 0xffaa00,
        fields: [
          { name: 'Category', value: report.category, inline: true },
          { name: 'Reporter', value: report.reporterId, inline: true },
          ...(report.targetPlayerId
            ? [{ name: 'Reported Player', value: report.targetPlayerId, inline: true }]
            : []),
          ...(report.worldId
            ? [{ name: 'World', value: report.worldId, inline: true }]
            : []),
          { name: 'Description', value: report.description.slice(0, 500), inline: false },
          ...(report.evidenceUrl
            ? [{ name: 'Evidence', value: report.evidenceUrl, inline: false }]
            : []),
        ],
        timestamp: ticket.createdAt,
        footer: { text: `Status: ${ticket.status}` },
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err: unknown) => {
    console.warn('[support-webhook] Discord notification failed', err);
  });
}

// ─── Input Validation ────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>([
  'cheating', 'harassment', 'spam', 'inappropriate_content', 'bug', 'other',
]);

function validateReport(body: unknown): SupportReport | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b['reporterId'] !== 'string' || !b['reporterId']) return null;
  if (typeof b['category'] !== 'string' || !VALID_CATEGORIES.has(b['category'])) return null;
  if (typeof b['description'] !== 'string' || b['description'].length < 10) return null;
  const report: SupportReport = {
    reporterId: b['reporterId'],
    category: b['category'] as ReportCategory,
    description: b['description'].slice(0, 2000),
    ...(typeof b['targetPlayerId'] === 'string' ? { targetPlayerId: b['targetPlayerId'] } : {}),
    ...(typeof b['worldId'] === 'string' ? { worldId: b['worldId'] } : {}),
    ...(typeof b['evidenceUrl'] === 'string' ? { evidenceUrl: b['evidenceUrl'] } : {}),
  };
  return report;
}

function validateModerationAction(body: unknown): ModerationAction | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b['targetPlayerId'] !== 'string') return null;
  if (b['action'] !== 'ban' && b['action'] !== 'mute') return null;
  if (typeof b['reason'] !== 'string' || !b['reason']) return null;
  if (typeof b['moderatorId'] !== 'string' || !b['moderatorId']) return null;
  const action: ModerationAction = {
    targetPlayerId: b['targetPlayerId'],
    action: b['action'],
    reason: b['reason'],
    moderatorId: b['moderatorId'],
    ...(typeof b['durationMs'] === 'number' ? { durationMs: b['durationMs'] } : {}),
  };
  return action;
}

// ─── Route Registrar ─────────────────────────────────────────────

export interface SupportWebhookDeps {
  readonly discordWebhookUrl?: string;
  readonly sharedSecret?: string;
  readonly onBan?: (action: ModerationAction) => Promise<void>;
  readonly onMute?: (action: ModerationAction) => Promise<void>;
}

export function createSupportRoutes(deps: SupportWebhookDeps = {}): (app: {
  get(path: string, handler: (req: unknown, reply: unknown) => unknown): void;
  post(path: string, handler: (req: unknown, reply: unknown) => unknown): void;
}) => Promise<void> {
  return async (app) => {
    // POST /v1/support/report
    app.post('/v1/support/report', async (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };
      const report = validateReport((req as { body: unknown }).body);

      if (!report) {
        return r.code(400).send({
          ok: false,
          error: 'Invalid report: reporterId, valid category, and description ≥10 chars required',
        });
      }

      const ticketId = generateTicketId();
      const ticket: SupportTicket = {
        ticketId,
        createdAt: new Date().toISOString(),
        category: report.category,
        status: 'open',
        reporterId: report.reporterId,
      };

      ticketStore.set(ticketId, { ...ticket, report });

      if (deps.discordWebhookUrl) {
        void notifyDiscord(deps.discordWebhookUrl, ticket, report);
      }

      r.code(201).send({ ok: true, ticketId, status: 'open' });
    });

    // GET /v1/support/ticket/:id
    app.get('/v1/support/ticket/:id', (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };
      const params = (req as { params: Record<string, string> }).params;
      const ticketId = params['id'];
      const entry = ticketStore.get(ticketId ?? '');

      if (!entry) {
        return r.code(404).send({ ok: false, error: 'Ticket not found' });
      }

      r.send({
        ok: true,
        ticketId: entry.ticketId,
        status: entry.status,
        category: entry.category,
        createdAt: entry.createdAt,
      });
    });

    // POST /v1/support/ban (internal, requires shared secret)
    app.post('/v1/support/ban', async (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };

      if (deps.sharedSecret) {
        const headers = (req as { headers: Record<string, unknown> }).headers;
        if (headers['x-support-secret'] !== deps.sharedSecret) {
          return r.code(403).send({ ok: false, error: 'Forbidden' });
        }
      }

      const action = validateModerationAction((req as { body: unknown }).body);
      if (!action || action.action !== 'ban') {
        return r.code(400).send({ ok: false, error: 'Invalid ban request' });
      }

      if (deps.onBan) await deps.onBan(action);

      r.send({
        ok: true,
        message: `Player ${action.targetPlayerId} banned`,
        durationMs: action.durationMs,
      });
    });

    // POST /v1/support/mute (internal, requires shared secret)
    app.post('/v1/support/mute', async (req, reply) => {
      const r = reply as { code(n: number): { send(b: unknown): void }; send(b: unknown): void };

      if (deps.sharedSecret) {
        const headers = (req as { headers: Record<string, unknown> }).headers;
        if (headers['x-support-secret'] !== deps.sharedSecret) {
          return r.code(403).send({ ok: false, error: 'Forbidden' });
        }
      }

      const action = validateModerationAction((req as { body: unknown }).body);
      if (!action || action.action !== 'mute') {
        return r.code(400).send({ ok: false, error: 'Invalid mute request' });
      }

      if (deps.onMute) await deps.onMute(action);

      r.send({
        ok: true,
        message: `Player ${action.targetPlayerId} muted`,
        durationMs: action.durationMs,
      });
    });
  };
}
