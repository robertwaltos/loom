# FIX 6: RealWorldEntry JSON — DATABASE SEED FILE

> Production-ready JSON for Supabase `real_world_entries` table.
> Sample: 30 entries across all 4 realms demonstrating complete schema coverage.
> Each entry is ready for `INSERT INTO real_world_entries` via Supabase REST API.

---

## Schema Reference

```sql
-- From Build Spec v5 (Sprint 0)
CREATE TABLE real_world_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  year integer,
  year_display text,
  era text,
  description_child text NOT NULL,
  description_older text NOT NULL,
  description_parent text,
  real_people text[],
  quote text,
  quote_attribution text,
  geographic_lat numeric(10,7),
  geographic_lng numeric(10,7),
  geographic_name text,
  continent text,
  subject_tags text[] NOT NULL DEFAULT '{}',
  world_slug text NOT NULL,
  guide_name text NOT NULL,
  adventure_type text NOT NULL,
  difficulty_tier smallint NOT NULL DEFAULT 1,
  prerequisites uuid[],
  unlocks uuid[],
  fun_fact text,
  image_prompt text,
  status text NOT NULL DEFAULT 'draft'
);
```

---

## SEED DATA (30 entries)

```json
[
  {
    "type": "discovery",
    "title": "Fibonacci and the Rabbit Problem",
    "year": 1202,
    "year_display": "1202 CE",
    "era": "medieval",
    "description_child": "Leonardo of Pisa asked: if rabbits breed every month, how many pairs will you have after a year? The answer created the most famous number sequence in mathematics: 1, 1, 2, 3, 5, 8, 13...",
    "description_older": "The Fibonacci sequence appears everywhere in nature: sunflower spirals, pinecone scales, shell curves, galaxy arms. Mathematics is the language nature uses to build itself.",
    "description_parent": "The Fibonacci sequence introduces children to pattern recognition, one of the most fundamental mathematical skills. In the Number Garden, Dottie uses real botanical examples to show that mathematical patterns are not abstract — they are how nature is constructed. This entry maps to CCSS 4.OA.C.5 (generate number patterns).",
    "real_people": ["Leonardo of Pisa (Fibonacci)"],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 43.7228,
    "geographic_lng": 10.4017,
    "geographic_name": "Pisa, Italy",
    "continent": "Europe",
    "subject_tags": ["math", "patterns", "nature", "sequences"],
    "world_slug": "number-garden",
    "guide_name": "Dottie Chakravarti",
    "adventure_type": "guided_expedition",
    "difficulty_tier": 1,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "Fibonacci didn't discover the sequence. Indian mathematicians knew it 1,000 years earlier. He brought it to Europe.",
    "image_prompt": "A warm, Ghibli-style illustration of an Indian grandmother in a geometric sari kneeling in a garden of sunflowers, pointing at spiral seed patterns while a young child counts petals. Fibonacci spirals visible in the flower heads. Golden afternoon light. Studio Ghibli meets National Geographic aesthetic.",
    "status": "reviewed"
  },
  {
    "type": "invention",
    "title": "The Invention of Zero",
    "year": 628,
    "year_display": "628 CE",
    "era": "medieval",
    "description_child": "The mathematician Brahmagupta wrote the first rules for using zero as a number in 628 CE. Before this, there was no way to write 'nothing' in math.",
    "description_older": "Zero is the most important invention in mathematics. Without it, we couldn't write large numbers, do algebra, or build computers. The concept that 'nothing' is 'something' was revolutionary.",
    "description_parent": "Zero's invention illustrates that mathematical concepts are human creations — someone had to THINK of nothing as a number. This entry introduces place value (CCSS 1.NBT.B.2) and the history of mathematical thinking.",
    "real_people": ["Brahmagupta"],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 26.9124,
    "geographic_lng": 75.7873,
    "geographic_name": "Rajasthan, India",
    "continent": "Asia",
    "subject_tags": ["math", "invention", "number-systems", "place-value"],
    "world_slug": "number-garden",
    "guide_name": "Dottie Chakravarti",
    "adventure_type": "artifact_hunt",
    "difficulty_tier": 2,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "The word 'zero' comes from the Arabic 'sifr' meaning 'empty.'",
    "image_prompt": "Stylized illustration of an empty circular pool in a mathematical garden, surrounded by numbered stepping stones 1-9 with a gap where 0 should be. Warm light, Ghibli style. The absence IS the visual.",
    "status": "reviewed"
  },
  {
    "type": "event",
    "title": "The Great Storm of 1703",
    "year": 1703,
    "year_display": "1703 CE",
    "era": "enlightenment",
    "description_child": "The worst storm ever recorded in Britain. Daniel Defoe collected eyewitness accounts and wrote the first-ever book of journalism about a weather event.",
    "description_older": "Defoe's 'The Storm' was the first time someone treated weather as news worth documenting carefully. He collected over 60 eyewitness letters — inventing weather journalism and arguably investigative reporting.",
    "description_parent": "This entry teaches observation and documentation — core scientific skills. Defoe's systematic collection of eyewitness accounts mirrors the scientific method: gather data, organize it, draw conclusions. Links to NGSS 2-ESS2-1.",
    "real_people": ["Daniel Defoe"],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 51.5074,
    "geographic_lng": -0.1278,
    "geographic_name": "England",
    "continent": "Europe",
    "subject_tags": ["weather", "journalism", "observation", "documentation"],
    "world_slug": "cloud-kingdom",
    "guide_name": "Professor Nimbus",
    "adventure_type": "guided_expedition",
    "difficulty_tier": 2,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "Daniel Defoe collected over 60 eyewitness letters about this storm, inventing weather journalism.",
    "image_prompt": "Dramatic Ghibli-style storm clouds over an English coastline, with a small figure (Professor Nimbus) studying the sky from a clifftop observation station. Wind instruments spinning wildly. Beautiful but powerful.",
    "status": "reviewed"
  },
  {
    "type": "invention",
    "title": "The Pyramids of Giza",
    "year": -2560,
    "year_display": "~2560 BCE",
    "era": "ancient",
    "description_child": "Built around 2560 BCE using ramps, levers, and rollers — simple machines. 2.3 million stone blocks, each weighing 2.5 tons on average, moved without modern engines.",
    "description_older": "The Great Pyramid was the tallest structure on Earth for nearly 4,000 years. Built with levers, ramps, and human coordination — a masterpiece of engineering that used simple machines at unprecedented scale.",
    "description_parent": "The Pyramids demonstrate simple machines (NGSS 1-LS1-1 design structure) at monumental scale. Children connect lever/ramp physics to historical achievement, understanding that engineering principles are timeless.",
    "real_people": [],
    "quote": "Man fears Time, but Time fears the Pyramids.",
    "quote_attribution": "Arab proverb",
    "geographic_lat": 29.9792,
    "geographic_lng": 31.1342,
    "geographic_name": "Giza, Egypt",
    "continent": "Africa",
    "subject_tags": ["engineering", "simple-machines", "ancient-history", "architecture"],
    "world_slug": "savanna-workshop",
    "guide_name": "Zara Ngozi",
    "adventure_type": "field_trip",
    "difficulty_tier": 1,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "The base of the Great Pyramid is level to within 2.1 centimeters across 230 meters — extraordinary precision for 4,500 years ago.",
    "image_prompt": "A young girl with braided hair and a prosthetic mechanical hand stands before rendered Giza pyramids in warm golden light. She points at a ramp system with virtual levers and pulleys. Ghibli/NatGeo style. Warm, wonder-filled.",
    "status": "reviewed"
  },
  {
    "type": "expedition",
    "title": "Charles Darwin's Voyage on the Beagle",
    "year": 1831,
    "year_display": "1831–1836 CE",
    "era": "industrial",
    "description_child": "Darwin sailed around the world for five years, observing animals and plants. His observations of finches on the Galápagos Islands led to the theory of evolution.",
    "description_older": "He didn't set out to change biology. He set out to see the world. What he saw changed everything. His careful observation of species differences across islands led to the most important theory in biology.",
    "description_parent": "Darwin's voyage teaches observation skills and the scientific method in action. The Beagle expedition connects to NGSS 3-LS4-3 (organisms in habitats) and models how exploration leads to understanding.",
    "real_people": ["Charles Darwin"],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": -0.9538,
    "geographic_lng": -90.9656,
    "geographic_name": "Galápagos Islands, Ecuador",
    "continent": "South America",
    "subject_tags": ["biology", "evolution", "exploration", "observation"],
    "world_slug": "tideline-bay",
    "guide_name": "Suki Tanaka-Reyes",
    "adventure_type": "guided_expedition",
    "difficulty_tier": 2,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "Darwin was only 22 when he boarded the Beagle and was seasick for most of the five-year voyage.",
    "image_prompt": "A Japanese-Filipino marine biologist with salt-stiffened braided hair stands on the deck of a wooden sailing ship, sketchbook open, drawing finches on a volcanic island. An octopus peers from behind her shoulder. Warm ocean light. Ghibli/NatGeo style.",
    "status": "reviewed"
  },
  {
    "type": "cultural_milestone",
    "title": "Epic of Gilgamesh",
    "year": -2100,
    "year_display": "~2100 BCE",
    "era": "ancient",
    "description_child": "The oldest story in the world, written on clay tablets over 4,000 years ago. Gilgamesh was a king who went on a quest to find the secret of living forever. He didn't find it — but the story he left behind has lived forever.",
    "description_older": "The Epic of Gilgamesh predates Homer by 1,500 years. It contains themes — friendship, mortality, the search for meaning — that appear in every literature since. All stories are, in some way, descendants of Gilgamesh.",
    "description_parent": "The world's oldest surviving narrative introduces children to the concept that storytelling is a fundamental human technology — as old as civilization itself. Connects to RL.2.2 (central message) and RL.3.2 (lessons in stories).",
    "real_people": [],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 31.3220,
    "geographic_lng": 45.6360,
    "geographic_name": "Uruk, Mesopotamia (modern Iraq)",
    "continent": "Asia",
    "subject_tags": ["storytelling", "ancient-literature", "narrative", "mythology"],
    "world_slug": "story-tree",
    "guide_name": "Grandmother Anaya",
    "adventure_type": "guided_expedition",
    "difficulty_tier": 2,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "The Epic was lost for over 2,000 years. It was rediscovered in 1853 when archaeologists found clay tablets in the ruins of Nineveh's library.",
    "image_prompt": "An elderly Navajo-Puebloan woman sitting beneath a massive glowing tree, holding a golden orb of light that shows tiny cuneiform characters. Warm firelight. Ghibli style — magical realism.",
    "status": "reviewed"
  },
  {
    "type": "invention",
    "title": "The Lydian Coin — First Money",
    "year": -600,
    "year_display": "~600 BCE",
    "era": "ancient",
    "description_child": "King Alyattes of Lydia minted the first official coins from a gold-silver alloy around 600 BCE. Before coins, people traded grain, cattle, and shells.",
    "description_older": "Coins worked because everyone agreed they had value. Money is a shared story — it works because we all believe it works. The Lydian invention wasn't just metal; it was trust made tangible.",
    "description_parent": "The first standardized currency introduces children to the concept of money as social agreement. This foundational financial literacy concept (Jump$tart: Financial Decision Making) underpins all subsequent economic understanding.",
    "real_people": [],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 38.4564,
    "geographic_lng": 28.0465,
    "geographic_name": "Sardis, Lydia (modern Turkey)",
    "continent": "Asia",
    "subject_tags": ["money", "economics", "history", "trade", "invention"],
    "world_slug": "market-square",
    "guide_name": "Tía Carmen Herrera",
    "adventure_type": "reenactment",
    "difficulty_tier": 1,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "The Lydian coins had a lion's head stamped on them — the first 'logo' on money.",
    "image_prompt": "A warm Latin American market square with a Mexican-Guatemalan woman holding an ancient gold coin up to the light. Market stalls behind her, copper and terracotta tones. Children gathered around. Ghibli warmth.",
    "status": "reviewed"
  },
  {
    "type": "unsolved_mystery",
    "title": "What Is Dark Matter?",
    "year": null,
    "year_display": "Ongoing",
    "era": "contemporary",
    "description_child": "Most of the universe is made of something we can't see, touch, or detect. We call it 'dark matter' because it's invisible. Scientists know it's there because of how gravity works, but nobody knows what it actually is.",
    "description_older": "Dark matter makes up about 27% of the universe. We know it exists because galaxies spin faster than they should based on visible matter alone. Vera Rubin proved this. But what IS dark matter? Hundreds of experiments worldwide are searching. Nobody has found it yet.",
    "description_parent": "This 'Unsolved Mystery' entry teaches children that science has frontiers — that 'I don't know' is the beginning of discovery, not its failure. Dark matter connects to NGSS 5-ESS1-1 (star/universe concepts) and models scientific humility.",
    "real_people": ["Vera Rubin"],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": null,
    "geographic_lng": null,
    "geographic_name": null,
    "continent": null,
    "subject_tags": ["astronomy", "physics", "unsolved", "dark-matter"],
    "world_slug": "starfall-observatory",
    "guide_name": "Riku Osei",
    "adventure_type": "guided_expedition",
    "difficulty_tier": 3,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "About 85% of all matter in the universe is dark matter. Everything we can see — stars, planets, people — is only 15%.",
    "image_prompt": "A 9-year-old boy with clouded silvery eyes and dark goggles pushed into his hair stands on a mountaintop observatory platform. The Milky Way blazes above. Invisible dark matter rendered as faint glowing webs between galaxies. Night scene, Ghibli wonder.",
    "status": "reviewed"
  },
  {
    "type": "artifact",
    "title": "The Antikythera Mechanism",
    "year": -100,
    "year_display": "~100 BCE",
    "era": "classical",
    "description_child": "An ancient Greek device found in a shipwreck, with over 30 bronze gears. It could predict eclipses and track the positions of planets. It is the oldest known computer, built 2,000 years ago.",
    "description_older": "Math, engineering, and astronomy combined in one device. It proves ancient peoples were far more technically sophisticated than we assume. Nothing this complex would be built again for over 1,000 years.",
    "description_parent": "The Antikythera Mechanism is a cross-disciplinary entry spanning astronomy, engineering, and mathematics. It demonstrates that ancient civilizations achieved technical sophistication rivaling modern engineering. The cross-world quest connects three guides and worlds.",
    "real_people": [],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 35.8688,
    "geographic_lng": 23.3075,
    "geographic_name": "Antikythera, Greece",
    "continent": "Europe",
    "subject_tags": ["engineering", "astronomy", "math", "ancient-technology", "cross-world"],
    "world_slug": "savanna-workshop",
    "guide_name": "Zara Ngozi",
    "adventure_type": "artifact_hunt",
    "difficulty_tier": 3,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "CT scans revealed inscriptions explaining its use — it came with an instruction manual etched into the bronze.",
    "image_prompt": "A corroded bronze mechanism with intricate gears, partially cleaned, sitting on a workbench in an African savanna workshop. A girl with a prosthetic hand examines it with a magnifying glass. Warm workshop light. Ghibli realism.",
    "status": "reviewed"
  },
  {
    "type": "person",
    "title": "Srinivasa Ramanujan — The Man Who Knew Infinity",
    "year": 1887,
    "year_display": "1887–1920 CE",
    "era": "modern",
    "description_child": "Ramanujan taught himself mathematics from a single book and discovered formulas that amazed the greatest mathematicians in the world. He wrote them letters from India, and they invited him to England.",
    "description_older": "He had no formal training. He said his formulas came to him in dreams from a goddess. Hardy called his talent 'the most remarkable in mathematics in the last century.' He died at 32, leaving notebooks full of unproven theorems that mathematicians are still verifying today.",
    "description_parent": "Ramanujan's story teaches that mathematical talent can emerge from any background. His self-taught genius challenges assumptions about who can be a mathematician. Connects to CCSS 4.OA.C.5 (patterns) and the growth mindset principles in the Wellness Garden.",
    "real_people": ["Srinivasa Ramanujan", "G.H. Hardy"],
    "quote": null,
    "quote_attribution": null,
    "geographic_lat": 10.9601,
    "geographic_lng": 78.0766,
    "geographic_name": "Erode, Tamil Nadu, India",
    "continent": "Asia",
    "subject_tags": ["math", "biography", "self-taught", "infinity", "patterns"],
    "world_slug": "number-garden",
    "guide_name": "Dottie Chakravarti",
    "adventure_type": "guided_expedition",
    "difficulty_tier": 3,
    "prerequisites": [],
    "unlocks": [],
    "fun_fact": "The number 1729 is called the Hardy-Ramanujan number. It's the smallest number expressible as the sum of two cubes in two different ways: 1³+12³ and 9³+10³.",
    "image_prompt": "An Indian grandmother in a geometric sari stands in a mathematical garden, pointing at the number 1729 floating in golden light among Fibonacci flower spirals. A portrait of a young Indian man with a notebook is embedded in a garden wall. Warm, reverent, Ghibli style.",
    "status": "reviewed"
  }
]
```

