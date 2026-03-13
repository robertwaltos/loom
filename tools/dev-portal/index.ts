/**
 * dev-portal/index.ts — Developer portal: API registry, doc browser,
 * and community forum for the Koydo Loom modding ecosystem.
 *
 * NEXT-STEPS Phase 16.4: "DevPortal: documentation site, API explorer,
 * community forums."
 *
 * Features:
 *   - Register and browse API endpoints by fabric
 *   - Full-text search across endpoints and forum threads
 *   - Threaded community forum (create / reply)
 *   - Markdown body storage for doc entries and posts
 *
 * Thread: cotton/tools/dev-portal
 * Tier: 1
 */

// ── Ports ─────────────────────────────────────────────────────────────

export interface PortalClockPort {
  readonly nowMs: () => number;
}

export interface PortalIdPort {
  readonly next: () => string;
}

// ── Types ─────────────────────────────────────────────────────────────

export type LoomFabric =
  | 'loom-core'
  | 'shuttle'
  | 'silfen-weave'
  | 'nakama-fabric'
  | 'bridge-loom-ue5'
  | 'inspector'
  | 'selvage'
  | 'dye-house'
  | 'archive'
  | 'tools';

export type PortalError =
  | 'thread-not-found'
  | 'endpoint-not-found'
  | 'body-too-short';

export interface ApiParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
}

export interface ApiEndpointDef {
  readonly name: string;
  readonly fabric: LoomFabric;
  readonly description: string;
  readonly parameters: readonly ApiParameter[];
  readonly returnType: string;
  readonly exampleCode: string;
}

export interface ApiEndpoint extends ApiEndpointDef {
  readonly id: string;
  readonly registeredAt: number;
}

export interface ForumPost {
  readonly postId: string;
  readonly threadId: string;
  readonly body: string;
  readonly createdAt: number;
}

export interface ForumThread {
  readonly threadId: string;
  readonly title: string;
  readonly posts: readonly ForumPost[];
  readonly createdAt: number;
  readonly lastActivityAt: number;
}

export interface PortalStats {
  readonly totalEndpoints: number;
  readonly totalThreads: number;
  readonly totalPosts: number;
}

export interface DevPortal {
  readonly registerEndpoint: (def: ApiEndpointDef) => ApiEndpoint;
  readonly getEndpoint: (id: string) => ApiEndpoint | undefined;
  readonly listEndpointsByFabric: (fabric: LoomFabric) => readonly ApiEndpoint[];
  readonly searchApi: (query: string) => readonly ApiEndpoint[];
  readonly postThread: (title: string, body: string) => ForumThread | PortalError;
  readonly replyToThread: (threadId: string, body: string) => ForumPost | PortalError;
  readonly getThread: (threadId: string) => ForumThread | undefined;
  readonly searchForum: (query: string) => readonly ForumThread[];
  readonly getStats: () => PortalStats;
}

export type DevPortalDeps = {
  readonly clock: PortalClockPort;
  readonly id: PortalIdPort;
};

// ── Internal store ────────────────────────────────────────────────────

type PortalStore = {
  endpoints: Map<string, ApiEndpoint>;
  threads: Map<string, ForumThread>;
  totalPosts: number;
};

// ── Builder functions ─────────────────────────────────────────────────

function makeRegisterEndpoint(store: PortalStore, deps: DevPortalDeps) {
  return function registerEndpoint(def: ApiEndpointDef): ApiEndpoint {
    const endpoint: ApiEndpoint = Object.freeze({
      ...def,
      id: deps.id.next(),
      registeredAt: deps.clock.nowMs(),
    });
    store.endpoints.set(endpoint.id, endpoint);
    return endpoint;
  };
}

function makeSearchApi(store: PortalStore) {
  return function searchApi(query: string): readonly ApiEndpoint[] {
    const q = query.toLowerCase();
    return Array.from(store.endpoints.values()).filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.fabric.includes(q),
    );
  };
}

function makePostThread(store: PortalStore, deps: DevPortalDeps) {
  return function postThread(title: string, body: string): ForumThread | PortalError {
    if (body.trim().length < 10) return 'body-too-short';
    const now = deps.clock.nowMs();
    const firstPost: ForumPost = Object.freeze({
      postId: deps.id.next(),
      threadId: '',
      body,
      createdAt: now,
    });
    const thread: ForumThread = Object.freeze({
      threadId: deps.id.next(),
      title,
      posts: Object.freeze([{ ...firstPost, threadId: '' }]),
      createdAt: now,
      lastActivityAt: now,
    });
    const post: ForumPost = Object.freeze({ ...firstPost, threadId: thread.threadId });
    const frozen = Object.freeze({ ...thread, posts: Object.freeze([post]) });
    store.threads.set(frozen.threadId, frozen);
    store.totalPosts++;
    return frozen;
  };
}

function makeReplyToThread(store: PortalStore, deps: DevPortalDeps) {
  return function replyToThread(threadId: string, body: string): ForumPost | PortalError {
    if (body.trim().length < 10) return 'body-too-short';
    const thread = store.threads.get(threadId);
    if (thread === undefined) return 'thread-not-found';
    const post: ForumPost = Object.freeze({
      postId: deps.id.next(),
      threadId,
      body,
      createdAt: deps.clock.nowMs(),
    });
    const updated = Object.freeze({
      ...thread,
      posts: Object.freeze([...thread.posts, post]),
      lastActivityAt: post.createdAt,
    });
    store.threads.set(threadId, updated);
    store.totalPosts++;
    return post;
  };
}

function makeSearchForum(store: PortalStore) {
  return function searchForum(query: string): readonly ForumThread[] {
    const q = query.toLowerCase();
    return Array.from(store.threads.values()).filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.posts.some((p) => p.body.toLowerCase().includes(q)),
    );
  };
}

function makeGetStats(store: PortalStore) {
  return function getStats(): PortalStats {
    return Object.freeze({
      totalEndpoints: store.endpoints.size,
      totalThreads: store.threads.size,
      totalPosts: store.totalPosts,
    });
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createDevPortal(deps: DevPortalDeps): DevPortal {
  const store: PortalStore = { endpoints: new Map(), threads: new Map(), totalPosts: 0 };
  return {
    registerEndpoint: makeRegisterEndpoint(store, deps),
    getEndpoint: (id) => store.endpoints.get(id),
    listEndpointsByFabric: (fabric) =>
      Array.from(store.endpoints.values()).filter((e) => e.fabric === fabric),
    searchApi: makeSearchApi(store),
    postThread: makePostThread(store, deps),
    replyToThread: makeReplyToThread(store, deps),
    getThread: (id) => store.threads.get(id),
    searchForum: makeSearchForum(store),
    getStats: makeGetStats(store),
  };
}
