/**
 * Quiz Questions ΓÇö Data Stream (Yuki)
 * Data Science / Sorting & Graphing
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const DATA_STREAM_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-nightingale-rose-chart ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-nightingale-t1',
    entryId: 'entry-nightingale-rose-chart',
    difficultyTier: 1,
    question: 'What did Florence Nightingale\'s circular diagram show that changed how governments ran hospitals?',
    options: [
      'That nurses needed better training to treat battle wounds',
      'That most soldiers were dying from dirty hospital conditions ΓÇö not from battle wounds ΓÇö and that this could be fixed',
      'That more doctors were needed in army hospitals',
      'That hospitals needed to be built closer to battlefields',
    ],
    correctIndex: 1,
    explanation: 'Nightingale\'s "coxcomb" polar area diagram showed that out of 18,000 British soldiers who died in the Crimean War, 16,000 died from preventable diseases caused by dirty conditions ΓÇö not from combat wounds. The diagram made this ratio impossible to ignore. The government changed hospital sanitation practices as a direct result of her visualisation.',
  },
  {
    id: 'quiz-nightingale-t2',
    entryId: 'entry-nightingale-rose-chart',
    difficultyTier: 2,
    question: 'Nightingale was a statistician and nurse. Why did she present her data as a diagram rather than just a table of numbers?',
    options: [
      'She was not confident in her ability to write clear reports',
      'She understood that politicians who would not read statistics would look at a compelling visual image ΓÇö she designed the diagram as a tool for persuasion, not just information',
      'Tables of numbers were not yet common in 19th-century scientific reports',
      'Her data was too complicated to express in a numerical table',
    ],
    correctIndex: 1,
    explanation: 'Nightingale knew her audience: politicians and military officers who were busy and resistant to statistics. She created a diagram that made the inequality between disease deaths and combat deaths visually undeniable at a single glance. She was not just reporting data ΓÇö she was designing a persuasion tool. This insight ΓÇö that how you present data matters as much as the data itself ΓÇö is now central to data journalism, public health communication, and policy advocacy.',
  },
  {
    id: 'quiz-nightingale-t3',
    entryId: 'entry-nightingale-rose-chart',
    difficultyTier: 3,
    question: 'Nightingale effectively invented "data as advocacy" ΓÇö using visualisation to drive policy change. Why is this a more complex skill than simply analysing data accurately?',
    options: [
      'Advocacy requires scientists to exaggerate their results to be persuasive',
      'Data advocacy requires understanding not just what the data shows but who needs to act on it, what will motivate them, and how to present evidence so it is impossible to ignore ΓÇö combining scientific rigour with communication design and persuasion',
      'Nightingale\'s approach is no longer relevant because modern governments read statistics directly',
      'Data advocacy is not a legitimate scientific activity',
    ],
    correctIndex: 1,
    explanation: 'Accurate analysis is only the beginning. Nightingale had to understand her audience\'s biases, limitations, and resistance. She had to choose the right visual form to make the pattern undeniable. And she had to connect the data to a clear action the decision-makers could take. This combination of evidence, communication, and persuasion design is the full practice of data advocacy ΓÇö and it is as important today in public health, climate science, and journalism as it was in 1858.',
  },

  // ΓöÇΓöÇΓöÇ entry-snow-cholera-map ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-snow-t1',
    entryId: 'entry-snow-cholera-map',
    difficultyTier: 1,
    question: 'How did Dr. John Snow figure out that one water pump was causing cholera deaths in 1854 London?',
    options: [
      'He tested the water from every pump in the city in a laboratory',
      'He mapped every cholera death on a street map and noticed they all clustered around one pump on Broad Street',
      'A sick patient told him they had drunk from the Broad Street pump',
      'He followed a water pipe from the pump to the source of an underground stream',
    ],
    correctIndex: 1,
    explanation: 'Snow drew a map of London streets and marked a dot at every address where someone had died of cholera. When he looked at the pattern, the deaths clustered unmistakably around one water pump on Broad Street. He had no laboratory test ΓÇö just pattern recognition in spatial data. He persuaded the council to remove the pump handle, and the deaths stopped.',
  },
  {
    id: 'quiz-snow-t2',
    entryId: 'entry-snow-cholera-map',
    difficultyTier: 2,
    question: 'After the Broad Street outbreak ended, the pump handle was put back. Authorities still didn\'t accept Snow\'s explanation. Why might they have resisted his evidence?',
    options: [
      'Snow had made errors in his map that undermined his conclusion',
      'Germ theory ΓÇö the idea that invisible microbes cause disease ΓÇö was not yet accepted, so the idea of contaminated water causing disease through germs seemed implausible',
      'The council believed cholera could only spread through the air',
      'Snow\'s map showed deaths near two pumps equally, so his evidence was ambiguous',
    ],
    correctIndex: 1,
    explanation: 'In 1854, germ theory had not yet been accepted. The dominant theory was "miasma" ΓÇö that disease spread through bad-smelling air. Snow\'s conclusion that a single water source was spreading an invisible pathogen through a whole neighbourhood required accepting a framework that did not yet exist. His spatial analysis was correct, but the intellectual tools to fully accept and explain it arrived 15 years later with Louis Pasteur and Robert Koch.',
  },
  {
    id: 'quiz-snow-t3',
    entryId: 'entry-snow-cholera-map',
    difficultyTier: 3,
    question: 'Snow found the pattern before anyone understood the cause. He stopped the outbreak by acting on the pattern alone. What does this reveal about the role of data analysis in public health?',
    options: [
      'Data analysis is only useful after the scientific cause is understood',
      'Identifying spatial patterns in data can enable effective intervention even before the underlying mechanism is understood ΓÇö the map was actionable before germ theory existed',
      'Snow got lucky ΓÇö without germ theory his intervention was not based on real science',
      'Public health decisions should always wait for complete scientific understanding before acting',
    ],
    correctIndex: 1,
    explanation: 'Snow acted on pattern recognition in data without a complete causal explanation. This is a profound lesson for data science and public health: you do not always need to understand why a pattern exists to act usefully on it. The pattern ΓÇö deaths clustering at the pump ΓÇö was real and actionable. Removing the handle saved lives. The mechanistic explanation (Vibrio cholerae in the water) came later and confirmed what the data had already indicated. Pattern first, mechanism second, is often how epidemiology works.',
  },

  // ΓöÇΓöÇΓöÇ entry-rosling-bubble-chart ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-rosling-t1',
    entryId: 'entry-rosling-bubble-chart',
    difficultyTier: 1,
    question: 'What did Hans Rosling\'s animated bubble charts show that surprised audiences?',
    options: [
      'That rich countries are getting richer while poor countries stay the same',
      'That the world had changed dramatically ΓÇö most countries had improved their health and wealth significantly ΓÇö but most people\'s mental models of the world were decades out of date',
      'That population growth had stopped in most countries by 2006',
      'That geographic location determines how wealthy a country becomes',
    ],
    correctIndex: 1,
    explanation: 'Rosling animated 200 years of health and income data for every country. Audiences gasped as they watched bubbles representing countries move across the chart over time ΓÇö showing that the world of 2006 was dramatically different from the world most people imagined. Countries they thought were "poor and sick" had become much healthier and wealthier. His charts revealed the gap between people\'s outdated mental models and current reality.',
  },
  {
    id: 'quiz-rosling-t2',
    entryId: 'entry-rosling-bubble-chart',
    difficultyTier: 2,
    question: 'Rosling found that university students scored worse than random chance on global development questions. How is it possible to score worse than random chance?',
    options: [
      'University students were deliberately trying to give wrong answers',
      'When the wrong answer corresponds to an outdated but widely held belief, well-educated people systematically choose it ΓÇö confirming a mental model rather than working from current data',
      'The questions were unfair and designed to trick students',
      'Random chance only applies to multiple-choice tests with exactly two options',
    ],
    correctIndex: 1,
    explanation: 'If you guessed randomly on every question, you would be right about as often as chance allows. Scoring below chance means you are systematically choosing wrong answers ΓÇö not randomly, but predictably. Rosling\'s students consistently chose answers that matched the world of 30ΓÇô40 years ago. Their confidence in outdated information was worse than ignorance. This is "factlessness" ΓÇö using an old picture of the world to answer questions about the current one.',
  },
  {
    id: 'quiz-rosling-t3',
    entryId: 'entry-rosling-bubble-chart',
    difficultyTier: 3,
    question: 'Rosling said "the world cannot be understood without numbers. And it cannot be understood with numbers alone." What did he mean by the second half of that statement?',
    options: [
      'Words are more reliable than numbers for understanding global events',
      'Numbers require context, story, and careful visualisation to be understood correctly ΓÇö raw data can mislead just as easily as no data if it is presented without the right framing',
      'Only animated visualisations can communicate data accurately',
      'Numbers should always be combined with emotional stories to be persuasive',
    ],
    correctIndex: 1,
    explanation: 'Rosling spent his career arguing against both "data-free worldviews" and "data dumps." Raw numbers without context ΓÇö which countries, over what time period, measuring what ΓÇö can support almost any conclusion. His bubble charts worked because they embedded numbers in time, geography, and human scale: each bubble was a country, its position meant something, its movement told a story. Data must be contextualised to be genuinely understood rather than just cited.',
  },

  // ΓöÇΓöÇΓöÇ entry-misinformation-epidemic ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-misinformation-t1',
    entryId: 'entry-misinformation-epidemic',
    difficultyTier: 1,
    question: 'Yuki teaches three questions to help protect you from false information. What are the three questions?',
    options: [
      'Who wrote it? When was it published? Is it on the internet?',
      'Where did this number come from? How was it measured? Who benefits if you believe it?',
      'Is it on a government website? Does it have a graph? Did a scientist say it?',
      'Is it on TV? Does it have a lot of views? Has anyone argued against it?',
    ],
    correctIndex: 1,
    explanation: 'Yuki\'s three protective questions are: Where did this number come from? (source), How was it measured? (methodology), and Who benefits if you believe it? (motivated reasoning). These questions work together to reveal whether information is reliable before you repeat or act on it. They are portable ΓÇö applicable to any claim in any subject.',
  },
  {
    id: 'quiz-misinformation-t2',
    entryId: 'entry-misinformation-epidemic',
    difficultyTier: 2,
    question: 'MIT researchers found that false news spreads six times faster than true news on social networks. Why does false news spread faster?',
    options: [
      'Social media algorithms are deliberately designed to promote false content',
      'False news tends to be more novel and emotionally surprising ΓÇö people share things that feel new and exciting, and false stories are often more dramatic than accurate ones',
      'True news is written in a complicated style that most people find hard to share',
      'People prefer to share false news because it gets more reactions from friends',
    ],
    correctIndex: 1,
    explanation: 'The MIT study (Vosoughi et al., 2018) found that novelty and emotional arousal drive sharing behaviour. True news is often incremental updates to ongoing stories. False news tends to be surprising, dramatic, and emotionally engaging ΓÇö it triggers the sharing impulse more strongly. This is not a deliberate choice by most sharers ΓÇö it is how human attention responds to novelty. Understanding this bias helps you pause before amplifying something that feels particularly striking.',
  },
  {
    id: 'quiz-misinformation-t3',
    entryId: 'entry-misinformation-epidemic',
    difficultyTier: 3,
    question: 'Misinformation spreads through social networks following the same mathematical models as infectious disease. What does this analogy suggest about how to address it?',
    options: [
      'The only solution is to remove all false content before it can spread',
      'Like disease, misinformation spreads through contact and can be slowed by individual resistance ΓÇö building critical thinking skills in enough people creates a kind of "herd immunity" against viral falsehoods',
      'Misinformation can be eliminated completely if social media companies apply strict rules',
      'The spread of misinformation will naturally stop as people become more educated',
    ],
    correctIndex: 1,
    explanation: 'Epidemiology shows that you cannot contain a disease outbreak by treatment alone ΓÇö prevention through immunity in the population is more effective. Applied to misinformation: if enough individuals develop robust critical thinking skills ΓÇö source evaluation, methodology checking, awareness of motivated reasoning ΓÇö false claims find fewer hosts to spread through. This "prebunking" approach, building resistance before exposure rather than correcting after the fact, is one of the most evidence-supported strategies for fighting misinformation. The antidote is not cynicism ΓÇö it is methodology.',
  },
];
