import { describe, it, expect } from 'vitest';
import { createWorldIssuanceService } from '../world-issuance.js';
import { createKalonLedger } from '../kalon-ledger.js';
import { createLatticeIntegrityService } from '../lattice-integrity.js';
import { createGenesisVault } from '../genesis-vault.js';
import { kalonToMicro } from '../kalon-constants.js';
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

function createTestDeps() {
  const clock = { nowMicroseconds: () => 1_000_000 };
  const ledger = createKalonLedger({ clock });
  const integrityService = createLatticeIntegrityService();
  const vault = createGenesisVault(1_000_000n);
  return { ledger, integrityService, vault, clock };
}

describe('WorldIssuanceService registration', () => {
  it('registers a world and creates treasury account', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    expect(service.isRegistered('terra')).toBe(true);
    expect(deps.ledger.accountExists('treasury:terra')).toBe(true);
  });

  it('throws on duplicate registration', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    expect(() => {
      service.registerWorld('terra', earthlike());
    }).toThrow('already registered');
  });

  it('throws on unregistered world operations', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    expect(() => service.processWorldIssuance('nope')).toThrow('not registered');
  });

  it('lists registered worlds', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('alpha', earthlike());
    service.registerWorld('beta', { ...earthlike(), stellarClass: 'M' });
    expect(service.listRegisteredWorlds()).toHaveLength(2);
  });

  it('unregisters a world', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    service.unregisterWorld('terra');
    expect(service.isRegistered('terra')).toBe(false);
  });
});

describe('WorldIssuanceService issuance processing', () => {
  it('processes annual issuance for a single world', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());

    const result = service.processWorldIssuance('terra');
    // G-class, habitable, 7 nodes, 100% integrity
    // BASE × 3 × 3 × 7 × 100 / 100 = 63,000,000
    expect(result.baseIssuance).toBe(63_000_000n);
    expect(result.adjustedIssuance).toBe(63_000_000n);
    expect(result.productivityIndex).toBe(100);
    expect(result.latticeIntegrity).toBe(100);
  });

  it('mints treasury amount to world treasury account', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());

    const result = service.processWorldIssuance('terra');
    const balance = deps.ledger.getBalance('treasury:terra');
    expect(balance).toBe(result.treasuryAmount);
  });

  it('distributes 90/9/1 treasury/commons/vault', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());

    const result = service.processWorldIssuance('terra');
    const totalMicro = kalonToMicro(result.adjustedIssuance);
    const expectedTreasury = (totalMicro * 9000n) / 10000n;
    const expectedCommons = (totalMicro * 900n) / 10000n;
    const expectedVault = totalMicro - expectedTreasury - expectedCommons;

    expect(result.treasuryAmount).toBe(expectedTreasury);
    expect(result.commonsAmount).toBe(expectedCommons);
    expect(result.vaultAmount).toBe(expectedVault);
  });

  it('applies productivity adjustment', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    service.setProductivity('terra', 120);

    const result = service.processWorldIssuance('terra');
    // 63M × 120 / 100 = 75,600,000
    expect(result.adjustedIssuance).toBe(75_600_000n);
    expect(result.productivityIndex).toBe(120);
  });

  it('reflects lattice integrity degradation', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    deps.integrityService.degrade('terra', 50, 'ascendancy');

    const result = service.processWorldIssuance('terra');
    // 63M at 100%, should be ~31.5M at 50%
    expect(result.baseIssuance).toBe(31_500_000n);
    expect(result.latticeIntegrity).toBe(50);
  });
});

describe('WorldIssuanceService batch processing', () => {
  it('processes all registered worlds', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('alpha', earthlike());
    service.registerWorld('beta', { ...earthlike(), stellarClass: 'M', orbitalZone: 'inner' });

    const summary = service.processAllIssuance();
    expect(summary.totalWorlds).toBe(2);
    expect(summary.worldResults).toHaveLength(2);
    expect(summary.totalIssuance).toBeGreaterThan(0n);
  });

  it('returns empty summary when no worlds registered', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    const summary = service.processAllIssuance();
    expect(summary.totalWorlds).toBe(0);
    expect(summary.totalIssuance).toBe(0n);
  });
});

describe('WorldIssuanceService preview', () => {
  it('previews issuance without minting', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());

    const preview = service.previewIssuance('terra');
    expect(preview).toBe(63_000_000n);
    expect(deps.ledger.getBalance('treasury:terra')).toBe(0n);
  });

  it('preview reflects productivity changes', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    service.setProductivity('terra', 80);

    const preview = service.previewIssuance('terra');
    // 63M × 80 / 100 = 50,400,000
    expect(preview).toBe(50_400_000n);
  });
});

describe('WorldIssuanceService productivity', () => {
  it('defaults to 100 (neutral)', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    expect(service.getProductivity('terra')).toBe(100);
  });

  it('updates productivity index', () => {
    const deps = createTestDeps();
    const service = createWorldIssuanceService(deps);
    service.registerWorld('terra', earthlike());
    service.setProductivity('terra', 115);
    expect(service.getProductivity('terra')).toBe(115);
  });
});
