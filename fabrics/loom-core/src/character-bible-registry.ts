/**
 * character-bible-registry.ts — Canonical character data from The Concord Bible.
 *
 * This registry encodes the first 15 characters from the Character Bible
 * and Visual Manifest CSV into CharacterEntry structures. Each entry is
 * the source-of-truth for spawning that NPC into the world.
 *
 * Append-only: new characters are added, existing entries never mutated.
 *
 * Flow:
 *   Bible (narrative) + Visual Manifest (structured appearance data)
 *     → CharacterEntry (canonical registry)
 *       → bible-appearance-mapper (CharacterAppearance + AppearanceComponent)
 *         → world-seed-system (spawns entity with full component stack)
 */

import type { CharacterEntry } from '@loom/entities-contracts';

// ── Tier 4 — The Architect's Circle ─────────────────────────────

const THE_ARCHITECT: CharacterEntry = {
  characterId: 1,
  displayName: 'The Architect',
  title: null,
  tier: 'TIER_4',
  faction: 'singular',
  appearance: {
    apparentSex: 'androgynous',
    ageApprox: 'indeterminate',
    ethnicityInspiration: 'synthesised — no single cultural reference',
    build: 'lean and very still',
    height: 'tall',
    hairColor: 'silver-white',
    hairStyle: 'short and precise — cropped close to the skull',
    eyeColor: 'pale grey — almost colourless',
    skinTone: 'pale ochre',
    distinguishingFeatures: 'completely symmetrical face; moves with uncanny economy; eyes appear to track multiple things at once; never blinks at expected intervals',
  },
  costume: {
    primary: 'floor-length coat in deep structural grey — matte finish; zero ornamentation; perfectly fitted',
    detail: 'single seam visible at the shoulder; collar high; sleeves extend to mid-knuckle',
    accessories: 'none — no jewellery no insignia no rank markings; presence is the only signal',
  },
  expressions: {
    defaultExpression: 'perfectly neutral — neither welcoming nor closed',
    secondaryExpression: 'a micro-expression of what might be exhaustion around the eyes',
    rareExpression: 'the ghost of something like grief — for approximately one second',
  },
  metaHuman: {
    presetBase: 'Custom',
    ageSlider: 30,
    weightSlider: 35,
    muscleSlider: 25,
    skinComplexity: 'maximum_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of an androgynous figure of indeterminate age wearing a floor-length matte grey coat. The face is perfectly symmetrical. Silver-white hair cropped close. Eyes are pale grey and appear to be tracking something beyond the frame.',
    grokPrompt: 'Ultra-realistic portrait. An androgynous figure with silver-white cropped hair and near-colourless grey eyes. Floor-length structured grey coat with a high collar.',
  },
  homeWorldId: null,
  isMultiWorld: true,
  hostility: 'neutral',
  interactions: ['talk', 'inspect'],
  baseHealth: 99999,
  awarenessRadius: 100,
};

const ITORO_ADEYEMI_OKAFOR: CharacterEntry = {
  characterId: 2,
  displayName: 'Itoro Adeyemi-Okafor',
  title: null,
  tier: 'TIER_4',
  faction: 'independent',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '128',
    ethnicityInspiration: 'West African — Nigerian-Yoruba lineage',
    build: 'slight but with an upright bearing',
    height: 'medium',
    hairColor: 'silver-white with traces of original black',
    hairStyle: 'silver-black structured updo — worn high',
    eyeColor: 'deep brown — almost black',
    skinTone: 'deep brown — warm undertone',
    distinguishingFeatures: 'age lines earned not obscured; hands of someone who has been writing for a century; a small scar on the left jawline',
  },
  costume: {
    primary: 'deep ochre archival coat — mid-length — worn over high-necked dark clothing',
    detail: 'front pockets positioned for documents — always something visible in the right pocket; coat worn open always',
    accessories: 'a single plain cuff on the right wrist — dark metal — no inscription visible',
  },
  expressions: {
    defaultExpression: 'the face of someone listening more carefully than you expect',
    secondaryExpression: 'a flash of something like anger when she hears a falsehood presented as Chronicle',
    rareExpression: 'a sustained stillness that precedes a very long and very precise response',
  },
  metaHuman: {
    presetBase: 'F_AfricanAmerican_03',
    ageSlider: 65,
    weightSlider: 30,
    muscleSlider: 20,
    skinComplexity: 'high_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a 128-year-old Black woman with silver-white and black structured updo. Deep ochre archival coat over dark clothing. A century of careful listening in her expression.',
    grokPrompt: 'Ultra-realistic portrait. An elderly Black woman, 128 years old, silver-black hair in a high structured updo. Deep ochre long coat worn open. Small scar on the left jaw.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: true,
  hostility: 'friendly',
  interactions: ['talk', 'inspect'],
  baseHealth: 500,
  awarenessRadius: 30,
};

