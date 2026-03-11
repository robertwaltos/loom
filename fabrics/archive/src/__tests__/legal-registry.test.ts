import { describe, it, expect } from 'vitest';
import { createLegalRegistrySystem } from '../legal-registry.js';
import type {
  LegalRegistrySystem,
  LegalEntity,
  LegalContract,
  Judgment,
} from '../legal-registry.js';

// ============================================================================
// HELPERS
// ============================================================================

function makeDeps() {
  let time = 1_000_000n;
  let counter = 0;
  const logs: string[] = [];
  return {
    clock: { now: () => time },
    idGen: {
      generate: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: (msg: string) => {
        logs.push('INFO: ' + msg);
      },
      warn: (msg: string) => {
        logs.push('WARN: ' + msg);
      },
    },
    advance: (us: bigint) => {
      time += us;
    },
    getLogs: () => logs,
  };
}

function makeSystem(): { sys: LegalRegistrySystem; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { sys: createLegalRegistrySystem(deps), deps };
}

function isEntity(r: LegalEntity | string): r is LegalEntity {
  return typeof r !== 'string';
}

function isContract(r: LegalContract | string): r is LegalContract {
  return typeof r !== 'string';
}

function isJudgment(r: Judgment | string): r is Judgment {
  return typeof r !== 'string';
}

// ============================================================================
// registerEntity
// ============================================================================

describe('registerEntity', () => {
  it('registers a new entity', () => {
    const { sys } = makeSystem();
    const result = sys.registerEntity('e1', 'House Voss', 'DYNASTY');
    expect(isEntity(result)).toBe(true);
    if (!isEntity(result)) return;
    expect(result.entityId).toBe('e1');
    expect(result.name).toBe('House Voss');
    expect(result.type).toBe('DYNASTY');
    expect(result.active).toBe(true);
  });

  it('returns already-registered for duplicate entityId', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'House Voss', 'DYNASTY');
    const result = sys.registerEntity('e1', 'Other', 'GUILD');
    expect(result).toBe('already-registered');
  });

  it('registers different entity types', () => {
    const { sys } = makeSystem();
    const types = ['DYNASTY', 'GUILD', 'CORPORATION', 'GOVERNMENT', 'INDIVIDUAL'] as const;
    for (const [i, type] of types.entries()) {
      const result = sys.registerEntity('e' + String(i), 'Entity ' + String(i), type);
      expect(isEntity(result)).toBe(true);
      if (isEntity(result)) expect(result.type).toBe(type);
    }
  });

  it('records registeredAt timestamp', () => {
    const { sys, deps } = makeSystem();
    deps.advance(5_000n);
    const result = sys.registerEntity('e1', 'Name', 'INDIVIDUAL');
    if (isEntity(result)) expect(result.registeredAt).toBe(1_005_000n);
  });
});

// ============================================================================
// deactivateEntity
// ============================================================================

describe('deactivateEntity', () => {
  it('deactivates an existing entity', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'House Voss', 'DYNASTY');
    const result = sys.deactivateEntity('e1');
    expect(result.success).toBe(true);
  });

  it('returns entity-not-found for unknown entity', () => {
    const { sys } = makeSystem();
    const result = sys.deactivateEntity('unknown');
    expect(result).toEqual({ success: false, error: 'entity-not-found' });
  });

  it('deactivated entity cannot be party to new contracts', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    sys.deactivateEntity('e1');
    const result = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    expect(result).toBe('entity-not-found');
  });
});

// ============================================================================
// createContract
// ============================================================================

describe('createContract', () => {
  it('creates a DRAFT contract with valid parties', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const result = sys.createContract(['e1', 'e2'], 'Alliance', 'share resources', 1000n, 9000n);
    expect(isContract(result)).toBe(true);
    if (!isContract(result)) return;
    expect(result.status).toBe('DRAFT');
    expect(result.title).toBe('Alliance');
    expect(result.parties).toEqual(['e1', 'e2']);
  });

  it('rejects fewer than 2 parties', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    const result = sys.createContract(['e1'], 'Deal', 'terms', 1000n, null);
    expect(result).toBe('invalid-status');
  });

  it('rejects unknown party', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    const result = sys.createContract(['e1', 'unknown'], 'Deal', 'terms', 1000n, null);
    expect(result).toBe('entity-not-found');
  });

  it('rejects effectiveTo <= effectiveFrom', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const result = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 5000n, 5000n);
    expect(result).toBe('invalid-status');
  });

  it('allows null effectiveTo (perpetual)', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const result = sys.createContract(['e1', 'e2'], 'Perpetual', 'forever', 1000n, null);
    expect(isContract(result)).toBe(true);
    if (isContract(result)) expect(result.effectiveTo).toBeNull();
  });
});

// ============================================================================
// activateContract / breachContract / completeContract
// ============================================================================

