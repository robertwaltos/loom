/**
 * Content Entries — Entrepreneur's Workshop
 * World: Entrepreneur's Workshop | Guide: Diego Montoya-Silva | Subject: Entrepreneurship
 *
 * Four published entries spanning entrepreneurship and innovation:
 *   1. Madam C. J. Walker — America's first self-made female millionaire
 *   2. The Failure Wall — why businesses fail and what failure teaches
 *   3. The Pivot — when the original plan doesn't work
 *   4. Patent Law — protecting ideas
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Madam C. J. Walker (Tier 1 — ages 5-6) ───────────────

export const ENTRY_MADAM_CJ_WALKER: RealWorldEntry = {
  id: 'entry-madam-cj-walker',
  type: 'person',
  title: 'Started with $1.50',
  year: 1910,
  yearDisplay: '1910 CE',
  era: 'modern',
  descriptionChild:
    "Sarah Breedlove was born to parents who had been enslaved. She worked as a washerwoman, earning $1.50 a day. When her hair started falling out, she created her own hair care products — and built them into a business that made her a millionaire. She did it herself, from nothing.",
  descriptionOlder:
    "Walker didn't just build a product — she built a distribution system. She trained thousands of 'Walker Agents,' mostly Black women, giving them economic independence through sales commissions. Her business model anticipated modern direct sales by decades. She donated extensively to Black schools, orphanages, and anti-lynching campaigns. Diego keeps her portrait above the door with the caption: 'Started with $1.50.'",
  descriptionParent:
    "Madam C. J. Walker's story exemplifies entrepreneurship as a force for systemic change. Her innovation was not just the product but the distribution model — empowering others to become economic agents. She challenged both racial and gender barriers in early 20th-century America, building wealth and reinvesting it in community uplift. Her legacy connects entrepreneurship to social justice in ways that remain relevant.",
  realPeople: ['Madam C. J. Walker (Sarah Breedlove)'],
  quote: "I am a woman who came from the cotton fields of the South. From there I was promoted to the washtub. From there I promoted myself.",
  quoteAttribution: 'Madam C. J. Walker',
  geographicLocation: { lat: 39.7684, lng: -86.1581, name: 'Indianapolis, Indiana, USA' },
  continent: 'North America',
  subjectTags: ['entrepreneurship', 'self-made', 'business', 'civil rights', 'innovation'],
  worldId: 'entrepreneur-workshop',
  guideId: 'diego-montoya-silva',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-failure-wall'],
  funFact:
    "Walker employed over 3,000 people at the height of her business. When the National Negro Business League refused to let her speak at their 1912 convention, she stood up anyway and spoke from the floor. She talked for so long they gave up trying to stop her.",
  imagePrompt:
    "Early 1900s Indianapolis, a confident Black woman (Madam C. J. Walker) standing in front of her thriving factory, workers behind glass windows, a hand-painted sign reading 'Walker Manufacturing Company,' shelves of elegant hair care bottles, a framed portrait on the workshop wall with the caption 'Started with $1.50,' warm golden afternoon light, Studio Ghibli painterly realism with historical documentary quality",
  status: 'published',
};

// ─── Entry 2: The Failure Wall (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_FAILURE_WALL: RealWorldEntry = {
  id: 'entry-failure-wall',
  type: 'scientific_principle',
  title: 'The Wall Where Failure Is Fame',
  year: null,
  yearDisplay: 'Timeless Principle',
  era: 'contemporary',
  descriptionChild:
    "Diego's workshop is full of broken prototypes. He frames his failures and hangs them on the wall because every failure taught him something. Thomas Edison failed 10,000 times before inventing the light bulb. He said he didn't fail — he found 10,000 ways that didn't work.",
  descriptionOlder:
    "Approximately 90% of startups fail. The most common reasons: building something nobody wants (42%), running out of money (29%), and having the wrong team (23%). Diego teaches that failure analysis is more valuable than success celebration. Each failed prototype in the Workshop has a tag explaining what went wrong and what the next version fixed.",
  descriptionParent:
    "The culture of learning from failure underpins modern innovation methodology — from lean startup to design thinking. Systematic failure analysis (post-mortems, retrospectives) is standard practice in engineering and business. Teaching children that failure is informational rather than shameful builds resilience and healthy risk-assessment. Diego's Failure Wall makes this principle tangible rather than platitudinal.",
  realPeople: ['Thomas Edison'],
  quote: "I have not failed. I've just found 10,000 ways that won't work.",
  quoteAttribution: 'Thomas Edison',
  geographicLocation: null,
  continent: null,
  subjectTags: ['failure', 'entrepreneurship', 'innovation', 'resilience', 'startups'],
  worldId: 'entrepreneur-workshop',
  guideId: 'diego-montoya-silva',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-madam-cj-walker'],
  unlocks: ['entry-the-pivot'],
  funFact:
    "James Dyson created 5,127 prototypes before his vacuum cleaner worked. Each one is documented. Diego says the Workshop has a rule: 'If you haven't failed today, you haven't tried anything worth trying.'",
  imagePrompt:
    "A creative workshop wall covered with framed broken prototypes and failed inventions, each with a handwritten tag explaining the lesson learned, Edison's light bulb sketches in the corner, Dyson vacuum parts on a shelf, warm workshop lighting with sawdust motes in the air, a chalkboard with '5,127 tries' written on it, Studio Ghibli detailed interior, atmosphere of proud perseverance",
  status: 'published',
};

// ─── Entry 3: The Pivot (Tier 2 — ages 7-8) ────────────────────────

export const ENTRY_THE_PIVOT: RealWorldEntry = {
  id: 'entry-the-pivot',
  type: 'cultural_milestone',
  title: 'When the Plan Changes, the Magic Begins',
  year: null,
  yearDisplay: 'Modern Era',
  era: 'contemporary',
  descriptionChild:
    "Sometimes you start building one thing and discover that something else is better. A group trying to make a video game accidentally made a messaging tool instead — and that became Slack, which millions of people use for work. The plan changed. The outcome was bigger.",
  descriptionOlder:
    "A 'pivot' in business means changing direction when evidence shows the original plan isn't working. Instagram started as Burbn, a location check-in app. YouTube started as a video dating site. Twitter started as a podcast directory. The ability to recognise failure early and redirect resources is often more valuable than the original idea. Diego calls the pivot 'the entrepreneur's most underrated skill.'",
  descriptionParent:
    "The concept of the strategic pivot — systematically redirecting a company's resources based on validated learning — was formalised by Eric Ries in The Lean Startup (2011). Understanding pivots teaches children that plans are hypotheses, not commitments, and that adapting to reality is a strength, not a failure. The business examples (Slack, Instagram, YouTube) demonstrate that some of the world's most successful products emerged from abandoned original ideas.",
  realPeople: ['Stewart Butterfield', 'Kevin Systrom'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['pivot', 'entrepreneurship', 'adaptation', 'startups', 'innovation'],
  worldId: 'entrepreneur-workshop',
  guideId: 'diego-montoya-silva',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-failure-wall'],
  unlocks: ['entry-patent-law'],
  funFact:
    "Slack's original name was 'Searchable Log of All Conversation and Knowledge.' The acronym is the product name. Diego appreciates that one of the most successful pivots in tech history was named as a backronym joke.",
  imagePrompt:
    "A workshop table split in half: left side shows abandoned prototypes of a video game with controllers and pixel art, right side shows a glowing messaging interface on a screen with the word 'Slack' forming from scattered game pieces, arrows of transformation connecting the two halves, warm creative workshop light, tools and sketches scattered around, Studio Ghibli magical transformation aesthetic",
  status: 'published',
};

// ─── Entry 4: Patent Law (Tier 3 — ages 9-10) ──────────────────────

export const ENTRY_PATENT_LAW: RealWorldEntry = {
  id: 'entry-patent-law',
  type: 'cultural_milestone',
  title: 'The Paper That Protects an Idea',
  year: 1790,
  yearDisplay: '1790 CE',
  era: 'enlightenment',
  descriptionChild:
    "If you invent something new, you can get a patent — an official paper that says nobody else can copy your invention for a certain number of years. It protects inventors so they can benefit from their own ideas before others can use them.",
  descriptionOlder:
    "The patent system creates a bargain: inventors disclose how their invention works (adding to public knowledge) in exchange for temporary exclusive rights (typically 20 years). The system has been criticised for being exploited by 'patent trolls' — companies that buy patents just to sue others — and for creating barriers in fields like medicine where patent-protected drugs are priced beyond patients' reach. Diego teaches that every protection system has trade-offs.",
  descriptionParent:
    "Patent law embodies a fundamental tension in innovation policy: incentivising creation through exclusivity while ensuring broader access to knowledge. The U.S. Patent Act of 1790 was among a new nation's first legislative acts, reflecting how highly intellectual property was valued. Modern debates about pharmaceutical patents, software patents, and patent trolling show that the system's original balance continues to shift. Teaching children about patents introduces concepts of fairness, incentive design, and societal trade-offs.",
  realPeople: ['Thomas Jefferson'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 38.8951, lng: -77.0364, name: 'Washington, D.C., USA' },
  continent: 'North America',
  subjectTags: ['patents', 'intellectual property', 'innovation', 'law', 'entrepreneurship'],
  worldId: 'entrepreneur-workshop',
  guideId: 'diego-montoya-silva',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-the-pivot'],
  unlocks: [],
  funFact:
    "The first U.S. patent was granted in 1790 for a method of making potash (used in soap). Thomas Jefferson personally reviewed it. Diego has a replica of Patent #1 on the wall. He says: 'Everything starts with one.'",
  imagePrompt:
    "A grand workshop office with a large oak desk, an ornate patent certificate framed and lit by a brass desk lamp, a replica of U.S. Patent #1 mounted on the wall, Thomas Jefferson's silhouette visible in a portrait, scattered invention sketches and prototype models on shelves, warm amber light through tall windows, Studio Ghibli detailed interior with historical gravitas",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const ENTREPRENEUR_WORKSHOP_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_MADAM_CJ_WALKER,
  ENTRY_FAILURE_WALL,
  ENTRY_THE_PIVOT,
  ENTRY_PATENT_LAW,
];

export const ENTREPRENEUR_WORKSHOP_ENTRY_IDS =
  ENTREPRENEUR_WORKSHOP_ENTRIES.map((e) => e.id);