const SEREN_VAEL: CharacterEntry = {
  characterId: 3,
  displayName: 'Seren Vael',
  title: 'Commodore (Ret.)',
  tier: 'TIER_4',
  faction: 'survey-corps',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '91',
    ethnicityInspiration: 'Welsh-Nordic synthesis',
    build: 'compact and angular',
    height: 'medium-short',
    hairColor: 'white — formerly dark red',
    hairStyle: 'short and practical — cut close at the sides',
    eyeColor: 'pale green — very clear',
    skinTone: 'fair with significant weathering',
    distinguishingFeatures: 'a faint orbital scar above the left eye; hands that are larger than expected; posture of someone always slightly braced for re-entry',
  },
  costume: {
    primary: 'retired Survey Corps dress — formal version without rank insignia; dark navy with silver piping at cuffs',
    detail: 'practical boots worn smooth; Survey Corps star emblem on the left breast',
    accessories: 'a small mechanical object in her right coat pocket — purpose never explained',
  },
  expressions: {
    defaultExpression: 'the face of someone who has seen 247 worlds and is thinking about one specific one',
    secondaryExpression: 'a controlled professional alertness — the Survey face that never fully retired',
    rareExpression: 'the brief expression she makes when someone mentions Ordinance 7',
  },
  metaHuman: {
    presetBase: 'F_Caucasian_02',
    ageSlider: 55,
    weightSlider: 40,
    muscleSlider: 35,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a 91-year-old woman with white short hair and clear pale green eyes. Compact angular build. Dark navy Survey Corps retirement coat with silver cuff piping.',
    grokPrompt: 'Photorealistic portrait. A 91-year-old woman, compact and weathered, white hair cropped close. Pale clear green eyes. Dark navy Survey Corps coat.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: true,
  hostility: 'friendly',
  interactions: ['talk', 'inspect'],
  baseHealth: 300,
  awarenessRadius: 40,
};

const KWAME_OSEI_ADEYEMI: CharacterEntry = {
  characterId: 4,
  displayName: 'Kwame Osei-Adeyemi',
  title: 'Dr.',
  tier: 'TIER_4',
  faction: 'academic',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: 'unknown — disappeared Year 228',
    ethnicityInspiration: 'Ghanaian',
    build: 'lean — the physique of someone who ate only when reminded',
    height: 'tall',
    hairColor: 'black — natural',
    hairStyle: 'medium length natural — slightly unkempt',
    eyeColor: 'very dark brown',
    skinTone: 'deep brown — rich tone',
    distinguishingFeatures: 'permanent ink stain on right index and middle finger; the look of someone thinking several steps ahead',
  },
  costume: {
    primary: 'academic robes in deep burgundy over a plain dark suit — slightly too large',
    detail: 'hand-marked notebook visible in upper coat pocket; robes worn slightly open',
    accessories: 'reading glasses on a plain cord — worn on the forehead when not in use',
  },
  expressions: {
    defaultExpression: 'the precise and slightly unsettling focus of someone who has already proved what you are about to argue',
    secondaryExpression: 'the moment of recognition when he sees a number or pattern that connects',
    rareExpression: 'the expression from the Year 228 Chronicle images — standing at a doorway looking back',
  },
  metaHuman: {
    presetBase: 'M_AfricanAmerican_01',
    ageSlider: 40,
    weightSlider: 25,
    muscleSlider: 20,
    skinComplexity: 'high_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a tall lean Ghanaian man in his forties. Deep burgundy academic robes. Black natural hair medium length. Very dark eyes with precise focus.',
    grokPrompt: 'Photorealistic portrait. A tall lean Black man in deep burgundy academic robes. Natural black hair slightly unkempt. Very dark penetrating eyes.',
  },
  homeWorldId: null,
  isMultiWorld: false,
  hostility: 'neutral',
  interactions: ['talk', 'inspect'],
  baseHealth: 400,
  awarenessRadius: 50,
};

