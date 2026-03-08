import { describe, it, expect } from 'vitest';
import { createNpcRoutineEngine } from '../npc-routine.js';
import type { NpcRoutineDeps, RoutineStep } from '../npc-routine.js';

function createDeps(startTime = 0): NpcRoutineDeps {
  let time = startTime;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'id-' + String(id++) },
  };
}

const HOUR = 3_600_000_000;
const DAY = 24 * HOUR;

function sampleSteps(): readonly RoutineStep[] {
  return [
    { startOffsetMicro: 0, durationMicro: 4 * HOUR, activity: 'rest', location: 'barracks' },
    { startOffsetMicro: 4 * HOUR, durationMicro: 2 * HOUR, activity: 'patrol', location: 'north-gate' },
    { startOffsetMicro: 6 * HOUR, durationMicro: 6 * HOUR, activity: 'work', location: 'forge' },
    { startOffsetMicro: 12 * HOUR, durationMicro: 2 * HOUR, activity: 'socialise', location: 'tavern' },
    { startOffsetMicro: 14 * HOUR, durationMicro: 10 * HOUR, activity: 'idle', location: 'barracks' },
  ];
}

describe('NpcRoutineEngine — createRoutine', () => {
  it('creates a routine with an id and stores it', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'guard-shift',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    expect(routine.routineId).toBe('id-0');
    expect(routine.name).toBe('guard-shift');
    expect(routine.steps).toHaveLength(5);
    expect(engine.getRoutine(routine.routineId)).toEqual(routine);
  });

  it('returns undefined for unknown routine', () => {
    const engine = createNpcRoutineEngine(createDeps());
    expect(engine.getRoutine('nope')).toBeUndefined();
  });
});

describe('NpcRoutineEngine — assign / unassign', () => {
  it('assigns an npc to a routine', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'patrol',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    expect(engine.assign('npc-1', routine.routineId)).toBe(true);
    const a = engine.getAssignment('npc-1');
    expect(a).toBeDefined();
    expect(a?.status).toBe('running');
    expect(a?.currentActivity).toBe('rest');
  });

  it('rejects assignment to unknown routine', () => {
    const engine = createNpcRoutineEngine(createDeps());
    expect(engine.assign('npc-1', 'missing')).toBe(false);
  });

  it('rejects duplicate assignment', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'patrol',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    expect(engine.assign('npc-1', routine.routineId)).toBe(false);
  });

  it('unassigns an npc', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'patrol',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    expect(engine.unassign('npc-1')).toBe(true);
    expect(engine.getAssignment('npc-1')).toBeUndefined();
  });
});

describe('NpcRoutineEngine — interrupt / resume', () => {
  it('interrupts a running assignment', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'shift',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    expect(engine.interrupt('npc-1')).toBe(true);
    expect(engine.getAssignment('npc-1')?.status).toBe('interrupted');
  });

  it('cannot interrupt already interrupted npc', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'shift',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    engine.interrupt('npc-1');
    expect(engine.interrupt('npc-1')).toBe(false);
  });

  it('resumes an interrupted assignment', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'shift',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    engine.interrupt('npc-1');
    expect(engine.resume('npc-1')).toBe(true);
    expect(engine.getAssignment('npc-1')?.status).toBe('running');
  });

  it('cannot resume a running assignment', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'shift',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    expect(engine.resume('npc-1')).toBe(false);
  });
});

describe('NpcRoutineEngine — tick', () => {
  it('advances npc to correct step based on elapsed time', () => {
    let callCount = 0;
    let id = 0;
    const deps: NpcRoutineDeps = {
      clock: {
        nowMicroseconds: () => {
          callCount++;
          return callCount <= 1 ? 0 : 5 * HOUR;
        },
      },
      idGenerator: { next: () => 'id-' + String(id++) },
    };
    const engine = createNpcRoutineEngine(deps);
    const routine = engine.createRoutine({
      name: 'guard',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    const result = engine.tick('npc-1');
    expect(result).toBeDefined();
    expect(result?.currentActivity).toBe('patrol');
    expect(result?.currentStepIndex).toBe(1);
  });

  it('returns undefined for interrupted npc', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const routine = engine.createRoutine({
      name: 'guard',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', routine.routineId);
    engine.interrupt('npc-1');
    expect(engine.tick('npc-1')).toBeUndefined();
  });

  it('returns undefined for unknown npc', () => {
    const engine = createNpcRoutineEngine(createDeps());
    expect(engine.tick('ghost')).toBeUndefined();
  });
});

describe('NpcRoutineEngine — getStats', () => {
  it('tracks routine and assignment counts', () => {
    const engine = createNpcRoutineEngine(createDeps());
    const r1 = engine.createRoutine({
      name: 'patrol',
      steps: sampleSteps(),
      cycleDurationMicro: DAY,
    });
    engine.createRoutine({
      name: 'rest',
      steps: [{ startOffsetMicro: 0, durationMicro: DAY, activity: 'rest', location: 'home' }],
      cycleDurationMicro: DAY,
    });
    engine.assign('npc-1', r1.routineId);
    engine.assign('npc-2', r1.routineId);
    engine.interrupt('npc-2');

    const stats = engine.getStats();
    expect(stats.totalRoutines).toBe(2);
    expect(stats.activeAssignments).toBe(1);
    expect(stats.interruptedAssignments).toBe(1);
  });
});
