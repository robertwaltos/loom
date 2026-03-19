import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderTauntTemplate,
  buildDeterministicTaunt,
  buildDiplomaticMessage,
  buildLatticeAnomalyMessage,
  TAUNT_TEMPLATES,
  PROPAGANDA_TEMPLATES,
  DIPLOMATIC_TEMPLATES,
  LATTICE_ANOMALY_TEMPLATES,
} from '../ascendancy-narrative-layer.js';
import type { AscendancyCommunication } from '../ascendancy-narrative-layer.js';

describe('template arrays', () => {
  it('should have 5 taunt templates', () => {
    expect(TAUNT_TEMPLATES.length).toBe(5);
  });

  it('should have 4 propaganda templates', () => {
    expect(PROPAGANDA_TEMPLATES.length).toBe(4);
  });

  it('should have 3 diplomatic templates', () => {
    expect(DIPLOMATIC_TEMPLATES.length).toBe(3);
  });

  it('should have 3 lattice anomaly templates', () => {
    expect(LATTICE_ANOMALY_TEMPLATES.length).toBe(3);
  });
});

describe('renderTauntTemplate', () => {
  it('should substitute placeholders', () => {
    const result = renderTauntTemplate(
      'Hello {name}, welcome to {place}.',
      { name: 'Dynasty', place: 'World-7' },
      false,
    );
    expect(result).toBe('Hello Dynasty, welcome to World-7.');
  });

  it('should append glitch text when includeGlitch is true', () => {
    const result = renderTauntTemplate(
      'Test message.',
      {},
      true,
    );
    expect(result).toContain('We appreciate your continued participation.');
  });

  it('should not append glitch text when includeGlitch is false', () => {
    const result = renderTauntTemplate(
      'Test message.',
      {},
      false,
    );
    expect(result).not.toContain('We appreciate your continued participation.');
  });

  it('should handle empty substitutions', () => {
    const result = renderTauntTemplate('No subs here.', {}, false);
    expect(result).toBe('No subs here.');
  });

  it('should leave unmatched placeholders as-is', () => {
    const result = renderTauntTemplate(
      '{unknown} placeholder.',
      {},
      false,
    );
    expect(result).toBe('{unknown} placeholder.');
  });
});

describe('buildDeterministicTaunt', () => {
  const baseDate = new Date('2025-06-15T12:00:00Z');

  it('should produce a TAUNT_POST_VICTORY communication', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c1',
      dynastyId: 'd1',
      worldId: 'w1',
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.type).toBe('TAUNT_POST_VICTORY');
  });

  it('should set targetDynastyId and targetWorldId', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c2',
      dynastyId: 'd-abc',
      worldId: 'w-xyz',
      templateIndex: 1,
      issuedAt: baseDate,
    });
    expect(comm.targetDynastyId).toBe('d-abc');
    expect(comm.targetWorldId).toBe('w-xyz');
  });

  it('should include glitch when templateIndex % 7 === 0', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c3',
      dynastyId: 'd1',
      worldId: 'w1',
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.glitchPresent).toBe(true);
    expect(comm.bodyText).toContain('We appreciate your continued participation.');
  });

  it('should not include glitch when templateIndex % 7 !== 0', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c4',
      dynastyId: 'd1',
      worldId: 'w1',
      templateIndex: 1,
      issuedAt: baseDate,
    });
    expect(comm.glitchPresent).toBe(false);
  });

  it('should wrap template index around array length', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c5',
      dynastyId: 'd1',
      worldId: 'w1',
      templateIndex: 5,
      issuedAt: baseDate,
    });
    expect(comm.bodyText.length).toBeGreaterThan(0);
  });

  it('should include chronicle entry ID when provided', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c6',
      dynastyId: 'd1',
      worldId: 'w1',
      chronicleEntryId: 'chr-99',
      templateIndex: 2,
      issuedAt: baseDate,
    });
    expect(comm.referencedChronicleEntryId).toBe('chr-99');
  });

  it('should leave referencedChronicleEntryId undefined when not provided', () => {
    const comm = buildDeterministicTaunt({
      commId: 'c7',
      dynastyId: 'd1',
      worldId: 'w1',
      templateIndex: 2,
      issuedAt: baseDate,
    });
    expect(comm.referencedChronicleEntryId).toBeUndefined();
  });
});

