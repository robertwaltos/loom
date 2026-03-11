import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDialogueEngine,
  MOOD_PRIORITY_BONUS,
  MAX_HISTORY_PER_NPC,
  TOPIC_RELEVANCE_THRESHOLD,
} from '../npc-dialogue-engine.js';
import type {
  DialogueEngine,
  DialogueEngineDeps,
  DialogueLine,
  DialogueBranch,
  WorldEvent,
} from '../npc-dialogue-engine.js';

function createDeps(): DialogueEngineDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { generate: () => 'de-' + String(id++) },
  };
}

function makeLine(
  overrides: Partial<DialogueLine> & { lineId: string; npcId: string },
): DialogueLine {
  return {
    text: 'Hello traveler',
    mood: 'calm',
    topic: 'greeting',
    priority: 1,
    conditions: [],
    ...overrides,
  };
}

describe('DialogueEngine — line registration', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('registers a dialogue line', () => {
    const line = makeLine({ lineId: 'l1', npcId: 'npc-1' });
    expect(engine.registerLine(line)).toBe(true);
    expect(engine.getLine('l1')).toBeDefined();
  });

  it('rejects duplicate line ids', () => {
    const line = makeLine({ lineId: 'l1', npcId: 'npc-1' });
    engine.registerLine(line);
    expect(engine.registerLine(line)).toBe(false);
  });

  it('removes a registered line', () => {
    engine.registerLine(makeLine({ lineId: 'l1', npcId: 'npc-1' }));
    expect(engine.removeLine('l1')).toBe(true);
    expect(engine.getLine('l1')).toBeUndefined();
  });

  it('returns false when removing unknown line', () => {
    expect(engine.removeLine('ghost')).toBe(false);
  });

  it('lists lines for an npc', () => {
    engine.registerLine(makeLine({ lineId: 'l1', npcId: 'npc-1' }));
    engine.registerLine(makeLine({ lineId: 'l2', npcId: 'npc-1' }));
    engine.registerLine(makeLine({ lineId: 'l3', npcId: 'npc-2' }));
    expect(engine.getLinesForNpc('npc-1')).toHaveLength(2);
  });

  it('returns empty for unknown npc', () => {
    expect(engine.getLinesForNpc('ghost')).toHaveLength(0);
  });
});

describe('DialogueEngine — branch management', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('registers a branch', () => {
    const branch: DialogueBranch = {
      branchId: 'b1',
      parentLineId: 'l1',
      lines: [],
    };
    expect(engine.registerBranch(branch)).toBe(true);
    expect(engine.getBranch('b1')).toBeDefined();
  });

  it('rejects duplicate branch ids', () => {
    const branch: DialogueBranch = { branchId: 'b1', parentLineId: 'l1', lines: [] };
    engine.registerBranch(branch);
    expect(engine.registerBranch(branch)).toBe(false);
  });

  it('finds branches for a parent line', () => {
    engine.registerBranch({ branchId: 'b1', parentLineId: 'l1', lines: [] });
    engine.registerBranch({ branchId: 'b2', parentLineId: 'l1', lines: [] });
    engine.registerBranch({ branchId: 'b3', parentLineId: 'l2', lines: [] });
    expect(engine.getBranchesForLine('l1')).toHaveLength(2);
  });
});

