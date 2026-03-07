import { describe, it, expect } from 'vitest';
import { createDynastyRegistry } from '../dynasty.js';

function createTestRegistry() {
  return createDynastyRegistry({ clock: { nowMicroseconds: () => 1_000_000 } });
}

describe('DynastyRegistry founding', () => {
  it('founds a new dynasty', () => {
    const registry = createTestRegistry();
    const dynasty = registry.found({
      dynastyId: 'house-atreides',
      name: 'House Atreides',
      homeWorldId: 'caladan',
    });
    expect(dynasty.dynastyId).toBe('house-atreides');
    expect(dynasty.name).toBe('House Atreides');
    expect(dynasty.kalonAccountId).toBe('dynasty:house-atreides');
    expect(dynasty.status).toBe('active');
    expect(dynasty.subscriptionTier).toBe('free');
  });

  it('founds dynasty with subscription tier', () => {
    const registry = createTestRegistry();
    const dynasty = registry.found({
      dynastyId: 'house-harkonnen',
      name: 'House Harkonnen',
      homeWorldId: 'giedi-prime',
      subscriptionTier: 'herald',
    });
    expect(dynasty.subscriptionTier).toBe('herald');
  });

  it('throws on duplicate dynasty', () => {
    const registry = createTestRegistry();
    registry.found({
      dynastyId: 'house-atreides',
      name: 'House Atreides',
      homeWorldId: 'caladan',
    });
    expect(() => {
      registry.found({
        dynastyId: 'house-atreides',
        name: 'House Atreides Clone',
        homeWorldId: 'caladan',
      });
    }).toThrow('already exists');
  });
});

describe('DynastyRegistry lookup', () => {
  it('retrieves dynasty by id', () => {
    const registry = createTestRegistry();
    registry.found({
      dynastyId: 'house-atreides',
      name: 'House Atreides',
      homeWorldId: 'caladan',
    });
    const dynasty = registry.get('house-atreides');
    expect(dynasty.name).toBe('House Atreides');
  });

  it('throws on missing dynasty', () => {
    const registry = createTestRegistry();
    expect(() => {
      registry.get('nope');
    }).toThrow('not found');
  });

  it('tryGet returns undefined for missing dynasty', () => {
    const registry = createTestRegistry();
    expect(registry.tryGet('nope')).toBeUndefined();
  });

  it('checks existence', () => {
    const registry = createTestRegistry();
    expect(registry.exists('house-atreides')).toBe(false);
    registry.found({
      dynastyId: 'house-atreides',
      name: 'House Atreides',
      homeWorldId: 'caladan',
    });
    expect(registry.exists('house-atreides')).toBe(true);
  });

  it('finds dynasty by KALON account', () => {
    const registry = createTestRegistry();
    registry.found({
      dynastyId: 'house-atreides',
      name: 'House Atreides',
      homeWorldId: 'caladan',
    });
    const found = registry.findByKalonAccount('dynasty:house-atreides');
    expect(found?.dynastyId).toBe('house-atreides');
  });

  it('returns undefined for unknown KALON account', () => {
    const registry = createTestRegistry();
    expect(registry.findByKalonAccount('nope')).toBeUndefined();
  });
});

describe('DynastyRegistry queries', () => {
  it('finds dynasties by home world', () => {
    const registry = createTestRegistry();
    registry.found({ dynastyId: 'd1', name: 'D1', homeWorldId: 'caladan' });
    registry.found({ dynastyId: 'd2', name: 'D2', homeWorldId: 'caladan' });
    registry.found({ dynastyId: 'd3', name: 'D3', homeWorldId: 'arrakis' });
    expect(registry.findByHomeWorld('caladan')).toHaveLength(2);
    expect(registry.findByHomeWorld('arrakis')).toHaveLength(1);
  });

  it('lists dynasties by status', () => {
    const registry = createTestRegistry();
    registry.found({ dynastyId: 'd1', name: 'D1', homeWorldId: 'w1' });
    registry.found({ dynastyId: 'd2', name: 'D2', homeWorldId: 'w1' });
    registry.setStatus('d2', 'dormant');
    expect(registry.listByStatus('active')).toHaveLength(1);
    expect(registry.listByStatus('dormant')).toHaveLength(1);
  });

  it('counts total dynasties', () => {
    const registry = createTestRegistry();
    expect(registry.count()).toBe(0);
    registry.found({ dynastyId: 'd1', name: 'D1', homeWorldId: 'w1' });
    registry.found({ dynastyId: 'd2', name: 'D2', homeWorldId: 'w1' });
    expect(registry.count()).toBe(2);
  });
});

describe('DynastyRegistry mutations', () => {
  it('updates last active time', () => {
    let time = 1_000_000;
    const registry = createDynastyRegistry({
      clock: { nowMicroseconds: () => time },
    });
    registry.found({ dynastyId: 'd1', name: 'D1', homeWorldId: 'w1' });
    time = 2_000_000;
    registry.updateLastActive('d1');
    expect(registry.get('d1').lastActiveAt).toBe(2_000_000);
  });

  it('sets subscription tier', () => {
    const registry = createTestRegistry();
    registry.found({ dynastyId: 'd1', name: 'D1', homeWorldId: 'w1' });
    registry.setSubscriptionTier('d1', 'patron');
    expect(registry.get('d1').subscriptionTier).toBe('patron');
  });

  it('sets status', () => {
    const registry = createTestRegistry();
    registry.found({ dynastyId: 'd1', name: 'D1', homeWorldId: 'w1' });
    registry.setStatus('d1', 'completed');
    expect(registry.get('d1').status).toBe('completed');
  });
});
