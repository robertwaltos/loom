import { describe, expect, it } from 'vitest';
import { createSurveyCorpsSystem } from '../survey-corps.js';

function makeSystem() {
  let i = 0;
  return createSurveyCorpsSystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => `id-${++i}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('survey-corps simulation', () => {
  it('runs full expedition lifecycle from launch to completion with report', () => {
    const corps = makeSystem();
    corps.registerCorps('c1', 'First Corps');
    corps.registerWorld('w-frontier');

    const expedition = corps.launchExpedition('c1', 'w-frontier', 6);
    expect(typeof expedition).toBe('object');
    if (typeof expedition === 'string') return;

    corps.depart(expedition.expeditionId);
    corps.beginSurveying(expedition.expeditionId);
    const report = corps.submitReport(
      expedition.expeditionId,
      'Dense mineral fields and moderate hazards',
      4,
      70,
      ['iron', 'rare-earths'],
    );
    expect(typeof report).toBe('object');

    corps.returnHome(expedition.expeditionId);
    corps.completeExpedition(expedition.expeditionId);

    const record = corps.getCorpsRecord('c1');
    expect(record?.totalExpeditions).toBe(1);
    expect(record?.successfulExpeditions).toBe(1);
  });
});
