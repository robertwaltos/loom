/**
 * Content Entries — Editing Tower
 * World: The Editing Tower | Guide: Wren Calloway | Subject: Editing / Revision
 *
 * Four published entries spanning the art and craft of revision:
 *   1. Maxwell Perkins — the invisible hand behind great novels
 *   2. Hemingway's Iceberg Theory — less is more
 *   3. Toni Morrison on revision — the discipline of beauty
 *   4. Wikipedia — the collectively edited truth
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Maxwell Perkins (Tier 1) ──────────────────────────────

export const ENTRY_MAXWELL_PERKINS: RealWorldEntry = {
  id: 'entry-maxwell-perkins',
  type: 'person',
  title: "The Editor Who Made Masterpieces Possible",
  year: 1920,
  yearDisplay: '1920s–1940s CE',
  era: 'modern',
  descriptionChild:
    "Maxwell Perkins was a book editor who helped some of the most famous writers in history. F. Scott Fitzgerald, Ernest Hemingway, and Thomas Wolfe all needed his help to turn their messy first drafts into brilliant books. Without Perkins, some of the greatest novels ever written might never have existed.",
  descriptionOlder:
    "Perkins is the most famous book editor in history. He cut 90,000 words from Thomas Wolfe's manuscript for Look Homeward, Angel, transforming it from an unreadable mess into a masterpiece. He gave Fitzgerald the structural feedback that shaped The Great Gatsby. He championed Hemingway when other publishers rejected his work. Perkins understood that editing is not about correcting mistakes — it's about finding the best version of something the writer couldn't see alone.",
  descriptionParent:
    "Maxwell Perkins (1884–1947) at Scribner's is the archetype of the literary editor as creative collaborator. His work with F. Scott Fitzgerald (restructuring The Great Gatsby), Thomas Wolfe (cutting ~90,000 words from Look Homeward, Angel), and Ernest Hemingway (championing The Sun Also Rises against internal resistance) established the modern model of developmental editing. Perkins' approach was Socratic rather than prescriptive: he identified structural problems and asked questions that guided writers to their own solutions. The story teaches children that revision is not punishment — it's the stage where good work becomes great, and that a skilled editor sees what the writer cannot.",
  realPeople: ['Maxwell Perkins', 'F. Scott Fitzgerald', 'Thomas Wolfe', 'Ernest Hemingway'],
  quote: "Editing is not about correcting mistakes — it's about finding the best version of something the writer couldn't see alone.",
  quoteAttribution: 'Wren Calloway, Guide of the Editing Tower',
  geographicLocation: { lat: 40.7580, lng: -73.9855, name: 'New York City, USA' },
  continent: 'North America',
  subjectTags: ['Maxwell Perkins', 'editing', 'revision', 'Scribner\'s', 'literary editor'],
  worldId: 'editing-tower',
  guideId: 'wren-calloway',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-hemingway-iceberg-theory'],
  funFact:
    "Perkins cut about 90,000 words from Thomas Wolfe's first novel — that's an entire novel's worth of cuts. Wolfe delivered manuscripts in crates. Perkins once said that an editor's job is to help the writer do what the writer is trying to do, not what the editor would do.",
  imagePrompt:
    'Editing Tower study high above the clouds, stacks of manuscript pages with red editorial marks, window overlooking the Expression Realm, warm desk light and scattered pencils',
  status: 'published',
};

// ─── Entry 2: Hemingway's Iceberg Theory (Tier 2) ──────────────────

export const ENTRY_HEMINGWAY_ICEBERG_THEORY: RealWorldEntry = {
  id: 'entry-hemingway-iceberg-theory',
  type: 'person',
  title: "The Writer Who Deleted Almost Everything",
  year: 1932,
  yearDisplay: '1932 CE',
  era: 'modern',
  descriptionChild:
    "Ernest Hemingway had a rule: if you know something well enough, you don't have to write it. Like an iceberg, one-eighth shows above the water and seven-eighths is hidden below. He rewrote the ending of A Farewell to Arms 47 times because nothing felt true enough.",
  descriptionOlder:
    "Hemingway's 'Iceberg Theory' (or 'Theory of Omission'), articulated in Death in the Afternoon (1932), argues that a writer's knowledge of a subject gives the writing its power, even if most of that knowledge is never explicitly stated. His famously spare prose style — short sentences, everyday language, minimal adjectives — was the result of obsessive revision. He rewrote the final page of A Farewell to Arms 47 times before he was satisfied. When asked what the problem was, he said: \"Getting the words right.\"",
  descriptionParent:
    "Hemingway's Theory of Omission, formally articulated in Death in the Afternoon (1932), holds that the dignity of movement of an iceberg is due to only one-eighth of it being above water. The principle — that deliberately withheld information strengthens rather than weakens prose — represents a radical editing philosophy. His 47 revisions of the A Farewell to Arms ending document the practical application of this theory. The surviving manuscripts at the John F. Kennedy Library show the evolution from elaborate to spare, demonstrating that simplicity is the product of extensive revision. The theory teaches children that editing is not about adding more — it's about removing everything that isn't essential until only the truth remains.",
  realPeople: ['Ernest Hemingway'],
  quote: "Getting the words right.",
  quoteAttribution: 'Ernest Hemingway, when asked about revising A Farewell to Arms',
  geographicLocation: { lat: 24.5551, lng: -81.7800, name: 'Key West, Florida' },
  continent: 'North America',
  subjectTags: ['Hemingway', 'Iceberg Theory', 'revision', 'omission', 'spare prose'],
  worldId: 'editing-tower',
  guideId: 'wren-calloway',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-maxwell-perkins'],
  unlocks: ['entry-wikipedia-editing'],
  funFact:
    "The John F. Kennedy Library preserves Hemingway's manuscripts showing all 47 attempts at the A Farewell to Arms ending. Some are one line long. Some are a full page. The final version is devastatingly simple — and devastatingly sad.",
  imagePrompt:
    'Tower workshop with iceberg diagram on the wall, manuscript pages showing progressive deletion, each draft shorter and more powerful, cold clear light through tower windows',
  status: 'published',
};

// ─── Entry 3: Toni Morrison on Revision (Tier 2) ───────────────────

export const ENTRY_TONI_MORRISON_REVISION: RealWorldEntry = {
  id: 'entry-toni-morrison-revision',
  type: 'person',
  title: "Making It Look Like It Never Was Touched",
  year: 1970,
  yearDisplay: '1970s–2019 CE',
  era: 'contemporary',
  descriptionChild:
    "Toni Morrison was a Nobel Prize-winning author who said the hardest part of writing isn't the first draft — it's the revision. She wanted her sentences to feel as natural as breathing, even though she rewrote them over and over. The goal was to make the effort invisible.",
  descriptionOlder:
    "Morrison described her revision process as making the work look 'unwritten' — as though the language had existed naturally all along. She revised Beloved multiple times, focusing on the musicality of sentences as much as their meaning. Her editing philosophy was not minimalist like Hemingway's but architectural: she sculpted language for rhythm, power, and the lived experience of African American communities whose voices had been excluded from the literary canon.",
  descriptionParent:
    "Toni Morrison (1931–2019), Nobel Laureate in Literature (1993), articulated a revision philosophy fundamentally different from Hemingway's: where Hemingway removed, Morrison sculpted. Her stated goal — making writing look 'unwritten, effortless' — required extensive revision focused on rhythm, sound, and the precise rendering of Black American vernacular and experience. Morrison's editing background (she was a senior editor at Random House, championing Angela Davis, Gayl Jones, and Muhammad Ali's autobiography) gave her a dual perspective. Her approach teaches children that revision has many styles, and that the goal is not always brevity but rather clarity, music, and truth to the experience being described.",
  realPeople: ['Toni Morrison'],
  quote: "I have always thought the work I do is the work the language 'wants' to do.",
  quoteAttribution: 'Toni Morrison',
  geographicLocation: { lat: 40.7580, lng: -73.9855, name: 'New York City, USA' },
  continent: 'North America',
  subjectTags: ['Toni Morrison', 'revision', 'literary editing', 'Nobel Prize', 'language craft'],
  worldId: 'editing-tower',
  guideId: 'wren-calloway',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-maxwell-perkins'],
  unlocks: ['entry-wikipedia-editing'],
  funFact:
    "Before becoming one of the greatest novelists in history, Morrison worked as a senior editor at Random House, where she published books by Angela Davis, Gayl Jones, and Muhammad Ali. She understood revision from both sides of the desk.",
  imagePrompt:
    'Tower library with architectural models of sentences, words hanging in mobile structures that balance rhythm and meaning, Morrison-inspired warm golden light and musical notation overlays',
  status: 'published',
};

// ─── Entry 4: Wikipedia (Tier 3) ────────────────────────────────────

export const ENTRY_WIKIPEDIA_EDITING: RealWorldEntry = {
  id: 'entry-wikipedia-editing',
  type: 'invention',
  title: "The Encyclopaedia That Anyone Can Edit",
  year: 2001,
  yearDisplay: '2001 CE – present',
  era: 'contemporary',
  descriptionChild:
    "Wikipedia is an encyclopaedia that anyone in the world can edit. It has over 60 million articles in more than 300 languages. But if anyone can change it, how do you know it's true? An army of volunteer editors checks every change, argues about facts, and tries to keep it accurate.",
  descriptionOlder:
    "Wikipedia (launched 2001 by Jimmy Wales and Larry Sanger) is the largest collaborative editing project in human history. Over 60 million articles in 300+ languages are maintained by approximately 280,000 active editors. Every edit is recorded, every argument preserved on 'Talk' pages. Disputes over accuracy are settled through consensus, with policies like 'Neutral Point of View' and 'Verifiability' guiding resolution. Wikipedia demonstrates that editing is not a solitary act but a community negotiation about truth.",
  descriptionParent:
    "Wikipedia (2001–present) represents collective editing at civilisational scale. Its 60+ million articles across 300+ languages are maintained by ~280,000 active editors (as of 2024) using a transparent, version-controlled editing system where every change is recorded and reversible. The community governance structure — policies on Neutral Point of View (NPOV), Verifiability, and No Original Research — constitutes a real-time experiment in consensus-based epistemology. Studies (Giles, 2005) found Wikipedia's science articles comparably accurate to Encyclopaedia Britannica, though accuracy varies by topic. The perpetual editing process, visible on Talk pages, teaches children that knowledge is not fixed but continuously negotiated, and that editing is ultimately a question of what a community agrees is true.",
  realPeople: ['Jimmy Wales', 'Larry Sanger'],
  quote: "Editing is ultimately a question of what a community agrees is true.",
  quoteAttribution: 'Wren Calloway, Guide of the Editing Tower',
  geographicLocation: { lat: 37.7749, lng: -122.4194, name: 'San Francisco, California (Wikimedia Foundation)' },
  continent: 'North America',
  subjectTags: ['Wikipedia', 'collaborative editing', 'encyclopaedia', 'crowdsource', 'community knowledge'],
  worldId: 'editing-tower',
  guideId: 'wren-calloway',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-hemingway-iceberg-theory', 'entry-toni-morrison-revision'],
  unlocks: [],
  funFact:
    "Every single edit ever made on Wikipedia is saved forever. You can see the complete history of any article — including arguments between editors about whether a fact is correct. The most-edited Wikipedia article of all time has been changed over 45,000 times.",
  imagePrompt:
    'Top of the Editing Tower with a collaborative editing room, screens showing article histories and Talk page debates, editors from around the world connected by glowing threads, modern digital light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const EDITING_TOWER_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_MAXWELL_PERKINS,
  ENTRY_HEMINGWAY_ICEBERG_THEORY,
  ENTRY_TONI_MORRISON_REVISION,
  ENTRY_WIKIPEDIA_EDITING,
] as const;

export const EDITING_TOWER_ENTRY_IDS: readonly string[] =
  EDITING_TOWER_ENTRIES.map((e) => e.id);
