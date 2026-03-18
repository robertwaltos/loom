/**
 * Quiz Questions ΓÇö Code Canyon (Pixel)
 * Coding / Logic
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const CODE_CANYON_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-hamilton-apollo-software ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-hamilton-t1',
    entryId: 'entry-hamilton-apollo-software',
    difficultyTier: 1,
    question: 'What did Margaret Hamilton do that helped land humans on the Moon?',
    options: [
      'She designed the rocket engines that lifted the spacecraft',
      'She wrote the software that guided the Apollo spacecraft ΓÇö and her error-handling code saved the landing when a computer alarm fired',
      'She calculated the route to the Moon using a hand calculator',
      'She trained the astronauts in emergency procedures',
    ],
    correctIndex: 1,
    explanation: 'Margaret Hamilton led the team at MIT that wrote the guidance software for the Apollo missions. During Apollo 11\'s final descent to the Moon, the computer triggered error alarms. Hamilton\'s software had been built to handle exactly this ΓÇö it automatically dropped lower-priority tasks and kept the critical landing program running. Her code saved the mission.',
  },
  {
    id: 'quiz-hamilton-t2',
    entryId: 'entry-hamilton-apollo-software',
    difficultyTier: 2,
    question: 'Hamilton insisted on building error-handling into the Apollo software, even though other engineers thought it was unnecessary. Why did this turn out to be the right decision?',
    options: [
      'The error handling made the program run faster',
      'During the actual Moon landing, the computer triggered 1202 alarms due to hardware errors ΓÇö and Hamilton\'s error-handling system automatically responded and saved the landing',
      'NASA\'s testing rules required error handling to be included by law',
      'The error handling caught a programming mistake that Hamilton\'s team had made',
    ],
    correctIndex: 1,
    explanation: 'A hardware switch left in the wrong position caused the Apollo 11 computer to be overloaded with tasks during the landing. It triggered overflow alarms. Hamilton\'s asynchronous priority scheduling ΓÇö which many had considered unnecessary ΓÇö automatically shed the less important tasks so the critical landing program could continue. Without that foresight, the mission would likely have been aborted.',
  },
  {
    id: 'quiz-hamilton-t3',
    entryId: 'entry-hamilton-apollo-software',
    difficultyTier: 3,
    question: 'Hamilton coined the term "software engineering" to gain respect for her discipline. What does this tell us about how new fields of knowledge establish themselves?',
    options: [
      'New fields need catchy names to attract funding and public attention',
      'Naming a discipline as engineering signalled that software required the same rigour, systematic methods, and professional standards as mechanical or electrical engineering ΓÇö helping establish it as a serious technical field',
      'Hamilton wanted to be considered an engineer rather than a programmer because engineers earned more money',
      'The term was invented to help non-technical managers understand what software teams did',
    ],
    correctIndex: 1,
    explanation: 'In the 1960s, software was considered a lesser endeavour ΓÇö something programmers did, not a rigorous engineering discipline. Hamilton saw that writing reliable software for spacecraft required the same systematic thinking, mathematical rigour, and professional accountability as any other engineering field. By naming it "software engineering," she made a claim about what it deserved to be taken as seriously as. The discipline that now underlies every digital system in the world owes its professional identity partly to that naming.',
  },

  // ΓöÇΓöÇΓöÇ entry-spacewar-first-game ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-spacewar-t1',
    entryId: 'entry-spacewar-first-game',
    difficultyTier: 1,
    question: 'Where and when was Spacewar! ΓÇö considered one of the first real video games ΓÇö created?',
    options: [
      'In a garage in California in 1975',
      'At MIT in 1962, on a computer the size of a large refrigerator',
      'In Japan in 1978, as an arcade machine',
      'At NASA in 1969, during the Moon landing year',
    ],
    correctIndex: 1,
    explanation: 'Spacewar! was created by Steve Russell and his colleagues at MIT in 1962 on a PDP-1 computer the size of a large refrigerator. Two spaceships fought near a star with real simulated gravity. The entire video game industry ΓÇö now larger than film and music combined ΓÇö traces back to this student project.',
  },
  {
    id: 'quiz-spacewar-t2',
    entryId: 'entry-spacewar-first-game',
    difficultyTier: 2,
    question: 'Spacewar! was never sold ΓÇö it was shared freely among universities. What does this reveal about how important technologies can begin?',
    options: [
      'Games have never been commercially valuable, which is why it was given away',
      'One of the most influential technologies in history began as a freely shared creative project ΓÇö not a commercial product ΓÇö showing that open sharing can have enormous unintended consequences',
      'Universities owned all software at the time and sharing was required by law',
      'The game was too simple to sell, so giving it away was the only option',
    ],
    correctIndex: 1,
    explanation: 'Russell and his colleagues just wanted to make something fun on the university\'s new computer. They gave Spacewar! away freely because sharing felt natural in academic culture. From that single freely-shared project, an entire global industry developed. This is one of history\'s clearest examples of how open sharing ΓÇö rather than commercial protection ΓÇö can produce enormous cultural and economic consequences nobody anticipated.',
  },
  {
    id: 'quiz-spacewar-t3',
    entryId: 'entry-spacewar-first-game',
    difficultyTier: 3,
    question: 'Spacewar! used real Newtonian gravity calculations and accurate star charts. Why would student programmers go to that level of scientific accuracy in a fun game?',
    options: [
      'They had to because NASA required all computer programs to be scientifically accurate',
      'They were MIT students in a computing culture where technical elegance and real-world accuracy were valued ΓÇö making the physics "work correctly" was as important as making the game fun',
      'They were trying to train pilots who needed accurate physics simulations',
      'It was easier to use real physics equations than to invent made-up ones',
    ],
    correctIndex: 1,
    explanation: 'The MIT computing culture of 1962 prized technical craftsmanship ΓÇö doing something with the machine that was impressive and correct, not just approximately right. Including real Newtonian gravity and authentic star positions was part of the ethos: if you were going to simulate something, simulate it properly. This culture of technical rigour embedded in creative work is one thread in the DNA of the software industry that grew from this moment.',
  },

  // ΓöÇΓöÇΓöÇ entry-eniac-programmers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-eniac-t1',
    entryId: 'entry-eniac-programmers',
    difficultyTier: 1,
    question: 'How many women programmed ENIAC, the first general-purpose computer?',
    options: [
      'One woman, who trained all the others',
      'Six women ΓÇö Kay McNulty, Betty Jennings, Betty Snyder, Marlyn Meltzer, Fran Bilas, and Ruth Lichterman',
      'About 30 women in a large programming department',
      'No women ΓÇö ENIAC was programmed entirely by male engineers',
    ],
    correctIndex: 1,
    explanation: 'Six women programmed ENIAC entirely from scratch with no instruction manuals ΓÇö because none existed yet. They invented fundamental programming techniques ΓÇö subroutines, breakpoints, and nesting ΓÇö that are still used in every programming language today. Their names are Kay McNulty, Betty Jennings, Betty Snyder, Marlyn Meltzer, Fran Bilas, and Ruth Lichterman.',
  },
  {
    id: 'quiz-eniac-t2',
    entryId: 'entry-eniac-programmers',
    difficultyTier: 2,
    question: 'Programming ENIAC involved physically rewiring cables ΓÇö there was no keyboard or screen. What does this tell us about what "programming" meant in 1945?',
    options: [
      'Programming was a simple job that anyone could do quickly',
      'In 1945, programming meant manually connecting physical wires and switches to define the sequence of operations ΓÇö requiring deep understanding of the machine\'s hardware and mathematical logic simultaneously',
      'The women didn\'t really program ΓÇö they just helped with maintenance',
      'Early computers were programmed using punched cards, just like later machines',
    ],
    correctIndex: 1,
    explanation: 'ENIAC had no software in the modern sense. Programming it meant reconnecting hundreds of cables and switches to route electrical signals through the correct calculation steps in the correct order. The ENIAC programmers had to understand both the mathematical problem they were solving and the physical hardware they were using to solve it. The intellectual work was immense ΓÇö and they developed techniques that became the foundation of all programming that followed.',
  },
  {
    id: 'quiz-eniac-t3',
    entryId: 'entry-eniac-programmers',
    difficultyTier: 3,
    question: 'The ENIAC programmers\' contributions were forgotten for decades ΓÇö they were sometimes mistaken for "models" in photographs with the machine. What does this erasure reveal about how computing history was written?',
    options: [
      'The women chose not to publicise their work because they valued privacy',
      'Historical accounts were shaped by existing biases ΓÇö crediting the hardware engineers and overlooking the software pioneers, who happened to be women ΓÇö and recovering erased history requires deliberate effort',
      'The women\'s work was less important than the hardware design, which is why it was not recorded',
      'Programming in 1945 was not considered a technical achievement worth recording',
    ],
    correctIndex: 1,
    explanation: 'Historian Kathy Kleiman began researching the ENIAC programmers in the 1980s and found that their contributions had been systematically overlooked. When people assumed the women were models ΓÇö not operators ΓÇö and focused credit on the hardware engineers who built the machine, they wrote a partial story. Recovering erased contributors requires actively looking for who else was in the room, whose name was left off the report, whose photograph was misidentified. History is not automatically complete.',
  },

  // ΓöÇΓöÇΓöÇ entry-y2k-bug ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-y2k-t1',
    entryId: 'entry-y2k-bug',
    difficultyTier: 1,
    question: 'Why did old computers have a problem with the year 2000?',
    options: [
      'Computers in the 1980s were not designed to run for more than 20 years',
      'Old computers stored years using only two digits ΓÇö so the year 2000 would look the same as 1900 to those systems',
      'Internet connections were too slow to handle the year 2000 date change',
      'The calendar changed in the year 2000 and old computers could not read the new format',
    ],
    correctIndex: 1,
    explanation: 'Early computers stored years as two digits to save expensive memory ΓÇö "1985" became "85" and "1999" became "99." When 2000 arrived, "00" could be misread as 1900, potentially causing financial, utility, and military systems to malfunction. Programmers around the world worked together in the years before 2000 to find and fix every instance of this two-digit date problem.',
  },
  {
    id: 'quiz-y2k-t2',
    entryId: 'entry-y2k-bug',
    difficultyTier: 2,
    question: 'The Y2K transition was largely uneventful. Some people said this proved the problem was exaggerated. What do most programmers argue instead?',
    options: [
      'The programmers were right ΓÇö the problem was exaggerated',
      'The transition was uneventful precisely because the problem was taken seriously and fixed ΓÇö the lack of disaster was the success, not evidence that nothing was ever at risk',
      'Most computers were too old to be affected anyway',
      'The problem would only have affected a small number of banking systems',
    ],
    correctIndex: 1,
    explanation: 'Over $300 billion was spent globally checking and correcting an estimated 3 billion lines of code before January 1, 2000. When the day arrived without catastrophe, some argued the panic was overblown. But programmers point out that preparedness is exactly what made the outcome safe. A fire drill that succeeds without a fire is not evidence the drill was unnecessary.',
  },
  {
    id: 'quiz-y2k-t3',
    entryId: 'entry-y2k-bug',
    difficultyTier: 3,
    question: 'Y2K arose because programmers in the 1960s and 70s made a small decision ΓÇö storing years as two digits ΓÇö that caused a global crisis 30 years later. What does this teach about technical debt?',
    options: [
      'Past programmers were careless and should have thought further ahead',
      'Small technical shortcuts made under genuine constraints can accumulate into massive future problems ΓÇö design decisions carry hidden long-term costs that may not become visible for decades',
      'Software should never use abbreviations or shortcuts of any kind',
      'Y2K shows that computer systems should be replaced every 10 years to avoid old problems',
    ],
    correctIndex: 1,
    explanation: 'In the 1960s, computer memory was so expensive that saving two digits per date record genuinely mattered. The programmers who made that choice were not being reckless ΓÇö they were working with real constraints. But those choices accumulated across millions of programs over 30 years into a crisis that cost $300 billion to fix. Technical debt is the accumulation of small "good enough" decisions that must eventually be repaid. Y2K is its most dramatic demonstration.',
  },
];