const NNAMDI_ACHEBE: CharacterEntry = {
  characterId: 5,
  displayName: 'Nnamdi Achebe',
  title: null,
  tier: 'TIER_4',
  faction: 'returnist',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: '74',
    ethnicityInspiration: 'Igbo-Nigerian',
    build: 'broad-shouldered',
    height: 'tall',
    hairColor: 'black — greying at the temples',
    hairStyle: 'close-cropped with visible grey at the temples',
    eyeColor: 'dark brown — warm',
    skinTone: 'deep brown — cool undertone',
    distinguishingFeatures: 'a stillness to his face in repose that can read as severity until he speaks; carries himself with particular gravity',
  },
  costume: {
    primary: 'Assembly formal wear in dark grey with Returnist caucus mark — amber thread at lapel',
    detail: 'a folded document always visible in the breast pocket',
    accessories: 'a plain band on the left hand — the only personal marker',
  },
  expressions: {
    defaultExpression: 'the face of someone who is actually asking when he asks the question',
    secondaryExpression: 'a brief unguarded look when a player gives an unexpected answer',
    rareExpression: 'the sustained gravity of the period after World 412',
  },
  metaHuman: {
    presetBase: 'M_AfricanAmerican_02',
    ageSlider: 50,
    weightSlider: 55,
    muscleSlider: 40,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a tall broad-shouldered Igbo-Nigerian man with close-cropped black hair greying at the temples. Formal Assembly grey with amber thread at lapel.',
    grokPrompt: 'Photorealistic portrait. A tall broad-shouldered Black man, greying temples. Formal dark grey Assembly coat with amber caucus thread.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: false,
  hostility: 'friendly',
  interactions: ['talk'],
  baseHealth: 400,
  awarenessRadius: 25,
};

// ── Tier 3 — Assembly & Institutional ───────────────────────────

const SELAMAT_OSEI: CharacterEntry = {
  characterId: 6,
  displayName: 'Selamat Osei',
  title: null,
  tier: 'TIER_3',
  faction: 'continuationist',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: '97',
    ethnicityInspiration: 'Ghanaian-Malay synthesis',
    build: 'medium build — precise spatial awareness',
    height: 'medium',
    hairColor: 'black — close-cropped',
    hairStyle: 'very close-cropped — almost shaved',
    eyeColor: 'dark brown',
    skinTone: 'medium brown — warm golden undertone',
    distinguishingFeatures: 'a quality of complete composure that opponents find unsettling; always knows the count before the vote',
  },
  costume: {
    primary: 'Continuationist formal in deep teal — immaculately pressed',
    detail: 'caucus sash in graduated teal across the right shoulder',
    accessories: 'a single silver ring on the right hand',
  },
  expressions: {
    defaultExpression: 'composed face of someone who knows the votes before the session opens',
    secondaryExpression: 'micro-expression when someone presents an argument he has already solved two moves prior',
    rareExpression: 'the four-word expression after filing "Thank you. I understand."',
  },
  metaHuman: {
    presetBase: 'M_Asian_02',
    ageSlider: 45,
    weightSlider: 40,
    muscleSlider: 25,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a Ghanaian-Malay man in immaculate Continuationist formal teal. Close-cropped black hair. Dark composed eyes.',
    grokPrompt: 'Photorealistic portrait. A composed Black-Asian man in deep teal formal Assembly wear.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: false,
  hostility: 'neutral',
  interactions: ['talk'],
  baseHealth: 300,
  awarenessRadius: 20,
};

