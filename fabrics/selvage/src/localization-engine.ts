/**
 * Localization Engine — i18n, translation, cultural adaptation.
 *
 *   - ICU message format: pluralization, date/number formatting
 *   - 12 launch languages: EN, ES, PT, FR, DE, IT, JP, KO, ZH-CN, ZH-TW, RU, AR
 *   - Dynamic NPC dialogue translation via LLM
 *   - Community translation platform: crowdsourcing with review workflow
 *   - Cultural adaptation: region-specific content/style
 *   - Right-to-left UI support for Arabic
 *   - Voice localization: NPC speech synthesis per language
 *   - Remembrance translation: historical records in all languages
 *
 * "Every voice heard in its native tongue."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface LocalizationClockPort {
  readonly now: () => bigint;
}

export interface LocalizationIdPort {
  readonly next: () => string;
}

export interface LocalizationLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface LocalizationEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface TranslationStorePort {
  readonly saveTranslation: (entry: TranslationEntry) => Promise<void>;
  readonly getTranslation: (key: string, locale: SupportedLocale) => Promise<TranslationEntry | undefined>;
  readonly listTranslations: (locale: SupportedLocale, namespace: string) => Promise<readonly TranslationEntry[]>;
  readonly saveCommunitySubmission: (submission: CommunitySubmission) => Promise<void>;
  readonly getCommunitySubmissions: (locale: SupportedLocale, status: SubmissionStatus) => Promise<readonly CommunitySubmission[]>;
}

export interface LlmTranslationPort {
  readonly translate: (text: string, fromLocale: SupportedLocale, toLocale: SupportedLocale, context?: string) => Promise<string>;
  readonly synthesizeSpeech: (text: string, locale: SupportedLocale, voiceId: string) => Promise<Uint8Array>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = [
  'en', 'es', 'pt', 'fr', 'de', 'it',
  'ja', 'ko', 'zh-CN', 'zh-TW', 'ru', 'ar',
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const RTL_LOCALES: readonly SupportedLocale[] = ['ar'] as const;

export const DEFAULT_LOCALE: SupportedLocale = 'en';

const MAX_TRANSLATION_KEY_LENGTH = 256;
const MAX_TRANSLATION_VALUE_LENGTH = 10_000;
const MAX_COMMUNITY_REVIEW_BATCH = 50;
const SUBMISSION_APPROVAL_THRESHOLD = 3;
const MAX_NAMESPACE_DEPTH = 5;
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

// ─── Types ──────────────────────────────────────────────────────────

export type PluralCategory = typeof PLURAL_CATEGORIES[number];

export type TextDirection = 'ltr' | 'rtl';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type TranslationNamespace =
  | 'ui'
  | 'npc-dialogue'
  | 'quest'
  | 'item'
  | 'lore'
  | 'achievement'
  | 'system'
  | 'remembrance';

export interface TranslationEntry {
  readonly key: string;
  readonly locale: SupportedLocale;
  readonly namespace: TranslationNamespace;
  readonly value: string;
  readonly pluralForms?: Readonly<Partial<Record<PluralCategory, string>>>;
  readonly context?: string;
  readonly updatedAt: bigint;
  readonly version: number;
}

export interface IcuFormatOptions {
  readonly locale: SupportedLocale;
  readonly values: Readonly<Record<string, string | number | Date>>;
}

export interface FormattedMessage {
  readonly key: string;
  readonly locale: SupportedLocale;
  readonly text: string;
  readonly direction: TextDirection;
  readonly formatted: boolean;
}

export interface CommunitySubmission {
  readonly id: string;
  readonly key: string;
  readonly locale: SupportedLocale;
  readonly namespace: TranslationNamespace;
  readonly suggestedValue: string;
  readonly submittedBy: string;
  readonly submittedAt: bigint;
  readonly status: SubmissionStatus;
  readonly approvals: number;
  readonly rejections: number;
  readonly reviewerNotes?: string;
}

export interface CulturalProfile {
  readonly locale: SupportedLocale;
  readonly direction: TextDirection;
  readonly dateFormat: string;
  readonly numberFormat: NumberFormatConfig;
  readonly currencySymbol: string;
  readonly currencyPosition: 'prefix' | 'suffix';
  readonly pluralRules: readonly PluralCategory[];
  readonly honorificStyle: 'none' | 'formal' | 'hierarchical';
  readonly colorSymbolism?: Readonly<Record<string, string>>;
}

export interface NumberFormatConfig {
  readonly decimalSeparator: string;
  readonly thousandsSeparator: string;
  readonly decimalPlaces: number;
}

export interface VoiceLocalization {
  readonly locale: SupportedLocale;
  readonly voiceId: string;
  readonly npcId: string;
  readonly text: string;
  readonly audioData: Uint8Array;
  readonly durationMs: number;
  readonly generatedAt: bigint;
}

export interface TranslationCoverage {
  readonly locale: SupportedLocale;
  readonly totalKeys: number;
  readonly translatedKeys: number;
  readonly coveragePercent: number;
  readonly missingNamespaces: readonly TranslationNamespace[];
  readonly staleKeys: number;
}

export interface LocalizationStats {
  readonly totalLocales: number;
  readonly totalKeys: number;
  readonly averageCoverage: number;
  readonly pendingSubmissions: number;
  readonly coverageByLocale: readonly TranslationCoverage[];
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface LocalizationEngineDeps {
  readonly clock: LocalizationClockPort;
  readonly ids: LocalizationIdPort;
  readonly log: LocalizationLogPort;
  readonly events: LocalizationEventPort;
  readonly store: TranslationStorePort;
  readonly llm: LlmTranslationPort;
}

export interface LocalizationEngineConfig {
  readonly defaultLocale: SupportedLocale;
  readonly fallbackChain: readonly SupportedLocale[];
  readonly communityApprovalThreshold: number;
  readonly maxCommunityBatchSize: number;
  readonly enableLlmTranslation: boolean;
  readonly cacheMaxSize: number;
}

const DEFAULT_CONFIG: LocalizationEngineConfig = {
  defaultLocale: 'en',
  fallbackChain: ['en'],
  communityApprovalThreshold: SUBMISSION_APPROVAL_THRESHOLD,
  maxCommunityBatchSize: MAX_COMMUNITY_REVIEW_BATCH,
  enableLlmTranslation: true,
  cacheMaxSize: 10_000,
};

// ─── Cultural Profiles ──────────────────────────────────────────────

const CULTURAL_PROFILES: ReadonlyMap<SupportedLocale, CulturalProfile> = new Map([
  ['en', {
    locale: 'en', direction: 'ltr', dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'prefix',
    pluralRules: ['one', 'other'], honorificStyle: 'none',
  }],
  ['es', {
    locale: 'es', direction: 'ltr', dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['one', 'other'], honorificStyle: 'formal',
  }],
  ['pt', {
    locale: 'pt', direction: 'ltr', dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['one', 'other'], honorificStyle: 'formal',
  }],
  ['fr', {
    locale: 'fr', direction: 'ltr', dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: ' ', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['one', 'other'], honorificStyle: 'formal',
  }],
  ['de', {
    locale: 'de', direction: 'ltr', dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['one', 'other'], honorificStyle: 'formal',
  }],
  ['it', {
    locale: 'it', direction: 'ltr', dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['one', 'other'], honorificStyle: 'formal',
  }],
  ['ja', {
    locale: 'ja', direction: 'ltr', dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 0 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['other'], honorificStyle: 'hierarchical',
  }],
  ['ko', {
    locale: 'ko', direction: 'ltr', dateFormat: 'YYYY.MM.DD',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 0 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['other'], honorificStyle: 'hierarchical',
  }],
  ['zh-CN', {
    locale: 'zh-CN', direction: 'ltr', dateFormat: 'YYYY-MM-DD',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['other'], honorificStyle: 'hierarchical',
  }],
  ['zh-TW', {
    locale: 'zh-TW', direction: 'ltr', dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['other'], honorificStyle: 'hierarchical',
  }],
  ['ru', {
    locale: 'ru', direction: 'ltr', dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimalSeparator: ',', thousandsSeparator: ' ', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['one', 'few', 'many', 'other'], honorificStyle: 'formal',
  }],
  ['ar', {
    locale: 'ar', direction: 'rtl', dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
    currencySymbol: 'K', currencyPosition: 'suffix',
    pluralRules: ['zero', 'one', 'two', 'few', 'many', 'other'], honorificStyle: 'hierarchical',
    colorSymbolism: { mourning: 'white', celebration: 'green' },
  }],
]);

// ─── Engine ─────────────────────────────────────────────────────────

export interface LocalizationEngine {
  /** Format a message with ICU-style placeholder interpolation & pluralization. */
  readonly formatMessage: (key: string, locale: SupportedLocale, values?: Readonly<Record<string, string | number>>) => Promise<FormattedMessage>;

  /** Get raw translation with fallback chain. */
  readonly getTranslation: (key: string, locale: SupportedLocale) => Promise<TranslationEntry | undefined>;

  /** Set or update a translation entry. */
  readonly setTranslation: (entry: Omit<TranslationEntry, 'updatedAt' | 'version'>) => Promise<TranslationEntry>;

  /** Translate NPC dialogue dynamically via LLM. */
  readonly translateNpcDialogue: (text: string, fromLocale: SupportedLocale, toLocale: SupportedLocale, npcName?: string) => Promise<string>;

  /** Submit a community translation for review. */
  readonly submitCommunityTranslation: (playerId: string, key: string, locale: SupportedLocale, namespace: TranslationNamespace, value: string) => Promise<CommunitySubmission>;

  /** Review community submissions (approve/reject). */
  readonly reviewSubmission: (submissionId: string, approve: boolean, reviewerNotes?: string) => Promise<CommunitySubmission>;

  /** Get pending community submissions for a locale. */
  readonly getPendingSubmissions: (locale: SupportedLocale) => Promise<readonly CommunitySubmission[]>;

  /** Get cultural profile for a locale. */
  readonly getCulturalProfile: (locale: SupportedLocale) => CulturalProfile;

  /** Format a number according to locale conventions. */
  readonly formatNumber: (value: number, locale: SupportedLocale) => string;

  /** Format a date according to locale conventions. */
  readonly formatDate: (date: Date, locale: SupportedLocale) => string;

  /** Format currency (KALON) according to locale. */
  readonly formatCurrency: (amount: number, locale: SupportedLocale) => string;

  /** Get text direction for a locale. */
  readonly getTextDirection: (locale: SupportedLocale) => TextDirection;

  /** Synthesize NPC voice for a locale. */
  readonly synthesizeVoice: (npcId: string, text: string, locale: SupportedLocale, voiceId: string) => Promise<VoiceLocalization>;

  /** Translate a Remembrance record into a target locale. */
  readonly translateRemembrance: (recordId: string, text: string, toLocale: SupportedLocale) => Promise<TranslationEntry>;

  /** Get translation coverage statistics. */
  readonly getCoverage: (locale: SupportedLocale) => Promise<TranslationCoverage>;

  /** Get overall localization stats. */
  readonly getStats: () => Promise<LocalizationStats>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createLocalizationEngine(
  deps: LocalizationEngineDeps,
  config?: Partial<LocalizationEngineConfig>,
): LocalizationEngine {
  const cfg: LocalizationEngineConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store, llm } = deps;

  const translationCache = new Map<string, TranslationEntry>();

  function cacheKey(key: string, locale: SupportedLocale): string {
    return `${locale}::${key}`;
  }

  function getDirection(locale: SupportedLocale): TextDirection {
    return (RTL_LOCALES as readonly string[]).includes(locale) ? 'rtl' : 'ltr';
  }

  function getProfile(locale: SupportedLocale): CulturalProfile {
    const profile = CULTURAL_PROFILES.get(locale);
    if (!profile) {
      const fallback = CULTURAL_PROFILES.get(cfg.defaultLocale);
      return fallback!;
    }
    return profile;
  }

  function validateKey(key: string): void {
    if (key.length === 0 || key.length > MAX_TRANSLATION_KEY_LENGTH) {
      throw new Error(`Translation key must be 1-${MAX_TRANSLATION_KEY_LENGTH} characters`);
    }
    const depth = key.split('.').length;
    if (depth > MAX_NAMESPACE_DEPTH) {
      throw new Error(`Key depth ${depth} exceeds max ${MAX_NAMESPACE_DEPTH}`);
    }
  }

  function validateValue(value: string): void {
    if (value.length === 0 || value.length > MAX_TRANSLATION_VALUE_LENGTH) {
      throw new Error(`Translation value must be 1-${MAX_TRANSLATION_VALUE_LENGTH} characters`);
    }
  }

  function interpolate(template: string, values: Readonly<Record<string, string | number>>): string {
    let result = template;
    for (const [name, val] of Object.entries(values)) {
      const placeholder = `{${name}}`;
      result = result.split(placeholder).join(String(val));
    }
    return result;
  }

  function selectPlural(
    entry: TranslationEntry,
    count: number,
    locale: SupportedLocale,
  ): string {
    if (!entry.pluralForms) {
      return entry.value;
    }
    const profile = getProfile(locale);
    const category = resolvePluralCategory(count, profile.pluralRules);
    const form = entry.pluralForms[category];
    return form ?? entry.pluralForms.other ?? entry.value;
  }

  function resolvePluralCategory(
    count: number,
    rules: readonly PluralCategory[],
  ): PluralCategory {
    if (rules.includes('zero') && count === 0) return 'zero';
    if (rules.includes('one') && count === 1) return 'one';
    if (rules.includes('two') && count === 2) return 'two';
    if (rules.includes('few') && count >= 3 && count <= 10) return 'few';
    if (rules.includes('many') && count >= 11 && count <= 99) return 'many';
    return 'other';
  }

  async function resolveWithFallback(
    key: string,
    locale: SupportedLocale,
  ): Promise<TranslationEntry | undefined> {
    const cached = translationCache.get(cacheKey(key, locale));
    if (cached) return cached;

    const entry = await store.getTranslation(key, locale);
    if (entry) {
      if (translationCache.size < cfg.cacheMaxSize) {
        translationCache.set(cacheKey(key, locale), entry);
      }
      return entry;
    }

    for (const fallback of cfg.fallbackChain) {
      if (fallback === locale) continue;
      const fallbackEntry = await store.getTranslation(key, fallback);
      if (fallbackEntry) return fallbackEntry;
    }

    return undefined;
  }

  function fmtNumber(value: number, locale: SupportedLocale): string {
    const profile = getProfile(locale);
    const { decimalSeparator, thousandsSeparator, decimalPlaces } = profile.numberFormat;
    const fixed = value.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split('.') as [string, string | undefined];
    const withThousands = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    return decPart ? `${withThousands}${decimalSeparator}${decPart}` : withThousands;
  }

  function fmtDate(date: Date, locale: SupportedLocale): string {
    const profile = getProfile(locale);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return profile.dateFormat
      .replace('DD', dd)
      .replace('MM', mm)
      .replace('YYYY', yyyy);
  }

  function fmtCurrency(amount: number, locale: SupportedLocale): string {
    const profile = getProfile(locale);
    const formatted = fmtNumber(amount, locale);
    return profile.currencyPosition === 'prefix'
      ? `${profile.currencySymbol}${formatted}`
      : `${formatted} ${profile.currencySymbol}`;
  }

  const engine: LocalizationEngine = {
    async formatMessage(key, locale, values) {
      validateKey(key);
      const entry = await resolveWithFallback(key, locale);
      if (!entry) {
        log.warn('Missing translation', { key, locale });
        return {
          key,
          locale,
          text: key,
          direction: getDirection(locale),
          formatted: false,
        };
      }

      let text = entry.value;
      if (values) {
        const countVal = values['count'];
        if (typeof countVal === 'number') {
          text = selectPlural(entry, countVal, locale);
        }
        text = interpolate(text, values);
      }

      return {
        key,
        locale,
        text,
        direction: getDirection(locale),
        formatted: true,
      };
    },

    async getTranslation(key, locale) {
      validateKey(key);
      return resolveWithFallback(key, locale);
    },

    async setTranslation(partial) {
      validateKey(partial.key);
      validateValue(partial.value);

      const existing = await store.getTranslation(partial.key, partial.locale);
      const entry: TranslationEntry = {
        ...partial,
        updatedAt: clock.now(),
        version: existing ? existing.version + 1 : 1,
      };

      await store.saveTranslation(entry);
      translationCache.set(cacheKey(entry.key, entry.locale), entry);

      log.info('Translation updated', {
        key: entry.key,
        locale: entry.locale,
        version: entry.version,
      });
      events.emit({
        type: 'localization.translation-updated',
        payload: { key: entry.key, locale: entry.locale, version: entry.version },
      } as LoomEvent);

      return entry;
    },

    async translateNpcDialogue(text, fromLocale, toLocale, npcName) {
      if (!cfg.enableLlmTranslation) {
        throw new Error('LLM translation is disabled');
      }
      if (fromLocale === toLocale) return text;

      const context = npcName
        ? `NPC "${npcName}" speaking in a fantasy world`
        : 'NPC dialogue in a fantasy world';

      const translated = await llm.translate(text, fromLocale, toLocale, context);

      log.info('NPC dialogue translated', {
        from: fromLocale,
        to: toLocale,
        charCount: text.length,
      });

      return translated;
    },

    async submitCommunityTranslation(playerId, key, locale, namespace, value) {
      validateKey(key);
      validateValue(value);

      const submission: CommunitySubmission = {
        id: ids.next(),
        key,
        locale,
        namespace,
        suggestedValue: value,
        submittedBy: playerId,
        submittedAt: clock.now(),
        status: 'pending',
        approvals: 0,
        rejections: 0,
      };

      await store.saveCommunitySubmission(submission);
      log.info('Community translation submitted', {
        id: submission.id,
        key,
        locale,
        submittedBy: playerId,
      });

      events.emit({
        type: 'localization.community-submission',
        payload: { submissionId: submission.id, key, locale },
      } as LoomEvent);

      return submission;
    },

    async reviewSubmission(submissionId, approve, reviewerNotes) {
      const submissions = await store.getCommunitySubmissions('en' as SupportedLocale, 'pending');
      let submission: CommunitySubmission | undefined;
      for (const s of submissions) {
        if (s.id === submissionId) {
          submission = s;
          break;
        }
      }

      if (!submission) {
        throw new Error(`Submission ${submissionId} not found or not pending`);
      }

      const updatedApprovals = approve ? submission.approvals + 1 : submission.approvals;
      const updatedRejections = approve ? submission.rejections : submission.rejections + 1;

      let status: SubmissionStatus = 'pending';
      if (updatedApprovals >= cfg.communityApprovalThreshold) {
        status = 'approved';
      } else if (updatedRejections >= cfg.communityApprovalThreshold) {
        status = 'rejected';
      }

      const updated: CommunitySubmission = {
        ...submission,
        approvals: updatedApprovals,
        rejections: updatedRejections,
        status,
        reviewerNotes: reviewerNotes ?? submission.reviewerNotes,
      };

      await store.saveCommunitySubmission(updated);

      if (status === 'approved') {
        await engine.setTranslation({
          key: submission.key,
          locale: submission.locale,
          namespace: submission.namespace,
          value: submission.suggestedValue,
        });
        log.info('Community translation approved and applied', {
          id: submissionId,
          key: submission.key,
        });
      }

      return updated;
    },

    async getPendingSubmissions(locale) {
      const submissions = await store.getCommunitySubmissions(locale, 'pending');
      return submissions.slice(0, cfg.maxCommunityBatchSize);
    },

    getCulturalProfile(locale) {
      return getProfile(locale);
    },

    formatNumber(value, locale) {
      return fmtNumber(value, locale);
    },

    formatDate(date, locale) {
      return fmtDate(date, locale);
    },

    formatCurrency(amount, locale) {
      return fmtCurrency(amount, locale);
    },

    getTextDirection(locale) {
      return getDirection(locale);
    },

    async synthesizeVoice(npcId, text, locale, voiceId) {
      const audioData = await llm.synthesizeSpeech(text, locale, voiceId);
      const estimatedDuration = Math.round(text.length * 60);

      const voice: VoiceLocalization = {
        locale,
        voiceId,
        npcId,
        text,
        audioData,
        durationMs: estimatedDuration,
        generatedAt: clock.now(),
      };

      log.info('Voice synthesized', {
        npcId,
        locale,
        voiceId,
        durationMs: estimatedDuration,
      });

      events.emit({
        type: 'localization.voice-synthesized',
        payload: { npcId, locale, voiceId },
      } as LoomEvent);

      return voice;
    },

    async translateRemembrance(recordId, text, toLocale) {
      const translated = await llm.translate(text, cfg.defaultLocale, toLocale, 'Historical archive record');
      const key = `remembrance.${recordId}`;

      const entry = await engine.setTranslation({
        key,
        locale: toLocale,
        namespace: 'remembrance',
        value: translated,
      });

      log.info('Remembrance translated', { recordId, toLocale });
      return entry;
    },

    async getCoverage(locale) {
      const namespaces: TranslationNamespace[] = [
        'ui', 'npc-dialogue', 'quest', 'item', 'lore', 'achievement', 'system', 'remembrance',
      ];

      let totalKeys = 0;
      let translatedKeys = 0;
      const missingNamespaces: TranslationNamespace[] = [];

      for (const ns of namespaces) {
        const enEntries = await store.listTranslations('en', ns);
        const localeEntries = await store.listTranslations(locale, ns);

        totalKeys += enEntries.length;
        translatedKeys += localeEntries.length;

        if (enEntries.length > 0 && localeEntries.length === 0) {
          missingNamespaces.push(ns);
        }
      }

      const staleKeys = 0;
      const coveragePercent = totalKeys > 0
        ? Math.round((translatedKeys / totalKeys) * 100)
        : 0;

      return {
        locale,
        totalKeys,
        translatedKeys,
        coveragePercent,
        missingNamespaces,
        staleKeys,
      };
    },

    async getStats() {
      const coverageByLocale: TranslationCoverage[] = [];
      let totalCoverage = 0;

      for (const locale of SUPPORTED_LOCALES) {
        const coverage = await engine.getCoverage(locale);
        coverageByLocale.push(coverage);
        totalCoverage += coverage.coveragePercent;
      }

      const pendingSubmissions = (await store.getCommunitySubmissions('en', 'pending')).length;
      const averageCoverage = SUPPORTED_LOCALES.length > 0
        ? Math.round(totalCoverage / SUPPORTED_LOCALES.length)
        : 0;

      const firstCoverage = coverageByLocale[0];
      const totalKeys = firstCoverage ? firstCoverage.totalKeys : 0;

      return {
        totalLocales: SUPPORTED_LOCALES.length,
        totalKeys,
        averageCoverage,
        pendingSubmissions,
        coverageByLocale,
      };
    },
  };

  log.info('Localization engine initialized', {
    defaultLocale: cfg.defaultLocale,
    supportedLocales: SUPPORTED_LOCALES.length,
    llmEnabled: cfg.enableLlmTranslation,
  });

  return engine;
}