describe('DialogueEngine — mood and line selection', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('defaults npc mood to calm', () => {
    expect(engine.getNpcMood('npc-1')).toBe('calm');
  });

  it('sets and gets npc mood', () => {
    engine.setNpcMood('npc-1', 'angry');
    expect(engine.getNpcMood('npc-1')).toBe('angry');
  });

  it('selects highest priority line matching topic', () => {
    engine.registerLine(makeLine({ lineId: 'l1', npcId: 'npc-1', topic: 'weather', priority: 5 }));
    engine.registerLine(makeLine({ lineId: 'l2', npcId: 'npc-1', topic: 'weather', priority: 10 }));
    const result = engine.selectLine('npc-1', 'weather');
    expect(result.line).toBeDefined();
    expect(result.line?.lineId).toBe('l2');
  });

  it('applies mood bonus to matching mood lines', () => {
    engine.setNpcMood('npc-1', 'joyful');
    engine.registerLine(
      makeLine({
        lineId: 'l1',
        npcId: 'npc-1',
        topic: 'greeting',
        priority: 5,
        mood: 'calm',
      }),
    );
    engine.registerLine(
      makeLine({
        lineId: 'l2',
        npcId: 'npc-1',
        topic: 'greeting',
        priority: 3,
        mood: 'joyful',
      }),
    );
    const result = engine.selectLine('npc-1', 'greeting');
    expect(result.line?.lineId).toBe('l2');
    expect(result.reason).toBe('selected');
  });

  it('returns no match for unknown topic', () => {
    engine.registerLine(makeLine({ lineId: 'l1', npcId: 'npc-1', topic: 'weather' }));
    const result = engine.selectLine('npc-1', 'politics');
    expect(result.line).toBeUndefined();
    expect(result.reason).toBe('no matching lines for topic');
  });

  it('returns no match for unknown npc', () => {
    const result = engine.selectLine('ghost', 'weather');
    expect(result.line).toBeUndefined();
  });
});

describe('DialogueEngine — condition evaluation', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('evaluates eq condition', () => {
    engine.setConditionValue('player_class', 'warrior');
    engine.registerLine(
      makeLine({
        lineId: 'l1',
        npcId: 'npc-1',
        topic: 'training',
        conditions: [
          {
            conditionId: 'c1',
            type: 'mood',
            key: 'player_class',
            operator: 'eq',
            value: 'warrior',
          },
        ],
      }),
    );
    const result = engine.selectLine('npc-1', 'training');
    expect(result.line).toBeDefined();
  });

  it('filters out lines with unmet conditions', () => {
    engine.setConditionValue('player_class', 'mage');
    engine.registerLine(
      makeLine({
        lineId: 'l1',
        npcId: 'npc-1',
        topic: 'training',
        conditions: [
          {
            conditionId: 'c1',
            type: 'mood',
            key: 'player_class',
            operator: 'eq',
            value: 'warrior',
          },
        ],
      }),
    );
    const result = engine.selectLine('npc-1', 'training');
    expect(result.line).toBeUndefined();
  });

  it('evaluates gte condition with numbers', () => {
    engine.setConditionValue('reputation', '50');
    engine.registerLine(
      makeLine({
        lineId: 'l1',
        npcId: 'npc-1',
        topic: 'secret',
        conditions: [
          {
            conditionId: 'c1',
            type: 'reputation',
            key: 'reputation',
            operator: 'gte',
            value: '30',
          },
        ],
      }),
    );
    const result = engine.selectLine('npc-1', 'secret');
    expect(result.line).toBeDefined();
  });

  it('evaluates neq condition', () => {
    engine.setConditionValue('faction', 'ascendancy');
    engine.registerLine(
      makeLine({
        lineId: 'l1',
        npcId: 'npc-1',
        topic: 'rebellion',
        conditions: [
          { conditionId: 'c1', type: 'mood', key: 'faction', operator: 'neq', value: 'foundation' },
        ],
      }),
    );
    const result = engine.selectLine('npc-1', 'rebellion');
    expect(result.line).toBeDefined();
  });
});

describe('DialogueEngine — conversation history', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('records a conversation entry', () => {
    const record = engine.recordConversation('npc-1', 'player-1', 'l1', 'greeting');
    expect(record.recordId).toBe('de-0');
    expect(record.npcId).toBe('npc-1');
    expect(record.topic).toBe('greeting');
  });

  it('retrieves history for an npc', () => {
    engine.recordConversation('npc-1', 'player-1', 'l1', 'greeting');
    engine.recordConversation('npc-1', 'player-1', 'l2', 'weather');
    expect(engine.getHistory('npc-1')).toHaveLength(2);
  });

  it('returns empty history for unknown npc', () => {
    expect(engine.getHistory('ghost')).toHaveLength(0);
  });
});

