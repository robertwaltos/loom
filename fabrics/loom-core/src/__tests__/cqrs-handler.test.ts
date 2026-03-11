import { describe, it, expect } from 'vitest';
import { createCqrsHandler, MAX_EXECUTION_LOG_SIZE, DEFAULT_TIMEOUT_US } from '../cqrs-handler.js';
import type { CqrsDeps, CommandEnvelope, QueryEnvelope } from '../cqrs-handler.js';

function createDeps(startTime = 1000): {
  deps: CqrsDeps;
  advance: (t: number) => void;
} {
  let time = startTime;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'id-' + String(id++) },
    },
    advance: (t: number) => {
      time += t;
    },
  };
}

function makeCommandEnvelope(overrides?: Partial<CommandEnvelope>): CommandEnvelope {
  return {
    commandType: 'entity.spawn',
    payload: { entityId: 'e-1' },
    issuedBy: 'player-1',
    correlationId: 'corr-1',
    ...overrides,
  };
}

function makeQueryEnvelope(overrides?: Partial<QueryEnvelope>): QueryEnvelope {
  return {
    queryType: 'entity.get',
    payload: { entityId: 'e-1' },
    issuedBy: 'player-1',
    correlationId: 'corr-2',
    ...overrides,
  };
}

describe('CqrsHandler — registerCommandHandler', () => {
  it('registers a command handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ spawned: true }));
    expect(cqrs.hasHandler('entity.spawn', 'COMMAND')).toBe(true);
  });

  it('does not bleed into query handlers', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ spawned: true }));
    expect(cqrs.hasHandler('entity.spawn', 'QUERY')).toBe(false);
  });

  it('overwrites existing handler for same type', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ version: 1 }));
    cqrs.registerCommandHandler('entity.spawn', () => ({ version: 2 }));
    const result = cqrs.executeCommand(makeCommandEnvelope());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ version: 2 });
  });
});

describe('CqrsHandler — registerQueryHandler', () => {
  it('registers a query handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerQueryHandler('entity.get', () => ({ name: 'hero' }));
    expect(cqrs.hasHandler('entity.get', 'QUERY')).toBe(true);
  });

  it('does not bleed into command handlers', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerQueryHandler('entity.get', () => ({ name: 'hero' }));
    expect(cqrs.hasHandler('entity.get', 'COMMAND')).toBe(false);
  });
});

describe('CqrsHandler — executeCommand', () => {
  it('executes a registered command handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', (payload) => ({
      spawned: true,
      entityId: payload['entityId'],
    }));
    const result = cqrs.executeCommand(makeCommandEnvelope());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ spawned: true, entityId: 'e-1' });
    expect(result.error).toBeNull();
    expect(result.executionId).toBeDefined();
  });

  it('returns failure for unregistered command type', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    const result = cqrs.executeCommand(makeCommandEnvelope({ commandType: 'unknown' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('No command handler');
    expect(result.data).toBeNull();
  });

  it('catches thrown errors from handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('bad', () => {
      throw new Error('Boom');
    });
    const result = cqrs.executeCommand(makeCommandEnvelope({ commandType: 'bad' }));
    expect(result.success).toBe(false);
    expect(result.error).toBe('Boom');
  });

  it('tracks execution duration', () => {
    const { deps, advance } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('slow', () => {
      advance(500);
      return { done: true };
    });
    const result = cqrs.executeCommand(makeCommandEnvelope({ commandType: 'slow' }));
    expect(result.success).toBe(true);
    expect(result.durationUs).toBe(500);
  });
});

describe('CqrsHandler — executeQuery', () => {
  it('executes a registered query handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerQueryHandler('entity.get', (payload) => ({
      entityId: payload['entityId'],
      name: 'hero',
    }));
    const result = cqrs.executeQuery(makeQueryEnvelope());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ entityId: 'e-1', name: 'hero' });
  });

  it('returns failure for unregistered query type', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    const result = cqrs.executeQuery(makeQueryEnvelope({ queryType: 'unknown' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('No query handler');
  });

  it('catches thrown errors from query handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerQueryHandler('bad', () => {
      throw new Error('Query failed');
    });
    const result = cqrs.executeQuery(makeQueryEnvelope({ queryType: 'bad' }));
    expect(result.success).toBe(false);
    expect(result.error).toBe('Query failed');
  });
});

