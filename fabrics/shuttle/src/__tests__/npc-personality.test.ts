import { describe, it, expect } from 'vitest';
import {
  createPersonalitySystem,
  PERSONALITY_TEMPLATES,
  DEFAULT_MOOD_DECAY_RATE,
  TRAIT_INFLUENCE_WEIGHTS,
  BASELINE_MOOD,
} from '../npc-personality.js';
import type {
  PersonalityDeps,
  PersonalityTraits,
  PersonalitySystem,
  PersonalityTrait,
  MoodModifier,
} from '../npc-personality.js';

// ── Test Helpers ─────────────────────────────────────────────────

function makeDeps(): PersonalityDeps {
  let time = 1_000_000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'pers-' + String(++id) },
  };
}

function makeTraits(overrides?: Partial<PersonalityTraits>): PersonalityTraits {
  return {
    openness: overrides?.openness ?? 0.5,
    conscientiousness: overrides?.conscientiousness ?? 0.5,
    extraversion: overrides?.extraversion ?? 0.5,
    agreeableness: overrides?.agreeableness ?? 0.5,
    neuroticism: overrides?.neuroticism ?? 0.5,
  };
}

// ── Register NPC ─────────────────────────────────────────────────

describe('PersonalitySystem — registerNpc', () => {
  it('registers an NPC with personality traits', () => {
    const sys = createPersonalitySystem(makeDeps());
    const profile = sys.registerNpc('npc-1', makeTraits({ openness: 0.8 }));
    expect(profile.profileId).toBe('pers-1');
    expect(profile.npcId).toBe('npc-1');
    expect(profile.traits.openness).toBe(0.8);
  });

  it('clamps trait values to [0, 1]', () => {
    const sys = createPersonalitySystem(makeDeps());
    const profile = sys.registerNpc('npc-1', makeTraits({ openness: 1.5, neuroticism: -0.5 }));
    expect(profile.traits.openness).toBe(1);
    expect(profile.traits.neuroticism).toBe(0);
  });

  it('sets baseline mood on registration', () => {
    const sys = createPersonalitySystem(makeDeps());
    const profile = sys.registerNpc('npc-1', makeTraits());
    expect(profile.mood.valence).toBe(BASELINE_MOOD.valence);
    expect(profile.mood.arousal).toBe(BASELINE_MOOD.arousal);
  });

  it('assigns a dominant emotion based on baseline mood', () => {
    const sys = createPersonalitySystem(makeDeps());
    const profile = sys.registerNpc('npc-1', makeTraits());
    expect(profile.mood.dominantEmotion).toBeTruthy();
  });

  it('overwrites existing profile for same npcId', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ openness: 0.3 }));
    const profile = sys.registerNpc('npc-1', makeTraits({ openness: 0.9 }));
    expect(profile.traits.openness).toBe(0.9);
  });
});

// ── Get Profile ──────────────────────────────────────────────────

describe('PersonalitySystem — getProfile', () => {
  it('retrieves a registered profile', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits());
    const profile = sys.getProfile('npc-1');
    expect(profile).toBeDefined();
    expect(profile?.npcId).toBe('npc-1');
  });

  it('returns undefined for unknown npcId', () => {
    const sys = createPersonalitySystem(makeDeps());
    expect(sys.getProfile('missing')).toBeUndefined();
  });
});

// ── Get Current Mood ─────────────────────────────────────────────

describe('PersonalitySystem — getCurrentMood', () => {
  it('returns current mood for registered NPC', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits());
    const mood = sys.getCurrentMood('npc-1');
    expect(mood.valence).toBe(BASELINE_MOOD.valence);
    expect(mood.arousal).toBe(BASELINE_MOOD.arousal);
    expect(mood.dominantEmotion).toBeTruthy();
    expect(mood.updatedAt).toBeGreaterThan(0);
  });

  it('returns baseline mood for unregistered NPC', () => {
    const sys = createPersonalitySystem(makeDeps());
    const mood = sys.getCurrentMood('unknown');
    expect(mood.valence).toBe(BASELINE_MOOD.valence);
    expect(mood.arousal).toBe(BASELINE_MOOD.arousal);
  });
});