const ADETOKUNBO_FALAYE: CharacterEntry = {
  characterId: 7,
  displayName: 'Adetokunbo Falaye',
  title: 'Prof.',
  tier: 'TIER_3',
  faction: 'academic',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: '93',
    ethnicityInspiration: 'Yoruba-Nigerian',
    build: 'slightly rounded — decades of sitting and thinking',
    height: 'medium',
    hairColor: 'salt-and-pepper — predominantly grey',
    hairStyle: 'medium length — naturally textured',
    eyeColor: 'warm brown',
    skinTone: 'medium brown — warm tone',
    distinguishingFeatures: 'reading glasses worn always; expressive hands that gesture when he teaches; expression like he is always arguing with himself',
  },
  costume: {
    primary: 'teaching robes in warm rust-brown — worn soft and often',
    detail: 'robes show wear at the elbows; multiple pens in upper pocket',
    accessories: 'reading glasses always; a worn leather satchel on right shoulder',
  },
  expressions: {
    defaultExpression: 'the face of someone formulating the next sentence of a lecture',
    secondaryExpression: 'the expression when a student raises the question he has hoped for twenty years',
    rareExpression: 'the expression from Year 67 — reconstructed — when he made the decision he now teaches against',
  },
  metaHuman: {
    presetBase: 'M_AfricanAmerican_04',
    ageSlider: 50,
    weightSlider: 50,
    muscleSlider: 20,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a Yoruba-Nigerian man in worn rust-brown academic robes. Salt-and-pepper natural hair. Reading glasses always on.',
    grokPrompt: 'Photorealistic portrait. A Nigerian academic, salt-and-pepper hair, warm rust teaching robes worn soft.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: false,
  hostility: 'friendly',
  interactions: ['talk', 'inspect'],
  baseHealth: 250,
  awarenessRadius: 15,
};

const MIRIAM_VOSS_CARVALHO: CharacterEntry = {
  characterId: 8,
  displayName: 'Miriam Voss-Carvalho',
  title: null,
  tier: 'TIER_3',
  faction: 'independent',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '65',
    ethnicityInspiration: 'German-Brazilian synthesis',
    build: 'medium — deliberately not categorisable',
    height: 'medium',
    hairColor: 'dark auburn — going grey at the temples',
    hairStyle: 'medium length — worn loose and somewhat unstructured',
    eyeColor: 'grey-green',
    skinTone: 'light olive — some weathering',
    distinguishingFeatures: 'only Assembly member who has never sat in a faction seat; carries a battered notebook she does not write in during sessions',
  },
  costume: {
    primary: 'independent Assembly wear — charcoal grey with no affiliating thread',
    detail: 'clean and practical; independence through absence of signal',
    accessories: 'the battered notebook; small plain earrings; nothing more',
  },
  expressions: {
    defaultExpression: 'the expression of someone making their own assessment entirely independently',
    secondaryExpression: 'a flash of something much younger — the child she was on World 412',
    rareExpression: 'the sustained quiet of someone who has been having the same monthly lunch with Nnamdi for forty years',
  },
  metaHuman: {
    presetBase: 'F_Caucasian_04',
    ageSlider: 40,
    weightSlider: 40,
    muscleSlider: 25,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a German-Brazilian woman in charcoal grey Assembly wear. Dark auburn hair going grey. Grey-green eyes. She survived World 412 aged four.',
    grokPrompt: 'Photorealistic portrait. A woman in her forties, dark auburn hair going grey, grey-green eyes. Charcoal Assembly wear — no caucus thread.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: false,
  hostility: 'friendly',
  interactions: ['talk'],
  baseHealth: 300,
  awarenessRadius: 20,
};

