/**
 * witness-api.ts ΓÇö Fastify route handler for the Witness Protocol registration.
 *
 * Accepts pre-launch registrations from the teaser website and issues
 * a witnessId with flavour acknowledgment from "the Archive".
 *
 * Thread: silk
 * Tier: 2
 */

// ΓöÇΓöÇΓöÇ Error Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type WitnessApiErrorCode =
  | 'INVALID_EMAIL'
  | 'DYNASTY_NAME_TOO_SHORT'
  | 'DYNASTY_NAME_TOO_LONG'
  | 'DYNASTY_NAME_INVALID_CHARS'
  | 'STATEMENT_TOO_SHORT'
  | 'STATEMENT_TOO_LONG'
  | 'INVALID_TIER';

export class WitnessApiError extends Error {
  readonly code: WitnessApiErrorCode;
  readonly statusCode: number;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(
    code: WitnessApiErrorCode,
    message: string,
    statusCode = 400,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'WitnessApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

// ΓöÇΓöÇΓöÇ Request / Response Contracts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const WITNESS_TIERS = [
  'ACCORD',
  'PATRON',
  'HERALD',
  'PROMETHEUS',
  'SHEPHERD',
  'FIRST_LIGHT',
] as const;

export type WitnessTier = (typeof WITNESS_TIERS)[number];

export interface WitnessRegistrationRequest {
  readonly email: string;
  readonly dynastyName: string;
  readonly witnessStatement: string;
  readonly tier: WitnessTier;
}

export interface WitnessRegistrationResponse {
  readonly witnessId: string;
  readonly registeredAt: string;
  readonly message: string;
}

// ΓöÇΓöÇΓöÇ Flavour Messages ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const TIER_MESSAGES: Readonly<Record<WitnessTier, string>> = {
  ACCORD: 'The Chronicle has received your name. The Age of Radiance begins with a single witness.',
  PATRON: "The Archive records your patronage. Your dynasty's first entry has been reserved.",
  HERALD: 'Heralds are remembered. The Chronicle has marked your arrival.',
  PROMETHEUS: 'The founding generation is assembling. Your name will be in the first pages.',
  SHEPHERD: 'The Shepherd tier carries weight. The first worlds will know your dynasty.',
  FIRST_LIGHT: 'First Light. The rarest designation. The Architect has taken note.',
};

// ΓöÇΓöÇΓöÇ Port for storage dependency ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface WitnessProtocolPort {
  register(request: WitnessRegistrationRequest): Promise<WitnessRegistrationResponse>;
}

// ΓöÇΓöÇΓöÇ Validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DYNASTY_NAME_REGEX = /^[a-zA-Z0-9 -]+$/;

export function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new WitnessApiError('INVALID_EMAIL', `Invalid email address: ${email}`, 400, { email });
  }
}

export function validateDynastyName(name: string): void {
  if (name.length < 3) {
    throw new WitnessApiError(
      'DYNASTY_NAME_TOO_SHORT',
      'Dynasty name must be at least 3 characters',
      400,
      { length: name.length },
    );
  }
  if (name.length > 100) {
    throw new WitnessApiError(
      'DYNASTY_NAME_TOO_LONG',
      'Dynasty name must be at most 100 characters',
      400,
      { length: name.length },
    );
  }
  if (!DYNASTY_NAME_REGEX.test(name)) {
    throw new WitnessApiError(
      'DYNASTY_NAME_INVALID_CHARS',
      'Dynasty name may only contain letters, numbers, spaces, and hyphens',
      400,
      { name },
    );
  }
}

export function validateWitnessStatement(statement: string): void {
  if (statement.length < 10) {
    throw new WitnessApiError(
      'STATEMENT_TOO_SHORT',
      'Witness statement must be at least 10 characters',
      400,
      { length: statement.length },
    );
  }
  if (statement.length > 500) {
    throw new WitnessApiError(
      'STATEMENT_TOO_LONG',
      'Witness statement must be at most 500 characters',
      400,
      { length: statement.length },
    );
  }
}

export function validateTier(tier: string): WitnessTier {
  if (!(WITNESS_TIERS as readonly string[]).includes(tier)) {
    throw new WitnessApiError(
      'INVALID_TIER',
      `Invalid tier: ${tier}. Must be one of ${WITNESS_TIERS.join(', ')}`,
      400,
      { tier },
    );
  }
  return tier as WitnessTier;
}

export function validateRegistrationRequest(body: unknown): WitnessRegistrationRequest {
  const raw = body as Record<string, unknown>;
  validateEmail(String(raw.email ?? ''));
  validateDynastyName(String(raw.dynastyName ?? ''));
  validateWitnessStatement(String(raw.witnessStatement ?? ''));
  const tier = validateTier(String(raw.tier ?? ''));
  return {
    email: String(raw.email),
    dynastyName: String(raw.dynastyName),
    witnessStatement: String(raw.witnessStatement),
    tier,
  };
}

// ΓöÇΓöÇΓöÇ Flavour Logic ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getTierMessage(tier: WitnessTier): string {
  return TIER_MESSAGES[tier];
}

// ΓöÇΓöÇΓöÇ In-Memory Default Service ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface IdPort {
  readonly generate: () => string;
}

export interface ClockPort {
  readonly now: () => string; // ISO timestamp
}

export function createInMemoryWitnessService(
  idPort: IdPort,
  clock: ClockPort,
): WitnessProtocolPort {
  return {
    async register(request: WitnessRegistrationRequest): Promise<WitnessRegistrationResponse> {
      return {
        witnessId: idPort.generate(),
        registeredAt: clock.now(),
        message: getTierMessage(request.tier),
      };
    },
  };
}

// ΓöÇΓöÇΓöÇ Minimal Fastify surface for type-safety without hard dependency ΓöÇΓöÇ

interface FastifyRequest {
  readonly body: unknown;
}

interface FastifyReply {
  code(statusCode: number): FastifyReply;
  send(payload: unknown): FastifyReply;
}

interface RouteHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

interface FastifyInstance {
  post(path: string, handler: RouteHandler): void;
}

// ΓöÇΓöÇΓöÇ Route Registration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function registerWitnessRoutes(
  fastify: FastifyInstance,
  witnessService: WitnessProtocolPort,
): void {
  fastify.post('/api/witness', async (request: FastifyRequest, reply: FastifyReply) => {
    let validated: WitnessRegistrationRequest;
    try {
      validated = validateRegistrationRequest(request.body);
    } catch (err) {
      if (err instanceof WitnessApiError) {
        reply.code(err.statusCode).send({ error: err.code, message: err.message });
        return;
      }
      reply.code(400).send({ error: 'VALIDATION_FAILED', message: 'Invalid request body' });
      return;
    }

    const response = await witnessService.register(validated);
    reply.code(201).send(response);
  });
}
