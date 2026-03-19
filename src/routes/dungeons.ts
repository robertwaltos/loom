/**
 * Dungeon Generator Routes — Procedural dungeon layout generation.
 *
 * POST   /v1/dungeons                                              — Generate layout
 * GET    /v1/dungeons/:layoutId                                    — Get layout
 * GET    /v1/dungeons/:layoutId/validate                           — Validate connectivity
 * GET    /v1/dungeons/:layoutId/budget                             — Total enemy budget
 * POST   /v1/dungeons/:layoutId/rooms                              — Add room manually
 * POST   /v1/dungeons/:layoutId/connections                        — Connect two rooms
 * GET    /v1/dungeons/:layoutId/rooms/by-type/:type                — Rooms by type
 * GET    /v1/dungeons/:layoutId/rooms/:roomId/adjacent             — Adjacent rooms
 * POST   /v1/dungeons/:layoutId/path                               — Find path { from, to }
 * POST   /v1/dungeons/:layoutId/scale                              — Scale difficulty { targetTier }
 *
 * BigInt fields (createdAt, timestamps) are serialized as strings.
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import {
  createDungeonGeneratorState,
  generateLayout,
  addRoom,
  connectRooms,
  validateConnectivity,
  getLayout,
  scaleDifficulty,
  getRoomsByType,
  getPathBetween,
  getTotalEnemyBudget,
  getAdjacentRooms,
} from '../../fabrics/loom-core/src/dungeon-generator.js';
import type {
  DungeonGeneratorState,
  RoomType,
  DifficultyTier,
  GenerationParams,
} from '../../fabrics/loom-core/src/dungeon-generator.js';

const VALID_ROOM_TYPES: ReadonlySet<string> = new Set([
  'ENTRY', 'BOSS', 'TREASURE', 'CORRIDOR', 'PUZZLE',
  'TRAP', 'REST', 'MERCHANT', 'ELITE', 'SECRET',
]);

const VALID_DIFFICULTY_TIERS: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5]);

/** Recursively replace bigint with string and Map with plain object for JSON. */
function serializeDungeon(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Map) {
    return Object.fromEntries([...v.entries()].map(([k, val]) => [String(k), serializeDungeon(val)]));
  }
  if (Array.isArray(v)) return v.map(serializeDungeon);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeDungeon(val)]),
    );
  }
  return v;
}

export interface DungeonRoutesDeps {
  readonly dungeonState: DungeonGeneratorState;
}

