import { describe, it, expect } from 'vitest';
import { createLocalizationEngine } from '../localization-engine.js';
import type {
  LocalizationEngineDeps,
  TranslationEntry,
  SupportedLocale,
  CommunitySubmission,
  SubmissionStatus,
  TranslationNamespace,
} from '../localization-engine.js';

interface MemoryStore {
  readonly translations: Map<string, TranslationEntry>;
  readonly submissions: Map<string, CommunitySubmission>;
}

function tKey(key: string, locale: SupportedLocale): string {
  return `${locale}::${key}`;
}

function makeDeps(overrides: { enableLlm?: boolean } = {}): {
  deps: LocalizationEngineDeps;
  memory: MemoryStore;
  emitted: ReadonlyArray<{ readonly type: string }>;
} {
  const memory: MemoryStore = {
    translations: new Map(),
    submissions: new Map(),
  };

  let now = 1_000n;
  let idCounter = 0;
  const emitted: Array<{ readonly type: string }> = [];

  const deps: LocalizationEngineDeps = {
    clock: { now: () => {
      now += 1n;
      return now;
    } },
    ids: { next: () => {
      idCounter += 1;
      return `submission-${String(idCounter)}`;
    } },
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: {
      emit: (event) => {
        const payload = event as unknown as { readonly type: string };
        emitted.push({ type: payload.type });
      },
    },
    store: {
      saveTranslation: async (entry) => {
        memory.translations.set(tKey(entry.key, entry.locale), entry);
      },
      getTranslation: async (key, locale) => memory.translations.get(tKey(key, locale)),
      listTranslations: async (locale, namespace) => {
        const rows: TranslationEntry[] = [];
        for (const entry of memory.translations.values()) {
          if (entry.locale === locale && entry.namespace === namespace) rows.push(entry);
        }
        return rows;
      },
      saveCommunitySubmission: async (submission) => {
        memory.submissions.set(submission.id, submission);
      },
      getCommunitySubmissions: async (locale, status) => {
        const rows: CommunitySubmission[] = [];
        for (const submission of memory.submissions.values()) {
          if (submission.locale === locale && submission.status === status) rows.push(submission);
        }
        return rows;
      },
    },
    llm: {
      translate: async (text, fromLocale, toLocale) => `${text} [${fromLocale}->${toLocale}]`,
      synthesizeSpeech: async (text) => new TextEncoder().encode(text),
    },
  };

  void overrides;
  return { deps, memory, emitted };
}

describe('Localization Engine Simulation', () => {
  it('formats translation with interpolation and plural form', async () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps);

    await engine.setTranslation({
      key: 'ui.items',
      locale: 'en',
      namespace: 'ui',
      value: '{count} items',
      pluralForms: {
        one: '{count} item',
        other: '{count} items',
      },
    });

    const one = await engine.formatMessage('ui.items', 'en', { count: 1 });
    const many = await engine.formatMessage('ui.items', 'en', { count: 2 });

    expect(one.formatted).toBe(true);
    expect(one.text).toBe('1 item');
    expect(many.text).toBe('2 items');
  });

  it('uses fallback locale when requested locale is missing', async () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps, { fallbackChain: ['en'] });

    await engine.setTranslation({
      key: 'system.hello',
      locale: 'en',
      namespace: 'system',
      value: 'Hello traveler',
    });

    const translated = await engine.getTranslation('system.hello', 'fr');
    expect(translated?.locale).toBe('en');
    expect(translated?.value).toBe('Hello traveler');
  });

  it('increments translation version and emits update event', async () => {
    const { deps, emitted } = makeDeps();
    const engine = createLocalizationEngine(deps);

    const first = await engine.setTranslation({
      key: 'quest.start',
      locale: 'en',
      namespace: 'quest',
      value: 'Begin',
    });
    const second = await engine.setTranslation({
      key: 'quest.start',
      locale: 'en',
      namespace: 'quest',
      value: 'Start Quest',
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(emitted.some((e) => e.type === 'localization.translation-updated')).toBe(true);
  });

  it('submits and approves community translation after threshold', async () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps, { communityApprovalThreshold: 2 });

    const submission = await engine.submitCommunityTranslation(
      'player-1',
      'lore.city-name',
      'en',
      'lore',
      'Ciudad Eterna',
    );

    const firstReview = await engine.reviewSubmission(submission.id, true, 'Looks good');
    expect(firstReview.status).toBe('pending');

    const secondReview = await engine.reviewSubmission(submission.id, true, 'Approved');
    expect(secondReview.status).toBe('approved');

    const translated = await engine.getTranslation('lore.city-name', 'en');
    expect(translated?.value).toBe('Ciudad Eterna');
  });

  it('returns cultural formatting and direction conventions', () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps);

    expect(engine.formatNumber(1234.5, 'de')).toBe('1.234,50');
    expect(engine.formatDate(new Date(2026, 2, 12), 'en')).toBe('03/12/2026');
    expect(engine.formatCurrency(99.5, 'en')).toBe('K99.50');
    expect(engine.getTextDirection('ar')).toBe('rtl');
    expect(engine.getTextDirection('en')).toBe('ltr');
  });

  it('limits pending submissions by configured batch size', async () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps, { maxCommunityBatchSize: 2 });

    for (let i = 0; i < 4; i++) {
      await engine.submitCommunityTranslation(
        `player-${String(i)}`,
        `ui.label.${String(i)}`,
        'fr',
        'ui',
        `Valeur ${String(i)}`,
      );
    }

    const pending = await engine.getPendingSubmissions('fr');
    expect(pending).toHaveLength(2);
  });

  it('throws when LLM translation is disabled', async () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps, { enableLlmTranslation: false });

    await expect(engine.translateNpcDialogue('Hello', 'en', 'es')).rejects.toThrow(
      'LLM translation is disabled',
    );
  });

  it('computes per-locale coverage and aggregate stats', async () => {
    const { deps } = makeDeps();
    const engine = createLocalizationEngine(deps);

    const namespaces: readonly TranslationNamespace[] = [
      'ui',
      'npc-dialogue',
      'quest',
      'item',
      'lore',
      'achievement',
      'system',
      'remembrance',
    ];

    for (const ns of namespaces) {
      await engine.setTranslation({
        key: `${ns}.k1`,
        locale: 'en',
        namespace: ns,
        value: `${ns}-value`,
      });
    }

    await engine.setTranslation({
      key: 'ui.k1',
      locale: 'es',
      namespace: 'ui',
      value: 'valor-ui',
    });

    const esCoverage = await engine.getCoverage('es');
    const stats = await engine.getStats();

    expect(esCoverage.totalKeys).toBe(8);
    expect(esCoverage.translatedKeys).toBe(1);
    expect(esCoverage.coveragePercent).toBe(13);
    expect(stats.totalLocales).toBe(12);
    expect(stats.coverageByLocale.length).toBe(12);
  });
});
