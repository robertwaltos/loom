import { describe, expect, it } from 'vitest';
import { createCarbonCreditSystem } from '../carbon-credit.js';

describe('carbon-credit simulation', () => {
  const make = () => {
    let now = 1_000_000n;
    let id = 0;
    return createCarbonCreditSystem({
      clock: { nowMicroseconds: () => (now += 1_000_000n) },
      idGen: { generateId: () => `cc-${++id}` },
      logger: { info: () => undefined },
    });
  };

  it('simulates project issuance, inter-holder transfer, and retirement burn flow', () => {
    const carbon = make();

    carbon.registerHolder('world-a');
    carbon.registerHolder('world-b');

    const project = carbon.createProject('world-a', 'kelp-restoration', 1_000n);
    expect(typeof project).toBe('object');
    if (typeof project === 'string') return;

    const issue = carbon.issueCredits(project.projectId, 700n);
    expect(issue.success).toBe(true);

    const transfer = carbon.transferCredits('world-a', 'world-b', 250n);
    expect(transfer.success).toBe(true);

    const retire = carbon.retireCredits('world-b', 80n);
    expect(retire.success).toBe(true);

    const a = carbon.getBalance('world-a');
    const b = carbon.getBalance('world-b');
    expect(a?.available).toBe(450n);
    expect(b?.available).toBe(170n);
  });

  it('simulates history audit trail under mixed operations and bounded retrieval', () => {
    const carbon = make();

    carbon.registerHolder('h1');
    carbon.registerHolder('h2');

    const project = carbon.createProject('h1', 'forest-biochar', 500n);
    expect(typeof project).toBe('object');
    if (typeof project === 'string') return;

    carbon.issueCredits(project.projectId, 300n);
    carbon.transferCredits('h1', 'h2', 100n);
    carbon.retireCredits('h2', 20n);

    const full = carbon.getTransactionHistory('h2', 10);
    const lastOne = carbon.getTransactionHistory('h2', 1);

    expect(full).toHaveLength(2);
    expect(lastOne).toHaveLength(1);
    expect(lastOne[0]?.type).toBe('RETIRE');
  });
});
