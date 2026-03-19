import { describe, it, expect, beforeEach } from 'vitest';
import {
  OKAFOR_LOG_ENTRY_ID,
  OKAFOR_LOG_CHRONICLE_YEAR,
  OKAFOR_LOG_AUTHOR,
  OKAFOR_LOG_AUTHOR_NPC_ID,
  OKAFOR_LOG_V1_4,
  CHIDI_SECRET_DIALOGUE_ID,
  CHIDI_NPC_ID,
  CHIDI_PARTIAL_REVELATION,
  getOkaforLog,
  isOkaforLogEntry,
  getChidiSecretDialogue,
} from '../okafor-log-canonical.js';
import type {
  FoundingChronicleEntry,
  OkaforSecretDialogue,
  FoundingDocumentClassification,
  CanonizationStatus,
} from '../okafor-log-canonical.js';

describe('okafor-log-canonical', () => {
  describe('constants', () => {
    it('should define OKAFOR_LOG_ENTRY_ID as OKAFOR_LOG_V1_4', () => {
      expect(OKAFOR_LOG_ENTRY_ID).toBe('OKAFOR_LOG_V1_4');
    });

    it('should define OKAFOR_LOG_CHRONICLE_YEAR as 0', () => {
      expect(OKAFOR_LOG_CHRONICLE_YEAR).toBe(0);
    });

    it('should define OKAFOR_LOG_AUTHOR as Amara Okafor-Nwosu', () => {
      expect(OKAFOR_LOG_AUTHOR).toBe('Amara Okafor-Nwosu');
    });

    it('should define OKAFOR_LOG_AUTHOR_NPC_ID as null (pre-registry)', () => {
      expect(OKAFOR_LOG_AUTHOR_NPC_ID).toBeNull();
    });

    it('should define CHIDI_NPC_ID as 171', () => {
      expect(CHIDI_NPC_ID).toBe(171);
    });

    it('should define CHIDI_SECRET_DIALOGUE_ID', () => {
      expect(CHIDI_SECRET_DIALOGUE_ID).toBe('CHIDI_OKAFOR_LOG_PARTIAL_REVELATION');
    });
  });

  describe('OKAFOR_LOG_V1_4', () => {
    it('should have the correct entryId', () => {
      expect(OKAFOR_LOG_V1_4.entryId).toBe(OKAFOR_LOG_ENTRY_ID);
    });

    it('should be authored by Amara Okafor-Nwosu', () => {
      expect(OKAFOR_LOG_V1_4.author).toBe('Amara Okafor-Nwosu');
    });

    it('should have null authorNpcId', () => {
      expect(OKAFOR_LOG_V1_4.authorNpcId).toBeNull();
    });

    it('should be set in chronicle year 0', () => {
      expect(OKAFOR_LOG_V1_4.chronicleYear).toBe(0);
    });

    it('should be classified as PUBLIC_FOUNDING_DOCUMENT', () => {
      expect(OKAFOR_LOG_V1_4.classification).toBe('PUBLIC_FOUNDING_DOCUMENT');
    });

    it('should have ACCEPTED_WITHOUT_VERIFICATION canonization status', () => {
      expect(OKAFOR_LOG_V1_4.canonizationStatus).toBe('ACCEPTED_WITHOUT_VERIFICATION');
    });

    it('should be marked as the first entry', () => {
      expect(OKAFOR_LOG_V1_4.isFirstEntry).toBe(true);
    });

    it('should have a title containing Okafor Log', () => {
      expect(OKAFOR_LOG_V1_4.title).toContain('Okafor Log');
    });

    it('should have text mentioning the Silence', () => {
      expect(OKAFOR_LOG_V1_4.text).toContain('Silence');
    });

    it('should have text mentioning the Concord', () => {
      expect(OKAFOR_LOG_V1_4.text).toContain('Concord');
    });

    it('should have a historical note mentioning first Chronicle entry', () => {
      expect(OKAFOR_LOG_V1_4.historicalNote).toContain('First Chronicle entry');
    });

    it('should have a non-empty text body', () => {
      expect(OKAFOR_LOG_V1_4.text.length).toBeGreaterThan(100);
    });
  });

  describe('CHIDI_PARTIAL_REVELATION', () => {
    it('should have correct dialogueId', () => {
      expect(CHIDI_PARTIAL_REVELATION.dialogueId).toBe(CHIDI_SECRET_DIALOGUE_ID);
    });

    it('should have speakerNpcId of 171', () => {
      expect(CHIDI_PARTIAL_REVELATION.speakerNpcId).toBe(171);
    });

    it('should be unrepeatable', () => {
      expect(CHIDI_PARTIAL_REVELATION.isUnrepeatable).toBe(true);
    });

    it('should have PARTIAL reveal type', () => {
      expect(CHIDI_PARTIAL_REVELATION.revealType).toBe('PARTIAL');
    });

    it('should mention Chronicle Depth in trigger condition', () => {
      expect(CHIDI_PARTIAL_REVELATION.triggerCondition).toContain('Chronicle Depth');
    });

    it('should have dialogue text mentioning Amara', () => {
      expect(CHIDI_PARTIAL_REVELATION.dialogueText).toContain('Amara');
    });

    it('should have dialogue text where Chidi stops himself', () => {
      expect(CHIDI_PARTIAL_REVELATION.dialogueText).toContain('I made a promise');
    });
  });

  describe('getOkaforLog', () => {
    it('should return the OKAFOR_LOG_V1_4 constant', () => {
      const log = getOkaforLog();
      expect(log).toBe(OKAFOR_LOG_V1_4);
    });

    it('should return an entry with isFirstEntry true', () => {
      const log = getOkaforLog();
      expect(log.isFirstEntry).toBe(true);
    });

    it('should return the same reference on multiple calls', () => {
      const first = getOkaforLog();
      const second = getOkaforLog();
      expect(first).toBe(second);
    });
  });

  describe('isOkaforLogEntry', () => {
    it('should return true for the correct entry ID', () => {
      expect(isOkaforLogEntry('OKAFOR_LOG_V1_4')).toBe(true);
    });

    it('should return false for a different ID', () => {
      expect(isOkaforLogEntry('OTHER_ENTRY')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isOkaforLogEntry('')).toBe(false);
    });

    it('should return false for similar but wrong ID', () => {
      expect(isOkaforLogEntry('OKAFOR_LOG_V1_3')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isOkaforLogEntry('okafor_log_v1_4')).toBe(false);
    });
  });

  describe('getChidiSecretDialogue', () => {
    it('should return the CHIDI_PARTIAL_REVELATION constant', () => {
      const dialogue = getChidiSecretDialogue();
      expect(dialogue).toBe(CHIDI_PARTIAL_REVELATION);
    });

    it('should return a dialogue with PARTIAL reveal type', () => {
      const dialogue = getChidiSecretDialogue();
      expect(dialogue.revealType).toBe('PARTIAL');
    });

    it('should return the same reference on multiple calls', () => {
      const first = getChidiSecretDialogue();
      const second = getChidiSecretDialogue();
      expect(first).toBe(second);
    });
  });
});
