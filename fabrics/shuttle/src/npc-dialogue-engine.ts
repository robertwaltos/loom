/**
 * npc-dialogue-engine.ts — NPC dialogue system with branching,
 * mood-influenced selection, condition evaluation, conversation
 * history, topic knowledge tracking, and dynamic topic generation.
 *
 * Unlike npc-dialogue.ts (dialogue tree state machine), this module
 * owns the AI-side: which dialogue to pick based on mood, conditions,
 * and world events.
 */

// ── Ports ────────────────────────────────────────────────────────

interface DialogueEngineClock {
  readonly nowMicroseconds: () => number;
}

interface DialogueEngineIdGenerator {
  readonly generate: () => string;
}

interface DialogueEngineDeps {
  readonly clock: DialogueEngineClock;
  readonly idGenerator: DialogueEngineIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type MoodType = 'joyful' | 'calm' | 'anxious' | 'angry' | 'sad' | 'fearful';

interface DialogueCondition {
  readonly conditionId: string;
  readonly type: 'mood' | 'topic_known' | 'reputation' | 'world_event';
  readonly key: string;
  readonly operator: 'eq' | 'neq' | 'gte' | 'lte';
  readonly value: string;
}

interface DialogueLine {
  readonly lineId: string;
  readonly npcId: string;
  readonly text: string;
  readonly mood: MoodType;
  readonly topic: string;
  readonly priority: number;
  readonly conditions: readonly DialogueCondition[];
}

interface DialogueBranch {
  readonly branchId: string;
  readonly parentLineId: string;
  readonly lines: readonly DialogueLine[];
}

interface ConversationRecord {
  readonly recordId: string;
  readonly npcId: string;
  readonly participantId: string;
  readonly lineId: string;
  readonly topic: string;
  readonly timestamp: number;
}

interface TopicKnowledge {
  readonly npcId: string;
  readonly topic: string;
  readonly learnedAt: number;
  readonly source: string;
}

interface GeneratedTopic {
  readonly topicId: string;
  readonly topic: string;
  readonly worldEventId: string;
  readonly generatedAt: number;
  readonly relevanceScore: number;
}

interface WorldEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly description: string;
  readonly location: string;
  readonly timestamp: number;
}

interface LineSelectionResult {
  readonly line: DialogueLine | undefined;
  readonly reason: string;
}

interface DialogueEngineStats {
  readonly totalLines: number;
  readonly totalBranches: number;
  readonly totalRecords: number;
  readonly totalTopics: number;
  readonly totalGeneratedTopics: number;
}

// ── Constants ────────────────────────────────────────────────────

const MOOD_PRIORITY_BONUS = 10;
const MAX_HISTORY_PER_NPC = 200;
const TOPIC_RELEVANCE_THRESHOLD = 0.3;

// ── State ────────────────────────────────────────────────────────

interface MutableLine {
  readonly lineId: string;
  readonly npcId: string;
  readonly text: string;
  readonly mood: MoodType;
  readonly topic: string;
  readonly priority: number;
  readonly conditions: readonly DialogueCondition[];
}

interface DialogueEngineState {
  readonly deps: DialogueEngineDeps;
  readonly lines: Map<string, MutableLine>;
  readonly npcLines: Map<string, string[]>;
  readonly branches: Map<string, DialogueBranch>;
  readonly history: Map<string, ConversationRecord[]>;
  readonly topicKnowledge: Map<string, TopicKnowledge[]>;
  readonly generatedTopics: Map<string, GeneratedTopic>;
  readonly npcMoods: Map<string, MoodType>;
  readonly conditionValues: Map<string, string>;
}

// ── Public API ───────────────────────────────────────────────────

