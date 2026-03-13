/**
 * Content Entries — Time Gallery
 * World: Time Gallery | Guide: Rami al-Farsi | Subject: Historical Thinking
 *
 * Four published entries spanning how we understand and measure time:
 *   1. The Invention of the Calendar — ordering time
 *   2. Howard Zinn and the People's History — whose story gets told
 *   3. Oral History — the voices that weren't written down
 *   4. The Long Now Foundation — thinking in 10,000-year spans
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Invention of the Calendar (Tier 1 — ages 5-6) ────

export const ENTRY_INVENTION_OF_CALENDAR: RealWorldEntry = {
  id: 'entry-invention-of-calendar',
  type: 'invention',
  title: 'How Humans Learned to Measure Time',
  year: -4000,
  yearDisplay: '~4000 BCE',
  era: 'ancient',
  descriptionChild:
    "How do you know when to plant crops, when to celebrate, or when winter is coming? Ancient people solved this by watching the sun, moon, and stars and making calendars. Different civilisations made different calendars, and some are still used today.",
  descriptionOlder:
    "Calendar systems reflect cultural priorities: the Islamic calendar is lunar (354 days), the Hebrew calendar is lunisolar, the Gregorian calendar is solar (365.2425 days). The Mayan Long Count calendar tracked cycles of over 5,000 years. When Pope Gregory XIII reformed the Julian calendar in 1582, ten days were 'deleted' — people went to bed on October 4th and woke up on October 15th. Rami uses the Gallery to show that time is measured, not given.",
  descriptionParent:
    "Calendar systems are among humanity's oldest technologies, reflecting astronomical observation, agricultural necessity, and cultural values. The diversity of calendar systems still in use (Gregorian, Islamic, Hebrew, Chinese, Hindu, Ethiopian) demonstrates that 'measuring time' is a cultural act. Teaching children about calendars develops understanding of how seemingly neutral systems encode cultural assumptions.",
  realPeople: ['Pope Gregory XIII'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 32.5427, lng: 44.4209, name: 'Mesopotamia (modern Iraq)' },
  continent: 'Asia',
  subjectTags: ['calendar', 'time', 'astronomy', 'measurement', 'civilisation'],
  worldId: 'time-gallery',
  guideId: 'rami-al-farsi',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-howard-zinn'],
  funFact:
    "When the Gregorian calendar was adopted in Britain (1752), some people rioted, demanding 'give us back our eleven days.' They believed the government had stolen eleven days of their lives. Rami says: 'Time is the most personal thing we have. People don't give it up easily.'",
  imagePrompt:
    "A Time Gallery hall of calendars: massive circular calendar wheels from different civilisations (Mayan, Islamic, Gregorian, Chinese) displayed on gallery walls, a gap showing ten 'deleted' days floating in space, Rami al-Farsi walking children through with each era lit differently, warm museum-quality lighting, Studio Ghibli historical wonder aesthetic",
  status: 'published',
};

// ─── Entry 2: Howard Zinn — People's History (Tier 2 — ages 7-8) ───

export const ENTRY_HOWARD_ZINN: RealWorldEntry = {
  id: 'entry-howard-zinn',
  type: 'person',
  title: 'The History Nobody Told',
  year: 1980,
  yearDisplay: '1980 CE',
  era: 'contemporary',
  descriptionChild:
    "Most history books tell the story of kings, presidents, and generals. Howard Zinn wrote a history book about everyone else — the workers, the enslaved people, the immigrants, the women, the people whose stories were usually left out.",
  descriptionOlder:
    "A People's History of the United States (1980) retold American history from the perspectives of Indigenous peoples, enslaved Africans, workers, and immigrants. Zinn argued that 'objective' history is impossible — every narrative reflects the storyteller's position. His work was criticised as biased, but his fundamental point stands: every historical account makes choices about what to include and exclude. Rami teaches all perspectives.",
  descriptionParent:
    "Zinn's work is a landmark in historiographical methodology — the study of how history is written. His central argument (that perspective shapes narrative) is now mainstream in historical thinking. Teaching children that 'what happened' is always filtered through 'who's telling' develops critical media literacy and intellectual independence. Rami models this by presenting every event from multiple perspectives, never declaring one 'correct.'",
  realPeople: ['Howard Zinn'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 40.6892, lng: -74.0445, name: 'New York City, USA' },
  continent: 'North America',
  subjectTags: ['historiography', 'perspective', 'inclusivity', 'narrative', 'equity'],
  worldId: 'time-gallery',
  guideId: 'rami-al-farsi',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-invention-of-calendar'],
  unlocks: ['entry-oral-history'],
  funFact:
    "Zinn's book has sold over 2 million copies. He said: 'You can't be neutral on a moving train.' Rami has the quote on the Gallery wall. Below it, he adds: 'But you can see both sides of the track.'",
  imagePrompt:
    "A Time Gallery exhibit: the same historical event shown from three perspectives — an official painting, a worker's photograph, and a handwritten letter from someone affected — Rami standing between them asking children which tells the 'real' story, warm analytical museum light, Studio Ghibli multiperspective history aesthetic",
  status: 'published',
};

// ─── Entry 3: Oral History (Tier 2 — ages 7-8) ─────────────────────

export const ENTRY_ORAL_HISTORY: RealWorldEntry = {
  id: 'entry-oral-history',
  type: 'cultural_milestone',
  title: 'The Voices That Were Never Written Down',
  year: 1930,
  yearDisplay: '1930s–present',
  era: 'modern',
  descriptionChild:
    "Before recordings, the stories of ordinary people — farmers, workers, grandparents — were rarely written down. Oral history is the practice of interviewing people and recording their memories before they're lost.",
  descriptionOlder:
    "Studs Terkel's Working (1974) and The Good War (1984) preserved the voices of janitors, steelworkers, waitresses, and World War II veterans who would never have appeared in traditional histories. The Federal Writers' Project (1930s) interviewed over 2,300 formerly enslaved people — creating an irreplaceable primary source. Rami teaches that official history is curated; oral history is chaotic, contradictory, and closer to lived truth.",
  descriptionParent:
    "Oral history methodology democratises the historical record by capturing voices excluded from written archives. The Federal Writers' Project interviews with formerly enslaved people remain among the most valuable primary sources for understanding American slavery. Teaching children oral history techniques develops active listening, empathy, and respect for lived experience as a form of evidence.",
  realPeople: ['Studs Terkel'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 41.8781, lng: -87.6298, name: 'Chicago, Illinois, USA' },
  continent: 'North America',
  subjectTags: ['oral history', 'memory', 'interviews', 'primary sources', 'preservation'],
  worldId: 'time-gallery',
  guideId: 'rami-al-farsi',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-howard-zinn'],
  unlocks: ['entry-long-now-foundation'],
  funFact:
    "Terkel's interview subjects often said things like 'nobody ever asked me about my life before.' The act of being listened to was, for many, as meaningful as the recording itself. Rami says: 'The Gallery's most valuable exhibits are the ones told, not built.'",
  imagePrompt:
    "A Time Gallery listening room: a recording booth with a microphone and tape reels, photographs of everyday people (farmers, steelworkers, waitresses) mounted on the walls, Rami training children in interview technique with notebooks and gentle questions, warm intimate amber light, Studio Ghibli oral history documentary aesthetic",
  status: 'published',
};

// ─── Entry 4: The Long Now Foundation (Tier 3 — ages 9-10) ─────────

export const ENTRY_LONG_NOW_FOUNDATION: RealWorldEntry = {
  id: 'entry-long-now-foundation',
  type: 'cultural_milestone',
  title: 'Thinking in 10,000-Year Spans',
  year: 1996,
  yearDisplay: '1996–present',
  era: 'contemporary',
  descriptionChild:
    "Most people think about tomorrow or next week. The Long Now Foundation thinks about the next 10,000 years. They're building a giant clock inside a mountain in Texas that's designed to tick for 10,000 years. It asks the biggest question: what do we want to leave behind?",
  descriptionOlder:
    "Danny Hillis proposed the Clock of the Long Now to expand humanity's time horizon beyond the next quarterly report or election cycle. The clock, currently under construction inside a mountain in West Texas, is designed to tick for ten millennia — requiring visitors to physically wind it. The project is both engineering feat and philosophical statement: it forces consideration of decisions whose consequences unfold across centuries.",
  descriptionParent:
    "The Long Now Foundation challenges the pervasive short-termism of modern culture. The Clock of the Long Now is designed to be both a functional timepiece and a philosophical provocation — what would you do differently if you thought about the next 10,000 years? Teaching children long-term thinking develops temporal perspective, responsibility, and the understanding that their actions contribute to timescales beyond their lifetime.",
  realPeople: ['Stewart Brand', 'Danny Hillis'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 31.0, lng: -104.8, name: 'West Texas, USA' },
  continent: 'North America',
  subjectTags: ['long-term thinking', 'time', 'philosophy', 'legacy', 'responsibility'],
  worldId: 'time-gallery',
  guideId: 'rami-al-farsi',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-oral-history'],
  unlocks: [],
  funFact:
    "The Clock of the Long Now uses five-digit years (02025 instead of 2025) to solve the 'Year 10,000 problem.' It chimes differently every day for 10,000 years — never repeating the same sequence. Rami calls this 'the opposite of a stopwatch.'",
  imagePrompt:
    "A Time Gallery future wing: a massive clock mechanism inside a mountain cross-section, gears designed to tick for 10,000 years, five-digit year displays (02025), children writing sealed messages to the future, Rami sealing time capsules with reverence, vast geological time-scale light, Studio Ghibli deep time wonder aesthetic",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const TIME_GALLERY_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_INVENTION_OF_CALENDAR,
  ENTRY_HOWARD_ZINN,
  ENTRY_ORAL_HISTORY,
  ENTRY_LONG_NOW_FOUNDATION,
];

export const TIME_GALLERY_ENTRY_IDS =
  TIME_GALLERY_ENTRIES.map((e) => e.id);
