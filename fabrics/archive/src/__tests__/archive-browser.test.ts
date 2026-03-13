import { describe, it, expect, vi } from 'vitest';
import {
  createArchiveBrowser,
  HOME_VIEW,
  type BrowserDeps,
  type BrowserView,
} from '../archive-browser.js';

// ── Test doubles ─────────────────────────────────────────────────────

function makeDeps(): BrowserDeps {
  let counter = 0;
  return {
    clock: { nowMs: vi.fn(() => 1_000) },
    id: { next: vi.fn(() => `sess-${String(++counter)}`) },
    log: { info: vi.fn() },
  };
}

function makeView(type: BrowserView['type'], resourceId?: string): BrowserView {
  return Object.freeze({ type, resourceId: resourceId ?? undefined, query: undefined, page: 1 });
}

// ── createSession ─────────────────────────────────────────────────────

describe('createSession', () => {
  it('creates a session starting at home view', () => {
    const browser = createArchiveBrowser(makeDeps());
    const session = browser.createSession('user-1');
    expect(session.userId).toBe('user-1');
    expect(session.currentView.type).toBe('home');
    expect(session.historyDepth).toBe(0);
    expect(session.bookmarkCount).toBe(0);
  });

  it('increments totalSessions on each call', () => {
    const browser = createArchiveBrowser(makeDeps());
    browser.createSession('u1');
    browser.createSession('u2');
    expect(browser.getStats().totalSessions).toBe(2);
  });
});

// ── navigate ──────────────────────────────────────────────────────────

describe('navigate', () => {
  it('changes current view and adds to back-stack', () => {
    const browser = createArchiveBrowser(makeDeps());
    const session = browser.createSession('u1');
    const result = browser.navigate(session.sessionId, makeView('timeline', 'world-1'));
    if (typeof result === 'string') throw new Error();
    expect(result.currentView.type).toBe('timeline');
    expect(result.historyDepth).toBe(1);
  });

  it('clears forward-stack on navigate', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.navigate(s.sessionId, makeView('dynasty'));
    const b = browser.back(s.sessionId);
    if (typeof b === 'string') throw new Error();
    // can go forward, now navigate → should clear it
    browser.navigate(s.sessionId, makeView('biography', 'npc-7'));
    const state = browser.buildState(s.sessionId);
    expect(state?.canGoForward).toBe(false);
  });

  it('returns session-not-found for unknown session', () => {
    const browser = createArchiveBrowser(makeDeps());
    expect(browser.navigate('ghost', makeView('home'))).toBe('session-not-found');
  });
});

// ── back ──────────────────────────────────────────────────────────────

describe('back', () => {
  it('returns to previous view', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.navigate(s.sessionId, makeView('timeline', 'w1'));
    const result = browser.back(s.sessionId);
    if (typeof result === 'string') throw new Error();
    expect(result.currentView.type).toBe('home');
  });

  it('adds current view to forward-stack', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.navigate(s.sessionId, makeView('dynasty'));
    browser.back(s.sessionId);
    expect(browser.buildState(s.sessionId)?.canGoForward).toBe(true);
  });

  it('returns nothing-to-go-back when at root', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    expect(browser.back(s.sessionId)).toBe('nothing-to-go-back');
  });
});

// ── forward ───────────────────────────────────────────────────────────

describe('forward', () => {
  it('re-navigates to the forwarded view', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.navigate(s.sessionId, makeView('chronicle', 'ch-42'));
    browser.back(s.sessionId);
    const result = browser.forward(s.sessionId);
    if (typeof result === 'string') throw new Error();
    expect(result.currentView.type).toBe('chronicle');
    expect(result.currentView.resourceId).toBe('ch-42');
  });

  it('returns nothing-to-go-forward when stack is empty', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    expect(browser.forward(s.sessionId)).toBe('nothing-to-go-forward');
  });
});

// ── bookmark ──────────────────────────────────────────────────────────

describe('bookmark', () => {
  it('adds a bookmark and increments bookmarkCount', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    const result = browser.bookmark(s.sessionId, 'entry-99', 'Battle of Ash');
    if (typeof result === 'string') throw new Error();
    expect(result.bookmarkCount).toBe(1);
  });

  it('returns bookmark-exists on duplicate', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.bookmark(s.sessionId, 'e1', 'label');
    expect(browser.bookmark(s.sessionId, 'e1', 'other')).toBe('bookmark-exists');
  });

  it('includes bookmarks in buildState', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.bookmark(s.sessionId, 'e1', 'First battle');
    const state = browser.buildState(s.sessionId);
    expect(state?.bookmarks.length).toBe(1);
    expect(state?.bookmarks.at(0)?.entryId).toBe('e1');
  });
});

// ── removeBookmark ────────────────────────────────────────────────────

describe('removeBookmark', () => {
  it('removes an existing bookmark', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.bookmark(s.sessionId, 'e1', 'label');
    const result = browser.removeBookmark(s.sessionId, 'e1');
    if (typeof result === 'string') throw new Error();
    expect(result.bookmarkCount).toBe(0);
  });

  it('returns bookmark-not-found for unknown entryId', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    expect(browser.removeBookmark(s.sessionId, 'ghost')).toBe('bookmark-not-found');
  });
});

// ── buildState ────────────────────────────────────────────────────────

describe('buildState', () => {
  it('returns undefined for unknown session', () => {
    const browser = createArchiveBrowser(makeDeps());
    expect(browser.buildState('ghost')).toBeUndefined();
  });

  it('canGoBack / canGoForward reflect stack lengths', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    expect(browser.buildState(s.sessionId)?.canGoBack).toBe(false);
    expect(browser.buildState(s.sessionId)?.canGoForward).toBe(false);
    browser.navigate(s.sessionId, makeView('dynasty'));
    expect(browser.buildState(s.sessionId)?.canGoBack).toBe(true);
  });
});

// ── closeSession ──────────────────────────────────────────────────────

describe('closeSession', () => {
  it('removes session from activeSessions count', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s = browser.createSession('u1');
    browser.createSession('u2');
    browser.closeSession(s.sessionId);
    expect(browser.getStats().activeSessions).toBe(1);
  });

  it('returns false for unknown sessionId', () => {
    const browser = createArchiveBrowser(makeDeps());
    expect(browser.closeSession('ghost')).toBe(false);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('counts totalBookmarks across active sessions', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s1 = browser.createSession('u1');
    const s2 = browser.createSession('u2');
    browser.bookmark(s1.sessionId, 'e1', 'a');
    browser.bookmark(s2.sessionId, 'e2', 'b');
    expect(browser.getStats().totalBookmarks).toBe(2);
  });

  it('computes avgHistoryDepth from active sessions', () => {
    const browser = createArchiveBrowser(makeDeps());
    const s1 = browser.createSession('u1');
    const s2 = browser.createSession('u2');
    browser.navigate(s1.sessionId, makeView('timeline'));
    browser.navigate(s1.sessionId, makeView('dynasty'));
    browser.navigate(s2.sessionId, makeView('biography'));
    expect(browser.getStats().avgHistoryDepth).toBe(1.5);
  });
});

// ── HOME_VIEW ─────────────────────────────────────────────────────────

describe('HOME_VIEW', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(HOME_VIEW)).toBe(true);
  });

  it('has type home and page 1', () => {
    expect(HOME_VIEW.type).toBe('home');
    expect(HOME_VIEW.page).toBe(1);
  });
});
