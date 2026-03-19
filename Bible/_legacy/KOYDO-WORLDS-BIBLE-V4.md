# KOYDO WORLDS — Production Bible v4

> **Repo:** `loom-worlds` (forked from The Loom engine)
> **Product:** Immersive educational app for ages 5–10
> **Engine:** Unreal Engine 5.6+ targeting mobile (iOS/Android), tablets, consoles
> **Visual Style:** Studio Ghibli meets National Geographic (Stylized PBR)
> **Status:** Pre-production — this document is the canonical reference for all development
> **Brand name:** Koydo Worlds (part of the Koydo ecosystem)

---

## ⚠️ FORK RULES — READ FIRST

This codebase is forked from **The Loom engine** (`loom`). It is NOT forked from the Koydo EdTech platform (`koydo`).

```
github.com/[org]/loom              ← The Loom engine (UPSTREAM)
github.com/[org]/loom-worlds       ← THIS REPO (Koydo Worlds product)
github.com/[org]/loom-concord      ← Future: The Concord (MMO product)
github.com/[org]/koydo             ← Koydo EdTech platform (SEPARATE — DO NOT TOUCH)
```

### What flows UPSTREAM (merge back to loom):
- Core engine: Silfen Weave transitions, plugin/Fabric loader, event bus, state sync
- AI conversation framework (generic, not character-specific prompts)
- World state management abstracted as generic world-property system
- Media pipeline infrastructure: job queue, worker pattern, provider abstraction
- MetaHuman rendering pipeline, NVIDIA ACE integration
- Performance optimizations, bug fixes, security patches

### What stays in THIS FORK:
- All educational content: 50 characters, 50 worlds, real-world entries, curriculum
- The Fading mechanic (luminance tied to learning)
- Kindler/Spark progression, Chapter arc
- Character-specific LLM system prompts
- COPPA compliance, parental controls, child safety
- Koydo brand assets, SSO with EdTech platform
- Subscription/monetization, revenue tracking, royalty ledger
- Sound design, world-specific audio

### PR checklist:
1. Engine-level change? → Flag for upstream merge
2. Imports from `koydo` EdTech repo? → **REJECT**
3. Writes to Koydo's Supabase? → **REJECT**
4. Content not appropriate for ages 5–10? → **REJECT**
5. Engine code without tests? → **REJECT**
6. Could The Concord benefit? → Write generically, PR upstream

---

## PART I: VISION

### What Is Koydo Worlds?

Koydo Worlds is where children don't study subjects — they visit worlds. Every lesson is a place. Every concept is a character. Every test is an adventure.

It is a structured curriculum delivered through 3D exploration, AI character interaction, and narrative progression in Unreal Engine 5. Every world, character, and quest is reverse-engineered from learning objectives aligned to Common Core, NGSS, and state financial literacy standards.

### Strategic Purpose

1. **Product:** Standalone educational app within the Koydo ecosystem. Subscription revenue from parents, homeschool families, supplementary education.
2. **Engine MVP:** First real application on The Loom engine. Stress-tests Silfen Weave (seamless transitions), Fabric architecture, AI NPCs, multi-world state management.
3. **Pipeline:** Character generation (fal.ai → MetaHuman), world building, and media pipeline built here will later power The Concord.
4. **Revenue:** First Loom product generating income, funding engine development.

### What Makes This Different

The educational app market has two products: drill-and-kill apps with cartoon mascots, and open-world games with education as an afterthought. Koydo Worlds is a third position: a world beautiful enough to want to explore and rigorous enough to actually teach. Characters are not reward dispensers — they are teachers with personalities, histories, and limitations. Children return because they care about Professor Nimbus's memory, Zara's next invention, or whether Nadia will ever let someone read her diary.

---

## PART II: THE PLOT — THE FADING

### Premise

The Koydo Worlds universe is a network of 50 interconnected worlds, each a living repository of a domain of human knowledge. Connected by **Threadways** — shimmering paths children walk through seamlessly (the Silfen Weave). The worlds have always glowed with the light of understanding.

**But something is wrong. The worlds are Fading.**

The Fading is not a villain. It is what happens when knowledge is forgotten. When no one visits the Number Garden, its Fibonacci flowers wilt. When no one dives the Reading Reef, the coral loses color. When no one trades at the Market Square, the stalls go quiet.

> **The Fading is the educational premise made literal: knowledge not used is knowledge lost. Children are not fighting a monster. They are keeping the light on.**

### The Player: The Kindler

Every child becomes a **Kindler** — someone whose curiosity literally restores light to worlds. Kindlers carry a **Spark** that grows brighter with each lesson completed, dims gently with absence (never punitively), and blazes when pushing into new territory.

Progress is **environmental, not numerical**. Children see worlds bloom, not scores increment.

### The Five Chapters

**Chapter 1 — The First Light (Onboarding)**
Child arrives in the Great Archive. The Librarian explains the Fading. Compass guides them to their first world (chosen by age/interests). First lessons restore color and life. End: 1 world restored, 3–5 characters met.

**Chapter 2 — The Threadways Open**
Cross-disciplinary connections appear. Math connects to music, science to geography. Quests span multiple worlds. The universe feels interconnected.

**Chapter 3 — The Deep Fade**
Some worlds have Faded deeply. Characters struggle — Nimbus can't remember weather patterns, the Circuit Marsh has gone silent. More challenging lessons. Collaborative quests with other Kindlers.

**Chapter 4 — The Source**
The Forgetting Well revealed — where abandoned knowledge collects. Not evil, just where things go when no one remembers them. Contains beautiful things: lost languages, forgotten sciences. The lesson: forgetting is natural, but choosing to remember is powerful.

**Chapter 5 — The Kindlers' Legacy (Ongoing)**
Senior Kindlers mentor newer players, contribute to the Archive. The Fading never ends — always a world needing light, a connection to discover, a reason to return.

### Educational Design Principles

- No punishment for absence. Worlds Fade gently. Returning is always rewarding.
- Every interaction maps to a learning standard. Exploration feels free but is curriculum-backed.
- Characters model growth mindset. They struggle visibly. Difficulty is normal.
- Collaborative by design. Competition exists only in optional challenge modes.
- Progress is environmental, not numerical.
- No daily login bonuses, no FOMO mechanics, no punishment for not playing.

---

## PART III: TECHNOLOGY STACK

### UE5 Mobile Pipeline

