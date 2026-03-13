/**
 * Content Entries — Charity Harbor
 * World: Charity Harbor | Guide: Mei-Lin Wu | Subject: Giving / Philanthropy / Compassion
 *
 * Four published entries spanning charity, giving, and compassion:
 *   1. Effective Altruism — doing the most good
 *   2. Red Cross & Geneva Conventions — help without sides
 *   3. Andrew Carnegie's Gospel of Wealth — the duty to give back
 *   4. Zakat — giving as a pillar of faith
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Effective Altruism (Tier 1 — ages 5-6) ───────────────

export const ENTRY_EFFECTIVE_ALTRUISM: RealWorldEntry = {
  id: 'entry-effective-altruism',
  type: 'cultural_milestone',
  title: 'Doing the Most Good You Can',
  year: 2009,
  yearDisplay: '2009–present',
  era: 'contemporary',
  descriptionChild:
    "If you had money to help people, would you give it to whoever asked first? Or would you try to figure out where it would help the most? 'Effective Altruism' means thinking really carefully about how to do the most good with what you have.",
  descriptionOlder:
    "Peter Singer argued that if you can prevent suffering without sacrificing anything of comparable moral importance, you ought to. GiveWell was founded to evaluate charities by impact. They found that some charities are hundreds of times more effective than others — for example, $5,000 can save a statistical life through malaria bed-net distribution. Mei-Lin teaches that generosity is best when paired with research.",
  descriptionParent:
    "Effective Altruism (EA) applies evidence and reason to determine the most effective ways to benefit others. While the movement has faced criticism (FTX scandal, paternalism concerns, neglect of systemic change), its core insight — that charity effectiveness varies enormously — is well-supported. The $5,000-per-life-saved estimate comes from GiveWell's analysis of the Against Malaria Foundation. Teaching children to evaluate impact develops critical thinking about generosity.",
  realPeople: ['Peter Singer'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['effective altruism', 'charity', 'impact', 'evidence', 'giving'],
  worldId: 'charity-harbor',
  guideId: 'mei-lin-wu',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-red-cross-geneva'],
  funFact:
    "GiveWell estimates that $5,000 donated to the Against Malaria Foundation saves one statistical life. Mei-Lin keeps a jar of exactly 5,000 pebbles at the harbor entrance. Each one represents a dollar — and a life.",
  imagePrompt:
    "A harbor charity dock with a giant research station: charts showing charity effectiveness comparisons, a glass jar of 5,000 tiny glowing pebbles, Mei-Lin Wu pointing at impact data while children sort donations into 'most effective' chutes, warm compassionate harbor light with analytical overlays, Studio Ghibli compassion-meets-data aesthetic",
  status: 'published',
};

// ─── Entry 2: Red Cross & Geneva Conventions (Tier 2 — ages 7-8) ───

export const ENTRY_RED_CROSS_GENEVA: RealWorldEntry = {
  id: 'entry-red-cross-geneva',
  type: 'cultural_milestone',
  title: 'Help Without Sides',
  year: 1863,
  yearDisplay: '1863 CE',
  era: 'industrial',
  descriptionChild:
    "Henry Dunant saw a terrible battle and decided that hurt soldiers should be helped no matter which side they fought on. He started the Red Cross — helpers who wear a red cross so nobody shoots at them. They help in wars, earthquakes, and floods.",
  descriptionOlder:
    "After witnessing 40,000 casualties at the Battle of Solferino (1859), Swiss businessman Henry Dunant wrote A Memory of Solferino, proposing neutral humanitarian organisations. By 1863, the International Committee of the Red Cross was founded, and the first Geneva Convention (1864) established protection for wounded soldiers and medics. Today, the ICRC operates in 100+ countries under the principles of neutrality, impartiality, and independence.",
  descriptionParent:
    "Dunant's founding of the Red Cross and the Geneva Conventions represent one of humanity's most significant humanitarian achievements — the idea that even in war, there are rules. The conventions now protect prisoners of war, civilians, and humanitarian workers. Dunant won the first Nobel Peace Prize (1901) but died in poverty. Teaching children about the Red Cross develops understanding of universal humanitarian principles and the power of individual moral conviction.",
  realPeople: ['Henry Dunant'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 46.2044, lng: 6.1432, name: 'Geneva, Switzerland' },
  continent: 'Europe',
  subjectTags: ['Red Cross', 'Geneva Conventions', 'humanitarian', 'neutrality', 'war'],
  worldId: 'charity-harbor',
  guideId: 'mei-lin-wu',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-effective-altruism'],
  unlocks: ['entry-carnegie-gospel-of-wealth'],
  funFact:
    "Henry Dunant won the very first Nobel Peace Prize in 1901. But he'd spent all his money on humanitarian work and died in a hospice. Mei-Lin says: 'He gave everything — including the prize money.'",
  imagePrompt:
    "A harbor 'Time Window' showing the Battle of Solferino: wounded soldiers on a battlefield with Dunant kneeling to help, a glowing red cross symbol forming above him, transitioning to a modern Red Cross ship docked at Charity Harbor, Mei-Lin standing at the ship's gangway welcoming children, warm golden humanitarian light, Studio Ghibli historical empathy scene",
  status: 'published',
};

// ─── Entry 3: Carnegie's Gospel of Wealth (Tier 2 — ages 7-8) ──────

export const ENTRY_CARNEGIE_GOSPEL_OF_WEALTH: RealWorldEntry = {
  id: 'entry-carnegie-gospel-of-wealth',
  type: 'person',
  title: 'The Man Who Built 2,509 Libraries',
  year: 1889,
  yearDisplay: '1889 CE',
  era: 'industrial',
  descriptionChild:
    "Andrew Carnegie was once a very poor boy from Scotland. He became one of the richest people ever by making steel. Then he decided that rich people shouldn't keep all their money — they should use it to help others. He built 2,509 libraries around the world.",
  descriptionOlder:
    "Carnegie's 'Gospel of Wealth' (1889) argued that the wealthy have a moral obligation to redistribute surplus wealth for the public good during their lifetimes. He gave away $350 million (roughly $10 billion today), funding 2,509 public libraries, Carnegie Hall, and universities. Critics noted the irony: he accumulated wealth through steep labour exploitation (the Homestead Strike of 1892). Mei-Lin teaches both his generosity and his contradictions.",
  descriptionParent:
    "Carnegie's philanthropy raises enduring questions: Can giving away wealth atone for exploitative accumulation? Carnegie crushed unions and workers died in his steel mills, yet his libraries democratised access to knowledge for millions. The 'Gospel of Wealth' influenced modern billionaire philanthropy (the Giving Pledge). Teaching children about Carnegie develops nuanced thinking about wealth, responsibility, and whether philanthropy can substitute for justice.",
  realPeople: ['Andrew Carnegie'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 40.7614, lng: -73.9776, name: 'New York City, USA' },
  continent: 'North America',
  subjectTags: ['philanthropy', 'Carnegie', 'libraries', 'wealth', 'giving'],
  worldId: 'charity-harbor',
  guideId: 'mei-lin-wu',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-red-cross-geneva'],
  unlocks: ['entry-zakat'],
  funFact:
    "Carnegie's 2,509 libraries included ones in countries he'd never visited. Mei-Lin keeps a model Carnegie library at the harbor dock 'because every port needs a library.'",
  imagePrompt:
    "A harbor dock featuring a miniature Carnegie library: bookshelves visible through windows, a young Scottish immigrant boy on one side transforming into a wealthy industrialist on the other, 2,509 tiny library buildings spreading across a harbor map table, Mei-Lin reading to children on the library steps, warm golden library light mixing with harbor sunset, Studio Ghibli philanthropy diorama",
  status: 'published',
};

// ─── Entry 4: Zakat (Tier 3 — ages 9-10) ───────────────────────────

export const ENTRY_ZAKAT: RealWorldEntry = {
  id: 'entry-zakat',
  type: 'cultural_milestone',
  title: 'Giving as a Way of Life',
  year: null,
  yearDisplay: 'Historical — ongoing',
  era: 'medieval',
  descriptionChild:
    "In Islam, giving 2.5% of your savings to people who need it isn't just nice — it's one of the five most important things you do. It's called Zakat. Everyone who has enough must give. It's not a gift — it's a responsibility.",
  descriptionOlder:
    "Zakat is one of the Five Pillars of Islam — a mandatory 2.5% annual donation on accumulated wealth above a minimum threshold (nisab). Unlike voluntary charity (sadaqah), Zakat is a religious obligation that purifies wealth and ensures social solidarity. The system creates a structured redistribution mechanism that has operated for over 1,400 years, predating modern welfare states by centuries.",
  descriptionParent:
    "Zakat represents one of humanity's oldest formalised wealth redistribution systems. As a pillar of Islamic practice, it makes charitable giving non-optional — a structural feature of the faith rather than a personal choice. Comparing Zakat with other traditions (Christian tithing, Buddhist dana, secular progressive taxation) develops cross-cultural understanding of how societies have institutionalised care for the vulnerable. Teaching Zakat develops respect for diverse approaches to social responsibility.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['Zakat', 'Islam', 'giving', 'Five Pillars', 'social responsibility'],
  worldId: 'charity-harbor',
  guideId: 'mei-lin-wu',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-carnegie-gospel-of-wealth'],
  unlocks: [],
  funFact:
    "The word 'Zakat' comes from the Arabic root meaning 'to purify.' The idea is that giving away part of your wealth purifies the rest. Mei-Lin says: 'In Charity Harbor, we believe that what you give away is more yours than what you keep.'",
  imagePrompt:
    "A Charity Harbor sanctuary room: a golden scale weighing 2.5% of treasure, five pillars of light representing the Five Pillars of Islam, families from different cultures contributing to a shared communal chest, Mei-Lin facilitating a cross-cultural discussion circle, warm interfaith golden light, Studio Ghibli spiritual generosity aesthetic",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const CHARITY_HARBOR_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_EFFECTIVE_ALTRUISM,
  ENTRY_RED_CROSS_GENEVA,
  ENTRY_CARNEGIE_GOSPEL_OF_WEALTH,
  ENTRY_ZAKAT,
];

export const CHARITY_HARBOR_ENTRY_IDS =
  CHARITY_HARBOR_ENTRIES.map((e) => e.id);
