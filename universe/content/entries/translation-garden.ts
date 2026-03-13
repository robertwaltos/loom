/**
 * Content Entries — Translation Garden
 * World: The Translation Garden | Guide: Farah Al-Rashid | Subject: Multilingual Awareness
 *
 * Four published entries spanning the history of translation and multilingualism:
 *   1. The House of Wisdom — Baghdad's ancient translation engine
 *   2. The Septuagint — translating the Hebrew Bible into Greek
 *   3. Nuremberg Trials — simultaneous interpretation under pressure
 *   4. Google Translate — when machines learned to translate
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The House of Wisdom (Tier 1) ──────────────────────────

export const ENTRY_HOUSE_OF_WISDOM: RealWorldEntry = {
  id: 'entry-house-of-wisdom',
  type: 'cultural_milestone',
  title: "The Place Where Knowledge Changed Languages",
  year: 800,
  yearDisplay: '~800 CE',
  era: 'medieval',
  descriptionChild:
    "In Baghdad, a long time ago, a great library called the House of Wisdom collected books from all over the world and translated them into Arabic. Without these translations, the ideas of ancient Greece, Persia, and India might have been lost forever.",
  descriptionOlder:
    "The Bayt al-Hikma (House of Wisdom) under the Abbasid caliphs became the world's greatest translation centre. Scholars translated Greek philosophy (Aristotle, Plato), Indian mathematics (the number zero), and Persian astronomy into Arabic. When Europe entered its medieval period, these Arabic translations preserved knowledge that would have otherwise been lost. Later, when European scholars re-translated Arabic texts into Latin, they triggered the Renaissance.",
  descriptionParent:
    "The Bayt al-Hikma (House of Wisdom), established in Baghdad during the Abbasid Caliphate (~8th–13th century), orchestrated the largest translation movement in pre-modern history. Scholars including Hunayn ibn Ishaq systematically translated Greek philosophical and scientific texts (Aristotle, Galen, Euclid), Indian mathematical texts (including the concept of zero and decimal place-value), and Persian astronomical works into Arabic. These Arabic translations later entered medieval Europe through translation centres in Toledo and Sicily, catalysing the 12th-century Renaissance. The story teaches children that translation is not merely a linguistic operation but Civilisation's save button — the mechanism by which humanity preserves its own knowledge across language barriers.",
  realPeople: ['Hunayn ibn Ishaq', 'Al-Mamun'],
  quote: "Translation is Civilisation's save button.",
  quoteAttribution: 'Farah Al-Rashid, Guide of the Translation Garden',
  geographicLocation: { lat: 33.3152, lng: 44.3661, name: 'Baghdad, Iraq' },
  continent: 'Asia',
  subjectTags: ['House of Wisdom', 'translation', 'Baghdad', 'Arabic', 'knowledge preservation'],
  worldId: 'translation-garden',
  guideId: 'farah-al-rashid',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-septuagint-translation'],
  funFact:
    "The number zero came to Europe through Arabic translations of Indian mathematics at the House of Wisdom. Without that translation, we might still be using Roman numerals for everything.",
  imagePrompt:
    'Lush formal garden with archways bearing Arabic, Greek, and Sanskrit scripts, fountain of flowing ink, scrolls transforming as they pass through garden gates, warm golden light',
  status: 'published',
};

// ─── Entry 2: The Septuagint (Tier 2) ──────────────────────────────

export const ENTRY_SEPTUAGINT_TRANSLATION: RealWorldEntry = {
  id: 'entry-septuagint-translation',
  type: 'cultural_milestone',
  title: "Seventy Scholars, One Translation",
  year: -250,
  yearDisplay: '~250 BCE',
  era: 'classical',
  descriptionChild:
    "Long ago, about seventy scholars were asked to translate the Hebrew Bible into Greek so that Jewish people who spoke Greek could read it. The story says they all worked separately but came up with exactly the same translation — which sounds like magic, but shows how important this book was.",
  descriptionOlder:
    "The Septuagint was the first major translation project in Western history. Commissioned in Ptolemaic Alexandria (~3rd century BCE), it made the Hebrew scriptures accessible to Greek-speaking Jewish communities across the Mediterranean. Legend claims 72 scholars worked independently and produced identical translations. Whether true or not, the Septuagint shaped Christianity (the New Testament quotes it extensively) and established the principle that sacred texts can be faithfully rendered across languages.",
  descriptionParent:
    "The Septuagint (~3rd–2nd century BCE) represents the oldest known large-scale translation project in Western civilisation. Commissioned at the Library of Alexandria under Ptolemy II Philadelphus, it rendered the Hebrew Bible into Koine Greek for the large Greek-speaking Jewish diaspora. The legendary account of 72 scholars producing identical independent translations (from the Letter of Aristeas) is almost certainly apocryphal, but it reveals the enormous cultural anxiety surrounding translation of sacred texts. The Septuagint profoundly shaped early Christianity — many New Testament quotations cite it directly rather than Hebrew originals. The project teaches children that some translations become more influential than their originals.",
  realPeople: ['Ptolemy II Philadelphus'],
  quote: "Some translations become more influential than their originals.",
  quoteAttribution: 'Farah Al-Rashid, Guide of the Translation Garden',
  geographicLocation: { lat: 31.2001, lng: 29.9187, name: 'Alexandria, Egypt' },
  continent: 'Africa',
  subjectTags: ['Septuagint', 'Bible', 'Greek translation', 'Alexandria', 'sacred texts'],
  worldId: 'translation-garden',
  guideId: 'farah-al-rashid',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-house-of-wisdom'],
  unlocks: ['entry-nuremberg-interpretation'],
  funFact:
    "The word 'Septuagint' comes from the Latin for 'seventy.' The legend says 72 scholars all produced identical translations working alone — a miracle story designed to prove the translation was as authoritative as the original.",
  imagePrompt:
    'Garden courtyard with 72 separate translation desks in concentric circles, scrolls floating between Hebrew and Greek script hedges, Alexandrian architecture, soft scholarly light',
  status: 'published',
};

// ─── Entry 3: Nuremberg Simultaneous Interpretation (Tier 2) ───────

export const ENTRY_NUREMBERG_INTERPRETATION: RealWorldEntry = {
  id: 'entry-nuremberg-interpretation',
  type: 'cultural_milestone',
  title: "Translating Justice in Real Time",
  year: 1945,
  yearDisplay: '1945–1946 CE',
  era: 'modern',
  descriptionChild:
    "After World War II, leaders who had done terrible things were put on trial. But the judges, lawyers, witnesses, and defendants all spoke different languages — English, French, Russian, and German. For the first time ever, translators had to translate everything as it was being said, in real time.",
  descriptionOlder:
    "The Nuremberg Trials (1945–1946) required simultaneous interpretation across four languages for the first time in history. Under the direction of Colonel Léon Dostert, a system using IBM equipment allowed interpreters to translate testimony in real time rather than consecutively. The pressure was extraordinary: interpreters could push a button to signal the speaker to slow down, and mistranslations could alter the meaning of testimony in a war crimes trial. The system worked and became the model for the United Nations and all international diplomacy.",
  descriptionParent:
    "The Nuremberg Trials (1945–1946) pioneered simultaneous interpretation at scale. Colonel Léon Dostert, Eisenhower's personal interpreter, developed the four-language system (English, French, Russian, German) using IBM equipment. Interpreters worked in teams of twelve, with three per language booth, rotating every 85 minutes due to cognitive fatigue. The system included a 'slow-down' signal when speakers exceeded interpretable speed. The stakes were existential: mistranslation in a war crimes trial could alter verdicts. The system's success led directly to adoption by the United Nations. The story teaches children that translation at its most extreme is an act of precision under pressure, where accuracy is a moral obligation.",
  realPeople: ['Léon Dostert'],
  quote: "Translation at its most extreme is an act of precision under pressure, where accuracy is a moral obligation.",
  quoteAttribution: 'Farah Al-Rashid, Guide of the Translation Garden',
  geographicLocation: { lat: 49.4521, lng: 11.0767, name: 'Nuremberg, Germany' },
  continent: 'Europe',
  subjectTags: ['Nuremberg', 'simultaneous interpretation', 'translation', 'war crimes trial', 'United Nations'],
  worldId: 'translation-garden',
  guideId: 'farah-al-rashid',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-house-of-wisdom'],
  unlocks: ['entry-google-translate'],
  funFact:
    "Interpreters rotated every 85 minutes because the cognitive fatigue was so intense. They could press a button to signal the speaker to slow down. The system was so successful that the United Nations adopted it immediately.",
  imagePrompt:
    'Garden section with four interpreter pavilions connected by speaking tubes, vintage microphones among hedges, four-language transcript flowing like water between beds',
  status: 'published',
};

// ─── Entry 4: Google Translate (Tier 3) ─────────────────────────────

export const ENTRY_GOOGLE_TRANSLATE: RealWorldEntry = {
  id: 'entry-google-translate',
  type: 'invention',
  title: "When Machines Learned to Translate (Mostly)",
  year: 2006,
  yearDisplay: '2006 CE – present',
  era: 'contemporary',
  descriptionChild:
    "Google Translate can translate over 130 languages — more than any human could ever learn. But it makes funny mistakes sometimes, especially with idioms and jokes. It learned to translate not by studying grammar, but by reading millions of already-translated documents and finding patterns.",
  descriptionOlder:
    "Google Translate launched in 2006 using statistical methods, then switched to neural machine translation in 2016, dramatically improving quality. It processes over 100 billion words per day. But machine translation still struggles with idioms, cultural context, and literary nuance. \"The spirit is willing but the flesh is weak\" famously became \"the vodka is strong but the meat is rotten\" in an early Russian translation. The system reveals the gap between pattern-matching and genuine understanding.",
  descriptionParent:
    "Google Translate (launched 2006, neural upgrade 2016) processes over 100 billion words daily across 133+ languages. The 2016 shift from statistical machine translation (SMT) to Google Neural Machine Translation (GNMT) using transformer architecture dramatically improved quality for high-resource language pairs. However, performance varies enormously by language pair — English-Spanish is near-professional quality, while low-resource languages remain poor. The system highlights the distinction between statistical pattern-matching and genuine comprehension: it can translate a sentence without understanding its meaning. The ongoing challenge teaches children that translation is fundamentally a creative and cultural act, not merely a technical one, and that human translators remain essential for nuance, poetry, and context.",
  realPeople: [],
  quote: "The spirit is willing but the flesh is weak — famously became 'the vodka is strong but the meat is rotten.'",
  quoteAttribution: 'Early machine translation legend (apocryphal)',
  geographicLocation: { lat: 37.4220, lng: -122.0841, name: 'Mountain View, California' },
  continent: 'North America',
  subjectTags: ['Google Translate', 'machine translation', 'neural networks', 'AI', 'multilingual'],
  worldId: 'translation-garden',
  guideId: 'farah-al-rashid',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-septuagint-translation', 'entry-nuremberg-interpretation'],
  unlocks: [],
  funFact:
    "Google Translate processes over 100 billion words per day — more than all human translators in history combined. But it still can't reliably translate jokes, puns, or poetry, because those depend on cultural meaning, not just word patterns.",
  imagePrompt:
    'Digital garden section where text transforms between languages as it flows through flower beds, neural network patterns in the trellis, holographic translation interface among living plants',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const TRANSLATION_GARDEN_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_HOUSE_OF_WISDOM,
  ENTRY_SEPTUAGINT_TRANSLATION,
  ENTRY_NUREMBERG_INTERPRETATION,
  ENTRY_GOOGLE_TRANSLATE,
] as const;

export const TRANSLATION_GARDEN_ENTRY_IDS: readonly string[] =
  TRANSLATION_GARDEN_ENTRIES.map((e) => e.id);
