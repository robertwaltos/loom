import { describe, expect, it } from 'vitest';
import { createWorldDiscoveryModule } from '../world-discovery.js';

function makeModule() {
  let now = 1_000_000n;
  return {
    module: createWorldDiscoveryModule({
      clock: { nowMicroseconds: () => now },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    }),
    setTime: (next: bigint) => {
      now = next;
    },
  };
}

describe('world-discovery simulation', () => {
  it('moves a world from surveyed to open after conditions are met', () => {
    const { module, setTime } = makeModule();

    module.recordSurvey('world-1');
    module.setSurveyRequirement('world-1', 2);
    module.setUnlockConditions('world-1', [
      { type: 'TIME_ELAPSED', param: 5_000_000n },
      { type: 'SURVEY_COUNT', param: 'unused' },
    ]);

    setTime(2_000_000n);
    expect(module.checkUnlockConditions('world-1').canAdvance).toBe(false);

    module.recordSurvey('world-1');
    setTime(8_000_000n);
    expect(module.advanceStage('world-1').success).toBe(true);
    expect(module.advanceStage('world-1').success).toBe(true);

    const world = module.getDiscoveredWorlds().find((w) => w.worldId === 'world-1');
    expect(world?.stage).toBe('OPEN');
  });
});