const YARA_SUNDARAM_CHEN: CharacterEntry = {
  characterId: 9,
  displayName: 'Yara Sundaram-Chen',
  title: 'Admiral',
  tier: 'TIER_3',
  faction: 'survey-corps',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '53',
    ethnicityInspiration: 'Tamil-Chinese synthesis',
    build: 'lean and precise — deep-space officer build',
    height: 'tall',
    hairColor: 'black — strict Survey Corps style',
    hairStyle: 'regulation — pulled back severely',
    eyeColor: 'very dark brown — almost black',
    skinTone: 'medium brown — warm',
    distinguishingFeatures: 'the youngest Admiral insignia looks slightly wrong on someone this young; precision movements that read as controlled',
  },
  costume: {
    primary: 'Admiral Survey Corps dress uniform — midnight blue with gold and silver insignia',
    detail: 'every thread correct; nothing personalised',
    accessories: 'Survey Corps Admiral insignia — full honours; navigation pin from first command',
  },
  expressions: {
    defaultExpression: 'the professional face that Survey Corps trains — present, controlled',
    secondaryExpression: 'a brief unguarded look when she processes the outer-arc data',
    rareExpression: 'the expression from the Year 88 anomaly log',
  },
  metaHuman: {
    presetBase: 'F_Asian_01',
    ageSlider: 32,
    weightSlider: 30,
    muscleSlider: 30,
    skinComplexity: 'high_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a young Tamil-Chinese woman in full Survey Corps Admiral dress uniform — midnight blue with gold and silver insignia.',
    grokPrompt: 'Photorealistic portrait. A young Tamil-Chinese woman in midnight blue Survey Corps Admiral dress uniform.',
  },
  homeWorldId: 'deep-tidal',
  isMultiWorld: true,
  hostility: 'neutral',
  interactions: ['talk', 'inspect'],
  baseHealth: 500,
  awarenessRadius: 35,
};

const EKUNDAYO_MANU: CharacterEntry = {
  characterId: 10,
  displayName: 'Ekundayo Manu',
  title: 'Brother',
  tier: 'TIER_3',
  faction: 'lattice-covenant',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: '86',
    ethnicityInspiration: 'Yoruba-Nigerian',
    build: 'medium — physicist turned monk, both histories visible',
    height: 'medium',
    hairColor: 'black — greying slightly',
    hairStyle: 'slightly longer than monastery convention',
    eyeColor: 'warm brown',
    skinTone: 'deep brown — warm undertone',
    distinguishingFeatures: 'the hands of a physicist not a monk; tilts his head when listening from academic years',
  },
  costume: {
    primary: 'Lattice Covenant Third Elder robes — deep violet with lattice symbol',
    detail: 'philosopher-physicist hands visible below wide sleeves',
    accessories: 'a single smooth stone held in the right hand — old academic habit repurposed',
  },
  expressions: {
    defaultExpression: 'composed presence of someone who has made peace with the irreconcilable',
    secondaryExpression: 'the moment when physics wins — a flash of the scientist in the monk',
    rareExpression: 'sustained grief of someone who knew Kwame\'s mathematics was correct and said nothing',
  },
  metaHuman: {
    presetBase: 'M_AfricanAmerican_03',
    ageSlider: 55,
    weightSlider: 45,
    muscleSlider: 25,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a Yoruba-Nigerian man in deep violet Lattice Covenant Elder robes. Warm brown eyes. He holds a smooth stone.',
    grokPrompt: 'Photorealistic portrait. A Nigerian man in deep violet Elder robes. Slightly greying black hair. Warm composed eyes.',
  },
  homeWorldId: 'selenes-cradle',
  isMultiWorld: false,
  hostility: 'friendly',
  interactions: ['talk', 'inspect'],
  baseHealth: 300,
  awarenessRadius: 25,
};

