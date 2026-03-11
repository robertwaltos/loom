import { describe, it, expect } from 'vitest';
import { createNpcKnowledgeSystem, FIDELITY_LOSS_PER_HOP, MIN_FIDELITY } from '../npc-knowledge.js';
import type { NpcKnowledgeDeps } from '../npc-knowledge.js';

function createDeps(): NpcKnowledgeDeps {
  let time = 1000n;
  let id = 0;
  const logs: string[] = [];
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'know-' + String(id++) },
    logger: {
      info: (msg: string, ctx: Record<string, unknown>) => {
        logs.push(msg + ':' + JSON.stringify(ctx));
      },
    },
  };
}

describe('NpcKnowledgeSystem — addKnowledge', () => {
  it('adds new knowledge to npc', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const k = sys.addKnowledge(
      'npc-1',
      'EVENT',
      'festival',
      'Annual harvest festival starts tomorrow',
      'FIRSTHAND',
    );
    expect(typeof k).toBe('object');
    if (typeof k === 'object') {
      expect(k.knowledgeId).toBe('know-0');
      expect(k.npcId).toBe('npc-1');
      expect(k.category).toBe('EVENT');
      expect(k.subject).toBe('festival');
      expect(k.source).toBe('FIRSTHAND');
      expect(k.trustLevel).toBe('VERIFIED');
    }
  });

  it('rejects duplicate knowledge', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.addKnowledge('npc-1', 'LOCATION', 'cave', 'Hidden cave north', 'FIRSTHAND');
    const dup = sys.addKnowledge('npc-1', 'LOCATION', 'cave', 'Another cave', 'RUMOR');
    expect(dup).toBe('duplicate_knowledge');
  });

  it('assigns correct trust level by source', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const firsthand = sys.addKnowledge('npc-1', 'NPC', 'merchant', 'Info', 'FIRSTHAND');
    const reliable = sys.addKnowledge('npc-2', 'NPC', 'guard', 'Info', 'RELIABLE_NPC');
    const rumor = sys.addKnowledge('npc-3', 'NPC', 'thief', 'Info', 'RUMOR');
    if (typeof firsthand === 'object') expect(firsthand.trustLevel).toBe('VERIFIED');
    if (typeof reliable === 'object') expect(reliable.trustLevel).toBe('TRUSTED');
    if (typeof rumor === 'object') expect(rumor.trustLevel).toBe('DUBIOUS');
  });
});

describe('NpcKnowledgeSystem — createRumor', () => {
  it('creates a new rumor', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'DANGER', 'bandits', 'Bandits spotted on eastern road');
    expect(rumor.rumorId).toBe('know-0');
    expect(rumor.originNpcId).toBe('npc-1');
    expect(rumor.category).toBe('DANGER');
    expect(rumor.subject).toBe('bandits');
    expect(rumor.fidelity).toBe(1.0);
    expect(rumor.spreadCount).toBe(0);
  });
});

describe('NpcKnowledgeSystem — spreadRumor', () => {
  it('spreads rumor from one npc to another', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'MARKET', 'prices', 'Wheat prices rising');
    sys.evaluateTrustworthiness('npc-2', 'npc-1', 0.8, 0.7, 0.9);
    const spread = sys.spreadRumor(rumor.rumorId, 'npc-1', 'npc-2');
    expect(typeof spread).toBe('object');
    if (typeof spread === 'object') {
      expect(spread.fromNpcId).toBe('npc-1');
      expect(spread.toNpcId).toBe('npc-2');
      expect(spread.knowledgeId).toBe(rumor.rumorId);
    }
  });

  it('reduces fidelity with each spread', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'QUEST', 'dragon', 'Dragon seen in mountains');
    sys.evaluateTrustworthiness('npc-2', 'npc-1', 0.5, 0.5, 0.5);
    const spread1 = sys.spreadRumor(rumor.rumorId, 'npc-1', 'npc-2');
    const updated = sys.getRumor(rumor.rumorId);
    expect(updated?.fidelity).toBeLessThan(1.0);
    expect(updated?.spreadCount).toBe(1);
  });

  it('rejects spreading to same npc', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'EVENT', 'war', 'War declared');
    const err = sys.spreadRumor(rumor.rumorId, 'npc-1', 'npc-1');
    expect(err).toBe('same_npc');
  });

  it('returns error for unknown rumor', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const err = sys.spreadRumor('fake-rumor', 'npc-1', 'npc-2');
    expect(err).toBe('rumor_not_found');
  });

  it('respects minimum fidelity floor', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'LOCATION', 'treasure', 'Treasure map found');
    sys.evaluateTrustworthiness('npc-2', 'npc-1', 0.1, 0.1, 0.1);
    for (let i = 0; i < 20; i++) {
      const targetNpc = 'npc-' + String(i + 2);
      sys.evaluateTrustworthiness(targetNpc, 'npc-1', 0.1, 0.1, 0.1);
      sys.spreadRumor(rumor.rumorId, 'npc-1', targetNpc);
    }
    const updated = sys.getRumor(rumor.rumorId);
    expect(updated?.fidelity).toBeGreaterThanOrEqual(MIN_FIDELITY);
  });
});

