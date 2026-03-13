/**
 * Content Entries — Folklore Bazaar
 * World: The Folklore Bazaar | Guide: Hassan Yılmaz | Subject: Folklore / Cultural Stories
 *
 * Four published entries spanning the world's storytelling traditions:
 *   1. The Brothers Grimm — collecting stories before they vanished
 *   2. Anansi — the spider-trickster who crossed the Atlantic
 *   3. One Thousand and One Nights — Scheherazade's survival by story
 *   4. Aboriginal Dreamtime — the oldest stories on Earth
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Brothers Grimm (Tier 1) ──────────────────────────

export const ENTRY_BROTHERS_GRIMM: RealWorldEntry = {
  id: 'entry-brothers-grimm',
  type: 'person',
  title: "The Men Who Saved the Fairy Tales",
  year: 1812,
  yearDisplay: '1812 CE',
  era: 'industrial',
  descriptionChild:
    "Jacob and Wilhelm Grimm didn't make up fairy tales — they collected them. They went from village to village in Germany, listening to the stories people told, and wrote them down in a book. Without them, we might have lost Cinderella, Rapunzel, and Snow White forever.",
  descriptionOlder:
    "The Brothers Grimm published Kinder- und Hausmärchen (Children's and Household Tales) in 1812, aiming to preserve German folk narratives before industrialisation erased them. Their original versions were much darker than the Disney adaptations — Cinderella's stepsisters cut off parts of their feet, and Sleeping Beauty's story involved considerably more danger. The Grimms edited successive editions to make them more suitable for children, revealing the tension between preservation and adaptation.",
  descriptionParent:
    "Jacob and Wilhelm Grimm's Kinder- und Hausmärchen (1812) is the founding document of modern folklore studies. The brothers' stated goal was to preserve an authentic 'Teutonic' oral tradition, though scholarship has since revealed that many of their informants were educated, middle-class women of French Huguenot descent — complicating claims of purely Germanic folk origin. Successive editions (1812–1857) progressively softened violent content and added Christian moral frameworks. The collection's 210 tales — including Aschenputtel (Cinderella), Dornröschen (Sleeping Beauty), and Schneewittchen (Snow White) — have become the backbone of the Western fairy-tale canon. The work teaches children that all stories have versions, and that 'the original' is often more complex and contested than we assume.",
  realPeople: ['Jacob Grimm', 'Wilhelm Grimm'],
  quote: "All stories have versions, and 'the original' is often more complex and contested than we assume.",
  quoteAttribution: 'Hassan Yılmaz, Guide of the Folklore Bazaar',
  geographicLocation: { lat: 51.3127, lng: 9.4797, name: 'Kassel, Germany' },
  continent: 'Europe',
  subjectTags: ['Brothers Grimm', 'fairy tales', 'folklore', 'oral tradition', 'German stories'],
  worldId: 'folklore-bazaar',
  guideId: 'hassan-yilmaz',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-anansi-stories'],
  funFact:
    "In the original 1812 version of Cinderella, the stepsisters cut off parts of their feet to fit the glass slipper, and pigeons pecked out their eyes at the wedding. The Grimms softened the stories in later editions — but the dark originals survive.",
  imagePrompt:
    'Open bazaar market stall piled with leather-bound story collections, Grimm Brothers silhouettes listening to a village storyteller, warm lantern-lit market at dusk',
  status: 'published',
};

// ─── Entry 2: Anansi (Tier 2) ───────────────────────────────────────

export const ENTRY_ANANSI_STORIES: RealWorldEntry = {
  id: 'entry-anansi-stories',
  type: 'cultural_milestone',
  title: "The Spider Who Outsmarted Everyone",
  year: 0,
  yearDisplay: 'Oral tradition (centuries old)',
  era: 'ancient',
  descriptionChild:
    "Anansi is a clever spider from West African stories who outsmarts bigger, stronger creatures using his brains. When enslaved people were brought to the Caribbean, they brought Anansi with them. He survived the ocean crossing because stories can't be chained.",
  descriptionOlder:
    "Anansi originated in the Akan oral tradition of Ghana. He's a trickster figure — small, physically weak, but brilliantly cunning. When the transatlantic slave trade forcibly transported West Africans to the Caribbean and Americas, Anansi came with them. In Jamaica, the stories became 'Nancy Stories,' and Anansi became a symbol of resistance: the small outsmarting the powerful, the enslaved outwitting the master. Anansi stories are among the clearest examples of folklore as cultural survival.",
  descriptionParent:
    "Anansi, the spider-trickster of Akan (Ashanti) oral tradition, represents one of the most significant examples of cultural transmission through forced diaspora. Transported via the Middle Passage to Jamaica, Suriname, Curaçao, and the American South, Anansi stories adapted to new environments while retaining their core structure: the small and clever defeating the large and powerful through wit. In the Caribbean, Anansi became explicitly coded as a resistance figure — the enslaved person who outwits the slave-master. The Anansi tradition demonstrates that folklore is not merely entertainment but a vehicle for cultural identity, resistance, and survival across the most extreme conditions. The story teaches children that stories themselves are travellers, adapting without losing their soul.",
  realPeople: [],
  quote: "Stories can't be chained.",
  quoteAttribution: 'Hassan Yılmaz, Guide of the Folklore Bazaar',
  geographicLocation: { lat: 6.6885, lng: -1.6244, name: 'Kumasi, Ghana' },
  continent: 'Africa',
  subjectTags: ['Anansi', 'trickster', 'Akan', 'West Africa', 'diaspora', 'resistance'],
  worldId: 'folklore-bazaar',
  guideId: 'hassan-yilmaz',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-brothers-grimm'],
  unlocks: ['entry-aboriginal-dreamtime'],
  funFact:
    "In some versions, Anansi is the reason all stories exist. He bought them from Nyame, the sky god, by capturing a python, a leopard, and a swarm of hornets — all through cleverness, never strength. Jamaican folk stories are still called 'Nancy Stories' in his honour.",
  imagePrompt:
    'Bazaar spider-silk stall with golden webs connecting story scrolls from Ghana to Jamaica, tiny spider figure among larger merchants, warm West African sunset palette',
  status: 'published',
};

// ─── Entry 3: One Thousand and One Nights (Tier 2) ──────────────────

export const ENTRY_ONE_THOUSAND_ONE_NIGHTS: RealWorldEntry = {
  id: 'entry-one-thousand-one-nights',
  type: 'cultural_milestone',
  title: "The Woman Who Told Stories to Stay Alive",
  year: 800,
  yearDisplay: '~800 CE (compiled)',
  era: 'medieval',
  descriptionChild:
    "Scheherazade married a king who planned to execute her the next morning. So she started telling him a story — but stopped right at the most exciting part. The king needed to hear the ending, so he let her live one more night. She did this for 1,001 nights, and by then the king had fallen in love with her stories and with her.",
  descriptionOlder:
    "The One Thousand and One Nights (Alf Layla wa-Layla) is a frame narrative — a story that contains other stories. Scheherazade's survival depends on her skill as a storyteller. The collection grew over centuries, absorbing folk tales from Persia, India, Iraq, Egypt, and Turkey. Famous stories like Aladdin, Ali Baba, and Sinbad the Sailor were later additions by European translators. The Nights invented the cliffhanger — and proved that stories have the power to save lives.",
  descriptionParent:
    "Alf Layla wa-Layla (One Thousand and One Nights) is a multilayered compilation of Middle Eastern, South Asian, and North African folk tales assembled over several centuries (earliest known Arabic manuscript fragment dates to ~9th century). The frame narrative — Scheherazade postponing execution through serial storytelling — is itself a meditation on the life-sustaining power of narrative. The collection demonstrates 'stories within stories,' with tales nested up to three levels deep. Antoine Galland's French translation (1704–1717) added Aladdin and Ali Baba (likely from oral Syrian sources). The work teaches children the concept of frame narrative, serialised storytelling, and the way folk traditions cross cultural boundaries — the 'Sinbad' stories, for instance, contain echoes of Homer's Odyssey.",
  realPeople: ['Antoine Galland'],
  quote: "Stories have the power to save lives.",
  quoteAttribution: 'Hassan Yılmaz, Guide of the Folklore Bazaar',
  geographicLocation: { lat: 33.3152, lng: 44.3661, name: 'Baghdad, Iraq (compiled)' },
  continent: 'Asia',
  subjectTags: ['Scheherazade', '1001 Nights', 'frame narrative', 'cliffhanger', 'Arabic literature'],
  worldId: 'folklore-bazaar',
  guideId: 'hassan-yilmaz',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-brothers-grimm'],
  unlocks: ['entry-aboriginal-dreamtime'],
  funFact:
    "Aladdin and Ali Baba aren't in the original Arabic manuscripts at all. They were added by Antoine Galland, a French translator, who claimed he heard them from a Syrian storyteller named Hanna Diyab. So the most famous 'Arabian Nights' stories may be partly European inventions.",
  imagePrompt:
    'Bazaar storytelling tent with cushions and oil lamps, Scheherazade figure narrating to rapt audience, stories spiralling upward like smoke into nested tales, warm desert evening light',
  status: 'published',
};

// ─── Entry 4: Aboriginal Dreamtime (Tier 3) ────────────────────────

export const ENTRY_ABORIGINAL_DREAMTIME: RealWorldEntry = {
  id: 'entry-aboriginal-dreamtime',
  type: 'cultural_milestone',
  title: "The Oldest Stories on Earth",
  year: -65000,
  yearDisplay: '65,000+ years of continuous tradition',
  era: 'ancient',
  descriptionChild:
    "Aboriginal Australians have been telling stories for at least 65,000 years — the longest continuous storytelling tradition on Earth. Their Dreamtime stories explain how the world was created: how rivers were carved by giant serpents, how mountains were formed by ancestor spirits. These aren't just stories — they're maps, law, history, and science all woven together.",
  descriptionOlder:
    "The Dreaming (Tjukurpa in Pitjantjatjara, Jukurrpa in Warlpiri) is a living narrative framework that encodes Aboriginal law, geography, ecology, kinship, and cosmology. Unlike Western folklore, the Dreaming is not considered 'mythology' by its storytellers — it is an ongoing reality. Songlines trace paths across the continent that function as navigational maps, legal boundaries, and ecological records. Geological research has confirmed that some Dreamtime stories accurately describe events (volcanic eruptions, sea-level rises) that occurred over 7,000 years ago.",
  descriptionParent:
    "Aboriginal Australian narrative traditions represent the longest continuous storytelling culture in human history, with archaeological evidence supporting continuous cultural presence for at least 65,000 years. The Dreaming (language-group-specific terms include Tjukurpa, Jukurrpa, and Altjeringa) is not a mythology in the Western sense but a living cosmological framework encoding law, kinship, ecological knowledge, and navigational information. Songlines — narrative journeys traced across the continent — function simultaneously as stories, maps, legal codes, and ecological records. Recent geological research (Nunn & Reid, 2015) has demonstrated that specific Dreamtime narratives accurately describe datable geological events including volcanic eruptions and post-glacial sea-level rises from 7,000+ years ago, making them the longest-verified oral histories on Earth. The Dreaming teaches children that stories can be simultaneously entertainment, law, science, and map — and that the Western separation of these categories is not universal.",
  realPeople: [],
  quote: "Stories can be simultaneously entertainment, law, science, and map.",
  quoteAttribution: 'Hassan Yılmaz, Guide of the Folklore Bazaar',
  geographicLocation: { lat: -25.2744, lng: 133.7751, name: 'Australia (continent-wide)' },
  continent: 'Oceania',
  subjectTags: ['Aboriginal', 'Dreamtime', 'Songlines', 'oral tradition', 'oldest stories'],
  worldId: 'folklore-bazaar',
  guideId: 'hassan-yilmaz',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-anansi-stories', 'entry-one-thousand-one-nights'],
  unlocks: [],
  funFact:
    "Scientists have confirmed that some Dreamtime stories accurately describe volcanic eruptions and coastline changes from over 7,000 years ago. One story describes a time when sea levels rose and swallowed coastal land — matching geological evidence of post-glacial flooding. These are the longest-verified oral histories on Earth.",
  imagePrompt:
    'Ancient bazaar section with dot-painting patterns on the ground tracing Songlines across a continent map, elder storyteller beneath a vast star-filled sky, warm ochre and earth tones',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const FOLKLORE_BAZAAR_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_BROTHERS_GRIMM,
  ENTRY_ANANSI_STORIES,
  ENTRY_ONE_THOUSAND_ONE_NIGHTS,
  ENTRY_ABORIGINAL_DREAMTIME,
] as const;

export const FOLKLORE_BAZAAR_ENTRY_IDS: readonly string[] =
  FOLKLORE_BAZAAR_ENTRIES.map((e) => e.id);