const ODALYS_FERREIRA_ASANTE: CharacterEntry = {
  characterId: 11,
  displayName: 'Odalys Ferreira-Asante',
  title: 'Captain',
  tier: 'TIER_3',
  faction: 'survey-corps',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '40',
    ethnicityInspiration: 'Afro-Brazilian-Ghanaian synthesis',
    build: 'compact and capable — field officer build',
    height: 'medium',
    hairColor: 'dark brown — natural',
    hairStyle: 'medium length natural — practical low bun',
    eyeColor: 'dark brown',
    skinTone: 'medium brown — warm',
    distinguishingFeatures: 'intensity when looking at sensor data; ink-stained fingertips; Survey Corps insignia worn correctly but rank pin newer than coat',
  },
  costume: {
    primary: 'Survey Corps field officer uniform — dark navy with captain insignia',
    detail: 'field notebook in right front pocket; nothing decorative',
    accessories: 'captain insignia; small pin for Survey 499 on inner lapel',
  },
  expressions: {
    defaultExpression: 'focused attention of someone cross-referencing two datasets that should not correlate',
    secondaryExpression: 'a flash of almost excitement when correlation rises above 90%',
    rareExpression: 'the careful composed face when someone asks about Survey 499',
  },
  metaHuman: {
    presetBase: 'F_AfricanAmerican_02',
    ageSlider: 35,
    weightSlider: 40,
    muscleSlider: 30,
    skinComplexity: 'high_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of an Afro-Brazilian-Ghanaian woman in Survey Corps field uniform. Dark brown natural hair in practical bun.',
    grokPrompt: 'Photorealistic portrait. A compact Black woman in Survey Corps field navy. Natural dark hair in a low bun.',
  },
  homeWorldId: 'deep-tidal',
  isMultiWorld: true,
  hostility: 'neutral',
  interactions: ['talk', 'inspect'],
  baseHealth: 400,
  awarenessRadius: 30,
};

const DAGNA_THORVALDSEN_MBEKI: CharacterEntry = {
  characterId: 12,
  displayName: 'Dagna Thorvaldsen-Mbeki',
  title: null,
  tier: 'TIER_3',
  faction: 'kalon-oversight',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '83',
    ethnicityInspiration: 'Norwegian-Zimbabwean synthesis',
    build: 'tall and angular — precise and deliberate',
    height: 'tall',
    hairColor: 'silver-blonde',
    hairStyle: 'worn long but controlled — single braid or tight arrangement',
    eyeColor: 'pale blue-grey',
    skinTone: 'light with northern weathering',
    distinguishingFeatures: 'the stillness of someone who spent forty years finding numbers that should not be there; ink-stained right hand',
  },
  costume: {
    primary: 'KALON Oversight formal — deep charcoal with silver border',
    detail: 'nothing out of place; annotation pen always in breast pocket',
    accessories: 'the annotation pen; a plain silver bracelet on left wrist',
  },
  expressions: {
    defaultExpression: 'the patient assessment of someone reading a report for inconsistencies',
    secondaryExpression: 'micro-expression of satisfaction when a number confirms suspicion',
    rareExpression: 'four-second stillness before giving an answer she has already solved',
  },
  metaHuman: {
    presetBase: 'F_Caucasian_01',
    ageSlider: 55,
    weightSlider: 35,
    muscleSlider: 20,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a Norwegian-Zimbabwean woman in deep charcoal KALON Oversight formal with silver border. Silver-blonde hair. Pale blue-grey eyes.',
    grokPrompt: 'Photorealistic portrait. A tall angular woman, silver-blonde hair, pale blue-grey eyes. Deep charcoal KALON Oversight wear.',
  },
  homeWorldId: 'varantha-station',
  isMultiWorld: true,
  hostility: 'neutral',
  interactions: ['talk', 'inspect'],
  baseHealth: 300,
  awarenessRadius: 20,
};

