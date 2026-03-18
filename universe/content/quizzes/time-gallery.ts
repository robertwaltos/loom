/**
 * Quiz Questions ΓÇö Time Gallery (Rami al-Farsi)
 * Historical Thinking
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const TIME_GALLERY_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-invention-of-calendar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-invention-of-calendar-t1',
    entryId: 'entry-invention-of-calendar',
    difficultyTier: 1,
    question: 'Why did ancient people need to invent calendars?',
    options: [
      'So they could have birthday parties on the right day',
      'So they could track the sun, moon, and stars to know when to plant crops, celebrate, and prepare for seasons',
      'So they could keep records of how much money they had',
      'So they could count how old they were',
    ],
    correctIndex: 1,
    explanation: 'Ancient people\'s lives depended on knowing when to plant and harvest crops, when floods would come, and when important seasons would change. By watching the regular movements of the sun, moon, and stars ΓÇö which never lie ΓÇö they could predict these events and plan ahead. Calendars were survival tools before they were scheduling tools.',
  },
  {
    id: 'quiz-invention-of-calendar-t2',
    entryId: 'entry-invention-of-calendar',
    difficultyTier: 2,
    question: 'When Pope Gregory XIII reformed the calendar in 1582, ten days were "deleted" ΓÇö people went to bed on October 4th and woke up on October 15th. Why did this need to happen?',
    options: [
      'The Pope wanted people to fast for ten days',
      'The old Julian calendar had a small error in tracking the solar year, and over centuries the calendar had drifted ten days out of sync with the actual seasons',
      'A mistake was made when counting the years from ancient times',
      'The ten days were added as extra holidays and then removed to save money',
    ],
    correctIndex: 1,
    explanation: 'The Julian calendar (introduced by Julius Caesar) was slightly too long ΓÇö it added one extra day every 128 years. This tiny error accumulated over 1,600 years until the calendar was ten full days ahead of where it should be relative to the sun. The spring equinox ΓÇö critical for calculating Easter ΓÇö was falling on the wrong date. Pope Gregory XIII\'s solution was to skip ten days entirely to correct the drift, and to adjust the leap year rules to prevent it happening again.',
  },
  {
    id: 'quiz-invention-of-calendar-t3',
    entryId: 'entry-invention-of-calendar',
    difficultyTier: 3,
    question: 'Today, multiple calendar systems are still in active use around the world: the Gregorian, Islamic, Hebrew, Chinese, and Hindu calendars, among others. What does this diversity tell us about what a calendar really is?',
    options: [
      'That most of the world hasn\'t yet adopted the correct calendar',
      'That calendars are cultural documents as much as scientific ones ΓÇö they encode a community\'s values, religious observances, and relationship with time',
      'That different parts of the world experience time differently due to geography',
      'That all these calendars measure slightly different things and are equally inaccurate',
    ],
    correctIndex: 1,
    explanation: 'The Islamic calendar is lunar, structured around the moon ΓÇö perfectly suited to a religion where monthly fasting and pilgrimage depend on the moon\'s phase. The Hebrew calendar is lunisolar, balancing moon months with the solar agricultural year. The Gregorian calendar is purely solar, optimised for international coordination. Each system reflects what its community valued most. Rami teaches that time is not simply "given" ΓÇö it is measured, and the way you measure it reveals who you are and what you care about.',
  },

  // ΓöÇΓöÇΓöÇ entry-howard-zinn ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-howard-zinn-t1',
    entryId: 'entry-howard-zinn',
    difficultyTier: 1,
    question: 'What was different about Howard Zinn\'s history book, A People\'s History of the United States?',
    options: [
      'It was written backwards, starting with modern times',
      'It told the story from the perspective of ordinary people ΓÇö workers, enslaved people, immigrants, and women ΓÇö not just kings and presidents',
      'It had no dates or years in it',
      'It was a children\'s picture book',
    ],
    correctIndex: 1,
    explanation: 'Most history books focus on the actions of powerful leaders ΓÇö generals, presidents, kings. Zinn believed this left out most of humanity. His 1980 book deliberately told American history from the bottom up: through the eyes of Indigenous peoples displaced by colonisation, enslaved Africans, factory workers fighting for basic rights, and women demanding a voice. Their stories are also history ΓÇö just rarely the ones that get told.',
  },
  {
    id: 'quiz-howard-zinn-t2',
    entryId: 'entry-howard-zinn',
    difficultyTier: 2,
    question: 'Zinn said that "objective" history ΓÇö a completely neutral account that tells every side equally ΓÇö is impossible. Why?',
    options: [
      'Because historians are always biased and cannot be trusted',
      'Because every historical account involves choices about what to include, what to leave out, and whose perspective to centre ΓÇö and those choices reflect the storyteller\'s position',
      'Because too many things happen in history to ever write them all down',
      'Because history changes depending on what year it\'s written in',
    ],
    correctIndex: 1,
    explanation: 'Zinn\'s central argument was that every historical narrative is shaped by what the storyteller notices, chooses to include, and considers important. A history written from a general\'s headquarters and a history written from the trenches describe the same battle but produce very different understandings of it. This does not mean all histories are equally wrong ΓÇö it means all histories should be read alongside the question: "Who is telling this, and what did they choose not to say?"',
  },
  {
    id: 'quiz-howard-zinn-t3',
    entryId: 'entry-howard-zinn',
    difficultyTier: 3,
    question: 'Zinn said "You can\'t be neutral on a moving train." Rami adds below it: "But you can see both sides of the track." What is the important difference between these two ideas?',
    options: [
      'Rami is correcting Zinn and saying history should be neutral after all',
      'Zinn is saying you are always participating in history whether you choose to or not, while Rami adds that deliberately seeking multiple perspectives helps you understand what you are participating in',
      'They are saying the same thing in different words',
      'Rami disagrees with Zinn and thinks historians should pick one side',
    ],
    correctIndex: 1,
    explanation: 'Zinn\'s quote means: history is always happening, and doing nothing is itself a choice ΓÇö you cannot stand outside it. Rami\'s addition is not a contradiction but a tool: since you cannot be neutral, you should actively seek out perspectives you wouldn\'t naturally encounter. Seeing both sides of the track doesn\'t mean treating every view as equally valid ΓÇö it means gathering enough information to understand what is actually at stake. This is what Rami models in the Gallery: present every event from multiple vantage points, and let children practise the skill of synthesis.',
  },

  // ΓöÇΓöÇΓöÇ entry-oral-history ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-oral-history-t1',
    entryId: 'entry-oral-history',
    difficultyTier: 1,
    question: 'What is oral history?',
    options: [
      'A type of history written about mouths and teeth',
      'The practice of recording interviews with ordinary people to preserve memories and stories before they are lost',
      'History that is only spoken aloud and never written down',
      'The history of how language was invented',
    ],
    correctIndex: 1,
    explanation: 'Oral history is the practice of interviewing real people ΓÇö farmers, workers, grandparents, survivors ΓÇö and recording their words and memories. It preserves the voices of people whose stories rarely appear in textbooks or official records. The recordings become primary sources: direct, unfiltered testimony from people who were actually there.',
  },
  {
    id: 'quiz-oral-history-t2',
    entryId: 'entry-oral-history',
    difficultyTier: 2,
    question: 'In the 1930s, the Federal Writers\' Project interviewed over 2,300 formerly enslaved people. Why is this collection so historically valuable?',
    options: [
      'Because it is the oldest writing in the United States',
      'Because it provides irreplaceable first-person testimony from people who experienced slavery directly ΓÇö voices that would otherwise be completely absent from the historical record',
      'Because the interviews were conducted by famous authors',
      'Because it is the only record of what life was like in the 1930s',
    ],
    correctIndex: 1,
    explanation: 'The written historical record of American slavery was dominated by the accounts of enslavers, politicians, and journalists ΓÇö rarely the enslaved themselves. The Federal Writers\' Project interviews captured the direct words and memories of people who had lived through it: what they ate, how they were treated, what freedom felt like when it came. Without this oral history effort, those voices would have been permanently lost. Rami calls them "the Gallery\'s most valuable exhibits."',
  },
  {
    id: 'quiz-oral-history-t3',
    entryId: 'entry-oral-history',
    difficultyTier: 3,
    question: 'Many of Studs Terkel\'s interview subjects said "nobody ever asked me about my life before." What does this reveal about which lives are considered worth recording ΓÇö and why it matters?',
    options: [
      'That most people lead boring lives not worth recording',
      'That oral history is only valuable for famous people',
      'That the dominant historical record systematically excludes ordinary people ΓÇö and that this exclusion shapes what we understand about how societies actually work and who built them',
      'That Terkel was the only person who ever conducted interviews',
    ],
    correctIndex: 2,
    explanation: 'History written only from official records reflects the priorities of those who kept those records: governments, businesses, military institutions. The labour of a steelworker, the wisdom of a farmer, the daily reality of a waitress ΓÇö none of these appeared in official archives until someone thought to ask. Terkel\'s subjects wept sometimes, not because their lives were sad, but because being listened to felt like recognition. Oral history makes a political and moral argument: every life is historical evidence. Who we choose to record tells us who we think counts.',
  },

  // ΓöÇΓöÇΓöÇ entry-long-now-foundation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-long-now-foundation-t1',
    entryId: 'entry-long-now-foundation',
    difficultyTier: 1,
    question: 'What is the Long Now Foundation building inside a mountain in Texas?',
    options: [
      'A museum of American history',
      'A giant clock designed to tick for 10,000 years',
      'A library of every book ever written',
      'A time capsule for a future space mission',
    ],
    correctIndex: 1,
    explanation: 'The Clock of the Long Now is being built inside a mountain in West Texas. It is designed to tick once a year, chime once a century, and keep working for 10,000 years. Visitors have to physically climb to it and wind it themselves. The whole project asks a big question: what would you do differently if you thought about the next 10,000 years instead of just the next few years?',
  },
  {
    id: 'quiz-long-now-foundation-t2',
    entryId: 'entry-long-now-foundation',
    difficultyTier: 2,
    question: 'The Long Now Foundation uses five-digit years ΓÇö writing 02025 instead of 2025. Why?',
    options: [
      'To make the numbers look more impressive',
      'Because they ran out of space on the clock face',
      'To prevent a "Year 10,000 problem" ΓÇö ensuring that date systems still work correctly when years reach five digits',
      'Because five-digit years are easier to read from a distance',
    ],
    correctIndex: 2,
    explanation: 'Just as the year 2000 caused fears about a "Year 2000 problem" (computers that stored years as two digits), a clock meant to last until the year 10,000 faces a "Year 10,000 problem." By using five-digit years from the start (02025, 02100, 10000), the Long Now Foundation ensures its systems will never need to be patched for an extra digit. It is an example of designing for deep time: anticipating problems thousands of years in advance.',
  },
  {
    id: 'quiz-long-now-foundation-t3',
    entryId: 'entry-long-now-foundation',
    difficultyTier: 3,
    question: 'Danny Hillis designed the clock to challenge what he called "short-termism" ΓÇö our tendency to only think about the near future. Why might thinking in 10,000-year spans change how we make decisions today?',
    options: [
      'It wouldn\'t change anything because 10,000 years is too far away to think about',
      'It would make people give up because problems seem unsolvable over such long timescales',
      'Thinking across very long timescales forces us to consider the consequences of our actions for people who aren\'t born yet, making us more responsible stewards of the planet, knowledge, and institutions we inherit',
      'It would only matter for scientists, not for ordinary people',
    ],
    correctIndex: 2,
    explanation: 'Many of the largest problems facing humanity ΓÇö climate change, soil depletion, institutional decay ΓÇö unfold over timescales longer than a single human life. Short-term thinking (next quarter, next election) systematically underweights these slow-moving catastrophes. Hillis\'s clock is a provocation: what would you plant today if you knew it would not bloom for 500 years? What would you protect? What would you refuse to break? Rami calls this "the opposite of a stopwatch" ΓÇö a device not for measuring how fast things move, but for teaching us to think slow.',
  },
];