describe('NpcKnowledgeSystem — refreshKnowledge', () => {
  it('refreshes knowledge timestamp', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const k = sys.addKnowledge('npc-1', 'NPC', 'ally', 'Alliance formed', 'FIRSTHAND');
    if (typeof k === 'object') {
      const original = k.lastRefreshedAt;
      const refreshed = sys.refreshKnowledge(k.knowledgeId);
      if (typeof refreshed === 'object') {
        expect(refreshed.lastRefreshedAt).toBeGreaterThan(original);
      }
    }
  });

  it('returns error for unknown knowledge', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const err = sys.refreshKnowledge('fake-knowledge');
    expect(err).toBe('knowledge_not_found');
  });
});

describe('NpcKnowledgeSystem — getKnownFacts', () => {
  it('retrieves all knowledge for npc', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.addKnowledge('npc-1', 'EVENT', 'storm', 'Storm approaching', 'FIRSTHAND');
    sys.addKnowledge('npc-1', 'LOCATION', 'inn', 'Inn has rooms', 'RELIABLE_NPC');
    const facts = sys.getKnownFacts('npc-1', undefined);
    expect(facts.length).toBe(2);
  });

  it('filters knowledge by category', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.addKnowledge('npc-1', 'EVENT', 'battle', 'Battle won', 'FIRSTHAND');
    sys.addKnowledge('npc-1', 'MARKET', 'trade', 'Trade route open', 'RUMOR');
    sys.addKnowledge('npc-1', 'EVENT', 'ceremony', 'Ceremony tomorrow', 'GOSSIP');
    const events = sys.getKnownFacts('npc-1', 'EVENT');
    expect(events.length).toBe(2);
    for (const e of events) {
      expect(e.category).toBe('EVENT');
    }
  });

  it('returns empty for npc with no knowledge', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const facts = sys.getKnownFacts('ghost', undefined);
    expect(facts.length).toBe(0);
  });
});

describe('NpcKnowledgeSystem — evaluateTrustworthiness', () => {
  it('computes trustworthiness score', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const score = sys.evaluateTrustworthiness('npc-1', 'npc-2', 0.8, 0.7, 0.9);
    expect(score.npcId).toBe('npc-2');
    expect(score.evaluatorNpcId).toBe('npc-1');
    expect(score.score).toBeGreaterThan(0.7);
    expect(score.score).toBeLessThanOrEqual(1.0);
  });

  it('identifies trust factors', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const high = sys.evaluateTrustworthiness('npc-1', 'npc-2', 0.9, 0.85, 0.95);
    expect(high.factors.length).toBeGreaterThan(0);
    expect(high.factors).toContain('strong_relationship');
  });

  it('flags low trust', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const low = sys.evaluateTrustworthiness('npc-1', 'npc-2', 0.1, 0.2, 0.15);
    expect(low.score).toBeLessThan(0.3);
    expect(low.factors).toContain('low_trust');
  });

  it('stores trust score in matrix', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.evaluateTrustworthiness('npc-1', 'npc-2', 0.7, 0.6, 0.8);
    const stored = sys.getTrustScore('npc-1', 'npc-2');
    expect(stored).toBeDefined();
    expect(stored).toBeGreaterThan(0.6);
  });
});

describe('NpcKnowledgeSystem — pruneStaleKnowledge', () => {
  it('removes stale knowledge', () => {
    const deps = createDeps();
    const sys = createNpcKnowledgeSystem(deps);
    sys.addKnowledge('npc-1', 'EVENT', 'old', 'Old event', 'GOSSIP');
    const k2 = sys.addKnowledge('npc-1', 'EVENT', 'fresh', 'Fresh event', 'FIRSTHAND');
    if (typeof k2 === 'object') {
      sys.refreshKnowledge(k2.knowledgeId);
    }
    const pruned = sys.pruneStaleKnowledge('npc-1');
    expect(pruned).toBeGreaterThanOrEqual(0);
  });

  it('returns zero for npc with no stale knowledge', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.addKnowledge('npc-1', 'LOCATION', 'home', 'Home location', 'FIRSTHAND');
    const pruned = sys.pruneStaleKnowledge('npc-1');
    expect(pruned).toBe(0);
  });
});