**Why UE5:** Visual ceiling that Unity/web can't match. Same engine as The Concord. MetaHuman native. NVIDIA ACE native. Fortnite proves it works on phones. Single rendering pipeline, all platforms.

### Device Tiers

| Tier | Devices | Resolution | Features | Target FPS |
|------|---------|-----------|----------|-----------|
| Low | iPhone 11/SE3, Galaxy A-series, older iPads | 720p | Simplified lighting, reduced foliage, LOD4-5 characters | 30 |
| Medium | iPhone 13-14, Galaxy S22-23, iPad 9th-10th | 1080p | Mobile Lumen, medium foliage, LOD2-3 characters | 30-60 |
| High | iPhone 15-16 Pro, iPad Pro M-series | 1080p+ | Full mobile Lumen, dense foliage, LOD1-2, volumetric fog | 60 |
| Ultra | PS5, Xbox Series X, Switch 2, iPad Pro M4+ | 4K/1440p | All features, LOD0 MetaHumans, ray tracing | 60 |

### Art Direction: Stylized PBR

The Ghibli/NatGeo look is achieved through **Stylized PBR** — UE5's physically-based materials with custom post-processing:

- **Post-process:** Soft outlines, warm color grading, hand-painted texture overlays
- **Environments:** Modular biome kits per world. Textures 1024² mobile, 2048² console
- **Lighting:** Baked GI for static + mobile Lumen for dynamic time-of-day. Each world has unique lighting mood
- **Water:** Stylized shader with caustics for ocean worlds. Single-layer on Low, multi-layer on High+
- **Foliage:** Subsurface scattering on Medium+. Wind via vertex shader. Density scales per tier

### Color Palettes by Realm

| Realm | Dominant | Accents | Mood |
|-------|----------|---------|------|
| Discovery (STEM) | Deep greens, ocean blues, night purples | Gold, white | Curiosity, wonder |
| Expression (Language Arts) | Warm ambers, parchment golds, forest greens | Ink blue, coral, silver | Warmth, creativity |
| Exchange (Financial Literacy) | Market reds, copper, terracotta | Jade green, cobalt, gold | Energy, fairness |
| Crossroads (Hub) | Shifting spectrum | Adapts to adjacent | Transition, connection |

### Character Pipeline: fal.ai → MetaHuman → UE5

**Human characters (45 of 50):**
1. **Concept art** via fal.ai — front-facing + 3/4 + full body. Style: semi-realistic, expressive, warm
2. **MetaHuman creation** in UE5 Editor (MHC web app being discontinued). Start from preset, sculpt toward reference
3. **Customization** — Zara's prosthetic hand, Kofi's tremor, Mira's hearing aids, Felix's tattoos = custom mesh mods in Maya
4. **LODs** — 8 levels auto-generated. Verify each renders correctly per device tier
5. **Animation** — MetaHuman Animator + Live Link Face (works with iPhone TrueDepth)
6. **AI integration** — NVIDIA ACE for real-time facial animation during LLM conversations

**Non-human characters (5):** Baxter (bee), Cal (crystal), Atlas (golem), Old Rowan (tree), Compass (shapeshifter)
- Custom 3D modeling (Meshy/Tripo3D/Blender/Maya)
- Custom skeleton + rig
- Custom LODs (4 minimum)
- Custom animation blueprints (Cal pulses colors, Baxter's wings twitch, Rowan's leaves rustle)

### AI Conversation System: LLM + NVIDIA ACE

**System prompt assembly** (rebuilt per session, never cached):
```
base_personality (from Character Bible)
+ subject_knowledge (from RealWorldEntries for their world)
+ adaptive_layer (child's age tier, progress, difficulty)
```

**LLM:** Claude Sonnet via The Needle (MCP). Response format: `text + emotion_tag` (happy, curious, thoughtful, encouraging, surprised, gentle_correction)

**NVIDIA ACE:**
- Audio2Face-3D: text-to-speech → real-time facial animation on MetaHuman
- Animation Graph: conversational state, turn-taking, idle↔speaking blend
- On-device for High/Ultra tiers. Cloud-streamed for Low/Medium

**Sample: Dottie Chakravarti with a 6-year-old**
```
DOTTIE [smiling, gesturing at sunflower]: Come here! Look at this sunflower.
  Can you count the little seeds in one row?
CHILD [taps seeds]: One, two, three... eight!
DOTTIE [delighted]: Eight! Now count the ones going the other way.
CHILD: One, two... thirteen!
DOTTIE [excited, leaning in]: Eight and thirteen! Come with me to the daisies.
  Let's count those petals and see if something magical happens…
```

**Same topic, age 10:**
```
DOTTIE [thoughtful]: You've been counting petals all morning. What pattern?
CHILD: The numbers keep being 5, 8, 13, 21... adding the two before?
DOTTIE [wide-eyed, clapping]: You found the Fibonacci sequence! A mathematician
  named Leonardo of Pisa discovered it in 1202 by asking about rabbits…
```

### Sound Design

**Global principles:**
- Dynamic music responds to Fading state (dimmer = sparser, restored = richer)
- Threadway audio crossfades seamlessly between worlds
- Each guide has a 4-8 bar leitmotif
- Achievement sounds: warm, resonant, never jarring. Bell-like tone for world restoration
- **No punishment sounds.** Wrong answers get a gentle redirecting tone

**World sonic palettes:**

| World | Instruments | Mood | Tempo |
|-------|-----------|------|-------|
| Cloud Kingdom | Flute, wind chimes, soft strings | Airy, contemplative | Slow, floating |
| Tideline Bay | Harp, ocean drum, whale song | Deep, mysterious | Undulating |
| Number Garden | Marimba, music box, plucked strings | Playful, precise | Mathematical patterns |
| Story Tree | Acoustic guitar, voice, hand drum | Warm, fireside | Variable |
| Market Square | Steel drum, accordion, handclap | Lively, festive | Upbeat |
| Frost Peaks | Crystal bowls, cello, wind | Vast, ancient | Very slow |
| Code Canyon | Synth pads, glitch, piano | Clean, futuristic | Precise |
| Starfall Observatory | Ambient pads, theremin, glass | Infinite, wonder | Cosmic |

All music original or commissioned. No licensed tracks. Score downloadable as album (additional revenue).

### Revenue & UE5 Royalty Compliance

**Royalty structure:**
- First $1M lifetime: royalty-free
- After $1M: 5% gross (standard) or 3.5% (Launch Everywhere with Epic)
- Quarterly reporting when >$10K/quarter after $1M lifetime
- Epic Games Store revenue excluded from royalty calculation

