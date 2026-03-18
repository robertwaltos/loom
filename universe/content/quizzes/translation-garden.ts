/**
 * Quiz Questions ΓÇö Translation Garden (Farah Al-Rashid)
 * Multilingual Awareness
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const TRANSLATION_GARDEN_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-house-of-wisdom ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-house-wisdom-t1',
    entryId: 'entry-house-of-wisdom',
    difficultyTier: 1,
    question: 'What was the House of Wisdom in Baghdad?',
    options: [
      'A palace where the caliph gave speeches to his people',
      'A great library and translation centre where scholars translated books from Greek, Persian, and Indian languages into Arabic',
      'A school where children learned to read and write for the first time',
      'A market where books and manuscripts were bought and sold',
    ],
    correctIndex: 1,
    explanation: 'The Bayt al-Hikma (House of Wisdom) in Baghdad was one of the greatest centres of learning in history. Scholars there translated works on philosophy, mathematics, astronomy, and medicine from Greek, Persian, and Indian into Arabic ΓÇö preserving knowledge that might otherwise have been lost.',
  },
  {
    id: 'quiz-house-wisdom-t2',
    entryId: 'entry-house-of-wisdom',
    difficultyTier: 2,
    question: 'The concept of zero came to Europe through Arabic translations of Indian mathematics produced at the House of Wisdom. Why does this matter so much?',
    options: [
      'Because zero is a very small number and needed to be introduced slowly',
      'Because without the number zero, mathematics as we know it ΓÇö including all of modern science, engineering, and computing ΓÇö would be impossible',
      'Because European mathematicians were too busy to invent zero themselves',
      'Because zero is only used in Arabic mathematics and Europeans adopted it out of courtesy',
    ],
    correctIndex: 1,
    explanation: 'Roman numerals have no zero. Without zero, place-value notation is impossible, and without place-value notation, multiplication and division become enormously cumbersome. The zero that came through the House of Wisdom, via Indian mathematics and Arabic transmission, is the foundation of every calculation in modern technology.',
  },
  {
    id: 'quiz-house-wisdom-t3',
    entryId: 'entry-house-of-wisdom',
    difficultyTier: 3,
    question: 'When Europe\'s medieval scholars later retranslated Arabic texts into Latin, they triggered what historians call the 12th-century Renaissance. What does the path of knowledge ΓÇö from Greek to Arabic to Latin to European ΓÇö demonstrate about how civilisations advance?',
    options: [
      'That Greek civilisation was superior to all others and should have been preserved directly',
      'That human knowledge advances through a chain of translations and transmissions ΓÇö civilisations build on each other\'s work, and no civilisation advances entirely alone',
      'That Arabic was a better language for preserving knowledge than Latin or Greek',
      'That the most advanced civilisations are those that do not share their knowledge with others',
    ],
    correctIndex: 1,
    explanation: 'Greek knowledge was preserved in Arabic, enriched with Indian and Persian contributions, and then transmitted to medieval Europe. Each stage of translation added value. No single civilisation produced everything that fed the European Renaissance. Human intellectual progress is a collaborative project across time and cultures.',
  },

  // ΓöÇΓöÇΓöÇ entry-septuagint-translation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-septuagint-t1',
    entryId: 'entry-septuagint-translation',
    difficultyTier: 1,
    question: 'What was the Septuagint?',
    options: [
      'A collection of Greek myths translated into Hebrew',
      'A translation of the Hebrew Bible into Greek, so that Greek-speaking Jewish people could read their scriptures',
      'A Greek dictionary created by scholars at the Library of Alexandria',
      'A set of stories about seventy Greek heroes',
    ],
    correctIndex: 1,
    explanation: 'The Septuagint (meaning "seventy" in Latin) was a translation of the Hebrew Bible into Greek, made around the 3rd century BCE in Alexandria. It was created so that Jewish communities who spoke Greek rather than Hebrew could read their sacred texts. Legend says seventy scholars each produced identical translations ΓÇö a miracle story designed to prove the translation\'s authority.',
  },
  {
    id: 'quiz-septuagint-t2',
    entryId: 'entry-septuagint-translation',
    difficultyTier: 2,
    question: 'The legend of seventy scholars each independently producing an identical Septuagint translation is almost certainly not true. Why might this legend have been invented?',
    options: [
      'Because seventy was considered a lucky number in Greek culture',
      'Because communities needed to believe that a translation of sacred texts was as accurate and authoritative as the original ΓÇö the miracle story was a way of claiming divine endorsement',
      'Because the seventy scholars were famous in other areas and adding them to the story made it more impressive',
      'Because the real translators were anonymous and the legend filled in the gap',
    ],
    correctIndex: 1,
    explanation: 'Translating sacred texts raises an uncomfortable question: if the holy text is in Hebrew, can a Greek translation be equally holy? The legend of miraculous identical translations answered this question by claiming the translation itself was divinely guided. The story reveals the anxiety around sacred translation ΓÇö and the cultural need for translated texts to carry the same authority as originals.',
  },
  {
    id: 'quiz-septuagint-t3',
    entryId: 'entry-septuagint-translation',
    difficultyTier: 3,
    question: 'The New Testament quotes the Septuagint rather than the original Hebrew Bible in many passages. This means a translation became a primary source for an entirely new religion. What does this tell us about the power of translations?',
    options: [
      'That the Septuagint must have been more accurate than the Hebrew original',
      'That translations do not merely transmit texts ΓÇö they actively shape how those texts are understood, which ideas are emphasised, and which movements or communities they influence',
      'That early Christians did not know Hebrew and simply used what was available',
      'That all translations should be treated as equal to their originals',
    ],
    correctIndex: 1,
    explanation: 'When the New Testament writers quoted scripture, they quoted the Greek Septuagint ΓÇö and some of those quotations carry different nuances from the Hebrew. This means that the specific choices made by translators in Alexandria 300 years earlier shaped core Christian theology. Translations are not neutral mirrors of originals; they are active interpretive acts with enormous consequences.',
  },

  // ΓöÇΓöÇΓöÇ entry-nuremberg-interpretation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-nuremberg-t1',
    entryId: 'entry-nuremberg-interpretation',
    difficultyTier: 1,
    question: 'What new type of translation was first used at the Nuremberg Trials after World War II?',
    options: [
      'Written translation of documents in secret code',
      'Simultaneous interpretation ΓÇö translating everything as it was being spoken, in real time',
      'A single translator working alone to translate all four languages',
      'Using sign language to communicate between different countries\' delegates',
    ],
    correctIndex: 1,
    explanation: 'The Nuremberg Trials used simultaneous interpretation for the first time in history ΓÇö translators listened to speeches in one language and immediately spoke the translation into another language, all at the same time. Four languages were handled at once: English, French, Russian, and German. The system worked so well it became the model for the United Nations.',
  },
  {
    id: 'quiz-nuremberg-t2',
    entryId: 'entry-nuremberg-interpretation',
    difficultyTier: 2,
    question: 'Simultaneous interpreters at Nuremberg rotated every 85 minutes because the mental effort was so intense. Why is simultaneous interpretation so cognitively demanding?',
    options: [
      'Because the courtroom was very loud and the interpreters had to concentrate harder to hear',
      'Because the interpreter must simultaneously listen in one language, translate in their mind, and speak in another ΓÇö three complex language processes happening at once',
      'Because the legal vocabulary used in the trials was very unusual',
      'Because interpreters were not allowed to write notes and had to remember everything',
    ],
    correctIndex: 1,
    explanation: 'Simultaneous interpretation requires the brain to process incoming speech in one language, formulate the translation, and produce outgoing speech in another language ΓÇö all at the same time, with no pauses. The cognitive load is extraordinary. Eighty-five minutes is roughly the maximum sustainable period before quality degrades from fatigue.',
  },
  {
    id: 'quiz-nuremberg-t3',
    entryId: 'entry-nuremberg-interpretation',
    difficultyTier: 3,
    question: 'At Nuremberg, a mistranslation could have altered the verdict in a war crimes trial. This raises the question: can any translation be perfectly accurate? What does the Nuremberg example teach us about translation and justice?',
    options: [
      'That trials involving multiple languages should not be trusted because translation errors are inevitable',
      'That translation is a moral as well as a linguistic act ΓÇö in high-stakes contexts, accuracy is an ethical obligation, and translators carry genuine responsibility for the consequences of their choices',
      'That machine translation should be used in legal contexts to remove human error',
      'That all international trials should be conducted in a single agreed language to avoid translation issues',
    ],
    correctIndex: 1,
    explanation: 'The Nuremberg interpreters knew their translations would determine guilt or innocence in cases of crimes against humanity. This made their work a moral act, not just a technical one. A word that carries a slightly different nuance ΓÇö "ordered" versus "permitted," "knew" versus "suspected" ΓÇö could change a verdict. Translation at the highest stakes reveals that language choices carry ethical weight.',
  },

  // ΓöÇΓöÇΓöÇ entry-google-translate ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-google-translate-t1',
    entryId: 'entry-google-translate',
    difficultyTier: 1,
    question: 'What kind of mistakes does Google Translate most often make?',
    options: [
      'It misspells individual words very often',
      'It struggles with idioms, jokes, and cultural references that depend on meaning beyond the literal words',
      'It works poorly with any language other than English',
      'It only makes mistakes when translating scientific vocabulary',
    ],
    correctIndex: 1,
    explanation: 'Google Translate works well for straightforward sentences but struggles whenever meaning depends on context, culture, or wordplay. An idiom like "it\'s raining cats and dogs" translated literally into another language produces nonsense. Jokes and puns that depend on double meanings in one language often cannot be translated automatically at all.',
  },
  {
    id: 'quiz-google-translate-t2',
    entryId: 'entry-google-translate',
    difficultyTier: 2,
    question: 'Google Translate learned to translate by reading billions of already-translated documents and finding patterns ΓÇö it was not programmed with grammar rules. What is the key difference between this approach and how a human translator works?',
    options: [
      'A human translator reads fewer documents than Google Translate does',
      'Google Translate identifies statistical patterns between texts, while a human translator understands the meaning and cultural context of what they are translating',
      'Human translators use grammar rules, while Google Translate does not need them',
      'Google Translate is faster than human translators in all situations',
    ],
    correctIndex: 1,
    explanation: 'A human translator understands what a sentence means ΓÇö the concept it is expressing ΓÇö and then finds the best way to express that concept in another language. Google Translate identifies which target-language words tend to appear when particular source-language words appear. It matches patterns without comprehending meaning. This is why it succeeds at literal translation but fails at anything requiring genuine understanding.',
  },
  {
    id: 'quiz-google-translate-t3',
    entryId: 'entry-google-translate',
    difficultyTier: 3,
    question: 'Google Translate is nearly professional quality for common language pairs like English-Spanish, but poor for less-commonly-used language pairs. What does this disparity reveal about the relationship between technology, language, and power?',
    options: [
      'That Spanish is an easier language to translate than less common languages',
      'That languages spoken by larger, wealthier populations generate more digital text, which trains better translation systems ΓÇö creating a technological cycle that advantages already-dominant languages',
      'That Google has chosen not to invest in smaller languages because they are not useful',
      'That the technology for translating less common languages simply has not been invented yet',
    ],
    correctIndex: 1,
    explanation: 'English-Spanish translation is excellent partly because massive amounts of translated English-Spanish text exist online ΓÇö business documents, news articles, government records. Languages with smaller digital presences have less training data, producing worse translation. Technology reflects and reinforces existing inequalities: the languages that already have more resources get better tools, widening the gap.',
  },
];
