import { describe, expect, it } from 'vitest';
import { createDynastySuccession } from '../dynasty-succession.js';

describe('dynasty succession simulation', () => {
  it('simulates contested succession followed by regency governance', () => {
    const succession = createDynastySuccession({
      clock: { nowMicroseconds: () => 1_000_000n },
      idGen: { next: () => 's-id' },
    });

    succession.setSuccessionOrder('dyn-a', ['heir-1', 'heir-2', 'heir-3']);
    const contestId = succession.openContest('dyn-a', ['heir-1', 'heir-2']);

    succession.voteInContest(contestId, 'v1', 'heir-2');
    succession.voteInContest(contestId, 'v2', 'heir-2');
    succession.voteInContest(contestId, 'v3', 'heir-1');

    const result = succession.resolveContest(contestId);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.winner).toBe('heir-2');
      expect(result.totalVotes).toBe(3);
    }

    succession.enterRegency('dyn-a', 'regent-a', 'heir-2', 'minor heir transition');
    expect(succession.getSuccessionLine('dyn-a')).not.toBe('not-found');
    const line = succession.getSuccessionLine('dyn-a');
    if (line !== 'not-found') {
      expect(line.status).toBe('IN_REGENCY');
      expect(line.primaryHeir).toBe('heir-2');
    }
  });
});
