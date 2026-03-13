/**
 * Content Entries — Cloud Kingdom
 * World: Cloud Kingdom | Guide: Professor Nimbus | Subject: Earth Science / Weather
 *
 * Four published entries spanning the history of meteorology:
 *   1. Torricelli's barometer — the first instrument to measure the invisible
 *   2. Luke Howard names the clouds — the power of giving things names
 *   3. Franklin's kite experiment — curiosity that changed safety forever
 *   4. FitzRoy's first weather forecast — from ships to citizens
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Torricelli Barometer (Tier 1 — ages 5-6) ─────────────

export const ENTRY_BAROMETER_TORRICELLI: RealWorldEntry = {
  id: 'entry-barometer-torricelli',
  type: 'invention',
  title: "The First Instrument That Measured Air",
  year: 1643,
  yearDisplay: '1643 CE',
  era: 'renaissance',
  descriptionChild:
    "Did you know air has weight? A scientist named Torricelli wanted to prove it. He filled a glass tube with a silvery liquid called mercury, flipped it upside down, and watched what happened. The air around us pushed the mercury up — and he could measure how hard it was pushing! He built the first barometer.",
  descriptionOlder:
    "Evangelista Torricelli, a student of Galileo, was frustrated by water pumps that couldn't lift water past 34 feet. His teacher thought the water 'didn't want to rise higher.' Torricelli disagreed — he believed the atmosphere had weight pressing down on everything. In 1643, he filled a 4-foot glass tube with mercury, sealed one end, inverted it in a dish, and watched the mercury column rest at exactly 76 cm. The space above the mercury was vacuum — nature's blank. And the height changed with the weather.",
  descriptionParent:
    "Torricelli's barometer (1643) was the first scientific instrument to measure atmospheric pressure — establishing that air has mass and that its weight varies by location and weather. This directly led to the understanding that pressure changes precede weather changes. Torricelli also inadvertently created the first laboratory vacuum, which had profound implications for physics. The story teaches measurement, inference, and how a practical problem (failing pump) can open a window to fundamental physics.",
  realPeople: ['Evangelista Torricelli', 'Galileo Galilei'],
  quote: "We live submerged at the bottom of an ocean of air.",
  quoteAttribution: 'Evangelista Torricelli, 1644',
  geographicLocation: { lat: 43.7696, lng: 11.2558, name: 'Florence, Italy' },
  continent: 'Europe',
  subjectTags: ['air pressure', 'barometer', 'atmosphere', 'measurement', 'weather instruments'],
  worldId: 'cloud-kingdom',
  guideId: 'professor-nimbus',
  adventureType: 'artifact_hunt',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-cloud-naming-howard'],
  funFact: "The mercury in Torricelli's barometer moved up and down like a silent weather report — no forecast app needed. Modern digital barometers measure the same pressure he discovered, just without the mercury.",
  imagePrompt:
    "Renaissance Italian laboratory at golden hour, glass tube filled with gleaming mercury inverted in a shallow dish, the mercury column suspended mid-air by invisible pressure, Evangelista Torricelli in dark velvet studying it with intense curiosity, window shows storm clouds approaching Florence, warm candlelight, Studio Ghibli painterly realism with scientific precision, soft chiaroscuro",
  status: 'published',
};

// ─── Entry 2: Luke Howard Names the Clouds (Tier 2 — ages 7-8) ──────

export const ENTRY_CLOUD_NAMING_HOWARD: RealWorldEntry = {
  id: 'entry-cloud-naming-howard',
  type: 'event',
  title: "The Night Someone Named the Clouds",
  year: 1803,
  yearDisplay: '1803 CE',
  era: 'enlightenment',
  descriptionChild:
    "Before 1803, clouds had no names. People just called them 'clouds.' Then a young pharmacist named Luke Howard gave a talk and said: this flat-bottomed cloud is cumulus. This layered gray cloud is stratus. This wispy high cloud is cirrus. Scientists everywhere agreed — and we still use his names today. He named the sky.",
  descriptionOlder:
    "Luke Howard was a Quaker pharmacist who spent nights watching the sky over London. In 1803, he presented a paper 'On the Modifications of Clouds' to the Askesian Society — essentially a science club. He proposed Latin-based names: cumulus (heaped), stratus (spread out), cirrus (curled fiber), and nimbus (rain-bearing). The Romantic poets were electrified — Goethe wrote poems in honor of Howard. Meteorology finally had a shared language. All modern cloud classification descends from this one amateur's careful observation.",
  descriptionParent:
    "Howard's cloud taxonomy (1803) is a landmark in the history of classification systems — it shows how naming enables science. Before shared terminology, naturalists in different countries couldn't exchange weather observations meaningfully. Howard's system (still used in the International Cloud Atlas) remains one of the most durable scientific contributions made by a non-professional. It also demonstrates that careful observation over time — citizen science before the term existed — creates genuine knowledge.",
  realPeople: ['Luke Howard', 'Johann Wolfgang von Goethe'],
  quote: "Let us name what we see, so we can speak of it together.",
  quoteAttribution: 'Luke Howard, 1803',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['cloud classification', 'taxonomy', 'meteorology', 'naming', 'observation'],
  worldId: 'cloud-kingdom',
  guideId: 'professor-nimbus',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-barometer-torricelli'],
  unlocks: ['entry-lightning-franklin'],
  funFact: "Goethe liked Luke Howard's cloud names so much that he wrote a series of poems about each cloud type — cumulus, stratus, cirrus, nimbus. A pharmacist accidentally inspired one of history's greatest poets.",
  imagePrompt:
    "London 1803 at dusk, a modest Quaker pharmacist standing on a rooftop with notebook open, the sky above him an extraordinary panorama showing all four cloud types — cumulus cottony heaps, flat stratus gray sheets, high wispy cirrus, dark nimbus bringing rain — each type labeled in elegant copper-plate script floating in the air, warm amber lamplight from below, rain just beginning at the far horizon, Ghibli painterly realism, atmosphere of wonder",
  status: 'published',
};

// ─── Entry 3: Franklin's Kite Experiment (Tier 2 — ages 7-8) ────────

export const ENTRY_LIGHTNING_FRANKLIN: RealWorldEntry = {
  id: 'entry-lightning-franklin',
  type: 'discovery',
  title: "The Kite That Caught Lightning",
  year: 1752,
  yearDisplay: '1752 CE',
  era: 'enlightenment',
  descriptionChild:
    "Benjamin Franklin had a dangerous idea: what if lightning is the same thing as the sparks from your socks on carpet — just much, MUCH bigger? To test it, he flew a kite in a thunderstorm with a metal key on the string. When lightning struck nearby, electricity traveled down the wet string to the key — and zap! He was right. He didn't get hurt because he was very careful. Then he invented the lightning rod to protect buildings.",
  descriptionOlder:
    "In 1752, Franklin designed an experiment to 'draw down' lightning and test whether it was electrical. He used a silk kite with a wire tip, a metal key tied at the bottom of the wet twine, and a Leyden jar to collect any charge. When a storm passed, the threads of the string stood on end — an electrostatic effect — and a spark jumped from the key to his knuckle. He'd proven lightning was atmospheric electricity. His lightning rod invention — iron rod, sharp point, grounded wire — saved countless buildings and ships, and for the first time gave humans a form of protection from weather.",
  descriptionParent:
    "Franklin's kite experiment (1752) united two fields — atmospheric science and electricity — that had been developing separately. It demonstrated the power of the hypothesis-experiment method and produced an immediate practical benefit: the lightning rod. Franklin generously published his findings and refused to patent the lightning rod, believing safety should be freely available. The experiment models scientific courage (testing dangerous ideas carefully), cross-disciplinary thinking, and the relationship between pure curiosity and practical invention.",
  realPeople: ['Benjamin Franklin'],
  quote: "An investment in knowledge pays the best interest.",
  quoteAttribution: 'Benjamin Franklin',
  geographicLocation: { lat: 39.9526, lng: -75.1652, name: 'Philadelphia, Pennsylvania' },
  continent: 'North America',
  subjectTags: ['lightning', 'electricity', 'weather safety', 'scientific method', 'invention'],
  worldId: 'cloud-kingdom',
  guideId: 'professor-nimbus',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-cloud-naming-howard'],
  unlocks: ['entry-fitzroy-weather-forecast'],
  funFact: "Franklin's lightning rod design was so effective that King George III had them installed on the royal palace — even though he and Franklin would soon be on opposite sides of a revolution. Good science crosses political borders.",
  imagePrompt:
    "Philadelphia 1752 at dusk during a dramatic summer thunderstorm, Benjamin Franklin and his son William in a field, large silk kite flying into dark churning clouds, a skeleton key on the wet twine string glowing faintly with blue static electricity, lightning bolt in background illuminating Franklin's expression of triumphant discovery, Leyden jar glowing in his hand, storm clouds dramatic and volumetric, Studio Ghibli dramatic weather rendering, sense of awe and controlled danger",
  status: 'published',
};

// ─── Entry 4: FitzRoy's First Weather Forecast (Tier 3 — ages 9-10) ─

export const ENTRY_FITZROY_WEATHER_FORECAST: RealWorldEntry = {
  id: 'entry-fitzroy-weather-forecast',
  type: 'invention',
  title: "The First Day the Future Was Predicted",
  year: 1861,
  yearDisplay: '1861 CE',
  era: 'industrial',
  descriptionChild:
    "Robert FitzRoy — the captain who once sailed with Charles Darwin — had watched too many fishermen die in storms they didn't know were coming. He invented something nobody had tried before: the weather forecast. He set up weather stations around Britain, collected data by telegraph every day, and published the next day's forecast in the Times newspaper. 'Storm Warning' flags went up at ports. Sailors could prepare. Some people laughed at him, but fishermen's lives were saved.",
  descriptionOlder:
    "FitzRoy became the first head of the British Meteorological Department in 1854. Using a network of 15 telegraph-connected weather stations, he gathered simultaneous observations — temperature, pressure, wind direction — and developed the principle that storms move, and can therefore be tracked and predicted. In 1861, he published the first weather forecasts in a newspaper. He invented the term 'forecast' itself. His storm-warning cone system (raised at ports) became the standard maritime safety signal for decades. He was viciously ridiculed by newspapers and scientists who called his forecasts 'pretending to know the future.' He died by suicide in 1865, his reputation damaged. Forty years later, his methods were vindicated — and his storm cones finally retired in 1977.",
  descriptionParent:
    "FitzRoy's story is one of the most poignant in the history of science: a genuine innovator whose work was correct but whose methods were ahead of what could be verified at the time. The forecasting system he designed was not proven statistically valid until decades after his death. Children engaging with this story can grapple with a genuine ethical question: what do we owe pioneers who are right before the evidence catches up? It also demonstrates the telegraph as an enabling technology — how communication infrastructure made data science possible.",
  realPeople: ['Robert FitzRoy', 'Charles Darwin'],
  quote: "Caution is the parent of safety.",
  quoteAttribution: 'Robert FitzRoy',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['weather forecasting', 'meteorology', 'telegraph', 'maritime safety', 'data collection'],
  worldId: 'cloud-kingdom',
  guideId: 'professor-nimbus',
  adventureType: 'remembrance_wall',
  difficultyTier: 3,
  prerequisites: ['entry-lightning-franklin'],
  unlocks: [],
  funFact: "FitzRoy invented the word 'forecast' — combining 'fore' (before) and 'cast' (to throw, as in throwing a net ahead to catch what's coming). Before him, people just said 'weather prediction.'",
  imagePrompt:
    "Victorian London 1861, a weather office full of telegraph equipment and hand-drawn pressure maps pinned to walls, Admiral Robert FitzRoy with military bearing and deep-set eyes marking barometric readings on a large paper chart of the British Isles, outside the window a harbor with storm-cone flags being raised, fishing boats visible in rough gray water, clerks operating telegraph machines, atmosphere of urgency and historical weight, Ghibli-NatGeo painterly realism, somber productive light",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const CLOUD_KINGDOM_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_BAROMETER_TORRICELLI,
  ENTRY_CLOUD_NAMING_HOWARD,
  ENTRY_LIGHTNING_FRANKLIN,
  ENTRY_FITZROY_WEATHER_FORECAST,
];

export const CLOUD_KINGDOM_ENTRY_IDS = CLOUD_KINGDOM_ENTRIES.map((e) => e.id);
