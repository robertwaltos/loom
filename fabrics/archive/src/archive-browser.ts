/**
 * archive-browser.ts — Session-based state manager for web exploration
 * of the game archive.
 *
 * NEXT-STEPS Phase 15.2: "Archive browser: web-based exploration of
 * game history."
 *
 * Maintains per-visitor navigation state: back/forward stacks, current
 * view (timeline / dynasty / chronicle / biography / search / home),
 * bookmarks, and pagination.  Stateless rendering clients receive a
 * `BrowserState` snapshot on each interaction.
 *
 * Thread: cotton/archive/archive-browser
 * Tier: 2
 */

// ── Ports ────────────────────────────────────────────────────────────

export interface BrowserClockPort {
  readonly nowMs: () => number;
}

export interface BrowserIdPort {
  readonly next: () => string;
}

export interface BrowserLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ── Types ────────────────────────────────────────────────────────────

export type ViewType =
  | 'home'
  | 'timeline'
  | 'dynasty'
  | 'chronicle'
  | 'biography'
  | 'search';

export type BrowserError =
  | 'session-not-found'
  | 'nothing-to-go-back'
  | 'nothing-to-go-forward'
  | 'bookmark-exists'
  | 'bookmark-not-found';

export interface BrowserView {
  readonly type: ViewType;
  readonly resourceId: string | undefined;
  readonly query: string | undefined;
  readonly page: number;
}

export interface Bookmark {
  readonly entryId: string;
  readonly label: string;
  readonly savedAt: number;
}

export interface BrowserSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly currentView: BrowserView;
  readonly historyDepth: number;
  readonly bookmarkCount: number;
  readonly createdAt: number;
  readonly lastActivityAt: number;
}

export interface BrowserState {
  readonly session: BrowserSession;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly bookmarks: readonly Bookmark[];
}

export interface BrowserStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly totalBookmarks: number;
  readonly avgHistoryDepth: number;
}

export const HOME_VIEW: BrowserView = Object.freeze({
  type: 'home',
  resourceId: undefined,
  query: undefined,
  page: 1,
});

export interface ArchiveBrowser {
  readonly createSession: (userId: string) => BrowserSession;
  readonly closeSession: (sessionId: string) => boolean;
  readonly navigate: (sessionId: string, view: BrowserView) => BrowserSession | BrowserError;
  readonly back: (sessionId: string) => BrowserSession | BrowserError;
  readonly forward: (sessionId: string) => BrowserSession | BrowserError;
  readonly bookmark: (sessionId: string, entryId: string, label: string) => BrowserSession | BrowserError;
  readonly removeBookmark: (sessionId: string, entryId: string) => BrowserSession | BrowserError;
  readonly buildState: (sessionId: string) => BrowserState | undefined;
  readonly getSession: (sessionId: string) => BrowserSession | undefined;
  readonly getStats: () => BrowserStats;
}

export type BrowserDeps = {
  readonly clock: BrowserClockPort;
  readonly id: BrowserIdPort;
  readonly log: BrowserLogPort;
};

// ── Internal state ────────────────────────────────────────────────────

type SessionState = {
  sessionId: string;
  userId: string;
  currentView: BrowserView;
  backStack: BrowserView[];
  forwardStack: BrowserView[];
  bookmarks: Map<string, Bookmark>;
  createdAt: number;
  lastActivityAt: number;
  active: boolean;
};

type ArchiveStore = {
  sessions: Map<string, SessionState>;
  totalSessions: number;
};

// ── Helpers ───────────────────────────────────────────────────────────

function snapshotSession(s: SessionState): BrowserSession {
  return Object.freeze({
    sessionId: s.sessionId,
    userId: s.userId,
    currentView: Object.freeze({ ...s.currentView }),
    historyDepth: s.backStack.length,
    bookmarkCount: s.bookmarks.size,
    createdAt: s.createdAt,
    lastActivityAt: s.lastActivityAt,
  });
}

// ── Builder functions ─────────────────────────────────────────────────

function makeCreateSession(store: ArchiveStore, deps: BrowserDeps) {
  return function createSession(userId: string): BrowserSession {
    const state: SessionState = {
      sessionId: deps.id.next(),
      userId,
      currentView: HOME_VIEW,
      backStack: [],
      forwardStack: [],
      bookmarks: new Map(),
      createdAt: deps.clock.nowMs(),
      lastActivityAt: deps.clock.nowMs(),
      active: true,
    };
    store.sessions.set(state.sessionId, state);
    store.totalSessions++;
    deps.log.info('browser-session-created', { sessionId: state.sessionId });
    return snapshotSession(state);
  };
}

