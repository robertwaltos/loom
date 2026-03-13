import { describe, it, expect } from 'vitest';
import {
  validateTimeControlsUpdate,
  validateAddChildRequest,
  DASHBOARD_ROUTES,
  type TimeControlsUpdateRequest,
  type AddChildRequest,
} from '../universe/parent-dashboard/api.js';

// ─── validateTimeControlsUpdate ───────────────────────────────────

describe('validateTimeControlsUpdate — valid requests', () => {
  it('accepts all nulls with notificationsEnabled true', () => {
    const req: TimeControlsUpdateRequest = {
      maxDailyMinutes: null,
      bedtimeCutoff: null,
      notificationsEnabled: true,
    };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts all nulls with notificationsEnabled false', () => {
    const req: TimeControlsUpdateRequest = {
      maxDailyMinutes: null,
      bedtimeCutoff: null,
      notificationsEnabled: false,
    };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts maxDailyMinutes 15', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: 15, bedtimeCutoff: null, notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts maxDailyMinutes 30', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: 30, bedtimeCutoff: null, notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts maxDailyMinutes 45', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: 45, bedtimeCutoff: null, notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts maxDailyMinutes 60', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: 60, bedtimeCutoff: null, notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts valid bedtimeCutoff 21:00', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '21:00', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts valid bedtimeCutoff 09:30', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '09:30', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts valid bedtimeCutoff 00:00 (midnight)', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '00:00', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts valid bedtimeCutoff 23:59', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '23:59', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });

  it('accepts both maxDailyMinutes 60 and bedtimeCutoff 20:30', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: 60, bedtimeCutoff: '20:30', notificationsEnabled: false };
    expect(validateTimeControlsUpdate(req)).toBeNull();
  });
});

describe('validateTimeControlsUpdate — invalid maxDailyMinutes', () => {
  it('rejects an arbitrary non-allowed integer', () => {
    const req = { maxDailyMinutes: 25 as unknown as 15, bedtimeCutoff: null, notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req as TimeControlsUpdateRequest)).toBe(
      'maxDailyMinutes must be 15, 30, 45, 60, or null',
    );
  });

  it('rejects 0', () => {
    const req = { maxDailyMinutes: 0 as unknown as 15, bedtimeCutoff: null, notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req as TimeControlsUpdateRequest)).toContain('maxDailyMinutes');
  });

  it('rejects 120', () => {
    const req = { maxDailyMinutes: 120 as unknown as 60, bedtimeCutoff: null, notificationsEnabled: false };
    expect(validateTimeControlsUpdate(req as TimeControlsUpdateRequest)).toContain('maxDailyMinutes');
  });
});

describe('validateTimeControlsUpdate — invalid bedtimeCutoff', () => {
  it('rejects 25:00 (hour out of range)', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '25:00', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toContain('bedtimeCutoff');
  });

  it('rejects 21:61 (minutes out of range)', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '21:61', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toContain('bedtimeCutoff');
  });

  it('rejects free-text string', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: 'nine pm', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toContain('bedtimeCutoff');
  });

  it('rejects 12-hour format (9:00 PM)', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '9:00 PM', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toContain('bedtimeCutoff');
  });

  it('rejects missing leading zero (9:00)', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '9:00', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toContain('bedtimeCutoff');
  });

  it('rejects empty string', () => {
    const req: TimeControlsUpdateRequest = { maxDailyMinutes: null, bedtimeCutoff: '', notificationsEnabled: true };
    expect(validateTimeControlsUpdate(req)).toContain('bedtimeCutoff');
  });
});

// ─── validateAddChildRequest ───────────────────────────────────────