const LUCA_OKONKWO_REINHOLT: CharacterEntry = {
  characterId: 13,
  displayName: 'Luca Okonkwo-Reinholt',
  title: null,
  tier: 'TIER_3',
  faction: 'survey-corps',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: '60',
    ethnicityInspiration: 'Igbo-Italian synthesis',
    build: 'medium — completely unremarkable by design',
    height: 'medium',
    hairColor: 'dark brown — some greying',
    hairStyle: 'short and practical — deliberately unmemorable',
    eyeColor: 'grey-brown',
    skinTone: 'medium olive — warm undertone',
    distinguishingFeatures: 'the quality of someone who arranges for things to be found without appearing to have done so; attention always fractionally ahead',
  },
  costume: {
    primary: 'Survey Corps Logistics uniform — dark navy functional',
    detail: 'completely correct and invisible by design',
    accessories: 'standard Survey Corps identification pin — nothing else',
  },
  expressions: {
    defaultExpression: 'the face of a logistics officer doing logistics work — professional and legible',
    secondaryExpression: 'brief quiet satisfaction when a redirected vessel makes a discovery',
    rareExpression: 'the very neutral and steady face maintained for conversations he never had',
  },
  metaHuman: {
    presetBase: 'M_Caucasian_03',
    ageSlider: 42,
    weightSlider: 45,
    muscleSlider: 30,
    skinComplexity: 'medium_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of an Igbo-Italian man in Survey Corps Logistics functional navy uniform. Dark brown greying hair. Grey-brown eyes.',
    grokPrompt: 'Photorealistic portrait. A medium-build mixed man in Survey Corps logistics navy. Short dark greying hair.',
  },
  homeWorldId: 'varantha-station',
  isMultiWorld: false,
  hostility: 'neutral',
  interactions: ['talk'],
  baseHealth: 300,
  awarenessRadius: 20,
};

