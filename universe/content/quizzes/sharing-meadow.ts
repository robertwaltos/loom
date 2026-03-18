/**
 * Quiz Questions ΓÇö Sharing Meadow (Auntie Bee)
 * Economics / Community Economics / Cooperation
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const SHARING_MEADOW_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-the-commons ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-commons-t1',
    entryId: 'entry-the-commons',
    difficultyTier: 1,
    question: 'What is "the commons"?',
    options: [
      'A type of park that only wealthy people are allowed to use',
      'Shared resources that belong to everyone ΓÇö like parks, forests, clean air, and the ocean',
      'A market where all goods are sold at the same price',
      'A government building where laws are made',
    ],
    correctIndex: 1,
    explanation: 'The commons are shared resources that do not belong to any single person ΓÇö lakes, forests, the atmosphere, the ocean. Because no one individual owns them, they require collective care. Auntie Bee\'s most important question about shared things is: "How do we make sure nobody takes too much?" If everyone takes as much as they can, shared resources run out for everyone.',
  },
  {
    id: 'quiz-commons-t2',
    entryId: 'entry-the-commons',
    difficultyTier: 2,
    question: 'Garrett Hardin predicted shared resources would always be destroyed. Elinor Ostrom proved him wrong by studying real communities. What did she find?',
    options: [
      'That all shared resources need to be privatised to survive',
      'That communities can successfully manage shared resources for centuries if they develop clear rules, enforce them, and make decisions collectively',
      'That governments always manage shared resources better than communities',
      'That shared resources always run out eventually, even with careful management',
    ],
    correctIndex: 1,
    explanation: 'Ostrom studied fishing communities, irrigation systems, and Swiss alpine grazing meadows that had been successfully shared for centuries ΓÇö without either privatisation or government control. She found eight principles that characterised successful commons management, including clearly defined boundaries, collective decision-making, and graduated penalties for rule-breakers. She won the Nobel Prize for demonstrating that people can cooperate and self-govern shared resources when the institutional conditions are right.',
  },
  {
    id: 'quiz-commons-t3',
    entryId: 'entry-the-commons',
    difficultyTier: 3,
    question: 'Ostrom\'s eight principles for commons management ΓÇö clear boundaries, collective rules, graduated sanctions ΓÇö apply to families, teams, and neighbourhoods as well as fishing villages. What does this generality suggest?',
    options: [
      'That Ostrom studied families as well as fishing communities',
      'That the same underlying logic governs any situation where a shared resource must be managed by a group ΓÇö cooperation requires clear agreements, participation in making rules, and consistent consequences for breaking them',
      'That families and fishing communities have identical economic problems',
      'That the principles only work in small groups and cannot scale to larger societies',
    ],
    correctIndex: 1,
    explanation: 'Ostrom\'s principles describe the conditions under which cooperation can be sustained in any context where people share a resource ΓÇö whether that resource is a fishing pond, a family budget, a team workspace, or a public park. The principles are not specific to fishing; they describe the institutional requirements for collective governance. Auntie Bee has them embroidered on her quilt as a daily reminder that the same wisdom applies in the Meadow, in the home, and in the world.',
  },

  // ΓöÇΓöÇΓöÇ entry-gift-economy ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-gift-economy-t1',
    entryId: 'entry-gift-economy',
    difficultyTier: 1,
    question: 'In a potlatch celebration, how do you become one of the most respected people in the community?',
    options: [
      'By accumulating the most wealth and displaying it for everyone to see',
      'By giving the most gifts to everyone who attends your celebration',
      'By winning a competition of strength or skill',
      'By being the eldest person in the community',
    ],
    correctIndex: 1,
    explanation: 'In a potlatch ΓÇö a tradition of Indigenous peoples of the Pacific Northwest ΓÇö the host gives gifts to everyone present. Status and respect come from generosity, not accumulation. The more you give away, the more respected you become. This is the opposite of the logic that drives much of market economics, where status often comes from how much you own.',
  },
  {
    id: 'quiz-gift-economy-t2',
    entryId: 'entry-gift-economy',
    difficultyTier: 2,
    question: 'Gift economies in Kwakiutl potlatch and Melanesian kula ring traditions distribute wealth through obligation and reciprocity. How does this differ from market economics?',
    options: [
      'Gift economies are only found in ancient civilisations and no longer exist anywhere',
      'In market economies, exchange is voluntary and immediate ΓÇö you get what you pay for now. In gift economies, giving creates social bonds and long-term obligations that strengthen community ties over time',
      'Gift economies are the same as charity ΓÇö one side gives without expecting anything',
      'Market economies always produce better outcomes than gift economies in every situation',
    ],
    correctIndex: 1,
    explanation: 'In a market, you exchange goods for money and the transaction is complete. In a gift economy, giving creates a social bond ΓÇö the recipient is not immediately obligated to return the gift, but over time relationships of mutual generosity sustain the community. Wealth circulates through the community rather than accumulating. These systems predate market economics by thousands of years and sustained communities for millennia. Anthropologist Marcel Mauss argued that the gift economy is in many ways the foundation of all human social life.',
  },
  {
    id: 'quiz-gift-economy-t3',
    entryId: 'entry-gift-economy',
    difficultyTier: 3,
    question: 'Some potlatch traditions involved deliberately destroying valuable objects to demonstrate that generosity mattered more than accumulation. What economic idea does this challenge?',
    options: [
      'The idea that rational people always try to maximise personal wealth',
      'The idea that fire is always destructive',
      'The idea that trade requires two people who both want to exchange',
      'The idea that goods have objective monetary values',
    ],
    correctIndex: 0,
    explanation: 'Classical economics assumes that rational individuals will always act to maximise their personal wealth. Destroying wealth to gain social status directly contradicts this model ΓÇö here, destroying is the economically rational act within the social context, because the social capital gained (respect, status, strong community bonds) has real value that exceeds the material value destroyed. This challenges economists to broaden their models of what "rational" and "valuable" mean when community and relationships are factored in.',
  },

  // ΓöÇΓöÇΓöÇ entry-cooperative-movement ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-cooperative-t1',
    entryId: 'entry-cooperative-movement',
    difficultyTier: 1,
    question: 'What did the 28 Rochdale Pioneers do in 1844 that was different from an ordinary shop?',
    options: [
      'They sold food at higher prices to support their community hall',
      'They pooled their own money to open a shop where everyone shared the profits equally and had an equal vote in decisions',
      'They convinced a wealthy merchant to donate a shop to the town',
      'They built the largest shop in England to sell goods to the whole country',
    ],
    correctIndex: 1,
    explanation: 'The Rochdale Pioneers were workers who could not afford much individually but pooled their resources together. Their shop was different because it was owned by its members ΓÇö every member had one vote regardless of how much they had invested, and profits were shared equally among members. This "one member, one vote" principle is still the foundation of cooperatives worldwide.',
  },
  {
    id: 'quiz-cooperative-t2',
    entryId: 'entry-cooperative-movement',
    difficultyTier: 2,
    question: 'The Rochdale Principles established that cooperatives use "one member, one vote" regardless of wealth invested. Why is this different from how most companies are governed?',
    options: [
      'Because cooperatives are always smaller than regular companies and need simpler rules',
      'Because in most companies, more shares means more votes ΓÇö so wealthier investors have more control. In a cooperative, equal democratic participation regardless of wealth is the core principle',
      'Because cooperatives do not pay taxes and therefore do not need shareholder rules',
      'Because Rochdale was a religious community that believed everyone was equal before God',
    ],
    correctIndex: 1,
    explanation: 'In a standard company, one share equals one vote. Someone who owns 51% of shares controls the company. The Rochdale Principles reject this by making membership ΓÇö not investment amount ΓÇö the basis of voting power. A cooperative is fundamentally a democracy, not a plutocracy. This means decisions reflect what members collectively want, not what the largest financial backers want. The model now governs over 3 million cooperatives worldwide, from grocery stores to banks to energy utilities.',
  },
  {
    id: 'quiz-cooperative-t3',
    entryId: 'entry-cooperative-movement',
    difficultyTier: 3,
    question: 'The Rochdale shop started with just butter, sugar, flour, oatmeal, and candles ΓÇö and grew to 1,400 members within ten years. What does this rapid growth suggest about the cooperative model?',
    options: [
      'That food cooperatives always grow faster than other types of businesses',
      'That the cooperative model met a genuine unmet need ΓÇö workers wanted fair prices, democratic participation, and shared benefit ΓÇö and the model spread because it genuinely delivered these things',
      'That all businesses in Rochdale failed during the 1840s and the cooperative absorbed their members',
      'That the British government subsidised the cooperative heavily to make it a success',
    ],
    correctIndex: 1,
    explanation: 'The Rochdale Pioneers grew rapidly because they were solving a real problem: industrial workers in 1840s Britain were often paid in company scrip, forced to buy from company stores at inflated prices, and had no voice in the businesses that shaped their lives. A co-operative offered fair prices, genuine democratic participation, and a share in the profits. The model spread because it worked. Auntie Bee says every big thing starts with a small pot of butter.',
  },

  // ΓöÇΓöÇΓöÇ entry-open-source ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-open-source-t1',
    entryId: 'entry-open-source',
    difficultyTier: 1,
    question: 'What does "open source" mean when talking about computer programmes?',
    options: [
      'The programme can only be used with the internet switched on',
      'Anyone can look at how the programme works, change it, and share it freely',
      'The programme is only available in the "open" section of a computer shop',
      'The programme was made by a single company and given away free as a promotion',
    ],
    correctIndex: 1,
    explanation: 'An open source programme has its code ΓÇö the instructions that make it work ΓÇö publicly available for anyone to read, modify, and share. Wikipedia, Firefox, and Linux all work this way. Thousands of people around the world contribute to these projects because they believe knowledge should be shared freely. The opposite is "proprietary" software, where the code is secret and owned by a company.',
  },
  {
    id: 'quiz-open-source-t2',
    entryId: 'entry-open-source',
    difficultyTier: 2,
    question: 'Linux powers most of the world\'s internet servers, all Android phones, and the International Space Station ΓÇö but no one owns it. How can something so important be built without anyone owning it?',
    options: [
      'The United Nations secretly owns Linux and paid for all the development',
      'Thousands of volunteers contributed their work because sharing knowledge is intrinsically rewarding, and collective governance rules ensure quality is maintained',
      'Linux was secretly funded by a wealthy technology company that chose to remain anonymous',
      'Linux was so simple to build that it only needed a few weeks of work from one person',
    ],
    correctIndex: 1,
    explanation: 'Linux demonstrates that intrinsic motivation ΓÇö the satisfaction of solving interesting problems, building reputation in a community, and contributing to something larger than oneself ΓÇö can sustain complex, high-quality work without financial ownership driving it. The open source model distributes quality control across millions of contributors and reviewers. Something that should not work in theory (complex software built by unpaid volunteers without central coordination) has become the infrastructure of the internet.',
  },
  {
    id: 'quiz-open-source-t3',
    entryId: 'entry-open-source',
    difficultyTier: 3,
    question: 'Richard Stallman started the free software movement arguing that software should be free as in "freedom," not just free as in "no cost." What is the difference, and why does it matter?',
    options: [
      'There is no real difference ΓÇö free software that costs nothing is the same as free software with freedoms',
      'Free as in freedom means you can study, modify, and share the software ΓÇö preserving your autonomy over your tools. Free as in price means you just did not pay, but the owner can still control what you do with it',
      'Free as in freedom means the software is available in every language',
      'Free as in price is always more important than free as in freedom for ordinary users',
    ],
    correctIndex: 1,
    explanation: 'Stallman\'s insight was that the danger of proprietary software is not its cost but its control. A company can give you software for free while still reading your data, blocking competitors, or removing features. "Freedom" in the free software sense means four specific rights: to run the programme, to study how it works, to redistribute copies, and to distribute modified versions. These freedoms matter because they determine whether you control your own digital tools ΓÇö or your digital tools control you.',
  },
];