export function registerDungeonRoutes(app: FastifyAppLike, deps: DungeonRoutesDeps): void {
  const { dungeonState } = deps;

  // POST /v1/dungeons — generate layout
  app.post('/v1/dungeons', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    const b = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const difficultyTier = typeof b['difficultyTier'] === 'number'
      ? b['difficultyTier'] as DifficultyTier
      : 1 as DifficultyTier;
    if (!VALID_DIFFICULTY_TIERS.has(difficultyTier)) {
      return reply.code(400).send({ ok: false, error: 'difficultyTier must be 0–5', code: 'INVALID_INPUT' });
    }
    const params: GenerationParams = {
      minRooms: typeof b['minRooms'] === 'number' ? b['minRooms'] : 5,
      maxRooms: typeof b['maxRooms'] === 'number' ? b['maxRooms'] : 12,
      difficultyTier,
      minRoomArea: typeof b['minRoomArea'] === 'number' ? b['minRoomArea'] : 20,
      maxRoomArea: typeof b['maxRoomArea'] === 'number' ? b['maxRoomArea'] : 100,
      connectionDensity: typeof b['connectionDensity'] === 'number' ? b['connectionDensity'] : 0.5,
      secretRoomChance: typeof b['secretRoomChance'] === 'number' ? b['secretRoomChance'] : 0.1,
      treasureRoomCount: typeof b['treasureRoomCount'] === 'number' ? b['treasureRoomCount'] : 1,
    };
    const result = generateLayout(dungeonState, params);
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, layout: serializeDungeon(result) });
  });

  // GET /v1/dungeons/:layoutId — get layout
  app.get('/v1/dungeons/:layoutId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const layout = getLayout(dungeonState, layoutId);
    if (typeof layout === 'string') {
      return reply.code(404).send({ ok: false, error: layout, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, layout: serializeDungeon(layout) });
  });

  // GET /v1/dungeons/:layoutId/validate
  app.get('/v1/dungeons/:layoutId/validate', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const validation = validateConnectivity(dungeonState, layoutId);
    if (typeof validation === 'string') {
      return reply.code(404).send({ ok: false, error: validation, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, layoutId, validation });
  });

  // GET /v1/dungeons/:layoutId/budget
  app.get('/v1/dungeons/:layoutId/budget', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const budget = getTotalEnemyBudget(dungeonState, layoutId);
    if (typeof budget === 'string') {
      return reply.code(404).send({ ok: false, error: budget, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, layoutId, totalEnemyBudget: budget });
  });

  // GET /v1/dungeons/:layoutId/rooms/by-type/:type — before /:roomId
  app.get('/v1/dungeons/:layoutId/rooms/by-type/:type', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    const type = typeof params['type'] === 'string' ? params['type'].toUpperCase() : '';
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    if (!VALID_ROOM_TYPES.has(type)) {
      return reply.code(400).send({ ok: false, error: `type must be one of: ${[...VALID_ROOM_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const rooms = getRoomsByType(dungeonState, layoutId, type as RoomType);
    if (typeof rooms === 'string') {
      return reply.code(404).send({ ok: false, error: rooms, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, layoutId, type, rooms: serializeDungeon(rooms), total: rooms.length });
  });

  // GET /v1/dungeons/:layoutId/rooms/:roomId/adjacent
  app.get('/v1/dungeons/:layoutId/rooms/:roomId/adjacent', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    const roomId = typeof params['roomId'] === 'string' ? params['roomId'] : null;
    if (layoutId === null || roomId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId or roomId', code: 'INVALID_INPUT' });
    }
    const adjacent = getAdjacentRooms(dungeonState, layoutId, roomId);
    if (typeof adjacent === 'string') {
      return reply.code(404).send({ ok: false, error: adjacent, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, layoutId, roomId, adjacent: serializeDungeon(adjacent), total: adjacent.length });
  });

  // POST /v1/dungeons/:layoutId/rooms — add room
  app.post('/v1/dungeons/:layoutId/rooms', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const b = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const roomType = String(b['type'] ?? 'CORRIDOR').toUpperCase();
    if (!VALID_ROOM_TYPES.has(roomType)) {
      return reply.code(400).send({ ok: false, error: `type must be one of: ${[...VALID_ROOM_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const diffTier = typeof b['difficultyTier'] === 'number' ? b['difficultyTier'] : 1;
    const result = addRoom(
      dungeonState,
      layoutId,
      roomType as RoomType,
      typeof b['x'] === 'number' ? b['x'] : 0,
      typeof b['y'] === 'number' ? b['y'] : 0,
      typeof b['width'] === 'number' ? b['width'] : 10,
      typeof b['height'] === 'number' ? b['height'] : 10,
      VALID_DIFFICULTY_TIERS.has(diffTier) ? diffTier as DifficultyTier : 1 as DifficultyTier,
    );
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, room: serializeDungeon(result) });
  });

  // POST /v1/dungeons/:layoutId/connections — connect rooms
  app.post('/v1/dungeons/:layoutId/connections', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const b = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    if (typeof b['fromRoomId'] !== 'string' || typeof b['toRoomId'] !== 'string') {
      return reply.code(400).send({ ok: false, error: 'fromRoomId and toRoomId required', code: 'INVALID_INPUT' });
    }
    const result = connectRooms(
      dungeonState,
      layoutId,
      b['fromRoomId'],
      b['toRoomId'],
      typeof b['traversalCost'] === 'number' ? b['traversalCost'] : 1,
      typeof b['bidirectional'] === 'boolean' ? b['bidirectional'] : true,
    );
    if (result !== 'ok') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, connected: true, from: b['fromRoomId'], to: b['toRoomId'] });
  });

  // POST /v1/dungeons/:layoutId/path — find path
  app.post('/v1/dungeons/:layoutId/path', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const b = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    if (typeof b['from'] !== 'string' || typeof b['to'] !== 'string') {
      return reply.code(400).send({ ok: false, error: 'from and to roomIds required', code: 'INVALID_INPUT' });
    }
    const path = getPathBetween(dungeonState, layoutId, b['from'], b['to']);
    if (typeof path === 'string') {
      return reply.code(404).send({ ok: false, error: path, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, layoutId, from: b['from'], to: b['to'], path, length: path.length });
  });

  // POST /v1/dungeons/:layoutId/scale — scale difficulty
  app.post('/v1/dungeons/:layoutId/scale', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const layoutId = typeof params['layoutId'] === 'string' ? params['layoutId'] : null;
    if (layoutId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid layoutId', code: 'INVALID_INPUT' });
    }
    const targetTier = typeof body === 'object' && body !== null && 'targetTier' in body
      ? Number((body as Record<string, unknown>)['targetTier'])
      : NaN;
    if (!VALID_DIFFICULTY_TIERS.has(targetTier)) {
      return reply.code(400).send({ ok: false, error: 'targetTier must be 0–5', code: 'INVALID_INPUT' });
    }
    const result = scaleDifficulty(dungeonState, layoutId, targetTier as DifficultyTier);
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, layoutId, scaled: true });
  });
}

export { createDungeonGeneratorState };
