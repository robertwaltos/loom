import { describe, it, expect } from 'vitest';
import { createTreatyEngine, MAX_VIOLATIONS_BEFORE_BREAK } from '../treaty-engine.js';
import type { TreatyEngineDeps, ProposeTreatyParams, TreatyTerms } from '../treaty-engine.js';

function makeDeps(): TreatyEngineDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'treaty-' + String(idCounter);
      },
    },
  };
}

function makeTerms(overrides?: Partial<TreatyTerms>): TreatyTerms {
  return {
    description: 'Standard treaty terms',
    conditions: ['No raiding', 'Shared patrols'],
    ...overrides,
  };
}

function makeProposal(overrides?: Partial<ProposeTreatyParams>): ProposeTreatyParams {
  return {
    proposerId: 'dynasty-a',
    counterpartyId: 'dynasty-b',
    treatyType: 'NON_AGGRESSION',
    terms: makeTerms(),
    durationUs: 10_000_000,
    ...overrides,
  };
}

function createAndActivate(
  engine: ReturnType<typeof createTreatyEngine>,
  proposal?: ProposeTreatyParams,
): string {
  const params = proposal ?? makeProposal();
  const treaty = engine.propose(params);
  engine.sign(treaty.treatyId);
  engine.activate(treaty.treatyId);
  return treaty.treatyId;
}

describe('TreatyEngine -- proposal', () => {
  it('creates a treaty in PROPOSED phase', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    expect(treaty.phase).toBe('PROPOSED');
    expect(treaty.proposerId).toBe('dynasty-a');
    expect(treaty.counterpartyId).toBe('dynasty-b');
    expect(treaty.treatyType).toBe('NON_AGGRESSION');
  });

  it('rejects self-treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    expect(() => engine.propose(makeProposal({ counterpartyId: 'dynasty-a' }))).toThrow(
      'Cannot propose a treaty with self',
    );
  });

  it('rejects zero or negative duration', () => {
    const engine = createTreatyEngine(makeDeps());
    expect(() => engine.propose(makeProposal({ durationUs: 0 }))).toThrow(
      'duration must be positive',
    );
  });
});

describe('TreatyEngine -- negotiation', () => {
  it('accepts counter-proposal on proposed treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    const updated = engine.counterPropose({
      treatyId: treaty.treatyId,
      newTerms: makeTerms({ description: 'Revised terms' }),
    });
    expect(updated.phase).toBe('NEGOTIATING');
    expect(updated.terms.description).toBe('Revised terms');
  });

  it('allows multiple counter-proposals', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    engine.counterPropose({
      treatyId: treaty.treatyId,
      newTerms: makeTerms({ description: 'Round 1' }),
    });
    const updated = engine.counterPropose({
      treatyId: treaty.treatyId,
      newTerms: makeTerms({ description: 'Round 2' }),
    });
    expect(updated.terms.description).toBe('Round 2');
  });

  it('rejects counter-proposal on signed treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    engine.sign(treaty.treatyId);
    expect(() =>
      engine.counterPropose({
        treatyId: treaty.treatyId,
        newTerms: makeTerms(),
      }),
    ).toThrow('not open for negotiation');
  });
});

describe('TreatyEngine -- signing and activation', () => {
  it('signs a proposed treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    const signed = engine.sign(treaty.treatyId);
    expect(signed.phase).toBe('SIGNED');
    expect(signed.signedAt).toBeGreaterThan(0);
  });

  it('signs a negotiating treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    engine.counterPropose({
      treatyId: treaty.treatyId,
      newTerms: makeTerms({ description: 'Agreed' }),
    });
    const signed = engine.sign(treaty.treatyId);
    expect(signed.phase).toBe('SIGNED');
  });

  it('activates a signed treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    engine.sign(treaty.treatyId);
    const active = engine.activate(treaty.treatyId);
    expect(active.phase).toBe('ACTIVE');
    expect(active.activatedAt).toBeGreaterThan(0);
    expect(active.expiresAt).toBeGreaterThan(active.activatedAt);
  });

  it('rejects activation of unsigned treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    expect(() => engine.activate(treaty.treatyId)).toThrow('must be SIGNED');
  });

  it('rejects signing an active treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const tid = createAndActivate(engine);
    expect(() => engine.sign(tid)).toThrow('cannot be signed');
  });
});

describe('TreatyEngine -- termination', () => {
  it('terminates an active treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const tid = createAndActivate(engine);
    const terminated = engine.terminate(tid);
    expect(terminated.phase).toBe('TERMINATED');
    expect(terminated.terminatedAt).toBeGreaterThan(0);
  });

  it('terminates a proposed treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    const terminated = engine.terminate(treaty.treatyId);
    expect(terminated.phase).toBe('TERMINATED');
  });

  it('rejects termination of terminal treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const tid = createAndActivate(engine);
    engine.terminate(tid);
    expect(() => engine.terminate(tid)).toThrow('terminal phase');
  });
});

