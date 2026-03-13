/**
 * Seed Data — The Market Square (Tía Carmen Herrera)
 * Financial Literacy / Economics
 *
 * Tía Carmen grew up watching her abuela run a tortillería at a loss
 * because she never learned to read a ledger. Carmen became an economist
 * so no family would fall through that gap again.
 *
 * Educational standards: CCSS.MATH.CONTENT.2-5 (measurement/money),
 * State financial literacy standards (NGPF, Jump$tart)
 */
import type { RealWorldEntry } from '../types.js';

export const MARKET_SQUARE_ENTRIES: readonly RealWorldEntry[] = [
  {
    id: 'entry-lydian-coin',
    type: 'artifact',
    title: 'The First Coin: The Lydian Stater',
    year: -600,
    yearDisplay: '~600 BCE',
    era: 'ancient',
    descriptionChild:
      'Before coins were invented, people traded things for other things — barley for pottery, cloth for fish. The Lydians in ancient Turkey were the first people to make metal coins. Suddenly, every kind of trade became easier.',
    descriptionOlder:
      'The Lydians of Anatolia (modern Turkey) minted the world\'s first standardized coins from electrum (a natural gold-silver alloy) around 600 BCE. Stamping metal established trust: the lion stamp of King Alyattes meant the coin\'s weight was guaranteed. Money replaced barter and enabled long-distance trade.',
    descriptionParent:
      'The invention of coinage is foundational to economic literacy. It introduces concepts of standardization, trust, and value abstraction. The Lydians\' innovation spread to Greece and Persia within a generation. Understanding why coins were invented helps children grasp what currency really is: a shared agreement about value.',
    realPeople: ['King Alyattes of Lydia', 'King Croesus of Lydia'],
    quote: 'Rich as Croesus.',
    quoteAttribution: 'Greek proverb (Croesus, son of Alyattes, was the wealthiest king in the ancient world)',
    geographicLocation: { lat: 38.6019, lng: 28.1136, name: 'Sardis, Lydia (modern Turkey)' },
    continent: 'Asia',
    subjectTags: ['money', 'economics', 'ancient_history', 'trade', 'currency'],
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    adventureType: 'artifact_hunt',
    difficultyTier: 1,
    prerequisites: [],
    unlocks: ['entry-silk-road'],
    funFact: 'The first coins were stamped with a lion\'s head — a symbol of the Lydian king\'s power. Today, many countries still put powerful symbols on their money.',
    imagePrompt:
      'Ancient Lydian coins with lion stamps glowing in a market setting, Ghibli-style ancient bazaar with merchants trading, warm golden light on electrum metal, the Market Square world visible in background',
    status: 'published',
  },
  {
    id: 'entry-silk-road',
    type: 'event',
    title: 'The Silk Road: The World\'s First Trade Network',
    year: -130,
    yearDisplay: '~130 BCE',
    era: 'ancient',
    descriptionChild:
      'The Silk Road was not one road — it was a whole web of paths connecting China, India, the Middle East, and Europe. Merchants didn\'t just trade silk: they traded spices, gold, ideas, mathematics, and even diseases. It was the internet of the ancient world.',
    descriptionOlder:
      'The Silk Road (c. 130 BCE – 1453 CE) was a network of trade routes spanning 4,000 miles from China to Rome. It carried physical goods like silk, porcelain, and spices, but also transmitted religion (Buddhism, Islam, Christianity), technology (paper, gunpowder, the compass), and disease (the Black Plague). Trade routes created civilization itself.',
    descriptionParent:
      'The Silk Road illustrates that trade is not merely economic — it is the primary driver of cultural exchange in human history. It directly connects to Marco Polo, the spread of Islam, the invention of paper money (which China developed to solve Silk Road coin shortages), and the economic power of connectivity.',
    realPeople: ['Zhang Qian (Han Dynasty explorer)', 'Marco Polo', 'Ibn Battuta'],
    quote: 'A king who is not a merchant is a blind man.',
    quoteAttribution: 'Medieval Persian proverb',
    geographicLocation: { lat: 39.9042, lng: 116.4074, name: 'Chang\'an (Xi\'an), China — eastern terminus' },
    continent: 'Asia',
    subjectTags: ['trade', 'economics', 'world_history', 'exploration', 'commerce'],
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    adventureType: 'guided_expedition',
    difficultyTier: 2,
    prerequisites: ['entry-lydian-coin'],
    unlocks: ['entry-first-paper-money'],
    funFact: 'Silk was so valuable that the Romans thought it grew on trees. They called China "Seres" — the land of silk.',
    imagePrompt:
      'Silk Road caravan crossing desert dunes with the Ghibli-sky overhead, merchants with silk bolts, spice bags, and compass roses, interactive world-map with glowing trade paths, warm sunrise light',
    status: 'published',
  },
  {
    id: 'entry-first-paper-money',
    type: 'invention',
    title: 'The First Paper Money: Flying Money',
    year: 618,
    yearDisplay: '~618 CE (Tang Dynasty)',
    era: 'medieval',
    descriptionChild:
      'Imagine carrying enough coins to pay for a whole shipment of silk — your pockets would rip! Chinese merchants in the Tang Dynasty solved this problem by inventing paper certificates. They left their heavy coins at a government bank and carried paper instead. The bank would pay whoever held the paper.',
    descriptionOlder:
      'China\'s Tang Dynasty (618–907 CE) developed the first paper money, called "flying money" (feiqian), to solve the problem of transporting heavy copper coins over long Silk Road distances. The Song Dynasty later issued formal government-backed paper currency called "jiaozi" (~960 CE). Paper money requires institutional trust — a concept that underpins all modern finance.',
    descriptionParent:
      'The invention of paper money introduces children to abstract value, institutional trust, and the social contract of currency. It directly contrasts with commodity money (the Lydian coin) and sets up modern concepts like bank deposits, central banking, and even digital currencies. China\'s leadership in monetary innovation predated European paper money by 600 years.',
    realPeople: ['Emperor Xuanzong of Tang', 'Marco Polo (documented it for Europe)'],
    quote: 'With this paper, you can buy anything throughout the whole empire.',
    quoteAttribution: 'Marco Polo, describing Song Dynasty paper money, c. 1275 CE',
    geographicLocation: { lat: 34.3416, lng: 108.9398, name: 'Chang\'an (Xi\'an), Tang Dynasty China' },
    continent: 'Asia',
    subjectTags: ['money', 'economics', 'china', 'invention', 'banking', 'trust'],
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    adventureType: 'time_window',
    difficultyTier: 2,
    prerequisites: ['entry-silk-road'],
    unlocks: ['entry-double-entry-bookkeeping'],
    funFact: 'The Mongol Empire used paper money across their entire empire from China to Persia. When they ran out of gold to back it, they just printed more — and caused history\'s first recorded hyperinflation.',
    imagePrompt:
      'Tang Dynasty merchant counting paper certificates in a lantern-lit counting house, Ghibli-style Chinese architecture, coins and paper notes with glowing abstract value-energy, the Silk Road visible through a window',
    status: 'published',
  },
  {
    id: 'entry-double-entry-bookkeeping',
    type: 'invention',
    title: 'Double-Entry Bookkeeping: How Business Learned to Read Itself',
    year: 1494,
    yearDisplay: '1494 CE',
    era: 'renaissance',
    descriptionChild:
      'Luca Pacioli was a monk and mathematician who wrote the first book explaining how to keep track of money in business. His rule was simple: every time money moves, write it down twice — once where it came from, and once where it went. This tiny rule changed the whole world of business forever.',
    descriptionOlder:
      'Luca Pacioli\'s Summa de Arithmetica (1494) codified double-entry bookkeeping: every debit has an equal and opposite credit. This system makes fraud harder, errors detectable, and financial health visible at a glance. It enabled the Italian Renaissance banking houses (Medici, Bardi) to operate across Europe and was the foundation of modern accounting and auditing.',
    descriptionParent:
      'Double-entry bookkeeping is the operating system of capitalism. Pacioli\'s system — which he documented but did not invent — enabled the Italian city-states to build the first global financial networks. Every company P&L, every home budget app, and every bank statement runs on this 500-year-old logic. Teaching children to track money flowing both in and out is foundational financial literacy.',
    realPeople: ['Luca Pacioli', 'Lorenzo de Medici'],
    quote: 'A merchant must be methodical and precise. He must know his worth at all times.',
    quoteAttribution: 'Luca Pacioli, Summa de Arithmetica (1494)',
    geographicLocation: { lat: 43.7696, lng: 11.2558, name: 'Florence, Italy (Medici Renaissance center)' },
    continent: 'Europe',
    subjectTags: ['economics', 'accounting', 'mathematics', 'renaissance', 'business'],
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    adventureType: 'remembrance_wall',
    difficultyTier: 3,
    prerequisites: ['entry-first-paper-money'],
    unlocks: [],
    funFact: 'Luca Pacioli was best friends with Leonardo da Vinci. Leonardo illustrated the geometric figures in Pacioli\'s next book.',
    imagePrompt:
      'Renaissance scholar Luca Pacioli writing in a ledger by candlelight, Ghibli-style Florentine study with geometric figures on the walls, balanced scales symbol in glowing light, Leon da Vinci\'s drawings visible on a desk',
    status: 'published',
  },
];
