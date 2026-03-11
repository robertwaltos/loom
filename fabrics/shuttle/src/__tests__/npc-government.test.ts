import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNpcGovernmentModule,
  type GovDeps,
  type PoliticalOffice,
  type Policy,
} from '../npc-government.js';

function createMockDeps(): GovDeps {
  let counter = 0;
  let now = 1000000000n;

  return {
    clock: {
      nowMicroseconds: () => now,
    },
    idGen: {
      generate: () => {
        counter = counter + 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
  };
}

function createTestOffice(id: string, title: string): PoliticalOffice {
  return {
    officeId: id,
    title,
    type: 'MINISTER',
    termLengthMicros: 365n * 24n * 3600n * 1000000n,
    responsibilities: ['govern'],
    corruptionRisk: 0.1,
  };
}

function createTestPolicy(id: string, name: string): Policy {
  return {
    policyId: id,
    name,
    description: 'Test policy',
    category: 'economic',
    enactedAtMicros: 1000000000n,
    expiresAtMicros: null,
    supportLevel: 0.7,
    effects: { economy: 10 },
  };
}

describe('NpcGovernmentModule', () => {
  let deps: GovDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('establishGovernment', () => {
    it('should establish a new government', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      expect(govId).toBe('id-1');
    });

    it('should reject empty world ID', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.establishGovernment('', 'REPUBLIC');

      expect(result).toEqual({ error: 'INVALID_WORLD_ID' });
    });

    it('should initialize stability and legitimacy', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'MONARCHY');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const report = module.getGovernmentReport(govId);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.stability).toBe(0.5);
      expect(report.legitimacy).toBe(0.5);
    });

    it('should support MONARCHY type', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'MONARCHY');
      const report = module.getGovernmentReport(govId as string);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.type).toBe('MONARCHY');
    });

    it('should support COUNCIL type', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'COUNCIL');
      const report = module.getGovernmentReport(govId as string);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.type).toBe('COUNCIL');
    });

    it('should support REPUBLIC type', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'REPUBLIC');
      const report = module.getGovernmentReport(govId as string);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.type).toBe('REPUBLIC');
    });

    it('should support THEOCRACY type', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'THEOCRACY');
      const report = module.getGovernmentReport(govId as string);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.type).toBe('THEOCRACY');
    });

    it('should support OLIGARCHY type', () => {
      const module = createNpcGovernmentModule(deps);

      const govId = module.establishGovernment('world-1', 'OLIGARCHY');
      const report = module.getGovernmentReport(govId as string);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.type).toBe('OLIGARCHY');
    });
  });

  describe('addOffice', () => {
    it('should add office to government', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Prime Minister');
      const result = module.addOffice(govId, office);

      expect(result).toBe('office-1');
    });

    it('should reject office for non-existent government', () => {
      const module = createNpcGovernmentModule(deps);

      const office = createTestOffice('office-1', 'Mayor');
      const result = module.addOffice('invalid-gov', office);

      expect(result).toEqual({ error: 'GOVERNMENT_NOT_FOUND' });
    });

    it('should reject invalid corruption risk', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office: PoliticalOffice = {
        ...createTestOffice('office-1', 'Corrupt Official'),
        corruptionRisk: 1.5,
      };

      const result = module.addOffice(govId, office);

      expect(result).toEqual({ error: 'INVALID_CORRUPTION_RISK' });
    });

    it('should reject duplicate office ID', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');

      module.addOffice(govId, office);
      const result = module.addOffice(govId, office);

      expect(result).toEqual({ error: 'OFFICE_ALREADY_EXISTS' });
    });
  });

  describe('appointNpc', () => {
    it('should appoint NPC to office', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const result = module.appointNpc(govId, 'office-1', 'npc-1');

      expect(result).not.toHaveProperty('error');
    });

    it('should return error for non-existent government', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.appointNpc('invalid-gov', 'office-1', 'npc-1');

      expect(result).toEqual({ error: 'GOVERNMENT_NOT_FOUND' });
    });

    it('should return error for non-existent office', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.appointNpc(govId, 'invalid-office', 'npc-1');

      expect(result).toEqual({ error: 'OFFICE_NOT_FOUND' });
    });

    it('should initialize approval rating at 0.5', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const incumbent = module.getIncumbent(incumbentId);

      if ('error' in incumbent) {
        throw new Error('Unexpected error');
      }

      expect(incumbent.approvalRating).toBe(0.5);
    });

    it('should set term expiration based on office term length', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const incumbent = module.getIncumbent(incumbentId);

      if ('error' in incumbent) {
        throw new Error('Unexpected error');
      }

      expect(incumbent.termExpiresAtMicros).not.toBeNull();
    });
  });

  describe('holdElection', () => {
    it('should create election for office', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const result = module.holdElection(govId, 'office-1', ['npc-1', 'npc-2']);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.candidates).toEqual(['npc-1', 'npc-2']);
    });

    it('should return error for non-existent government', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.holdElection('invalid-gov', 'office-1', ['npc-1']);

      expect(result).toEqual({ error: 'GOVERNMENT_NOT_FOUND' });
    });

    it('should return error for non-existent office', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.holdElection(govId, 'invalid-office', ['npc-1']);

      expect(result).toEqual({ error: 'OFFICE_NOT_FOUND' });
    });

    it('should reject election with no candidates', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const result = module.holdElection(govId, 'office-1', []);

      expect(result).toEqual({ error: 'NO_CANDIDATES' });
    });
  });

  describe('castVote', () => {
    it('should cast vote for candidate', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const election = module.holdElection(govId, 'office-1', ['npc-1', 'npc-2']);

      if ('error' in election) {
        throw new Error('Unexpected error');
      }

      const result = module.castVote(election.electionId, 'npc-1');

      expect(result).toBe('npc-1');
    });

    it('should return error for non-existent election', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.castVote('invalid-election', 'npc-1');

      expect(result).toEqual({ error: 'ELECTION_NOT_FOUND' });
    });

    it('should reject vote for invalid candidate', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const election = module.holdElection(govId, 'office-1', ['npc-1', 'npc-2']);

      if ('error' in election) {
        throw new Error('Unexpected error');
      }

      const result = module.castVote(election.electionId, 'npc-99');

      expect(result).toEqual({ error: 'INVALID_CANDIDATE' });
    });

    it('should accumulate votes for candidate', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const election = module.holdElection(govId, 'office-1', ['npc-1', 'npc-2']);

      if ('error' in election) {
        throw new Error('Unexpected error');
      }

      module.castVote(election.electionId, 'npc-1');
      module.castVote(election.electionId, 'npc-1');
      module.castVote(election.electionId, 'npc-2');

      const winnerId = module.finalizeElection(election.electionId);

      expect(winnerId).toBe('npc-1');
    });
  });

  describe('finalizeElection', () => {
    it('should finalize election and determine winner', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const election = module.holdElection(govId, 'office-1', ['npc-1', 'npc-2']);

      if ('error' in election) {
        throw new Error('Unexpected error');
      }

      module.castVote(election.electionId, 'npc-1');

      const result = module.finalizeElection(election.electionId);

      expect(result).toBe('npc-1');
    });

    it('should return error for non-existent election', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.finalizeElection('invalid-election');

      expect(result).toEqual({ error: 'ELECTION_NOT_FOUND' });
    });

    it('should reject finalization of already completed election', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const election = module.holdElection(govId, 'office-1', ['npc-1']);

      if ('error' in election) {
        throw new Error('Unexpected error');
      }

      module.castVote(election.electionId, 'npc-1');
      module.finalizeElection(election.electionId);

      const result = module.finalizeElection(election.electionId);

      expect(result).toEqual({ error: 'ELECTION_ALREADY_COMPLETED' });
    });

    it('should reject finalization when no votes cast', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'President');
      module.addOffice(govId, office);

      const election = module.holdElection(govId, 'office-1', ['npc-1']);

      if ('error' in election) {
        throw new Error('Unexpected error');
      }

      const result = module.finalizeElection(election.electionId);

      expect(result).toEqual({ error: 'NO_VOTES_CAST' });
    });
  });

  describe('enactPolicy', () => {
    it('should enact policy for government', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const policy = createTestPolicy('policy-1', 'Tax Reform');
      const result = module.enactPolicy(govId, policy);

      expect(result).toBe('policy-1');
    });

    it('should return error for non-existent government', () => {
      const module = createNpcGovernmentModule(deps);

      const policy = createTestPolicy('policy-1', 'Tax Reform');
      const result = module.enactPolicy('invalid-gov', policy);

      expect(result).toEqual({ error: 'GOVERNMENT_NOT_FOUND' });
    });

    it('should reject invalid support level', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const policy: Policy = {
        ...createTestPolicy('policy-1', 'Unpopular Policy'),
        supportLevel: 1.5,
      };

      const result = module.enactPolicy(govId, policy);

      expect(result).toEqual({ error: 'INVALID_SUPPORT_LEVEL' });
    });

    it('should increase active policy count', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const policy = createTestPolicy('policy-1', 'Education Reform');
      module.enactPolicy(govId, policy);

      const report = module.getGovernmentReport(govId);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.activePolicies).toBe(1);
    });
  });

  describe('recordCorruption', () => {
    it('should record corruption event', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.recordCorruption(incumbentId, 0.3, 'Bribery');

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.severity).toBe(0.3);
    });

    it('should return error for non-existent incumbent', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.recordCorruption('invalid-incumbent', 0.5, 'Fraud');

      expect(result).toEqual({ error: 'INCUMBENT_NOT_FOUND' });
    });

    it('should reject invalid severity', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.recordCorruption(incumbentId, 2.0, 'Fraud');

      expect(result).toEqual({ error: 'INVALID_SEVERITY' });
    });

    it('should increase incumbent corruption level', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      module.recordCorruption(incumbentId, 0.2, 'Bribery');

      const incumbent = module.getIncumbent(incumbentId);

      if ('error' in incumbent) {
        throw new Error('Unexpected error');
      }

      expect(incumbent.corruptionLevel).toBe(0.2);
    });
  });

  describe('removeFromOffice', () => {
    it('should remove incumbent from office', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.removeFromOffice(incumbentId, 'Impeachment');

      expect(result).toBe(incumbentId);
    });

    it('should return error for non-existent incumbent', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.removeFromOffice('invalid-incumbent', 'Resignation');

      expect(result).toEqual({ error: 'INCUMBENT_NOT_FOUND' });
    });

    it('should decrease active incumbent count', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      module.removeFromOffice(incumbentId, 'Resignation');

      const report = module.getGovernmentReport(govId);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.activeIncumbents).toBe(0);
    });
  });

  describe('getGovernmentReport', () => {
    it('should return government report', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.getGovernmentReport(govId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.governmentId).toBe(govId);
    });

    it('should return error for non-existent government', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.getGovernmentReport('invalid-gov');

      expect(result).toEqual({ error: 'GOVERNMENT_NOT_FOUND' });
    });
  });

  describe('triggerVoteOfConfidence', () => {
    it('should pass vote when approval above threshold', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.triggerVoteOfConfidence(incumbentId);

      expect(result).toBe(true);
    });

    it('should fail vote when approval below threshold', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      module.updateApprovalRating(incumbentId, -0.3);

      const result = module.triggerVoteOfConfidence(incumbentId);

      expect(result).toBe(false);
    });

    it('should return error for non-existent incumbent', () => {
      const module = createNpcGovernmentModule(deps);

      const result = module.triggerVoteOfConfidence('invalid-incumbent');

      expect(result).toEqual({ error: 'INCUMBENT_NOT_FOUND' });
    });
  });

  describe('updateApprovalRating', () => {
    it('should update approval rating', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.updateApprovalRating(incumbentId, 0.1);

      expect(result).toBe(0.6);
    });

    it('should clamp rating at 0.0', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.updateApprovalRating(incumbentId, -1.0);

      expect(result).toBe(0);
    });

    it('should clamp rating at 1.0', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);

      const incumbentId = module.appointNpc(govId, 'office-1', 'npc-1');

      if (typeof incumbentId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.updateApprovalRating(incumbentId, 1.0);

      expect(result).toBe(1.0);
    });
  });

  describe('expireTerms', () => {
    it('should expire terms past expiration time', () => {
      const deps = createMockDeps();
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office: PoliticalOffice = {
        ...createTestOffice('office-1', 'Minister'),
        termLengthMicros: 1000n,
      };

      module.addOffice(govId, office);
      module.appointNpc(govId, 'office-1', 'npc-1');

      (deps.clock as { nowMicroseconds: () => bigint }).nowMicroseconds = () => 1000000000n + 2000n;

      const expiredCount = module.expireTerms(govId);

      expect(expiredCount).toBe(1);
    });

    it('should not expire terms still within expiration time', () => {
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'REPUBLIC');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office = createTestOffice('office-1', 'Minister');
      module.addOffice(govId, office);
      module.appointNpc(govId, 'office-1', 'npc-1');

      const expiredCount = module.expireTerms(govId);

      expect(expiredCount).toBe(0);
    });

    it('should not expire lifetime appointments', () => {
      const deps = createMockDeps();
      const module = createNpcGovernmentModule(deps);
      const govId = module.establishGovernment('world-1', 'MONARCHY');

      if (typeof govId !== 'string') {
        throw new Error('Unexpected error');
      }

      const office: PoliticalOffice = {
        ...createTestOffice('office-1', 'Monarch'),
        termLengthMicros: null,
      };

      module.addOffice(govId, office);
      module.appointNpc(govId, 'office-1', 'npc-1');

      (deps.clock as { nowMicroseconds: () => bigint }).nowMicroseconds = () =>
        1000000000n + 999999999n;

      const expiredCount = module.expireTerms(govId);

      expect(expiredCount).toBe(0);
    });
  });
});
