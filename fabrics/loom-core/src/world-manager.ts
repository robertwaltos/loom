/**
 * World Manager — World lifecycle management.
 *
 * Tracks active worlds, their state, and entity membership.
 * Each world ticks independently (The Loom's temporal control).
 */

import type { EventBus } from '@loom/events-contracts';
import type { EventFactory, EventSource } from './event-factory.js';
import { worldNotFound, worldAlreadyExists, worldCapacityReached } from './errors.js';

export type WorldState = 'loading' | 'active' | 'draining' | 'unloaded';

export interface WorldInfo {
  readonly worldId: string;
  readonly serverId: string;
  readonly state: WorldState;
  readonly playerCapacity: number;
  readonly currentPlayerCount: number;
  readonly createdAt: number;
}

export interface WorldManager {
  loadWorld(worldId: string, serverId: string, playerCapacity: number): void;
  unloadWorld(worldId: string, reason: 'empty' | 'shutdown' | 'error'): void;
  getWorld(worldId: string): WorldInfo;
  tryGetWorld(worldId: string): WorldInfo | undefined;
  listWorlds(): ReadonlyArray<WorldInfo>;
  incrementPlayers(worldId: string): void;
  decrementPlayers(worldId: string): void;
  isWorldReady(worldId: string): boolean;
}

interface ManagerState {
  readonly worlds: Map<string, Mutable<WorldInfo>>;
  readonly eventBus: EventBus;
  readonly eventFactory: EventFactory;
  readonly clock: { nowMicroseconds(): number };
}

const FABRIC_ID = 'loom-core';

export function createWorldManager(deps: Omit<ManagerState, 'worlds'>): WorldManager {
  const state: ManagerState = { ...deps, worlds: new Map() };

  return {
    loadWorld: (wid, sid, cap) => {
      loadWorldImpl(state, wid, sid, cap);
    },
    unloadWorld: (wid, reason) => {
      unloadWorldImpl(state, wid, reason);
    },
    getWorld: (wid) => getWorldImpl(state, wid),
    tryGetWorld: (wid) => state.worlds.get(wid),
    listWorlds: () => [...state.worlds.values()],
    incrementPlayers: (wid) => {
      incrementPlayersImpl(state, wid);
    },
    decrementPlayers: (wid) => {
      decrementPlayersImpl(state, wid);
    },
    isWorldReady: (wid) => state.worlds.get(wid)?.state === 'active',
  };
}

function loadWorldImpl(
  state: ManagerState,
  worldId: string,
  serverId: string,
  playerCapacity: number,
): void {
  if (state.worlds.has(worldId)) throw worldAlreadyExists(worldId);

  state.worlds.set(worldId, {
    worldId,
    serverId,
    state: 'active',
    playerCapacity,
    currentPlayerCount: 0,
    createdAt: state.clock.nowMicroseconds(),
  });
  emitWorldEvent(state, 'world.loaded', worldId, { worldId, serverId, playerCapacity });
}

function unloadWorldImpl(
  state: ManagerState,
  worldId: string,
  reason: 'empty' | 'shutdown' | 'error',
): void {
  if (!state.worlds.has(worldId)) throw worldNotFound(worldId);
  state.worlds.delete(worldId);
  emitWorldEvent(state, 'world.unloaded', worldId, { worldId, reason });
}

function getWorldImpl(state: ManagerState, worldId: string): WorldInfo {
  const world = state.worlds.get(worldId);
  if (world === undefined) throw worldNotFound(worldId);
  return world;
}

function incrementPlayersImpl(state: ManagerState, worldId: string): void {
  const world = getMutableWorld(state, worldId);
  if (world.currentPlayerCount >= world.playerCapacity) {
    throw worldCapacityReached(worldId, world.playerCapacity);
  }
  world.currentPlayerCount += 1;
}

function decrementPlayersImpl(state: ManagerState, worldId: string): void {
  const world = getMutableWorld(state, worldId);
  if (world.currentPlayerCount > 0) world.currentPlayerCount -= 1;
}

function getMutableWorld(state: ManagerState, worldId: string): Mutable<WorldInfo> {
  const world = state.worlds.get(worldId);
  if (world === undefined) throw worldNotFound(worldId);
  return world;
}

function emitWorldEvent(
  state: ManagerState,
  type: string,
  worldId: string,
  payload: Record<string, unknown>,
): void {
  const source: EventSource = { worldId, fabricId: FABRIC_ID };
  state.eventBus.publish(state.eventFactory.create(type, payload, source));
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