// ── Apply Mood Modifier ──────────────────────────────────────────

describe('PersonalitySystem — applyMoodModifier', () => {
  it('shifts valence and arousal', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ neuroticism: 0.5 }));
    const modifier: MoodModifier = {
      valenceShift: 0.2,
      arousalShift: 0.1,
      source: 'gift',
    };
    const result = sys.applyMoodModifier('npc-1', modifier);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.valence).toBeGreaterThan(BASELINE_MOOD.valence);
      expect(result.arousal).toBeGreaterThan(BASELINE_MOOD.arousal);
    }
  });

  it('neuroticism amplifies mood shifts', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('neurotic', makeTraits({ neuroticism: 1.0 }));
    sys.registerNpc('stable', makeTraits({ neuroticism: 0.0 }));
    const modifier: MoodModifier = {
      valenceShift: -0.2,
      arousalShift: 0,
      source: 'insult',
    };
    const r1 = sys.applyMoodModifier('neurotic', modifier);
    const r2 = sys.applyMoodModifier('stable', modifier);
    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
    if (typeof r1 !== 'string' && typeof r2 !== 'string') {
      expect(r1.valence).toBeLessThan(r2.valence);
    }
  });

  it('clamps mood to [0, 1]', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits());
    const result = sys.applyMoodModifier('npc-1', {
      valenceShift: 10.0,
      arousalShift: 10.0,
      source: 'extreme',
    });
    if (typeof result !== 'string') {
      expect(result.valence).toBeLessThanOrEqual(1);
      expect(result.arousal).toBeLessThanOrEqual(1);
    }
  });

  it('returns error string for unknown NPC', () => {
    const sys = createPersonalitySystem(makeDeps());
    const result = sys.applyMoodModifier('missing', {
      valenceShift: 0.1,
      arousalShift: 0,
      source: 'test',
    });
    expect(result).toBe('NPC_NOT_FOUND');
  });

  it('updates dominant emotion after shift', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits());
    const result = sys.applyMoodModifier('npc-1', {
      valenceShift: 0.4,
      arousalShift: 0.5,
      source: 'celebration',
    });
    if (typeof result !== 'string') {
      expect(result.dominantEmotion).toBeTruthy();
    }
  });
});

// ── Decay Mood ───────────────────────────────────────────────────

describe('PersonalitySystem — decayMood', () => {
  it('moves mood toward baseline', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits());
    sys.applyMoodModifier('npc-1', {
      valenceShift: 0.4,
      arousalShift: 0.4,
      source: 'event',
    });
    const result = sys.decayMood('npc-1');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      const profile = sys.getProfile('npc-1');
      expect(profile?.mood.valence).toBeLessThan(0.9);
    }
  });

  it('returns error for unknown NPC', () => {
    const sys = createPersonalitySystem(makeDeps());
    expect(sys.decayMood('missing')).toBe('NPC_NOT_FOUND');
  });

  it('does not overshoot baseline', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits());
    for (let i = 0; i < 100; i++) {
      sys.decayMood('npc-1');
    }
    const mood = sys.getCurrentMood('npc-1');
    expect(mood.valence).toBeCloseTo(BASELINE_MOOD.valence, 2);
    expect(mood.arousal).toBeCloseTo(BASELINE_MOOD.arousal, 2);
  });
});

// ── Predict Behavior ─────────────────────────────────────────────

