/**
 * forgetting-well.ts
 *
 * The Forgetting Well — an inverted tower below the Great Archive.
 * Accessible post-Chapter 3. The Well is not a dungeon; it is a meditation
 * on what it means to forget, and why choosing to remember is an act of love.
 *
 * Data sourced from Koydo Worlds Build Spec v5, Part 5.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WellLevelTheme =
  | 'entrance'
  | 'personal_recent'
  | 'cultural'
  | 'historical'
  | 'deep_luminous';

export type EchoState = 'faint' | 'flickering' | 'silent' | 'restored';

export interface WellEcho {
  readonly echoId: string;
  readonly originWorldId: string;
  readonly originGuide: string;
  readonly echoState: EchoState;
  readonly fragmentText: string;
  readonly restorationQuestId?: string;
}

export interface WellLevel {
  readonly level: 0 | 1 | 2 | 3 | 4;
  readonly name: string;
  readonly theme: WellLevelTheme;
  readonly unlockCondition: string;
  readonly description: string;
  readonly ambience: string;
  readonly echoes: ReadonlyArray<WellEcho>;
  readonly lesson: string;
}

export interface RecoveryQuest {
  readonly questId: string;
  readonly wellLevel: 0 | 1 | 2 | 3 | 4;
  readonly title: string;
  readonly description: string;
  readonly echoRestored: string;
  readonly lightRestored: string;
  readonly completionText: string;
}

export interface WellCharacter {
  readonly characterId: string;
  readonly name: string;
  readonly role: string;
  readonly description: string;
  readonly firstAppearanceLevel: 0 | 1 | 2 | 3 | 4;
  readonly dialogueSeed: string;
}

export interface ForgettingWellPort {
  readonly totalLevels: number;
  readonly totalRecoveryQuests: number;
  getLevel(level: 0 | 1 | 2 | 3 | 4): WellLevel | undefined;
  getCharacter(characterId: string): WellCharacter | undefined;
  getRecoveryQuest(questId: string): RecoveryQuest | undefined;
  getRecoveryQuestsByLevel(level: 0 | 1 | 2 | 3 | 4): ReadonlyArray<RecoveryQuest>;
  getEchoesForWorld(worldId: string): ReadonlyArray<WellEcho>;
  allLevels(): ReadonlyArray<WellLevel>;
  allCharacters(): ReadonlyArray<WellCharacter>;
  allRecoveryQuests(): ReadonlyArray<RecoveryQuest>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Well characters
// ─────────────────────────────────────────────────────────────────────────────

export const WELL_CHARACTERS: ReadonlyArray<WellCharacter> = [
  {
    characterId: 'the-keeper',
    name: 'The Keeper',
    role: 'Custodian of the Well',
    description:
      'The Keeper has no body visible to players — only a warm hum that seems to come from the walls. ' +
      'Ancient, patient, and utterly without judgment. The Keeper does not mourn what is forgotten; ' +
      'they witness it with compassion. They were here before the Archive was built above them.',
    firstAppearanceLevel: 0,
    dialogueSeed:
      '"Nothing is lost," the hum seems to say. "Only returned to the light it was made from."',
  },
  {
    characterId: 'compass',
    name: 'Compass',
    role: 'Guide through the Well',
    description:
      'Compass appears differently in the Well than in the Threadway — quieter, less certain. ' +
      'In the Well, Compass does not know all the answers, and for the first time visibly feels the weight ' +
      'of that. This is the only place players see Compass truly vulnerable.',
    firstAppearanceLevel: 1,
    dialogueSeed:
      '"I remember the way out," Compass says softly. ' +
      '"That\'s different from knowing how far down the bottom goes."',
  },
  {
    characterId: 'the-echoes',
    name: 'The Echoes',
    role: 'Faded versions of world guides',
    description:
      'The Echoes are what happens to knowledge when it stops being visited. They are not dead — ' +
      'they flicker and hum, sometimes speaking in fragments. Each Echo is a guide from a world ' +
      'a player has never visited — or visited once and not returned to. ' +
      'When a player completes a recovery quest, the Echo brightens.',
    firstAppearanceLevel: 1,
    dialogueSeed:
      '"I remember being…" the Echo begins, and the sentence fades. ' +
      'A pause. Then: "Come back."',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Recovery quests
// ─────────────────────────────────────────────────────────────────────────────

export const WELL_RECOVERY_QUESTS: ReadonlyArray<RecoveryQuest> = [
  {
    questId: 'rq-return-to-number-garden',
    wellLevel: 1,
    title: 'Count Again',
    description: 'The Number Garden\'s Echo is fading. Return there and complete the unsolved prime puzzle you left unfinished.',
    echoRestored: 'Dottie Echo (Level 1)',
    lightRestored: 'A warm amber glow fills the first corridor of Level 1',
    completionText: 'The faded echo of Dottie smiles. "I knew you\'d come back," she says, fully present now. "Numbers wait."',
  },
  {
    questId: 'rq-recover-lost-language',
    wellLevel: 2,
    title: 'The Word That Was Lost',
    description:
      'A language with no living speakers grows dim in Level 2. Find its last 10 words ' +
      'scattered across the Folklore Bazaar and Translation Garden and speak them aloud in the Well.',
    echoRestored: 'Fragment of a nameless Language Echo',
    lightRestored: 'Level 2 gains a soft violet shimmer at the far wall',
    completionText:
      '"There," says The Keeper\'s hum. "It does not need to be spoken by thousands to be worth keeping."',
  },
  {
    questId: 'rq-preserve-recipe',
    wellLevel: 2,
    title: 'The Forgotten Recipe',
    description:
      'A recipe for a dish no living person knows how to cook flickers at Level 2. ' +
      'Reconstruct it from the three fragments held by guides in Wellness Garden, ' +
      'Market Square, and the Folklore Bazaar.',
    echoRestored: 'The Recipe Echo — a shimmer of warmth and spice',
    lightRestored: 'Level 2 smells faintly of cardamom',
    completionText: '"Food is memory," Grandmother Anaya\'s echo whispers. "You just chose to remember."',
  },
  {
    questId: 'rq-library-of-alexandria',
    wellLevel: 3,
    title: 'The Scrolls That Burned',
    description:
      'At Level 3, the Echo of the Library of Alexandria pulses weakly. Visit the Great Archive ' +
      'and find the four fragments of knowledge that survived — then place them in the Well.',
    echoRestored: 'The Alexandria Echo — a column of pale golden light at the Level 3 centre',
    lightRestored: 'Level 3 gains a warm scroll-light glow around its perimeter',
    completionText:
      '"Not all of it survived," the Librarian\'s echo says. "That makes what did survive more precious."',
  },
  {
    questId: 'rq-forgotten-inventor',
    wellLevel: 3,
    title: 'Credit Where It Was Denied',
    description:
      'At Level 3, a flickering Echo is the memory of an inventor whose work was attributed to someone else. ' +
      'Research their story across the Circuit Marsh and Science Lab. Speak their true name in the Well.',
    echoRestored: 'The Uncredited Inventor Echo — a blaze of white light',
    lightRestored: 'Level 3 permanently brightens around the central plinth',
    completionText: '"Names matter," Pixel\'s echo says from up above. "Even when history forgot to use them."',
  },
  {
    questId: 'rq-deep-well-offering',
    wellLevel: 4,
    title: 'What You Choose to Remember',
    description:
      'The Deep Well (Level 4) can only be lit by a player\'s own offering: ' +
      'write or speak one thing they have learned in Koydo Worlds that they promise not to forget in the real world.',
    echoRestored: 'The player\'s own Echo — a new light added to the Deep Well',
    lightRestored: 'The luminous water at Level 4 brightens with a new point of light',
    completionText:
      'The Keeper\'s hum is full and warm. "You are in the light now," it says. "Not because you remember everything. Because you chose."',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Well levels
// ─────────────────────────────────────────────────────────────────────────────

export const WELL_LEVELS: ReadonlyArray<WellLevel> = [
  {
    level: 0,
    name: 'The Well Entrance',
    theme: 'entrance',
    unlockCondition: 'Complete Chapter 3 and visit the Great Archive',
    description:
      'A trapdoor behind the oldest bookshelf in the Great Archive opens downward into cool, quiet air. ' +
      'Stone steps spiral down in a gentle helix. The walls are covered in faded marks — ' +
      'not carvings exactly, more like the outlines of thoughts pressed gently into the stone. ' +
      'There is no darkness here, only a soft luminescence from the walls themselves. ' +
      'The Keeper\'s hum is barely audible — a frequency in the chest, not the ears.',
    ambience: 'Soft blue-white light, cool air, the faint sound of distant water',
    echoes: [],
    lesson:
      'Some knowledge lives below what we normally visit. That does not make it gone — it makes it waiting.',
  },
  {
    level: 1,
    name: 'Recent Forgetting',
    theme: 'personal_recent',
    unlockCondition: 'Descend the Well entrance after Chapter 3',
    description:
      'The first chamber shows the player\'s own unvisited worlds as faded doorways — ' +
      'beautiful archways that shimmer like heat haze, almost solid, almost gone. ' +
      'Each doorway is a world the player has not yet visited or has only visited once. ' +
      'The Echoes here are soft and recent — barely faded. They speak in half-sentences. ' +
      'Compass arrives here looking subdued.',
    ambience: 'Warm amber light from the doorways, soft echo-voices, the smell of books and rain',
    echoes: [
      {
        echoId: 'echo-unvisited-worlds',
        originWorldId: 'all-unvisited',
        originGuide: 'Various',
        echoState: 'flickering',
        fragmentText:
          '"Come see us," the doorways say in overlapping voices. None are demanding. All are patient. ' +
          '"We\'ll be here when you\'re ready."',
      },
    ],
    lesson:
      'Recent forgetting is not loss — it is possibility deferred. The worlds you have not visited ' +
      'are not gone. They are full of things waiting to meet you.',
  },
  {
    level: 2,
    name: 'Cultural Forgetting',
    theme: 'cultural',
    unlockCondition: 'Descend past Level 1',
    description:
      'Level 2 holds the collective forgettings of human culture: extinct languages whose last speaker died, ' +
      'recipes no one knows how to cook, songs now hummed wrong across generations, ' +
      'dances whose steps have blurred. The Echoes here speak in fragments of beautiful language ' +
      'the player cannot quite understand. The Keeper hums more audibly here. ' +
      'There is no sadness on this level — the Keeper does not mourn. ' +
      'But there is a beauty that is also a kind of ache.',
    ambience: 'Violet and deep blue light, faint music in multiple lost scales, warmth from invisible fires',
    echoes: [
      {
        echoId: 'echo-lost-language',
        originWorldId: 'translation-garden',
        originGuide: 'Language Echo (unnamed)',
        echoState: 'faint',
        fragmentText:
          'A word spoken in a language with no living speakers. The meaning is clear anyway — ' +
          'a word for the feeling of the sun on your face on the first warm day of spring. ' +
          'English has no equivalent.',
        restorationQuestId: 'rq-recover-lost-language',
      },
      {
        echoId: 'echo-lost-recipe',
        originWorldId: 'folklore-bazaar',
        originGuide: 'Cultural Memory Echo',
        echoState: 'flickering',
        fragmentText:
          'The ghost of a smell — something spiced and sweet — and a technique half-described: ' +
          '"fold it until it listens." Three villages knew how. One does now, barely.',
        restorationQuestId: 'rq-preserve-recipe',
      },
    ],
    lesson:
      'Cultural forgetting happens slowly and without malice. Languages die when the last person ' +
      'who knows them does. Recipes dissolve when no one makes time to teach. ' +
      'None of this is anyone\'s fault. Choosing to remember, even one thing, tips the scales.',
  },
  {
    level: 3,
    name: 'Historical Forgetting',
    theme: 'historical',
    unlockCondition: 'Complete at least one Level 2 recovery quest',
    description:
      'The deepest reachable level before the Deep Well. Here the forgettings are enormous: ' +
      'the Library of Alexandria exists as a negative space — an outline of shelves filled with shadow. ' +
      'Lost inventions hum as partial prototypes. Forgotten technologies — ' +
      'Greek fire, Damascus steel, Roman concrete — linger as technique-shapes without instructions. ' +
      'The Echoes on this level are near-silent, but their presence is dense and layered. ' +
      'This is where history put what it could not carry.',
    ambience: 'Deep gold and amber light, the faint creak of ancient wood, the weight of accumulated time',
    echoes: [
      {
        echoId: 'echo-library-of-alexandria',
        originWorldId: 'great-archive',
        originGuide: 'The Librarian (historical echo)',
        echoState: 'faint',
        fragmentText:
          '"There were scrolls here," the echo says, gesturing at the shadow-shelves. ' +
          '"Eratosthenes. Hipparchus. Hypatia. A thousand others whose names we no longer have. ' +
          'Not destroyed in a moment — let go over centuries. Which is worse?"',
        restorationQuestId: 'rq-library-of-alexandria',
      },
      {
        echoId: 'echo-forgotten-inventor',
        originWorldId: 'circuit-marsh',
        originGuide: 'Uncredited Inventor Echo',
        echoState: 'silent',
        fragmentText:
          'A figure standing at a workbench, building something that will later bear another\'s name. ' +
          'The figure works with total belief. The silence around them is the silence of history about to happen.',
        restorationQuestId: 'rq-forgotten-inventor',
      },
    ],
    lesson:
      'Historical forgetting is not carelessness — it is the weight of time. ' +
      'More is forgotten than remembered in every age. The Keeper does not ask us to mourn the loss. ' +
      'The Keeper asks us to look clearly at what it means.',
  },
  {
    level: 4,
    name: 'The Deep Well',
    theme: 'deep_luminous',
    unlockCondition: 'Complete at least one Level 3 recovery quest',
    description:
      'Players who reach Level 4 expect darkness — they find light. ' +
      'The bottom of the Well is a vast, quiet chamber with a pool of luminous water at its centre. ' +
      'Everything that was ever truly forgotten has dissolved into this water — ' +
      'not destroyed, but returned to the undifferentiated light that everything was, before it became particular. ' +
      'The water is warm and still. Points of light move slowly within it. ' +
      'The Keeper\'s hum is a full chord here. ' +
      'This is not a sad place. It is the most peaceful place in all of Koydo Worlds.',
    ambience: 'Pure white light from the water, warmth, total silence except for the Keeper\'s chord',
    echoes: [
      {
        echoId: 'echo-the-player',
        originWorldId: 'all-worlds',
        originGuide: 'Player Echo',
        echoState: 'faint',
        fragmentText:
          'There is a faint outline in the water that looks, briefly, like the player. ' +
          'The Keeper hums. Compass stands at the edge of the pool, looking in.',
        restorationQuestId: 'rq-deep-well-offering',
      },
    ],
    lesson:
      'Forgetting is natural. It is entropy — the universe\'s default state. ' +
      'Choosing to remember is not the natural state. It is an act against entropy. ' +
      'It is an act of love. Not because we remember everything — ' +
      'we cannot — but because we choose what we love enough to hold.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Port implementation
// ─────────────────────────────────────────────────────────────────────────────

class ForgettingWellRegistry implements ForgettingWellPort {
  private readonly levelMap: ReadonlyMap<number, WellLevel>;
  private readonly characterMap: ReadonlyMap<string, WellCharacter>;
  private readonly questMap: ReadonlyMap<string, RecoveryQuest>;
  private readonly questsByLevel: ReadonlyMap<number, ReadonlyArray<RecoveryQuest>>;

  constructor(
    levels: ReadonlyArray<WellLevel>,
    characters: ReadonlyArray<WellCharacter>,
    quests: ReadonlyArray<RecoveryQuest>,
  ) {
    this.levelMap = new Map(levels.map((l) => [l.level, l]));
    this.characterMap = new Map(characters.map((c) => [c.characterId, c]));
    this.questMap = new Map(quests.map((q) => [q.questId, q]));
    this.questsByLevel = buildQuestsByLevel(quests);
  }

  get totalLevels(): number {
    return this.levelMap.size;
  }

  get totalRecoveryQuests(): number {
    return this.questMap.size;
  }

  getLevel(level: 0 | 1 | 2 | 3 | 4): WellLevel | undefined {
    return this.levelMap.get(level);
  }

  getCharacter(characterId: string): WellCharacter | undefined {
    return this.characterMap.get(characterId);
  }

  getRecoveryQuest(questId: string): RecoveryQuest | undefined {
    return this.questMap.get(questId);
  }

  getRecoveryQuestsByLevel(level: 0 | 1 | 2 | 3 | 4): ReadonlyArray<RecoveryQuest> {
    return this.questsByLevel.get(level) ?? [];
  }

  getEchoesForWorld(worldId: string): ReadonlyArray<WellEcho> {
    return WELL_LEVELS
      .flatMap((l) => l.echoes)
      .filter((e) => e.originWorldId === worldId);
  }

  allLevels(): ReadonlyArray<WellLevel> {
    return WELL_LEVELS;
  }

  allCharacters(): ReadonlyArray<WellCharacter> {
    return WELL_CHARACTERS;
  }

  allRecoveryQuests(): ReadonlyArray<RecoveryQuest> {
    return WELL_RECOVERY_QUESTS;
  }
}

function buildQuestsByLevel(
  quests: ReadonlyArray<RecoveryQuest>,
): ReadonlyMap<number, ReadonlyArray<RecoveryQuest>> {
  const map = new Map<number, RecoveryQuest[]>();
  for (const q of quests) {
    const bucket = map.get(q.wellLevel);
    if (bucket) {
      bucket.push(q);
    } else {
      map.set(q.wellLevel, [q]);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createForgettingWell(): ForgettingWellPort {
  return new ForgettingWellRegistry(WELL_LEVELS, WELL_CHARACTERS, WELL_RECOVERY_QUESTS);
}
