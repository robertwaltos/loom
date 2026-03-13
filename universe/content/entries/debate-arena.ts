/**
 * Content Entries — Debate Arena
 * World: The Debate Arena | Guide: Theo Papadopoulos | Subject: Persuasive Writing
 *
 * Four published entries spanning the history of rhetoric and argumentation:
 *   1. Aristotle — logos, pathos, ethos
 *   2. The Lincoln-Douglas Debates — structured democratic argument
 *   3. Logical Fallacies — how arguments break
 *   4. Malala Yousafzai's UN Speech — modern rhetoric at its finest
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Aristotle and the Art of Persuasion (Tier 1) ─────────

export const ENTRY_ARISTOTLE_PERSUASION: RealWorldEntry = {
  id: 'entry-aristotle-persuasion',
  type: 'person',
  title: "The Three Pillars of Every Argument",
  year: -350,
  yearDisplay: '~4th century BCE',
  era: 'classical',
  descriptionChild:
    "A philosopher named Aristotle studied how people convince each other. He found three main ways: using facts and logic (logos), using emotions (pathos), and using the speaker's trustworthiness (ethos). Every argument you've ever heard uses at least one.",
  descriptionOlder:
    "Aristotle's Rhetoric is the founding text of persuasion theory. He argued that effective communication requires all three appeals — logos (evidence), pathos (emotion), and ethos (credibility) — in balance. Pure logic without empathy fails. Pure emotion without evidence manipulates. The framework is 2,400 years old and still taught in every debate programme on Earth.",
  descriptionParent:
    "Aristotle's Rhetoric (4th century BCE) established the tripartite model of persuasion that remains the foundation of communication theory: logos (logical argument and evidence), pathos (emotional appeal), and ethos (speaker credibility and character). His insight that effective persuasion requires all three in appropriate balance has never been superseded. He also catalogued rhetorical figures — metaphor, analogy, rhetorical question — providing the first systematic taxonomy of persuasive techniques. The work is taught in every debate, public speaking, and communications programme worldwide.",
  realPeople: ['Aristotle'],
  quote: "Pure logic without empathy fails. Pure emotion without evidence manipulates.",
  quoteAttribution: 'Theo Papadopoulos, Guide of the Debate Arena',
  geographicLocation: { lat: 37.9715, lng: 23.7257, name: 'Athens, Greece' },
  continent: 'Europe',
  subjectTags: ['rhetoric', 'Aristotle', 'logos', 'pathos', 'ethos', 'persuasion'],
  worldId: 'debate-arena',
  guideId: 'theo-papadopoulos',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-lincoln-douglas-debates'],
  funFact:
    "Aristotle also catalogued rhetorical figures — metaphor, analogy, rhetorical question — that speakers still use today. He was essentially writing the instruction manual for public speaking.",
  imagePrompt:
    'Three illuminated pillars in the Arena inscribed with logos, pathos, and ethos, children listening to speeches under dramatic spotlight, dark audience beyond',
  status: 'published',
};

// ─── Entry 2: The Lincoln-Douglas Debates (Tier 2) ─────────────────

export const ENTRY_LINCOLN_DOUGLAS_DEBATES: RealWorldEntry = {
  id: 'entry-lincoln-douglas-debates',
  type: 'event',
  title: "Seven Debates That Changed a Nation",
  year: 1858,
  yearDisplay: '1858 CE',
  era: 'industrial',
  descriptionChild:
    "Abraham Lincoln and Stephen Douglas debated each other seven times in front of enormous crowds. They argued about slavery — whether it should be allowed to spread to new states. Lincoln lost the election but his arguments were so powerful that they helped him become president two years later.",
  descriptionOlder:
    "The Lincoln-Douglas debates established a format still used in competitive debate today. Each exchange lasted three hours — an hour-long opening, an hour-and-a-half rebuttal, and a 30-minute closing. The depth of the arguments and the willingness of both sides to engage substantively stands in contrast to most modern political discourse. Lincoln lost the Senate race but won the moral argument.",
  descriptionParent:
    "The 1858 Illinois Senate debates between Abraham Lincoln and Stephen Douglas are the most celebrated political debates in American history. They established formal debate structure (opening, rebuttal, closing) still used in competitive debate. The three-hour format demanded sustained, substantive engagement with complex moral and constitutional questions about slavery's expansion. Lincoln's defeat in the Senate race but subsequent presidential victory demonstrates that losing a debate in the short term can be winning the argument for history. The transcripts remain primary documents for studying American democracy.",
  realPeople: ['Abraham Lincoln', 'Stephen Douglas'],
  quote: "Lincoln lost the election but won the moral argument.",
  quoteAttribution: 'Theo Papadopoulos, Guide of the Debate Arena',
  geographicLocation: { lat: 39.7817, lng: -89.6501, name: 'Illinois, USA' },
  continent: 'North America',
  subjectTags: ['Lincoln-Douglas', 'debate format', 'slavery', 'democracy', 'American history'],
  worldId: 'debate-arena',
  guideId: 'theo-papadopoulos',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-aristotle-persuasion'],
  unlocks: ['entry-logical-fallacies'],
  funFact:
    "The debates were transcribed by reporters using shorthand. Lincoln reviewed the transcripts of his own speeches for publication and corrected grammar errors — but never changed the substance. Douglas did the same.",
  imagePrompt:
    'Arena set for Lincoln-Douglas format, two structured podiums with timed columns, enormous crowd in period dress, dramatic stage lighting',
  status: 'published',
};

// ─── Entry 3: Logical Fallacies (Tier 2) ───────────────────────────

export const ENTRY_LOGICAL_FALLACIES: RealWorldEntry = {
  id: 'entry-logical-fallacies',
  type: 'scientific_principle',
  title: "How Arguments Break",
  year: -350,
  yearDisplay: 'Classical era–present',
  era: 'classical',
  descriptionChild:
    "Sometimes arguments sound right but are actually broken. \"Everyone's doing it, so it must be good\" is one kind of broken argument. \"You're wrong because I don't like you\" is another. Learning to spot broken arguments is like learning to spot counterfeit money — it protects you.",
  descriptionOlder:
    "A logical fallacy is a pattern of reasoning that looks valid but isn't. The straw man attacks a position nobody actually holds. The appeal to authority substitutes a famous name for evidence. The false dilemma presents two options when more exist. There are dozens, and they appear in advertising, politics, and everyday conversation. Recognising them is a fundamental critical thinking skill.",
  descriptionParent:
    "Formal and informal logical fallacies are systematic errors in reasoning that appear valid on the surface. Teaching children to recognise them is one of the highest-leverage critical thinking interventions available. Key fallacies include: ad hominem (attacking the person instead of the argument), straw man (misrepresenting an opponent's position), appeal to authority (substituting fame for evidence), false dilemma (artificially limiting options), and tu quoque ('you too'). These patterns appear in advertising, political discourse, and everyday conversation with remarkable frequency.",
  realPeople: [],
  quote: "Every child discovers the 'tu quoque' fallacy independently around age four.",
  quoteAttribution: 'Theo Papadopoulos, Guide of the Debate Arena',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['logical fallacies', 'critical thinking', 'reasoning', 'straw man', 'ad hominem'],
  worldId: 'debate-arena',
  guideId: 'theo-papadopoulos',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-aristotle-persuasion'],
  unlocks: ['entry-malala-un-speech'],
  funFact:
    "The fallacy called \"tu quoque\" (Latin for \"you too\") is when someone deflects criticism by pointing out that the critic did the same thing. It's the formalised version of \"but YOU did it too!\" Every child discovers this fallacy independently around age four.",
  imagePrompt:
    'Arena displaying ten arguments on illuminated panels, some cracking with hidden fallacies revealed, no scoring — awareness lighting only',
  status: 'published',
};

// ─── Entry 4: Malala Yousafzai's UN Speech (Tier 3) ────────────────

export const ENTRY_MALALA_UN_SPEECH: RealWorldEntry = {
  id: 'entry-malala-un-speech',
  type: 'person',
  title: "Sixteen Years Old, Speaking to the World",
  year: 2013,
  yearDisplay: '2013 CE',
  era: 'contemporary',
  descriptionChild:
    "A girl named Malala was shot by the Taliban for wanting to go to school. She survived, and nine months later she stood before the entire United Nations and spoke about every child's right to education. She was sixteen years old. She didn't raise her voice — and that made it louder.",
  descriptionOlder:
    "Malala's UN speech deployed Aristotle's framework with extraordinary precision. Ethos: she was a living survivor of the very violence she opposed. Pathos: \"They thought that the bullets would silence us, but they failed.\" Logos: she cited the Universal Declaration of Human Rights. She was the youngest person ever to win the Nobel Peace Prize, at seventeen.",
  descriptionParent:
    "Malala Yousafzai's 2013 UN address is a masterclass in Aristotelian rhetoric. Her ethos was unassailable — she was a survivor of attempted assassination for advocating girls' education. Her pathos was precise and controlled: 'They thought that the bullets would silence us. But they failed.' Her logos referenced the Universal Declaration of Human Rights and cited specific statistics on global education access. At sixteen, she demonstrated that age is no barrier to rhetorical mastery. She received the Nobel Peace Prize at seventeen, the youngest laureate in history.",
  realPeople: ['Malala Yousafzai'],
  quote: "One child, one teacher, one book, one pen can change the world.",
  quoteAttribution: 'Malala Yousafzai, UN Youth Assembly, 2013',
  geographicLocation: { lat: 40.7489, lng: -73.9680, name: 'United Nations, New York, USA' },
  continent: 'North America',
  subjectTags: ['Malala', 'rhetoric', 'education rights', 'UN', 'Nobel Peace Prize'],
  worldId: 'debate-arena',
  guideId: 'theo-papadopoulos',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-lincoln-douglas-debates', 'entry-logical-fallacies'],
  unlocks: [],
  funFact:
    "Malala named her speech \"one child, one teacher, one book, one pen.\" She deliberately used the smallest possible units to make the largest possible point. Theo calls this \"rhetorical compression\" — the opposite of rambling.",
  imagePrompt:
    'Arena podium with UN Assembly backdrop, a sixteen-year-old speaker in calm composure, Aristotelian pillars glowing behind her, quiet powerful lighting',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const DEBATE_ARENA_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_ARISTOTLE_PERSUASION,
  ENTRY_LINCOLN_DOUGLAS_DEBATES,
  ENTRY_LOGICAL_FALLACIES,
  ENTRY_MALALA_UN_SPEECH,
] as const;

export const DEBATE_ARENA_ENTRY_IDS: readonly string[] =
  DEBATE_ARENA_ENTRIES.map((e) => e.id);
