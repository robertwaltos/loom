import { describe, expect, it } from 'vitest';
import { createGenesisVault } from '../genesis-vault.js';
import { kalonToMicro } from '../kalon-constants.js';
import { createKalonLedger } from '../kalon-ledger.js';
import { createLatticeIntegrityService } from '../lattice-integrity.js';
import { createWorldIssuanceService } from '../world-issuance.js';
import type { WorldPhysicalProperties } from '../stellar-standard.js';

describe('world-issuance simulation', () => {
  const clock = { nowMicroseconds: () => 1_000_000 };

  const earthlike = (): WorldPhysicalProperties => ({
    stellarClass: 'G',
    orbitalZone: 'habitable',
    latticeNodeDensity: 7,
    worldMass: 100,
    latticeIntegrity: 100,
  });

  const setup = () => {
    const ledger = createKalonLedger({ clock });
    const integrityService = createLatticeIntegrityService();
    const vault = createGenesisVault(2_000_000n);
    const service = createWorldIssuanceService({ ledger, integrityService, vault, clock });
    return { ledger, integrityService, vault, service };
  };

  it('simulates two-world annual minting with distribution and aggregate summary', () => {
    const { service, ledger } = setup();

    service.registerWorld('earth', earthlike());
    service.registerWorld('ash', { ...earthlike(), stellarClass: 'M', orbitalZone: 'inner', latticeNodeDensity: 2 });

    const summary = service.processAllIssuance();
    expect(summary.totalWorlds).toBe(2);
    expect(summary.totalIssuance).toBeGreaterThan(0n);

    const earthBalance = ledger.getBalance('treasury:earth');
    const ashBalance = ledger.getBalance('treasury:ash');
    expect(earthBalance > ashBalance).toBe(true);
  });

  it('simulates productivity and lattice degradation impact in sequential years', () => {
    const { service, integrityService } = setup();

    service.registerWorld('earth', earthlike());
    const base = service.previewIssuance('earth');

    service.setProductivity('earth', 120);
    const productive = service.previewIssuance('earth');
    expect(productive).toBe((base * 120n) / 100n);

    integrityService.degrade('earth', 50, 'war pressure');
    const degraded = service.previewIssuance('earth');
    expect(degraded < productive).toBe(true);
  });

  it('simulates vault replenishment consistency with adjusted annual issuance', () => {
    const { service, vault } = setup();
    service.registerWorld('earth', earthlike());

    const before = vault.balance();
    const result = service.processWorldIssuance('earth');
    const expectedVaultIncrease = result.adjustedIssuance / 100n;

    expect(vault.balance()).toBe(before + expectedVaultIncrease);
    const totalMicro = kalonToMicro(result.adjustedIssuance);
    expect(result.treasuryAmount + result.commonsAmount + result.vaultAmount).toBe(totalMicro);
  });
});
