/**
 * Content Entries — Data Stream
 * World: The Data Stream | Guide: Yuki | Subject: Data Science / Sorting & Graphing
 *
 * Four published entries spanning the history of data visualisation:
 *   1. Florence Nightingale's rose chart — using pictures to save lives
 *   2. John Snow and the cholera map — finding the pattern before the cause
 *   3. Hans Rosling and the moving bubble chart — updating the world's assumptions
 *   4. The misinformation epidemic — when bad data spreads
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Nightingale's Rose Chart (Tier 1 — ages 5-6) ─────────

export const ENTRY_NIGHTINGALE_ROSE_CHART: RealWorldEntry = {
  id: 'entry-nightingale-rose-chart',
  type: 'person',
  title: "The Nurse Who Used Pictures to Save Lives",
  year: 1858,
  yearDisplay: '1858 CE',
  era: 'industrial',
  descriptionChild:
    "Florence Nightingale was a nurse who proved that most soldiers were dying in hospital from dirty conditions — not battle wounds. She drew a beautiful circular chart that made the data impossible to ignore. The government changed how hospitals worked because of a diagram. She used pictures to save lives.",
  descriptionOlder:
    "Nightingale's coxcomb polar area diagram was not just a visualisation — it was a persuasion tool. She understood that politicians who refused to read statistics would look at a compelling image. She effectively invented data advocacy. The Nightingale Ward is the first place Yuki takes every new visitor.",
  descriptionParent:
    "Florence Nightingale's polar area diagrams (1858) pioneered the use of data visualisation as a policy advocacy tool. During the Crimean War, she demonstrated that 16,000 of 18,000 British soldier deaths resulted from preventable diseases — not combat wounds. Her 'coxcomb' charts made this ratio visually undeniable to politicians who ignored written reports. She effectively invented data as persuasion — a skill now central to public health, journalism, and policy. The story teaches children that how you present data can matter as much as the data itself.",
  realPeople: ['Florence Nightingale'],
  quote: "To understand God's thoughts we must study statistics, for these are the measure of His purpose.",
  quoteAttribution: 'Florence Nightingale',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['data visualisation', 'nursing', 'statistics', 'public health', 'advocacy'],
  worldId: 'data-stream',
  guideId: 'yuki',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-snow-cholera-map'],
  funFact:
    'Of 18,000 British soldiers who died in the Crimean War, 16,000 died from preventable diseases — not from combat. That ratio, invisible in text, became undeniable the moment Nightingale drew it.',
  imagePrompt:
    'Glowing polar area diagram floating over a data stream river, rose-colored segments showing mortality data, stained-glass style',
  status: 'published',
};

// ─── Entry 2: John Snow's Cholera Map (Tier 2 — ages 7-8) ──────────

export const ENTRY_SNOW_CHOLERA_MAP: RealWorldEntry = {
  id: 'entry-snow-cholera-map',
  type: 'discovery',
  title: "The Map That Found the Killer Pump",
  year: 1854,
  yearDisplay: '1854 CE',
  era: 'industrial',
  descriptionChild:
    "People in London were dying from cholera and nobody knew why. Dr. John Snow mapped every death on the streets where it happened. The map showed that all the deaths clustered around one water pump. He removed the pump handle. The deaths stopped. He had found the pattern before anyone understood the cause.",
  descriptionOlder:
    "Snow's investigation is the founding moment of epidemiology — the science of how diseases spread. He had no germ theory to guide him; he reasoned purely from spatial pattern in data. His hand-drawn map is one of the most famous data visualisations in history and is displayed in the Snow Map zone of the Data Stream.",
  descriptionParent:
    "John Snow's 1854 investigation of the Broad Street cholera outbreak is considered the founding event of modern epidemiology. By mapping deaths and identifying their spatial clustering around a single water pump, Snow demonstrated the waterborne transmission of cholera — decades before germ theory was accepted. After the pump handle was removed, deaths declined sharply. Authorities replaced the handle after the crisis, still skeptical of Snow's explanation. Germ theory was not widely accepted for another 15 years. The story teaches pattern recognition, spatial analysis, and the gap between evidence and acceptance.",
  realPeople: ['John Snow'],
  quote: "The most terrible outbreak of cholera which ever occurred in this kingdom.",
  quoteAttribution: 'John Snow, 1855',
  geographicLocation: { lat: 51.5133, lng: -0.1365, name: 'Broad Street, London, England' },
  continent: 'Europe',
  subjectTags: ['epidemiology', 'cholera', 'data mapping', 'public health', 'spatial analysis'],
  worldId: 'data-stream',
  guideId: 'yuki',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-nightingale-rose-chart'],
  unlocks: ['entry-rosling-bubble-chart'],
  funFact:
    "After the outbreak ended, the pump handle was put back because authorities still didn't accept Snow's explanation. Germ theory wasn't accepted for another 15 years. Snow was right for 15 years before anyone believed him.",
  imagePrompt:
    'Hand-drawn street map floating in a data stream, death markers clustering around a single water pump, the pump handle glowing red',
  status: 'published',
};

// ─── Entry 3: Rosling's Moving Bubble Chart (Tier 2 — ages 7-8) ────

export const ENTRY_ROSLING_BUBBLE_CHART: RealWorldEntry = {
  id: 'entry-rosling-bubble-chart',
  type: 'person',
  title: "The Doctor Who Proved Everyone Wrong",
  year: 2006,
  yearDisplay: '2006 CE',
  era: 'modern',
  descriptionChild:
    "Hans Rosling was a doctor who believed most people had completely wrong ideas about the world — that they thought poor countries were still very poor when data showed enormous improvements. He created animated charts that showed the data moving across decades, and audiences gasped every time.",
  descriptionOlder:
    "Rosling showed that global health and wealth data, properly visualised with animation, contradicted most educated peoples' mental models. His TED talks changed how millions think about global development. He called this 'factfulness' — basing your worldview on current data rather than remembered impressions.",
  descriptionParent:
    "Hans Rosling's animated bubble charts (popularised from 2006) transformed public understanding of global development. By animating 200 years of health and income data, he demonstrated that most educated adults hold mental models of the world that are decades out of date. In controlled tests, university students scored worse than random chance on global development questions — choosing answers that matched the world of 30–40 years ago. His concept of 'factfulness' — basing worldviews on current data rather than outdated impressions — is a foundational data literacy skill.",
  realPeople: ['Hans Rosling'],
  quote: "The world cannot be understood without numbers. And it cannot be understood with numbers alone.",
  quoteAttribution: 'Hans Rosling, Factfulness, 2018',
  geographicLocation: { lat: 59.3293, lng: 18.0686, name: 'Sweden' },
  continent: 'Europe',
  subjectTags: ['data literacy', 'global development', 'animated charts', 'factfulness', 'bias'],
  worldId: 'data-stream',
  guideId: 'yuki',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-nightingale-rose-chart'],
  unlocks: ['entry-misinformation-epidemic'],
  funFact:
    'Rosling famously demonstrated that Western university students consistently scored worse than random chance on global development questions — choosing answers that matched the world of 40 years ago.',
  imagePrompt:
    'Animated bubble chart in a data garden, colourful spheres representing nations moving through decades of health and wealth data, students gasping',
  status: 'published',
};

// ─── Entry 4: The Misinformation Epidemic (Tier 3 — ages 9-10) ─────

export const ENTRY_MISINFORMATION_EPIDEMIC: RealWorldEntry = {
  id: 'entry-misinformation-epidemic',
  type: 'scientific_principle',
  title: "When Bad Data Spreads Faster Than Good",
  year: 2016,
  yearDisplay: '2016 CE',
  era: 'modern',
  descriptionChild:
    "Not all information is true. Some people make up numbers to trick others. A good data scientist — like Yuki — always asks: where did this number come from? How was it measured? Who benefits if you believe it? These three questions protect you.",
  descriptionOlder:
    "Misinformation spreads through social networks following the same mathematical models as infectious disease. MIT researchers found that false news spreads six times faster than true news because it is more novel and emotionally surprising. Source literacy, methodology checking, and understanding motivated reasoning are essential skills in the information age.",
  descriptionParent:
    "Research published in Science (Vosoughi et al., 2018) demonstrated that false information spreads through social networks approximately six times faster than accurate information, driven by novelty bias and emotional engagement. Misinformation follows epidemiological diffusion models — making the metaphor of 'viral' false news mathematically precise. Teaching children source evaluation (provenance), methodology checking, and motivated reasoning detection provides foundational media literacy. The three questions — source, method, interest — form a portable critical thinking framework applicable well beyond data science.",
  realPeople: [],
  quote: "The antidote is not cynicism — it is methodology.",
  quoteAttribution: 'Yuki, Guide of the Data Stream',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['misinformation', 'media literacy', 'source evaluation', 'critical thinking', 'viral spread'],
  worldId: 'data-stream',
  guideId: 'yuki',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-snow-cholera-map', 'entry-rosling-bubble-chart'],
  unlocks: [],
  funFact:
    'A study found that a false story spreads to 1,500 people six times faster than a true story travels to the same number. Yuki says the antidote is not cynicism — it is methodology.',
  imagePrompt:
    'Two data streams diverging — one pure and clean, the other corrupted with red distortions — flowing through a sorting landscape with checkpoints',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const DATA_STREAM_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_NIGHTINGALE_ROSE_CHART,
  ENTRY_SNOW_CHOLERA_MAP,
  ENTRY_ROSLING_BUBBLE_CHART,
  ENTRY_MISINFORMATION_EPIDEMIC,
] as const;

export const DATA_STREAM_ENTRY_IDS: readonly string[] =
  DATA_STREAM_ENTRIES.map((e) => e.id);