describe('buildDiplomaticMessage', () => {
  const baseDate = new Date('2025-06-15T12:00:00Z');

  it('should produce an ASSEMBLY_DIPLOMATIC communication', () => {
    const comm = buildDiplomaticMessage({
      commId: 'dip-1',
      motionTitle: 'Resolution 42',
      position: 'OPPOSE',
      threatLevel: 50,
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.type).toBe('ASSEMBLY_DIPLOMATIC');
  });

  it('should include motion title in body', () => {
    const comm = buildDiplomaticMessage({
      commId: 'dip-2',
      motionTitle: 'The Trade Accord',
      position: 'DELAY',
      threatLevel: 30,
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.bodyText).toContain('The Trade Accord');
  });

  it('should add threat suffix when threatLevel > 70', () => {
    const comm = buildDiplomaticMessage({
      commId: 'dip-3',
      motionTitle: 'Arms Treaty',
      position: 'OPPOSE',
      threatLevel: 80,
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.bodyText).toContain('The consequences of proceeding are calculable.');
  });

  it('should not add threat suffix when threatLevel <= 70', () => {
    const comm = buildDiplomaticMessage({
      commId: 'dip-4',
      motionTitle: 'Arms Treaty',
      position: 'OPPOSE',
      threatLevel: 70,
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.bodyText).not.toContain('The consequences of proceeding are calculable.');
  });

  it('should always set glitchPresent to false', () => {
    const comm = buildDiplomaticMessage({
      commId: 'dip-5',
      motionTitle: 'Motion X',
      position: 'COUNTER_PROPOSE',
      threatLevel: 99,
      templateIndex: 2,
      issuedAt: baseDate,
    });
    expect(comm.glitchPresent).toBe(false);
  });
});

describe('buildLatticeAnomalyMessage', () => {
  const baseDate = new Date('2025-06-15T12:00:00Z');

  it('should produce a LATTICE_ANOMALY_MESSAGE', () => {
    const comm = buildLatticeAnomalyMessage({
      commId: 'lat-1',
      fragment: 'we remember',
      messageId: 'msg-001',
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.type).toBe('LATTICE_ANOMALY_MESSAGE');
  });

  it('should substitute fragment into template', () => {
    const comm = buildLatticeAnomalyMessage({
      commId: 'lat-2',
      fragment: 'the signal persists',
      messageId: 'msg-002',
      templateIndex: 0,
      issuedAt: baseDate,
    });
    expect(comm.bodyText).toContain('the signal persists');
  });

  it('should substitute message id into template', () => {
    const comm = buildLatticeAnomalyMessage({
      commId: 'lat-3',
      fragment: 'test',
      messageId: 'ABC-123',
      templateIndex: 1,
      issuedAt: baseDate,
    });
    expect(comm.bodyText).toContain('ABC-123');
  });

  it('should set glitchPresent to false for anomaly messages', () => {
    const comm = buildLatticeAnomalyMessage({
      commId: 'lat-4',
      fragment: 'test',
      messageId: 'msg-004',
      templateIndex: 2,
      issuedAt: baseDate,
    });
    expect(comm.glitchPresent).toBe(false);
  });

  it('should wrap template index around array length', () => {
    const comm = buildLatticeAnomalyMessage({
      commId: 'lat-5',
      fragment: 'wrap test',
      messageId: 'msg-005',
      templateIndex: 3,
      issuedAt: baseDate,
    });
    expect(comm.bodyText).toContain('wrap test');
  });
});
