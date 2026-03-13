/**
 * Content Entries — Wellness Garden
 * World: Wellness Garden | Guide: Hana Bergstrom | Subject: Social-Emotional Learning
 *
 * Four published entries spanning emotional wellbeing and psychology:
 *   1. The Science of Sleep — why your brain needs rest
 *   2. The Power of Play — why play matters
 *   3. Growth Mindset — the power of "yet"
 *   4. The History of Empathy — feeling what others feel
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Science of Sleep (Tier 1 — ages 5-6) ─────────────

export const ENTRY_SCIENCE_OF_SLEEP: RealWorldEntry = {
  id: 'entry-science-of-sleep',
  type: 'scientific_principle',
  title: 'Why Your Brain Needs the Night',
  year: null,
  yearDisplay: 'Contemporary research',
  era: 'contemporary',
  descriptionChild:
    "When you sleep, your brain cleans itself. It replays the day's memories and decides which ones to keep. Sleep makes you smarter, not just less tired.",
  descriptionOlder:
    "During sleep, cerebrospinal fluid washes through the brain, clearing waste products linked to Alzheimer's disease. The brain replays and consolidates memories during REM sleep, strengthening neural connections formed during the day. Dreams may be the brain processing emotions and filing experiences. Hana teaches that sleep is not inactivity — it is maintenance.",
  descriptionParent:
    "Sleep science reveals that rest is an active cognitive process essential for memory consolidation, emotional regulation, and neural maintenance. The glymphatic system (discovered 2012) clears metabolic waste during sleep, suggesting that chronic sleep deprivation may contribute to neurodegenerative disease. Teaching children to value sleep as a cognitive tool rather than lost time builds healthy habits grounded in scientific understanding.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['sleep', 'brain', 'health', 'memory', 'rest'],
  worldId: 'wellness-garden',
  guideId: 'hana-bergstrom',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-power-of-play'],
  funFact:
    "Humans spend about one-third of their lives sleeping. That's roughly 25 years for the average person. Hana keeps a cozy nook in the Wellness Garden just for resting. She says: 'The garden grows fastest at night.'",
  imagePrompt:
    "A Wellness Garden nighttime zone: a brain-shaped garden bed with glowing cerebrospinal streams flowing through it, memory flowers blooming during sleep, Hana tucking in a child among soft mossy pillows, gentle moonlight with bioluminescent cleaning pathways visible, Studio Ghibli healing night garden aesthetic",
  status: 'published',
};

// ─── Entry 2: The Power of Play (Tier 2 — ages 7-8) ────────────────

export const ENTRY_POWER_OF_PLAY: RealWorldEntry = {
  id: 'entry-power-of-play',
  type: 'scientific_principle',
  title: 'Why Playing Is Serious Business',
  year: null,
  yearDisplay: 'Contemporary research',
  era: 'contemporary',
  descriptionChild:
    "Play isn't just fun — it's how your brain builds connections. Animals play to learn survival skills. Human children play to learn everything.",
  descriptionOlder:
    "Dr. Stuart Brown studied play across species and found that play deprivation in childhood is as damaging as malnutrition. Play develops creativity, empathy, and problem-solving. It is how brains build the flexible neural networks needed for adaptive behaviour. Hana designed the Wellness Garden so that the absence of a task IS the lesson.",
  descriptionParent:
    "Research by Stuart Brown and others demonstrates that play is a biological necessity, not a luxury. Play-deprived animals show impaired social and cognitive development. In humans, unstructured play develops executive function, emotional regulation, and creative problem-solving. The increasing loss of free play time in modern childhood is a public health concern. Teaching children that play is valuable — not 'wasted time' — protects a critical developmental process.",
  realPeople: ['Stuart Brown'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['play', 'development', 'creativity', 'brain', 'wellbeing'],
  worldId: 'wellness-garden',
  guideId: 'hana-bergstrom',
  adventureType: 'natural_exploration',
  difficultyTier: 2,
  prerequisites: ['entry-science-of-sleep'],
  unlocks: ['entry-growth-mindset'],
  funFact:
    "Rats who were deprived of play as pups couldn't tell the difference between friend and foe as adults. Hana says: 'Play is not a reward for finishing work. Play IS the work — your brain's most important kind.'",
  imagePrompt:
    "A Wellness Garden open play zone: children exploring freely with no objectives, brain scan overlays showing neural connections forming during play, animal pups playing nearby (wolf cubs wrestling, otter pups sliding), Hana sitting on a bench watching with a knowing smile, bright unstructured daylight, Studio Ghibli joyful development aesthetic",
  status: 'published',
};

// ─── Entry 3: Growth Mindset (Tier 2 — ages 7-8) ───────────────────

export const ENTRY_GROWTH_MINDSET: RealWorldEntry = {
  id: 'entry-growth-mindset',
  type: 'scientific_principle',
  title: 'The Most Powerful Word Is "Yet"',
  year: 2006,
  yearDisplay: '2006',
  era: 'contemporary',
  descriptionChild:
    "Some people think talent is something you're born with. But scientists showed that your brain grows stronger when you struggle with hard things. Mistakes make you smarter.",
  descriptionOlder:
    "Carol Dweck's research showed that children praised for being 'smart' give up more easily than children praised for working hard. The belief that ability can grow literally changes how the brain develops. Neural pathways strengthen through effort and practice, not through innate talent alone. Hana introduces the garden's 'struggle flowers' — plants that only bloom after facing difficulty.",
  descriptionParent:
    "Dweck's growth mindset research demonstrates that beliefs about intelligence directly affect learning outcomes. Children with a fixed mindset (ability is innate) avoid challenges to protect their self-image; children with a growth mindset (ability develops through effort) embrace challenges as learning opportunities. The single word 'yet' transforms 'I can't do this' into a temporary state. Teaching this develops resilience, persistence, and a healthy relationship with failure.",
  realPeople: ['Carol Dweck'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 37.4275, lng: -122.1697, name: 'Stanford University, California' },
  continent: 'North America',
  subjectTags: ['growth mindset', 'resilience', 'effort', 'brain', 'learning'],
  worldId: 'wellness-garden',
  guideId: 'hana-bergstrom',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-power-of-play'],
  unlocks: ['entry-history-of-empathy'],
  funFact:
    "The word 'yet' is the most powerful word in growth mindset. 'I can't do this' vs. 'I can't do this yet.' Hana has 'YET' carved into the garden gate. Every child who enters walks under it.",
  imagePrompt:
    "A Wellness Garden growth zone: 'struggle flowers' — plants that bloom only after being bent by wind, with labels showing effort stages, a garden gate with 'YET' carved in large letters, Hana kneeling beside a child who is tending a difficult plant, warm encouraging greenhouse light, Studio Ghibli resilience metaphor aesthetic",
  status: 'published',
};

// ─── Entry 4: The History of Empathy (Tier 3 — ages 9-10) ──────────

export const ENTRY_HISTORY_OF_EMPATHY: RealWorldEntry = {
  id: 'entry-history-of-empathy',
  type: 'scientific_principle',
  title: 'The Skill of Feeling What Others Feel',
  year: 1909,
  yearDisplay: '1909 (term coined) — ongoing',
  era: 'modern',
  descriptionChild:
    "Empathy is the ability to feel what someone else feels. It's not something you're just born with — it's a skill you can practice and get better at, like reading or maths.",
  descriptionOlder:
    "The word 'empathy' was only coined in 1909 by Theodor Lipps, but the concept is ancient. Mirror neurons in the brain literally fire when you watch someone else experience something — your brain rehearses another person's state. Hana says empathy is the most underrated intelligence: not tested in schools, but essential for everything.",
  descriptionParent:
    "Empathy research reveals it as both a neurological capacity (mirror neurons, affective resonance) and a trainable skill (perspective-taking exercises, literary identification). The distinction between cognitive empathy (understanding) and affective empathy (feeling) is clinically significant and developmentally important. Teaching children that empathy is a skill — not just a personality trait — makes it accessible and improvable. Hana models this by crying openly when moved, demonstrating that emotional responsiveness is strength.",
  realPeople: ['Theodor Lipps'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['empathy', 'emotions', 'mirror neurons', 'psychology', 'social skills'],
  worldId: 'wellness-garden',
  guideId: 'hana-bergstrom',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-growth-mindset'],
  unlocks: [],
  funFact:
    "Hana cries openly when something is beautiful. She considers this evidence that her empathy is strong, not that she is weak. She tells children: 'If your eyes don't water, your roots aren't deep enough.'",
  imagePrompt:
    "A Wellness Garden empathy circle: children sitting in a ring practicing perspective-taking exercises, mirror neuron diagrams growing as vines on a trellis, Hana with tears of empathetic joy watching children comfort each other, warm golden emotional light, flowers that change colour based on the emotions nearby, Studio Ghibli emotional intelligence aesthetic",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const WELLNESS_GARDEN_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_SCIENCE_OF_SLEEP,
  ENTRY_POWER_OF_PLAY,
  ENTRY_GROWTH_MINDSET,
  ENTRY_HISTORY_OF_EMPATHY,
];

export const WELLNESS_GARDEN_ENTRY_IDS =
  WELLNESS_GARDEN_ENTRIES.map((e) => e.id);
