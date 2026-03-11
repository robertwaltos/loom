import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcKnowledgeSystemState, NpcKnowledgeSystemDeps } from '../npc-knowledge-system.js';
import {
  createNpcKnowledgeSystemState,
  registerNpcKnowledge,
  learnKnowledge,
  teachKnowledge,
  improveKnowledge,
  getKnowledgeEntry,
  listKnowledge,
  getKnowledgeProfile,
  findExperts,
} from '../npc-knowledge-system.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcKnowledgeSystemDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'know-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcKnowledgeSystem - Registration', () => {
  let state: NpcKnowledgeSystemState;

  beforeEach(() => {
    state = createNpcKnowledgeSystemState(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = registerNpcKnowledge(state, 'npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate NPC', () => {
    registerNpcKnowledge(state, 'npc-1');
    const result = registerNpcKnowledge(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should allow registering multiple distinct NPCs', () => {
    const r1 = registerNpcKnowledge(state, 'npc-1');
    const r2 = registerNpcKnowledge(state, 'npc-2');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});

// ============================================================================
// TESTS: LEARN KNOWLEDGE
// ============================================================================

describe('NpcKnowledgeSystem - Learn Knowledge', () => {
  let state: NpcKnowledgeSystemState;

  beforeEach(() => {
    state = createNpcKnowledgeSystemState(createMockDeps());
    registerNpcKnowledge(state, 'npc-1');
  });

  it('should return a KnowledgeEntry on success', () => {
    const result = learnKnowledge(state, 'npc-1', 'TRADE', 'silk prices', 75, null);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.npcId).toBe('npc-1');
      expect(result.domain).toBe('TRADE');
      expect(result.topic).toBe('silk prices');
      expect(result.proficiency).toBe(75);
      expect(result.sourceNpcId).toBeNull();
    }
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = learnKnowledge(state, 'ghost', 'TRADE', 'silk prices', 50, null);
    expect(result).toBe('npc-not-found');
  });

  it('should return invalid-proficiency for proficiency above 100', () => {
    const result = learnKnowledge(state, 'npc-1', 'TRADE', 'anything', 101, null);
    expect(result).toBe('invalid-proficiency');
  });

  it('should return invalid-proficiency for negative proficiency', () => {
    const result = learnKnowledge(state, 'npc-1', 'TRADE', 'anything', -1, null);
    expect(result).toBe('invalid-proficiency');
  });

  it('should return already-known for same domain+topic combination', () => {
    learnKnowledge(state, 'npc-1', 'TRADE', 'silk prices', 50, null);
    const result = learnKnowledge(state, 'npc-1', 'TRADE', 'silk prices', 60, null);
    expect(result).toBe('already-known');
  });

  it('should allow same topic in different domains', () => {
    const r1 = learnKnowledge(state, 'npc-1', 'TRADE', 'weapons', 40, null);
    const r2 = learnKnowledge(state, 'npc-1', 'COMBAT', 'weapons', 60, null);
    expect(typeof r1).toBe('object');
    expect(typeof r2).toBe('object');
  });

  it('should store sourceNpcId when provided', () => {
    const result = learnKnowledge(state, 'npc-1', 'HISTORY', 'ancient wars', 55, 'teacher-1');
    if (typeof result === 'object') {
      expect(result.sourceNpcId).toBe('teacher-1');
    }
  });
});

// ============================================================================
// TESTS: TEACH KNOWLEDGE
// ============================================================================

describe('NpcKnowledgeSystem - Teach Knowledge', () => {
  let state: NpcKnowledgeSystemState;

  beforeEach(() => {
    state = createNpcKnowledgeSystemState(createMockDeps());
    registerNpcKnowledge(state, 'teacher');
    registerNpcKnowledge(state, 'student');
  });

  it('should transfer knowledge from teacher to student (new entry)', () => {
    const entry = learnKnowledge(state, 'teacher', 'SCIENCE', 'alchemy', 80, null);
    if (typeof entry === 'string') return;
    const result = teachKnowledge(state, 'teacher', 'student', entry.knowledgeId, 30);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transfer.teacherNpcId).toBe('teacher');
      expect(result.transfer.studentNpcId).toBe('student');
      expect(result.transfer.proficiencyGained).toBe(30);
    }
  });

  it('should improve existing entry if student already knows the topic', () => {
    const teacherEntry = learnKnowledge(state, 'teacher', 'SCIENCE', 'alchemy', 80, null);
    learnKnowledge(state, 'student', 'SCIENCE', 'alchemy', 20, null);
    if (typeof teacherEntry === 'string') return;
    teachKnowledge(state, 'teacher', 'student', teacherEntry.knowledgeId, 15);
    const studentEntry = listKnowledge(state, 'student', 'SCIENCE')[0];
    expect(studentEntry?.proficiency).toBe(35);
  });

  it('should cap student proficiency at 100', () => {
    const teacherEntry = learnKnowledge(state, 'teacher', 'SCIENCE', 'alchemy', 80, null);
    learnKnowledge(state, 'student', 'SCIENCE', 'alchemy', 90, null);
    if (typeof teacherEntry === 'string') return;
    teachKnowledge(state, 'teacher', 'student', teacherEntry.knowledgeId, 50);
    const studentEntry = listKnowledge(state, 'student', 'SCIENCE')[0];
    expect(studentEntry?.proficiency).toBe(100);
  });

  it('should return npc-not-found if teacher is not registered', () => {
    const result = teachKnowledge(state, 'ghost', 'student', 'k-1', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return knowledge-not-found if teacher does not have the entry', () => {
    const result = teachKnowledge(state, 'teacher', 'student', 'k-missing', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('knowledge-not-found');
  });
});

// ============================================================================
// TESTS: IMPROVE KNOWLEDGE
// ============================================================================

describe('NpcKnowledgeSystem - Improve Knowledge', () => {
  let state: NpcKnowledgeSystemState;

  beforeEach(() => {
    state = createNpcKnowledgeSystemState(createMockDeps());
    registerNpcKnowledge(state, 'npc-1');
  });

  it('should increase proficiency by given gain', () => {
    const entry = learnKnowledge(state, 'npc-1', 'MEDICINE', 'herbalism', 40, null);
    if (typeof entry === 'string') return;
    const result = improveKnowledge(state, 'npc-1', entry.knowledgeId, 20);
    expect(result.success).toBe(true);
    if (result.success) expect(result.newProficiency).toBe(60);
  });

  it('should cap at 100', () => {
    const entry = learnKnowledge(state, 'npc-1', 'MEDICINE', 'surgery', 90, null);
    if (typeof entry === 'string') return;
    const result = improveKnowledge(state, 'npc-1', entry.knowledgeId, 50);
    if (result.success) expect(result.newProficiency).toBe(100);
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = improveKnowledge(state, 'ghost', 'k-1', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return knowledge-not-found for wrong npcId', () => {
    registerNpcKnowledge(state, 'npc-2');
    const entry = learnKnowledge(state, 'npc-1', 'MEDICINE', 'wounds', 50, null);
    if (typeof entry === 'string') return;
    const result = improveKnowledge(state, 'npc-2', entry.knowledgeId, 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('knowledge-not-found');
  });
});

// ============================================================================
// TESTS: QUERIES
// ============================================================================

describe('NpcKnowledgeSystem - Queries (entries and list)', () => {
  let state: NpcKnowledgeSystemState;

  beforeEach(() => {
    state = createNpcKnowledgeSystemState(createMockDeps());
    registerNpcKnowledge(state, 'npc-1');
    learnKnowledge(state, 'npc-1', 'TRADE', 'silk', 60, null);
    learnKnowledge(state, 'npc-1', 'TRADE', 'spices', 80, null);
    learnKnowledge(state, 'npc-1', 'HISTORY', 'empire fall', 40, null);
  });

  it('should getKnowledgeEntry by npcId and knowledgeId', () => {
    const entry = learnKnowledge(state, 'npc-1', 'LORE', 'myths', 50, null);
    if (typeof entry === 'string') return;
    const found = getKnowledgeEntry(state, 'npc-1', entry.knowledgeId);
    expect(found?.knowledgeId).toBe(entry.knowledgeId);
  });

  it('should return undefined getKnowledgeEntry for wrong npcId', () => {
    registerNpcKnowledge(state, 'npc-2');
    const entry = learnKnowledge(state, 'npc-1', 'LORE', 'legends', 50, null);
    if (typeof entry === 'string') return;
    expect(getKnowledgeEntry(state, 'npc-2', entry.knowledgeId)).toBeUndefined();
  });

  it('should listKnowledge with no domain filter returns all entries', () => {
    const list = listKnowledge(state, 'npc-1');
    expect(list.length).toBe(3);
  });

  it('should listKnowledge filtered by domain', () => {
    const list = listKnowledge(state, 'npc-1', 'TRADE');
    expect(list.length).toBe(2);
    expect(list.every((e) => e.domain === 'TRADE')).toBe(true);
  });

  it('should return empty list for NPC with no entries in domain', () => {
    const list = listKnowledge(state, 'npc-1', 'MEDICINE');
    expect(list.length).toBe(0);
  });
});

describe('NpcKnowledgeSystem - Queries (profile and experts)', () => {
  let state: NpcKnowledgeSystemState;

  beforeEach(() => {
    state = createNpcKnowledgeSystemState(createMockDeps());
    registerNpcKnowledge(state, 'npc-1');
    learnKnowledge(state, 'npc-1', 'TRADE', 'silk', 60, null);
    learnKnowledge(state, 'npc-1', 'TRADE', 'spices', 80, null);
    learnKnowledge(state, 'npc-1', 'HISTORY', 'empire fall', 40, null);
  });

  it('should getKnowledgeProfile with correct totalEntries', () => {
    const profile = getKnowledgeProfile(state, 'npc-1');
    expect(profile?.totalEntries).toBe(3);
  });

  it('should getKnowledgeProfile count byDomain correctly', () => {
    const profile = getKnowledgeProfile(state, 'npc-1');
    expect(profile?.byDomain.TRADE).toBe(2);
    expect(profile?.byDomain.HISTORY).toBe(1);
    expect(profile?.byDomain.MEDICINE).toBe(0);
  });

  it('should return undefined profile for unregistered NPC', () => {
    expect(getKnowledgeProfile(state, 'ghost')).toBeUndefined();
  });

  it('should compute MASTER expertiseLevel for avg >= 80', () => {
    registerNpcKnowledge(state, 'npc-master');
    learnKnowledge(state, 'npc-master', 'COMBAT', 'swords', 90, null);
    learnKnowledge(state, 'npc-master', 'COMBAT', 'shields', 80, null);
    const profile = getKnowledgeProfile(state, 'npc-master');
    expect(profile?.expertiseLevel).toBe('MASTER');
  });

  it('should compute NOVICE expertiseLevel for avg < 20', () => {
    registerNpcKnowledge(state, 'npc-novice');
    learnKnowledge(state, 'npc-novice', 'POLITICS', 'laws', 10, null);
    const profile = getKnowledgeProfile(state, 'npc-novice');
    expect(profile?.expertiseLevel).toBe('NOVICE');
  });

  it('should findExperts returning NPCs with proficiency >= threshold', () => {
    registerNpcKnowledge(state, 'npc-2');
    learnKnowledge(state, 'npc-2', 'TRADE', 'silk', 90, null);
    const experts = findExperts(state, 'TRADE', 80);
    expect(experts).toContain('npc-1'); // spices=80
    expect(experts).toContain('npc-2'); // silk=90
  });

  it('should findExperts excluding NPCs below threshold', () => {
    const experts = findExperts(state, 'TRADE', 90);
    expect(experts).not.toContain('npc-1');
  });
});
