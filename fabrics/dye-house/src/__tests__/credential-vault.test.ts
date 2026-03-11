import { describe, it, expect } from 'vitest';
import { createCredentialVault } from '../credential-vault.js';
import type { CredentialVaultDeps } from '../credential-vault.js';

function makeDeps(): CredentialVaultDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'cred-' + String(++idCounter) },
  };
}

describe('CredentialVault — store and access', () => {
  it('stores a credential', () => {
    const vault = createCredentialVault(makeDeps());
    const cred = vault.store({ name: 'api-key', secret: 'sk-123' });
    expect(cred.credentialId).toBe('cred-1');
    expect(cred.name).toBe('api-key');
  });

  it('accesses a stored credential', () => {
    const vault = createCredentialVault(makeDeps());
    vault.store({ name: 'api-key', secret: 'sk-123' });
    const result = vault.access('api-key');
    expect(result?.secret).toBe('sk-123');
  });

  it('returns undefined for unknown name', () => {
    const vault = createCredentialVault(makeDeps());
    expect(vault.access('missing')).toBeUndefined();
  });

  it('checks existence', () => {
    const vault = createCredentialVault(makeDeps());
    vault.store({ name: 'api-key', secret: 'sk-123' });
    expect(vault.exists('api-key')).toBe(true);
    expect(vault.exists('missing')).toBe(false);
  });

  it('lists all credentials', () => {
    const vault = createCredentialVault(makeDeps());
    vault.store({ name: 'a', secret: 'sa' });
    vault.store({ name: 'b', secret: 'sb' });
    expect(vault.list()).toHaveLength(2);
  });
});

describe('CredentialVault — expiration', () => {
  it('blocks access to expired credential', () => {
    let time = 1_000_000;
    const deps: CredentialVaultDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'cred-1' },
    };
    const vault = createCredentialVault(deps);
    vault.store({ name: 'temp', secret: 'val', expiresAt: 5_000_000 });
    time = 10_000_000;
    expect(vault.access('temp')).toBeUndefined();
  });

  it('allows access to non-expired credential', () => {
    let time = 1_000_000;
    const deps: CredentialVaultDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'cred-1' },
    };
    const vault = createCredentialVault(deps);
    vault.store({ name: 'temp', secret: 'val', expiresAt: 50_000_000 });
    time = 2_000_000;
    expect(vault.access('temp')?.secret).toBe('val');
  });

  it('reports expired status', () => {
    let time = 1_000_000;
    const deps: CredentialVaultDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'cred-1' },
    };
    const vault = createCredentialVault(deps);
    vault.store({ name: 'temp', secret: 'val', expiresAt: 5_000_000 });
    time = 10_000_000;
    expect(vault.isExpired('temp')).toBe(true);
  });
});

describe('CredentialVault — rotate and revoke', () => {
  it('rotates a credential', () => {
    const vault = createCredentialVault(makeDeps());
    vault.store({ name: 'api-key', secret: 'old-secret' });
    expect(vault.rotate('api-key', 'new-secret')).toBe(true);
    expect(vault.access('api-key')?.secret).toBe('new-secret');
  });

  it('rotate returns false for unknown', () => {
    const vault = createCredentialVault(makeDeps());
    expect(vault.rotate('missing', 'x')).toBe(false);
  });

  it('revokes a credential', () => {
    const vault = createCredentialVault(makeDeps());
    vault.store({ name: 'api-key', secret: 'sk-123' });
    expect(vault.revoke('api-key')).toBe(true);
    expect(vault.exists('api-key')).toBe(false);
  });
});

describe('CredentialVault — stats', () => {
  it('starts with zero stats', () => {
    const vault = createCredentialVault(makeDeps());
    const stats = vault.getStats();
    expect(stats.totalCredentials).toBe(0);
    expect(stats.totalAccesses).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const vault = createCredentialVault(makeDeps());
    vault.store({ name: 'a', secret: 's1' });
    vault.store({ name: 'b', secret: 's2' });
    vault.access('a');
    vault.access('a');
    const stats = vault.getStats();
    expect(stats.totalCredentials).toBe(2);
    expect(stats.totalAccesses).toBe(2);
  });
});
