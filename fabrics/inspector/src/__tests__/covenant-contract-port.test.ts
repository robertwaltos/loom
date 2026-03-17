import { describe, it, expect } from 'vitest';
import {
  createMockCovenantContractPort,
  covenantStatusFromCode,
  covenantCodeFromStatus,
  applyChainState,
  type CovenantContractState,
} from '../covenant-contract-port.js';

describe('covenantStatusFromCode', () => {
  it('maps 0 → DORMANT', () => expect(covenantStatusFromCode(0)).toBe('DORMANT'));
  it('maps 6 → PRESERVED', () => expect(covenantStatusFromCode(6)).toBe('PRESERVED'));
  it('throws on unknown code', () => expect(() => covenantStatusFromCode(99)).toThrow());
});

describe('covenantCodeFromStatus', () => {
  it('maps DORMANT → 0', () => expect(covenantCodeFromStatus('DORMANT')).toBe(0));
  it('maps PRESERVED → 6', () => expect(covenantCodeFromStatus('PRESERVED')).toBe(6));
  it('maps COUNTDOWN → 3', () => expect(covenantCodeFromStatus('COUNTDOWN')).toBe(3));
  it('throws on unknown status', () =>
    expect(() => covenantCodeFromStatus('UNKNOWN' as never)).toThrow());
});

describe('applyChainState', () => {
  const base: CovenantContractState = {
    statusCode: 0,
    status: 'DORMANT',
    lastTransitionAt: 1_700_000_000n,
    communityGovernance: '0x0000000000000000000000000000000000000000',
    sourceEscrowUrl: '',
    archiveUrl: '',
    evidence: '',
  };

  it('sets status and lastUpdatedAt', () => {
    const result = applyChainState(base);
    expect(result.status).toBe('DORMANT');
    expect(typeof result.lastUpdatedAt).toBe('string');
  });

  it('includes sourceCodeEscrowUrl when set', () => {
    const state = { ...base, sourceEscrowUrl: 'ipfs://QmTest', status: 'SOURCE_RELEASED' as const };
    const result = applyChainState(state) as Record<string, unknown>;
    expect(result['sourceCodeEscrowUrl']).toBe('ipfs://QmTest');
  });

  it('includes communityGovernanceAddress when not zero address', () => {
    const addr = '0x1234567890123456789012345678901234567890';
    const state = { ...base, communityGovernance: addr };
    const result = applyChainState(state) as Record<string, unknown>;
    expect(result['communityGovernanceAddress']).toBe(addr);
  });

  it('omits communityGovernanceAddress for zero address', () => {
    const result = applyChainState(base) as Record<string, unknown>;
    expect(result['communityGovernanceAddress']).toBeUndefined();
  });
});

describe('createMockCovenantContractPort', () => {
  it('starts in DORMANT state', async () => {
    const port = createMockCovenantContractPort();
    const state = await port.readState();
    expect(state.status).toBe('DORMANT');
    expect(state.statusCode).toBe(0);
  });

  it('advances through full state machine', async () => {
    const port = createMockCovenantContractPort();

    await port.beginMonitoring('early warning triggered');
    expect((await port.readState()).status).toBe('MONITORING');

    await port.activate('Tier 4 crisis confirmed');
    const activated = await port.readState();
    expect(activated.status).toBe('ACTIVATED');
    expect(activated.activatedAt).toBeDefined();

    await port.startCountdown('30-day window opens');
    const cd = await port.readState();
    expect(cd.status).toBe('COUNTDOWN');
    expect(cd.countdownEndsAt).toBeDefined();

    await port.releaseSourceCode('ipfs://QmSourceCode', 'code deposited');
    const released = await port.readState();
    expect(released.status).toBe('SOURCE_RELEASED');
    expect(released.sourceEscrowUrl).toBe('ipfs://QmSourceCode');

    const dao = '0xDa00000000000000000000000000000000000001';
    await port.handToCommunity(dao, 'DAO vote passed');
    const handed = await port.readState();
    expect(handed.status).toBe('COMMUNITY_HANDED');
    expect(handed.communityGovernance).toBe(dao);

    await port.archiveAndPreserve('ipfs://QmArchive', 'world preserved');
    const preserved = await port.readState();
    expect(preserved.status).toBe('PRESERVED');
    expect(preserved.archiveUrl).toBe('ipfs://QmArchive');
  });

  it('returns a tx hash on each call', async () => {
    const port = createMockCovenantContractPort();
    const tx = await port.beginMonitoring('test');
    expect(tx.hash).toMatch(/^0x[a-f]{64}$/);
    expect(tx.status).toBe(1);
  });

  it('throws when failWith is set', async () => {
    const err = new Error('RPC error');
    const port = createMockCovenantContractPort({ failWith: err });
    await expect(port.beginMonitoring('test')).rejects.toThrow('RPC error');
  });

  it('getStoredState reflects latest write', async () => {
    const port = createMockCovenantContractPort();
    await port.beginMonitoring('e1');
    await port.activate('e2');
    expect(port.getStoredState().status).toBe('ACTIVATED');
  });
});