describe('DialogueEngine — topic knowledge', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('learns a new topic', () => {
    const knowledge = engine.learnTopic('npc-1', 'dragon_attack', 'rumor');
    expect(knowledge.npcId).toBe('npc-1');
    expect(knowledge.topic).toBe('dragon_attack');
    expect(knowledge.source).toBe('rumor');
  });

  it('checks if npc knows a topic', () => {
    engine.learnTopic('npc-1', 'dragon_attack', 'rumor');
    expect(engine.knowsTopic('npc-1', 'dragon_attack')).toBe(true);
    expect(engine.knowsTopic('npc-1', 'politics')).toBe(false);
  });

  it('returns false for unknown npc', () => {
    expect(engine.knowsTopic('ghost', 'anything')).toBe(false);
  });

  it('lists known topics for an npc', () => {
    engine.learnTopic('npc-1', 'dragon_attack', 'rumor');
    engine.learnTopic('npc-1', 'new_king', 'decree');
    expect(engine.getKnownTopics('npc-1')).toHaveLength(2);
  });

  it('updates existing topic knowledge', () => {
    engine.learnTopic('npc-1', 'dragon_attack', 'rumor');
    engine.learnTopic('npc-1', 'dragon_attack', 'witness');
    const topics = engine.getKnownTopics('npc-1');
    expect(topics).toHaveLength(1);
    expect(topics[0]?.source).toBe('witness');
  });
});

describe('DialogueEngine — dynamic topic generation', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = createDialogueEngine(createDeps());
  });

  it('generates topics from a world event', () => {
    const event: WorldEvent = {
      eventId: 'evt-1',
      eventType: 'invasion',
      description: 'Orc army sighted',
      location: 'northern_border',
      timestamp: 5000,
    };
    const topics = engine.generateTopicsFromEvent(event);
    expect(topics).toHaveLength(2);
    expect(topics[0]?.topic).toBe('invasion');
    expect(topics[1]?.topic).toBe('northern_border');
  });

  it('assigns relevance scores to generated topics', () => {
    const event: WorldEvent = {
      eventId: 'evt-1',
      eventType: 'famine',
      description: 'Crops failed',
      location: 'farmlands',
      timestamp: 5000,
    };
    const topics = engine.generateTopicsFromEvent(event);
    expect(topics[0]?.relevanceScore).toBe(0.8);
    expect(topics[1]?.relevanceScore).toBe(0.5);
  });

  it('lists all generated topics', () => {
    const event: WorldEvent = {
      eventId: 'evt-1',
      eventType: 'fire',
      description: 'Forest fire',
      location: 'woods',
      timestamp: 5000,
    };
    engine.generateTopicsFromEvent(event);
    expect(engine.getGeneratedTopics()).toHaveLength(2);
  });

  it('prunes low-relevance topics', () => {
    const event: WorldEvent = {
      eventId: 'evt-1',
      eventType: 'rain',
      description: 'Light rain',
      location: 'meadow',
      timestamp: 5000,
    };
    engine.generateTopicsFromEvent(event);
    const pruned = engine.pruneGeneratedTopics(0.6);
    expect(pruned).toBe(1);
    expect(engine.getGeneratedTopics()).toHaveLength(1);
  });
});

describe('DialogueEngine — stats and constants', () => {
  it('reports engine statistics', () => {
    const engine = createDialogueEngine(createDeps());
    engine.registerLine(makeLine({ lineId: 'l1', npcId: 'npc-1' }));
    engine.registerBranch({ branchId: 'b1', parentLineId: 'l1', lines: [] });
    engine.recordConversation('npc-1', 'p1', 'l1', 'greeting');
    engine.learnTopic('npc-1', 'weather', 'observation');
    const stats = engine.getStats();
    expect(stats.totalLines).toBe(1);
    expect(stats.totalBranches).toBe(1);
    expect(stats.totalRecords).toBe(1);
    expect(stats.totalTopics).toBe(1);
    expect(stats.totalGeneratedTopics).toBe(0);
  });

  it('exports MOOD_PRIORITY_BONUS constant', () => {
    expect(MOOD_PRIORITY_BONUS).toBe(10);
  });

  it('exports MAX_HISTORY_PER_NPC constant', () => {
    expect(MAX_HISTORY_PER_NPC).toBe(200);
  });

  it('exports TOPIC_RELEVANCE_THRESHOLD constant', () => {
    expect(TOPIC_RELEVANCE_THRESHOLD).toBe(0.3);
  });
});