describe('CqrsHandler — removeHandler', () => {
  it('removes a command handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({}));
    expect(cqrs.removeHandler('entity.spawn', 'COMMAND')).toBe(true);
    expect(cqrs.hasHandler('entity.spawn', 'COMMAND')).toBe(false);
  });

  it('removes a query handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerQueryHandler('entity.get', () => ({}));
    expect(cqrs.removeHandler('entity.get', 'QUERY')).toBe(true);
    expect(cqrs.hasHandler('entity.get', 'QUERY')).toBe(false);
  });

  it('returns false for unknown handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    expect(cqrs.removeHandler('nope', 'COMMAND')).toBe(false);
  });

  it('records HANDLER_REMOVED event', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({}));
    cqrs.removeHandler('entity.spawn', 'COMMAND');
    const log = cqrs.getExecutionLog(100);
    const kinds = log.map((e) => e.kind);
    expect(kinds).toContain('HANDLER_REMOVED');
  });
});

describe('CqrsHandler — getHandlerStats', () => {
  it('returns stats for a command handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ ok: true }));
    cqrs.executeCommand(makeCommandEnvelope());
    cqrs.executeCommand(makeCommandEnvelope());
    const stats = cqrs.getHandlerStats('entity.spawn');
    expect(stats).toBeDefined();
    expect(stats?.totalExecutions).toBe(2);
    expect(stats?.totalSuccesses).toBe(2);
    expect(stats?.totalFailures).toBe(0);
    expect(stats?.handlerType).toBe('COMMAND');
  });

  it('returns stats for a query handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerQueryHandler('entity.get', () => ({ found: true }));
    cqrs.executeQuery(makeQueryEnvelope());
    const stats = cqrs.getHandlerStats('entity.get');
    expect(stats).toBeDefined();
    expect(stats?.totalExecutions).toBe(1);
    expect(stats?.handlerType).toBe('QUERY');
  });

  it('tracks failure counts', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('fail', () => {
      throw new Error('broken');
    });
    cqrs.executeCommand(makeCommandEnvelope({ commandType: 'fail' }));
    const stats = cqrs.getHandlerStats('fail');
    expect(stats?.totalFailures).toBe(1);
    expect(stats?.totalSuccesses).toBe(0);
  });

  it('returns undefined for unknown handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    expect(cqrs.getHandlerStats('nope')).toBeUndefined();
  });

  it('updates lastExecutedAt', () => {
    const { deps, advance } = createDeps(5000);
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ ok: true }));
    advance(1000);
    cqrs.executeCommand(makeCommandEnvelope());
    const stats = cqrs.getHandlerStats('entity.spawn');
    expect(stats?.lastExecutedAt).toBe(6000);
  });
});

describe('CqrsHandler — listRegisteredTypes', () => {
  it('lists all types when no filter', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('cmd.a', () => ({}));
    cqrs.registerQueryHandler('query.b', () => ({}));
    const types = cqrs.listRegisteredTypes();
    expect(types).toContain('cmd.a');
    expect(types).toContain('query.b');
    expect(types).toHaveLength(2);
  });

  it('lists only command types', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('cmd.a', () => ({}));
    cqrs.registerQueryHandler('query.b', () => ({}));
    const types = cqrs.listRegisteredTypes('COMMAND');
    expect(types).toEqual(['cmd.a']);
  });

  it('lists only query types', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('cmd.a', () => ({}));
    cqrs.registerQueryHandler('query.b', () => ({}));
    const types = cqrs.listRegisteredTypes('QUERY');
    expect(types).toEqual(['query.b']);
  });

  it('returns empty array when nothing registered', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    expect(cqrs.listRegisteredTypes()).toHaveLength(0);
  });
});

