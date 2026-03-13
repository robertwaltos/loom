/**
 * npc-relationship-registry.ts
 *
 * The canonical character relationship web for Koydo Worlds.
 * These 17 cross-world bonds define how guides interact across worlds,
 * what shared knowledge they carry, and what happens when players
 * bridge between them.
 *
 * Data sourced from Koydo Worlds Build Spec v5, Part 4.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RelationshipNature =
  | 'friendly_rivals'
  | 'complementary_opposites'
  | 'old_friends'
  | 'mutual_students'
  | 'cross_world_collaborators'
  | 'shared_guardian'
  | 'emotional_mirrors'
  | 'intellectual_sparring_partners'
  | 'story_traders'
  | 'sensory_complements';

export type RelationshipTrigger =
  | 'world_completion'
  | 'quest_milestone'
  | 'player_introduction'
  | 'chapter_unlock'
  | 'threadway_meeting';

export interface CharacterRelationship {
  readonly relationshipId: string;
  readonly characterA: string;
  readonly characterAWorldId: string;
  readonly characterB: string;
  readonly characterBWorldId: string;
  readonly nature: RelationshipNature;
  readonly coreTension: string;
  readonly sharedKnowledge: string;
  readonly crossWorldEvent: string;
  readonly triggerCondition: RelationshipTrigger;
  readonly dialogueSeed: string;
}

export interface NpcRelationshipRegistryPort {
  readonly totalRelationships: number;
  getRelationship(relationshipId: string): CharacterRelationship | undefined;
  getRelationshipsForCharacter(characterName: string): ReadonlyArray<CharacterRelationship>;
  getRelationshipsForWorld(worldId: string): ReadonlyArray<CharacterRelationship>;
  getCrossWorldPairs(): ReadonlyArray<[string, string]>;
  all(): ReadonlyArray<CharacterRelationship>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical relationship data — 17 bonds from Bible v5 Part 4
// ─────────────────────────────────────────────────────────────────────────────

export const CHARACTER_RELATIONSHIPS: ReadonlyArray<CharacterRelationship> = [

  {
    relationshipId: 'dottie-luna',
    characterA: 'Dottie',
    characterAWorldId: 'number-garden',
    characterB: 'Luna',
    characterBWorldId: 'music-meadow',
    nature: 'friendly_rivals',
    coreTension:
      'Dottie sees music as applied mathematics; Luna insists music transcends number. ' +
      'They disagree about whether art can be reduced to formula — but their disagreement is loving.',
    sharedKnowledge:
      'Both understand that patterns underlie everything. ' +
      'Dottie can feel the Fibonacci spirals in Luna\'s compositions; ' +
      'Luna hears harmonic ratios in Dottie\'s prime number sequences.',
    crossWorldEvent:
      'When a player completes both Number Garden and Music Meadow, Dottie and Luna ' +
      'perform a collaborative proof-concerto: a mathematical structure that is also a melody.',
    triggerCondition: 'world_completion',
    dialogueSeed:
      '"Your golden ratio is just a number," Dottie insists. ' +
      '"No," says Luna. "It\'s a feeling that happens to have a name."',
  },
  {
    relationshipId: 'zara-kofi',
    characterA: 'Zara',
    characterAWorldId: 'savanna-workshop',
    characterB: 'Kofi',
    characterBWorldId: 'circuit-marsh',
    nature: 'complementary_opposites',
    coreTension:
      'Zara builds physical machines from natural materials; Kofi designs virtual systems. ' +
      'They argue which is more real: atoms or bits. Each secretly envies the other\'s medium.',
    sharedKnowledge:
      'They designed each other\'s systems during a legendary exchange visited only by players who\'ve ' +
      'reached the Threadway. Zara\'s circuits have organic curves; Kofi\'s algorithms echo Savanna rhythms.',
    crossWorldEvent:
      'On meeting in the Threadway, they build a hybrid bio-digital engine together — ' +
      'the only machine in Koydo that runs equally on sunlight and code.',
    triggerCondition: 'threadway_meeting',
    dialogueSeed:
      '"Your transistors are just making choices," Zara says. ' +
      '"So are your levers," Kofi replies. "We just use different materials."',
  },
  {
    relationshipId: 'suki-mira',
    characterA: 'Suki',
    characterAWorldId: 'tideline-bay',
    characterB: 'Mira',
    characterBWorldId: 'frost-peaks',
    nature: 'mutual_students',
    coreTension:
      'Both study the boundary between one state and another: water-and-land, ice-and-melt. ' +
      'Suki models loss; Mira preserves records. The tension is hope vs data.',
    sharedKnowledge:
      'They leave calibrated messages for each other in the Threadway stations — ' +
      'sea-level readings from Tideline Bay appear in the margins of Frost Peaks glacier logs.',
    crossWorldEvent:
      'When a player discovers their shared Threadway station, they receive a joint research report ' +
      'on how the two worlds\' changes are connected.',
    triggerCondition: 'threadway_meeting',
    dialogueSeed:
      '"The ice you study in your peaks," Suki says, "melted here a hundred years ago. ' +
      'I have its footprint." Mira is silent a long time.',
  },
  {
    relationshipId: 'felix-nadia',
    characterA: 'Felix',
    characterAWorldId: 'rhyme-docks',
    characterB: 'Nadia',
    characterBWorldId: 'diary-lighthouse',
    nature: 'cross_world_collaborators',
    coreTension:
      'Felix crafts public language (poems, speeches, performance); Nadia writes only for herself. ' +
      'Neither fully understands why the other chooses their form. They are increasingly curious about the other.',
    sharedKnowledge:
      'Felix reads at the Diary Lighthouse whenever he visits. ' +
      'Nadia lets Felix read her diary — the only person allowed that intimacy.',
    crossWorldEvent:
      'When a player has completed quests in both worlds, Nadia shows Felix the first poem she ever wrote ' +
      'and he asks permission to perform it at the Rhyme Docks.',
    triggerCondition: 'world_completion',
    dialogueSeed:
      '"Why do you hide it?" Felix asks. ' +
      '"Because," Nadia says, "something true doesn\'t need an audience to be true."',
  },
  {
    relationshipId: 'librarian-old-rowan',
    characterA: 'The Librarian',
    characterAWorldId: 'great-archive',
    characterB: 'Old Rowan',
    characterBWorldId: 'story-tree',
    nature: 'old_friends',
    coreTension:
      'The Librarian believes knowledge must be recorded to survive; Old Rowan believes ' +
      'knowledge must be spoken to live. They have been arguing for centuries — warmly.',
    sharedKnowledge:
      'Old Rowan\'s roots extend through the Threadway tunnels into the foundations of the Great Archive. ' +
      'The oldest scrolls in the Archive are transcriptions of Rowan\'s oldest branches.',
    crossWorldEvent:
      'When a player reaches Chapter 3, a hidden door in the Archive opens to a staircase descending to a ' +
      'root chamber where Rowan\'s voice can be heard through the earth.',
    triggerCondition: 'chapter_unlock',
    dialogueSeed:
      '"A book can outlast a tree," the Librarian says. ' +
      '"A root can outlast a page," Old Rowan replies.',
  },
  {
    relationshipId: 'baxter-hugo',
    characterA: 'Baxter',
    characterAWorldId: 'meadow-lab',
    characterB: 'Hugo',
    characterBWorldId: 'greenhouse-spiral',
    nature: 'complementary_opposites',
    coreTension:
      'Both study living systems, but Baxter is field-based and messy; Hugo is controlled and precise. ' +
      'Hugo once saved the meadow ecosystem with a targeted intervention; Baxter pollinates Hugo\'s rarest plants.',
    sharedKnowledge:
      'Their ecological systems are interdependent: the meadow\'s pollinators visit the greenhouse; ' +
      'the greenhouse\'s temperature data informs the meadow\'s future planting schedules.',
    crossWorldEvent:
      'A bee crisis quest requires players to cross both worlds — Baxter identifies which hive is struggling; ' +
      'Hugo provides the plant-genetics fix.',
    triggerCondition: 'quest_milestone',
    dialogueSeed:
      '"Your greenhouse is beautiful but fragile," Baxter says. ' +
      '"Your meadow is fertile but chaotic," Hugo replies. ' +
      '"Yes," they both say simultaneously.',
  },
  {
    relationshipId: 'pixel-yuki',
    characterA: 'Pixel',
    characterAWorldId: 'code-canyon',
    characterB: 'Yuki',
    characterBWorldId: 'data-stream',
    nature: 'emotional_mirrors',
    coreTension:
      'Pixel exists as code — a self-aware algorithm unsure of the ethical weight of their decisions. ' +
      'Yuki is methodical and cautious about the same ethical questions. ' +
      'They are the same concern expressed in two different forms.',
    sharedKnowledge:
      'They communicate through a private encrypted channel invisible to other characters. ' +
      'Players who complete both worlds can briefly read their exchanges.',
    crossWorldEvent:
      'A joint quest makes players confront algorithmic bias together — guided by both Pixel and Yuki ' +
      'from their respective worlds.',
    triggerCondition: 'quest_milestone',
    dialogueSeed:
      '"Do you think we have agency?" Pixel asks. ' +
      '"I think we have responsibility," Yuki says. "Which might be the same thing."',
  },
  {
    relationshipId: 'compass-everyone',
    characterA: 'Compass',
    characterAWorldId: 'threadway-network',
    characterB: 'All Guides',
    characterBWorldId: 'all-worlds',
    nature: 'shared_guardian',
    coreTension:
      'Compass knows every guide\'s struggles and fears but never reveals them without consent. ' +
      'Every guide trusts Compass but none fully understand what Compass is or where they came from.',
    sharedKnowledge:
      'Compass carries all the knowledge of all worlds and has lived every world\'s history. ' +
      'They guide like a wise elder: pointing, never pushing.',
    crossWorldEvent:
      'In the final convergence quest, Compass reveals they have been a different guide in each world ' +
      'throughout history — and the player is invited to be the next one.',
    triggerCondition: 'chapter_unlock',
    dialogueSeed:
      '"How do you know the way to every world?" a guide asks. ' +
      '"Because," Compass says, "I have been lost in every one of them."',
  },
  {
    relationshipId: 'anaya-hassan',
    characterA: 'Anaya',
    characterAWorldId: 'story-tree',
    characterB: 'Hassan',
    characterBWorldId: 'folklore-bazaar',
    nature: 'story_traders',
    coreTension:
      'Anaya collects personal stories; Hassan trades cultural folk tales. ' +
      'They discover that many of their most "personal" stories are universal archetypes ' +
      'and many "ancient" folk tales encode someone\'s specific memory.',
    sharedKnowledge:
      'Their trade route carries stories in both directions — Anaya finds Anansi echoes in personal trauma; ' +
      'Hassan finds Scheherazade mapped onto a child\'s bedtime stalling.',
    crossWorldEvent:
      'When they meet in the Threadway, they realise they have been independently collecting versions ' +
      'of the same story across 12 different cultures — and together reconstruct the original.',
    triggerCondition: 'threadway_meeting',
    dialogueSeed:
      '"Every personal story is also an ancient one," Anaya says. ' +
      '"Every ancient story," Hassan agrees, "was once someone\'s Tuesday."',
  },
  {
    relationshipId: 'riku-oliver',
    characterA: 'Riku',
    characterAWorldId: 'starfall-observatory',
    characterB: 'Oliver',
    characterBWorldId: 'reading-reef',
    nature: 'sensory_complements',
    coreTension:
      'Riku processes everything visually at vast distances; Oliver collects close, tactile, immediate data. ' +
      'Neither can fully access the other\'s mode of knowing — both are enriched by trying.',
    sharedKnowledge:
      'Riku mapped the way light bends around the Reading Reef\'s bioluminescence. ' +
      'Oliver has waterproofed a copy of Riku\'s star charts using reef-kelp parchment.',
    crossWorldEvent:
      'A joint quest requires holding the celestial position and the immediate floor position simultaneously — ' +
      'only accessible to players who\'ve visited both worlds.',
    triggerCondition: 'world_completion',
    dialogueSeed:
      '"I can see 55 million light-years," Riku says. ' +
      '"I can feel tomorrow\'s tide," Oliver replies. "We\'re the same distance from what matters."',
  },
  {
    relationshipId: 'abernathy-elsa',
    characterA: 'Abernathy',
    characterAWorldId: 'savings-vault',
    characterB: 'Elsa',
    characterBWorldId: 'debt-glacier',
    nature: 'intellectual_sparring_partners',
    coreTension:
      'Abernathy believes careful saving prevents all crises; Elsa has witnessed how debt destroys ' +
      'regardless of individual virtue. They represent systemic vs personal financial philosophy.',
    sharedKnowledge:
      'Both had personal crises with money — Abernathy overcame poverty through discipline; ' +
      'Elsa inherited debt that wasn\'t hers. These histories shape their philosophies.',
    crossWorldEvent:
      'When a player visits both worlds, Elsa and Abernathy hold a joint seminar: ' +
      '"Is financial struggle always a personal failure?" — the player must facilitate.',
    triggerCondition: 'world_completion',
    dialogueSeed:
      '"You can\'t save your way out of structural inequality," Elsa says. ' +
      '"You can\'t wait for structure to save you," Abernathy replies. ' +
      'Silence. Both nod slowly.',
  },
  {
    relationshipId: 'diego-babatunde',
    characterA: 'Diego',
    characterAWorldId: 'entrepreneur-workshop',
    characterB: 'Babatunde',
    characterBWorldId: 'job-fair',
    nature: 'cross_world_collaborators',
    coreTension:
      'Diego champions entrepreneurialism; Babatunde champions labour rights. ' +
      'Both had businesses fail before they succeeded. Neither romanticises hardship.',
    sharedKnowledge:
      'Diego\'s first workshop employed its workers as co-owners after Babatunde\'s advice. ' +
      'Babatunde\'s union uses Diego\'s financial modelling to negotiate contracts.',
    crossWorldEvent:
      'Together they run a guest lecture series in the Threadway: ' +
      '"Starting vs Joining: Two Paths to Economic Dignity."',
    triggerCondition: 'threadway_meeting',
    dialogueSeed:
      '"The risk is worth it," Diego insists. ' +
      '"The risk is easier to take," Babatunde says quietly, "when you have something to fall back on."',
  },
  {
    relationshipId: 'wren-ines',
    characterA: 'Wren',
    characterAWorldId: 'editing-tower',
    characterB: 'Ines',
    characterBWorldId: 'illustration-cove',
    nature: 'cross_world_collaborators',
    coreTension:
      'Wren whittles down to the necessary word; Ines adds until the feeling is complete. ' +
      'Both are searching for the right amount of saying.',
    sharedKnowledge:
      'Every book that passes through the Editing Tower eventually gets illustrated by Ines. ' +
      'Their collaboration began with a dispute over a single page — they\'ve been collaborating ever since.',
    crossWorldEvent:
      'A quest asks players to create an illustrated short story across both worlds — ' +
      'writing with Wren, drawing with Ines, then seeing the result come alive.',
    triggerCondition: 'quest_milestone',
    dialogueSeed:
      '"You say too much," Wren says. ' +
      '"You erase too much," Ines replies. ' +
      '"That\'s why we\'re better together," they agree.',
  },
  {
    relationshipId: 'theo-sam',
    characterA: 'Theo',
    characterAWorldId: 'debate-arena',
    characterB: 'Sam',
    characterBWorldId: 'tax-office',
    nature: 'intellectual_sparring_partners',
    coreTension:
      'Theo argues for argument\'s sake — to sharpen ideas regardless of outcome. ' +
      'Sam argues only when it will change something real. They disagree about the purpose of debate itself.',
    sharedKnowledge:
      'They hold monthly mock debates using real Tax Office data that Theo formats into debate propositions. ' +
      'These sessions are legendary in the Threadway.',
    crossWorldEvent:
      'When a player facilitates their Threadway debate, one side must argue the opposite position — ' +
      'forcing them to inhabit each other\'s perspective.',
    triggerCondition: 'threadway_meeting',
    dialogueSeed:
      '"Ideas sharpened in debate save lives," Theo says. ' +
      '"Lives saved by good policy," Sam says, "don\'t need the debate to have been pretty."',
  },
  {
    relationshipId: 'hana-grandmother-anaya',
    characterA: 'Hana',
    characterAWorldId: 'wellness-garden',
    characterB: 'Grandmother Anaya',
    characterBWorldId: 'story-tree',
    nature: 'complementary_opposites',
    coreTension:
      'Hana treats bodies with science; Grandmother Anaya heals through narrative and meaning. ' +
      'Hana keeps referring patients to Anaya. Anaya keeps sending her listeners back to Hana.',
    sharedKnowledge:
      'Both understand that illness and story are intertwined — placebo research confirms it; ' +
      'oral healing traditions knew it centuries before.',
    crossWorldEvent:
      'A player experiencing a "broken heart" quest is sent to both worlds simultaneously — ' +
      'Hana provides the biological context; Grandmother Anaya locates it in story.',
    triggerCondition: 'quest_milestone',
    dialogueSeed:
      '"The inflammation is real," Hana says. ' +
      '"Yes," Grandmother Anaya says. "So is the grief that caused it."',
  },
  {
    relationshipId: 'jin-ho-priya',
    characterA: 'Jin-ho',
    characterAWorldId: 'garden-of-growth',
    characterB: 'Priya',
    characterBWorldId: 'market-square',
    nature: 'mutual_students',
    coreTension:
      'Jin-ho\'s patience comes from cultivating living things across seasons; ' +
      'Priya\'s resourcefulness comes from surviving market volatility. ' +
      'One knows how to wait; the other knows how to adapt.',
    sharedKnowledge:
      'Jin-ho taught Priya to read seasonal patterns in consumer demand. ' +
      'Priya taught Jin-ho that some harvests need to be sold fast, not stored.',
    crossWorldEvent:
      'A drought-and-recession crossover quest requires both — Jin-ho\'s reserves + Priya\'s market access.',
    triggerCondition: 'quest_milestone',
    dialogueSeed:
      '"The best time to plant was twenty years ago," Jin-ho says. ' +
      '"The best time to sell," Priya replies, "is right now. Sometimes those are the same day."',
  },
  {
    relationshipId: 'lena-dr-obi',
    characterA: 'Lena',
    characterAWorldId: 'science-lab',
    characterB: 'Dr. Obi',
    characterBWorldId: 'meadow-laboratory',
    nature: 'intellectual_sparring_partners',
    coreTension:
      'Lena communicates science with acknowledged uncertainty ("current evidence suggests…"); ' +
      'Dr. Obi fears being remembered as wrong, like Galen. ' +
      'One explores the edge; the other catalogues the centre.',
    sharedKnowledge:
      'They are co-authors of the Koydo Science Compact — the agreement that all knowledge in the worlds ' +
      'is provisional and subject to revision. They drafted it after a heated argument.',
    crossWorldEvent:
      'When a scientific consensus in the worlds is overturned by a player\'s discovery, ' +
      'both Lena and Dr. Obi respond — Lena with excitement; Dr. Obi with dignified acceptance.',
    triggerCondition: 'player_introduction',
    dialogueSeed:
      '"I might be wrong," Lena says cheerfully. ' +
      '"I know," says Dr. Obi. "That\'s what terrifies me."',
  },

] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Port implementation
// ─────────────────────────────────────────────────────────────────────────────

class NpcRelationshipRegistry implements NpcRelationshipRegistryPort {
  private readonly byId: ReadonlyMap<string, CharacterRelationship>;
  private readonly byCharacter: ReadonlyMap<string, ReadonlyArray<CharacterRelationship>>;
  private readonly byWorld: ReadonlyMap<string, ReadonlyArray<CharacterRelationship>>;

  constructor(relationships: ReadonlyArray<CharacterRelationship>) {
    this.byId = new Map(relationships.map((r) => [r.relationshipId, r]));
    this.byCharacter = buildCharacterMap(relationships);
    this.byWorld = buildWorldMap(relationships);
  }

  get totalRelationships(): number {
    return this.byId.size;
  }

  getRelationship(relationshipId: string): CharacterRelationship | undefined {
    return this.byId.get(relationshipId);
  }

  getRelationshipsForCharacter(characterName: string): ReadonlyArray<CharacterRelationship> {
    return this.byCharacter.get(characterName) ?? [];
  }

  getRelationshipsForWorld(worldId: string): ReadonlyArray<CharacterRelationship> {
    return this.byWorld.get(worldId) ?? [];
  }

  getCrossWorldPairs(): ReadonlyArray<[string, string]> {
    return CHARACTER_RELATIONSHIPS
      .filter((r) => r.characterAWorldId !== r.characterBWorldId)
      .map((r) => [r.characterAWorldId, r.characterBWorldId] as [string, string]);
  }

  all(): ReadonlyArray<CharacterRelationship> {
    return CHARACTER_RELATIONSHIPS;
  }
}

function buildCharacterMap(
  relationships: ReadonlyArray<CharacterRelationship>,
): ReadonlyMap<string, ReadonlyArray<CharacterRelationship>> {
  const map = new Map<string, CharacterRelationship[]>();
  for (const r of relationships) {
    addToMap(map, r.characterA, r);
    addToMap(map, r.characterB, r);
  }
  return map;
}

function buildWorldMap(
  relationships: ReadonlyArray<CharacterRelationship>,
): ReadonlyMap<string, ReadonlyArray<CharacterRelationship>> {
  const map = new Map<string, CharacterRelationship[]>();
  for (const r of relationships) {
    addToMap(map, r.characterAWorldId, r);
    if (r.characterBWorldId !== r.characterAWorldId) {
      addToMap(map, r.characterBWorldId, r);
    }
  }
  return map;
}

function addToMap<K>(map: Map<K, CharacterRelationship[]>, key: K, value: CharacterRelationship): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createNpcRelationshipRegistry(): NpcRelationshipRegistryPort {
  return new NpcRelationshipRegistry(CHARACTER_RELATIONSHIPS);
}