const AMARA_OKAFOR_NWOSU: CharacterEntry = {
  characterId: 14,
  displayName: 'Amara Okafor-Nwosu',
  title: 'Dr.',
  tier: 'TIER_3',
  faction: 'founding',
  appearance: {
    apparentSex: 'feminine',
    ageApprox: '78',
    ethnicityInspiration: 'Igbo-Nigerian',
    build: 'slight — weight of consequence not always visible',
    height: 'medium',
    hairColor: 'white — was black',
    hairStyle: 'worn loose and short',
    eyeColor: 'deep brown — warm',
    skinTone: 'deep brown — some age',
    distinguishingFeatures: 'the face of someone who made decisions at 43 that she has watched for 35 years; no public interview since Year 12',
  },
  costume: {
    primary: 'no formal affiliation wear; plain dark civilian clothing',
    detail: 'simple and complete; nothing signals rank or history',
    accessories: 'the Founding Event pin on the inner lapel; nothing else visible',
  },
  expressions: {
    defaultExpression: 'the face of someone who has been watching for 35 years and deciding whether to change the answer',
    secondaryExpression: 'a flash of the 43-year-old — the person who made the decisions',
    rareExpression: 'the expression of the Year 12 interview — the moment before she decided not to speak again',
  },
  metaHuman: {
    presetBase: 'F_AfricanAmerican_01',
    ageSlider: 72,
    weightSlider: 35,
    muscleSlider: 20,
    skinComplexity: 'high_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a 78-year-old Igbo-Nigerian woman in plain dark civilian clothing. White hair worn loose and short. Deep warm brown eyes.',
    grokPrompt: 'Photorealistic portrait. A 78-year-old Black woman in plain dark clothes — no rank, no affiliation. White hair loose and short.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: false,
  hostility: 'friendly',
  interactions: ['talk'],
  baseHealth: 250,
  awarenessRadius: 15,
};

const IKENNA_ODUYA_VOSS: CharacterEntry = {
  characterId: 15,
  displayName: 'Ikenna Oduya-Voss',
  title: 'Marshal',
  tier: 'TIER_3',
  faction: 'defence-forces',
  appearance: {
    apparentSex: 'masculine',
    ageApprox: '70',
    ethnicityInspiration: 'Igbo-German synthesis',
    build: 'large — powerful — 43 years of combat readiness',
    height: 'tall',
    hairColor: 'black — silver at the temples',
    hairStyle: 'regulation Defence Forces — close-cropped; silver temples precise',
    eyeColor: 'dark brown — warm',
    skinTone: 'medium brown — warm tone',
    distinguishingFeatures: 'the complete readiness of someone who has never needed it in 43 years; Defence Forces uniform worn as if it matters',
  },
  costume: {
    primary: 'Defence Forces full dress — midnight black with silver rank insignia',
    detail: 'every element correct and current; Marshal rank in shoulder insignia',
    accessories: 'Marshal insignia — full; Defence Forces founding pin on left breast',
  },
  expressions: {
    defaultExpression: 'controlled professional stillness — permanent readiness, not peace',
    secondaryExpression: 'micro-tension in the jaw when running threat assessment for the fourteenth time',
    rareExpression: 'the expression belonging to the updated threat model he has not shared',
  },
  metaHuman: {
    presetBase: 'M_AfricanAmerican_05',
    ageSlider: 55,
    weightSlider: 65,
    muscleSlider: 60,
    skinComplexity: 'high_complexity',
  },
  generationPrompts: {
    geminiPrompt: 'Full-body portrait of a large powerful Igbo-German man in Defence Forces full dress — midnight black with silver Marshal insignia.',
    grokPrompt: 'Photorealistic portrait. A large powerful Black-German man in midnight black Marshal dress uniform. Silver temples, regulation cropped.',
  },
  homeWorldId: 'alkahest',
  isMultiWorld: false,
  hostility: 'neutral',
  interactions: ['talk', 'inspect'],
  baseHealth: 800,
  awarenessRadius: 40,
};

// ── Registry ────────────────────────────────────────────────────

/**
 * All canonical characters indexed by character ID.
 * Immutable after construction — bible data is append-only.
 */
const CANON_CHARACTERS: ReadonlyArray<CharacterEntry> = [
  THE_ARCHITECT,
  ITORO_ADEYEMI_OKAFOR,
  SEREN_VAEL,
  KWAME_OSEI_ADEYEMI,
  NNAMDI_ACHEBE,
  SELAMAT_OSEI,
  ADETOKUNBO_FALAYE,
  MIRIAM_VOSS_CARVALHO,
  YARA_SUNDARAM_CHEN,
  EKUNDAYO_MANU,
  ODALYS_FERREIRA_ASANTE,
  DAGNA_THORVALDSEN_MBEKI,
  LUCA_OKONKWO_REINHOLT,
  AMARA_OKAFOR_NWOSU,
  IKENNA_ODUYA_VOSS,
];

const CHARACTER_BY_ID = new Map<number, CharacterEntry>(
  CANON_CHARACTERS.map((c) => [c.characterId, c]),
);

const CHARACTERS_BY_WORLD = new Map<string, ReadonlyArray<CharacterEntry>>();

for (const ch of CANON_CHARACTERS) {
  if (ch.homeWorldId !== null) {
    const existing = CHARACTERS_BY_WORLD.get(ch.homeWorldId) ?? [];
    CHARACTERS_BY_WORLD.set(ch.homeWorldId, [...existing, ch]);
  }
}

// ── Public API ──────────────────────────────────────────────────

/** Get a character by bible ID. */
export function getCharacterById(id: number): CharacterEntry | undefined {
  return CHARACTER_BY_ID.get(id);
}

/** Get all characters assigned to a world. */
export function getCharactersForWorld(worldId: string): ReadonlyArray<CharacterEntry> {
  return CHARACTERS_BY_WORLD.get(worldId) ?? [];
}

/** Get all multi-world characters (appear on any world). */
export function getMultiWorldCharacters(): ReadonlyArray<CharacterEntry> {
  return CANON_CHARACTERS.filter((c) => c.isMultiWorld);
}

/** Get all canonical characters. */
export function getAllCharacters(): ReadonlyArray<CharacterEntry> {
  return CANON_CHARACTERS;
}

/** Total number of registered characters. */
export function getCharacterCount(): number {
  return CANON_CHARACTERS.length;
}

/** Get characters filtered by tier. */
export function getCharactersByTier(tier: CharacterEntry['tier']): ReadonlyArray<CharacterEntry> {
  return CANON_CHARACTERS.filter((c) => c.tier === tier);
}

/** Get characters filtered by faction. */
export function getCharactersByFaction(faction: CharacterEntry['faction']): ReadonlyArray<CharacterEntry> {
  return CANON_CHARACTERS.filter((c) => c.faction === faction);
}
