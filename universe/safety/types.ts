/**
 * Koydo Universe — Safety & COPPA Compliance Types
 *
 * COPPA compliance is not optional. It is a legal requirement.
 * Every data decision starts from: "is this legal for children under 13?"
 */

// ─── Parent Account ────────────────────────────────────────────────

export interface ParentAccount {
  readonly id: string;
  readonly email: string;
  readonly hashedPassword: string;
  readonly consentVerified: boolean;
  readonly consentVerifiedAt: number | null;
  readonly consentMethod: ConsentMethod | null;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly childProfiles: readonly string[];     // KindlerProfile IDs
  readonly timeControls: TimeControls;
  readonly createdAt: number;
}

export type ConsentMethod =
  | 'credit_card_verification'    // Small charge + refund
  | 'government_id'               // ID-based verification
  | 'signed_form'                 // Physical signed form
  | 'knowledge_based';            // Knowledge-based Q&A

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

// ─── Time Controls ─────────────────────────────────────────────────

export interface TimeControls {
  readonly maxDailyMinutes: 15 | 30 | 45 | 60 | null;  // null = unlimited
  readonly bedtimeCutoff: string | null;                 // HH:mm format
  readonly notificationsEnabled: boolean;
}

// ─── AI Conversation Safety ────────────────────────────────────────

export interface AiConversationSession {
  readonly id: string;
  readonly kindlerId: string;
  readonly characterId: string;
  readonly worldId: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly turnCount: number;
  readonly autoDeleteAt: number;    // 24hrs after session end — no PII retention
}

// ─── Content Moderation ────────────────────────────────────────────

export type ContentRating = 'approved' | 'flagged' | 'blocked';

export interface ContentModerationResult {
  readonly contentId: string;
  readonly contentType: 'entry' | 'ai_response' | 'user_input';
  readonly rating: ContentRating;
  readonly flags: readonly ModerationFlag[];
  readonly reviewedAt: number;
  readonly reviewedBy: 'automated' | 'human';
}

export type ModerationFlag =
  | 'age_inappropriate'
  | 'violence'
  | 'pii_detected'
  | 'advertising'
  | 'external_link'
  | 'cultural_sensitivity'
  | 'factual_accuracy';

// ─── COPPA Compliance Checklist (enforced in code) ─────────────────

/**
 * COPPA Requirements:
 * 1. No personal data collection from children without verifiable parental consent
 * 2. AI conversations are NOT stored with PII — ephemeral, auto-deleted after 24hrs
 * 3. No behavioral advertising. No third-party analytics tracking individual children
 * 4. Parent creates the account. Child accesses via sub-profile with restricted permissions
 * 5. All data stored with encryption at rest (AES-256)
 * 6. Annual COPPA compliance audit — document the audit trail
 *
 * Additional:
 * - EU GDPR-K compliance
 * - UK Age Appropriate Design Code compliance
 */
