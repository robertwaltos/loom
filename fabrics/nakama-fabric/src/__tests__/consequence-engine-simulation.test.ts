import { describe, it, expect } from 'vitest';
import { createConsequenceEngine } from '../consequence-engine.js';
import { createMarksRegistry } from '../marks-registry.js';
import type {
  ConsequenceChronicleEntry,
  ConsequenceChroniclePort,
  ConsequenceEngine,
  SurveyCompleteEvent,
  UnrestNotifyEvent,
  VoteCompleteEvent,
  WorldSurveyedCallback,
} from '../consequence-engine.js';

interface ChronicleWithState extends ConsequenceChroniclePort {
  readonly entries: ConsequenceChronicleEntry[];
}

interface CallbackWithState extends WorldSurveyedCallback {
  readonly calls: Array<{ worldId: string; beaconId: string }>;
}

function createHarness(): {
  engine: ConsequenceEngine;
  chronicle: ChronicleWithState;
  callback: CallbackWithState;
} {
  let markSeq = 0;
  let chronicleSeq = 0;
  const entries: ConsequenceChronicleEntry[] = [];
  const calls: Array<{ worldId: string; beaconId: string }> = [];

  const chronicle: ChronicleWithState = {
    entries,
    append(entry) {
      chronicleSeq += 1;
      entries.push(entry);
      return `chr-${String(chronicleSeq)}`;
    },
  };

  const callback: CallbackWithState = {
    calls,
    onWorldSurveyed(worldId: string, beaconId: string): void {
      calls.push({ worldId, beaconId });
    },
  };

  const marksRegistry = createMarksRegistry({
    idGenerator: {
      next() {
        markSeq += 1;
        return `mark-${String(markSeq)}`;
      },
    },
    clock: { nowMicroseconds: () => 10_000_000 },
  });

  const engine = createConsequenceEngine({
    chronicle,
    marksRegistry,
    worldSurveyedCallback: callback,
  });

  return { engine, chronicle, callback };
}

function survey(overrides?: Partial<SurveyCompleteEvent>): SurveyCompleteEvent {
  return {
    missionId: 'mission-1',
    dynastyId: 'dyn-1',
    worldId: 'earth',
    beaconId: 'beacon-a',
    completedAtUs: 1_000,
    ...overrides,
  };
}

function unrest(overrides?: Partial<UnrestNotifyEvent>): UnrestNotifyEvent {
  return {
    worldId: 'earth',
    unrestLevel: 0.52,
    triggeredAtUs: 2_000,
    ...overrides,
  };
}

function vote(overrides?: Partial<VoteCompleteEvent>): VoteCompleteEvent {
  return {
    motionId: 'motion-a',
    worldId: 'earth',
    passed: true,
    yesWeight: 66,
    noWeight: 34,
    completedAtUs: 3_000,
    ...overrides,
  };
}