describe('validateAddChildRequest — valid requests', () => {
  it('accepts minimal valid request', () => {
    const req: AddChildRequest = { displayName: 'Starfire', ageTier: 1, avatarId: 'av-001' };
    expect(validateAddChildRequest(req)).toBeNull();
  });

  it('accepts age tier 2', () => {
    const req: AddChildRequest = { displayName: 'Moonpetal', ageTier: 2, avatarId: 'av-002' };
    expect(validateAddChildRequest(req)).toBeNull();
  });

  it('accepts age tier 3', () => {
    const req: AddChildRequest = { displayName: 'Blazewing', ageTier: 3, avatarId: 'av-003' };
    expect(validateAddChildRequest(req)).toBeNull();
  });

  it('accepts exactly 2-character display name', () => {
    const req: AddChildRequest = { displayName: 'Jo', ageTier: 1, avatarId: 'av-004' };
    expect(validateAddChildRequest(req)).toBeNull();
  });

  it('accepts exactly 20-character display name', () => {
    const req: AddChildRequest = { displayName: 'A'.repeat(20), ageTier: 2, avatarId: 'av-005' };
    expect(validateAddChildRequest(req)).toBeNull();
  });
});

describe('validateAddChildRequest — invalid requests', () => {
  it('rejects empty display name', () => {
    const req: AddChildRequest = { displayName: '', ageTier: 1, avatarId: 'av-001' };
    expect(validateAddChildRequest(req)).toContain('displayName');
  });

  it('rejects single-character display name', () => {
    const req: AddChildRequest = { displayName: 'A', ageTier: 1, avatarId: 'av-001' };
    expect(validateAddChildRequest(req)).toContain('displayName');
  });

  it('rejects display name over 20 characters', () => {
    const req: AddChildRequest = { displayName: 'A'.repeat(21), ageTier: 2, avatarId: 'av-001' };
    expect(validateAddChildRequest(req)).toContain('displayName');
  });

  it('rejects a forename + surname pattern (privacy guard)', () => {
    const req: AddChildRequest = { displayName: 'James Smith', ageTier: 3, avatarId: 'av-001' };
    expect(validateAddChildRequest(req)).toContain('nickname');
  });

  it('rejects invalid age tier', () => {
    const req = { displayName: 'Nebula', ageTier: 4 as unknown as 3, avatarId: 'av-001' };
    expect(validateAddChildRequest(req as AddChildRequest)).toContain('ageTier');
  });

  it('rejects age tier 0', () => {
    const req = { displayName: 'Nebula', ageTier: 0 as unknown as 1, avatarId: 'av-001' };
    expect(validateAddChildRequest(req as AddChildRequest)).toContain('ageTier');
  });
});

// ─── DASHBOARD_ROUTES ─────────────────────────────────────────────

describe('DASHBOARD_ROUTES manifest', () => {
  it('has all required route keys', () => {
    const keys = Object.keys(DASHBOARD_ROUTES);
    expect(keys).toContain('OVERVIEW');
    expect(keys).toContain('CHILD_DETAIL');
    expect(keys).toContain('CHILD_SESSIONS');
    expect(keys).toContain('CHILD_WORLDS_MAP');
    expect(keys).toContain('CHILD_REPORT');
    expect(keys).toContain('TIME_CONTROLS');
    expect(keys).toContain('ADD_CHILD');
    expect(keys).toContain('REMOVE_CHILD');
  });

  it('overview route references GET /api/dashboard', () => {
    expect(DASHBOARD_ROUTES.OVERVIEW).toContain('/api/dashboard');
    expect(DASHBOARD_ROUTES.OVERVIEW).toMatch(/^GET/);
  });

  it('time controls route uses PATCH', () => {
    expect(DASHBOARD_ROUTES.TIME_CONTROLS).toMatch(/^PATCH/);
  });

  it('add child route uses POST', () => {
    expect(DASHBOARD_ROUTES.ADD_CHILD).toMatch(/^POST/);
  });

  it('remove child route uses DELETE', () => {
    expect(DASHBOARD_ROUTES.REMOVE_CHILD).toMatch(/^DELETE/);
  });
});
