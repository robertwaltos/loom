/**
 * Quiz Questions ΓÇö The Budget Kitchen (Priya Nair)
 * Economics / Budgeting / Resource Allocation
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const BUDGET_KITCHEN_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-ration-book ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-ration-book-t1',
    entryId: 'entry-ration-book',
    difficultyTier: 1,
    question: 'What was a ration book, and why did families in Britain use them during World War II?',
    options: [
      'A recipe book given to families to teach them to cook new foods',
      'A booklet of stamps giving each family their fair share of food, because ships needed for the war could not bring enough food for everyone',
      'A book that listed which shops were allowed to sell food during the war',
      'A reward book where children earned stamps by helping with chores',
    ],
    correctIndex: 1,
    explanation: 'During World War II, food became scarce in Britain because the ships that normally transported food were needed for military purposes. The government introduced rationing ΓÇö giving every family a booklet of stamps that could be exchanged for their fair share of bread, butter, meat, and sugar. Rich and poor received the same stamps. The ration book made budgeting essential: every family had to plan carefully to make enough food from a limited allowance.',
  },
  {
    id: 'quiz-ration-book-t2',
    entryId: 'entry-ration-book',
    difficultyTier: 2,
    question: 'British rationing did not end until 1954 ΓÇö nine years after the war. What does this timeline teach us about resource constraints?',
    options: [
      'That the British government was too lazy to organise food deliveries after the war',
      'That rebuilding supply chains and restoring abundance takes far longer than disrupting them ΓÇö and communities may need to budget carefully for years after a crisis ends',
      'That rationing was so successful that families preferred it to having unlimited food',
      'That food takes nine years to grow after a war destroys the crops',
    ],
    correctIndex: 1,
    explanation: 'The war ended in 1945 but rationing continued until 1954. Supply chains ΓÇö farms, shipping, factories ΓÇö take years to rebuild after disruption. An entire generation of British children grew up never knowing unrationed food. This teaches a practical lesson about resource management: the return to abundance after scarcity is slow and requires continued discipline. Budgeting is not only for emergencies ΓÇö it builds habits that matter in the long recovery too.',
  },
  {
    id: 'quiz-ration-book-t3',
    entryId: 'entry-ration-book',
    difficultyTier: 3,
    question: 'Wartime rationing recipe books are celebrated today for their culinary creativity. Why would having fewer ingredients lead to more inventive cooking?',
    options: [
      'Because people were happier during the war and happiness makes people creative',
      'Because constraints force creative problem-solving ΓÇö with limited options, cooks had to find new techniques, combinations, and substitutions rather than falling back on familiar easy choices',
      'Because chefs from France moved to Britain during the war and taught people new recipes',
      'Because rationed ingredients were of higher quality than normal ingredients',
    ],
    correctIndex: 1,
    explanation: 'Constraints are a powerful engine of creativity. When you cannot fall back on familiar, abundant options, you are forced to think differently ΓÇö to find substitutions, combinations, and techniques you would never have tried otherwise. This is true in cooking, design, engineering, and business. The British wartime kitchen is one of history\'s best demonstrations that scarcity, properly managed, can produce innovation rather than just deprivation.',
  },

  // ΓöÇΓöÇΓöÇ entry-yunus-microfinance ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-yunus-t1',
    entryId: 'entry-yunus-microfinance',
    difficultyTier: 1,
    question: 'How much money did Muhammad Yunus lend to 42 basket-weavers to start his microfinance experiment?',
    options: [
      '$27,000',
      '$2,700',
      '$27',
      '$270',
    ],
    correctIndex: 2,
    explanation: 'In 1974, Yunus lent $27 ΓÇö divided among 42 basket-weavers in Bangladesh ΓÇö so they could buy their own materials instead of depending on suppliers who kept them in debt. The weavers made baskets, sold them, and paid back the loan with interest. That $27 sparked the global microfinance movement, eventually reaching hundreds of millions of people in over 100 countries.',
  },
  {
    id: 'quiz-yunus-t2',
    entryId: 'entry-yunus-microfinance',
    difficultyTier: 2,
    question: 'Traditional banks refused to lend to poor people because they had no collateral. Yunus\'s Grameen Bank proved this refusal was wrong. Why?',
    options: [
      'Because poor people always have relatives who can act as guarantors for any loan',
      'Because poor borrowers repaid their loans at higher rates than wealthy borrowers ΓÇö showing the refusal was based on prejudice, not actual risk data',
      'Because Grameen Bank charged much higher interest rates that made small loans profitable regardless of risk',
      'Because the Bangladeshi government guaranteed all Grameen Bank loans',
    ],
    correctIndex: 1,
    explanation: 'Yunus discovered that poor people repaid their loans at higher rates than wealthy borrowers ΓÇö often over 97% repayment rates. The banking system\'s refusal to lend to the poor was based on assumption and discrimination, not on evidence. Yunus won the Nobel Peace Prize in 2006 for demonstrating that financial exclusion was a systems failure, not a character flaw in poor people.',
  },
  {
    id: 'quiz-yunus-t3',
    entryId: 'entry-yunus-microfinance',
    difficultyTier: 3,
    question: 'Yunus said: "Poor people are bonsai people. There is nothing wrong with their seeds. Only the pot is too small." What does this metaphor reveal about poverty?',
    options: [
      'That poor people need to move to bigger cities to reach their potential',
      'That poverty is an environmental constraint, not an inherent limitation of the people experiencing it ΓÇö given the right conditions, the same person can grow much larger',
      'That trees are a better investment than businesses for poor communities',
      'That poor people should be given more space to live in',
    ],
    correctIndex: 1,
    explanation: 'The bonsai metaphor captures one of the most important insights in development economics: people born into poverty are not less capable ΓÇö they are growing in environments that constrain them. The bonsai is genetically identical to a full-sized tree; the only difference is the pot. Remove the constraint (in Yunus\'s case, access to credit) and the same person can grow to their full potential. This reframes the question from "what is wrong with poor people?" to "what is wrong with the systems they operate in?"',
  },

  // ΓöÇΓöÇΓöÇ entry-opportunity-cost ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-opportunity-cost-t1',
    entryId: 'entry-opportunity-cost',
    difficultyTier: 1,
    question: 'You spend your pocket money on a book. What is your "opportunity cost"?',
    options: [
      'The price printed on the back of the book',
      'Whatever else you could have bought with that same money ΓÇö the thing you gave up',
      'The time it takes to read the book',
      'The cost of replacing the book if you lose it',
    ],
    correctIndex: 1,
    explanation: 'Opportunity cost is the value of the best thing you give up when you make a choice. Every decision closes other doors. Priya asks not just "can I afford this?" but "what am I giving up?" If the pocket money could have bought a toy you wanted more, the opportunity cost of the book is that toy. Thinking about opportunity cost is what separates impulsive spending from wise budgeting.',
  },
  {
    id: 'quiz-opportunity-cost-t2',
    entryId: 'entry-opportunity-cost',
    difficultyTier: 2,
    question: 'Opportunity cost applies to time, not just money. If you spend an hour watching a video, what is the opportunity cost?',
    options: [
      'The cost of the internet connection used to watch it',
      'Whatever you could have done with that hour instead ΓÇö reading, practising a skill, spending time with friends',
      'The electricity used by the device',
      'The time it would take to watch the video again',
    ],
    correctIndex: 1,
    explanation: 'Every hour you spend doing one thing is an hour you cannot spend doing something else. The opportunity cost of an hour watching a video is whatever the most valuable alternative use of that hour would have been. This applies to attention and energy too ΓÇö every "yes" is a silent "no" to everything else you could have done with those resources. Good budget thinking recognises these invisible costs, not just visible prices.',
  },
  {
    id: 'quiz-opportunity-cost-t3',
    entryId: 'entry-opportunity-cost',
    difficultyTier: 3,
    question: 'Nobel Prize-winning economist Richard Thaler showed that people are naturally bad at calculating opportunity cost. Why does this matter for everyday financial decisions?',
    options: [
      'It means economic theory is useless in real life because humans are irrational',
      'It means people focus on the visible price of what they are buying and ignore the invisible cost of what they are giving up ΓÇö leading to spending choices they later regret',
      'It means Nobel Prize winners cannot make good personal financial decisions',
      'It means computers should make all spending decisions because humans are too flawed',
    ],
    correctIndex: 1,
    explanation: 'Thaler\'s research showed that humans systematically underweight opportunity costs compared to explicit prices. When you see a price tag, that number is vivid and concrete. The value of what you are giving up is invisible and abstract. This cognitive gap leads people to overspend ΓÇö they evaluate the purchase in isolation rather than comparing it to alternatives. Priya\'s Kitchen is practice in making the invisible visible: every choice displayed alongside what it costs you in terms of the alternatives you are forgoing.',
  },

  // ΓöÇΓöÇΓöÇ entry-spice-trade-kitchens ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-spice-trade-t1',
    entryId: 'entry-spice-trade-kitchens',
    difficultyTier: 1,
    question: 'Before global trade connected continents, what could cooks only use in their kitchens?',
    options: [
      'Only ingredients that had been invented by scientists in their country',
      'Only ingredients that grew near them ΓÇö whatever was available locally',
      'Only ingredients that the king approved of',
      'Only ingredients that could survive being frozen',
    ],
    correctIndex: 1,
    explanation: 'Before trading ships connected continents, every kitchen was limited to local ingredients. There were no tomatoes in Italian cooking, no chilli in Indian food, no potatoes in Ireland ΓÇö because these plants all came from the Americas, thousands of miles away. The world\'s kitchens were transformed by trade routes that moved seeds, plants, and knowledge between continents.',
  },
  {
    id: 'quiz-spice-trade-t2',
    entryId: 'entry-spice-trade-kitchens',
    difficultyTier: 2,
    question: 'The Columbian Exchange transferred foods from the Americas to the rest of the world after 1492. Which of the following would NOT have existed in European or Asian cooking before this exchange?',
    options: [
      'Bread, because wheat has always grown in Europe',
      'Tomato-based pasta sauce, because tomatoes came from the Americas',
      'Rice dishes, because rice has always grown in Asia',
      'Olive oil, because olives have always grown around the Mediterranean',
    ],
    correctIndex: 1,
    explanation: 'Tomatoes are native to the Americas. They did not reach Italy until after European contact with the New World ΓÇö meaning the most iconic Italian dish (pasta with tomato sauce) did not exist before the 1600s at the earliest. Half of the world\'s most important food crops today ΓÇö potatoes, tomatoes, maize, cacao, peppers ΓÇö originated in the Americas. Every kitchen in the world was changed by this exchange.',
  },
  {
    id: 'quiz-spice-trade-t3',
    entryId: 'entry-spice-trade-kitchens',
    difficultyTier: 3,
    question: 'The Columbian Exchange transformed every kitchen on Earth ΓÇö but it also came with devastating costs. What were those costs, and why does Priya teach about them?',
    options: [
      'Some spices were very expensive and poorer families could not afford them',
      'European diseases introduced alongside the new foods killed up to 90% of Indigenous Americans ΓÇö the exchange that enriched some kitchens devastated entire civilisations',
      'The ships that carried spices sometimes sank, making the ingredients unreliable',
      'Many of the new plants did not grow well in European soil and most attempts failed',
    ],
    correctIndex: 1,
    explanation: 'The same ships and trade routes that carried tomatoes to Italy and potatoes to Ireland also carried European diseases to which Indigenous Americans had no immunity. Up to 90% of the Indigenous population of the Americas died in the century after contact ΓÇö one of the greatest demographic catastrophes in human history. Every ingredient has a history, and that history is often complex. Priya teaches that understanding where your food comes from includes understanding the full story, not just the delicious part.',
  },
];