describe('PersonalitySystem — predictBehavior', () => {
  it('predicts behavioral tendency from traits', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ openness: 0.9, extraversion: 0.8 }));
    const tendency = sys.predictBehavior('npc-1', 'discovering_ruins');
    expect(tendency.npcId).toBe('npc-1');
    expect(tendency.situation).toBe('discovering_ruins');
    expect(tendency.approachStyle).toBe('bold_explorer');
    expect(tendency.creativity).toBe(0.9);
    expect(tendency.socialOrientation).toBe(0.8);
  });

  it('high conscientiousness and agreeableness yields methodical cooperator', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ conscientiousness: 0.8, agreeableness: 0.7 }));
    const tendency = sys.predictBehavior('npc-1', 'group_task');
    expect(tendency.approachStyle).toBe('methodical_cooperator');
  });

  it('high neuroticism yields cautious analyzer', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ neuroticism: 0.8 }));
    const tendency = sys.predictBehavior('npc-1', 'threat');
    expect(tendency.approachStyle).toBe('cautious_analyzer');
    expect(tendency.emotionalReactivity).toBe(0.8);
  });

  it('returns balanced defaults for unknown NPC', () => {
    const sys = createPersonalitySystem(makeDeps());
    const tendency = sys.predictBehavior('missing', 'anything');
    expect(tendency.approachStyle).toBe('balanced_pragmatist');
    expect(tendency.riskTolerance).toBe(0.5);
  });

  it('computes risk tolerance from traits', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc(
      'brave',
      makeTraits({
        openness: 0.9,
        extraversion: 0.8,
        neuroticism: 0.1,
      }),
    );
    const tendency = sys.predictBehavior('brave', 'combat');
    expect(tendency.riskTolerance).toBeGreaterThan(0.7);
  });
});

// ── Calculate Emotional Response ─────────────────────────────────

describe('PersonalitySystem — calculateEmotionalResponse', () => {
  it('calculates response based on personality', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ agreeableness: 0.9, neuroticism: 0.2 }));
    const response = sys.calculateEmotionalResponse('npc-1', 'received_gift');
    expect(response.npcId).toBe('npc-1');
    expect(response.event).toBe('received_gift');
    expect(response.primaryEmotion).toBeTruthy();
    expect(response.intensity).toBeGreaterThan(0);
    expect(response.copingStrategy).toBeTruthy();
  });

  it('neurotic NPCs have higher emotional intensity', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('neurotic', makeTraits({ neuroticism: 0.9 }));
    sys.registerNpc('stable', makeTraits({ neuroticism: 0.1 }));
    const r1 = sys.calculateEmotionalResponse('neurotic', 'threat');
    const r2 = sys.calculateEmotionalResponse('stable', 'threat');
    expect(r1.intensity).toBeGreaterThan(r2.intensity);
  });

  it('conscientious NPCs use problem-solving coping', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ conscientiousness: 0.9 }));
    const response = sys.calculateEmotionalResponse('npc-1', 'challenge');
    expect(response.copingStrategy).toBe('problem_solving');
  });

  it('agreeable NPCs use social support coping', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ agreeableness: 0.9, conscientiousness: 0.3 }));
    const response = sys.calculateEmotionalResponse('npc-1', 'loss');
    expect(response.copingStrategy).toBe('social_support');
  });

  it('returns defaults for unknown NPC', () => {
    const sys = createPersonalitySystem(makeDeps());
    const response = sys.calculateEmotionalResponse('missing', 'event');
    expect(response.primaryEmotion).toBe('contemplation');
    expect(response.intensity).toBe(0.5);
    expect(response.copingStrategy).toBe('acceptance');
  });
});

// ── Compatibility ────────────────────────────────────────────────

describe('PersonalitySystem — getCompatibility', () => {
  it('similar personalities have high compatibility', () => {
    const sys = createPersonalitySystem(makeDeps());
    const traits = makeTraits({ openness: 0.8, conscientiousness: 0.7 });
    sys.registerNpc('a', traits);
    sys.registerNpc('b', traits);
    const score = sys.getCompatibility('a', 'b');
    expect(score).toBeGreaterThan(0.9);
  });

  it('opposite personalities have low compatibility', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('a', makeTraits({ openness: 0.0, neuroticism: 1.0 }));
    sys.registerNpc('b', makeTraits({ openness: 1.0, neuroticism: 0.0 }));
    const score = sys.getCompatibility('a', 'b');
    expect(score).toBeLessThan(0.6);
  });

  it('returns 0 when NPC not found', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('a', makeTraits());
    expect(sys.getCompatibility('a', 'missing')).toBe(0);
  });

  it('identical traits yield compatibility of 1.0', () => {
    const sys = createPersonalitySystem(makeDeps());
    const traits = makeTraits();
    sys.registerNpc('a', traits);
    sys.registerNpc('b', traits);
    expect(sys.getCompatibility('a', 'b')).toBeCloseTo(1.0, 5);
  });
});

// ── List By Trait ────────────────────────────────────────────────