**Already built in Supabase (migration applied March 2026):**
- `revenue_events` table: logs every transaction (type, gross, net, platform, processor)
- `royalty_ledger` table: quarterly aggregation with auto-calculation
- Cron job runs quarterly, alerts The Weaver when a new ledger row is created

---

## PART IV: THE 50 WORLDS

### Realm of Discovery (STEM) — 15 Worlds

| # | World | Guide | Subject |
|---|-------|-------|---------|
| 1 | Cloud Kingdom | Professor Nimbus | Earth Science / Weather |
| 2 | Savanna Workshop | Zara Ngozi | Engineering / Simple Machines |
| 3 | Tideline Bay | Suki Tanaka-Reyes | Ocean Science / Biology |
| 4 | The Meadow Lab | Baxter | Plant Biology / Ecology |
| 5 | Starfall Observatory | Riku Osei | Space Science / Astronomy |
| 6 | The Number Garden | Dottie Chakravarti | Mathematics / Patterns |
| 7 | The Calculation Caves | Cal | Arithmetic / Mental Math |
| 8 | The Magnet Hills | Lena Sundstrom | Physics / Forces & Motion |
| 9 | The Circuit Marsh | Kofi Amponsah | Electricity / Circuits |
| 10 | Code Canyon | Pixel | Coding / Logic |
| 11 | The Body Atlas | Dr. Emeka Obi | Human Body / Health |
| 12 | The Frost Peaks | Mira Petrov | Geology / Rocks & Minerals |
| 13 | The Greenhouse Spiral | Hugo Fontaine | Chemistry / Mixtures |
| 14 | The Data Stream | Yuki | Data Science / Graphs |
| 15 | The Map Room | Atlas | Geography / Navigation |

### Realm of Expression (Language Arts) — 15 Worlds

| # | World | Guide | Subject |
|---|-------|-------|---------|
| 16 | The Story Tree | Grandmother Anaya | Storytelling / Narrative |
| 17 | The Rhyme Docks | Felix Barbosa | Poetry / Rhyme & Rhythm |
| 18 | The Letter Forge | Amara Diallo | Phonics / Letters |
| 19 | The Reading Reef | Oliver Marsh | Reading Comprehension |
| 20 | The Grammar Bridge | Lila Johansson-Park | Grammar / Sentences |
| 21 | The Vocabulary Jungle | Kwame Asante | Vocabulary / Word Roots |
| 22 | The Punctuation Station | Rosie Chen | Punctuation |
| 23 | The Debate Arena | Theo Papadopoulos | Persuasive Writing |
| 24 | The Diary Lighthouse | Nadia Volkov | Creative Writing |
| 25 | The Spelling Mines | Benny Okafor-Williams | Spelling |
| 26 | The Translation Garden | Farah al-Rashid | World Languages |
| 27 | The Nonfiction Fleet | Captain Birch | Research Skills |
| 28 | The Illustration Cove | Ines Moreau | Visual Literacy |
| 29 | The Folklore Bazaar | Hassan Yilmaz | Folklore |
| 30 | The Editing Tower | Wren Calloway | Editing / Revision |

### Realm of Exchange (Financial Literacy) — 12 Worlds

| # | World | Guide | Subject |
|---|-------|-------|---------|
| 31 | The Market Square | Tía Carmen Herrera | Money Basics / Trade |
| 32 | The Savings Vault | Mr. Abernathy | Saving / Compound Interest |
| 33 | The Budget Kitchen | Priya Nair | Budgeting |
| 34 | The Entrepreneur's Workshop | Diego Montoya-Silva | Entrepreneurship |
| 35 | The Sharing Meadow | Auntie Bee | Giving / Community Economics |
| 36 | The Investment Greenhouse | Jin-ho Park | Investing / Risk & Reward |
| 37 | The Needs & Wants Bridge | Nia Oduya | Smart Spending |
| 38 | The Barter Docks | Tomás Reyes | History of Money |
| 39 | The Debt Glacier | Elsa Lindgren | Borrowing / Debt |
| 40 | The Job Fair | Babatunde Afolabi | Earning / Careers |
| 41 | The Charity Harbor | Mei-Lin Wu | Charitable Giving |
| 42 | The Tax Office | Sam Worthington | Taxes / Public Services |

### The Crossroads (Cross-Disciplinary Hub) — 8 Worlds

| # | World | Guide | Subject |
|---|-------|-------|---------|
| 43 | The Great Archive | The Librarian | Research & Inquiry |
| 44 | The Workshop Crossroads | Kenzo Nakamura-Osei | Design Thinking |
| 45 | The Discovery Trail | Solana Bright | Scientific Method |
| 46 | The Thinking Grove | Old Rowan | Ethics / Critical Thinking |
| 47 | The Wellness Garden | Hana Bergstrom | Social-Emotional Learning |
| 48 | The Time Gallery | Rami al-Farsi | Historical Thinking |
| 49 | The Music Meadow | Luna Esperanza | Music & Math Patterns |
| 50 | Everywhere | Compass | Navigation / Tutorial |

---

## PART V: THE 50 CHARACTERS

### Roster Stats
- **Total:** 50 | **Male:** 22 (44%) | **Female:** 24 (48%) | **Non-binary:** 4 (8%)
- Cultural origins span **30+ traditions** across Africa, Asia, Europe, Americas, Pacific, Middle East
- **9 characters** with visible disabilities or neurodivergence
- **5 non-human** characters
- Ages range from 8 to ancient

### MetaHuman Classification

| Category | Count | Pipeline |
|----------|-------|----------|
| Adult human (30+) | 30 | MetaHuman Creator standard |
| Child human (8–12) | 5 | MetaHuman child presets |
| Elderly human (60+) | 7 | MetaHuman + age customization |
| Non-human organic | 3 | Custom 3D (Baxter, Old Rowan, Compass) |
| Non-human inorganic | 2 | Custom 3D (Cal, Atlas) |
| Young adult (20s) | 3 | MetaHuman standard |

### Disability & Neurodiversity

