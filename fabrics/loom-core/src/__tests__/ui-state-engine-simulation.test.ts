import { describe, expect, it } from 'vitest';
import { createUiStateEngine } from '../ui-state-engine.js';

describe('ui-state-engine simulation', () => {
  it('simulates HUD updates, panel flow, ephemeral notifications, and modal/context interactions', () => {
    let now = 0;
    let id = 0;
    const ui = createUiStateEngine(
      {
        clock: { nowMicroseconds: () => now },
        idGenerator: { generate: () => 'ui-' + String(++id) },
        logger: { info: () => undefined, warn: () => undefined },
      },
      'player-1',
      { notificationDefaultTtlMs: 1_000, maxNotifications: 5 },
    );

    ui.updateHud({ worldName: 'Earth', healthCurrent: 82, healthMax: 100 });
    ui.openPanel('inventory');
    const note = ui.showNotification('Quest Updated', 'Return to the harbor', 'high');
    ui.showContextMenu('npc-1', { x: 100, y: 200 }, [
      { itemId: 'talk', label: 'Talk', icon: 'chat', enabled: true, shortcut: 'E' },
    ]);
    ui.showModal({
      title: 'Confirm Travel',
      body: 'Sail to Mars?',
      dialogType: 'confirm',
      buttons: [{ buttonId: 'ok', label: 'OK', style: 'primary' }],
      inputPlaceholder: null,
    });

    now += 2_000_000;
    ui.tick();
    const snapshot = ui.getSnapshot();

    expect(snapshot.hud.worldName).toBe('Earth');
    expect(snapshot.openPanels).toContain('inventory');
    expect(snapshot.notifications.find((n) => n.notificationId === note.notificationId)).toBeUndefined();
    expect(snapshot.activeContextMenu?.targetEntityId).toBe('npc-1');
    expect(snapshot.activeModal?.title).toBe('Confirm Travel');
  });
});
