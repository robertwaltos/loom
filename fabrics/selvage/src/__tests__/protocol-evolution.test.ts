import { describe, it, expect } from 'vitest';
import {
  createProtocolRegistry,
  parseVersion,
  formatVersion,
  compareVersions,
} from '../protocol-evolution.js';
import type { MessageSchema, ProtocolVersion } from '../protocol-evolution.js';

const v100: ProtocolVersion = { major: 1, minor: 0, patch: 0 };
const v110: ProtocolVersion = { major: 1, minor: 1, patch: 0 };
const v120: ProtocolVersion = { major: 1, minor: 2, patch: 0 };
const v200: ProtocolVersion = { major: 2, minor: 0, patch: 0 };

const SCHEMA_V1: MessageSchema = {
  type: 'trade',
  version: v100,
  requiredFields: ['senderId', 'receiverId', 'amountMicro'],
  optionalFields: ['memo'],
  deprecatedFields: [],
};

const SCHEMA_V11: MessageSchema = {
  type: 'trade',
  version: v110,
  requiredFields: ['senderId', 'receiverId', 'amountMicro', 'currencyType'],
  optionalFields: ['memo'],
  deprecatedFields: [],
};

const SCHEMA_V12: MessageSchema = {
  type: 'trade',
  version: v120,
  requiredFields: ['senderId', 'receiverId', 'amountMicro', 'currencyType'],
  optionalFields: ['memo', 'metadata'],
  deprecatedFields: ['senderId'],  // renamed to fromId in v1.2
};

describe('protocol-evolution', () => {
  describe('parseVersion', () => {
    it('parses standard semver string', () => {
      expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('parses version with v prefix', () => {
      expect(parseVersion('v2.0.0')).toEqual({ major: 2, minor: 0, patch: 0 });
    });

    it('throws on invalid format', () => {
      expect(() => parseVersion('not-a-version')).toThrow();
    });
  });

  describe('formatVersion', () => {
    it('formats to semver string', () => {
      expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for equal versions', () => {
      expect(compareVersions(v100, v100)).toBe(0);
    });

    it('returns negative when a < b (minor)', () => {
      expect(compareVersions(v100, v110)).toBeLessThan(0);
    });

    it('returns positive when a > b (major)', () => {
      expect(compareVersions(v200, v110)).toBeGreaterThan(0);
    });
  });

  describe('registerSchema / validate', () => {
    it('validates a well-formed message', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      const result = reg.validate('trade', v100, {
        senderId: 'alice',
        receiverId: 'bob',
        amountMicro: '5000',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for missing required fields', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      const result = reg.validate('trade', v100, { senderId: 'alice' });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('receiverId'))).toBe(true);
    });

    it('returns warning for deprecated fields', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V12);
      const result = reg.validate('trade', v120, {
        senderId: 'alice',
        receiverId: 'bob',
        amountMicro: '5000',
        currencyType: 'KALON',
      });
      expect(result.warnings.some((w) => w.includes('senderId'))).toBe(true);
    });

    it('returns error for unknown schema', () => {
      const reg = createProtocolRegistry();
      const result = reg.validate('trade', v100, {});
      expect(result.valid).toBe(false);
    });

    it('throws when registering same schema twice', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      expect(() => reg.registerSchema(SCHEMA_V1)).toThrow();
    });
  });

  describe('migrate', () => {
    it('returns same message when already at target version', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      const msg = { version: v100, senderId: 'alice', receiverId: 'bob', amountMicro: '100' };
      const result = reg.migrate('trade', msg, v100);
      expect(result).toBe(msg);
    });

    it('migrates via single-hop migration', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      reg.registerSchema(SCHEMA_V11);
      reg.registerMigration('trade', v100, v110, (msg) => ({
        ...(msg as object),
        version: v110,
        currencyType: 'KALON',
      }));
      const msg = { version: v100, senderId: 'alice', receiverId: 'bob', amountMicro: '100' };
      const result = reg.migrate('trade', msg, v110) as unknown as { currencyType: string };
      expect(result.currencyType).toBe('KALON');
    });

    it('migrates via multi-hop BFS path', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      reg.registerSchema(SCHEMA_V11);
      reg.registerSchema(SCHEMA_V12);
      reg.registerMigration('trade', v100, v110, (msg) => ({
        ...(msg as object),
        version: v110,
        currencyType: 'KALON',
      }));
      reg.registerMigration('trade', v110, v120, (msg) => ({
        ...(msg as object),
        version: v120,
        metadata: {},
      }));
      const msg = { version: v100, senderId: 'alice', receiverId: 'bob', amountMicro: '50' };
      const result = reg.migrate('trade', msg, v120) as unknown as { metadata: object; currencyType: string };
      expect(result.currencyType).toBe('KALON');
      expect(result.metadata).toBeDefined();
    });

    it('throws when no migration path exists', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      const msg = { version: v100, senderId: 'a', receiverId: 'b', amountMicro: '1' };
      expect(() => reg.migrate('trade', msg, v200)).toThrow();
    });

    it('throws when message has no version field', () => {
      const reg = createProtocolRegistry();
      expect(() => reg.migrate('trade', { foo: 'bar' }, v110)).toThrow();
    });
  });

  describe('isCompatible', () => {
    it('compatible when same major and client minor <= server minor', () => {
      expect(createProtocolRegistry().isCompatible(v100, v110)).toBe(true);
    });

    it('not compatible when major versions differ', () => {
      expect(createProtocolRegistry().isCompatible(v200, v100)).toBe(false);
    });

    it('not compatible when client minor > server minor', () => {
      expect(createProtocolRegistry().isCompatible(v120, v110)).toBe(false);
    });
  });

  describe('getLatestVersion / getSupportedVersions', () => {
    it('returns undefined for unknown message type', () => {
      const reg = createProtocolRegistry();
      expect(reg.getLatestVersion('unknown')).toBeUndefined();
    });

    it('returns the highest registered version', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V1);
      reg.registerSchema(SCHEMA_V12);
      reg.registerSchema(SCHEMA_V11);
      const latest = reg.getLatestVersion('trade');
      expect(latest).toEqual(v120);
    });

    it('returns sorted supported versions', () => {
      const reg = createProtocolRegistry();
      reg.registerSchema(SCHEMA_V12);
      reg.registerSchema(SCHEMA_V1);
      reg.registerSchema(SCHEMA_V11);
      const versions = reg.getSupportedVersions('trade');
      expect(versions[0]).toEqual(v100);
      expect(versions[versions.length - 1]).toEqual(v120);
    });

    it('returns empty array for unknown type in getSupportedVersions', () => {
      const reg = createProtocolRegistry();
      expect(reg.getSupportedVersions('unknown')).toHaveLength(0);
    });
  });
});
