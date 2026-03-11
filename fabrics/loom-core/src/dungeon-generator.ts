/**
 * Dungeon Generator — Procedural layout generation for instanced dungeons
 *
 * Generates dungeon layouts with rooms, connections, difficulty scaling.
 * Validates connectivity. No external fabric dependencies.
 */

// --- Ports (defined locally) ---

export interface Clock {
  nowMicros(): bigint;
}

export interface IdGenerator {
  nextId(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// --- Types ---

export type RoomType =
  | 'ENTRY'
  | 'BOSS'
  | 'TREASURE'
  | 'CORRIDOR'
  | 'PUZZLE'
  | 'TRAP'
  | 'REST'
  | 'MERCHANT'
  | 'ELITE'
  | 'SECRET';

export type DifficultyTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface DungeonRoom {
  readonly id: string;
  readonly type: RoomType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly area: number;
  readonly enemyBudget: number;
  readonly difficultyTier: DifficultyTier;
  readonly createdAt: bigint;
}

export interface RoomConnection {
  readonly fromRoomId: string;
  readonly toRoomId: string;
  readonly traversalCost: number;
  readonly bidirectional: boolean;
}

export interface DungeonLayout {
  readonly layoutId: string;
  readonly rooms: Map<string, DungeonRoom>;
  readonly connections: RoomConnection[];
  readonly entryRoomId: string | null;
  readonly bossRoomId: string | null;
  readonly difficultyTier: DifficultyTier;
  readonly createdAt: bigint;
}

export interface LayoutValidation {
  readonly isValid: boolean;
  readonly allRoomsReachable: boolean;
  readonly hasEntry: boolean;
  readonly hasBoss: boolean;
  readonly unreachableRooms: string[];
  readonly errors: string[];
}

export interface GenerationParams {
  readonly minRooms: number;
  readonly maxRooms: number;
  readonly difficultyTier: DifficultyTier;
  readonly minRoomArea: number;
  readonly maxRoomArea: number;
  readonly connectionDensity: number; // 0.0 - 1.0
  readonly secretRoomChance: number; // 0.0 - 1.0
  readonly treasureRoomCount: number;
}

export interface DungeonGeneratorState {
  readonly layouts: Map<string, DungeonLayout>;
  readonly clock: Clock;
  readonly idGen: IdGenerator;
  readonly logger: Logger;
}

export type DungeonGeneratorError =
  | 'layout-not-found'
  | 'room-not-found'
  | 'invalid-params'
  | 'entry-room-exists'
  | 'boss-room-exists'
  | 'connection-exists'
  | 'room-not-reachable'
  | 'invalid-difficulty'
  | 'invalid-area';

// --- Factory ---

export function createDungeonGeneratorState(
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): DungeonGeneratorState {
  return {
    layouts: new Map(),
    clock,
    idGen,
    logger,
  };
}

// --- Core Functions ---

export function generateLayout(
  state: DungeonGeneratorState,
  params: GenerationParams,
): DungeonLayout | DungeonGeneratorError {
  const validation = validateParams(params);
  if (validation !== 'ok') {
    return validation;
  }

  const layoutId = state.idGen.nextId();
  const now = state.clock.nowMicros();
  const rooms = new Map<string, DungeonRoom>();
  const connections: RoomConnection[] = [];

  const roomCount =
    params.minRooms + Math.floor(Math.random() * (params.maxRooms - params.minRooms + 1));

  // Create entry room
  const entryRoom = createRoom(
    state,
    'ENTRY',
    0,
    0,
    params.minRoomArea,
    params.maxRoomArea,
    params.difficultyTier,
    now,
  );
  rooms.set(entryRoom.id, entryRoom);

  // Create boss room
  const bossRoom = createRoom(
    state,
    'BOSS',
    10,
    10,
    params.minRoomArea * 2,
    params.maxRoomArea * 2,
    params.difficultyTier,
    now,
  );
  rooms.set(bossRoom.id, bossRoom);

  // Create treasure rooms
  for (let i = 0; i < params.treasureRoomCount; i++) {
    const room = createRoom(
      state,
      'TREASURE',
      Math.floor(Math.random() * 20) - 10,
      Math.floor(Math.random() * 20) - 10,
      params.minRoomArea,
      params.maxRoomArea,
      params.difficultyTier,
      now,
    );
    rooms.set(room.id, room);
  }

  // Fill remaining rooms
  const remaining = roomCount - rooms.size;
  const roomTypes: RoomType[] = ['CORRIDOR', 'PUZZLE', 'TRAP', 'REST', 'ELITE', 'MERCHANT'];

  for (let i = 0; i < remaining; i++) {
    const typeIndex = Math.floor(Math.random() * roomTypes.length);
    const type = roomTypes[typeIndex];
    if (type === undefined) continue;

    // Secret rooms by chance
    const finalType = Math.random() < params.secretRoomChance ? 'SECRET' : type;

    const room = createRoom(
      state,
      finalType,
      Math.floor(Math.random() * 20) - 10,
      Math.floor(Math.random() * 20) - 10,
      params.minRoomArea,
      params.maxRoomArea,
      params.difficultyTier,
      now,
    );
    rooms.set(room.id, room);
  }

  // Create connections based on density
  const roomIds = Array.from(rooms.keys());
  const targetConnections = Math.floor(roomIds.length * params.connectionDensity);

  for (let i = 0; i < targetConnections; i++) {
    const fromIdx = Math.floor(Math.random() * roomIds.length);
    const toIdx = Math.floor(Math.random() * roomIds.length);

    const fromId = roomIds[fromIdx];
    const toId = roomIds[toIdx];

    if (fromId === undefined || toId === undefined || fromId === toId) {
      continue;
    }

    const conn: RoomConnection = {
      fromRoomId: fromId,
      toRoomId: toId,
      traversalCost: 1 + Math.floor(Math.random() * 5),
      bidirectional: Math.random() > 0.3,
    };

    connections.push(conn);
  }

  // Ensure at least one bidirectional corridor exists for traversal
  if (!connections.some((c) => c.bidirectional) && roomIds.length >= 2) {
    const firstId = roomIds[0];
    const secondId = roomIds[1];
    if (firstId !== undefined && secondId !== undefined) {
      connections.push({
        fromRoomId: firstId,
        toRoomId: secondId,
        traversalCost: 1,
        bidirectional: true,
      });
    }
  }

  // Ensure entry to boss path exists
  connections.push({
    fromRoomId: entryRoom.id,
    toRoomId: bossRoom.id,
    traversalCost: 10,
    bidirectional: false,
  });

  const layout: DungeonLayout = {
    layoutId,
    rooms,
    connections,
    entryRoomId: entryRoom.id,
    bossRoomId: bossRoom.id,
    difficultyTier: params.difficultyTier,
    createdAt: now,
  };

  state.layouts.set(layoutId, layout);
  state.logger.info('Generated layout: ' + layoutId);

  return layout;
}

function validateParams(params: GenerationParams): 'ok' | DungeonGeneratorError {
  if (params.minRooms < 3 || params.maxRooms < params.minRooms) {
    return 'invalid-params';
  }
  if (params.difficultyTier < 0 || params.difficultyTier > 5) {
    return 'invalid-difficulty';
  }
  if (params.minRoomArea < 10 || params.maxRoomArea < params.minRoomArea) {
    return 'invalid-area';
  }
  if (params.connectionDensity < 0 || params.connectionDensity > 1) {
    return 'invalid-params';
  }
  return 'ok';
}

function createRoom(
  state: DungeonGeneratorState,
  type: RoomType,
  x: number,
  y: number,
  minArea: number,
  maxArea: number,
  difficultyTier: DifficultyTier,
  now: bigint,
): DungeonRoom {
  const area = minArea + Math.floor(Math.random() * (maxArea - minArea + 1));
  const width = Math.floor(Math.sqrt(area));
  const height = Math.floor(area / width);

  const enemyBudget = calculateEnemyBudget(type, area, difficultyTier);

  return {
    id: state.idGen.nextId(),
    type,
    x,
    y,
    width,
    height,
    area: width * height,
    enemyBudget,
    difficultyTier,
    createdAt: now,
  };
}

function calculateEnemyBudget(type: RoomType, area: number, tier: DifficultyTier): number {
  let base = Math.floor(area / 50);

  const multipliers: Record<RoomType, number> = {
    ENTRY: 0.5,
    BOSS: 5.0,
    TREASURE: 2.0,
    CORRIDOR: 1.0,
    PUZZLE: 0.5,
    TRAP: 1.5,
    REST: 0.0,
    MERCHANT: 0.0,
    ELITE: 3.0,
    SECRET: 2.5,
  };

  const mult = multipliers[type];
  if (mult === undefined) return base;

  base = Math.floor(base * mult);
  base = Math.floor(base * (1 + tier * 0.3));

  return base;
}

export function addRoom(
  state: DungeonGeneratorState,
  layoutId: string,
  type: RoomType,
  x: number,
  y: number,
  width: number,
  height: number,
  difficultyTier: DifficultyTier,
): DungeonRoom | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  if (type === 'ENTRY' && layout.entryRoomId !== null) {
    return 'entry-room-exists';
  }
  if (type === 'BOSS' && layout.bossRoomId !== null) {
    return 'boss-room-exists';
  }

  const area = width * height;
  const enemyBudget = calculateEnemyBudget(type, area, difficultyTier);

  const room: DungeonRoom = {
    id: state.idGen.nextId(),
    type,
    x,
    y,
    width,
    height,
    area,
    enemyBudget,
    difficultyTier,
    createdAt: state.clock.nowMicros(),
  };

  layout.rooms.set(room.id, room);

  const updatedEntryId = type === 'ENTRY' ? room.id : layout.entryRoomId;
  const updatedBossId = type === 'BOSS' ? room.id : layout.bossRoomId;

  const updatedLayout: DungeonLayout = {
    ...layout,
    entryRoomId: updatedEntryId,
    bossRoomId: updatedBossId,
  };

  state.layouts.set(layoutId, updatedLayout);
  state.logger.info('Added room: ' + room.id);

  return room;
}

export function connectRooms(
  state: DungeonGeneratorState,
  layoutId: string,
  fromRoomId: string,
  toRoomId: string,
  traversalCost: number,
  bidirectional: boolean,
): 'ok' | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  const fromRoom = layout.rooms.get(fromRoomId);
  if (fromRoom === undefined) {
    return 'room-not-found';
  }