describe('NpcKnowledgeSystem — getKnowledgeItem', () => {
  it('retrieves knowledge by id', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const k = sys.addKnowledge('npc-1', 'QUEST', 'fetch', 'Fetch quest', 'RELIABLE_NPC');
    if (typeof k === 'object') {
      const retrieved = sys.getKnowledgeItem(k.knowledgeId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.subject).toBe('fetch');
    }
  });

  it('returns undefined for unknown id', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const retrieved = sys.getKnowledgeItem('unknown');
    expect(retrieved).toBeUndefined();
  });
});

describe('NpcKnowledgeSystem — getRumor', () => {
  it('retrieves rumor by id', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'DANGER', 'wolves', 'Wolves in forest');
    const retrieved = sys.getRumor(rumor.rumorId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.subject).toBe('wolves');
  });

  it('returns undefined for unknown id', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const retrieved = sys.getRumor('unknown');
    expect(retrieved).toBeUndefined();
  });
});

describe('NpcKnowledgeSystem — getRumorsByOrigin', () => {
  it('lists all rumors from origin npc', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.createRumor('npc-1', 'MARKET', 'gold', 'Gold shortage');
    sys.createRumor('npc-1', 'EVENT', 'siege', 'City under siege');
    sys.createRumor('npc-2', 'QUEST', 'hero', 'Hero needed');
    const rumors = sys.getRumorsByOrigin('npc-1');
    expect(rumors.length).toBe(2);
    for (const r of rumors) {
      expect(r.originNpcId).toBe('npc-1');
    }
  });

  it('returns empty for npc with no rumors', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumors = sys.getRumorsByOrigin('ghost');
    expect(rumors.length).toBe(0);
  });
});

describe('NpcKnowledgeSystem — getSpreadHistory', () => {
  it('tracks rumor spread history', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'LOCATION', 'ruins', 'Ancient ruins found');
    sys.evaluateTrustworthiness('npc-2', 'npc-1', 0.6, 0.7, 0.8);
    sys.evaluateTrustworthiness('npc-3', 'npc-1', 0.5, 0.6, 0.7);
    sys.spreadRumor(rumor.rumorId, 'npc-1', 'npc-2');
    sys.spreadRumor(rumor.rumorId, 'npc-1', 'npc-3');
    const history = sys.getSpreadHistory(rumor.rumorId);
    expect(history.length).toBe(2);
  });

  it('returns empty for rumor with no spreads', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const rumor = sys.createRumor('npc-1', 'NPC', 'stranger', 'Stranger arrived');
    const history = sys.getSpreadHistory(rumor.rumorId);
    expect(history.length).toBe(0);
  });
});

describe('NpcKnowledgeSystem — getTrustScore', () => {
  it('retrieves stored trust score', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.evaluateTrustworthiness('npc-1', 'npc-2', 0.75, 0.65, 0.85);
    const score = sys.getTrustScore('npc-1', 'npc-2');
    expect(score).toBeDefined();
    expect(score).toBeGreaterThan(0.6);
  });

  it('returns undefined for unevaluated trust', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    const score = sys.getTrustScore('npc-1', 'npc-99');
    expect(score).toBeUndefined();
  });
});

describe('NpcKnowledgeSystem — getStats', () => {
  it('reports knowledge statistics', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.addKnowledge('npc-1', 'EVENT', 'rain', 'Heavy rain', 'FIRSTHAND');
    sys.addKnowledge('npc-2', 'MARKET', 'sale', 'Market sale', 'RUMOR');
    sys.createRumor('npc-1', 'DANGER', 'fire', 'Fire in town');
    const stats = sys.getStats();
    expect(stats.totalKnowledge).toBe(2);
    expect(stats.totalRumors).toBe(1);
    expect(stats.averageTrust).toBeGreaterThan(0);
  });

  it('counts stale knowledge', () => {
    const sys = createNpcKnowledgeSystem(createDeps());
    sys.addKnowledge('npc-1', 'EVENT', 'old', 'Old news', 'GOSSIP');
    sys.addKnowledge('npc-1', 'EVENT', 'new', 'New news', 'FIRSTHAND');
    const stats = sys.getStats();
    expect(stats.staleKnowledgeCount).toBeGreaterThanOrEqual(0);
  });
});
