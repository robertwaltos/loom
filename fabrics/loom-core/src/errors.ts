/**
 * Structured error types for The Loom.
 *
 * Every error carries a code, a correlation ID, and context.
 * Commandment 6: Errors are first-class citizens.
 */

export type LoomErrorCode =
  | 'ENTITY_NOT_FOUND'
  | 'ENTITY_ALREADY_EXISTS'
  | 'COMPONENT_NOT_FOUND'
  | 'WORLD_NOT_FOUND'
  | 'WORLD_ALREADY_EXISTS'
  | 'EVENT_BUS_CLOSED'
  | 'INVALID_ENTITY_TYPE'
  | 'INVALID_COMPONENT'
  | 'WORLD_CAPACITY_REACHED';

export class LoomError extends Error {
  readonly code: LoomErrorCode;
  readonly correlationId: string | undefined;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(
    code: LoomErrorCode,
    message: string,
    context: Record<string, unknown> = {},
    correlationId?: string,
  ) {
    super(message);
    this.name = 'LoomError';
    this.code = code;
    this.context = context;
    this.correlationId = correlationId;
  }
}

export function entityNotFound(entityId: string, correlationId?: string): LoomError {
  return new LoomError(
    'ENTITY_NOT_FOUND',
    `Entity ${entityId} not found`,
    { entityId },
    correlationId,
  );
}

export function entityAlreadyExists(entityId: string, correlationId?: string): LoomError {
  return new LoomError(
    'ENTITY_ALREADY_EXISTS',
    `Entity ${entityId} already exists`,
    { entityId },
    correlationId,
  );
}

export function componentNotFound(
  entityId: string,
  componentType: string,
  correlationId?: string,
): LoomError {
  return new LoomError(
    'COMPONENT_NOT_FOUND',
    `Component ${componentType} not found on entity ${entityId}`,
    { entityId, componentType },
    correlationId,
  );
}

export function worldNotFound(worldId: string, correlationId?: string): LoomError {
  return new LoomError('WORLD_NOT_FOUND', `World ${worldId} not found`, { worldId }, correlationId);
}

export function worldAlreadyExists(worldId: string, correlationId?: string): LoomError {
  return new LoomError(
    'WORLD_ALREADY_EXISTS',
    `World ${worldId} already exists`,
    { worldId },
    correlationId,
  );
}

export function eventBusClosed(correlationId?: string): LoomError {
  return new LoomError('EVENT_BUS_CLOSED', 'Event bus is closed', {}, correlationId);
}

export function worldCapacityReached(
  worldId: string,
  capacity: number,
  correlationId?: string,
): LoomError {
  return new LoomError(
    'WORLD_CAPACITY_REACHED',
    `World ${worldId} has reached capacity (${String(capacity)})`,
    { worldId, capacity },
    correlationId,
  );
}