  const toRoom = layout.rooms.get(toRoomId);
  if (toRoom === undefined) {
    return 'room-not-found';
  }

  const exists = layout.connections.some(
    (c) => c.fromRoomId === fromRoomId && c.toRoomId === toRoomId,
  );
  if (exists) {
    return 'connection-exists';
  }

  const conn: RoomConnection = {
    fromRoomId,
    toRoomId,
    traversalCost,
    bidirectional,
  };

  const updatedLayout: DungeonLayout = {
    ...layout,
    connections: [...layout.connections, conn],
  };

  state.layouts.set(layoutId, updatedLayout);
  state.logger.info('Connected rooms: ' + fromRoomId + ' -> ' + toRoomId);

  return 'ok';
}

export function validateConnectivity(
  state: DungeonGeneratorState,
  layoutId: string,
): LayoutValidation | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  const errors: string[] = [];
  const hasEntry = layout.entryRoomId !== null;
  const hasBoss = layout.bossRoomId !== null;

  if (!hasEntry) {
    errors.push('No entry room');
  }
  if (!hasBoss) {
    errors.push('No boss room');
  }

  const reachable = new Set<string>();
  if (layout.entryRoomId !== null) {
    computeReachableRooms(layout, layout.entryRoomId, reachable);
  }

  const allRoomIds = Array.from(layout.rooms.keys());
  const unreachableRooms = allRoomIds.filter((id) => !reachable.has(id));

  const allRoomsReachable = unreachableRooms.length === 0;

  if (!allRoomsReachable) {
    errors.push('Unreachable rooms: ' + String(unreachableRooms.length));
  }

  const isValid = errors.length === 0 && hasEntry && hasBoss && allRoomsReachable;

  return {
    isValid,
    allRoomsReachable,
    hasEntry,
    hasBoss,
    unreachableRooms,
    errors,
  };
}

