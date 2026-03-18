/**
 * Quiz Questions ΓÇö Job Fair (Babatunde Afolabi)
 * Economics / Careers / Work / Labour Rights
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const JOB_FAIR_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-adam-smith-pin-factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-pin-factory-t1',
    entryId: 'entry-adam-smith-pin-factory',
    difficultyTier: 1,
    question: 'Adam Smith visited a pin factory and made an amazing discovery. What did he find?',
    options: [
      'That machines could replace all the workers',
      'That one worker alone made about 20 pins per day, but ten workers each doing one small step together made 48,000 pins per day',
      'That pins were much more expensive to make than anyone realised',
      'That pin factories were dangerous and should be shut down',
    ],
    correctIndex: 1,
    explanation: 'Smith observed that when each of ten workers specialised in one small step of the pin-making process, they together produced 48,000 pins per day ΓÇö 240 times more than one worker doing every step alone. This division of labour became the foundation of modern economics. Specialisation dramatically multiplies productivity by letting each person become expert at their one step.',
  },
  {
    id: 'quiz-pin-factory-t2',
    entryId: 'entry-adam-smith-pin-factory',
    difficultyTier: 2,
    question: 'Smith celebrated the productivity gains from specialisation, but he also warned of costs. What was his warning?',
    options: [
      'That workers in specialised factories earn too much money',
      'That doing one tiny task repeatedly all day could make workers mentally dulled and disconnected from the meaning of their work',
      'That factories would put small craftsmen out of business immediately',
      'That specialised workers become too expensive to hire after gaining expertise',
    ],
    correctIndex: 1,
    explanation: 'In The Wealth of Nations, Smith wrote that the worker performing one small task all day "generally becomes as stupid and ignorant as it is possible for a human creature to become." He recognised that extreme specialisation ΓÇö while enormously productive ΓÇö could harm the intellectual and social development of the workers doing the specialised tasks. He advocated for public education as a counterbalance. Babatunde teaches both the efficiency and the human cost, because the fair has to acknowledge both.',
  },
  {
    id: 'quiz-pin-factory-t3',
    entryId: 'entry-adam-smith-pin-factory',
    difficultyTier: 3,
    question: 'Smith\'s pin factory workers knew their step but not the full product. Modern workers in large organisations often experience the same thing. Why does this matter for how people find meaning in their work?',
    options: [
      'It does not matter ΓÇö people should find meaning in their pay, not their work',
      'When workers cannot see how their small task connects to a meaningful outcome, work can become purely mechanical ΓÇö leading to disengagement that harms both workers and the organisations they work for',
      'Modern workers should only take jobs where they do every step of a process alone',
      'Meaning in work is a modern invention that workers in Smith\'s time never sought',
    ],
    correctIndex: 1,
    explanation: 'Research in organisational psychology consistently shows that workers who understand how their work connects to a meaningful outcome are more engaged, more productive, and less likely to leave their jobs than those who see only their isolated task. Smith\'s 250-year-old observation anticipates modern debates about alienation, job design, and purpose at work. The challenge for organisations is to capture the efficiency gains of specialisation while preserving enough connection to the whole to keep workers engaged and fulfilled.',
  },

  // ΓöÇΓöÇΓöÇ entry-child-labour-laws ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-child-labour-t1',
    entryId: 'entry-child-labour-laws',
    difficultyTier: 1,
    question: 'Before child labour laws, children as young as five worked in factories and mines. Why was this dangerous for them?',
    options: [
      'Because children do not know how to count money and could be underpaid',
      'Because factory and mine work was physically dangerous, and children could not go to school to get an education',
      'Because children worked too slowly and made factories less efficient',
      'Because parents wanted to keep children at home to help with cooking',
    ],
    correctIndex: 1,
    explanation: 'Children as young as five worked in textile mills, coal mines, and as chimney sweeps ΓÇö in dangerous conditions with long hours and no safety protections. They could not attend school, so they had no chance to learn to read or gain skills for anything beyond physical labour. Chimney sweeps as young as four were lowered into chimneys because they were small enough to fit, with some getting stuck. It took decades of campaigning to change these conditions.',
  },
  {
    id: 'quiz-child-labour-t2',
    entryId: 'entry-child-labour-laws',
    difficultyTier: 2,
    question: 'Lord Shaftesbury spent decades campaigning for child labour reform before the 1833 Factory Act passed. Why did it take so long to ban something that seems obviously wrong?',
    options: [
      'Because most people did not know that child labour was happening',
      'Because factory owners had significant political power and economic interests in keeping child labour ΓÇö change required sustained campaigning to overcome those interests',
      'Because children preferred working to going to school',
      'Because the technology for adult-only factories did not exist until 1833',
    ],
    correctIndex: 1,
    explanation: 'Factory owners employed children specifically because they were cheaper and easier to control than adults. They had lobbying power in Parliament and economic incentives to resist reform. Shaftesbury and other reformers had to build public awareness, political coalitions, and evidence-based arguments over decades before they could overcome that resistance. Social progress on labour rights ΓÇö as on most issues ΓÇö requires sustained effort against entrenched economic interests. The Fair exists, Babatunde says, because people fought for children\'s right to be there rather than in a factory.',
  },
  {
    id: 'quiz-child-labour-t3',
    entryId: 'entry-child-labour-laws',
    difficultyTier: 3,
    question: 'The ILO estimates 160 million children still work worldwide, many in hazardous conditions. What does this tell us about the progress made since 1833?',
    options: [
      'That the 1833 Factory Act had no effect because nothing has changed',
      'That progress is real ΓÇö Britain in 1833 had millions of child workers; wealthy countries largely abolished it ΓÇö but incomplete, because child labour persists where poverty and weak enforcement continue to make it a survival strategy',
      'That child labour is acceptable in developing countries but not in wealthy ones',
      'That the number 160 million is too large to be accurate',
    ],
    correctIndex: 1,
    explanation: 'Eliminating child labour in Britain took a century of persistent campaigning and economic development. It has been largely eliminated in wealthy countries with strong enforcement systems and alternatives to child income. But in regions where extreme poverty means a child\'s income is essential to family survival, and where governments cannot enforce labour laws, child labour persists as a symptom of a deeper problem. The honest lesson is that naming something as wrong is necessary but insufficient ΓÇö the economic and institutional conditions that make it possible must also be addressed.',
  },

  // ΓöÇΓöÇΓöÇ entry-gig-economy ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-gig-economy-t1',
    entryId: 'entry-gig-economy',
    difficultyTier: 1,
    question: 'What is the "gig economy"?',
    options: [
      'A music industry term for performers who play at concerts',
      'A way of working where people do many small, separate jobs ΓÇö driving, delivering, designing ΓÇö rather than having one permanent employer',
      'A government programme that pays people to work on short projects',
      'A system where workers own shares in every company they work for',
    ],
    correctIndex: 1,
    explanation: 'In the gig economy, workers take on short, flexible tasks (called "gigs") through digital platforms like Uber, DoorDash, or Fiverr. Instead of one employer and one steady income, a gig worker might drive passengers in the morning, deliver food in the afternoon, and sell handmade crafts online in the evening. The work is flexible ΓÇö you choose when and how much ΓÇö but it comes without the security and benefits of traditional employment.',
  },
  {
    id: 'quiz-gig-economy-t2',
    entryId: 'entry-gig-economy',
    difficultyTier: 2,
    question: 'Gig economy companies classify workers as "independent contractors" rather than "employees." Why does this classification matter to workers?',
    options: [
      'Contractors are paid more money than employees for the same work',
      'Employees receive protections like minimum wage, sick pay, and holiday pay; contractors typically do not ΓÇö so the classification shifts costs and risks from companies to workers',
      'The classification only affects paperwork and has no practical impact on workers',
      'Contractors can set their own prices while employees must accept what they are offered',
    ],
    correctIndex: 1,
    explanation: 'Employment law in most countries gives employees protections: minimum wage, sick pay, holiday entitlement, protection against unfair dismissal, and employer pension contributions. By classifying workers as independent contractors, gig economy companies avoid all these obligations ΓÇö reducing their costs but transferring the risk of illness, slow periods, and accidents entirely to the worker. A driver injured on the job gets no sick pay. A slow month means no income guarantee. The debate is whether this represents freedom (workers choose their own hours) or exploitation (workers bear all the risk companies would normally carry).',
  },
  {
    id: 'quiz-gig-economy-t3',
    entryId: 'entry-gig-economy',
    difficultyTier: 3,
    question: 'Babatunde has changed careers seven times and says each change taught him something valuable ΓÇö but adds: "I was lucky. I chose to change. Not everyone gets that choice." What distinction is he drawing?',
    options: [
      'That career flexibility is always positive for everyone who experiences it',
      'That voluntary flexibility (choosing to change on your own terms with financial security) is very different from forced flexibility (having no choice because no stable work is available)',
      'That people with many careers are always more successful than people with one career',
      'That lucky people should not give career advice to unlucky people',
    ],
    correctIndex: 1,
    explanation: 'The experience of gig work varies enormously depending on circumstances. For a skilled professional with savings and high-value services, gig work can mean genuine freedom ΓÇö choosing clients, projects, and hours. For a worker with limited savings, dependents to support, and few alternatives, the same structure means permanent financial insecurity with no safety net. The word "flexibility" obscures this difference. Babatunde\'s honest reflection distinguishes between privilege ΓÇö having the conditions that make flexibility genuinely free ΓÇö and precarity ΓÇö having flexibility forced upon you because no better option exists.',
  },

  // ΓöÇΓöÇΓöÇ entry-equal-pay ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-equal-pay-t1',
    entryId: 'entry-equal-pay',
    difficultyTier: 1,
    question: 'The gender pay gap means that on average, women earn less than men. Roughly how much less, globally?',
    options: [
      'Women earn about the same as men ΓÇö within 1%',
      'Women earn about 80 cents for every dollar men earn ΓÇö approximately 20% less',
      'Women earn about half what men earn',
      'Women earn about 95 cents for every dollar men earn ΓÇö about 5% less',
    ],
    correctIndex: 1,
    explanation: 'Globally, women earn approximately 80 cents for every dollar earned by men ΓÇö a gap of about 20%. The gap is smaller in some countries (Iceland, Norway) and much larger in others. It has been closing slowly over decades as women\'s educational attainment and workforce participation have increased, but it has not closed fully in any country.',
  },
  {
    id: 'quiz-equal-pay-t2',
    entryId: 'entry-equal-pay',
    difficultyTier: 2,
    question: 'The gender pay gap has multiple causes. Which of the following is one of the key contributors?',
    options: [
      'Women are less productive workers on average',
      'Unpaid caregiving (childcare, elder care) falls disproportionately on women, reducing their paid working hours and career continuity',
      'Women choose lower-paid jobs because they prefer less stressful work',
      'Pay differences between men and women are entirely explained by differences in education',
    ],
    correctIndex: 1,
    explanation: 'One of the most significant contributors to the pay gap is unpaid caregiving ΓÇö and its unequal distribution. When children are born or elderly relatives need care, it is disproportionately women who reduce their working hours, take career breaks, or switch to more flexible (often lower-paid) jobs. This is not entirely a matter of personal preference: cultural expectations, lack of affordable childcare, and the structure of parental leave policies all shape these choices. Babatunde teaches that the pay gap is both a fairness issue and an economic efficiency issue: economies lose when qualified people cannot fully participate in the workforce.',
  },
  {
    id: 'quiz-equal-pay-t3',
    entryId: 'entry-equal-pay',
    difficultyTier: 3,
    question: 'Iceland became the first country to legally require companies to prove they pay equally regardless of gender (2018), rather than simply making discrimination illegal. What is the difference between these two approaches?',
    options: [
      'They are the same approach expressed in different words',
      'Making discrimination illegal puts the burden on the victim to prove they were discriminated against; requiring proof of equal pay puts the burden on companies to demonstrate compliance ΓÇö making enforcement far more effective',
      'Iceland\'s approach only applies to large companies while the older approach applied to all companies',
      'Iceland\'s approach is less strict than older anti-discrimination laws',
    ],
    correctIndex: 1,
    explanation: 'Under traditional anti-discrimination law, a woman who suspects she is paid less must gather evidence, file a complaint, and prove discrimination ΓÇö a process that is expensive, difficult, and often daunting. Iceland\'s certification system reverses the burden: companies must actively demonstrate and document pay equity, or face fines. This changes who has to do the work of proof. Systems designed to prevent problems from occurring are typically more effective than systems designed to punish them after the fact. Babatunde keeps a tiny Icelandic flag at his booth as an example of what "fixed" can look like.',
  },
];
