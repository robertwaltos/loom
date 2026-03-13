/**
 * ui-state-engine.test.ts — Unit tests for UiStateEngine.
 *
 * Thread: silk/loom-core/ui-state-engine
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import { createUiStateEngine } from '../ui-state-engine.js';
import type {
  UiStateEngine,
  UiStateEngineDeps,
  PanelId,
  ContextMenuItem,
} from '../ui-state-engine.js';

// ── Helpers ────────────────────────────────────────────────────────

function makeDeps(startUs = 0): UiStateEngineDeps & { advance: (us: number) => void } {
  let now = startUs;
  let idSeq = 0;
  return {
    advance: (us: number) => { now += us; },
    clock: { nowMicroseconds: () => now },
    idGenerator: { generate: () => `ui-${String(++idSeq)}` },
    logger: {
      info: () => undefined,
      warn: () => undefined,
    },
  };
}

const MENU_ITEMS: ReadonlyArray<ContextMenuItem> = [
  { itemId: 'inspect', label: 'Inspect', icon: 'eye', enabled: true, shortcut: 'I' },
  { itemId: 'trade', label: 'Trade', icon: 'coin', enabled: true, shortcut: 'T' },
];

function makeEngine(config?: Parameters<typeof createUiStateEngine>[2]): {
  engine: UiStateEngine;
  deps: ReturnType<typeof makeDeps>;
} {
  const deps = makeDeps();
  const engine = createUiStateEngine(deps, 'player-1', config);
  return { engine, deps };
}

// ── Initial State ───────────────────────────────────────────────

describe('initial state', () => {
  it('snapshot has correct playerId', () => {
    const { engine } = makeEngine();
    expect(engine.getSnapshot().hud.playerId).toBe('player-1');
  });

  it('hud is visible by default', () => {
    const { engine } = makeEngine();
    expect(engine.getSnapshot().hud.visible).toBe(true);
  });

  it('no panels are open', () => {
    const { engine } = makeEngine();
    expect(engine.getSnapshot().openPanels).toHaveLength(0);
  });

  it('no notifications exist', () => {
    const { engine } = makeEngine();
    expect(engine.getSnapshot().notifications).toHaveLength(0);
  });
});

// ── HUD ─────────────────────────────────────────────────────────

describe('updateHud', () => {
  it('updates health fields', () => {
    const { engine } = makeEngine();
    engine.updateHud({ healthCurrent: 75, healthMax: 100 });
    const snap = engine.getSnapshot();
    expect(snap.hud.healthCurrent).toBe(75);
    expect(snap.hud.healthMax).toBe(100);
  });

  it('updates world name', () => {
    const { engine } = makeEngine();
    engine.updateHud({ worldName: 'Grammar Bridge' });
    expect(engine.getSnapshot().hud.worldName).toBe('Grammar Bridge');
  });

  it('preserves unchanged fields', () => {
    const { engine } = makeEngine();
    engine.updateHud({ worldName: 'Rhyme Docks' });
    expect(engine.getSnapshot().hud.playerId).toBe('player-1');
  });
});

describe('setHudVisible', () => {
  it('hides and shows hud', () => {
    const { engine } = makeEngine();
    engine.setHudVisible(false);
    expect(engine.getSnapshot().hud.visible).toBe(false);
    engine.setHudVisible(true);
    expect(engine.getSnapshot().hud.visible).toBe(true);
  });
});

// ── Panels ──────────────────────────────────────────────────────

describe('openPanel / closePanel / isOpen', () => {
  const PANEL: PanelId = 'inventory';

  it('opens a closed panel', () => {
    const { engine } = makeEngine();
    engine.openPanel(PANEL);
    expect(engine.isOpen(PANEL)).toBe(true);
    expect(engine.getSnapshot().openPanels).toContain(PANEL);
  });

  it('closes an open panel', () => {
    const { engine } = makeEngine();
    engine.openPanel(PANEL);
    engine.closePanel(PANEL);
    expect(engine.isOpen(PANEL)).toBe(false);
  });

  it('opens multiple distinct panels simultaneously', () => {
    const { engine } = makeEngine();
    engine.openPanel('inventory');
    engine.openPanel('map');
    engine.openPanel('chat');
    expect(engine.getSnapshot().openPanels).toHaveLength(3);
  });
});

describe('togglePanel', () => {
  it('opens closed panel and closes open panel', () => {
    const { engine } = makeEngine();
    engine.togglePanel('trade');
    expect(engine.isOpen('trade')).toBe(true);
    engine.togglePanel('trade');
    expect(engine.isOpen('trade')).toBe(false);
  });
});

// ── Notifications ───────────────────────────────────────────────

describe('showNotification', () => {
  it('creates notification with correct fields', () => {
    const { engine } = makeEngine();
    const n = engine.showNotification('Hello', 'World fading', 'high');
    expect(n.title).toBe('Hello');
    expect(n.body).toBe('World fading');
    expect(n.priority).toBe('high');
    expect(n.dismissed).toBe(false);
    expect(n.notificationId).toBeTruthy();
  });

  it('notification appears in snapshot', () => {
    const { engine } = makeEngine();
    engine.showNotification('Alert', 'Quest ready', 'medium');
    expect(engine.getSnapshot().notifications).toHaveLength(1);
  });

  it('respects custom ttlMs', () => {
    const { engine } = makeEngine();
    const n = engine.showNotification('Custom TTL', 'test', 'low', { ttlMs: 5_000 });
    expect(n.expiresAt).toBeGreaterThan(n.createdAt);
  });

  it('enforces maxNotifications cap', () => {
    const { engine } = makeEngine({ maxNotifications: 3 });
    for (let i = 0; i < 5; i++) {
      engine.showNotification(`N${String(i)}`, 'body', 'low');
    }
    expect(engine.getSnapshot().notifications).toHaveLength(3);
  });
});

describe('dismissNotification', () => {
  it('marks notification as dismissed', () => {
    const { engine } = makeEngine();
    const n = engine.showNotification('Msg', 'body', 'low');
    engine.dismissNotification(n.notificationId);
    const snap = engine.getSnapshot();
    const found = snap.notifications.find((x) => x.notificationId === n.notificationId);
    expect(found?.dismissed).toBe(true);
  });
});

describe('clearNotifications', () => {
  it('removes all notifications', () => {
    const { engine } = makeEngine();
    engine.showNotification('A', 'a', 'low');
    engine.showNotification('B', 'b', 'high');
    engine.clearNotifications();
    expect(engine.getSnapshot().notifications).toHaveLength(0);
  });
});

// ── Context Menu ────────────────────────────────────────────────

describe('showContextMenu / closeContextMenu', () => {
  it('opens context menu with correct fields', () => {
    const { engine } = makeEngine();
    const menu = engine.showContextMenu('entity-1', { x: 100, y: 200 }, MENU_ITEMS);
    expect(menu.targetEntityId).toBe('entity-1');
    expect(menu.position).toEqual({ x: 100, y: 200 });
    expect(menu.items).toHaveLength(2);
    expect(engine.getSnapshot().activeContextMenu).not.toBeNull();
  });

  it('limits items by maxContextMenuItems', () => {
    const { engine } = makeEngine({ maxContextMenuItems: 1 });
    const menu = engine.showContextMenu('e1', { x: 0, y: 0 }, MENU_ITEMS);
    expect(menu.items).toHaveLength(1);
  });

  it('closes context menu', () => {
    const { engine } = makeEngine();
    engine.showContextMenu('e1', { x: 0, y: 0 }, MENU_ITEMS);
    engine.closeContextMenu();
    expect(engine.getSnapshot().activeContextMenu).toBeNull();
  });
});

// ── Modals ──────────────────────────────────────────────────────

describe('showModal / closeModal', () => {
  it('creates modal with generated dialogId', () => {
    const { engine } = makeEngine();
    const modal = engine.showModal({
      title: 'Confirm',
      body: 'Are you sure?',
      dialogType: 'confirm',
      buttons: [
        { buttonId: 'yes', label: 'Yes', style: 'primary' },
        { buttonId: 'no', label: 'No', style: 'secondary' },
      ],
      inputPlaceholder: null,
    });
    expect(modal.dialogId).toBeTruthy();
    expect(modal.title).toBe('Confirm');
    expect(engine.getSnapshot().activeModal).not.toBeNull();
  });

  it('closes modal', () => {
    const { engine } = makeEngine();
    engine.showModal({
      title: 'Test',
      body: '',
      dialogType: 'info',
      buttons: [],
      inputPlaceholder: null,
    });
    engine.closeModal();
    expect(engine.getSnapshot().activeModal).toBeNull();
  });
});

// ── Input Scheme ────────────────────────────────────────────────

describe('setInputScheme', () => {
  it('changes input scheme', () => {
    const { engine } = makeEngine();
    engine.setInputScheme('gamepad');
    expect(engine.getSnapshot().inputScheme).toBe('gamepad');
  });
});

// ── Quest Tracker ───────────────────────────────────────────────

describe('updateQuestTracker', () => {
  it('updates active quests in HUD', () => {
    const { engine } = makeEngine();
    engine.updateQuestTracker([
      { questId: 'q1', title: 'Find the Flame', objectiveText: 'Enter the caves', progress: 0, progressMax: 1, pinned: true },
    ]);
    expect(engine.getSnapshot().hud.activeQuests).toHaveLength(1);
    expect(engine.getSnapshot().hud.activeQuests[0]?.questId).toBe('q1');
  });
});

// ── tick (TTL purge) ────────────────────────────────────────────

describe('tick', () => {
  it('purges expired notifications', () => {
    const { engine, deps } = makeEngine({ notificationDefaultTtlMs: 1_000 });
    engine.showNotification('Expires', 'soon', 'low');
    expect(engine.getSnapshot().notifications).toHaveLength(1);
    deps.advance(2_000_000); // 2 seconds in microseconds
    engine.tick();
    expect(engine.getSnapshot().notifications).toHaveLength(0);
  });

  it('retains notifications before expiry', () => {
    const { engine, deps } = makeEngine({ notificationDefaultTtlMs: 10_000 });
    engine.showNotification('Stays', 'here', 'medium');
    deps.advance(1_000_000); // 1 second
    engine.tick();
    expect(engine.getSnapshot().notifications).toHaveLength(1);
  });
});

// ── getStats ────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks notification and modal counts', () => {
    const { engine } = makeEngine();
    engine.showNotification('A', 'b', 'low');
    engine.showNotification('C', 'd', 'high');
    engine.showModal({ title: 'M', body: '', dialogType: 'info', buttons: [], inputPlaceholder: null });
    const stats = engine.getStats();
    expect(stats.totalNotificationsShown).toBe(2);
    expect(stats.totalModalsShown).toBe(1);
  });

  it('counts panel toggles', () => {
    const { engine } = makeEngine();
    engine.openPanel('map');
    engine.closePanel('map');
    engine.togglePanel('chat');
    expect(engine.getStats().panelToggles).toBe(3);
  });
});
