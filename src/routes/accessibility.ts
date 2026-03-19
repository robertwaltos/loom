/**
 * Accessibility Routes — WCAG-aligned player accessibility settings.
 *
 * GET  /v1/accessibility/presets                     — All built-in presets
 * GET  /v1/accessibility/:playerId                   — Full profile summary
 * GET  /v1/accessibility/:playerId/text-scale        — Text scale profile
 * GET  /v1/accessibility/:playerId/contrast          — Contrast profile
 * GET  /v1/accessibility/:playerId/cognitive         — Cognitive profile
 * POST /v1/accessibility/:playerId/text-scale        — Set text scale (0.5–2.0)
 * POST /v1/accessibility/:playerId/contrast          — Set contrast mode
 * POST /v1/accessibility/:playerId/cognitive         — Set cognitive level
 * POST /v1/accessibility/:playerId/preset/:presetId  — Apply a built-in preset
 *
 * Thread: silk/accessibility
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { AccessibilityEngine, AccStorePort, ContrastMode, CognitiveLevel } from '../../fabrics/loom-core/src/accessibility-system.js';
import { CONTRAST_MODES, COGNITIVE_LEVELS, TEXT_SCALE_MIN, TEXT_SCALE_MAX } from '../../fabrics/loom-core/src/accessibility-system.js';

export interface AccessibilityRoutesDeps {
  readonly accessibilityEngine: AccessibilityEngine;
  readonly accessibilityStore: AccStorePort;
}

export function registerAccessibilityRoutes(app: FastifyAppLike, deps: AccessibilityRoutesDeps): void {
  const { accessibilityEngine, accessibilityStore } = deps;

  // GET /v1/accessibility/presets — must register before /:playerId
  app.get('/v1/accessibility/presets', async (_req, reply) => {
    const presets = accessibilityEngine.getPresets();
    return reply.send({ ok: true, presets, total: presets.length });
  });

  // GET /v1/accessibility/:playerId — all three profiles at once
  app.get('/v1/accessibility/:playerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });
    }
    const [text, contrast, cognitive] = await Promise.all([
      accessibilityStore.getTextScaleProfile(playerId),
      accessibilityStore.getHighContrastProfile(playerId),
      accessibilityStore.getCognitiveProfile(playerId),
    ]);
    return reply.send({ ok: true, playerId, text: text ?? null, contrast: contrast ?? null, cognitive: cognitive ?? null });
  });

  // GET /v1/accessibility/:playerId/text-scale
  app.get('/v1/accessibility/:playerId/text-scale', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });
    const profile = await accessibilityStore.getTextScaleProfile(playerId);
    if (profile === undefined) return reply.code(404).send({ ok: false, error: 'No text scale profile', code: 'NOT_FOUND' });
    return reply.send({ ok: true, profile });
  });

  // GET /v1/accessibility/:playerId/contrast
  app.get('/v1/accessibility/:playerId/contrast', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });
    const profile = await accessibilityStore.getHighContrastProfile(playerId);
    if (profile === undefined) return reply.code(404).send({ ok: false, error: 'No contrast profile', code: 'NOT_FOUND' });
    return reply.send({ ok: true, profile });
  });

  // GET /v1/accessibility/:playerId/cognitive
  app.get('/v1/accessibility/:playerId/cognitive', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });
    const profile = await accessibilityStore.getCognitiveProfile(playerId);
    if (profile === undefined) return reply.code(404).send({ ok: false, error: 'No cognitive profile', code: 'NOT_FOUND' });
    return reply.send({ ok: true, profile });
  });

  // POST /v1/accessibility/:playerId/preset/:presetId — must register before /:playerId/text-scale
  app.post('/v1/accessibility/:playerId/preset/:presetId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    const presetId = typeof params['presetId'] === 'string' ? params['presetId'] : null;
    if (playerId === null || presetId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid playerId or presetId', code: 'INVALID_INPUT' });
    }
    const result = await accessibilityEngine.applyPreset(playerId, presetId);
    if (result === undefined) {
      return reply.code(404).send({ ok: false, error: `Preset '${presetId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, playerId, presetId, ...result });
  });

  // POST /v1/accessibility/:playerId/text-scale — body: { scale: number }
  app.post('/v1/accessibility/:playerId/text-scale', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });

    const scale = typeof body === 'object' && body !== null && 'scale' in body
      ? Number((body as Record<string, unknown>)['scale'])
      : NaN;
    if (isNaN(scale) || scale < TEXT_SCALE_MIN || scale > TEXT_SCALE_MAX) {
      return reply.code(400).send({
        ok: false,
        error: `scale must be between ${TEXT_SCALE_MIN} and ${TEXT_SCALE_MAX}`,
        code: 'INVALID_INPUT',
      });
    }
    const profile = await accessibilityEngine.setTextScale(playerId, scale);
    return reply.send({ ok: true, profile });
  });

  // POST /v1/accessibility/:playerId/contrast — body: { mode: ContrastMode }
  app.post('/v1/accessibility/:playerId/contrast', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });

    const mode = typeof body === 'object' && body !== null && 'mode' in body
      ? (body as Record<string, unknown>)['mode']
      : null;
    if (typeof mode !== 'string' || !(CONTRAST_MODES as readonly string[]).includes(mode)) {
      return reply.code(400).send({
        ok: false,
        error: `mode must be one of: ${CONTRAST_MODES.join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    const profile = await accessibilityEngine.setContrastMode(playerId, mode as ContrastMode);
    return reply.send({ ok: true, profile });
  });

  // POST /v1/accessibility/:playerId/cognitive — body: { level: CognitiveLevel }
  app.post('/v1/accessibility/:playerId/cognitive', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    if (playerId === null) return reply.code(400).send({ ok: false, error: 'Invalid playerId', code: 'INVALID_INPUT' });

    const level = typeof body === 'object' && body !== null && 'level' in body
      ? (body as Record<string, unknown>)['level']
      : null;
    if (typeof level !== 'string' || !(COGNITIVE_LEVELS as readonly string[]).includes(level)) {
      return reply.code(400).send({
        ok: false,
        error: `level must be one of: ${COGNITIVE_LEVELS.join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    const profile = await accessibilityEngine.setCognitiveLevel(playerId, level as CognitiveLevel);
    return reply.send({ ok: true, profile });
  });
}