function computeReachableRooms(
  layout: DungeonLayout,
  startRoomId: string,
  reachable: Set<string>,
): void {
  const queue = [startRoomId];
  reachable.add(startRoomId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    for (const conn of layout.connections) {
      if (conn.fromRoomId === current && !reachable.has(conn.toRoomId)) {
        reachable.add(conn.toRoomId);
        queue.push(conn.toRoomId);
      }
      if (conn.bidirectional && conn.toRoomId === current && !reachable.has(conn.fromRoomId)) {
        reachable.add(conn.fromRoomId);
        queue.push(conn.fromRoomId);
      }
    }
  }
}

export function getLayout(
  state: DungeonGeneratorState,
  layoutId: string,
): DungeonLayout | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }
  return layout;
}

export function scaleDifficulty(
  state: DungeonGeneratorState,
  layoutId: string,
  newTier: DifficultyTier,
): 'ok' | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  if (newTier < 0 || newTier > 5) {
    return 'invalid-difficulty';
  }

  const updatedRooms = new Map<string, DungeonRoom>();

  for (const [roomId, room] of layout.rooms) {
    const newBudget = calculateEnemyBudget(room.type, room.area, newTier);
    const updatedRoom: DungeonRoom = {
      ...room,
      difficultyTier: newTier,
      enemyBudget: newBudget,
    };
    updatedRooms.set(roomId, updatedRoom);
  }

  const updatedLayout: DungeonLayout = {
    ...layout,
    rooms: updatedRooms,
    difficultyTier: newTier,
  };

  state.layouts.set(layoutId, updatedLayout);
  state.logger.info('Scaled difficulty for layout: ' + layoutId);

  return 'ok';
}