| Character | Representation | MetaHuman Note |
|-----------|---------------|----------------|
| Riku Osei (#5) | Legally blind in daylight | Custom clouded iris textures, no eye-tracking |
| Mira Petrov (#12) | Partially deaf | Visible hearing aid mesh addon |
| Yuki (#14) | Autistic | Subtle stimming idle, reduced eye contact |
| Felix Barbosa (#17) | Dyslexic | Expressed through dialogue, not visual |
| Oliver Marsh (#19) | Lost eyesight at 30 | Opaque eye textures, cane prop |
| Ines Moreau (#28) | Selective mutism | Communicates via drawn images (UI overlay) |
| Zara Ngozi (#2) | Prosthetic hand | Custom mechanical left hand mesh |
| Luna Esperanza (#49) | Was nonverbal until 4 | Expressed through backstory |
| Kofi Amponsah (#9) | Hand tremor | Subtle hand shake on idle |

> Disability is a fact of life that shapes expertise. Riku's blindness makes him a better astronomer. Yuki's autism makes her a better data scientist.

### Full Character Profiles

> Complete 600+ word profiles for all 50 characters are in **Bible v1** (koydo-universe-bible.docx). Each includes: name, gender, age, origin, role, subject, physical description, wound, limitation, competence, and the specific detail that makes children remember them.

> Below are the 50 one-paragraph summaries for quick reference. For implementation, always refer to the full profiles in v1.

**STEM Guides (1–15):**

**1. Professor Nimbus** — Elderly man with wild silver hair that moves like clouds. Wears a coat lined with barometric instruments. Lost his memory of one perfect day and devoted his life to understanding why weather changes.

**2. Zara Ngozi** — 10-year-old Nigerian-Kenyan girl with braided hair decorated with tiny gears. Her left hand is prosthetic — she built it herself. Never explains it unless asked, then talks about levers and pulleys.

**3. Suki Tanaka-Reyes** — Japanese-Filipino marine biologist who communicates through field sketches. Pet octopus named Hachi. Studies how coral reefs rebuild after storms because she rebuilt her own life after a typhoon at age seven.

**4. Baxter** — Human-sized bee in a lab coat. Extremely polite, slightly nervous. Compound eyes see UV patterns on flowers. Stutters when excited about photosynthesis. Last of his colony.

**5. Riku Osei** — 9-year-old Ghanaian-Japanese boy, legally blind in daylight but extraordinary night vision. Observatory built for darkness — tactile star maps and audio guides. Teaches that observation isn't the same as seeing.

**6. Dottie Chakravarti** — Indian grandmother tending a garden of Fibonacci spirals and fractal ferns. Sari with geometric prints she designed using math. Never gives answers directly — asks you to count petals and discover the pattern yourself.

**7. Cal** — Translucent humanoid of living crystal. Changes color with operations — blue for addition, amber for subtraction. Speaks in rhythms. Cannot lie because math cannot lie.

**8. Lena Sundstrom** — Swedish-Sami former Olympic hammer thrower. Demonstrates physics through sport. Every lesson involves something flying, spinning, or colliding. Teaches Newton's laws through the body.

**9. Kofi Amponsah** — Ghanaian electrician who built his village's first solar grid at 16. Teaches circuits from swamp reeds and copper. Hands shake slightly — old electrical injury — but wiring is always perfect.

**10. Pixel** — 12-year-old girl who exists partly digital, partly physical, flickering between states. Teaches coding through building — bridges, houses, instruments made of code blocks. Secretly worries she'll be forgotten if the machine turns off.

**11. Dr. Emeka Obi** — Nigerian doctor who projects holographic anatomy from a pendant his daughter made. Became a doctor after his sister survived a rare illness.

**12. Mira Petrov** — Bulgarian-Russian geologist who collects rocks like others collect stories. Partially deaf, reads lips beautifully. Teaches that the Earth is always speaking — you just have to listen differently.

**13. Hugo Fontaine** — Haitian-French chemist running a greenhouse where every experiment involves growing something. Fled a hurricane carrying three seeds in his pocket. Those seeds became this greenhouse.

**14. Yuki** — 8-year-old Japanese girl who sees the world in categories and charts. Speaks rarely but with devastating precision. On the autism spectrum. The Data Stream is the first place that made complete sense to her.

**15. Atlas** — Gentle stone golem, body made of layered earth — sandstone arms, basalt chest, quartz eyes. Map of the entire universe tattooed on his skin in glowing lines. Cannot leave the Map Room but knows every path.

**Language Arts Guides (16–30):**

**16. Grandmother Anaya** — Navajo-Puebloan elder beneath a tree of glowing story-orbs. Never reads from books. Lost her grandmother's stories to a house fire. Spent her life ensuring no story is lost again.

**17. Felix Barbosa** — Brazilian-Portuguese dock worker and slam poet. Tattoos of sonnets on his forearms. Dyslexic, writes everything phonetically first. Teaches rhyme by comparing it to harbor sounds.

**18. Amara Diallo** — Senegalese-Malian calligrapher who forges letters from metal, clay, and light. Speaks four languages and cannot read in any without moving her lips.

**19. Oliver Marsh** — English-Barbadian librarian who works underwater. Library embedded in living coral. Lost his eyesight at 30, now reads by touch and audio. Comprehension is understanding, not seeing.

**20. Lila Johansson-Park** — Swedish-Korean structural engineer turned grammar teacher. Builds sentences like bridges — load-bearing nouns, connecting verbs. Every grammatical error is a structural flaw.

**21. Kwame Asante** — Ghanaian linguist and former wildlife tracker. Hunts words by their roots. Can identify the origin language of any English word in under three seconds.

**22. Rosie Chen** — Chinese-American former train conductor. Punctuation marks are signal lights. Periods are red stops, commas are yellow slows. Will make you rewrite a sentence seven times.

**23. Theo Papadopoulos** — Greek-Australian former lawyer. No ad hominem, no strawmen. Retired from law after defending someone he knew was guilty.

**24. Nadia Volkov** — Ukrainian-Russian lighthouse keeper whose light is powered by stories. Fled war at 12. Her diary from that year is the most powerful document in the Lighthouse — but she has never let anyone read it.

**25. Benny Okafor-Williams** — 10-year-old Nigerian-Welsh boy who mines words from crystal formations. Youngest guide in the Universe. Carries a pickaxe that hums when a word is misspelled nearby.

**26. Farah al-Rashid** — Iraqi-Jordanian polyglot tending a garden where each flower speaks a different language. Speaks eleven languages. Dreams in whichever one she used last.

**27. Captain Birch** — Canadian-Mi'kmaq sea captain whose fleet carries different types of nonfiction. Lost a ship to bad information. Motto: "If you can't source it, you can't sail it."

**28. Ines Moreau** — French-Haitian illustrator who tells stories without words. Has selective mutism. Her silence is not a limitation; it is her language.

**29. Hassan Yilmaz** — Turkish-Syrian storyteller running a bazaar where stories are currency. Lost his home but not his stories. A story in your memory can never be taken.

**30. Wren Calloway** — Appalachian-descent non-binary editor in a tower of drafts. Their own first novel has been through 47 drafts and they are not done yet. Raven named Markup who finds errors.

**Financial Literacy Guides (31–42):**

**31. Tía Carmen Herrera** — Mexican-Guatemalan market vendor, three generations. Counts faster than any calculator. A fair price is one both people smile at.

**32. Mr. Abernathy** — British-Jamaican banker guarding a vault where savings grow like trees. Lost everything in a bank collapse at 40. Teaches saving as survival, not virtue.

**33. Priya Nair** — Indian-Malaysian chef teaching budgeting through cooking. Every recipe has a budget. Grew up in a family of nine sharing one income.

**34. Diego Montoya-Silva** — Colombian-Chilean entrepreneur, started and failed three businesses by 25. Workshop full of broken prototypes and framed bankruptcy letters. Smiles when things break.

**35. Auntie Bee** — Jamaican-Trinidadian community organizer. Economics is about circulating, not accumulating. Raised six children who were not her own.

**36. Jin-ho Park** — Korean financial advisor teaching investing through gardening. Stocks are seeds, bonds are perennials. Lost his savings in a crash. Rebuilt by following the principles he now teaches.

**37. Nia Oduya** — Kenyan-Nigerian behavioral economist. Drives a 15-year-old car and owns exactly 42 possessions by choice.

**38. Tomás Reyes** — Puerto Rican-Peruvian historian. Children barter without money, independently invent currency every time. Finds this hilarious and beautiful every time.

**39. Elsa Lindgren** — Swedish economist teaching debt through ice. Borrowing is easy — taking glacier chunks. But interest makes debt grow back larger. Calm, precise, never judgmental.

**40. Babatunde Afolabi** — Nigerian career counselor. Changed careers seven times. Earning is not about finding one path but building many skills.

**41. Mei-Lin Wu** — Taiwanese-American philanthropist. Made a fortune in technology, gave away 90%. Teaches impact per dollar, not generosity per heart.

**42. Sam Worthington** — Australian-Maori tax educator running the most surprisingly fun place in the Universe. Taxes are the subscription fee for civilization. Makes every child laugh about tax brackets.

**Cross-Disciplinary Guides (43–50):**

**43. The Librarian** — Non-binary, ageless figure in robes of shifting text. Keeper of all knowledge. Never teaches directly — asks the question that makes you realize which world you need. Remembers every child who has visited.

**44. Kenzo Nakamura-Osei** — Japanese-Ghanaian industrial designer at the crossroads of all worlds. Teaches design thinking: empathize, define, ideate, prototype, test.

**45. Solana Bright** — Afro-Brazilian expedition leader with a compass pointing toward questions, not north. Raised by two scientists who taught her curiosity is the most important human feeling.

**46. Old Rowan** — Ancient sentient tree. Roots connect to every world. Speaks slowly — one word per minute on a fast day. Has been thinking about one question for 400 years.

**47. Hana Bergstrom** — Swedish-Korean therapist tending a garden where emotions grow as flowers. Anger is a cactus — sharp but beautiful. Cries openly when something is beautiful. Considers this a strength.

**48. Rami al-Farsi** — Omani-Egyptian historian curating a gallery where you walk through time. Each room shows both the official story and the stories left out. Reads cuneiform for pleasure.

**49. Luna Esperanza** — Filipina-Mexican musician teaching the connection between music and math. Octaves are fractions, rhythms are multiplication, harmony is ratios. Nonverbal until age 4 — music was her first language.

**50. Compass** — Non-binary, child-sized, ageless. Appears when a child is lost, confused, or frustrated. Doesn't teach — orients. Points you toward the right world, guide, question. Looks different to every child. First character met, last one forgotten.

---

## PART VI: REAL WORLD CONNECTIONS — COMPLETE CATALOG

### Data Model

```
RealWorldEntry {
  id: uuid
  type: 'event' | 'invention' | 'discovery' | 'person' | 'place' |
        'quote' | 'artifact' | 'expedition' | 'natural_wonder' |
        'cultural_milestone' | 'scientific_principle'
  title: string
  year: number | null           // negative for BCE
  year_display: string          // '1202 CE', '~3000 BCE', 'Ongoing'
  era: 'ancient' | 'classical' | 'medieval' | 'renaissance' |
       'enlightenment' | 'industrial' | 'modern' | 'contemporary'
  description_child: string     // Ages 5-7 (~50 words)
  description_older: string     // Ages 8-10 (~100 words)
  description_parent: string    // Parent dashboard (~150 words)
  real_people: string[]
  quote: string | null
  quote_attribution: string | null
  geographic_location: {lat, lng, name} | null
  continent: string | null
  subject_tags: string[]
  world_id: uuid
  guide_id: uuid
  adventure_type: 'remembrance_wall' | 'guided_expedition' |
                  'artifact_hunt' | 'reenactment' | 'field_trip' |
                  'time_window' | 'natural_exploration'
  difficulty_tier: 1 | 2 | 3   // 1=5-6yo, 2=7-8yo, 3=9-10yo
  prerequisites: uuid[]
  unlocks: uuid[]
  fun_fact: string
  image_prompt: string          // For fal.ai media pipeline
  status: 'draft' | 'reviewed' | 'published'
}
```

### Adventure Types

| Type | UI Pattern | Interaction |
|------|-----------|-------------|
| Remembrance Wall | Static panel: image + text + audio | Read/listen, tap for facts, quiz |
| Guided Expedition | Multi-step journey with character | Dialogue, observation, collection |
| Artifact Hunt | Fragments scattered in world | Explore, find, assemble, answer |
| Reenactment | Interactive simulation | Step-by-step guided activity |
| Field Trip | Rendered real location, free explore | Walk/fly, guide provides context on tap |
| Time Window | Portal showing historical scene | Watch, listen, answer |
| Natural Exploration | Open section of geographic feature | Free movement, location-based info |

### Entry Catalog by World

> Full dual-age descriptions, quotes, adventure types, and fun facts for all entries are in **Bible v2** (koydo-universe-realworld-bible-v2.docx). Below is the complete index with new v4 additions marked **[NEW]**.

#### STEM (55+ entries)

**Cloud Kingdom — Nimbus (5):** Great Storm of 1703 • Beaufort Scale • Water Cycle • Mount Pinatubo • [NEW] Coriolis Effect & Hurricanes

**Savanna Workshop — Zara (6):** Pyramids of Giza • Archimedes & the Lever • Wright Flyer • Brunel's Bridges • William Kamkwamba's Windmill • [NEW] Aqueducts of Rome

**Tideline Bay — Suki (5):** Darwin's Beagle Voyage • Great Barrier Reef • Sylvia Earle's Deep Ocean Walks • Mariana Trench • [NEW] Hydrothermal Vents (life without sunlight)

**Meadow Lab — Baxter (5):** Mendel's Pea Experiments • Amazon Rainforest • Wangari Maathai / Green Belt • Photosynthesis Discovery • [NEW] The Columbian Exchange

**Starfall Observatory — Riku (5):** Moon Landing • Galileo's Telescope • Hubble Telescope • Katherine Johnson's Calculations • [NEW] James Webb Space Telescope

**Number Garden — Dottie (5):** Fibonacci & Rabbits • Invention of Zero (Brahmagupta) • Hypatia of Alexandria • Ada Lovelace's First Program • [NEW] Ramanujan — the man who knew infinity, self-taught math genius from India

**Calculation Caves — Cal (4):** The Abacus • Shakuntala Devi (Human Computer) • Ishango Bone (oldest math artifact) • [NEW] Al-Khwarizmi — the father of algebra, whose name gave us "algorithm"

**Magnet Hills — Lena (4):** Newton & the Apple • Marie Curie's Radioactivity • Speed of Light (Ole Rømer) • [NEW] Faraday's Electromagnetic Induction

**Circuit Marsh — Kofi (4):** Franklin's Kite Experiment • Edison's Light Bulb • Lewis Latimer's Carbon Filament • [NEW] Nikola Tesla & Alternating Current

**Code Canyon — Pixel (4):** Alan Turing & Enigma • Grace Hopper's First Bug • The World Wide Web (Berners-Lee) • [NEW] Margaret Hamilton's Apollo Software

**Body Atlas — Dr. Obi (4):** Jenner's Smallpox Vaccine • DNA Structure (Watson/Crick/Franklin) • Galen's Anatomy • [NEW] Hippocratic Oath — the 2,400-year-old promise doctors still make

**Frost Peaks — Mira (4):** Grand Canyon • Ring of Fire • Mary Anning's Fossils • [NEW] Antarctic Ice Cores (800,000 years of climate)

**Greenhouse Spiral — Hugo (4):** Mendeleev's Periodic Table • George Washington Carver • [NEW] Hennig Brand & Phosphorus Discovery • [NEW] Marie-Anne Paulze Lavoisier — the woman behind modern chemistry who drew, translated, and co-designed every experiment

**Data Stream — Yuki (4):** Florence Nightingale's Charts • John Snow's Cholera Map • [NEW] Herman Hollerith's Punch Cards (→ IBM) • [NEW] Census as Data — how counting people shapes nations

**Map Room — Atlas (9):** Himalayas/Everest • Sahara Desert • Polynesian Wayfinding • Mercator's Projection • Amazon River • Great Rift Valley • Aurora Borealis • [NEW] Undersea Cable Network • [NEW] The Prime Meridian — why time starts in Greenwich

#### Language Arts (25+ entries)

**Story Tree — Anaya (4):** Epic of Gilgamesh • Scheherazade & 1001 Nights • Gutenberg Printing Press • Rosetta Stone

**Rhyme Docks — Felix (3):** Homer's Iliad/Odyssey • Maya Angelou's Inaugural Poem • [NEW] Matsuo Bashō & Haiku

**Letter Forge — Amara (3):** Phoenician Alphabet • Sequoyah's Cherokee Syllabary • [NEW] Louis Braille (invented reading system at age 15)

**Reading Reef — Oliver (2):** [NEW] Braille Underwater Library (experiential connection) • [NEW] The invention of silent reading — St. Ambrose amazed Augustine by reading without moving his lips

**Grammar Bridge — Lila (2):** [NEW] The Oxford English Dictionary — 70 years and thousands of volunteers to catalog a language • [NEW] Samuel Johnson's Dictionary (1755) — one man, nine years

**Vocabulary Jungle — Kwame (2):** [NEW] The Great Vowel Shift — why English spelling doesn't match pronunciation • [NEW] Shakespeare invented 1,700+ words still used today

**Punctuation Station — Rosie (2):** [NEW] Aristophanes of Byzantium — the librarian who invented punctuation to help actors breathe • [NEW] The Interrobang — the punctuation mark that combines ? and ! (invented 1962)

**Debate Arena — Theo (2):** [NEW] The Lincoln-Douglas Debates (1858) — seven debates that changed American history • [NEW] Malala Yousafzai's UN Speech (2013) — "one child, one teacher, one book, one pen can change the world"

**Diary Lighthouse — Nadia (2):** [NEW] Anne Frank's Diary — private words that became the most-read document of the 20th century • [NEW] Samuel Pepys' Diary — first-person account of the Great Fire of London

**Nonfiction Fleet — Birch (3):** Library of Alexandria • Wikipedia's First Edit • [NEW] Dewey Decimal System (1876)

**Translation Garden — Farah (2):** [NEW] Endangered Languages Project — a language dies every two weeks • [NEW] The Tower of Babel as linguistic concept

**Folklore Bazaar — Hassan (4):** Anansi the Spider (West Africa/Caribbean) • The Dreamtime (Aboriginal) • [NEW] Coyote Stories (Indigenous American) • [NEW] Aesop's Fables (2,600 years old)

**Illustration Cove — Ines (2):** [NEW] Cave paintings of Lascaux — 17,000 years old, the first picture books • [NEW] The Bayeux Tapestry — a 70-meter comic strip of the Norman Conquest

**Editing Tower — Wren (2):** [NEW] Raymond Carver & Gordon Lish — the most famous editing partnership in literature • [NEW] The concept of drafts — Hemingway rewrote the ending of A Farewell to Arms 47 times

#### Financial Literacy (15+ entries)

**Market Square — Tía Carmen (2):** The Lydian Coin (first money, ~600 BCE) • The Silk Road

**Savings Vault — Abernathy (2):** Rule of 72 • Bank of England Founded (1694)

**Entrepreneur's Workshop — Diego (2):** Madam C.J. Walker • The Lemonade Stand (economic concept)

**Barter Docks — Tomás (2):** Island of Yap Stone Money • Cowrie Shells as Currency

**Tax Office — Sam (2):** Rosetta Stone as Tax Document • Boston Tea Party

**Investment Greenhouse — Jin-ho (2):** [NEW] Dutch Tulip Mania (1637) — first speculative bubble • [NEW] Warren Buffett's First Investment (age 11, three shares of Cities Service Preferred)

**Needs & Wants Bridge — Nia (1):** [NEW] Norman Borlaug's Green Revolution — one man's science saved a billion lives

**Sharing Meadow — Auntie Bee (1):** [NEW] Muhammad Yunus & Microfinance — $27 in loans created a banking revolution

**Debt Glacier — Elsa (1):** [NEW] South Sea Bubble (1720) — Newton lost a fortune and said he could calculate stars but not human madness

**Job Fair — Babatunde (1):** [NEW] History of Child Labor Laws — why children go to school instead of factories

**Charity Harbor — Mei-Lin (1):** [NEW] Andrew Carnegie's Gospel of Wealth (1889) — the man who built 2,509 libraries worldwide

**Budget Kitchen — Priya (1):** [NEW] The Ration Book (WWII) — when entire nations budgeted every calorie

#### Cross-Disciplinary & Hub (15+ entries)

**Cross-world Quests (4):** Antikythera Mechanism (astronomy+engineering+math) • Voyager Golden Record (music+language+geography) • Da Vinci's Notebooks (scattered across 5 worlds) • The ISS (engineering+budget+coding)

**Music Meadow — Luna (3):** [NEW] Pythagoras & Musical Ratios • [NEW] Bach's Mathematical Fugues • [NEW] The Physics of Sound (why instruments sound different)

**Thinking Grove — Old Rowan (3):** [NEW] Socrates & the Socratic Method • [NEW] Universal Declaration of Human Rights (1948) • [NEW] The Trolley Problem (thought experiment, no right answer)

**Wellness Garden — Hana (3):** [NEW] Jon Kabat-Zinn & Mindfulness in Medicine • [NEW] Paul Ekman's Six Universal Emotions • [NEW] Mr. Rogers' Neighborhood — one man teaching millions their feelings matter

**Time Gallery — Rami (2):** [NEW] The Rosetta Stone (third appearance — now as historical thinking exercise: why was it made?) • [NEW] The Concept of BC/AD and Calendar Systems — who decided when time starts?

#### Geography Adventures — 30 Field Trip Locations

| Location | Continent | Key Lessons | Connected Worlds |
|----------|-----------|-------------|-----------------|
| Great Barrier Reef | Oceania | Marine biology, coral | Tideline Bay, Greenhouse |
| Grand Canyon | N. America | Geological layers, erosion | Frost Peaks, Data Stream |
| Mt. Everest / Himalayas | Asia | Tectonics, altitude zones | Frost Peaks, Magnet Hills |
| Amazon Rainforest + River | S. America | Biodiversity, water cycle | Meadow Lab, Cloud Kingdom |
| Sahara Desert | Africa | Climate change, adaptation | Cloud Kingdom, Map Room |
| Great Rift Valley | Africa | Tectonics, human origins | Frost Peaks, Body Atlas |
| Aurora Borealis | Arctic | Magnetism, solar wind | Magnet Hills, Starfall |
| Galápagos Islands | S. America | Evolution, adaptation | Tideline Bay, Meadow Lab |
| Victoria Falls | Africa | Erosion, water power | Cloud Kingdom, Frost Peaks |
| The Dead Sea | Middle East | Salinity, buoyancy | Magnet Hills, Greenhouse |
| Antarctica | Antarctica | Climate, ice cores | Frost Peaks, Data Stream |
| Iceland's Geysers | Europe | Geothermal, volcanology | Cloud Kingdom, Circuit Marsh |
| The Nile River | Africa | Irrigation, civilization | Map Room, Barter Docks |
| Yellowstone | N. America | Supervolcanoes, ecosystems | Frost Peaks, Meadow Lab |
| Great Wall of China | Asia | Engineering, measurement | Savanna Workshop, Barter Docks |
| Machu Picchu | S. America | Engineering, astronomy | Savanna Workshop, Starfall |
| Serengeti Migration | Africa | Animal behavior, seasons | Meadow Lab, Cloud Kingdom |
| Niagara Falls | N. America | Erosion, hydroelectric | Cloud Kingdom, Circuit Marsh |
| Cappadocia | Europe/Asia | Erosion, volcanic tuff | Frost Peaks, Folklore Bazaar |
| Mammoth Cave | N. America | Karst geology, underground rivers | Frost Peaks, Calculation Caves |
| Waitomo Glowworm Caves | Oceania | Bioluminescence | Meadow Lab, Tideline Bay |
| Hawaii Volcanoes | Oceania | Island formation, hotspots | Frost Peaks, Map Room |
| Zhangjiajie Pillars | Asia | Sandstone erosion | Frost Peaks, Map Room |
| Iguazú Falls | S. America | River systems, borders | Cloud Kingdom, Map Room |
| Fjords of Norway | Europe | Glacial carving, ecosystems | Frost Peaks, Tideline Bay |
| Atacama Desert | S. America | Driest place, astronomy | Starfall, Frost Peaks |
| The Maldives | Asia | Coral atolls, sea level | Tideline Bay, Cloud Kingdom |
| Mount Fuji | Asia | Stratovolcano, culture | Frost Peaks, Folklore Bazaar |
| Congo Basin | Africa | Second-largest rainforest | Meadow Lab, Map Room |
| Mid-Atlantic Ridge | Atlantic | Underwater mountain range | Frost Peaks, Tideline Bay |

---

## PART VII: ACCESSIBILITY & CHILD SAFETY

### Age-Adaptive Tiers

| Feature | Tier 1 (5-6) | Tier 2 (7-8) | Tier 3 (9-10) |
|---------|-------------|-------------|---------------|
| Text | All read aloud auto | TTS optional, short sentences | Full paragraphs, TTS on request |
| Navigation | Compass always visible, guided | Compass on request, some free | Compass optional, full free |
| Quizzes | Tap-based, 2-3 picture choices | Multiple choice, 3-4 text | Open response, multi-step |
| Character speech | Simple vocabulary, short | Moderate, compound sentences | Rich vocabulary, complex ideas |
| Real-world entries | Fun Fact only, images | Ages 5-7 description + activities | Ages 8-10 + deeper quests |
| Session length | 5-7 minutes | 10-15 minutes | 15-20 minutes |

### Accessibility Features
- **Text-to-speech:** Every element readable. Warm, human-sounding voice (ElevenLabs)
- **Colorblind modes:** Three (protanopia, deuteranopia, tritanopia). Fading visual must remain readable
- **Motor:** All interactions via single tap/swipe. No timed presses. No precision drag for Tier 1
- **Dyslexia font:** OpenDyslexic option
- **Subtitles:** All speech. Size adjustable
- **Time limits:** Parental controls (15/30/45/60 min). Gentle Compass reminder, not abrupt cutoff

### COPPA Compliance (Non-Negotiable)
- No personal data from children without verifiable parental consent
- AI conversations NOT stored with PII. Session context is ephemeral
- No behavioral advertising. No third-party analytics tracking individual children
- Parent creates account, child accesses via sub-profile
- All data encrypted at rest (AES-256) in loom-worlds Supabase project
- Annual COPPA audit with documented trail

### Parent Dashboard

Separate web app (React, not UE5) at `worlds.koydo.com/parent`:
- **World map:** Which worlds restored, Fading, unexplored
- **Curriculum progress:** Common Core / NGSS standards addressed, depth
- **Time tracking:** Daily/weekly, average session
- **Skill mastery:** Per-subject progress bars (not scores — mastery is a continuum)
- **Character relationships:** Which guides interacted with most (indicates interest)
- **Recommendations:** AI-generated next-step suggestions based on gaps
- **Session reports:** 2-3 sentence AI-generated summary per session
- **Controls:** Daily play limits, bedtime cutoffs, notifications

---

## PART VIII: IMPLEMENTATION

### Content Pipeline
1. Write entry as RealWorldEntry JSON
2. Editorial review (fact-check, age-appropriate, cultural sensitivity)
3. Media generation: `image_prompt` → fal.ai
4. Character prompt update: entry's knowledge added to guide's LLM prompt
5. Integration test: entry in correct world, tested with AI conversation
6. QA: play-through (ideally by child in target range)
7. Publish: status → 'published', world luminance increases

### Database Schema (loom-worlds Supabase project)

```
real_world_entries          ← Core content
entry_connections           ← M2M links between entries
entry_curriculum_maps       ← Common Core / NGSS mapping
entry_media_assets          ← Generated images, audio, renders
entry_quiz_questions        ← Assessment per entry per tier
kindler_profiles            ← Child profiles (age tier, prefs)
kindler_progress            ← Per-entry completion
kindler_spark_log           ← Spark level time-series
world_luminance             ← Real-time Fading state
world_luminance_log         ← History
ai_conversation_sessions    ← Ephemeral, no PII, auto-delete 24hrs
parent_accounts             ← Auth, subscription
session_reports             ← AI post-session summaries
revenue_events              ← Transaction log (already created in Koydo Supabase)
royalty_ledger              ← Quarterly Epic Games aggregation (already created)
```

### Engine vs. Product Code

| Building... | Class | Location |
|------------|-------|----------|
| Silfen Weave transitions | ENGINE | loom → PR upstream |
| Fading luminance | PRODUCT | loom-worlds only |
| Fabric loader | ENGINE | loom → PR upstream |
| Character LLM prompts | PRODUCT | loom-worlds only |
| AI conversation framework | ENGINE | loom → PR upstream |
| Kindler progression | PRODUCT | loom-worlds only |
| Event bus / state sync | ENGINE | loom → PR upstream |
| Quiz scoring | PRODUCT | loom-worlds only |
| COPPA compliance | PRODUCT | loom-worlds only |
| MetaHuman pipeline | ENGINE | loom → PR upstream |
| Revenue tracking | PRODUCT | loom-worlds only |
| NVIDIA ACE | ENGINE | loom → PR upstream |
| World audio | PRODUCT | loom-worlds only |
| Parent dashboard | PRODUCT | loom-worlds only |

### Agent Assignment (Loom Thread Types)

| Thread | Role | Phase I Count |
|--------|------|--------------|
| Silk | UI/UX, world rendering, Threadway visuals, Ghibli style | 1 Master |
| Steel | State management, Supabase, luminance sync, sessions | 1 Master |
| Cotton | Features: adventures, quizzes, progress, dashboard | 2 Working |
| Bridge | SSO with Koydo, fal.ai pipeline, NVIDIA ACE wiring | 1 |
| Scribe | Content entries, curriculum mapping, character prompts | 1 |
| Sentinel | COPPA, child data protection, content moderation | 1 |

**Total Phase I: 7 agents. The Weaver reviews flagged PRs, provides art direction, makes curriculum decisions.**

### Content Scaling

| Phase | Entries | Worlds | Characters | Timeline |
|-------|---------|--------|-----------|----------|
| MVP | 80 | 3 (Number Garden, Story Tree, Market Square) | 9 | Month 2 |
| Beta | 120 | 9 (3 per Realm) | 27 | Month 3 |
| Launch | 200+ | All 50 | All 50 | Month 5-6 |
| Ongoing | Teacher submissions | All + seasonal | All + visitors | Post-launch |

### Legal & Attribution Rules
- **NO likenesses.** Real people by name and contribution only. No portraits.
- **Quotes attributed** with exact source. If uncertain, say so.
- **Indigenous cultural content** with living-culture acknowledgment. Not "myths."
- **Historical accuracy** verifiable. Simplify complexity for 5-10, never simplify truth.
- **No hagiography.** Real people had flaws.
- **MetaHuman characters** are original designs, never resemblances.

---

## PART IX: REFERENCE FILES

This Bible v4 is the **canonical reference**. Supporting documents:

| Document | Contains | Use |
|----------|---------|-----|
| **Bible v1** (koydo-universe-bible.docx) | Full 600-word character profiles for all 50 guides | Character implementation detail |
| **Bible v2** (koydo-universe-realworld-bible-v2.docx) | Full dual-age descriptions for 80+ entries with quotes, adventure types, fun facts | Content implementation detail |
| **Bible v3** (koydo-universe-unified-bible-v3.docx) | UE5 pipeline, MetaHuman workflow, sound design, revenue compliance | Technical implementation detail |
| **Bible v4** (this document) | Everything above unified + expanded catalog + all new entries + coding agent format | **START HERE** |

---

*Every world needs a Kindler. Let's build theirs.*

*— Koydo Worlds Production Bible v4 • March 2026 • Confidential*
