import type { FastifyAppLike } from '@loom/selvage';
import type { SaveGameSystem, SaveData } from '../../fabrics/loom-core/src/save-game.js';

interface Deps {
  saveGame: SaveGameSystem;
}

function serializeSave(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeSave);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeSave(val)]),
    );
  }
  return v;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerSaveGameRoutes(app: FastifyAppLike, deps: Deps): void {
  const { saveGame } = deps;

  // Register player
  app.post('/v1/save-game/players/:playerId/register', (req, reply) => {
    const { playerId } = r(req).params;
    const result = saveGame.registerPlayer(playerId);
    if (!result.success) {
      const code = result.error === 'already-registered' ? 409 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, playerId });
  });

  // List slots for player
  app.get('/v1/save-game/players/:playerId/slots', (req, reply) => {
    const { playerId } = r(req).params;
    const slots = saveGame.listSlots(playerId);
    return reply.send({ ok: true, slots: serializeSave(slots) });
  });

  // Player summary
  app.get('/v1/save-game/players/:playerId/summary', (req, reply) => {
    const { playerId } = r(req).params;
    const summary = saveGame.getSummary(playerId);
    if (summary === undefined) {
      return reply.code(404).send({ ok: false, error: 'player-not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, summary: serializeSave(summary) });
  });

  // Create slot
  app.post('/v1/save-game/players/:playerId/slots', (req, reply) => {
    const { playerId } = r(req).params;
    const b = r(req).body;
    const name = typeof b['name'] === 'string' ? b['name'] : '';
    const result = saveGame.createSlot(playerId, name);
    if (typeof result === 'string') {
      const code = result === 'player-not-found' ? 404 : result === 'max-slots-exceeded' ? 422 : 422;
      return reply.code(code).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, slot: serializeSave(result) });
  });

  // Delete slot
  app.delete('/v1/save-game/slots/:slotId', (req, reply) => {
    const { slotId } = r(req).params;
    const result = saveGame.deleteSlot(slotId);
    if (!result.success) {
      return reply.code(404).send({ ok: false, error: result.error, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, deleted: true, slotId });
  });

  // Save state
  app.post('/v1/save-game/slots/:slotId/saves', (req, reply) => {
    const { slotId } = r(req).params;
    const b = r(req).body;
    const data = (b['data'] ?? {}) as SaveData;
    const result = saveGame.saveState(slotId, data);
    if (typeof result === 'string') {
      const code = result === 'slot-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, save: serializeSave(result) });
  });

  // Load latest save for a slot
  app.get('/v1/save-game/slots/:slotId/saves/latest', (req, reply) => {
    const { slotId } = r(req).params;
    const result = saveGame.loadLatest(slotId);
    if (typeof result === 'string') {
      const code = result === 'slot-not-found' || result === 'save-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, save: serializeSave(result) });
  });

  // List saves in a slot
  app.get('/v1/save-game/slots/:slotId/saves', (req, reply) => {
    const { slotId } = r(req).params;
    const saves = saveGame.listSaves(slotId);
    return reply.send({ ok: true, total: saves.length, saves: serializeSave(saves) });
  });

  // Get a specific save
  app.get('/v1/save-game/saves/:saveId', (req, reply) => {
    const { saveId } = r(req).params;
    const save = saveGame.getSave(saveId);
    if (save === undefined) {
      return reply.code(404).send({ ok: false, error: 'save-not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, save: serializeSave(save) });
  });
}
