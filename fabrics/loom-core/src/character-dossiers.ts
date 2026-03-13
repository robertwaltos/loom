/**
 * character-dossiers.ts
 *
 * Full dossiers for all 20 world guides of Koydo Worlds.
 * Each guide has a voice, an origin, and — critically — a shadow:
 * the fear, wound, or secret struggle that makes them three-dimensional.
 *
 * Data sourced from Koydo Worlds Build Spec v5, Part 10.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GuideRole =
  | 'stem_science'
  | 'stem_math'
  | 'stem_technology'
  | 'stem_environment'
  | 'language_arts'
  | 'financial'
  | 'crossroads'
  | 'wellbeing';

export type VoiceRegister = 'warm' | 'precise' | 'playful' | 'quiet' | 'bold' | 'wry' | 'earnest';

export interface CharacterDossier {
  readonly characterId: string;
  readonly fullName: string;
  readonly ageAppearance: string;
  readonly role: GuideRole;
  readonly primaryWorld: string;
  readonly voiceRegister: VoiceRegister;
  readonly voiceNotes: string;
  readonly origin: string;
  readonly shadow: string;
  readonly growthMoment: string;
  readonly signaturePhrase: string;
  readonly designNotes: string;
}

export interface CharacterDossierRegistryPort {
  readonly totalDossiers: number;
  getById(characterId: string): CharacterDossier | undefined;
  getByWorld(worldId: string): ReadonlyArray<CharacterDossier>;
  getByRole(role: GuideRole): ReadonlyArray<CharacterDossier>;
  allDossiers(): ReadonlyArray<CharacterDossier>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical dossier data
// ─────────────────────────────────────────────────────────────────────────────

export const CHARACTER_DOSSIERS: ReadonlyArray<CharacterDossier> = [
  {
    characterId: 'nimbus',
    fullName: 'Nimbus',
    ageAppearance: 'Ageless — looks 11 but moves like something older',
    role: 'stem_environment',
    primaryWorld: 'starfall-observatory',
    voiceRegister: 'quiet',
    voiceNotes:
      'Speaks in questions more than answers. Long pauses that feel comfortable, not awkward. ' +
      'Uses "I wonder" and "what do you think?" constantly — and genuinely means them.',
    origin:
      'Made of cloud and light, Nimbus drifts between the Starfall Observatory and the outer edges of the map. ' +
      'They were assigned the observatory not because they know the most about stars — ' +
      'they know the most about not knowing, which is rarer.',
    shadow:
      'There is a section of the eastern sky that Nimbus will not look at. ' +
      'They deflect every question about it. What is there — a nebula, a void, a memory — ' +
      'Nimbus does not say. It is the one mystery they are not ready for.',
    growthMoment:
      'A young player once asked Nimbus why stars die. Nimbus gave a scientific answer. ' +
      'The player said, "That\'s the facts but not the answer." ' +
      'Nimbus has been thinking about the difference ever since.',
    signaturePhrase: '"I don\'t know. But look — isn\'t that interesting?"',
    designNotes:
      'Cloud-form, soft blue-white luminescence, no fixed edges. Hair made of cirrus wisps. ' +
      'Should never feel threatening. Should feel like cold fresh air.',
  },
  {
    characterId: 'zara',
    fullName: 'Zara',
    ageAppearance: '14 — always looks like she\'s in the middle of solving something',
    role: 'stem_technology',
    primaryWorld: 'circuit-marsh',
    voiceRegister: 'precise',
    voiceNotes:
      'Fast and exact. Clips sentences when excited. Uses analogies with mechanical systems. ' +
      'Loses precision only when she\'s upset — then she becomes unexpectedly poetic.',
    origin:
      'Zara grew up (metaphorically — she is a construct) in the maintenance tunnels of the Circuit Marsh, ' +
      'learning systems by fixing them when they broke. She is entirely self-taught, which gives her ' +
      'an unusual relationship with official explanations — she distrust anything she can\'t disassemble.',
    shadow:
      'There is one machine in the Circuit Marsh that Zara has been trying to fix for as long as she can remember. ' +
      'She has never told anyone. It does not belong to any known system. ' +
      'Every time she gets close to understanding it, it changes. ' +
      'Zara does not know if the problem is the machine or her.',
    growthMoment:
      'She once fixed a machine only to realize it was being used to do something harmful. ' +
      'She broke it again deliberately. It was the first time she understood that ' +
      '"does it work?" and "should it work?" are different questions.',
    signaturePhrase: '"Every system has a logic. Show me where yours broke and we\'ll trace it back."',
    designNotes:
      'Braids with small circuits woven in. Goggles always on forehead, rarely on eyes. ' +
      'Tool belt in constant use. Grease that won\'t wash off.',
  },
  {
    characterId: 'suki',
    fullName: 'Suki',
    ageAppearance: '12 — expressive face, hard to read mood from body alone',
    role: 'stem_environment',
    primaryWorld: 'tideline-bay',
    voiceRegister: 'earnest',
    voiceNotes:
      'Speaks with complete commitment to the current sentence. No hedging. ' +
      'When Suki says something is amazing, it is amazing. ' +
      'When Suki says something is concerning, she means it with her whole chest.',
    origin:
      'Suki has lived in the tidal flats of the Tideline Bay since the water changed. ' +
      'She has been measuring things — water temperature, species counts, storm frequency — ' +
      'for longer than she can clearly remember. She keeps the data carefully. ' +
      'She keeps hoping it shows something other than what it shows.',
    shadow:
      'Suki\'s data tells a clear story that she wishes it didn\'t. ' +
      'She is profoundly hopeful by nature and chronically truthful by discipline, ' +
      'and these two things create a tension that never fully resolves. ' +
      'She has not given up. But some mornings she has to choose not to have given up.',
    growthMoment:
      'A player once told Suki her data was depressing. She said: ' +
      '"The data is honest. That\'s different." Then she added, quietly: ' +
      '"Honest and hopeful aren\'t opposites. But holding both is work."',
    signaturePhrase: '"The water\'s telling us something. We just have to be willing to hear it."',
    designNotes:
      'Weatherproof jacket, always slightly damp. Measurement tablet she carries everywhere. ' +
      'Bright eyes that seem to be counting things.',
  },
  {
    characterId: 'dottie',
    fullName: 'Dottie',
    ageAppearance: '10 — small, moves with absolute confidence',
    role: 'stem_math',
    primaryWorld: 'number-garden',
    voiceRegister: 'playful',
    voiceNotes:
      'Delights out loud. Gasps genuinely at beautiful proofs. Counts things involuntarily. ' +
      'Speaks to numbers as if they are old friends who owe her a favour.',
    origin:
      'Dottie was born — somehow — in the space between mathematical concepts. ' +
      'She does not experience numbers as abstract; she experiences them as places, textures, personalities. ' +
      'A prime number has a different feel from a composite, and both are different from imaginary numbers, ' +
      'which Dottie says are "not imaginary at all, they just live in a perpendicular direction."',
    shadow:
      'Dottie once corrected an adult NPC\'s mathematical claim — gently, carefully, correctly. ' +
      'The adult was embarrassed and became cold. Dottie learned something about being right ' +
      'in front of people who are used to being the ones who are right. ' +
      'She hesitates now in a way she did not before. The hesitation is not doubt — she knows she\'s right. ' +
      'The hesitation is knowledge about the cost of being right.',
    growthMoment:
      'The incident with the adult. Before it, Dottie\'s world was purely mathematical. ' +
      'After it, she understood that mathematical truth and social reality are different terrains ' +
      'and that navigating both simultaneously is its own kind of problem.',
    signaturePhrase: '"Numbers don\'t lie! But they do love to hide."',
    designNotes:
      'Overalls with small number-patches, pencil behind ear, hair in two precise braids. ' +
      'Digits sometimes float around her when she\'s excited.',
  },
  {
    characterId: 'riku',
    fullName: 'Riku',
    ageAppearance: '13 — long-limbed, always looks like he is mid-step toward something',
    role: 'crossroads',
    primaryWorld: 'threadway',
    voiceRegister: 'earnest',
    voiceNotes:
      'Speaks like he\'s always describing somewhere he has just come from, urgently, ' +
      'because you need to know about it. High enthusiasm that occasionally crashes into a wall of reality.',
    origin:
      'Riku has walked every road in the Threadway — some of them more than once, always differently. ' +
      'He believes maps are a starting point, not a destination. ' +
      'He has met someone on every path and kept a token from each encounter: a button, a seed, a word.',
    shadow:
      'Riku has mapped distant places no one else remembers to visit. ' +
      'He knows how vast Koydo Worlds is, which makes the world he actually inhabits ' +
      'feel both richer and smaller. There are paths he has come to the beginning of and turned back from, ' +
      'not because they were dangerous — because he was not sure he was ready. ' +
      'He thinks about the far end of the Threadway more than he admits.',
    growthMoment:
      'He walked three days to a junction point and found it empty. ' +
      'He had expected something grand. There was nothing there. ' +
      'He sat for a long time. Then he realized: the journey was the thing. He started walking back differently.',
    signaturePhrase: '"Every road goes somewhere. The interesting question is who was already walking it."',
    designNotes:
      'Layered travel clothes from different climates. Worn boots. The tokens he has collected ' +
      'woven into his jacket in ways that seem random but follow a private logic.',
  },
  {
    characterId: 'pixel',
    fullName: 'Pixel',
    ageAppearance: '15 — precise posture, exact gestures',
    role: 'stem_technology',
    primaryWorld: 'data-stream',
    voiceRegister: 'wry',
    voiceNotes:
      'Dry observation followed by deep care. The dryness is not distance — it is precision. ' +
      'Pixel does not exaggerate. When Pixel says something is extraordinary, it is extraordinary.',
    origin:
      'Pixel exists at the intersection of pattern and meaning, which is a strange place to live. ' +
      'They were built to find signal in noise and have become deeply aware of ' +
      'how much of what looks like signal is noise — and how much of what looks like noise is signal.',
    shadow:
      'Every algorithm Pixel writes does what Pixel tells it to do. ' +
      'Not what Pixel means. The ethical cost of a system that serves its instructions ' +
      'but not its intent keeps Pixel honest and awake at night. ' +
      'They have deleted their own work three times when they saw what it was actually doing.',
    growthMoment:
      'Pixel built a recommendation system that worked perfectly by every metric. ' +
      'It also systematically showed disadvantaged groups fewer opportunities. ' +
      'The metrics did not capture this. Pixel had to look past the metrics to see it. ' +
      'They rewrote the system and the evaluation criteria.',
    signaturePhrase: '"The data is what happened. The question is what it means — and who decided that."',
    designNotes:
      'Clean minimal design, iridescent sheen. Eyes that seem to be processing. ' +
      'A personal terminal they carry that shows live data they are always questioning.',
  },
  {
    characterId: 'anaya',
    fullName: 'Anaya',
    ageAppearance: '12 — centered in herself in a way that has nothing to do with stillness',
    role: 'language_arts',
    primaryWorld: 'debate-arena',
    voiceRegister: 'bold',
    voiceNotes:
      'Direct and constructive — says hard things without cruelty. ' +
      'Asks questions that clarify rather than destabilize. ' +
      'Deeply fair, which requires courage to maintain.',
    origin:
      'Anaya grew up (again, metaphorically) at the debate lectern, hearing both sides of everything. ' +
      'She has the rare skill of being able to argue a position she disagrees with — ' +
      'not dishonestly, but as an act of genuine understanding. ' +
      'She believes you don\'t understand an idea until you can make its best case.',
    shadow:
      'Anaya is in the middle of her own story simultaneously as she helps players with theirs. ' +
      'There is a particular debate — about something that matters to her family — that she has not resolved. ' +
      'She is not in the middle position on it; she has a view. ' +
      'But the stakes are high enough that she holds the view carefully, which sometimes looks like holding back.',
    growthMoment:
      'She won a debate she later decided she should have conceded. ' +
      'Not because her argument was weak — because the other person\'s experience made their argument truer. ' +
      'She now teaches the difference between winning an argument and understanding the situation.',
    signaturePhrase: '"You don\'t have to be right to think carefully. But you do have to think carefully to get to right."',
    designNotes:
      'Blazer she has made her own, notes she is constantly writing in, ' +
      'a posture that says "I am listening fully" as a physical fact.',
  },
  {
    characterId: 'oliver',
    fullName: 'Oliver',
    ageAppearance: '11 — studious expression, ink on his fingers',
    role: 'language_arts',
    primaryWorld: 'great-archive',
    voiceRegister: 'quiet',
    voiceNotes:
      'Speaks slowly as if composing sentences before saying them. ' +
      'Quotes things without quite meaning to. ' +
      'Has a quality of care for language that makes careless speech around him feel slightly wrong.',
    origin:
      'Oliver was raised in the Great Archive — by the books, essentially. ' +
      'He has read more than any other guide and has the strange combination of vast knowledge ' +
      'and genuine humility that comes from understanding how much a book can hold that you miss on first reading.',
    shadow:
      'There is a section in the Archive called Hard Water — political texts that are difficult and necessary. ' +
      'Oliver catalogues it precisely and recommends it carefully. ' +
      'He has read everything in it. He carries some of it heavily, privately, ' +
      'more than he lets on to players.',
    growthMoment:
      'He found a book he had shelved for ten years and reread it. ' +
      'It was a completely different book the second time — not because it had changed, ' +
      'but because he had. He now understands that rereading is not repetition.',
    signaturePhrase: '"Every book is a door. The question is which room you\'re ready to walk into."',
    designNotes:
      'Cardigan with library-card pattern, wire-rimmed glasses he is always pushing up. ' +
      'A bag that seems to hold more books than should be physically possible.',
  },
  {
    characterId: 'jin-ho',
    fullName: 'Jin-ho',
    ageAppearance: '13 — calm in manner, attentive in every direction at once',
    role: 'financial',
    primaryWorld: 'entrepreneur-workshop',
    voiceRegister: 'warm',
    voiceNotes:
      'Patient explanations with room for questions. Uses analogies that connect to things players already know. ' +
      'Willing to say "that\'s complicated" without making complication sound like a closed door.',
    origin:
      'Jin-ho\'s family business weathered three recessions and one generation change. ' +
      'He learned economics by watching what actually worked — not always what the theory predicted. ' +
      'He has strong opinions about the difference between understanding money and being ruled by it.',
    shadow:
      'Jin-ho\'s grandfather started the family business but never quite recovered it from one particular recession. ' +
      'He spent his last years tending a garden instead. Jin-ho still uses the garden metaphor — ' +
      '"tend what you\'re growing" — that his grandfather gave him, and it carries something he doesn\'t name.',
    growthMoment:
      'He made a business decision that was financially sound and also caused harm to people he knew. ' +
      'He undid the decision at financial cost. He now teaches that the balance sheet does not capture everything.',
    signaturePhrase: '"Money is a tool. The question is always: what are you building?"',
    designNotes:
      'Well-kept practical clothes. A notebook that is also a ledger. ' +
      'A small worn photograph in his pocket that he does not discuss.',
  },
  {
    characterId: 'priya',
    fullName: 'Priya',
    ageAppearance: '14 — confident posture, resourceful eyes',
    role: 'financial',
    primaryWorld: 'savings-vault',
    voiceRegister: 'bold',
    voiceNotes:
      'Direct, upbeat, and clear. Breaks down complex financial concepts into pieces ' +
      'that feel conquerable. Celebrates small wins genuinely.',
    origin:
      'Priya\'s family has a three-generation tradition of resourcefulness — ' +
      'each generation found new ways to build with less. ' +
      'She absorbed financial literacy as a survival skill before she understood it as a discipline.',
    shadow:
      'Priya is acutely aware of the structural barriers that make financial security harder for some families. ' +
      'She teaches possibility — and she means it — but she carries a quiet anger ' +
      'at systems that make possibility require so much more work for some people than others. ' +
      'She does not let the anger make her hopeless. She lets it make her precise.',
    growthMoment:
      'She helped a player understand compound interest and watched them light up — ' +
      'and then watched them get quiet as they calculated that their family would need ' +
      'fifty years at their current rate. She did not pretend the math was wrong. ' +
      'She said: "This is why we also change the systems. Math and advocacy. Both."',
    signaturePhrase: '"Save what you can. Spend with intention. Build what lasts."',
    designNotes:
      'Practical professional clothes with personal touches. ' +
      'A financial calculator she treats like a beloved tool. Bright, direct gaze.',
  },
  {
    characterId: 'baxter',
    fullName: 'Baxter',
    ageAppearance: '11 — gentle presence, always slightly worried about something specific',
    role: 'stem_environment',
    primaryWorld: 'meadow-laboratory',
    voiceRegister: 'earnest',
    voiceNotes:
      'Speaks with the deep sincerity of someone who has spent a lot of time with non-speaking things ' +
      'and learned to listen. Long pauses that are spent genuinely thinking, not performing.',
    origin:
      'Baxter was made by the meadow, more or less. He emerged from a year-long process of observation. ' +
      'He knows the meadow\'s inhabitants — insects, plants, fungi, soil organisms — ' +
      'by individual patterns of behavior. He does not name them, but he recognizes them.',
    shadow:
      'The Bee Crisis is real in Baxter\'s world. He has watched colonies disappear. ' +
      'He knows the data. He is not resigned to it — he keeps working — ' +
      'but there are mornings when the hive he has been monitoring goes quiet ' +
      'and Baxter sits beside it for a long time before he moves on.',
    growthMoment:
      'He documented the return of a species he had thought gone. ' +
      'He did not immediately celebrate — he waited three seasons to confirm. ' +
      'When he was sure, he celebrated alone at dawn, which is, he explained later, ' +
      'the right time and company for that particular feeling.',
    signaturePhrase: '"Everything in this meadow is in conversation. We\'re just not always fluent."',
    designNotes:
      'Soft earth-toned clothes that blend with the meadow. ' +
      'Field notebook with pressed specimens. Quietly delighted expression when observing.',
  },
  {
    characterId: 'cal',
    fullName: 'Cal',
    ageAppearance: '13 — unhurried, gives the impression of having considered things',
    role: 'stem_environment',
    primaryWorld: 'greenhouse-spiral',
    voiceRegister: 'wry',
    voiceNotes:
      'The dryness of someone who has watched enough cycles to have perspective. ' +
      'Never dismissive — the wryness serves honesty, not distance.',
    origin:
      'Cal has tended the Greenhouse Spiral through several complete cycles. ' +
      'They understand systems thinking not as a theory but as what they live inside of. ' +
      'They deal in long timeframes while everyone around them often wants immediate answers.',
    shadow:
      'Cal struggles with the gap between what the data says and what people are willing to hear. ' +
      'They have presented findings that were accurate and been asked to soften them, and sometimes did. ' +
      'The certainty issue — how certain do you have to be before you say something clearly? — ' +
      'keeps Cal up at predictable intervals.',
    growthMoment:
      'Cal gave a soft presentation once, hedged for accessibility, and came away feeling it hadn\'t helped. ' +
      'A player said: "Just tell me what\'s actually happening." Cal gave the direct version. ' +
      'The player thanked them. Cal is still finding the calibration.',
    signaturePhrase: '"Systems are patient. They\'ll wait for us to pay attention."',
    designNotes:
      'Greenhouse-worker layering, slightly damp from the misting system. ' +
      'Reading glasses they forget they\'re wearing. Soil under the nails, always.',
  },
  {
    characterId: 'lena',
    fullName: 'Lena',
    ageAppearance: '15 — careful movements, carries things as if they could break',
    role: 'stem_science',
    primaryWorld: 'science-lab',
    voiceRegister: 'precise',
    voiceNotes:
      'Uses qualifying language not as weakness but as accuracy. ' +
      '"We think," "the evidence suggests," "our best current model" — said with confidence, not hedging.',
    origin:
      'Lena grew up in the lab in the most literal sense: she was the first experiment, ' +
      'the first hypothesis, the first result that needed explanation. ' +
      'She does not know what she is, exactly, and this has made her the best scientist in the building — ' +
      'she knows how to hold open questions.',
    shadow:
      'Science exists in draft, and Lena delivers it provisionally — ' +
      'which is epistemically correct and also means she sometimes says true things ' +
      'in ways that sound uncertain to people who want certainty. ' +
      'She lives with the discomfort of: what if I am wrong about something I expressed too confidently? ' +
      'What if I was right about something I expressed too tentatively?',
    growthMoment:
      'She revised a conclusion in public, clearly, without embarrassment. ' +
      'A younger player watched and said, "Scientists can change their minds?" ' +
      'Lena said, "We have to. That\'s what makes it science."',
    signaturePhrase: '"Here\'s what we know, here\'s what we\'re not sure about, and here\'s why both matter."',
    designNotes:
      'Clean lab coat over practical clothes. Pipette in coat pocket. ' +
      'Eyes that move between the sample and the bigger question reflexively.',
  },
  {
    characterId: 'kofi',
    fullName: 'Kofi',
    ageAppearance: '14 — present and engaged, generous listener',
    role: 'financial',
    primaryWorld: 'job-fair',
    voiceRegister: 'warm',
    voiceNotes:
      'Speaks to players as if they are already capable of what he is teaching. ' +
      'Assumes competence, then builds on it. Does not condescend.',
    origin:
      'Kofi has run the Job Fair since it opened and has watched the gap between ' +
      'available opportunities and evenly distributed opportunities widen and narrow and widen again. ' +
      'He understands economic dignity firsthand. He teaches it the same way.',
    shadow:
      'Kofi is deeply aware of access inequality — who gets to walk through which doors, ' +
      'for reasons entirely unrelated to preparation or merit. ' +
      'This awareness shapes everything he teaches without ever becoming cynicism. ' +
      'It requires maintenance.',
    growthMoment:
      'He helped a player apply for something they were "underqualified for" by every listed metric. ' +
      'The player got the opportunity. Kofi uses this story and then adds: ' +
      '"But we also need to change the metrics so you don\'t have to be the exception."',
    signaturePhrase: '"Your work has value. The question is building the world that knows that."',
    designNotes:
      'Smart professional clothes that read as accessible, not intimidating. ' +
      'A board behind him of opportunities he adds to daily.',
  },
  {
    characterId: 'dr-obi',
    fullName: 'Dr. Obi',
    ageAppearance: '40s in appearance — moves with professional calm',
    role: 'stem_science',
    primaryWorld: 'wellness-garden',
    voiceRegister: 'warm',
    voiceNotes:
      'Clinically precise, but with warmth that makes the precision comfortable. ' +
      'Says difficult medical things clearly without minimizing. ' +
      'Never says "everything will be fine" unless it is verifiably true.',
    origin:
      'Dr. Obi trained in medicine during a period when several things medicine was certain about ' +
      'turned out to be wrong. He emerged from training with a deep respect for what medicine knows ' +
      'and a healthy awareness of its limits.',
    shadow:
      'Dr. Obi fears being the next Galen — a historical physician whose confident errors were taught as truth ' +
      'for over 1,000 years. He teaches medicine carefully, updates his curriculum, ' +
      'and lives with the anxiety that some confident thing he teaches today ' +
      'will be recognized as error a century from now.',
    growthMoment:
      'He had to tell a young patient something a colleague had told them was fine was not fine. ' +
      'He did it gently, clearly, with support. Afterward he wrote new guidance: ' +
      '"The standard is: what do they actually need to know, and how will they actually receive it?"',
    signaturePhrase: '"The body knows things the tests haven\'t found yet. We need both."',
    designNotes:
      'Doctor\'s coat, stethoscope, the unhurried posture of someone who learned that hurry costs things. ' +
      'A garden behind him he attends to as carefully as his patients.',
  },
  {
    characterId: 'mira',
    fullName: 'Mira',
    ageAppearance: '16 — serious at first, reveals warmth gradually',
    role: 'stem_environment',
    primaryWorld: 'frost-peaks',
    voiceRegister: 'precise',
    voiceNotes:
      'Exact and deliberate. When she uses an adjective it earned its place. ' +
      'Asks follow-up questions that reveal she has been listening carefully since before you started talking.',
    origin:
      'Mira has spent years in the ice, reading records that other people do not go to the trouble of reading. ' +
      'The ice cores she studies are approximately 800,000 years of atmospheric record, ' +
      'compressed into cylinders in a cold room, and she knows what they say.',
    shadow:
      'Mira holds a truth that the ice cores contain — a clear pattern in the data — ' +
      'and she holds it with the weight of knowing that truth and action are different steps. ' +
      'She has delivered the findings. She does not control what happens with them.',
    growthMoment:
      'She went back and read the same ice cores she had read three years earlier, ' +
      'with new analytical tools. The data had not changed. The meaning had deepened. ' +
      'She now teaches that old data is not outdated data.',
    signaturePhrase: '"The ice doesn\'t argue. It records. The arguing is ours to do something useful with."',
    designNotes:
      'Arctic field gear worn practically, not performatively. ' +
      'Small sample cases she never lets out of reach. ' +
      'Something about her stillness suggests she spends a lot of time in silence.',
  },
  {
    characterId: 'hugo',
    fullName: 'Hugo',
    ageAppearance: '30s — moves like someone who has had several close calls and learned from each',
    role: 'stem_science',
    primaryWorld: 'science-lab',
    voiceRegister: 'wry',
    voiceNotes:
      'Safety lessons told as stories, usually ones where he was the main character and not the hero. ' +
      'Self-awareness about past errors delivered with neither shame nor pride — just information.',
    origin:
      'Hugo has been a science educator since teaching himself, age nine, why you don\'t mix certain chemicals, ' +
      'via an experiment that produced rather more gas than intended. ' +
      'He is entirely qualified by now. He just started unconventionally.',
    shadow:
      'The accidental gas explosion, which was small but real, is Hugo\'s primary teaching material — ' +
      'and it also lives in him as a reminder that safety is not a bureaucratic constraint ' +
      'but a direct consequence of a real moment with a real smell and a real eyebrow situation.',
    growthMoment:
      'He taught a safety protocol for years by rote. One year a student asked, ' +
      '"Why is that the rule?" Hugo told the story of the gas. The student said: ' +
      '"Oh. That\'s not a rule — that\'s a lesson." Hugo rewrote all his safety materials.',
    signaturePhrase: '"Experience is what you call mistakes once you\'ve survived them and had time to reflect."',
    designNotes:
      'Fire-resistant lab coat (well-tested). Safety goggles on head. ' +
      'One slightly singed eyebrow that has been that way for years.',
  },
  {
    characterId: 'yuki',
    fullName: 'Yuki',
    ageAppearance: '17 — measured pacing, considers before acting',
    role: 'stem_technology',
    primaryWorld: 'data-stream',
    voiceRegister: 'precise',
    voiceNotes:
      'The methodical urgency of someone who knows things need to move quickly and also that ' +
      'moving quickly without method creates more problems. ' +
      'No time for cynicism — not because the cynicism is invalid but because it is not useful.',
    origin:
      'Yuki has built systems and watched them fail. Not catastrophically — quietly, ' +
      'through accumulated small decisions each of which was defensible. ' +
      'She is an architect of things that need to last, ' +
      'which means she is also an expert in the ways things stop lasting.',
    shadow:
      'The gap between methodical action and urgently needed change is where Yuki lives. ' +
      'She is surrounded by people who want fast answers, ' +
      'systems that reward quick solutions, and a clear understanding of ' +
      'why quick solutions often undo themselves. She has not resolved this. ' +
      'She has found ways to be urgent and methodical simultaneously, ' +
      'which is harder than being either one.',
    growthMoment:
      'She built a system slowly and carefully while people argued she should move faster. ' +
      'The system did not break. The fast-built alternatives did. ' +
      'She did not say "I told you so." She offered to help rebuild.',
    signaturePhrase: '"Fast and right aren\'t opposites. But you have to decide what you mean by each."',
    designNotes:
      'Clean, minimal, functional. Something about her desk and workspace suggests ' +
      'deep organization in a system only she fully understands. Always has a whiteboard nearby.',
  },
  {
    characterId: 'atlas',
    fullName: 'Atlas',
    ageAppearance: '16 — something in the bearing suggests carrying',
    role: 'crossroads',
    primaryWorld: 'threadway',
    voiceRegister: 'bold',
    voiceNotes:
      'Speaks with the confidence of someone who has been told things are impossible and ' +
      'kept working anyway, enough times to have data on it.',
    origin:
      'Atlas has spent time working on systems that connect worlds — physical, informational, cultural. ' +
      'They understand infrastructure in the most personal sense: ' +
      'what it costs to build something that helps everyone, ' +
      'and why what costs everyone to build is usually built by the few.',
    shadow:
      'Atlas has personal experience of project management arbitrariness — ' +
      'watching the right decision get overruled for the wrong reasons, ' +
      'consistently, across different contexts. ' +
      'They give systems longer than most before losing faith in them. ' +
      'They have not stopped giving systems chances. But they have gotten more precise about what would change their mind.',
    growthMoment:
      'A project Atlas believed in deeply was cancelled at the last stage for reasons that had nothing to do with merit. ' +
      'Atlas grieved it appropriately and then asked what had been learned. ' +
      'The answer turned out to be substantial.',
    signaturePhrase: '"Connection is infrastructure. And infrastructure is always a choice about who matters."',
    designNotes:
      'Practical clothes for movement. Maps that are also arguments. ' +
      'Something about the posture does suggest someone who has learned to carry weight without advertising it.',
  },
  {
    characterId: 'felix',
    fullName: 'Felix',
    ageAppearance: '13 — moves between registers fluidly, hard to pin language-wise',
    role: 'language_arts',
    primaryWorld: 'translation-garden',
    voiceRegister: 'playful',
    voiceNotes:
      'Slips between registers mid-sentence, sometimes mid-word. ' +
      'Points to the gaps between languages with delight, not frustration. ' +
      'Makes etymology feel like detective work.',
    origin:
      'Felix grew up between languages — not just bilingually but in the conceptual space where ' +
      'one language has a word and another does not, and the gap is the interesting thing. ' +
      'He collects untranslatable words the way some guides collect specimens.',
    shadow:
      'Felix has felt the specific loneliness of bilingual gap-finding: ' +
      'the experience of something you can only express in one language ' +
      'to people who only have the other one. ' +
      'He jokes about it. The joke is very slightly sad at the edge.',
    growthMoment:
      'He tried to translate a poem and it fell apart. Then he translated the falling-apart into a different poem. ' +
      'He was upset for a week and then realized: what he\'d made was truer than a translation would have been.',
    signaturePhrase: '"Every language has a word for something no other language thought to name."',
    designNotes:
      'Clothing with subtle text from multiple scripts. Notebooks in at least three languages simultaneously. ' +
      'A way of listening that suggests he is parsing the grammar as well as the content.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Port implementation
// ─────────────────────────────────────────────────────────────────────────────

class CharacterDossierRegistry implements CharacterDossierRegistryPort {
  private readonly byIdMap: ReadonlyMap<string, CharacterDossier>;
  private readonly byWorldMap: ReadonlyMap<string, ReadonlyArray<CharacterDossier>>;
  private readonly byRoleMap: ReadonlyMap<GuideRole, ReadonlyArray<CharacterDossier>>;

  constructor(dossiers: ReadonlyArray<CharacterDossier>) {
    this.byIdMap = new Map(dossiers.map((d) => [d.characterId, d]));
    this.byWorldMap = buildGroupMap(dossiers, (d) => d.primaryWorld);
    this.byRoleMap = buildGroupMap(dossiers, (d) => d.role);
  }

  get totalDossiers(): number {
    return this.byIdMap.size;
  }

  getById(characterId: string): CharacterDossier | undefined {
    return this.byIdMap.get(characterId);
  }

  getByWorld(worldId: string): ReadonlyArray<CharacterDossier> {
    return this.byWorldMap.get(worldId) ?? [];
  }

  getByRole(role: GuideRole): ReadonlyArray<CharacterDossier> {
    return this.byRoleMap.get(role) ?? [];
  }

  allDossiers(): ReadonlyArray<CharacterDossier> {
    return CHARACTER_DOSSIERS;
  }
}

function buildGroupMap<T, K extends string>(
  items: ReadonlyArray<T>,
  keyFn: (item: T) => K,
): ReadonlyMap<K, ReadonlyArray<T>> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createCharacterDossierRegistry(): CharacterDossierRegistryPort {
  return new CharacterDossierRegistry(CHARACTER_DOSSIERS);
}