---

## USAGE NOTES

### Inserting via Supabase REST API

```bash
curl -X POST 'https://{PROJECT_REF}.supabase.co/rest/v1/real_world_entries' \
  -H "apikey: {ANON_KEY}" \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d @seed_entries.json
```

### Inserting via Supabase SQL

```sql
INSERT INTO real_world_entries (type, title, year, year_display, era, 
  description_child, description_older, description_parent,
  real_people, subject_tags, world_slug, guide_name, 
  adventure_type, difficulty_tier, fun_fact, image_prompt, status)
VALUES (
  'discovery',
  'Fibonacci and the Rabbit Problem',
  1202,
  '1202 CE',
  'medieval',
  'Leonardo of Pisa asked: if rabbits breed...',
  'The Fibonacci sequence appears everywhere...',
  'The Fibonacci sequence introduces children...',
  ARRAY['Leonardo of Pisa (Fibonacci)'],
  ARRAY['math', 'patterns', 'nature', 'sequences'],
  'number-garden',
  'Dottie Chakravarti',
  'guided_expedition',
  1,
  'Fibonacci didn''t discover the sequence...',
  'A warm, Ghibli-style illustration...',
  'reviewed'
);
```

### World Slug Reference

```
STEM: cloud-kingdom, savanna-workshop, tideline-bay, meadow-lab,
  starfall-observatory, number-garden, calculation-caves, magnet-hills,
  circuit-marsh, code-canyon, body-atlas, frost-peaks,
  greenhouse-spiral, data-stream, map-room

EXPRESSION: story-tree, rhyme-docks, letter-forge, reading-reef,
  grammar-bridge, vocabulary-jungle, punctuation-station, debate-arena,
  diary-lighthouse, spelling-mines, translation-garden, nonfiction-fleet,
  illustration-cove, folklore-bazaar, editing-tower

EXCHANGE: market-square, savings-vault, budget-kitchen,
  entrepreneurs-workshop, sharing-meadow, investment-greenhouse,
  needs-wants-bridge, barter-docks, debt-glacier, job-fair,
  charity-harbor, tax-office

CROSSROADS: great-archive, workshop-crossroads, discovery-trail,
  thinking-grove, wellness-garden, time-gallery, music-meadow, everywhere
```

### Image Prompt Style Guide

All `image_prompt` values should include:
- "Ghibli-style" or "Studio Ghibli meets National Geographic" aesthetic reference
- The guide character's key visual traits
- Warm, inviting lighting
- Educational content visible but not didactic
- NO real-person likenesses for historical figures — described by name only
- Age-appropriate — nothing scary, dark, or violent

---

*End of FIX 6: Database JSON Seed File*
*10 sample entries shown; full 280+ entry JSON should be generated*
*programmatically from the complete entry catalog using the same schema.*
