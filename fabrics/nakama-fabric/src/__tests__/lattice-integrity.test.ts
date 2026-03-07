import { describe, it, expect } from 'vitest';
import { createLatticeIntegrityService } from '../lattice-integrity.js';
import type { WorldPhysicalProperties } from '../stellar-standard.js';

function earthlike(): WorldPhysicalProperties {
  return {
    stellarClass: 'G',
    orbitalZone: 'habitable',
    latticeNodeDensity: 7,
    worldMass: 100,
    latticeIntegrity: 100,
  };
}

describe('LatticeIntegrityService registration', () => {
  it('registers a world with initial properties', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    expect(service.isRegistered('terra')).toBe(true);
    expect(service.getIntegrity('terra')).toBe(100);
  });

  it('returns full properties after registration', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    const props = service.getProperties('terra');
    expect(props.stellarClass).toBe('G');
    expect(props.orbitalZone).toBe('habitable');
    expect(props.latticeIntegrity).toBe(100);
  });

  it('re-registers with updated integrity', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    service.registerWorld('terra', { ...earthlike(), latticeIntegrity: 80 });
    expect(service.getIntegrity('terra')).toBe(80);
  });

  it('throws on accessing unregistered world', () => {
    const service = createLatticeIntegrityService();
    expect(() => service.getIntegrity('nope')).toThrow('not registered');
  });

  it('lists registered worlds', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('alpha', earthlike());
    service.registerWorld('beta', { ...earthlike(), stellarClass: 'K' });
    expect(service.listWorlds()).toHaveLength(2);
  });
});

describe('LatticeIntegrityService degradation', () => {
  it('degrades integrity by specified amount', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    const result = service.degrade('terra', 30, 'ascendancy-attack');
    expect(result.previousIntegrity).toBe(100);
    expect(result.newIntegrity).toBe(70);
    expect(result.reason).toBe('ascendancy-attack');
  });

  it('clamps degradation to zero floor', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', { ...earthlike(), latticeIntegrity: 10 });
    const result = service.degrade('terra', 50, 'catastrophic');
    expect(result.newIntegrity).toBe(0);
  });

  it('reports economic impact of degradation', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    const result = service.degrade('terra', 50, 'attack');
    expect(result.newAnnualIssuance).toBeLessThan(result.previousAnnualIssuance);
  });

  it('rejects negative degradation amount', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    expect(() => service.degrade('terra', -10, 'invalid')).toThrow('out of range');
  });
});

describe('LatticeIntegrityService restoration', () => {
  it('restores integrity by specified amount', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', { ...earthlike(), latticeIntegrity: 50 });
    const result = service.restore('terra', 20, 'repair');
    expect(result.previousIntegrity).toBe(50);
    expect(result.newIntegrity).toBe(70);
  });

  it('clamps restoration to 100 ceiling', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', { ...earthlike(), latticeIntegrity: 90 });
    const result = service.restore('terra', 50, 'over-repair');
    expect(result.newIntegrity).toBe(100);
  });

  it('reports economic impact of restoration', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', { ...earthlike(), latticeIntegrity: 50 });
    const result = service.restore('terra', 30, 'repair');
    expect(result.newAnnualIssuance).toBeGreaterThan(result.previousAnnualIssuance);
  });
});

describe('LatticeIntegrityService setIntegrity', () => {
  it('sets integrity to exact value', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    const result = service.setIntegrity('terra', 42, 'admin-override');
    expect(result.newIntegrity).toBe(42);
  });

  it('rejects value above 100', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    expect(() => service.setIntegrity('terra', 150, 'invalid')).toThrow('out of range');
  });

  it('rejects negative value', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('terra', earthlike());
    expect(() => service.setIntegrity('terra', -5, 'invalid')).toThrow('out of range');
  });
});