interface DialogueEngine {
  readonly registerLine: (line: DialogueLine) => boolean;
  readonly removeLine: (lineId: string) => boolean;
  readonly getLine: (lineId: string) => DialogueLine | undefined;
  readonly getLinesForNpc: (npcId: string) => readonly DialogueLine[];
  readonly registerBranch: (branch: DialogueBranch) => boolean;
  readonly getBranch: (branchId: string) => DialogueBranch | undefined;
  readonly getBranchesForLine: (lineId: string) => readonly DialogueBranch[];
  readonly setNpcMood: (npcId: string, mood: MoodType) => void;
  readonly getNpcMood: (npcId: string) => MoodType;
  readonly setConditionValue: (key: string, value: string) => void;
  readonly selectLine: (npcId: string, topic: string) => LineSelectionResult;
  readonly recordConversation: (
    npcId: string,
    participantId: string,
    lineId: string,
    topic: string,
  ) => ConversationRecord;
  readonly getHistory: (npcId: string) => readonly ConversationRecord[];
  readonly learnTopic: (npcId: string, topic: string, source: string) => TopicKnowledge;
  readonly getKnownTopics: (npcId: string) => readonly TopicKnowledge[];
  readonly knowsTopic: (npcId: string, topic: string) => boolean;
  readonly generateTopicsFromEvent: (event: WorldEvent) => readonly GeneratedTopic[];
  readonly getGeneratedTopics: () => readonly GeneratedTopic[];
  readonly pruneGeneratedTopics: (threshold: number) => number;
  readonly getStats: () => DialogueEngineStats;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonlyLine(line: MutableLine): DialogueLine {
  return {
    lineId: line.lineId,
    npcId: line.npcId,
    text: line.text,
    mood: line.mood,
    topic: line.topic,
    priority: line.priority,
    conditions: line.conditions,
  };
}

function evaluateCondition(state: DialogueEngineState, cond: DialogueCondition): boolean {
  const actual = state.conditionValues.get(cond.key) ?? '';
  if (cond.operator === 'eq') return actual === cond.value;
  if (cond.operator === 'neq') return actual !== cond.value;
  const numActual = Number(actual);
  const numExpected = Number(cond.value);
  if (Number.isNaN(numActual) || Number.isNaN(numExpected)) return false;
  if (cond.operator === 'gte') return numActual >= numExpected;
  return numActual <= numExpected;
}

function allConditionsMet(
  state: DialogueEngineState,
  conds: readonly DialogueCondition[],
): boolean {
  for (const cond of conds) {
    if (!evaluateCondition(state, cond)) return false;
  }
  return true;
}

function scoreLine(line: MutableLine, currentMood: MoodType): number {
  const moodBonus = line.mood === currentMood ? MOOD_PRIORITY_BONUS : 0;
  return line.priority + moodBonus;
}

// ── Operations ───────────────────────────────────────────────────

function registerLineImpl(state: DialogueEngineState, line: DialogueLine): boolean {
  if (state.lines.has(line.lineId)) return false;
  state.lines.set(line.lineId, { ...line });
  let npcList = state.npcLines.get(line.npcId);
  if (!npcList) {
    npcList = [];
    state.npcLines.set(line.npcId, npcList);
  }
  npcList.push(line.lineId);
  return true;
}

function removeLineImpl(state: DialogueEngineState, lineId: string): boolean {
  const line = state.lines.get(lineId);
  if (!line) return false;
  state.lines.delete(lineId);
  const npcList = state.npcLines.get(line.npcId);
  if (npcList) {
    const idx = npcList.indexOf(lineId);
    if (idx !== -1) npcList.splice(idx, 1);
  }
  return true;
}

function getLinesForNpcImpl(state: DialogueEngineState, npcId: string): readonly DialogueLine[] {
  const ids = state.npcLines.get(npcId);
  if (!ids) return [];
  const result: DialogueLine[] = [];
  for (const id of ids) {
    const line = state.lines.get(id);
    if (line) result.push(toReadonlyLine(line));
  }
  return result;
}

function registerBranchImpl(state: DialogueEngineState, branch: DialogueBranch): boolean {
  if (state.branches.has(branch.branchId)) return false;
  state.branches.set(branch.branchId, branch);
  return true;
}

function getBranchesForLineImpl(
  state: DialogueEngineState,
  lineId: string,
): readonly DialogueBranch[] {
  const results: DialogueBranch[] = [];
  for (const branch of state.branches.values()) {
    if (branch.parentLineId === lineId) results.push(branch);
  }
  return results;
}

function selectLineImpl(
  state: DialogueEngineState,
  npcId: string,
  topic: string,
): LineSelectionResult {
  const ids = state.npcLines.get(npcId);
  if (!ids || ids.length === 0) {
    return { line: undefined, reason: 'no lines registered for npc' };
  }
  const mood = state.npcMoods.get(npcId) ?? 'calm';
  let bestLine: MutableLine | undefined;
  let bestScore = -Infinity;
  for (const id of ids) {
    const line = state.lines.get(id);
    if (!line || line.topic !== topic) continue;
    if (!allConditionsMet(state, line.conditions)) continue;
    const score = scoreLine(line, mood);
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }
  if (!bestLine) return { line: undefined, reason: 'no matching lines for topic' };
  return { line: toReadonlyLine(bestLine), reason: 'selected' };
}

function recordConversationImpl(
  state: DialogueEngineState,
  npcId: string,
  participantId: string,
  lineId: string,
  topic: string,
): ConversationRecord {
  const record: ConversationRecord = {
    recordId: state.deps.idGenerator.generate(),
    npcId,
    participantId,
    lineId,
    topic,
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  let hist = state.history.get(npcId);
  if (!hist) {
    hist = [];
    state.history.set(npcId, hist);
  }
  hist.push(record);
  if (hist.length > MAX_HISTORY_PER_NPC) hist.shift();
  return record;
}

function learnTopicImpl(
  state: DialogueEngineState,
  npcId: string,
  topic: string,
  source: string,
): TopicKnowledge {
  const knowledge: TopicKnowledge = {
    npcId,
    topic,
    learnedAt: state.deps.clock.nowMicroseconds(),
    source,
  };
  let topics = state.topicKnowledge.get(npcId);
  if (!topics) {
    topics = [];
    state.topicKnowledge.set(npcId, topics);
  }
  const existing = topics.findIndex((t) => t.topic === topic);
  if (existing !== -1) {
    topics[existing] = knowledge;
  } else {
    topics.push(knowledge);
  }
  return knowledge;
}

function knowsTopicImpl(state: DialogueEngineState, npcId: string, topic: string): boolean {
  const topics = state.topicKnowledge.get(npcId);
  if (!topics) return false;
  return topics.some((t) => t.topic === topic);
}

function generateTopicsFromEventImpl(
  state: DialogueEngineState,
  event: WorldEvent,
): readonly GeneratedTopic[] {
  const topics: GeneratedTopic[] = [];
  const baseTopic = buildTopicFromEvent(state, event, event.eventType, 0.8);
  topics.push(baseTopic);
  const locationTopic = buildTopicFromEvent(state, event, event.location, 0.5);
  topics.push(locationTopic);
  return topics;
}

function buildTopicFromEvent(
  state: DialogueEngineState,
  event: WorldEvent,
  topicName: string,
  relevance: number,
): GeneratedTopic {
  const generated: GeneratedTopic = {
    topicId: state.deps.idGenerator.generate(),
    topic: topicName,
    worldEventId: event.eventId,
    generatedAt: state.deps.clock.nowMicroseconds(),
    relevanceScore: relevance,
  };
  state.generatedTopics.set(generated.topicId, generated);
  return generated;
}

function pruneGeneratedTopicsImpl(state: DialogueEngineState, threshold: number): number {
  let pruned = 0;
  for (const [id, topic] of state.generatedTopics) {
    if (topic.relevanceScore < threshold) {
      state.generatedTopics.delete(id);
      pruned++;
    }
  }
  return pruned;
}

function getStatsImpl(state: DialogueEngineState): DialogueEngineStats {
  let totalRecords = 0;
  for (const h of state.history.values()) {
    totalRecords += h.length;
  }
  let totalTopics = 0;
  for (const t of state.topicKnowledge.values()) {
    totalTopics += t.length;
  }
  return {
    totalLines: state.lines.size,
    totalBranches: state.branches.size,
    totalRecords,
    totalTopics,
    totalGeneratedTopics: state.generatedTopics.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function initDialogueState(deps: DialogueEngineDeps): DialogueEngineState {
  return {
    deps,
    lines: new Map(),
    npcLines: new Map(),
    branches: new Map(),
    history: new Map(),
    topicKnowledge: new Map(),
    generatedTopics: new Map(),
    npcMoods: new Map(),
    conditionValues: new Map(),
  };
}

function getLineImpl(state: DialogueEngineState, id: string): DialogueLine | undefined {
  const l = state.lines.get(id);
  return l ? toReadonlyLine(l) : undefined;
}

function buildDialogueLineMethods(
  state: DialogueEngineState,
): Pick<
  DialogueEngine,
  | 'registerLine'
  | 'removeLine'
  | 'getLine'
  | 'getLinesForNpc'
  | 'registerBranch'
  | 'getBranch'
  | 'getBranchesForLine'
> {
  return {
    registerLine: (l) => registerLineImpl(state, l),
    removeLine: (id) => removeLineImpl(state, id),
    getLine: (id) => getLineImpl(state, id),
    getLinesForNpc: (npcId) => getLinesForNpcImpl(state, npcId),
    registerBranch: (b) => registerBranchImpl(state, b),
    getBranch: (id) => state.branches.get(id),
    getBranchesForLine: (id) => getBranchesForLineImpl(state, id),
  };
}

function buildDialogueKnowledgeMethods(
  state: DialogueEngineState,
): Pick<
  DialogueEngine,
  | 'learnTopic'
  | 'getKnownTopics'
  | 'knowsTopic'
  | 'generateTopicsFromEvent'
  | 'getGeneratedTopics'
  | 'pruneGeneratedTopics'
> {
  return {
    learnTopic: (npcId, topic, src) => learnTopicImpl(state, npcId, topic, src),
    getKnownTopics: (npcId) => state.topicKnowledge.get(npcId) ?? [],
    knowsTopic: (npcId, topic) => knowsTopicImpl(state, npcId, topic),
    generateTopicsFromEvent: (e) => generateTopicsFromEventImpl(state, e),
    getGeneratedTopics: () => [...state.generatedTopics.values()],
    pruneGeneratedTopics: (t) => pruneGeneratedTopicsImpl(state, t),
  };
}

function createDialogueEngine(deps: DialogueEngineDeps): DialogueEngine {
  const state = initDialogueState(deps);
  return {
    ...buildDialogueLineMethods(state),
    ...buildDialogueKnowledgeMethods(state),
    setNpcMood: (npcId, mood) => {
      state.npcMoods.set(npcId, mood);
    },
    getNpcMood: (npcId) => state.npcMoods.get(npcId) ?? 'calm',
    setConditionValue: (k, v) => {
      state.conditionValues.set(k, v);
    },
    selectLine: (npcId, topic) => selectLineImpl(state, npcId, topic),
    recordConversation: (n, p, l, t) => recordConversationImpl(state, n, p, l, t),
    getHistory: (npcId) => state.history.get(npcId) ?? [],
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createDialogueEngine,
  MOOD_PRIORITY_BONUS,
  MAX_HISTORY_PER_NPC,
  TOPIC_RELEVANCE_THRESHOLD,
};
export type {
  DialogueEngine,
  DialogueEngineDeps,
  DialogueLine,
  DialogueBranch,
  DialogueCondition,
  ConversationRecord,
  TopicKnowledge,
  GeneratedTopic,
  WorldEvent,
  MoodType,
  LineSelectionResult,
  DialogueEngineStats,
};