describe('contract status transitions', () => {
  function makeActiveContract(sys: LegalRegistrySystem) {
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const contract = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    if (!isContract(contract)) throw new Error('setup failed');
    return contract.contractId;
  }

  it('activates a DRAFT contract', () => {
    const { sys } = makeSystem();
    const id = makeActiveContract(sys);
    expect(sys.activateContract(id)).toEqual({ success: true });
    const c = sys.getContract(id);
    expect(c?.status).toBe('ACTIVE');
  });

  it('rejects activate on non-DRAFT contract', () => {
    const { sys } = makeSystem();
    const id = makeActiveContract(sys);
    sys.activateContract(id);
    const result = sys.activateContract(id);
    expect(result).toEqual({ success: false, error: 'invalid-status' });
  });

  it('breaches an ACTIVE contract', () => {
    const { sys } = makeSystem();
    const id = makeActiveContract(sys);
    sys.activateContract(id);
    expect(sys.breachContract(id)).toEqual({ success: true });
    expect(sys.getContract(id)?.status).toBe('BREACHED');
  });

  it('completes an ACTIVE contract', () => {
    const { sys } = makeSystem();
    const id = makeActiveContract(sys);
    sys.activateContract(id);
    expect(sys.completeContract(id)).toEqual({ success: true });
    expect(sys.getContract(id)?.status).toBe('COMPLETED');
  });

  it('returns contract-not-found for unknown contract', () => {
    const { sys } = makeSystem();
    expect(sys.activateContract('nope')).toEqual({ success: false, error: 'contract-not-found' });
  });
});

// ============================================================================
// issueJudgment
// ============================================================================

describe('issueJudgment', () => {
  it('issues a judgment against a contract', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const contract = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    if (!isContract(contract)) return;

    const result = sys.issueJudgment(contract.contractId, 'e1', 'GUILTY', 500n);
    expect(isJudgment(result)).toBe(true);
    if (!isJudgment(result)) return;
    expect(result.finding).toBe('GUILTY');
    expect(result.penalty).toBe(500n);
    expect(result.enforcedAt).toBeNull();
  });

  it('returns contract-not-found for unknown contract', () => {
    const { sys } = makeSystem();
    const result = sys.issueJudgment('nope', 'e1', 'GUILTY', 0n);
    expect(result).toBe('contract-not-found');
  });
});

// ============================================================================
// enforceJudgment
// ============================================================================

describe('enforceJudgment', () => {
  it('enforces an unenforced judgment', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const contract = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    if (!isContract(contract)) return;
    const judgment = sys.issueJudgment(contract.contractId, 'e1', 'GUILTY', 100n);
    if (!isJudgment(judgment)) return;

    expect(sys.enforceJudgment(judgment.judgmentId)).toEqual({ success: true });
  });

  it('rejects double enforcement', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const contract = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    if (!isContract(contract)) return;
    const judgment = sys.issueJudgment(contract.contractId, 'e1', 'GUILTY', 100n);
    if (!isJudgment(judgment)) return;

    sys.enforceJudgment(judgment.judgmentId);
    const result = sys.enforceJudgment(judgment.judgmentId);
    expect(result).toEqual({ success: false, error: 'invalid-status' });
  });

  it('returns judgment-not-found for unknown id', () => {
    const { sys } = makeSystem();
    expect(sys.enforceJudgment('nope')).toEqual({ success: false, error: 'judgment-not-found' });
  });
});

// ============================================================================
// listContracts / getJudgments
// ============================================================================

describe('listContracts and getJudgments', () => {
  it('lists contracts for a party', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    sys.registerEntity('e3', 'C', 'DYNASTY');
    sys.createContract(['e1', 'e2'], 'Deal 1', 'terms', 1000n, null);
    sys.createContract(['e2', 'e3'], 'Deal 2', 'terms', 1000n, null);
    sys.createContract(['e1', 'e3'], 'Deal 3', 'terms', 1000n, null);

    expect(sys.listContracts('e1')).toHaveLength(2);
    expect(sys.listContracts('e2')).toHaveLength(2);
    expect(sys.listContracts('e3')).toHaveLength(2);
  });

  it('returns empty array for entity with no contracts', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    expect(sys.listContracts('e1')).toHaveLength(0);
  });

  it('returns judgments for a contract', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const contract = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    if (!isContract(contract)) return;
    sys.issueJudgment(contract.contractId, 'e1', 'GUILTY', 100n);
    sys.issueJudgment(contract.contractId, 'e2', 'NOT_GUILTY', 0n);

    expect(sys.getJudgments(contract.contractId)).toHaveLength(2);
  });

  it('returns empty for contract with no judgments', () => {
    const { sys } = makeSystem();
    sys.registerEntity('e1', 'A', 'DYNASTY');
    sys.registerEntity('e2', 'B', 'DYNASTY');
    const contract = sys.createContract(['e1', 'e2'], 'Deal', 'terms', 1000n, null);
    if (!isContract(contract)) return;
    expect(sys.getJudgments(contract.contractId)).toHaveLength(0);
  });
});
