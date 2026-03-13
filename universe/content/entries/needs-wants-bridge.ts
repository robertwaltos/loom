/**
 * Content Entries — Needs & Wants Bridge
 * World: Needs & Wants Bridge | Guide: Nia Oduya | Subject: Decision-Making / Values
 *
 * Four published entries spanning mindful consumption and decision-making:
 *   1. Maslow's Hierarchy of Needs — the pyramid of human needs
 *   2. Planned Obsolescence — things designed to break
 *   3. The Diderot Effect — why buying one thing leads to buying more
 *   4. The Hedonic Treadmill — why more doesn't equal happier
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Maslow's Hierarchy (Tier 1 — ages 5-6) ───────────────

export const ENTRY_MASLOWS_HIERARCHY: RealWorldEntry = {
  id: 'entry-maslows-hierarchy',
  type: 'person',
  title: 'The Pyramid of What People Need',
  year: 1943,
  yearDisplay: '1943 CE',
  era: 'modern',
  descriptionChild:
    "A psychologist named Maslow said human needs come in layers, like a pyramid. At the bottom are the basics — food, water, shelter. In the middle are safety and friendship. At the top is becoming the very best version of yourself. You have to take care of the bottom layers before you can reach the top.",
  descriptionOlder:
    "Maslow's hierarchy — physiological, safety, belonging, esteem, self-actualisation — is one of the most influential models in psychology and economics. It's also been criticised: many cultures prioritise community belonging over individual achievement, and people regularly pursue creative self-expression while their basic needs are unmet. Nia uses it as a starting framework, not a final answer.",
  descriptionParent:
    "Maslow's hierarchy (1943) remains a foundational model in psychology, education, and marketing — but its cultural assumptions have been increasingly challenged. Indigenous and collectivist cultures often prioritise belonging and community contribution over individual self-actualisation. Teaching children the model alongside its critiques develops nuanced thinking about universal vs. culturally specific values.",
  realPeople: ['Abraham Maslow'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 40.7128, lng: -74.006, name: 'New York, USA' },
  continent: 'North America',
  subjectTags: ['needs', 'psychology', 'Maslow', 'hierarchy', 'decision-making'],
  worldId: 'needs-wants-bridge',
  guideId: 'nia-oduya',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-planned-obsolescence'],
  funFact:
    "Nia owns exactly 42 possessions. She's counted. She says that above 42, each additional item takes more time to manage than the joy it gives. Her number is arbitrary. The principle isn't.",
  imagePrompt:
    "A beautiful stone bridge with the left side structured as Maslow's pyramid — stone blocks at the base labelled 'Food, Water, Shelter,' middle blocks 'Safety, Friendship,' the peak glowing with 'Self-Actualisation,' a woman (Nia) standing at the center of the bridge with exactly 42 carefully chosen possessions arranged neatly beside her, warm decision-making light, Studio Ghibli philosophical atmosphere",
  status: 'published',
};

// ─── Entry 2: Planned Obsolescence (Tier 2 — ages 7-8) ─────────────

export const ENTRY_PLANNED_OBSOLESCENCE: RealWorldEntry = {
  id: 'entry-planned-obsolescence',
  type: 'cultural_milestone',
  title: 'The Light Bulb That Refused to Obey',
  year: 1924,
  yearDisplay: '1924 CE',
  era: 'modern',
  descriptionChild:
    "Some things are built to break on purpose. Light bulbs could last much longer, but companies made them burn out faster so you'd have to buy new ones. That means you spend more money on things you shouldn't need to replace.",
  descriptionOlder:
    "The Phoebus Cartel (1924) was a real agreement among light bulb manufacturers to limit bulb lifespans to 1,000 hours, despite the technology existing for 2,500-hour bulbs. Planned obsolescence has since become standard in electronics, fashion, and appliances. It drives consumption but generates waste. Nia helps children see the hidden 'want' inside every engineered 'need to replace.'",
  descriptionParent:
    "Planned obsolescence sits at the intersection of economics, engineering ethics, and environmental sustainability. The Phoebus Cartel is a documented case of manufacturers deliberately degrading product quality to increase replacement cycles. Understanding this practice empowers consumers to evaluate purchases beyond sticker price — considering lifetime cost, repairability, and environmental impact. The 'right to repair' movement is a direct contemporary response.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 37.5822, lng: -121.9889, name: 'Livermore, California, USA' },
  continent: 'North America',
  subjectTags: ['planned obsolescence', 'consumerism', 'sustainability', 'engineering', 'economics'],
  worldId: 'needs-wants-bridge',
  guideId: 'nia-oduya',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-maslows-hierarchy'],
  unlocks: ['entry-diderot-effect'],
  funFact:
    "There's a light bulb in a fire station in Livermore, California, that has been burning continuously since 1901 — over 120 years. It predates the Phoebus Cartel. Nia calls it 'the bulb that refused to obey.'",
  imagePrompt:
    "A bridge crossing scene: on the left side, a display of deliberately fragile products (cracking phones, dimming bulbs, fraying cables), on the right side, a single ancient light bulb burning brightly in a glass case labelled 'Livermore Fire Station — Since 1901,' Nia examining both sides with a magnifying glass, warm analytical light, Studio Ghibli consumer awareness storytelling",
  status: 'published',
};

// ─── Entry 3: The Diderot Effect (Tier 2 — ages 7-8) ───────────────

export const ENTRY_DIDEROT_EFFECT: RealWorldEntry = {
  id: 'entry-diderot-effect',
  type: 'scientific_principle',
  title: 'The Gown That Ate the House',
  year: 1769,
  yearDisplay: '1769 CE',
  era: 'enlightenment',
  descriptionChild:
    "Have you ever gotten a new shirt and then suddenly felt like your old shoes didn't match anymore? So you got new shoes, and then your bag looked wrong, and then... one new thing made you want to replace everything. This is called the Diderot Effect.",
  descriptionOlder:
    "In 1769, Diderot received a beautiful scarlet dressing gown as a gift. The gown was so fine that his old furniture, curtains, and desk suddenly looked shabby in comparison. He replaced them one by one, spending far more than he could afford. McCracken named this cascade 'the Diderot Effect.' It explains why upgrading one part of your life often creates pressure to upgrade everything around it.",
  descriptionParent:
    "The Diderot Effect — named by anthropologist Grant McCracken in 1988 after Diderot's 1769 essay — describes a cascading consumption pattern where the acquisition of a superior item creates perceived inadequacy in surrounding possessions. It's a powerful framework for understanding lifestyle inflation, marketing strategy, and consumer psychology. Teaching children to recognise this pattern gives them a tool for resisting unconscious spending escalation.",
  realPeople: ['Denis Diderot', 'Grant McCracken'],
  quote: "I was the master of my old gown. I am the slave of my new one.",
  quoteAttribution: 'Denis Diderot, 1769',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['Diderot Effect', 'consumerism', 'psychology', 'spending', 'decision-making'],
  worldId: 'needs-wants-bridge',
  guideId: 'nia-oduya',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-planned-obsolescence'],
  unlocks: ['entry-hedonic-treadmill'],
  funFact:
    "Diderot wrote an essay about the experience called 'Regrets on Parting with My Old Dressing Gown.' Nia has the quote 'I was the master of my old gown. I am the slave of my new one' inscribed on the Bridge's centre beam.",
  imagePrompt:
    "18th-century French study: a philosopher (Diderot) standing in a magnificent scarlet dressing gown, looking dismayed at his shabby old furniture, curtains, and desk that now look inadequate by comparison, a cascade of new items flowing in through the door (new desk, new drapes, new chair) each creating a domino chain of replacement, the Bridge visible through a window with the quote inscribed on its beam, warm Enlightenment-era lighting, Studio Ghibli cascading visual storytelling",
  status: 'published',
};

// ─── Entry 4: The Hedonic Treadmill (Tier 3 — ages 9-10) ───────────

export const ENTRY_HEDONIC_TREADMILL: RealWorldEntry = {
  id: 'entry-hedonic-treadmill',
  type: 'scientific_principle',
  title: 'The Treadmill That Never Stops',
  year: 1971,
  yearDisplay: '1971 CE',
  era: 'contemporary',
  descriptionChild:
    "When you get something new, it feels amazing — for a while. Then you get used to it, and it doesn't feel special anymore. So you want something newer. This cycle never ends unless you learn to recognise it.",
  descriptionOlder:
    "Brickman and Campbell's research showed that lottery winners and people who became paraplegic both returned to roughly their baseline happiness level within a year. Humans adapt to both positive and negative changes. This 'hedonic adaptation' means that purchasing new things provides only temporary happiness. Nia teaches that recognising the treadmill is the first step to getting off it.",
  descriptionParent:
    "Hedonic adaptation is one of the most robust findings in happiness research. It explains the paradox that rising incomes in developed nations have not produced proportional increases in reported happiness. Studies consistently show that experiences produce longer-lasting satisfaction than material purchases. For children, understanding the hedonic treadmill provides a scientific basis for valuing experiences, relationships, and personal growth over accumulation.",
  realPeople: ['Philip Brickman', 'Donald T. Campbell'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['hedonic treadmill', 'happiness', 'psychology', 'consumerism', 'adaptation'],
  worldId: 'needs-wants-bridge',
  guideId: 'nia-oduya',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-diderot-effect'],
  unlocks: [],
  funFact:
    "Studies show that experiences (travel, meals with friends, learning something new) produce longer-lasting happiness than material purchases. The memory of a good experience actually improves over time, while satisfaction with a new object declines.",
  imagePrompt:
    "A bridge scene where increasingly appealing items line the 'wants' side — shiny toys, gadgets, treasures — but each item fades to grey as the walker moves past it, the first item already colourless while the newest still sparkles, a treadmill embedded in the bridge surface showing the walker running but staying in place, Nia standing calmly at the edge pointing toward a different path labelled 'Experiences,' warm-to-cool gradient light, Studio Ghibli psychological visualization",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const NEEDS_WANTS_BRIDGE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_MASLOWS_HIERARCHY,
  ENTRY_PLANNED_OBSOLESCENCE,
  ENTRY_DIDEROT_EFFECT,
  ENTRY_HEDONIC_TREADMILL,
];

export const NEEDS_WANTS_BRIDGE_ENTRY_IDS =
  NEEDS_WANTS_BRIDGE_ENTRIES.map((e) => e.id);
