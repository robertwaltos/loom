import { describe, it, expect, beforeEach } from 'vitest';
import {
  findQualifyingDynasties,
  buildVigilNotification,
  buildVigilDialogueUnlock,
  isVigilWindowExpired,
  buildNoVigilOutcome,
  NO_VIGIL_CONSEQUENCE,
  VIGIL_INTERACTION_THRESHOLD,
  VIGIL_WINDOW_HOURS,
  VIGIL_WINDOW_MS,
  type DynastyInteractionRecord,
  type VigilNotification,
  type VigilDialogueUnlock,
} from '../vigil-declaration-service.js';
import type { NpcLifecycleRecord } from '../npc-lifecycle-state-machine.js';

function makeInteraction(
  overrides: Partial<DynastyInteractionRecord> = {},
): DynastyInteractionRecord {
  return {
    dynastyId: 'dynasty-1',
    characterId: 100,
    interactionCount: 5,
    lastInteractionAt: '2300-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLifecycleRecord(
  overrides: Partial<NpcLifecycleRecord> = {},
): NpcLifecycleRecord {
  return {
    characterId: 100,
    displayName: 'Elder Test',
    tier: 3,
    renewalStatus: 'NOT_ELIGIBLE',
    age: 160,
    state: 'CRITICAL',
    stateEnteredAt: '2300-01-01T00:00:00Z',
    vigilDeclaredAt: null,
    dyingAt: null,
    deadAt: null,
    sealedAt: null,
    estateEnteredAuction: false,
    chronicleSealEntryId: null,
    ...overrides,
  };
}

describe('vigil-declaration-service', () => {
  describe('constants', () => {
    it('has VIGIL_INTERACTION_THRESHOLD of 3', () => {
      expect(VIGIL_INTERACTION_THRESHOLD).toBe(3);
    });

    it('has VIGIL_WINDOW_HOURS of 72', () => {
      expect(VIGIL_WINDOW_HOURS).toBe(72);
    });

    it('has VIGIL_WINDOW_MS equal to 72 hours in ms', () => {
      expect(VIGIL_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
    });

    it('NO_VIGIL_CONSEQUENCE is a non-empty string', () => {
      expect(NO_VIGIL_CONSEQUENCE.length).toBeGreaterThan(0);
    });
  });

  describe('findQualifyingDynasties', () => {
    it('returns dynasties meeting threshold for the character', () => {
      const interactions = [
        makeInteraction({ dynastyId: 'dynasty-1', characterId: 100, interactionCount: 5 }),
        makeInteraction({ dynastyId: 'dynasty-2', characterId: 100, interactionCount: 3 }),
        makeInteraction({ dynastyId: 'dynasty-3', characterId: 100, interactionCount: 2 }),
      ];
      const result = findQualifyingDynasties(100, interactions);
      expect(result.length).toBe(2);
    });

    it('excludes dynasties below threshold', () => {
      const interactions = [
        makeInteraction({ dynastyId: 'dynasty-1', characterId: 100, interactionCount: 1 }),
      ];
      const result = findQualifyingDynasties(100, interactions);
      expect(result.length).toBe(0);
    });

    it('excludes interactions for other characters', () => {
      const interactions = [
        makeInteraction({ dynastyId: 'dynasty-1', characterId: 200, interactionCount: 10 }),
      ];
      const result = findQualifyingDynasties(100, interactions);
      expect(result.length).toBe(0);
    });

    it('returns empty for empty interactions list', () => {
      expect(findQualifyingDynasties(100, [])).toEqual([]);
    });

    it('includes dynasty at exactly threshold count', () => {
      const interactions = [
        makeInteraction({ dynastyId: 'd1', characterId: 100, interactionCount: 3 }),
      ];
      const result = findQualifyingDynasties(100, interactions);
      expect(result.length).toBe(1);
    });
  });

  describe('buildVigilNotification', () => {
    it('builds a notification with correct fields', () => {
      const now = 1_700_000_000_000;
      const notif = buildVigilNotification(
        'vigil-1',
        'dynasty-1',
        100,
        'Elder Test',
        5,
        now,
      );
      expect(notif.vigilId).toBe('vigil-1');
      expect(notif.dynastyId).toBe('dynasty-1');
      expect(notif.characterId).toBe(100);
      expect(notif.characterDisplayName).toBe('Elder Test');
      expect(notif.interactionCount).toBe(5);
    });

    it('sets windowClosesAt to 72 hours from now', () => {
      const now = 1_700_000_000_000;
      const notif = buildVigilNotification(
        'vigil-1',
        'dynasty-1',
        100,
        'Elder Test',
        5,
        now,
      );
      const expected = new Date(now + VIGIL_WINDOW_MS).toISOString();
      expect(notif.windowClosesAt).toBe(expected);
    });

    it('includes character name in notification text', () => {
      const notif = buildVigilNotification(
        'v1',
        'd1',
        100,
        'Sister Ngozi',
        4,
        1_700_000_000_000,
      );
      expect(notif.notificationText).toContain('Sister Ngozi');
    });

    it('includes interaction count in notification text', () => {
      const notif = buildVigilNotification(
        'v1',
        'd1',
        100,
        'Elder Test',
        7,
        1_700_000_000_000,
      );
      expect(notif.notificationText).toContain('7');
    });
  });

  describe('buildVigilDialogueUnlock', () => {
    it('returns correct vigilId and ids', () => {
      const unlock = buildVigilDialogueUnlock('vigil-1', 100, 'dynasty-1');
      expect(unlock.vigilId).toBe('vigil-1');
      expect(unlock.characterId).toBe(100);
      expect(unlock.dynastyId).toBe('dynasty-1');
    });

    it('sets dialogueMode to FULL_CANDOR', () => {
      const unlock = buildVigilDialogueUnlock('v', 1, 'd');
      expect(unlock.dialogueMode).toBe('FULL_CANDOR');
    });

    it('unlocks all four pillar dialogue types', () => {
      const unlock = buildVigilDialogueUnlock('v', 1, 'd');
      expect(unlock.pillarsUnlocked).toContain('WOUND');
      expect(unlock.pillarsUnlocked).toContain('LIMITATION');
      expect(unlock.pillarsUnlocked).toContain('SECRET');
      expect(unlock.pillarsUnlocked).toContain('QUESTION');
      expect(unlock.pillarsUnlocked.length).toBe(4);
    });

    it('contains a non-empty narrativeNote', () => {
      const unlock = buildVigilDialogueUnlock('v', 1, 'd');
      expect(unlock.narrativeNote.length).toBeGreaterThan(0);
    });
  });

  describe('isVigilWindowExpired', () => {
    it('returns false when now is before expiry', () => {
      expect(isVigilWindowExpired(2000, 1000)).toBe(false);
    });

    it('returns true when now equals expiry', () => {
      expect(isVigilWindowExpired(1000, 1000)).toBe(true);
    });

    it('returns true when now is after expiry', () => {
      expect(isVigilWindowExpired(1000, 2000)).toBe(true);
    });
  });

  describe('buildNoVigilOutcome', () => {
    it('returns DYING transition for the NPC', () => {
      const npc = makeLifecycleRecord({ characterId: 42 });
      const outcome = buildNoVigilOutcome(npc);
      expect(outcome.characterId).toBe(42);
      expect(outcome.transitionsTo).toBe('DYING');
    });

    it('includes NO_VIGIL_CONSEQUENCE as reason', () => {
      const npc = makeLifecycleRecord();
      const outcome = buildNoVigilOutcome(npc);
      expect(outcome.reason).toBe(NO_VIGIL_CONSEQUENCE);
    });
  });
});