describe('CqrsHandler — getExecutionLog', () => {
  it('returns recent execution events', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ ok: true }));
    cqrs.executeCommand(makeCommandEnvelope());
    const log = cqrs.getExecutionLog(10);
    const execEvents = log.filter((e) => e.kind === 'COMMAND_EXECUTED');
    expect(execEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('limits returned entries', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({ ok: true }));
    for (let i = 0; i < 10; i++) {
      cqrs.executeCommand(makeCommandEnvelope());
    }
    const log = cqrs.getExecutionLog(3);
    expect(log).toHaveLength(3);
  });

  it('returns empty array when no events', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    expect(cqrs.getExecutionLog(10)).toHaveLength(0);
  });

  it('includes registration events', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity.spawn', () => ({}));
    const log = cqrs.getExecutionLog(10);
    const regEvents = log.filter((e) => e.kind === 'HANDLER_REGISTERED');
    expect(regEvents.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CqrsHandler — getStats', () => {
  it('starts with zero stats', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    const stats = cqrs.getStats();
    expect(stats.totalCommandHandlers).toBe(0);
    expect(stats.totalQueryHandlers).toBe(0);
    expect(stats.totalCommandExecutions).toBe(0);
    expect(stats.totalQueryExecutions).toBe(0);
    expect(stats.totalSuccesses).toBe(0);
    expect(stats.totalFailures).toBe(0);
    expect(stats.logSize).toBe(0);
  });

  it('tracks handler and execution counts', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('cmd.a', () => ({ ok: true }));
    cqrs.registerCommandHandler('cmd.b', () => ({ ok: true }));
    cqrs.registerQueryHandler('query.c', () => ({ found: true }));
    cqrs.executeCommand(makeCommandEnvelope({ commandType: 'cmd.a' }));
    cqrs.executeCommand(makeCommandEnvelope({ commandType: 'cmd.b' }));
    cqrs.executeQuery(makeQueryEnvelope({ queryType: 'query.c' }));
    cqrs.executeCommand(makeCommandEnvelope({ commandType: 'missing' }));

    const stats = cqrs.getStats();
    expect(stats.totalCommandHandlers).toBe(2);
    expect(stats.totalQueryHandlers).toBe(1);
    expect(stats.totalCommandExecutions).toBe(3);
    expect(stats.totalQueryExecutions).toBe(1);
    expect(stats.totalSuccesses).toBe(3);
    expect(stats.totalFailures).toBe(1);
  });
});

describe('CqrsHandler — constants', () => {
  it('exports expected constants', () => {
    expect(MAX_EXECUTION_LOG_SIZE).toBe(10_000);
    expect(DEFAULT_TIMEOUT_US).toBe(5_000_000);
  });
});

describe('CqrsHandler — command and query separation', () => {
  it('same type name can exist as both command and query', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity', () => ({ written: true }));
    cqrs.registerQueryHandler('entity', () => ({ read: true }));

    expect(cqrs.hasHandler('entity', 'COMMAND')).toBe(true);
    expect(cqrs.hasHandler('entity', 'QUERY')).toBe(true);

    const cmdResult = cqrs.executeCommand(makeCommandEnvelope({ commandType: 'entity' }));
    const queryResult = cqrs.executeQuery(makeQueryEnvelope({ queryType: 'entity' }));
    expect(cmdResult.data).toEqual({ written: true });
    expect(queryResult.data).toEqual({ read: true });
  });

  it('removing command handler does not affect query handler', () => {
    const { deps } = createDeps();
    const cqrs = createCqrsHandler(deps);
    cqrs.registerCommandHandler('entity', () => ({ written: true }));
    cqrs.registerQueryHandler('entity', () => ({ read: true }));

    cqrs.removeHandler('entity', 'COMMAND');
    expect(cqrs.hasHandler('entity', 'COMMAND')).toBe(false);
    expect(cqrs.hasHandler('entity', 'QUERY')).toBe(true);
  });
});