function makeNavigate(store: ArchiveStore, deps: BrowserDeps) {
  return function navigate(sessionId: string, view: BrowserView): BrowserSession | BrowserError {
    const s = store.sessions.get(sessionId);
    if (s === undefined) return 'session-not-found';
    s.backStack.push(s.currentView);
    s.forwardStack = [];
    s.currentView = view;
    s.lastActivityAt = deps.clock.nowMs();
    return snapshotSession(s);
  };
}

function makeBack(store: ArchiveStore, deps: BrowserDeps) {
  return function back(sessionId: string): BrowserSession | BrowserError {
    const s = store.sessions.get(sessionId);
    if (s === undefined) return 'session-not-found';
    const prev = s.backStack.pop();
    if (prev === undefined) return 'nothing-to-go-back';
    s.forwardStack.push(s.currentView);
    s.currentView = prev;
    s.lastActivityAt = deps.clock.nowMs();
    return snapshotSession(s);
  };
}

function makeForward(store: ArchiveStore, deps: BrowserDeps) {
  return function forward(sessionId: string): BrowserSession | BrowserError {
    const s = store.sessions.get(sessionId);
    if (s === undefined) return 'session-not-found';
    const next = s.forwardStack.pop();
    if (next === undefined) return 'nothing-to-go-forward';
    s.backStack.push(s.currentView);
    s.currentView = next;
    s.lastActivityAt = deps.clock.nowMs();
    return snapshotSession(s);
  };
}

function makeBookmark(store: ArchiveStore, deps: BrowserDeps) {
  return function bookmark(
    sessionId: string,
    entryId: string,
    label: string,
  ): BrowserSession | BrowserError {
    const s = store.sessions.get(sessionId);
    if (s === undefined) return 'session-not-found';
    if (s.bookmarks.has(entryId)) return 'bookmark-exists';
    s.bookmarks.set(entryId, Object.freeze({ entryId, label, savedAt: deps.clock.nowMs() }));
    s.lastActivityAt = deps.clock.nowMs();
    return snapshotSession(s);
  };
}

function makeRemoveBookmark(store: ArchiveStore, deps: BrowserDeps) {
  return function removeBookmark(sessionId: string, entryId: string): BrowserSession | BrowserError {
    const s = store.sessions.get(sessionId);
    if (s === undefined) return 'session-not-found';
    if (!s.bookmarks.has(entryId)) return 'bookmark-not-found';
    s.bookmarks.delete(entryId);
    s.lastActivityAt = deps.clock.nowMs();
    return snapshotSession(s);
  };
}

function makeBuildState(store: ArchiveStore) {
  return function buildState(sessionId: string): BrowserState | undefined {
    const s = store.sessions.get(sessionId);
    if (s === undefined) return undefined;
    return Object.freeze({
      session: snapshotSession(s),
      canGoBack: s.backStack.length > 0,
      canGoForward: s.forwardStack.length > 0,
      bookmarks: Object.freeze(Array.from(s.bookmarks.values())),
    });
  };
}

function makeGetStats(store: ArchiveStore) {
  return function getStats(): BrowserStats {
    const all = Array.from(store.sessions.values());
    const active = all.filter((s) => s.active);
    const totalBookmarks = active.reduce((acc, s) => acc + s.bookmarks.size, 0);
    const avgHistoryDepth =
      active.length > 0
        ? active.reduce((acc, s) => acc + s.backStack.length, 0) / active.length
        : 0;
    return Object.freeze({ totalSessions: store.totalSessions, activeSessions: active.length, totalBookmarks, avgHistoryDepth });
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createArchiveBrowser(deps: BrowserDeps): ArchiveBrowser {
  const store: ArchiveStore = {
    sessions: new Map<string, SessionState>(),
    totalSessions: 0,
  };
  return {
    createSession: makeCreateSession(store, deps),
    closeSession(sessionId) {
      const s = store.sessions.get(sessionId);
      if (s === undefined) return false;
      s.active = false;
      return true;
    },
    navigate: makeNavigate(store, deps),
    back: makeBack(store, deps),
    forward: makeForward(store, deps),
    bookmark: makeBookmark(store, deps),
    removeBookmark: makeRemoveBookmark(store, deps),
    buildState: makeBuildState(store),
    getSession(id) {
      const s = store.sessions.get(id);
      return s === undefined ? undefined : snapshotSession(s);
    },
    getStats: makeGetStats(store),
  };
}