describe('PersonalitySystem — listByTrait', () => {
  it('filters NPCs by minimum trait value', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('open-npc', makeTraits({ openness: 0.9 }));
    sys.registerNpc('closed-npc', makeTraits({ openness: 0.2 }));
    sys.registerNpc('moderate-npc', makeTraits({ openness: 0.6 }));
    const results = sys.listByTrait('openness', 0.5);
    expect(results).toHaveLength(2);
    expect(results[0]?.traits.openness).toBe(0.9);
    expect(results[1]?.traits.openness).toBe(0.6);
  });

  it('returns empty when no NPCs match', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('npc-1', makeTraits({ extraversion: 0.3 }));
    const results = sys.listByTrait('extraversion', 0.8);
    expect(results).toHaveLength(0);
  });

  it('sorts by trait value descending', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('a', makeTraits({ conscientiousness: 0.6 }));
    sys.registerNpc('b', makeTraits({ conscientiousness: 0.9 }));
    sys.registerNpc('c', makeTraits({ conscientiousness: 0.7 }));
    const results = sys.listByTrait('conscientiousness', 0.5);
    expect(results[0]?.traits.conscientiousness).toBe(0.9);
    expect(results[1]?.traits.conscientiousness).toBe(0.7);
    expect(results[2]?.traits.conscientiousness).toBe(0.6);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('PersonalitySystem — getStats', () => {
  it('returns empty stats initially', () => {
    const sys = createPersonalitySystem(makeDeps());
    const stats = sys.getStats();
    expect(stats.totalPersonalities).toBe(0);
    expect(stats.averageValence).toBe(0);
    expect(stats.averageArousal).toBe(0);
  });

  it('computes aggregate stats', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('a', makeTraits({ openness: 0.8 }));
    sys.registerNpc('b', makeTraits({ openness: 0.4 }));
    const stats = sys.getStats();
    expect(stats.totalPersonalities).toBe(2);
    expect(stats.averageValence).toBeCloseTo(BASELINE_MOOD.valence, 1);
    expect(stats.averageArousal).toBeCloseTo(BASELINE_MOOD.arousal, 1);
    expect(stats.traitAverages.openness).toBeCloseTo(0.6, 1);
  });

  it('reflects mood changes in averages', () => {
    const sys = createPersonalitySystem(makeDeps());
    sys.registerNpc('a', makeTraits());
    sys.applyMoodModifier('a', { valenceShift: 0.3, arousalShift: 0, source: 'joy' });
    const stats = sys.getStats();
    expect(stats.averageValence).toBeGreaterThan(BASELINE_MOOD.valence);
  });
});

// ── Constants ────────────────────────────────────────────────────

describe('PersonalitySystem — constants', () => {
  it('exports DEFAULT_MOOD_DECAY_RATE', () => {
    expect(DEFAULT_MOOD_DECAY_RATE).toBe(0.1);
  });

  it('exports TRAIT_INFLUENCE_WEIGHTS summing to 1.0', () => {
    const traits: PersonalityTrait[] = [
      'openness',
      'conscientiousness',
      'extraversion',
      'agreeableness',
      'neuroticism',
    ];
    let sum = 0;
    for (const t of traits) {
      sum += TRAIT_INFLUENCE_WEIGHTS[t];
    }
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('exports BASELINE_MOOD', () => {
    expect(BASELINE_MOOD.valence).toBe(0.5);
    expect(BASELINE_MOOD.arousal).toBe(0.3);
  });

  it('exports PERSONALITY_TEMPLATES with all archetypes', () => {
    expect(PERSONALITY_TEMPLATES.farmer).toBeDefined();
    expect(PERSONALITY_TEMPLATES.merchant).toBeDefined();
    expect(PERSONALITY_TEMPLATES.guard).toBeDefined();
    expect(PERSONALITY_TEMPLATES.scholar).toBeDefined();
    expect(PERSONALITY_TEMPLATES.priest).toBeDefined();
    expect(PERSONALITY_TEMPLATES.adventurer).toBeDefined();
    expect(PERSONALITY_TEMPLATES.recluse).toBeDefined();
    expect(PERSONALITY_TEMPLATES.diplomat).toBeDefined();
  });
});