export function getRoomsByType(
  state: DungeonGeneratorState,
  layoutId: string,
  type: RoomType,
): DungeonRoom[] | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  const rooms: DungeonRoom[] = [];
  for (const room of layout.rooms.values()) {
    if (room.type === type) {
      rooms.push(room);
    }
  }

  return rooms;
}

export function getPathBetween(
  state: DungeonGeneratorState,
  layoutId: string,
  fromRoomId: string,
  toRoomId: string,
): string[] | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  const fromRoom = layout.rooms.get(fromRoomId);
  if (fromRoom === undefined) {
    return 'room-not-found';
  }

  const toRoom = layout.rooms.get(toRoomId);
  if (toRoom === undefined) {
    return 'room-not-found';
  }

  const path = findPath(layout, fromRoomId, toRoomId);
  if (path === null) {
    return 'room-not-reachable';
  }

  return path;
}

function findPath(layout: DungeonLayout, fromRoomId: string, toRoomId: string): string[] | null {
  const queue: Array<{ roomId: string; path: string[] }> = [
    { roomId: fromRoomId, path: [fromRoomId] },
  ];
  const visited = new Set<string>([fromRoomId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    if (current.roomId === toRoomId) {
      return current.path;
    }

    for (const conn of layout.connections) {
      if (conn.fromRoomId === current.roomId && !visited.has(conn.toRoomId)) {
        visited.add(conn.toRoomId);
        queue.push({
          roomId: conn.toRoomId,
          path: [...current.path, conn.toRoomId],
        });
      }

      if (conn.bidirectional && conn.toRoomId === current.roomId && !visited.has(conn.fromRoomId)) {
        visited.add(conn.fromRoomId);
        queue.push({
          roomId: conn.fromRoomId,
          path: [...current.path, conn.fromRoomId],
        });
      }
    }
  }

  return null;
}

export function getTotalEnemyBudget(
  state: DungeonGeneratorState,
  layoutId: string,
): number | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  let total = 0;
  for (const room of layout.rooms.values()) {
    total += room.enemyBudget;
  }

  return total;
}

export function getRoom(
  state: DungeonGeneratorState,
  layoutId: string,
  roomId: string,
): DungeonRoom | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  const room = layout.rooms.get(roomId);
  if (room === undefined) {
    return 'room-not-found';
  }

  return room;
}

export function getAdjacentRooms(
  state: DungeonGeneratorState,
  layoutId: string,
  roomId: string,
): string[] | DungeonGeneratorError {
  const layout = state.layouts.get(layoutId);
  if (layout === undefined) {
    return 'layout-not-found';
  }

  const adjacent: string[] = [];

  for (const conn of layout.connections) {
    if (conn.fromRoomId === roomId) {
      adjacent.push(conn.toRoomId);
    }
    if (conn.bidirectional && conn.toRoomId === roomId) {
      adjacent.push(conn.fromRoomId);
    }
  }

  return adjacent;
}
