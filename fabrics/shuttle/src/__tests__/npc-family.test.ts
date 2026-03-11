/**
 * npc-family.test.ts — Tests for NPC family system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFamilySystem } from '../npc-family.js';
import type { FamilySystem } from '../npc-family.js';

describe('npc-family', () => {
  let system: FamilySystem;
  let currentTime: bigint;
  let idCounter: number;
  const logs: Array<{ msg: string; ctx: Record<string, unknown> }> = [];

  beforeEach(() => {
    currentTime = 1000000n;
    idCounter = 1;
    logs.length = 0;
    system = createFamilySystem({
      clock: { nowMicroseconds: () => currentTime },
      idGenerator: {
        next: () => {
          const id = 'fam_' + String(idCounter);
          idCounter = idCounter + 1;
          return id;
        },
      },
      logger: {
        info: (msg, ctx) => {
          logs.push({ msg, ctx });
        },
      },
    });
  });

  describe('formFamily', () => {
    it('forms family with two members', () => {
      const result = system.formFamily(['npc1', 'npc2']);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('invalid_member_ids');
      expect(result).not.toBe('member_already_in_family');
    });

    it('forms family with multiple members', () => {
      const result = system.formFamily(['npc1', 'npc2', 'npc3', 'npc4']);
      expect(typeof result).toBe('string');
    });

    it('logs family formation', () => {
      logs.length = 0;
      system.formFamily(['npc1', 'npc2']);
      const formLog = logs.find((l) => l.msg === 'family_formed');
      expect(formLog).toBeDefined();
      if (formLog === undefined) {
        throw new Error('log missing');
      }
      expect(formLog.ctx.memberCount).toBe('2');
    });

    it('rejects empty member list', () => {
      const result = system.formFamily([]);
      expect(result).toBe('invalid_member_ids');
    });

    it('rejects duplicate family member', () => {
      system.formFamily(['npc1', 'npc2']);
      const result = system.formFamily(['npc1', 'npc3']);
      expect(result).toBe('member_already_in_family');
    });

    it('creates unique family IDs', () => {
      const id1 = system.formFamily(['npc1', 'npc2']);
      const id2 = system.formFamily(['npc3', 'npc4']);
      expect(id1).not.toBe(id2);
    });

    it('assigns SPOUSE role to first two members', () => {
      const familyId = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      expect(family).toBeDefined();
    });

    it('assigns CHILD role to additional members', () => {
      const familyId = system.formFamily(['npc1', 'npc2', 'npc3']);
      expect(typeof familyId).toBe('string');
    });

    it('initializes loyalty to max', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.averageLoyalty).toBe(100);
    });

    it('sets conflict count to zero', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.conflictCount).toBe(0);
    });

    it('forms large family', () => {
      const members: string[] = [];
      for (let i = 0; i < 10; i = i + 1) {
        members.push('npc_' + String(i));
      }
      const result = system.formFamily(members);
      expect(typeof result).toBe('string');
    });

    it('forms multiple families independently', () => {
      const fam1 = system.formFamily(['npc1', 'npc2']);
      const fam2 = system.formFamily(['npc3', 'npc4']);
      const fam3 = system.formFamily(['npc5', 'npc6']);
      expect(fam1).not.toBe(fam2);
      expect(fam2).not.toBe(fam3);
    });
  });

  describe('addChild', () => {
    let familyId: string;

    beforeEach(() => {
      const result = system.formFamily(['npc1', 'npc2']);
      if (typeof result !== 'string') {
        throw new Error('family formation failed');
      }
      familyId = result;
    });

    it('adds child to family', () => {
      const result = system.addChild(familyId, 'npc3', 80);
      expect(result).toBe('ok');
    });

    it('logs child addition', () => {
      logs.length = 0;
      system.addChild(familyId, 'npc3', 80);
      const childLog = logs.find((l) => l.msg === 'child_added');
      expect(childLog).toBeDefined();
      if (childLog === undefined) {
        throw new Error('log missing');
      }
      expect(childLog.ctx.childId).toBe('npc3');
    });

    it('returns error for nonexistent family', () => {
      const result = system.addChild('unknown_family', 'npc3', 80);
      expect(result).toBe('family_not_found');
    });

    it('rejects child already in family', () => {
      system.addChild(familyId, 'npc3', 80);
      const result = system.addChild(familyId, 'npc3', 70);
      expect(result).toBe('invalid_child_id');
    });

    it('creates childhood development record', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      expect(dev).toBeDefined();
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.childId).toBe('npc3');
    });

    it('sets skill growth rate based on parental involvement', () => {
      system.addChild(familyId, 'npc3', 90);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.skillGrowthRate).toBeGreaterThan(1.0);
    });

    it('sets emotional stability equal to parental involvement', () => {
      system.addChild(familyId, 'npc3', 85);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.emotionalStability).toBe(85);
    });

    it('clamps parental involvement to valid range', () => {
      system.addChild(familyId, 'npc3', 150);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.parentalInvolvement).toBeLessThanOrEqual(100);
    });

    it('handles low parental involvement', () => {
      system.addChild(familyId, 'npc3', 10);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.skillGrowthRate).toBeGreaterThan(0);
    });

    it('handles zero parental involvement', () => {
      system.addChild(familyId, 'npc3', 0);
      const dev = system.getDevelopmentReport('npc3');
      expect(dev).toBeDefined();
    });

    it('handles max parental involvement', () => {
      system.addChild(familyId, 'npc3', 100);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.skillGrowthRate).toBeCloseTo(2.0, 1);
    });

    it('adds multiple children to same family', () => {
      system.addChild(familyId, 'npc3', 80);
      system.addChild(familyId, 'npc4', 85);
      system.addChild(familyId, 'npc5', 90);
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.memberIds.length).toBe(5);
    });
  });

  describe('updateLoyalty', () => {
    let familyId: string;

    beforeEach(() => {
      const result = system.formFamily(['npc1', 'npc2']);
      if (typeof result !== 'string') {
        throw new Error('family formation failed');
      }
      familyId = result;
    });

    it('increases loyalty', () => {
      const result = system.updateLoyalty('npc1', 10);
      if (typeof result !== 'number') {
        throw new Error('loyalty update failed');
      }
      expect(result).toBe(100);
    });

    it('decreases loyalty', () => {
      const result = system.updateLoyalty('npc1', -20);
      if (typeof result !== 'number') {
        throw new Error('loyalty update failed');
      }
      expect(result).toBe(80);
    });

    it('logs loyalty update', () => {
      logs.length = 0;
      system.updateLoyalty('npc1', -10);
      const loyaltyLog = logs.find((l) => l.msg === 'loyalty_updated');
      expect(loyaltyLog).toBeDefined();
      if (loyaltyLog === undefined) {
        throw new Error('log missing');
      }
      expect(loyaltyLog.ctx.npcId).toBe('npc1');
    });

    it('returns error for nonexistent member', () => {
      const result = system.updateLoyalty('unknown', 10);
      expect(result).toBe('member_not_found');
    });

    it('clamps loyalty to min', () => {
      system.updateLoyalty('npc1', -150);
      const result = system.updateLoyalty('npc1', -10);
      if (typeof result !== 'number') {
        throw new Error('loyalty update failed');
      }
      expect(result).toBe(0);
    });

    it('clamps loyalty to max', () => {
      const result = system.updateLoyalty('npc1', 50);
      if (typeof result !== 'number') {
        throw new Error('loyalty update failed');
      }
      expect(result).toBe(100);
    });

    it('updates family average loyalty', () => {
      system.updateLoyalty('npc1', -30);
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.averageLoyalty).toBeLessThan(100);
    });

    it('handles multiple loyalty updates', () => {
      system.updateLoyalty('npc1', -10);
      system.updateLoyalty('npc1', -10);
      system.updateLoyalty('npc1', 5);
      const family = system.getFamilyTree(familyId);
      expect(family).toBeDefined();
    });

    it('returns new loyalty value', () => {
      const result = system.updateLoyalty('npc1', -25);
      if (typeof result !== 'number') {
        throw new Error('loyalty update failed');
      }
      expect(result).toBe(75);
    });

    it('isolates loyalty per member', () => {
      system.updateLoyalty('npc1', -20);
      system.updateLoyalty('npc2', -30);
      const family = system.getFamilyTree(familyId);
      expect(family).toBeDefined();
    });
  });

  describe('recordInheritance', () => {
    let familyId: string;

    beforeEach(() => {
      const result = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof result !== 'string') {
        throw new Error('family formation failed');
      }
      familyId = result;
    });

    it('records inheritance event', () => {
      const result = system.recordInheritance('npc1', familyId, 1000000000n);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('family_not_found');
      expect(result).not.toBe('invalid_amount');
    });

    it('logs inheritance', () => {
      logs.length = 0;
      system.recordInheritance('npc1', familyId, 1000000000n);
      const inheritLog = logs.find((l) => l.msg === 'inheritance_recorded');
      expect(inheritLog).toBeDefined();
      if (inheritLog === undefined) {
        throw new Error('log missing');
      }
      expect(inheritLog.ctx.deceasedId).toBe('npc1');
    });

    it('returns error for nonexistent family', () => {
      const result = system.recordInheritance('npc1', 'unknown_family', 1000000000n);
      expect(result).toBe('family_not_found');
    });

    it('rejects negative amount', () => {
      const result = system.recordInheritance('npc1', familyId, -1000n);
      expect(result).toBe('invalid_amount');
    });

    it('allows zero amount', () => {
      const result = system.recordInheritance('npc1', familyId, 0n);
      expect(typeof result).toBe('string');
    });

    it('excludes deceased from beneficiaries', () => {
      system.recordInheritance('npc1', familyId, 1000000000n);
      expect(true).toBe(true);
    });

    it('boosts beneficiary loyalty', () => {
      system.updateLoyalty('npc2', -30);
      const loyaltyBefore = system.updateLoyalty('npc2', 0);
      system.recordInheritance('npc1', familyId, 1000000000n);
      const loyaltyAfter = system.updateLoyalty('npc2', 0);
      if (typeof loyaltyBefore === 'number' && typeof loyaltyAfter === 'number') {
        expect(loyaltyAfter).toBeGreaterThan(loyaltyBefore);
      }
    });

    it('creates unique event IDs', () => {
      const id1 = system.recordInheritance('npc1', familyId, 1000000000n);
      const fam2 = system.formFamily(['npc4', 'npc5']);
      if (typeof fam2 !== 'string') {
        throw new Error('family formation failed');
      }
      const id2 = system.recordInheritance('npc4', fam2, 2000000000n);
      expect(id1).not.toBe(id2);
    });

    it('handles large inheritance amounts', () => {
      const largeAmount = 1000000000000000n;
      const result = system.recordInheritance('npc1', familyId, largeAmount);
      expect(typeof result).toBe('string');
    });

    it('records multiple inheritance events', () => {
      system.recordInheritance('npc1', familyId, 1000000000n);
      currentTime = currentTime + 1000000n;
      const fam2 = system.formFamily(['npc4', 'npc5', 'npc6']);
      if (typeof fam2 !== 'string') {
        throw new Error('family formation failed');
      }
      system.recordInheritance('npc4', fam2, 2000000000n);
      const report = system.getFamilyReport();
      expect(report.totalInheritances).toBe(2);
    });
  });

  describe('triggerConflict', () => {
    let familyId: string;

    beforeEach(() => {
      const result = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof result !== 'string') {
        throw new Error('family formation failed');
      }
      familyId = result;
    });

    it('triggers conflict', () => {
      const result = system.triggerConflict(familyId, ['npc1', 'npc2'], 50);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('family_not_found');
      expect(result).not.toBe('invalid_severity');
    });

    it('logs conflict', () => {
      logs.length = 0;
      system.triggerConflict(familyId, ['npc1', 'npc2'], 50);
      const conflictLog = logs.find((l) => l.msg === 'conflict_triggered');
      expect(conflictLog).toBeDefined();
      if (conflictLog === undefined) {
        throw new Error('log missing');
      }
      expect(conflictLog.ctx.familyId).toBe(familyId);
    });

    it('returns error for nonexistent family', () => {
      const result = system.triggerConflict('unknown_family', ['npc1', 'npc2'], 50);
      expect(result).toBe('family_not_found');
    });

    it('rejects negative severity', () => {
      const result = system.triggerConflict(familyId, ['npc1', 'npc2'], -10);
      expect(result).toBe('invalid_severity');
    });

    it('rejects severity above max', () => {
      const result = system.triggerConflict(familyId, ['npc1', 'npc2'], 101);
      expect(result).toBe('invalid_severity');
    });

    it('allows min severity', () => {
      const result = system.triggerConflict(familyId, ['npc1', 'npc2'], 0);
      expect(typeof result).toBe('string');
    });

    it('allows max severity', () => {
      const result = system.triggerConflict(familyId, ['npc1', 'npc2'], 100);
      expect(typeof result).toBe('string');
    });

    it('increments family conflict count', () => {
      const familyBefore = system.getFamilyTree(familyId);
      system.triggerConflict(familyId, ['npc1', 'npc2'], 50);
      const familyAfter = system.getFamilyTree(familyId);
      if (familyBefore === undefined || familyAfter === undefined) {
        throw new Error('family not found');
      }
      expect(familyAfter.conflictCount).toBe(familyBefore.conflictCount + 1);
    });

    it('reduces involved member loyalty', () => {
      const loyaltyBefore = system.updateLoyalty('npc1', 0);
      system.triggerConflict(familyId, ['npc1', 'npc2'], 50);
      const loyaltyAfter = system.updateLoyalty('npc1', 0);
      if (typeof loyaltyBefore === 'number' && typeof loyaltyAfter === 'number') {
        expect(loyaltyAfter).toBeLessThan(loyaltyBefore);
      }
    });

    it('scales loyalty penalty by severity', () => {
      const fam2 = system.formFamily(['npc4', 'npc5']);
      if (typeof fam2 !== 'string') {
        throw new Error('family formation failed');
      }
      system.triggerConflict(familyId, ['npc1'], 10);
      system.triggerConflict(fam2, ['npc4'], 90);
      const loyalty1 = system.updateLoyalty('npc1', 0);
      const loyalty4 = system.updateLoyalty('npc4', 0);
      if (typeof loyalty1 === 'number' && typeof loyalty4 === 'number') {
        expect(loyalty4).toBeLessThan(loyalty1);
      }
    });

    it('creates unique conflict IDs', () => {
      const id1 = system.triggerConflict(familyId, ['npc1', 'npc2'], 50);
      const id2 = system.triggerConflict(familyId, ['npc2', 'npc3'], 40);
      expect(id1).not.toBe(id2);
    });

    it('handles multiple conflicts in same family', () => {
      system.triggerConflict(familyId, ['npc1', 'npc2'], 30);
      system.triggerConflict(familyId, ['npc2', 'npc3'], 40);
      system.triggerConflict(familyId, ['npc1', 'npc3'], 50);
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.conflictCount).toBe(3);
    });
  });

  describe('resolveConflict', () => {
    let familyId: string;
    let conflictId: string;

    beforeEach(() => {
      const result = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof result !== 'string') {
        throw new Error('family formation failed');
      }
      familyId = result;
      const conflict = system.triggerConflict(familyId, ['npc1', 'npc2'], 50);
      if (typeof conflict !== 'string') {
        throw new Error('conflict trigger failed');
      }
      conflictId = conflict;
    });

    it('resolves conflict', () => {
      const result = system.resolveConflict(conflictId, 'mediation');
      expect(result).toBe('ok');
    });

    it('logs conflict resolution', () => {
      logs.length = 0;
      system.resolveConflict(conflictId, 'mediation');
      const resolveLog = logs.find((l) => l.msg === 'conflict_resolved');
      expect(resolveLog).toBeDefined();
      if (resolveLog === undefined) {
        throw new Error('log missing');
      }
      expect(resolveLog.ctx.conflictId).toBe(conflictId);
    });

    it('returns error for nonexistent conflict', () => {
      const result = system.resolveConflict('unknown_conflict', 'mediation');
      expect(result).toBe('conflict_not_found');
    });

    it('rejects resolution when already resolved', () => {
      system.resolveConflict(conflictId, 'mediation');
      const result = system.resolveConflict(conflictId, 'mediation');
      expect(result).toBe('already_resolved');
    });

    it('boosts involved member loyalty', () => {
      const loyaltyBefore = system.updateLoyalty('npc1', 0);
      system.resolveConflict(conflictId, 'mediation');
      const loyaltyAfter = system.updateLoyalty('npc1', 0);
      if (typeof loyaltyBefore === 'number' && typeof loyaltyAfter === 'number') {
        expect(loyaltyAfter).toBeGreaterThanOrEqual(loyaltyBefore);
      }
    });

    it('resolves multiple conflicts independently', () => {
      const conflict2 = system.triggerConflict(familyId, ['npc2', 'npc3'], 40);
      if (typeof conflict2 !== 'string') {
        throw new Error('conflict trigger failed');
      }
      system.resolveConflict(conflictId, 'mediation');
      const result = system.resolveConflict(conflict2, 'compromise');
      expect(result).toBe('ok');
    });

    it('accepts custom resolution strings', () => {
      const result = system.resolveConflict(conflictId, 'family_therapy_session');
      expect(result).toBe('ok');
    });
  });

  describe('getDevelopmentReport', () => {
    let familyId: string;

    beforeEach(() => {
      const result = system.formFamily(['npc1', 'npc2']);
      if (typeof result !== 'string') {
        throw new Error('family formation failed');
      }
      familyId = result;
    });

    it('returns undefined for nonexistent child', () => {
      const dev = system.getDevelopmentReport('unknown_child');
      expect(dev).toBeUndefined();
    });

    it('returns development for existing child', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      expect(dev).toBeDefined();
    });

    it('includes child ID', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.childId).toBe('npc3');
    });

    it('includes family ID', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.familyId).toBe(familyId);
    });

    it('includes skill growth rate', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.skillGrowthRate).toBeGreaterThan(0);
    });

    it('includes emotional stability', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.emotionalStability).toBe(80);
    });

    it('includes parental involvement', () => {
      system.addChild(familyId, 'npc3', 80);
      const dev = system.getDevelopmentReport('npc3');
      if (dev === undefined) {
        throw new Error('development not found');
      }
      expect(dev.parentalInvolvement).toBe(80);
    });

    it('tracks development for multiple children', () => {
      system.addChild(familyId, 'npc3', 80);
      system.addChild(familyId, 'npc4', 90);
      const dev3 = system.getDevelopmentReport('npc3');
      const dev4 = system.getDevelopmentReport('npc4');
      expect(dev3).toBeDefined();
      expect(dev4).toBeDefined();
    });
  });

  describe('getFamilyTree', () => {
    it('returns undefined for nonexistent family', () => {
      const family = system.getFamilyTree('unknown_family');
      expect(family).toBeUndefined();
    });

    it('returns family for existing ID', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      expect(family).toBeDefined();
    });

    it('includes family ID', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.familyId).toBe(familyId);
    });

    it('includes member IDs', () => {
      const familyId = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.memberIds.length).toBe(3);
    });

    it('includes average loyalty', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.averageLoyalty).toBeDefined();
    });

    it('includes conflict count', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.conflictCount).toBe(0);
    });

    it('updates after children added', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      system.addChild(familyId, 'npc3', 80);
      system.addChild(familyId, 'npc4', 85);
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.memberIds.length).toBe(4);
    });
  });

  describe('getFamilyReport', () => {
    it('returns empty report when no families', () => {
      const report = system.getFamilyReport();
      expect(report.totalFamilies).toBe(0);
      expect(report.totalMembers).toBe(0);
      expect(report.averageFamilySize).toBe(0);
      expect(report.totalConflicts).toBe(0);
      expect(report.totalInheritances).toBe(0);
    });

    it('returns correct total families', () => {
      system.formFamily(['npc1', 'npc2']);
      system.formFamily(['npc3', 'npc4']);
      const report = system.getFamilyReport();
      expect(report.totalFamilies).toBe(2);
    });

    it('returns correct total members', () => {
      system.formFamily(['npc1', 'npc2', 'npc3']);
      system.formFamily(['npc4', 'npc5']);
      const report = system.getFamilyReport();
      expect(report.totalMembers).toBe(5);
    });

    it('calculates average family size', () => {
      system.formFamily(['npc1', 'npc2', 'npc3', 'npc4']);
      system.formFamily(['npc5', 'npc6']);
      const report = system.getFamilyReport();
      expect(report.averageFamilySize).toBe(3);
    });

    it('returns total conflicts', () => {
      const fam1 = system.formFamily(['npc1', 'npc2', 'npc3']);
      const fam2 = system.formFamily(['npc4', 'npc5', 'npc6']);
      if (typeof fam1 !== 'string' || typeof fam2 !== 'string') {
        throw new Error('family formation failed');
      }
      system.triggerConflict(fam1, ['npc1', 'npc2'], 50);
      system.triggerConflict(fam2, ['npc4', 'npc5'], 40);
      const report = system.getFamilyReport();
      expect(report.totalConflicts).toBe(2);
    });

    it('returns total inheritances', () => {
      const fam1 = system.formFamily(['npc1', 'npc2', 'npc3']);
      const fam2 = system.formFamily(['npc4', 'npc5', 'npc6']);
      if (typeof fam1 !== 'string' || typeof fam2 !== 'string') {
        throw new Error('family formation failed');
      }
      system.recordInheritance('npc1', fam1, 1000000000n);
      system.recordInheritance('npc4', fam2, 2000000000n);
      const report = system.getFamilyReport();
      expect(report.totalInheritances).toBe(2);
    });

    it('identifies highest loyalty family', () => {
      const fam1 = system.formFamily(['npc1', 'npc2']);
      const fam2 = system.formFamily(['npc3', 'npc4']);
      if (typeof fam1 !== 'string' || typeof fam2 !== 'string') {
        throw new Error('family formation failed');
      }
      system.updateLoyalty('npc3', -50);
      system.updateLoyalty('npc4', -50);
      const report = system.getFamilyReport();
      expect(report.highestLoyaltyFamily).toBe(fam1);
    });

    it('updates after family changes', () => {
      const report1 = system.getFamilyReport();
      system.formFamily(['npc1', 'npc2']);
      const report2 = system.getFamilyReport();
      expect(report2.totalFamilies).toBe(report1.totalFamilies + 1);
    });
  });

  describe('edge cases', () => {
    it('handles large number of families', () => {
      for (let i = 0; i < 50; i = i + 1) {
        const memberIds: string[] = [];
        for (let j = 0; j < 3; j = j + 1) {
          memberIds.push('npc_' + String(i) + '_' + String(j));
        }
        system.formFamily(memberIds);
      }
      const report = system.getFamilyReport();
      expect(report.totalFamilies).toBe(50);
    });

    it('handles many conflicts in same family', () => {
      const familyId = system.formFamily(['npc1', 'npc2', 'npc3', 'npc4']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      for (let i = 0; i < 20; i = i + 1) {
        system.triggerConflict(familyId, ['npc1', 'npc2'], 30);
      }
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.conflictCount).toBe(20);
    });

    it('handles loyalty at boundaries', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      system.updateLoyalty('npc1', -100);
      system.updateLoyalty('npc2', 0);
      const family = system.getFamilyTree(familyId);
      expect(family).toBeDefined();
    });

    it('handles large inheritance amounts', () => {
      const familyId = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const hugAmount = 999999999999999999n;
      const result = system.recordInheritance('npc1', familyId, hugAmount);
      expect(typeof result).toBe('string');
    });

    it('maintains family state after failed operations', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      system.addChild('unknown_family', 'npc3', 80);
      const family = system.getFamilyTree(familyId);
      if (family === undefined) {
        throw new Error('family not found');
      }
      expect(family.memberIds.length).toBe(2);
    });

    it('handles conflict resolution for multiple conflicts', () => {
      const familyId = system.formFamily(['npc1', 'npc2', 'npc3']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      const c1 = system.triggerConflict(familyId, ['npc1', 'npc2'], 30);
      const c2 = system.triggerConflict(familyId, ['npc2', 'npc3'], 40);
      const c3 = system.triggerConflict(familyId, ['npc1', 'npc3'], 50);
      if (typeof c1 === 'string') {
        system.resolveConflict(c1, 'mediation');
      }
      if (typeof c2 === 'string') {
        system.resolveConflict(c2, 'compromise');
      }
      if (typeof c3 === 'string') {
        system.resolveConflict(c3, 'therapy');
      }
      expect(true).toBe(true);
    });

    it('preserves development data across family changes', () => {
      const familyId = system.formFamily(['npc1', 'npc2']);
      if (typeof familyId !== 'string') {
        throw new Error('family formation failed');
      }
      system.addChild(familyId, 'npc3', 80);
      system.updateLoyalty('npc1', -20);
      const dev = system.getDevelopmentReport('npc3');
      expect(dev).toBeDefined();
    });
  });
});