describe('Consequence engine simulation scenarios', () => {
  it('keeps first-world ownership while still awarding survey marks to later dynasties', () => {
    const { engine } = createHarness();

    const first = engine.handleSurveyComplete(survey({ dynastyId: 'dyn-a' }));
    const second = engine.handleSurveyComplete(survey({ dynastyId: 'dyn-b' }));

    expect(first.worldMark?.dynastyId).toBe('dyn-a');
    expect(second.worldMark).toBeNull();
    expect(second.surveyMark.markType).toBe('SURVEY');
    expect(second.surveyMark.dynastyId).toBe('dyn-b');
  });

  it('records deterministic chronicle ordering for first survey in a world', () => {
    const { engine, chronicle } = createHarness();

    engine.handleSurveyComplete(survey({ dynastyId: 'dyn-a', worldId: 'earth', beaconId: 'beacon-earth' }));

    expect(chronicle.entries).toHaveLength(2);
    expect(chronicle.entries[0]).toMatchObject({
      category: 'world.transition',
      worldId: 'earth',
      subject: 'dyn-a',
    });
    expect(chronicle.entries[1]).toMatchObject({
      category: 'player.achievement',
      worldId: 'earth',
      subject: 'dyn-a',
    });
  });

  it('uses different chronicle ids for survey and world mark references', () => {
    const { engine } = createHarness();

    const result = engine.handleSurveyComplete(survey());

    expect(result.surveyMark.chronicleEntryRef).toBe(result.chronicleEntryId);
    expect(result.worldMark?.chronicleEntryRef).not.toBe(result.chronicleEntryId);
  });

  it('notifies world survey callback for every survey completion attempt', () => {
    const { engine, callback } = createHarness();

    engine.handleSurveyComplete(survey({ dynastyId: 'dyn-a', worldId: 'earth', beaconId: 'a' }));
    engine.handleSurveyComplete(survey({ dynastyId: 'dyn-b', worldId: 'earth', beaconId: 'b' }));
    engine.handleSurveyComplete(survey({ dynastyId: 'dyn-c', worldId: 'mars', beaconId: 'c' }));

    expect(callback.calls).toEqual([
      { worldId: 'earth', beaconId: 'a' },
      { worldId: 'earth', beaconId: 'b' },
      { worldId: 'mars', beaconId: 'c' },
    ]);
  });

  it('keeps world marks independent by world', () => {
    const { engine } = createHarness();

    const earth = engine.handleSurveyComplete(survey({ worldId: 'earth', dynastyId: 'dyn-a' }));
    const mars = engine.handleSurveyComplete(survey({ worldId: 'mars', dynastyId: 'dyn-b' }));
    const earthLater = engine.handleSurveyComplete(survey({ worldId: 'earth', dynastyId: 'dyn-c' }));

    expect(earth.worldMark).not.toBeNull();
    expect(mars.worldMark).not.toBeNull();
    expect(earthLater.worldMark).toBeNull();
    expect(earth.worldMark?.worldId).toBe('earth');
    expect(mars.worldMark?.worldId).toBe('mars');
  });

  it('formats unrest records with two-decimal precision', () => {
    const { engine, chronicle } = createHarness();

    engine.handleUnrestNotify(unrest({ worldId: 'earth', unrestLevel: 0.7 }));
    engine.handleUnrestNotify(unrest({ worldId: 'earth', unrestLevel: 0.705 }));

    expect(chronicle.entries[0]?.content).toContain('0.70');
    expect(chronicle.entries[1]?.content).toContain('0.70');
  });

  it('records vote outcomes for both pass and reject paths', () => {
    const { engine, chronicle } = createHarness();

    engine.handleVoteComplete(vote({ motionId: 'm-pass', passed: true }));
    engine.handleVoteComplete(vote({ motionId: 'm-fail', passed: false }));

    expect(chronicle.entries[0]).toMatchObject({
      category: 'governance.vote',
      subject: 'm-pass',
      worldId: 'earth',
    });
    expect(chronicle.entries[0]?.content).toContain('passed');
    expect(chronicle.entries[1]?.content).toContain('rejected');
  });

  it('preserves event isolation under interleaved traffic', () => {
    const { engine, chronicle } = createHarness();

    engine.handleSurveyComplete(survey({ worldId: 'earth', dynastyId: 'dyn-a' }));
    engine.handleUnrestNotify(unrest({ worldId: 'earth', unrestLevel: 0.82 }));
    engine.handleVoteComplete(vote({ worldId: 'earth', motionId: 'm-earth', passed: true }));
    engine.handleSurveyComplete(survey({ worldId: 'earth', dynastyId: 'dyn-b' }));
    engine.handleVoteComplete(vote({ worldId: 'mars', motionId: 'm-mars', passed: false }));

    expect(chronicle.entries).toHaveLength(6);
    expect(chronicle.entries.filter((e) => e.category === 'world.transition')).toHaveLength(2);
    expect(chronicle.entries.filter((e) => e.category === 'player.achievement')).toHaveLength(1);
    expect(chronicle.entries.filter((e) => e.category === 'governance.vote')).toHaveLength(3);
  });

  it('keeps survey chronicle content tied to mission beacon and world', () => {
    const { engine, chronicle } = createHarness();

    engine.handleSurveyComplete(survey({ worldId: 'venus', dynastyId: 'dyn-v', beaconId: 'beacon-v' }));

    const surveyRecord = chronicle.entries.find((e) => e.category === 'world.transition');
    expect(surveyRecord?.worldId).toBe('venus');
    expect(surveyRecord?.content).toContain('beacon-v');
  });

  it('creates monotonic chronicle ids across mixed events', () => {
    const { engine } = createHarness();

    const s = engine.handleSurveyComplete(survey({ dynastyId: 'dyn-a' }));
    const u = engine.handleUnrestNotify(unrest());
    const v = engine.handleVoteComplete(vote());

    expect(s.chronicleEntryId).toBe('chr-1');
    expect(s.worldMark?.chronicleEntryRef).toBe('chr-2');
    expect(u.chronicleEntryId).toBe('chr-3');
    expect(v.chronicleEntryId).toBe('chr-4');
  });
});
