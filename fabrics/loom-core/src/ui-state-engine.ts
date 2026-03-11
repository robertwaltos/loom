/**
 * UI State Engine — Loom-authoritative UI state management.
 *
 * The Loom owns all UI data. The renderer reads serialised UI state
 * each tick and presents it via CommonUI widgets. This engine manages:
 *   - HUD elements: health, KALON balance, minimap, compass, quest tracker
 *   - Panel visibility: inventory, trade, governance, map, settings
 *   - Notification queue: toast messages with priority and TTL
 *   - Context menus: contextual actions for entities, items, locations
 *   - Modal dialogs: confirmations, input prompts, results
 *
 * All mutations are recorded so the renderer can diff and animate.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface UiClockPort {
  readonly nowMicroseconds: () => number;
}

export interface UiIdPort {
  readonly generate: () => string;
}

export interface UiLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Types ────────────────────────────────────────────────────────

export type PanelId =
  | 'inventory'
  | 'trade'
  | 'governance'
  | 'dynasty'
  | 'map'
  | 'settings'
  | 'quest-log'
  | 'chat'
  | 'social'
  | 'crafting'
  | 'character'
  | 'estate';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type InputScheme = 'keyboard-mouse' | 'gamepad' | 'touch';

export interface HudState {
  readonly playerId: string;
  readonly healthCurrent: number;
  readonly healthMax: number;
  readonly kalonBalance: bigint;
  readonly minimapCenter: UiPosition;
  readonly minimapZoom: number;
  readonly compassHeading: number;
  readonly activeQuests: ReadonlyArray<QuestTrackerEntry>;
  readonly worldTime: number;
  readonly worldName: string;
  readonly dynastyName: string;
  readonly visible: boolean;
}

export interface UiPosition {
  readonly x: number;
  readonly y: number;
}

export interface QuestTrackerEntry {
  readonly questId: string;
  readonly title: string;
  readonly objectiveText: string;
  readonly progress: number;
  readonly progressMax: number;
  readonly pinned: boolean;
}

export interface UiNotification {
  readonly notificationId: string;
  readonly title: string;
  readonly body: string;
  readonly icon: string;
  readonly priority: NotificationPriority;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly actionId: string | null;
  readonly dismissed: boolean;
}

export interface ContextMenuItem {
  readonly itemId: string;
  readonly label: string;
  readonly icon: string;
  readonly enabled: boolean;
  readonly shortcut: string | null;
}

export interface ContextMenu {
  readonly menuId: string;
  readonly targetEntityId: string;
  readonly position: UiPosition;
  readonly items: ReadonlyArray<ContextMenuItem>;
}

export interface ModalDialog {
  readonly dialogId: string;
  readonly title: string;
  readonly body: string;
  readonly dialogType: 'confirm' | 'input' | 'info' | 'result';
  readonly buttons: ReadonlyArray<ModalButton>;
  readonly inputPlaceholder: string | null;
}

export interface ModalButton {
  readonly buttonId: string;
  readonly label: string;
  readonly style: 'primary' | 'secondary' | 'danger';
}

export interface TooltipData {
  readonly targetEntityId: string;
  readonly title: string;
  readonly lines: ReadonlyArray<TooltipLine>;
  readonly position: UiPosition;
}

export interface TooltipLine {
  readonly key: string;
  readonly value: string;
  readonly color: string | null;
}

export interface UiSnapshot {
  readonly hud: HudState;
  readonly openPanels: ReadonlyArray<PanelId>;
  readonly notifications: ReadonlyArray<UiNotification>;
  readonly activeContextMenu: ContextMenu | null;
  readonly activeModal: ModalDialog | null;
  readonly activeTooltip: TooltipData | null;
  readonly inputScheme: InputScheme;
  readonly timestamp: number;
}

// ── Config ───────────────────────────────────────────────────────

export interface UiStateEngineConfig {
  readonly maxNotifications: number;
  readonly notificationDefaultTtlMs: number;
  readonly maxContextMenuItems: number;
  readonly maxQuestTrackerEntries: number;
}

const DEFAULT_CONFIG: UiStateEngineConfig = {
  maxNotifications: 20,
  notificationDefaultTtlMs: 10_000,
  maxContextMenuItems: 8,
  maxQuestTrackerEntries: 5,
};

// ── Stats ────────────────────────────────────────────────────────

export interface UiStateEngineStats {
  readonly totalNotificationsShown: number;
  readonly totalModalsShown: number;
  readonly panelToggles: number;
  readonly snapshotsProduced: number;
}

// ── Public API ───────────────────────────────────────────────────

export interface UiStateEngine {
  // HUD
  readonly updateHud: (partial: Partial<Omit<HudState, 'playerId'>>) => void;
  readonly setHudVisible: (visible: boolean) => void;

  // Panels
  readonly openPanel: (panel: PanelId) => void;
  readonly closePanel: (panel: PanelId) => void;
  readonly togglePanel: (panel: PanelId) => void;
  readonly isOpen: (panel: PanelId) => boolean;

  // Notifications
  readonly showNotification: (
    title: string,
    body: string,
    priority: NotificationPriority,
    opts?: { icon?: string; ttlMs?: number; actionId?: string },
  ) => UiNotification;
  readonly dismissNotification: (notificationId: string) => void;
  readonly clearNotifications: () => void;

  // Context menus
  readonly showContextMenu: (
    targetEntityId: string,
    position: UiPosition,
    items: ReadonlyArray<ContextMenuItem>,
  ) => ContextMenu;
  readonly closeContextMenu: () => void;

  // Modals
  readonly showModal: (dialog: Omit<ModalDialog, 'dialogId'>) => ModalDialog;
  readonly closeModal: () => void;

  // Tooltips
  readonly showTooltip: (data: Omit<TooltipData, 'position'> & { position: UiPosition }) => void;
  readonly hideTooltip: () => void;

  // Input
  readonly setInputScheme: (scheme: InputScheme) => void;

  // Quest tracker
  readonly updateQuestTracker: (entries: ReadonlyArray<QuestTrackerEntry>) => void;

  // Snapshot
  readonly getSnapshot: () => UiSnapshot;
  readonly tick: () => void;
  readonly getStats: () => UiStateEngineStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface UiStateEngineDeps {
  readonly clock: UiClockPort;
  readonly idGenerator: UiIdPort;
  readonly logger: UiLogPort;
}

// ── Factory ──────────────────────────────────────────────────────

export function createUiStateEngine(
  deps: UiStateEngineDeps,
  playerId: string,
  config?: Partial<UiStateEngineConfig>,
): UiStateEngine {
  const cfg: UiStateEngineConfig = { ...DEFAULT_CONFIG, ...config };

  let hud: HudState = {
    playerId,
    healthCurrent: 100,
    healthMax: 100,
    kalonBalance: 0n,
    minimapCenter: { x: 0, y: 0 },
    minimapZoom: 1,
    compassHeading: 0,
    activeQuests: [],
    worldTime: 0,
    worldName: '',
    dynastyName: '',
    visible: true,
  };

  const openPanels = new Set<PanelId>();
  const notifications: UiNotification[] = [];
  let activeContextMenu: ContextMenu | null = null;
  let activeModal: ModalDialog | null = null;
  let activeTooltip: TooltipData | null = null;
  let inputScheme: InputScheme = 'keyboard-mouse';

  let totalNotificationsShown = 0;
  let totalModalsShown = 0;
  let panelToggles = 0;
  let snapshotsProduced = 0;

  function updateHud(partial: Partial<Omit<HudState, 'playerId'>>): void {
    hud = { ...hud, ...partial };
  }

  function showNotification(
    title: string,
    body: string,
    priority: NotificationPriority,
    opts?: { icon?: string; ttlMs?: number; actionId?: string },
  ): UiNotification {
    const now = deps.clock.nowMicroseconds();
    const ttlMs = opts?.ttlMs ?? cfg.notificationDefaultTtlMs;
    const notification: UiNotification = {
      notificationId: deps.idGenerator.generate(),
      title,
      body,
      icon: opts?.icon ?? 'default',
      priority,
      createdAt: now,
      expiresAt: now + ttlMs * 1_000,
      actionId: opts?.actionId ?? null,
      dismissed: false,
    };

    notifications.push(notification);
    if (notifications.length > cfg.maxNotifications) {
      notifications.shift();
    }

    totalNotificationsShown++;
    deps.logger.info({ notificationId: notification.notificationId, priority }, 'notification_shown');
    return notification;
  }

  function dismissNotification(notificationId: string): void {
    const n = notifications.find(x => x.notificationId === notificationId);
    if (n) {
      const idx = notifications.indexOf(n);
      notifications[idx] = { ...n, dismissed: true };
    }
  }

  function showContextMenu(
    targetEntityId: string,
    position: UiPosition,
    items: ReadonlyArray<ContextMenuItem>,
  ): ContextMenu {
    const limited = items.slice(0, cfg.maxContextMenuItems);
    activeContextMenu = {
      menuId: deps.idGenerator.generate(),
      targetEntityId,
      position,
      items: limited,
    };
    return activeContextMenu;
  }

  function showModal(dialog: Omit<ModalDialog, 'dialogId'>): ModalDialog {
    activeModal = {
      ...dialog,
      dialogId: deps.idGenerator.generate(),
    };
    totalModalsShown++;
    return activeModal;
  }

  function tick(): void {
    const now = deps.clock.nowMicroseconds();

    // Purge expired notifications
    for (let i = notifications.length - 1; i >= 0; i--) {
      const n = notifications[i]!;
      if (n.dismissed || now >= n.expiresAt) {
        notifications.splice(i, 1);
      }
    }
  }

  return {
    updateHud,
    setHudVisible: (visible: boolean) => { hud = { ...hud, visible }; },
    openPanel: (panel: PanelId) => { openPanels.add(panel); panelToggles++; },
    closePanel: (panel: PanelId) => { openPanels.delete(panel); panelToggles++; },
    togglePanel: (panel: PanelId) => {
      if (openPanels.has(panel)) { openPanels.delete(panel); } else { openPanels.add(panel); }
      panelToggles++;
    },
    isOpen: (panel: PanelId) => openPanels.has(panel),
    showNotification,
    dismissNotification,
    clearNotifications: () => { notifications.length = 0; },
    showContextMenu,
    closeContextMenu: () => { activeContextMenu = null; },
    showModal,
    closeModal: () => { activeModal = null; },
    showTooltip: (data) => { activeTooltip = data; },
    hideTooltip: () => { activeTooltip = null; },
    setInputScheme: (scheme: InputScheme) => { inputScheme = scheme; },
    updateQuestTracker: (entries: ReadonlyArray<QuestTrackerEntry>) => {
      const limited = entries.slice(0, cfg.maxQuestTrackerEntries);
      hud = { ...hud, activeQuests: limited };
    },
    getSnapshot: (): UiSnapshot => {
      snapshotsProduced++;
      return {
        hud,
        openPanels: [...openPanels],
        notifications: notifications.filter(n => !n.dismissed),
        activeContextMenu,
        activeModal,
        activeTooltip,
        inputScheme,
        timestamp: deps.clock.nowMicroseconds(),
      };
    },
    tick,
    getStats: (): UiStateEngineStats => ({
      totalNotificationsShown,
      totalModalsShown,
      panelToggles,
      snapshotsProduced,
    }),
  };
}