describe('TreatyEngine -- violations', () => {
  it('records a violation on active treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const tid = createAndActivate(engine);
    const updated = engine.reportViolation({
      treatyId: tid,
      violatorId: 'dynasty-a',
      description: 'Raided border settlement',
    });
    expect(updated.violations).toHaveLength(1);
    expect(updated.violations[0]?.violatorId).toBe('dynasty-a');
  });

  it('breaks treaty after max violations', () => {
    const engine = createTreatyEngine(makeDeps());
    const tid = createAndActivate(engine);
    for (let i = 0; i < MAX_VIOLATIONS_BEFORE_BREAK; i++) {
      engine.reportViolation({
        treatyId: tid,
        violatorId: 'dynasty-a',
        description: 'Violation ' + String(i + 1),
      });
    }
    const treaty = engine.getTreaty(tid);
    expect(treaty?.phase).toBe('BROKEN');
  });

  it('rejects violation on non-active treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    expect(() =>
      engine.reportViolation({
        treatyId: treaty.treatyId,
        violatorId: 'dynasty-a',
        description: 'Something',
      }),
    ).toThrow('only report violations on ACTIVE');
  });

  it('rejects violation from non-party', () => {
    const engine = createTreatyEngine(makeDeps());
    const tid = createAndActivate(engine);
    expect(() =>
      engine.reportViolation({
        treatyId: tid,
        violatorId: 'outsider',
        description: 'Not involved',
      }),
    ).toThrow('not party to this treaty');
  });
});

describe('TreatyEngine -- expiration', () => {
  it('auto-expires treaty after duration', () => {
    let time = 0;
    const engine = createTreatyEngine({
      clock: { nowMicroseconds: () => (time += 1_000) },
      idGenerator: {
        generate: () => {
          time++;
          return 'treaty-' + String(time);
        },
      },
    });
    const tid = createAndActivate(engine, makeProposal({ durationUs: 5_000 }));
    time += 100_000;
    const treaty = engine.getTreaty(tid);
    expect(treaty?.phase).toBe('EXPIRED');
  });
});

describe('TreatyEngine -- queries', () => {
  it('gets treaty by id', () => {
    const engine = createTreatyEngine(makeDeps());
    const treaty = engine.propose(makeProposal());
    const fetched = engine.getTreaty(treaty.treatyId);
    expect(fetched).toBeDefined();
    expect(fetched?.proposerId).toBe('dynasty-a');
  });

  it('returns undefined for unknown treaty', () => {
    const engine = createTreatyEngine(makeDeps());
    expect(engine.getTreaty('nonexistent')).toBeUndefined();
  });

  it('lists treaties by dynasty', () => {
    const engine = createTreatyEngine(makeDeps());
    engine.propose(makeProposal());
    engine.propose(makeProposal({ counterpartyId: 'dynasty-c' }));
    const list = engine.listByDynasty('dynasty-a');
    expect(list).toHaveLength(2);
  });

  it('lists only active treaties', () => {
    const engine = createTreatyEngine(makeDeps());
    createAndActivate(engine);
    engine.propose(makeProposal({ counterpartyId: 'dynasty-c' }));
    const active = engine.listActive();
    expect(active).toHaveLength(1);
  });

  it('gets treaty history for a dynasty', () => {
    const engine = createTreatyEngine(makeDeps());
    engine.propose(makeProposal());
    engine.propose(
      makeProposal({
        proposerId: 'dynasty-b',
        counterpartyId: 'dynasty-a',
        treatyType: 'TRADE_AGREEMENT',
      }),
    );
    const history = engine.getHistory('dynasty-a');
    expect(history).toHaveLength(2);
    expect(history[0]?.otherParty).toBe('dynasty-b');
  });
});

describe('TreatyEngine -- stats', () => {
  it('reports correct stats', () => {
    const engine = createTreatyEngine(makeDeps());
    createAndActivate(engine);
    engine.propose(makeProposal({ counterpartyId: 'dynasty-c' }));
    const tid2 = createAndActivate(engine, makeProposal({ counterpartyId: 'dynasty-d' }));
    engine.terminate(tid2);
    const stats = engine.getStats();
    expect(stats.totalTreaties).toBe(3);
    expect(stats.activeTreaties).toBe(1);
    expect(stats.proposedTreaties).toBe(1);
    expect(stats.terminatedTreaties).toBe(1);
  });

  it('exports MAX_VIOLATIONS_BEFORE_BREAK', () => {
    expect(MAX_VIOLATIONS_BEFORE_BREAK).toBe(3);
  });
});

describe('TreatyEngine -- error handling', () => {
  it('throws for unknown treaty on sign', () => {
    const engine = createTreatyEngine(makeDeps());
    expect(() => engine.sign('nonexistent')).toThrow('not found');
  });

  it('throws for unknown treaty on activate', () => {
    const engine = createTreatyEngine(makeDeps());
    expect(() => engine.activate('nonexistent')).toThrow('not found');
  });

  it('throws for unknown treaty on terminate', () => {
    const engine = createTreatyEngine(makeDeps());
    expect(() => engine.terminate('nonexistent')).toThrow('not found');
  });
});
