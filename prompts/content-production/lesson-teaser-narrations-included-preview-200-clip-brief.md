# AGENT BRIEF: Koydo Lesson Teaser Narrations — 200 Clips
**Project:** Koydo EdTech — Included Preview Narrations  
**Supabase Project:** `osnxbuusohdzzcrakavn` (us-east-1)  
**Date:** March 10, 2026  
**Scope:** 200 clips across 4 age groups, 20 subjects  
**ElevenLabs Cost:** ~$33.50 worst case | ~$0–$8 if billing cycle resets (139,600 chars < 500k free)  
**Budget ceiling:** $50 ✓  
**Strategy:** Included free preview (not paywalled) — drives engagement and demonstrates quality

---

## Age Group Distribution (younger-weighted)

| Age Group | Clips | Voice | Character |
|---|---|---|---|
| **Grades K–2** | 60 | Callum `N2lVS1w4EtoT3dr4eOWO` | Warm, slow, wonder-filled |
| **Grades 3–5** | 60 | Charlotte `XB0fDUnXU5powFXDhCwa` | Friendly, clear, encouraging |
| **Grades 6–8** | 50 | Daniel `onwK4e9ZLuTAKqWW03F9` | Confident, curious, neutral |
| **Grades 9–12** | 30 | Rachel `21m00Tcm4TlvDq8ikWAM` | Crisp, intelligent, engaging |

**Model:** `eleven_multilingual_v2`  
**Voice settings:**
```json
{ "stability": 0.52, "similarity_boost": 0.80, "style": 0.20, "use_speaker_boost": true }
```
Stability overrides: K-2 → 0.48, 3-5 → 0.50, 6-8 → 0.58, 9-12 → 0.65

---

## Subject Distribution (20 subjects × avg 10 clips)

| Subject | Total Clips | K-2 | 3-5 | 6-8 | 9-12 |
|---|---|---|---|---|---|
| Science | 10 | 3 | 3 | 2 | 2 |
| Math | 10 | 3 | 3 | 2 | 2 |
| Language Arts | 10 | 3 | 3 | 2 | 2 |
| Social Studies US | 10 | 3 | 3 | 2 | 2 |
| Biology | 8 | 2 | 2 | 2 | 2 |
| History Worldwide | 8 | 2 | 2 | 2 | 2 |
| Financial Literacy | 8 | 2 | 2 | 2 | 2 |
| Arts | 8 | 2 | 2 | 2 | 2 |
| Astronomy | 8 | 2 | 2 | 2 | 2 |
| Coding | 8 | 2 | 2 | 2 | 2 |
| Geography | 6 | 2 | 2 | 2 | 0 |
| Chemistry | 6 | 2 | 2 | 2 | 0 |
| Physics | 6 | 2 | 2 | 2 | 0 |
| Farming | 6 | 2 | 2 | 2 | 0 |
| Household Management | 6 | 2 | 2 | 2 | 0 |
| Advanced Math | 6 | 2 | 2 | 2 | 0 |
| Reading | 5 | 2 | 2 | 1 | 0 |
| General Relativity | 5 | 2 | 1 | 1 | 1 |
| Social Studies World | 5 | 2 | 2 | 1 | 0 |
| Exam Prep | 5 | 0 | 1 | 2 | 2 |
| **TOTAL** | **200** | **60** | **60** | **50** | **30** |

---

## Step 1 — DB Migration

```sql
CREATE TABLE IF NOT EXISTS lesson_narrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('grades-k2','grades3-5','grades6-8','grades9-12')),
  script TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INTEGER,
  char_count INTEGER,
  cost_usd NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generated','failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_key, age_group)
);
CREATE INDEX IF NOT EXISTS idx_lesson_narrations_status ON lesson_narrations(status);
CREATE INDEX IF NOT EXISTS idx_lesson_narrations_subject ON lesson_narrations(subject);
CREATE INDEX IF NOT EXISTS idx_lesson_narrations_age ON lesson_narrations(age_group);
```

---

## Step 2 — Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-audio', 'lesson-audio', true)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 3 — All 200 Scripts + DB Seed SQL

### SCIENCE (10 clips)

---
**S-01 · What Is Matter? · K-2 · Callum**
```
Everything around you — your chair, your water bottle, the air you're breathing right now — is made of something called matter. 

Matter is anything that takes up space. Your hand is matter. Your shoes are matter. Even the invisible air is matter! 

Scientists found out that all matter is made of tiny, tiny pieces called atoms. They're so small you could never see them — not even with the best magnifying glass. But everything is built from them.

Solid, liquid, gas — those are the three states matter can be in. Water can be all three! Ice is solid, water is liquid, and steam is gas.

Want to find out more about matter? This lesson is waiting for you.
```

---
**S-02 · The Water Cycle · K-2 · Callum**
```
Here's a question: where does rain come from?

Water from puddles, lakes, and oceans gets warmed by the sun and floats up into the sky as tiny invisible bits called water vapor. Up high where it's cold, those bits stick together to make clouds. When there's enough water in a cloud, it falls back down as rain or snow.

Then it starts all over again. Up, up into the sky. Down as rain. Up again. It never stops!

This amazing circle has a name: the water cycle. And it's been going on for millions and millions of years — the same water, over and over again.

Ready to follow a raindrop on its journey? Jump into this lesson!
```

---
**S-03 · Animals and Their Habitats · K-2 · Callum**
```
A fish needs water. A polar bear needs ice and cold. A desert lizard needs sand and heat.

Every animal lives in a place that's just right for it. That special place is called a habitat. A habitat gives an animal everything it needs — food, water, shelter, and the right temperature.

Some animals live in forests. Some live in oceans. Some live underground, or in rivers, or high up in mountains. Each habitat is home to animals perfectly suited to live there.

But what happens when a habitat changes? The animals have to adapt, move, or they can be in danger.

Habitats are amazing — and every one of them is worth protecting.

Explore your first habitat in this lesson!
```

---
**S-04 · Forces and Motion · Grades 3–5 · Charlotte**
```
Every time something moves — a ball rolling, a door swinging, a leaf falling — a force is involved.

A force is a push or a pull. Forces can make things speed up, slow down, change direction, or stop completely. Gravity is a force that pulls everything downward. Friction is a force that slows things down when surfaces rub together.

Sir Isaac Newton figured out the rules for how forces work over 300 years ago — and we still use them today. His first law says that objects keep doing what they're doing unless a force acts on them. A ball sitting on the floor stays there until you kick it. A rolling ball keeps rolling until friction and air resistance slow it down.

Forces are everywhere. Once you know how to spot them, you'll see physics in everything.

Unlock this lesson to start experimenting.
```

---
**S-05 · The Scientific Method · Grades 3–5 · Charlotte**
```
Scientists don't just guess. They have a system — a careful, step-by-step process for figuring out how things really work.

It starts with a question. Then you make a prediction, called a hypothesis. Then you design an experiment to test it. You collect data, look for patterns, and draw a conclusion. Then — and this is important — you share your findings so other scientists can check your work.

That process is called the scientific method. It's the reason we trust science: not because scientists are always right, but because the method catches mistakes and builds on what's proven.

You can use the scientific method on everyday questions. Does a plant grow faster with more sunlight? Does cold water freeze before warm water?

Let's find out. Unlock this lesson.
```

---
**S-06 · Ecosystems · Grades 3–5 · Charlotte**
```
A forest isn't just trees. It's also the deer eating the leaves, the wolves hunting the deer, the mushrooms breaking down fallen logs, and the rain soaking into soil that feeds the roots.

Everything in an ecosystem is connected. An ecosystem is a community of living things — plants, animals, fungi, bacteria — all interacting with each other and with the non-living things around them: water, soil, sunlight, temperature.

Change one thing and the whole system shifts. When European rabbits were introduced to Australia, they ate so much vegetation that other animals lost their food source and habitat collapsed in some regions.

Ecosystems can be resilient — but they have limits.

The full lesson maps out how ecosystems stay balanced, and what happens when they don't. Unlock it.
```

---
**S-07 · Cells: The Building Blocks of Life · Grades 6–8 · Daniel**
```
Every living thing — every plant, every animal, every bacterium — is made of cells. Your body contains approximately 37 trillion of them.

Cells are the smallest unit of life. Each one carries out the fundamental functions: taking in nutrients, converting energy, responding to signals, and reproducing. Plant cells have a rigid cell wall and chloroplasts for photosynthesis. Animal cells have a flexible membrane and mitochondria for converting glucose into usable energy.

The nucleus holds the DNA — the instruction manual for building and running the cell. Most human cells contain about 3 billion base pairs of DNA, tightly wound and packaged into 23 pairs of chromosomes.

Cell biology is where chemistry becomes life.

The full lesson covers organelles, cell division, and the differences between prokaryotic and eukaryotic cells. Unlock it.
```

---
**S-08 · Energy Transformations · Grades 6–8 · Daniel**
```
Energy cannot be created or destroyed. It can only change form. That single principle — the law of conservation of energy — underlies nearly everything in physics.

Chemical energy in your food becomes kinetic energy when you run. Electrical energy becomes light energy in a bulb. Solar energy becomes chemical energy through photosynthesis. Each transformation follows the same rule: the total energy in the system stays constant, though some always disperses as heat.

This is why no machine is perfectly efficient. Every transformation loses some energy to heat — which is why engines get warm and why perpetual motion machines are impossible.

Understanding energy transformations means understanding why anything moves, grows, shines, or powers up.

The full lesson covers all major energy types, transformation chains, and efficiency calculations. Unlock it.
```

---
**S-09 · Genetics and Heredity · Grades 9–12 · Rachel**
```
Every physical trait you carry — your eye color, your height, your susceptibility to certain diseases — is encoded in approximately 20,000 genes distributed across 23 pairs of chromosomes.

Heredity is the transmission of genetic information from parent to offspring through reproduction. Each parent contributes one chromosome from each pair, meaning offspring inherit a unique combination of alleles — variant forms of each gene. Dominant alleles mask recessive ones when both are present; recessive traits only appear in homozygous individuals.

Mendel's laws of segregation and independent assortment, derived from pea plant experiments in the 1860s, still accurately predict inheritance patterns for simple single-gene traits. Modern molecular genetics has extended this to polygenic inheritance, epigenetic regulation, and the interaction between genotype and environment.

The full lesson covers Mendelian genetics, probability calculations, pedigree analysis, and the molecular basis of gene expression. Unlock it.
```

---
**S-10 · Climate Systems · Grades 9–12 · Rachel**
```
Earth's climate is a coupled system of five interacting components: the atmosphere, hydrosphere, cryosphere, lithosphere, and biosphere. Each exchanges energy and matter with the others continuously, producing the complex, regionally variable climate patterns we observe.

Solar energy drives the system. Differential heating between the equator and poles generates atmospheric circulation cells, ocean currents, and prevailing wind patterns. The greenhouse effect — the capacity of certain atmospheric gases to absorb and re-emit infrared radiation — moderates surface temperatures, making Earth habitable.

Anthropogenic emissions have increased atmospheric CO₂ concentration from approximately 280 ppm pre-industrially to over 420 ppm today, enhancing the greenhouse effect and driving a measurable increase in global mean surface temperature with cascading effects on precipitation, sea level, and ecosystem distribution.

The full lesson covers radiative forcing, feedback mechanisms, climate modeling, and the distinction between weather and climate. Unlock it.
```

---

### MATH (10 clips)

---
**M-01 · Counting and Numbers · K-2 · Callum**
```
One, two, three, four, five...

Numbers are everywhere! We use them to count cookies, measure how tall we are, tell time, and keep score in games.

But here's something amazing: numbers go on forever. After one million comes one million and one. After one billion comes one billion and one. They never, ever stop.

And numbers can do things. You can add them together to make a bigger number. You can take some away. You can share them equally.

Learning numbers is like learning a secret language — one that lets you understand the whole world a little better.

This lesson is all about numbers and what they can do. Let's count!
```

---
**M-02 · Shapes and Geometry · K-2 · Callum**
```
Look around the room you're in right now. Can you spot a circle? A square? A triangle?

Shapes are everywhere! Windows are rectangles. Wheels are circles. Sandwiches are triangles. Pizza slices too!

Every shape has something special about it. A square has four sides that are all the same length. A triangle has three sides and three corners. A circle has no corners at all — just one perfectly round edge.

When shapes go from flat to three-dimensional, they become solids! A square becomes a cube. A circle becomes a sphere. A triangle becomes a pyramid.

Shapes are the building blocks of everything we build, draw, and design.

Ready to explore them? This lesson is just for you!
```

---
**M-03 · Addition and Subtraction · K-2 · Callum**
```
If you have three apples and someone gives you two more — how many do you have?

You already know how to figure that out! That's addition — putting amounts together to find the total.

And if you had five apples and you ate two — you'd have three left. That's subtraction — taking away to find what remains.

Addition and subtraction are the very first tools in your math toolkit. And once you have them, you can start solving real problems — splitting snacks fairly, figuring out how much money you have, counting how many more days until your birthday.

Numbers are your friends. Let's practice together in this lesson!
```

---
**M-04 · Multiplication and Division · Grades 3–5 · Charlotte**
```
Multiplication is a shortcut. Instead of adding four plus four plus four plus four, you can just say four times four and get the same answer — sixteen.

When things come in equal groups, multiplication finds the total fast. Three rows of six chairs is three times six — eighteen chairs, no counting required.

Division works the other way: if you have eighteen chairs and want three equal rows, division tells you there'll be six in each row.

These two operations are inverses — they undo each other. That relationship is one of the most useful patterns in all of math.

Once you know your multiplication facts, dozens of harder math topics suddenly become easier to handle.

The full lesson covers all the times tables, division strategies, and word problems. Let's unlock it!
```

---
**M-05 · Fractions · Grades 3–5 · Charlotte**
```
Imagine a pizza cut into eight equal slices. You eat three. What part of the pizza did you eat?

Three out of eight — written as three eighths. That's a fraction: a number that describes a part of a whole.

Fractions are everywhere. Half a cup of milk. A quarter of an hour. Three quarters of the way to school. The bottom number — the denominator — tells you how many equal parts the whole is divided into. The top number — the numerator — tells you how many of those parts you have.

Fractions can be added, subtracted, multiplied, and compared. You can even turn them into decimals and percentages.

Fractions are one of the most useful things you'll learn in elementary math. Unlock this lesson to master them.
```

---
**M-06 · Ratios and Proportions · Grades 3–5 · Charlotte**
```
For every two cups of flour in a recipe, you need one cup of sugar. If you double the recipe, you need four cups of flour — and two cups of sugar. The relationship stays the same even as the amounts change.

That's a ratio: a comparison between two quantities. And when ratios stay equal as amounts scale up or down, that's a proportion.

Ratios and proportions are used in cooking, in maps, in mixing paint colors, in calculating speed, and in understanding scale models. If a map says one centimeter equals ten kilometers, you're using a ratio to understand distance.

Once you can think in ratios, you'll notice them in almost everything around you.

The full lesson covers ratio notation, equivalent ratios, and proportion problems. Unlock it.
```

---
**M-07 · The Pythagorean Theorem · Grades 6–8 · Daniel**
```
In any right triangle, the square of the longest side equals the sum of the squares of the other two sides.

That's the Pythagorean theorem — and it's been used for over 2,500 years. Ancient Egyptians used a version of it to build perfect right angles when constructing temples. Modern engineers use it constantly.

If you know any two sides of a right triangle, you can always find the third. The formula — a squared plus b squared equals c squared — is simple, powerful, and exact.

Beyond triangles, the theorem extends into coordinate geometry, distance formulas, and the foundations of trigonometry. Every time you calculate how far two points are from each other on a grid, you're using it.

The full lesson covers proofs, applications, and worked examples. Unlock it.
```

---
**M-08 · Statistics and Data · Grades 6–8 · Daniel**
```
Data is everywhere — test scores, temperatures, heights, prices, sports statistics. Statistics is the set of tools we use to make sense of it.

Measures of center — mean, median, and mode — describe where most of the data clusters. Measures of spread — range, variance, standard deviation — describe how much the data varies. Together they give you a summary of an entire dataset in just a few numbers.

But statistics can also mislead. A carefully chosen average can make a situation look better or worse than it really is. Understanding what different statistics actually measure — and what they hide — is as important as knowing how to calculate them.

The full lesson covers calculating and interpreting all major statistical measures, plus how to read and build data visualizations. Unlock it.
```

---
**M-09 · Calculus: Limits and Derivatives · Grades 9–12 · Rachel**
```
Calculus was invented independently by Newton and Leibniz in the 17th century to solve problems that algebra couldn't — specifically, how to describe things that change continuously.

The derivative is the fundamental tool. It gives the instantaneous rate of change of a function at any point: how fast something is moving at a specific moment, not on average. Formally, it's defined as the limit of the difference quotient as the interval approaches zero — a precise way of asking what happens when you zoom in infinitely close to a point on a curve.

Derivatives have rules: the power rule, product rule, quotient rule, chain rule. These allow differentiation of complex functions without computing limits from scratch every time.

Physics, economics, biology, and engineering all rely on calculus to model dynamic systems.

The full lesson covers limit definition, differentiation rules, and applications including optimization and motion. Unlock it.
```

---
**M-10 · Probability Theory · Grades 9–12 · Rachel**
```
Probability is the mathematics of uncertainty — and it turns out to be one of the most practically important fields in all of mathematics.

Formally, probability assigns a number between zero and one to the likelihood of an event, where zero means impossible and one means certain. The rules — additivity, complementarity, conditional probability, Bayes' theorem — form a rigorous framework for reasoning under uncertainty.

Bayes' theorem is particularly powerful: it describes how to update a prior belief given new evidence. It underlies spam filters, medical diagnosis algorithms, and the foundations of machine learning.

The law of large numbers guarantees that as a random experiment is repeated, the observed frequency of outcomes converges to the true probability — the mathematical reason why casinos always profit.

The full lesson covers probability rules, combinatorics, distributions, and Bayesian reasoning. Unlock it.
```

---

### LANGUAGE ARTS (10 clips)

---
**LA-01 · The Alphabet and Letters · K-2 · Callum**
```
Twenty-six letters. That's all it takes to write every word in the English language — every story, every poem, every book ever written in English. Twenty-six letters.

Each letter makes a sound — or sometimes a few different sounds. When you put letters together, they make words. When you put words together, they make sentences. And sentences can say anything.

"I love you." "The dragon flew over the castle." "I'm hungry." All of it, from the same twenty-six letters.

Learning to read and write those letters is one of the most important things you'll ever do. It opens up every story, every idea, every adventure that has ever been written down.

This lesson is your very first step. Let's start!
```

---
**LA-02 · Reading Comprehension · K-2 · Callum**
```
Reading isn't just saying the words. It's understanding what they mean — and thinking about them.

Good readers ask questions while they read. Why did the character do that? What do you think will happen next? Does this remind you of anything in your own life?

When you understand what you're reading — not just the words, but the ideas behind them — that's called comprehension. It's the most important reading skill there is.

Great readers also notice details, remember what happened, and can explain a story in their own words.

This lesson will give you the tools to understand any book you pick up. You'll become a stronger, more confident reader — and reading will become even more fun.

Ready? Let's jump in!
```

---
**LA-03 · Storytelling · K-2 · Callum**
```
Every great story has the same ingredients: someone interesting, something they want, a problem that gets in the way, and a moment where everything changes.

Think about your favorite story. Who's the main character? What did they want? What was the problem? How did they solve it?

Those four things — character, goal, conflict, resolution — are the building blocks of every story ever told. From fairy tales to superhero movies to bedtime stories to books that win big prizes.

And here's the exciting part: you already know how to tell stories. Every time you describe something that happened to you, that's a story.

In this lesson, you'll learn how to make your stories even better. Let's tell one together!
```

---
**LA-04 · Parts of Speech · Grades 3–5 · Charlotte**
```
Every word in a sentence has a job. Nouns name things. Verbs show action or being. Adjectives describe nouns. Adverbs describe verbs, adjectives, or other adverbs. Pronouns replace nouns so we don't repeat them. Conjunctions connect ideas. Prepositions show relationships.

These categories are called parts of speech, and understanding them is like learning the rules of a game. Once you know what each type of word does, you can write sentences that are clearer, more interesting, and more precise.

Here's the fun part: you've already been using all of these perfectly — you just didn't know their names.

The full lesson covers all eight parts of speech with examples and practice activities that make them stick. Unlock it.
```

---
**LA-05 · Writing a Paragraph · Grades 3–5 · Charlotte**
```
A great paragraph does one thing well. It has one main idea — stated clearly in a topic sentence. Then it supports that idea with details, examples, or evidence. And it wraps up with a closing sentence that ties it together.

That's it. Topic sentence, supporting details, closing sentence. Simple in structure, but powerful in practice. Every essay, every report, every news article is built from paragraphs following this basic pattern.

The secret to good writing isn't complicated words or fancy sentences. It's clarity. Saying what you mean, proving it, and knowing when you're done.

The full lesson walks through building paragraphs step by step — with examples of weak and strong versions of the same paragraph so you can see the difference.

Unlock it to start writing like a pro.
```

---
**LA-06 · Reading Nonfiction · Grades 3–5 · Charlotte**
```
Nonfiction writing has one job: to inform. And because of that, it uses a completely different set of tools than fiction.

Headings and subheadings organize information into sections. Bold text signals important vocabulary. Captions explain images. Tables of contents help you navigate. Indexes help you find specific topics quickly.

These are called text features, and skilled readers use them strategically — skimming headings before reading, looking for bold terms, checking captions before diving into dense paragraphs.

Reading nonfiction well also means evaluating the source. Who wrote this? When? What's their evidence? Is it current?

These skills make you a sharper, more critical reader of everything — articles, textbooks, websites, and news.

The full lesson covers text features, main idea, summarizing, and evaluating nonfiction sources. Unlock it.
```

---
**LA-07 · Argumentative Writing · Grades 6–8 · Daniel**
```
The ability to construct a clear, evidence-based argument is one of the most valuable skills you'll develop in school — and it applies far beyond writing class.

A strong argument starts with a claim: a clear, specific position on a debatable issue. It supports that claim with evidence — facts, statistics, expert opinion, or examples. It acknowledges and responds to the opposing view, which actually makes the argument stronger, not weaker. And it concludes by reinforcing why the claim holds up.

The hardest part for most writers isn't generating ideas — it's discipline. Staying focused on one claim, using only relevant evidence, and anticipating objections without losing your thread.

The full lesson covers claim construction, evidence selection, counterargument, and revision strategies. Unlock it.
```

---
**LA-08 · Literary Analysis · Grades 6–8 · Daniel**
```
Authors make choices. Every word, every sentence structure, every point of view, every symbol — deliberate decisions made to create a specific effect on the reader.

Literary analysis is the practice of identifying those choices and explaining how they work. It goes beyond summarizing — beyond "what happened" — to ask why the author made it happen that way, and what effect it has.

A character who never names what she fears might be demonstrating denial — or the author might be creating suspense. The same event described in short, punchy sentences versus long, flowing ones creates completely different emotional tones.

Once you learn to read analytically, every book becomes more interesting. And your own writing improves dramatically.

The full lesson covers theme, character, symbol, tone, point of view, and how to write a literary analysis paragraph. Unlock it.
```

---
**LA-09 · Research and Citation · Grades 9–12 · Rachel**
```
Research is a discipline, not just a task. Effective researchers don't simply find information — they evaluate sources, synthesize across multiple perspectives, and construct an original argument from the evidence they've gathered.

Source evaluation begins with provenance: who created this, for what purpose, for what audience, when, and with what evidence? Peer-reviewed academic sources and primary documents carry different weight than journalism or opinion pieces — both have roles, but not interchangeably.

Citation systems — MLA, APA, Chicago — exist not to create busywork but to serve two functions: giving credit to original thinkers, and allowing readers to trace and verify your sources. Every citation is an invitation to check your work.

The full lesson covers source evaluation frameworks, synthesis techniques, proper citation in multiple formats, and how to avoid inadvertent plagiarism. Unlock it.
```

---
**LA-10 · Rhetoric and Persuasion · Grades 9–12 · Rachel**
```
Rhetoric is the art of persuasion — and understanding it is essential for both producing and resisting it.

Aristotle identified three modes: ethos, the appeal to credibility and character; pathos, the appeal to emotion; and logos, the appeal to logic and evidence. Effective persuasion typically combines all three, calibrated to the audience and context.

But rhetoric also operates through structure, repetition, framing, and word choice in ways that can manipulate as readily as they can inform. The same technique that makes a speech inspiring can make propaganda effective. Recognizing these moves — in political speech, advertising, journalism, and everyday argument — is a critical literacy skill.

The full lesson covers the classical rhetorical framework, analysis of persuasive texts, and writing your own rhetorical analysis. Unlock it.
```

---

### SOCIAL STUDIES US (10 clips)

---
**SS-01 · My Community · K-2 · Callum**
```
Where do you live? A neighborhood? A town? A city?

Your community is the place where you live and all the people who live near you. Communities have homes, schools, libraries, fire stations, parks, and stores. Each one is different — some are busy cities, some are quiet farms, some are cozy little towns.

And communities need helpers! Teachers help kids learn. Firefighters keep people safe. Doctors help when people are sick. Store owners sell the things we need.

Every person in a community has a role. And you do too! Even young people can help — by being kind, by following rules, by taking care of shared spaces.

This lesson is all about communities — starting with yours!
```

---
**SS-02 · Rules and Laws · K-2 · Callum**
```
Why do we have rules?

Think about a game without rules — everyone would do whatever they wanted and it wouldn't be fun for anyone. Rules help things work!

Communities have rules too. We call them laws. Laws say what people can and can't do so that everyone stays safe and treats each other fairly. No running red lights. No taking things that don't belong to you. Everyone has to follow the rules — even grown-ups, even leaders.

Who makes laws? In our country, people we elect to represent us work together to write laws. And if a law isn't fair, people can work to change it.

Laws exist to protect everyone. This lesson explores how and why. Let's find out!
```

---
**SS-03 · Symbols of America · K-2 · Callum**
```
Some things are so special to a country that they become symbols — pictures or objects that represent big ideas.

The American flag is a symbol of freedom and unity. Its fifty stars stand for fifty states. Its thirteen stripes remember the original thirteen colonies that started the country.

The bald eagle is America's national bird — a symbol of strength. The Statue of Liberty, standing tall in New York Harbor, is a symbol of welcome and freedom for people coming from other countries.

Even the national anthem — The Star-Spangled Banner — is a symbol. When people sing it together, they're sharing a feeling about what America means to them.

Symbols tell stories without using words. This lesson explores some of America's most famous ones!
```

---
**SS-04 · The Three Branches of Government · Grades 3–5 · Charlotte**
```
The United States government is divided into three branches. That wasn't an accident — it was a very deliberate design.

The founders had just escaped a king with too much power. So they created a system where power is shared and balanced. The legislative branch — Congress — makes the laws. The executive branch — led by the President — carries out the laws. The judicial branch — the Supreme Court — interprets the laws and decides if they follow the Constitution.

Each branch has the ability to check and limit the others. This is called checks and balances. No single branch can become too powerful.

It's been over 230 years, and the basic structure still works.

The full lesson covers each branch in detail, how a bill becomes a law, and how the branches interact. Unlock it.
```

---
**SS-05 · Immigration and the American Story · Grades 3–5 · Charlotte**
```
The United States is often called a nation of immigrants — and the numbers back that up. Millions of people have come from every country on Earth, seeking freedom, safety, opportunity, or a new start.

They came from Ireland during the famine. From China to build the railroads. From Eastern Europe fleeing persecution. From Latin America seeking economic opportunity. From war-torn countries in Asia and Africa seeking refuge.

Each wave of immigrants brought their languages, foods, traditions, and skills — and blended them with everything that was already here. That blending is a large part of what American culture actually is.

Immigration is also an ongoing story. People still come today, for many of the same reasons.

The full lesson explores immigration history, the immigrant experience, and the ongoing national conversation about immigration policy. Unlock it.
```

---
**SS-06 · The Civil Rights Movement · Grades 3–5 · Charlotte**
```
In the 1950s and 1960s, millions of Americans — Black Americans and their allies — came together to demand something simple: equal treatment under the law.

They organized peaceful marches. They sat quietly at lunch counters where they weren't allowed. They refused to give up their seats on buses. They were often met with violence — but they kept going.

Their courage changed America. The Civil Rights Act of 1964 outlawed discrimination based on race, color, religion, or national origin. The Voting Rights Act of 1965 protected Black Americans' right to vote.

Leaders like Rosa Parks, John Lewis, and Dr. Martin Luther King Jr. didn't just change laws — they changed what Americans believed about fairness and equality.

The full lesson tells this story in depth. Unlock it.
```

---
**SS-07 · The Constitution and Bill of Rights · Grades 6–8 · Daniel**
```
The United States Constitution is the oldest written national constitution still in use. Ratified in 1788, it established the structure of the federal government, defined the relationship between federal and state authority, and created the framework for all American law.

But at ratification, several states insisted on amendments protecting individual rights. The first ten amendments — the Bill of Rights — guarantee freedom of speech, religion, the press, and assembly; the right to a fair trial; protection from unreasonable searches; and others.

These rights are not absolute — they have been interpreted and limited by courts over centuries. Understanding what the Constitution actually says, versus how it has been interpreted, is essential for civic literacy.

The full lesson covers the structure of the Constitution, all ten Bill of Rights amendments, and landmark Supreme Court cases that defined their meaning. Unlock it.
```

---
**SS-08 · Westward Expansion · Grades 6–8 · Daniel**
```
Between 1800 and 1900, the United States expanded from a collection of states along the Eastern Seaboard to a continental nation stretching to the Pacific Ocean. That expansion reshaped the country — and came at enormous cost.

The Louisiana Purchase doubled the country's size in 1803. The Oregon Trail brought hundreds of thousands of settlers west. The concept of Manifest Destiny — the belief that American expansion was inevitable and divinely sanctioned — provided ideological cover for displacement.

The consequences for Native Americans were catastrophic. Forced removal, the breaking of treaties, the destruction of cultures and economies — these are central to the historical record of westward expansion, not footnotes.

The full lesson examines westward expansion from multiple perspectives: settlers, Native nations, Mexican citizens, and enslaved people who had no say in their fates. Unlock it.
```

---
**SS-09 · The New Deal and the Great Depression · Grades 9–12 · Rachel**
```
The Great Depression was the most severe economic contraction in American history: between 1929 and 1933, GDP fell by roughly a third, unemployment reached 25 percent, and thousands of banks failed.

The New Deal — Franklin Roosevelt's response — represented a fundamental reorientation of the relationship between the federal government and the economy. It created the Securities and Exchange Commission to regulate financial markets, established Social Security to provide retirement income, expanded labor protections, and employed millions through public works programs.

Historians debate its economic effectiveness — some argue it extended the Depression by creating uncertainty; others credit it with preventing collapse and restoring confidence. What's less debated is its political legacy: it established the expectation that the federal government bears responsibility for the welfare of its citizens.

The full lesson covers the Depression's causes, New Deal programs, and their long-term political consequences. Unlock it.
```

---
**SS-10 · Foreign Policy and American Power · Grades 9–12 · Rachel**
```
How a nation behaves toward other nations — its foreign policy — reflects both its interests and its values. For the United States, that tension has defined international relations since the country's founding.

Isolationism dominated early American foreign policy. The Monroe Doctrine of 1823 declared the Western Hemisphere off-limits to European colonization. World Wars I and II pulled the country decisively into global engagement. The Cold War made the United States the leader of a global alliance structure built around containment of Soviet power.

Post-Cold War, the question shifted: what does American leadership look like in a world without a single adversary? The debates over intervention in the Balkans, Iraq, Afghanistan, Libya, and Syria all circle the same unresolved tension between sovereignty, humanitarian interest, and strategic calculation.

The full lesson covers the history of American foreign policy, key doctrines, and the frameworks used to analyze international relations. Unlock it.
```

---

### BIOLOGY (8 clips)

---
**BIO-01 · Living Things · K-2 · Callum**
```
What makes something alive?

A rock just sits there. A tree grows. A cat breathes, moves, eats, and has babies. What's the difference?

Living things have special things in common: they need food and water, they grow and change, they can make more of themselves, and they respond to the world around them.

Even plants are alive! They turn toward light. They drink water through their roots. They make seeds that grow into new plants.

And every single living thing — from the tiniest ant to the biggest whale — is made of cells. Tiny living units that do all the work of life.

Life comes in millions of shapes and sizes. But it all follows the same rules.

Ready to explore the living world? This lesson is for you!
```

---
**BIO-02 · Plants and How They Grow · K-2 · Callum**
```
A tiny seed holds an entire plant inside it — waiting for the right moment to wake up and grow.

When a seed gets water, warmth, and a good place to land, it sprouts. Roots push down into the soil to drink water and hold the plant steady. A stem pushes up toward the light. Leaves open up and start catching sunlight.

And with that sunlight, water, and air, the plant makes its own food. It's called photosynthesis — and it's like the plant's own kitchen.

Plants give us food, clean air, shade, and beauty. Without them, no animal on Earth could survive.

In this lesson, we'll plant a seed together — and watch what happens. Let's begin!
```

---
**BIO-03 · The Human Body · Grades 3–5 · Charlotte**
```
Your body is doing hundreds of things right now without you thinking about it at all.

Your heart is beating about 70 times a minute, pushing blood to every part of your body. Your lungs are exchanging oxygen for carbon dioxide with every breath. Your digestive system is processing your last meal. Your immune system is identifying and fighting any pathogens that got in.

All of these functions are organized into body systems — each with its own organs and jobs, all working together to keep you running.

The human body is arguably the most complex system on Earth. Understanding it means understanding why you need sleep, why exercise matters, what food actually does, and how to stay healthy.

The full lesson covers all major body systems with interactive diagrams. Unlock it.
```

---
**BIO-04 · Classification of Living Things · Grades 3–5 · Charlotte**
```
Scientists have identified and named about 8.7 million species on Earth — and they estimate millions more are still undiscovered.

To make sense of that diversity, biologists organize living things into groups based on shared characteristics. The broadest groups are called domains. Then kingdoms, phyla, classes, orders, families, genera, and species — each level more specific than the last.

A house cat, for instance, is in the domain Eukarya, kingdom Animalia, phylum Chordata, class Mammalia, order Carnivora, family Felidae, genus Felis, species catus. Every one of those categories tells you something about the cat.

This system — called taxonomy — lets scientists worldwide talk about the same organism without confusion.

The full lesson covers the classification system, the domains of life, and why taxonomy matters for biology. Unlock it.
```

---
**BIO-05 · DNA and Genetics · Grades 6–8 · Daniel**
```
Inside almost every cell in your body, coiled into 23 pairs of chromosomes, is a molecule that contains the complete instructions for building you.

DNA — deoxyribonucleic acid — is a double helix of four chemical bases: adenine, thymine, guanine, and cytosine. The sequence of these bases encodes genetic information in three-letter codons, each specifying an amino acid. Sequences of codons form genes — instructions for building specific proteins.

Those proteins do nearly everything in the body: they form structures, catalyze reactions, carry signals, and regulate other genes. You have roughly 20,000 protein-coding genes, but they account for less than 2 percent of your total DNA — the function of the rest is still being researched.

The full lesson covers DNA structure, replication, transcription, translation, and the Central Dogma of molecular biology. Unlock it.
```

---
**BIO-06 · Evolution by Natural Selection · Grades 6–8 · Daniel**
```
Charles Darwin published On the Origin of Species in 1859 with a simple but revolutionary idea: species change over time through a process of variation, inheritance, and differential reproduction.

Individuals in a population vary. Some variations are heritable. In a given environment, some variations improve survival and reproduction — those individuals pass their traits to more offspring. Over generations, advantageous traits become more common in the population. Given enough time and enough selection pressure, populations diverge into distinct species.

This process — natural selection — explains the diversity of life on Earth without requiring a designer. The fossil record, comparative anatomy, genetics, and direct observation of evolution in real time all confirm it independently.

The full lesson covers the evidence for evolution, mechanisms of selection, speciation, and common misconceptions. Unlock it.
```

---
**BIO-07 · The Immune System · Grades 9–12 · Rachel**
```
The immune system is a distributed surveillance and response network that must distinguish self from non-self, tolerate beneficial microorganisms, and eliminate pathogens — all without causing collateral damage to host tissue.

The innate immune system provides the first line of defense: physical barriers, pattern-recognition receptors that identify conserved microbial structures, phagocytosis, and inflammation. It is fast but non-specific.

The adaptive immune system is slower but precise. B-lymphocytes produce antibodies — proteins that bind specific antigens with high affinity, neutralizing pathogens and marking them for destruction. T-lymphocytes directly kill infected cells or coordinate immune responses. The key mechanism is clonal selection: lymphocytes bearing receptors that recognize a specific antigen proliferate massively upon exposure.

Memory cells from adaptive responses persist for decades, providing the basis for vaccination.

The full lesson covers innate versus adaptive immunity, antibody structure, vaccination mechanisms, and autoimmune disease. Unlock it.
```

---
**BIO-08 · Ecology and Biomes · Grades 9–12 · Rachel**
```
Earth's biosphere is organized into large-scale ecological communities called biomes — defined by climate, vegetation, and characteristic fauna. Tropical rainforests, temperate deciduous forests, grasslands, deserts, tundra, and marine systems each represent distinct adaptive landscapes.

Ecology studies the interactions within and between these systems: how energy flows through trophic levels, how nutrients cycle through biogeochemical pathways, how species regulate each other's populations through predation, competition, mutualism, and parasitism.

The field has become urgently applied as human land use, climate change, and species introductions restructure ecological communities faster than adaptive evolution can track. Conservation biology, restoration ecology, and climate adaptation planning all draw directly from ecological theory.

The full lesson covers biome characteristics, population ecology, community dynamics, and ecosystem-level processes including productivity and nutrient cycling. Unlock it.
```

---

### HISTORY WORLDWIDE (8 clips)

---
**HW-01 · Ancient Civilizations · K-2 · Callum**
```
Thousands and thousands of years ago, before phones, before cars, before even electricity — people were building amazing things.

In Egypt, they built enormous pyramids so tall they're still standing today. In China, they built the Great Wall — so long you could walk for months and not reach the end. In Greece, people gathered to discuss ideas that we still talk about in schools right now.

These were ancient civilizations — groups of people who lived together, built cities, made rules, and created things that lasted forever.

They didn't have our technology. But they were clever, creative, and very, very determined.

In this lesson, we'll travel back in time to visit some of the greatest ancient civilizations ever known. Get ready for an adventure!
```

---
**HW-02 · The Silk Road · K-2 · Callum**
```
Imagine a giant road stretching all the way from China to Europe — thousands and thousands of miles of deserts, mountains, and plains.

Merchants carried silk, spices, gold, and jade across this road on camels and horses. They crossed blazing deserts and icy mountains, trading goods with every town they passed through.

But they traded more than just things. They traded ideas, languages, religions, foods, and inventions. Paper, printing, and gunpowder all traveled this road from China to the rest of the world.

The Silk Road wasn't just a trade route. It was the world's first great network of connection — linking people who had never met, from civilizations thousands of miles apart.

This lesson explores one of history's greatest stories. Come along for the journey!
```

---
**HW-03 · World War I · Grades 3–5 · Charlotte**
```
In 1914, a single assassination in a small European city set off a chain of alliances, mobilizations, and declarations that pulled almost the entire world into war.

World War I lasted four years and killed approximately 20 million people — soldiers and civilians. It introduced new technologies of mass destruction: machine guns, poison gas, tanks, and aerial bombardment. For the first time, millions of soldiers faced each other across fortified trenches, fighting for months to advance a few miles.

The war ended in 1918 with a peace treaty that many historians believe sowed the seeds of the next world war. Germany was blamed, punished heavily, and humiliated — creating the conditions that a certain political movement would exploit twenty years later.

The full lesson covers the causes, major battles, and consequences of World War I. Unlock it.
```

---
**HW-04 · The Renaissance · Grades 3–5 · Charlotte**
```
Between roughly 1300 and 1600, something extraordinary happened in Europe. After centuries when much ancient knowledge had been lost or forgotten, scholars began rediscovering Greek and Roman texts — and combining them with new observations about the world.

Artists like Leonardo da Vinci and Michelangelo created works of startling beauty and technical precision. Scientists like Galileo and Copernicus challenged ancient assumptions about the universe. Writers like Shakespeare explored the complexity of human nature with a depth that still resonates.

This explosion of creativity and learning is called the Renaissance — French for "rebirth." It transformed art, science, literature, and philosophy, and laid the groundwork for the modern world.

The full lesson covers Renaissance art, science, literature, and the historical conditions that made it possible. Unlock it.
```

---
**HW-05 · The Age of Exploration · Grades 6–8 · Daniel**
```
Between 1400 and 1600, European sailors ventured into oceans that their maps showed as blank. What they found — the Americas, new routes to Asia, the scale of the African continent — transformed the world.

The consequences were enormous and deeply uneven. For European powers, exploration brought wealth, territorial expansion, and global dominance. For the Indigenous peoples of the Americas, it brought epidemic disease, conquest, and colonization that destroyed civilizations and killed an estimated 50 to 90 percent of the pre-contact population.

The transatlantic slave trade — enabled by this same era of exploration — forcibly removed approximately 12.5 million Africans over four centuries.

Understanding the Age of Exploration means holding both things at once: the genuine audacity of the voyages, and the catastrophic human cost of what followed.

The full lesson covers the major explorers, their motivations, and the global consequences of contact. Unlock it.
```

---
**HW-06 · The Cold War · Grades 6–8 · Daniel**
```
For nearly 50 years after World War II, two superpowers — the United States and the Soviet Union — competed for global dominance without ever directly fighting each other.

They fought instead through proxy wars, arms races, space races, economic competition, and ideological propaganda. The US backed capitalist governments; the Soviets backed communist ones. Coups, counter-insurgencies, and conflicts in Korea, Vietnam, Cuba, Angola, Afghanistan, and dozens of other countries were shaped by Cold War dynamics.

Both sides built enough nuclear weapons to destroy civilization multiple times over. The threat of mutual assured destruction was, paradoxically, what kept them from direct war.

The Cold War ended with the collapse of the Soviet Union in 1991 — but its consequences continue to shape global politics today.

The full lesson covers Cold War origins, major events, proxy conflicts, and its eventual end. Unlock it.
```

---
**HW-07 · Colonialism and Independence Movements · Grades 9–12 · Rachel**
```
By 1914, European empires controlled approximately 84 percent of the Earth's land surface. The economic, political, and cultural consequences of that dominance — and of its unraveling — define much of the 20th and 21st centuries.

Colonial powers extracted resources, disrupted traditional economies, redrew borders along lines that ignored ethnic and cultural realities, and imposed educational and legal systems designed to produce compliant administrators rather than independent thinkers. Frantz Fanon's analysis of colonialism's psychological dimensions remains influential: the colonized internalized a sense of inferiority that decolonization required consciously confronting.

Independence movements from India to Ghana to Algeria to Vietnam drew on both universal rights frameworks and nationalist ideologies — often in tension with each other. The postcolonial transitions varied widely in stability, prosperity, and political form.

The full lesson covers major colonial systems, independence movements, postcolonial theory, and the ongoing legacies of empire. Unlock it.
```

---
**HW-08 · The Holocaust · Grades 9–12 · Rachel**
```
The Holocaust was the systematic, state-sponsored murder of approximately six million Jews — two thirds of European Jewry — by Nazi Germany and its collaborators between 1933 and 1945. An additional five to six million non-Jewish victims were killed: Roma, people with disabilities, Soviet prisoners of war, political opponents, LGBTQ individuals, and others.

The Holocaust was not a spontaneous eruption of violence. It was bureaucratic, incremental, and thoroughly documented by its perpetrators. It proceeded from discriminatory legislation to forced emigration to ghettoization to mass shooting to industrialized death camps — each step enabled by the previous one and by the collaboration of ordinary people across occupied Europe.

Understanding the Holocaust requires engaging with questions historians still debate: how did it happen, who bears responsibility, what could have prevented it, and what obligations does its memory create.

The full lesson covers the historical sequence, the perpetrators, the victims, the bystanders, and the institutions of remembrance. Unlock it.
```

---

### FINANCIAL LITERACY (8 clips)

---
**FL-01 · Needs vs. Wants · K-2 · Callum**
```
If you could have anything in the whole world right now, what would it be? A giant ice cream sundae? A puppy? A new video game?

Those are wants — things that would be wonderful to have but that you don't absolutely need.

But some things are different. Food. A safe place to sleep. Clean water. Clothes that keep you warm. You actually need those things to be okay.

Knowing the difference between a need and a want is one of the very first money skills! When we have money to spend, needs come first. Wants are for after.

It sounds simple — but even grown-ups have to practice this. Our brains really like wants!

In this lesson, we'll sort things into needs and wants together. Let's go!
```

---
**FL-02 · Earning and Spending · K-2 · Callum**
```
Where does money come from?

Most money comes from work. People do a job — teaching, building, cooking, driving — and they get paid for their time and effort. That payment is called earning.

And what do people do with the money they earn? They spend it — on food, on rent, on clothes, on fun. Spending is using money to get something you want or need.

But here's the trick: you can't spend more than you earn. If you only have five dollars, you can't buy something that costs six — unless you save up first!

Understanding earning and spending is where the whole money story begins.

This lesson explores how money flows — from earning to spending and everything in between. Let's start!
```

---
**FL-03 · Banking and Interest · Grades 3–5 · Charlotte**
```
When you put money in a bank, something interesting happens: the bank pays you for keeping your money there. It's called interest.

Banks take the money people deposit and lend it out to other people — for mortgages, business loans, car payments. They charge those borrowers interest too, at a higher rate. The difference is how banks make money.

For you as a saver, interest means your money grows without you doing anything. A hundred dollars in a savings account earning three percent interest becomes one hundred and three dollars after a year. Then one hundred and six dollars and nine cents the year after that — because now you're earning interest on the interest too.

That compounding effect is slow at first. But over decades, it becomes remarkable.

The full lesson covers how banks work, different account types, and how compound interest builds wealth over time. Unlock it.
```

---
**FL-04 · Budgeting · Grades 3–5 · Charlotte**
```
A budget is simply a plan for your money. Instead of spending whatever feels right in the moment, a budget tells your money where to go in advance.

Most budgets divide money into categories: fixed expenses you pay every month like rent or subscriptions; variable expenses that change like groceries or entertainment; savings; and giving. The total of all categories must equal the total income — that's the balancing act.

The most famous simple budget rule is 50-30-20: fifty percent for needs, thirty percent for wants, twenty percent for savings. It's not perfect for everyone, but it's a useful starting point.

The hardest part of budgeting isn't the math. It's being honest about what you actually spend, versus what you think you spend.

The full lesson covers building a personal budget, tracking expenses, and adjusting when things don't balance. Unlock it.
```

---
**FL-05 · Taxes and Public Services · Grades 6–8 · Daniel**
```
Where do roads, schools, fire departments, public libraries, and national parks come from? They're paid for by taxes — money that individuals and businesses contribute to fund services shared by everyone.

Income tax takes a percentage of what people earn. Sales tax adds a percentage to purchases. Property tax is charged on owned real estate. Each type funds different levels of government.

Taxes are progressive when higher earners pay a higher percentage, and regressive when they take a larger share of income from lower earners — like sales taxes, which hit everyone equally regardless of income.

People disagree about how much tax is appropriate, what it should fund, and who should pay more. These are genuinely contested political questions. But the basic mechanism — pooling resources to fund shared infrastructure — is how virtually every society in history has functioned.

The full lesson covers major tax types, how tax revenue is spent, and how to read a pay stub. Unlock it.
```

---
**FL-06 · Investing Basics · Grades 6–8 · Daniel**
```
Saving puts money aside. Investing puts money to work.

When you invest, you buy an asset — a stock, a bond, real estate, a business — with the expectation that it will generate returns over time. Stocks represent fractional ownership of companies; as companies grow, so does the value of the stock. Bonds are loans to governments or corporations, paid back with interest.

The relationship between risk and return is fundamental: higher potential returns come with higher risk of loss. A diversified portfolio — spreading investments across many assets — reduces risk without eliminating it.

Time is the most powerful variable in investing. Starting at 20 versus 40 doesn't double your potential wealth — it multiplies it many times over, thanks to compounding.

The full lesson covers asset classes, risk-return tradeoffs, diversification, and the mathematics of long-term investing. Unlock it.
```

---
**FL-07 · Credit and Debt · Grades 9–12 · Rachel**
```
Credit is one of the most powerful financial tools available — and one of the most dangerous if misunderstood.

A credit score is a numerical representation of your creditworthiness — your history of borrowing and repaying. It determines whether you can borrow, at what interest rate, and how much. A high score unlocks lower rates on mortgages, auto loans, and credit cards; a low score costs thousands of dollars in extra interest over a lifetime.

Credit card debt is particularly destructive at typical interest rates of 20 to 29 percent APR. Carrying a balance means paying back significantly more than you borrowed, with the gap widening each month through compounding.

Debt is not inherently bad — a mortgage at 6 percent to buy an appreciating asset is fundamentally different from consumer credit at 25 percent to finance consumption. The distinction matters enormously.

The full lesson covers credit scores, debt types, interest calculations, and strategies for responsible credit use. Unlock it.
```

---
**FL-08 · Economic Systems · Grades 9–12 · Rachel**
```
How societies decide what to produce, how to produce it, and who receives the output — these are the fundamental questions of economic organization.

Market economies use price signals generated by supply and demand to coordinate decentralized decisions. Command economies use central planning to allocate resources. Mixed economies — which describe virtually every real-world system — combine market mechanisms with government regulation and redistribution.

The 20th century was in large part an ideological contest between capitalism and communism, with the collapse of the Soviet Union widely interpreted as a verdict in favor of markets. But market economies vary dramatically: Nordic social democracies, American laissez-faire capitalism, and Chinese state capitalism produce very different distributions of wealth, social mobility, and public goods.

The full lesson covers economic systems comparatively, key macroeconomic concepts, and the theories underlying major policy debates. Unlock it.
```

---

### ARTS (8 clips)

---
**A-01 · Colors and Mixing · K-2 · Callum**
```
Red, yellow, and blue. Just three colors — and you can make almost any color in the world from them!

Mix red and yellow and you get orange. Mix blue and yellow and you get green. Mix red and blue and you get purple. These are called secondary colors — because they come second, made from mixing.

And the more you mix, the more colors you can create! A tiny bit of white makes a color lighter. A touch of black makes it darker.

Artists use color to tell stories without words. Warm colors — reds, oranges, yellows — can feel exciting or cozy. Cool colors — blues and greens — can feel calm and peaceful.

In this lesson, you'll experiment with colors and discover what they can do. Get your paintbrush ready!
```

---
**A-02 · Drawing and Sketching · K-2 · Callum**
```
You don't need to be a famous artist to draw. You just need to look carefully and practice.

Here's a secret artists know: everything you see can be broken into basic shapes. A face is mostly a circle with an oval for each eye. A tree is a rectangle trunk with a big fluffy cloud shape on top. A house is a square with a triangle on top.

When you learn to see shapes inside things, drawing becomes a lot easier and a lot more fun.

And the more you practice, the better you get. Every single artist you've ever heard of started out drawing wobbly lines, just like everyone does at the beginning.

In this lesson, we'll start with simple shapes and build up from there. Grab a pencil — let's draw!
```

---
**A-03 · Music: Rhythm and Beat · Grades 3–5 · Charlotte**
```
Before melody, before harmony, before lyrics — there is rhythm.

Rhythm is the pattern of sounds in time. The beat is the steady pulse underneath everything — like a heartbeat. Music organizes sound around that beat, placing notes and silences in patterns that feel satisfying to hear.

You already have rhythm in your body. Your heart beats. You walk in a regular step. You breathe in patterns. That's why music feels so natural — it connects to something built into us.

Different music traditions around the world use rhythm in fascinatingly different ways. West African drumming, Indian classical music, Brazilian samba, and Western classical music all have completely different rhythmic structures — and they're all compelling.

The full lesson covers beat, meter, tempo, and how to read and clap simple rhythmic patterns. Unlock it.
```

---
**A-04 · Art History: From Cave Paintings to Today · Grades 3–5 · Charlotte**
```
Human beings have been making art for at least 40,000 years. Cave paintings found in Spain and Indonesia show animals drawn with remarkable skill — by people with no art school, no brushes, and no paint stores.

Since then, art has changed constantly — reflecting the technologies, beliefs, and values of each era. Ancient Egyptians painted flat figures in strict profile. Renaissance artists discovered perspective and painted figures that seemed to breathe. Impressionists abandoned precise outlines to capture the feeling of light. Abstract artists abandoned recognizable images altogether.

Each movement was a response to what came before — either building on it or deliberately breaking from it.

Understanding art history helps you look at any piece of art and see it in context.

The full lesson covers major art movements from prehistoric to contemporary, with examples and analysis. Unlock it.
```

---
**A-05 · Composition and Design · Grades 6–8 · Daniel**
```
A great photograph doesn't just capture what's in front of the camera — it makes a series of deliberate decisions about what to include, where to place it in the frame, and what to leave out.

Composition is the arrangement of visual elements in an image or artwork. The rule of thirds suggests placing subjects off-center for more dynamic images. Leading lines draw the viewer's eye through the frame. Negative space — the empty areas around a subject — can be as expressive as the subject itself. Framing uses elements in the scene to create a visual border around the main subject.

These principles aren't rules you must follow — they're patterns the eye finds satisfying, which you can use deliberately or break deliberately.

The full lesson covers composition principles with before-and-after examples, and includes a practical exercise in analyzing real photographs and artworks. Unlock it.
```

---
**A-06 · Film and Visual Storytelling · Grades 6–8 · Daniel**
```
Cinema is the youngest major art form — barely 130 years old — and it synthesizes all the others: photography, music, narrative, performance, and design.

Every shot in a film is a composition. Every camera movement conveys meaning. A slow pan creates a different emotional tone than a fast cut. A close-up creates intimacy; a wide shot creates isolation. The score shapes how the audience feels about what they're seeing — often without them noticing.

Filmmakers call the visual language of these choices cinematography. Learning it changes how you watch films — you start seeing the hundreds of decisions behind every scene, rather than simply being carried along by them.

And those skills are increasingly relevant: video is the dominant form of communication and storytelling in the current media environment.

The full lesson covers shot types, camera movement, editing principles, and how to analyze a film scene. Unlock it.
```

---
**A-07 · Creative Portfolio Development · Grades 9–12 · Rachel**
```
A portfolio is not a collection of your best work. It is an argument — a curated, intentional demonstration of your development as a creative thinker and maker.

The distinction matters. Selecting pieces because they're impressive misses the point; selecting pieces that show range, growth, process, and a coherent creative voice is what reviewers at colleges and programs actually look for. The inclusion of failed experiments, process sketches, and revised work alongside finished pieces shows intellectual honesty and the capacity for self-critique.

Written artist statements are equally important: the ability to articulate your intentions, your influences, and your development in clear, non-jargon-laden prose demonstrates that your creative choices are intentional rather than accidental.

The full lesson covers curation strategy, sequencing, documentation of process, and writing compelling artist statements for different purposes. Unlock it.
```

---
**A-08 · Art and Society · Grades 9–12 · Rachel**
```
Art is never purely aesthetic. It is always produced in a social context — shaped by the economic conditions, power structures, cultural values, and technologies of its time.

The patrons who funded Renaissance painters determined what was painted, who was depicted, and how. The censorship systems of 20th-century totalitarian states reveal, by contrast, exactly what those regimes feared art could do. The market structure of contemporary art — in which a small number of collectors and auction houses dramatically shape which artists become canonical — raises its own questions about aesthetic judgment versus economic influence.

These contexts don't invalidate the work. A Caravaggio commissioned to glorify a patron is still a Caravaggio. But understanding the context deepens the interpretation.

The full lesson covers the sociology of art, the role of institutions in shaping the canon, and methods for analyzing art as cultural document. Unlock it.
```

---

### ASTRONOMY (8 clips)

---
**AS-01 · Day and Night · K-2 · Callum**
```
Why does the sun disappear at night?

The sun doesn't actually go anywhere! It's always shining. What changes is where you are.

Earth is spinning — slowly, slowly turning around and around, once every 24 hours. When your side of Earth faces the sun, it's daytime. When your side turns away from the sun, it's nighttime. The sun is still there — you just can't see it from where you are.

And while it's night where you live, it's daytime somewhere else in the world! Kids on the other side of Earth are eating breakfast while you're getting ready for bed.

Isn't that amazing? The whole world is sharing the same sun — just at different times.

This lesson explores day, night, and what makes our sky so special!
```

---
**AS-02 · The Moon · K-2 · Callum**
```
Look up on a clear night and you might see the most visited thing in space: the Moon!

The Moon is Earth's closest neighbor — about 384,000 kilometers away. That's so close that humans have actually walked on it! Twelve astronauts did, between 1969 and 1972.

The Moon doesn't make its own light. It reflects light from the Sun, like a giant mirror in the sky. And because of the way it moves around Earth, we see different amounts of it lit up at different times. Those changing shapes are called phases — new moon, crescent, half, gibbous, full, and back again.

One cycle of phases takes about 29 and a half days — that's where the idea of a month comes from!

This lesson explores the Moon, its phases, and its effect on Earth. Let's look up!
```

---
**AS-03 · Planets of the Solar System · Grades 3–5 · Charlotte**
```
Eight planets, all going around the same star, all different from each other in fascinating ways.

Mercury is the smallest and closest to the Sun — but paradoxically not the hottest. Venus is. Its thick atmosphere of carbon dioxide traps heat so efficiently that its surface is over 450 degrees Celsius — hot enough to melt lead.

Earth is special for reasons that took scientists centuries to fully appreciate: liquid water, a protective magnetic field, an oxygen-rich atmosphere, and a temperature range that allows complex chemistry.

Mars has the tallest volcano in the solar system — Olympus Mons, three times the height of Everest. Jupiter's storm known as the Great Red Spot has been raging for at least 350 years.

Each planet is a world with its own story.

The full lesson covers all eight planets in detail. Unlock it.
```

---
**AS-04 · Black Holes · Grades 3–5 · Charlotte**
```
Imagine something so massive that nothing — not even light — can escape its gravity. That's a black hole.

Black holes form when very massive stars reach the end of their lives and their cores collapse under gravity, becoming incredibly dense. The boundary around a black hole from which nothing can escape is called the event horizon.

Black holes don't suck things in like a vacuum cleaner — objects only fall in if they get too close. From a safe distance, a black hole has the same gravitational pull as any other object of the same mass.

We can't see black holes directly — but we can detect them by how they affect nearby stars, gas, and light. In 2019, scientists released the first actual image of a black hole's shadow.

The full lesson covers black hole formation, types, and the incredible science being done to study them. Unlock it.
```

---
**AS-05 · The Life Cycle of Stars · Grades 6–8 · Daniel**
```
Stars are not permanent. They are born, spend billions of years fusing hydrogen into helium, and eventually die — in ways that depend critically on how massive they are.

A star like our Sun forms from a collapsing cloud of gas and dust. It spends roughly 10 billion years on the main sequence. When hydrogen in the core runs out, it expands into a red giant, fuses helium into carbon, sheds its outer layers as a planetary nebula, and leaves a dense remnant called a white dwarf — roughly the size of Earth, but incredibly hot and dense.

More massive stars die faster and more violently — in supernova explosions that briefly outshine entire galaxies and scatter heavy elements across space. The iron in your blood was forged in the core of a dying star.

The full lesson covers the Hertzsprung-Russell diagram, stellar evolution pathways, and the formation of neutron stars and black holes. Unlock it.
```

---
**AS-06 · The Search for Extraterrestrial Life · Grades 6–8 · Daniel**
```
Given the observable universe contains hundreds of billions of galaxies, each with hundreds of billions of stars, many with planetary systems — the question of whether life exists elsewhere is taken seriously by scientists.

The Drake Equation attempts to estimate the number of communicating civilizations in our galaxy using factors like the rate of star formation, the fraction of stars with planets, and the probability that intelligent life develops and chooses to communicate. The equation reveals that enormous uncertainty in these factors makes the estimate range from essentially zero to millions.

The search focuses on several approaches: radio SETI listens for artificial signals; direct space missions search for microbial life in our solar system; exoplanet spectroscopy looks for biosignature gases in distant atmospheres.

No confirmed detection has been made. But the search has produced a remarkable amount of science along the way.

The full lesson covers the Drake Equation, extremophiles, Mars exploration, and the methodology of SETI. Unlock it.
```

---
**AS-07 · Cosmology: The Big Bang · Grades 9–12 · Rachel**
```
The observable universe — 93 billion light-years in diameter, containing an estimated 2 trillion galaxies — originated approximately 13.8 billion years ago in a state of extreme density and temperature.

The Big Bang theory is not a hypothesis about an explosion in space — it is the well-supported description of the universe's expansion from an initial singularity. The evidence is extensive: the cosmic microwave background radiation, the observed expansion of the universe first documented by Hubble, the primordial abundances of light elements consistent with nucleosynthesis calculations, and the large-scale structure of galaxy distribution.

What preceded the Big Bang, or whether "preceded" is even a meaningful concept before spacetime existed, remains genuinely open. Inflationary theory, string cosmology, and loop quantum cosmology offer different frameworks — none yet conclusively testable.

The full lesson covers the evidence for the Big Bang, cosmic expansion, dark matter, dark energy, and the current state of cosmological research. Unlock it.
```

---
**AS-08 · Space Exploration History · Grades 9–12 · Rachel**
```
The space age began on October 4, 1957, when the Soviet Union launched Sputnik — the first artificial satellite. Within twelve years, humans had walked on the Moon.

That pace of achievement was driven by Cold War competition rather than purely scientific motivation, but the scientific returns were extraordinary regardless. The Apollo program alone generated 842 pounds of lunar samples and fundamentally changed our understanding of the Moon's formation.

The post-Apollo decades brought robotic exploration that arguably exceeded the human missions in scientific return: the Voyager probes are now in interstellar space after five decades of travel; Mars rovers have returned more than a million images; the James Webb Space Telescope images galaxies formed within a few hundred million years of the Big Bang.

The commercialization of launch through SpaceX and others has dramatically reduced cost to orbit and reopened serious discussion of crewed Mars missions.

The full lesson covers the history of space exploration, current missions, and the technical, political, and ethical questions surrounding humanity's expansion into space. Unlock it.
```

---

### CODING (8 clips)

---
**CO-01 · Computers and How They Work · K-2 · Callum**
```
A computer is like a really, really fast brain — but one that only does exactly what you tell it.

Computers can't think for themselves. They just follow instructions super quickly. Those instructions are called programs or code. Programmers are the people who write the instructions.

Inside a computer, everything is made of tiny switches that can be either on or off — one or zero. Using billions of those tiny switches flipping very quickly, computers can do math, show pictures, play videos, and connect with other computers around the world.

You use computers every day — your tablet, your TV, your game console, even the microwave. They all have code inside them, telling them what to do.

Want to understand how it all works? This lesson is where it starts!
```

---
**CO-02 · Introduction to Coding · K-2 · Callum**
```
Coding is giving instructions to a computer. That's it!

The trick is, computers only understand very specific instructions in a very specific order. If you want a computer to draw a square, you have to tell it: go forward, turn right, go forward, turn right — four times! You can't just say "draw a square" and hope for the best.

But here's what makes coding amazing: once you've written the instructions once, the computer will follow them perfectly, as fast as you want, as many times as you want.

Learning to code teaches you to think step by step, solve problems, and be precise. These are skills that help with everything — not just computers!

This lesson is your first step into the world of coding. Are you ready? Let's go!
```

---
**CO-03 · Loops and Patterns · Grades 3–5 · Charlotte**
```
Imagine you want a computer to draw 100 squares. You could write the draw-a-square instructions 100 times. Or you could write them once and tell the computer: repeat this 100 times.

That's a loop — one of the most powerful ideas in all of programming.

Loops tell a computer to repeat a set of instructions until a condition is met. A while loop keeps running while something is true. A for loop runs a specific number of times. Nested loops — loops inside loops — can generate complex patterns from simple rules.

Loops are why a single programmer can write code that processes millions of records, animates thousands of particles, or generates an infinite game world.

The full lesson covers loop types, loop control, and practical coding exercises where you use loops to create patterns and solve puzzles. Unlock it.
```

---
**CO-04 · Functions and Reusability · Grades 3–5 · Charlotte**
```
Imagine if every time you wanted to make a sandwich, you had to write out every step from scratch: take out the bread, open the bread bag, remove two slices, get the peanut butter... 

That would get tedious fast. Instead, you just think: "make a sandwich" — and all those steps happen.

In coding, functions work the same way. A function is a named, reusable block of code. You define it once — give it a name, tell it what to do — and then you can use it anywhere in your program just by calling its name.

Functions make programs shorter, easier to read, and easier to fix. If there's a bug in the sandwich-making logic, you fix it in one place and it's fixed everywhere.

The full lesson covers function definition, parameters, return values, and how good function design makes complex programs manageable. Unlock it.
```

---
**CO-05 · Web Development Basics · Grades 6–8 · Daniel**
```
Every website you visit is built from three core technologies working together: HTML, CSS, and JavaScript.

HTML — HyperText Markup Language — provides structure. It defines what's on the page: paragraphs, headings, images, links, buttons. It's the skeleton.

CSS — Cascading Style Sheets — provides appearance. It controls colors, fonts, layout, and visual design. The same HTML can look completely different depending on the CSS applied.

JavaScript provides behavior. It makes things interactive: buttons that respond to clicks, forms that validate input, content that updates without reloading the page.

These three technologies, running inside a browser, power every web application in existence. Understanding them gives you the ability to build real things that anyone in the world can access.

The full lesson includes hands-on coding exercises building your first webpage. Unlock it.
```

---
**CO-06 · Data Structures · Grades 6–8 · Daniel**
```
Programs don't just process single values — they work with collections. How you organize those collections affects everything: how fast your program runs, how much memory it uses, and how easy it is to reason about.

An array stores items in a numbered sequence — fast to access by index, but slow to insert in the middle. A linked list stores items connected by pointers — fast to insert and delete, but slow to access by position. A hash table maps keys to values and allows near-instant lookup regardless of size. A tree organizes data hierarchically, enabling efficient searching and sorting.

Choosing the right data structure for a problem is often more important than the algorithm — the same problem can be solved in milliseconds or minutes depending on how the data is organized.

The full lesson covers arrays, linked lists, hash tables, and trees with Python implementation examples. Unlock it.
```

---
**CO-07 · Artificial Intelligence and Machine Learning · Grades 9–12 · Rachel**
```
Classical programming is explicit: the programmer specifies the rules, and the computer follows them. Machine learning inverts this relationship: the system infers rules from data.

A machine learning model is a parameterized mathematical function — often a neural network with millions of adjustable weights. Training the model means repeatedly presenting labeled examples, computing how wrong the model's predictions are, and adjusting the weights to reduce that error. Given enough data and compute, the model generalizes from training examples to novel inputs.

This approach has produced systems that outperform humans on image classification, game playing, protein structure prediction, and natural language processing. It has also produced systems that fail in unexpected ways, encode biases from training data, and are difficult to interpret or audit.

The full lesson covers supervised and unsupervised learning, neural network architecture, gradient descent, and the current landscape of AI capabilities and limitations. Unlock it.
```

---
**CO-08 · Cybersecurity Fundamentals · Grades 9–12 · Rachel**
```
Security is not a feature you add to a system — it is a property that has to be designed in from the beginning, because every interface is a potential attack surface.

The CIA triad — confidentiality, integrity, availability — defines the three properties a secure system must maintain. Confidentiality means data is accessible only to authorized parties. Integrity means data is accurate and untampered. Availability means systems function when needed.

Common attack vectors include social engineering — exploiting human psychology rather than technical vulnerabilities; SQL injection — inserting malicious code through input fields; cross-site scripting; man-in-the-middle attacks; and ransomware. Defense requires layered controls: authentication, authorization, encryption, input validation, least-privilege access, and incident response planning.

The field is increasingly critical as more infrastructure depends on networked systems.

The full lesson covers threat modeling, cryptographic fundamentals, common attack types, and security best practices for developers. Unlock it.
```

---

### GEOGRAPHY (6 clips)

---
**GE-01 · Maps and Directions · K-2 · Callum**
```
A map is like a picture of a place, seen from above — as if you were a bird looking down.

Maps show us where things are. Streets, parks, rivers, mountains, countries — maps help us find our way and understand how the world is laid out.

Every map has a compass rose that shows North, South, East, and West. Maps also have a scale — a way of showing that a small space on the map equals a large distance in real life.

Long ago, brave explorers drew maps as they traveled, filling in blanks one journey at a time. Today, satellites take pictures of the whole Earth and we can see any place instantly on a phone.

But the basic idea is the same: a map is a way of understanding where you are in the world.

Let's explore maps together in this lesson!
```

---
**GE-02 · Continents and Oceans · K-2 · Callum**
```
Earth is mostly water. About 71 percent of our planet's surface is covered by oceans — the Pacific, the Atlantic, the Indian, the Arctic, and the Southern.

And then there are the seven continents — the large masses of land where people and animals live: North America, South America, Europe, Africa, Asia, Australia, and Antarctica.

Every continent is different. Africa has vast deserts and huge rainforests. Asia is the biggest continent, home to more than half the world's people. Antarctica is covered in ice and has no permanent human residents.

Learning the continents and oceans is like learning the basic layout of your home — planet Earth.

In this lesson, we'll travel around the whole world together. Ready? Let's go!
```

---
**GE-03 · Climate Zones · Grades 3–5 · Charlotte**
```
Why is it hot near the equator and cold near the poles? Why do some places get lots of rain while others are bone dry?

It all comes down to where a place is on Earth and how sunlight hits it.

Near the equator, sunlight hits directly — concentrating its energy and creating heat. Near the poles, sunlight arrives at a steep angle, spreading over a larger area and warming things less. That's why climate zones exist: tropical near the equator, temperate in the middle latitudes, and polar near the top and bottom.

Other factors shape climate too: ocean currents, mountain ranges, and distance from water all play major roles. London and Moscow are at similar latitudes — but London is dramatically warmer because of the Gulf Stream.

The full lesson covers all major climate zones, the factors that create them, and their characteristic ecosystems. Unlock it.
```

---
**GE-04 · World Populations · Grades 3–5 · Charlotte**
```
Eight billion people. That's how many humans share Earth today. But those eight billion are not evenly distributed — not by a long stretch.

Asia alone is home to over half the world's population. The ten most populous countries contain roughly 60 percent of all humans. Meanwhile, entire continents have remarkably low population density.

Population patterns are shaped by history, climate, economics, and infrastructure. The most densely populated areas tend to have mild climates, reliable food and water, and access to trade. The least dense areas tend to be inhospitable: deserts, frozen tundra, dense rainforest.

Population is also changing: global population is still growing, but the rate is slowing. Some countries face rapid aging while others have very young populations — with very different economic implications.

The full lesson covers population distribution, demographics, urbanization, and population trends. Unlock it.
```

---
**GE-05 · Natural Resources · Grades 6–8 · Daniel**
```
Every product you own, every building around you, every bite of food you eat required natural resources to produce. Understanding how those resources are distributed — and how finite they are — is essential for understanding both economics and geopolitics.

Renewable resources regenerate on human timescales: timber, freshwater, solar and wind energy, fisheries. Non-renewable resources exist in finite quantities accumulated over geological time: fossil fuels, mineral ores, rare earth elements.

The geography of resource distribution does not match the geography of demand. This mismatch drives trade, diplomacy, conflict, and technology development. The concentration of rare earth minerals needed for batteries and electronics in a small number of countries is already shaping 21st-century geopolitics in ways that echo the 20th-century dynamics around oil.

The full lesson covers resource types, extraction, trade, and sustainability. Unlock it.
```

---
**GE-06 · Globalization · Grades 6–8 · Daniel**
```
The phone in your pocket probably contains minerals from the Democratic Republic of Congo, was assembled in China using components from Japan, South Korea, and Taiwan, designed by engineers in California, and shipped through a global logistics network. That's globalization.

Globalization is the increasing integration of the world's economies, cultures, and governments. It has accelerated dramatically since the 1990s, driven by containerized shipping, telecommunications, and international trade agreements.

The benefits are real: lower prices for manufactured goods, global markets for producers, knowledge sharing, and economic growth in developing countries. The costs are also real: labor exploitation, environmental degradation, cultural homogenization, and the displacement of workers in high-wage countries.

It is not a force of nature — it results from specific policy choices, and can be shaped by different ones.

The full lesson covers trade theory, global supply chains, the institutions of globalization, and the debates around its consequences. Unlock it.
```

---

### CHEMISTRY (6 clips)

---
**CH-01 · States of Matter · K-2 · Callum**
```
Water can do something amazing. It can be hard as a rock, flow like — well, water, or float invisibly through the air.

That's because matter can exist in different states. The three main states are solid, liquid, and gas.

In a solid, like ice, the tiny pieces that make up matter are packed tight and hold their shape. In a liquid, like water, they're looser and can flow. In a gas, like steam, they spread out and go everywhere.

What makes matter change from one state to another? Heat! Add heat and ice melts into water. Add more heat and water boils into steam. Take away heat and it goes back the other way.

Matter all around you is changing states all the time — sometimes too slowly to notice.

This lesson explores the three states of matter and the science behind them. Let's get curious!
```

---
**CH-02 · Mixing and Reactions · K-2 · Callum**
```
What happens when you mix baking soda and vinegar? Fizz! Bubbles! A little mini-explosion of science!

That's called a chemical reaction. When some substances mix together, they change into something completely new.

Baking a cake is a chemical reaction. The batter goes in — and a cake comes out. You can't un-bake it! That's how you know a chemical reaction happened: something new was created that wasn't there before.

Not all mixing is a reaction. Stir sugar into water and you get sweet water — you can get the sugar back by letting the water evaporate. That's a mixture, not a reaction.

Chemistry is all about what happens when substances interact. And it's happening everywhere around you, all the time.

This lesson dives into mixtures and reactions. Let's experiment!
```

---
**CH-03 · Atoms and the Periodic Table · Grades 3–5 · Charlotte**
```
Everything in the universe — every rock, every star, every cell in your body — is made of atoms. And there are only about 118 types of atoms known to exist. Those types are called elements.

Scientists organized all known elements into a chart called the Periodic Table. It arranges elements by their atomic number — how many protons are in the nucleus — and groups elements with similar properties into columns.

Hydrogen is the simplest and most abundant element in the universe. Carbon is the basis of all known life. Gold and iron and oxygen are all elements on the same chart.

When elements combine in specific proportions, they form compounds. Water is two hydrogen atoms bonded to one oxygen atom — H₂O. That simple combination makes up most of your body.

The full lesson covers atomic structure, the periodic table, and common elements and compounds. Unlock it.
```

---
**CH-04 · Chemical Bonds · Grades 3–5 · Charlotte**
```
Atoms don't usually exist alone. They bond together to form molecules — and the type of bond determines almost everything about what the molecule can do.

In a covalent bond, atoms share electrons. Water, carbon dioxide, and most organic molecules form this way. In an ionic bond, one atom transfers electrons to another, creating opposite charges that attract. Table salt — sodium chloride — is the classic example.

These aren't just abstract chemistry facts. The properties that make water so remarkable — its high boiling point, its surface tension, its ability to dissolve so many substances — all come directly from the way its molecules are bonded and the polarity that creates.

Understanding bonding means understanding why materials behave the way they do: why some things dissolve in water and others don't, why some materials conduct electricity and others don't.

The full lesson covers ionic, covalent, and metallic bonds with examples and molecular models. Unlock it.
```

---
**CH-05 · Acids, Bases, and pH · Grades 6–8 · Daniel**
```
The pH scale runs from zero to fourteen and measures how acidic or basic a solution is. A pH of seven is neutral — pure water. Below seven is acidic, above seven is basic or alkaline.

Acids release hydrogen ions in solution. Bases accept them or release hydroxide ions. When an acid and a base react, they neutralize each other, producing water and a salt.

This chemistry is happening constantly in your body. Your blood must stay between pH 7.35 and 7.45 — even slight deviations are life-threatening. Your stomach maintains a pH of around two to digest protein. Your small intestine needs a basic environment for nutrient absorption.

Industrial chemistry, agriculture, environmental monitoring, and medicine all require precise pH management.

The full lesson covers the pH scale, acid-base reactions, indicators, and buffer systems. Unlock it.
```

---
**CH-06 · Organic Chemistry · Grades 6–8 · Daniel**
```
Organic chemistry is the study of carbon-based compounds — and carbon's unique bonding properties make it the foundation of all known life.

A carbon atom has four bonding sites, allowing it to form chains, rings, and branching structures of almost unlimited complexity. Add hydrogen, oxygen, nitrogen, sulfur, and phosphorus to the mix, and you get the molecular vocabulary of biology: amino acids, sugars, lipids, nucleotides.

The functional groups attached to carbon skeletons determine a molecule's chemical behavior: hydroxyl groups make alcohols; carboxyl groups make acids; amine groups make bases; phosphate groups store energy.

Organic chemistry is why food spoils, why drugs work, why plastics are durable, and how life stores and transmits information through DNA.

The full lesson covers carbon bonding, functional groups, major organic molecule classes, and their biological roles. Unlock it.
```

---

### PHYSICS (6 clips)

---
**PH-01 · Sound and Vibration · K-2 · Callum**
```
Put your hand on your throat and hum. Feel that? That vibrating feeling — that's sound!

Sound is vibration. When something vibrates — guitar strings, your vocal cords, a drum — it pushes the air next to it. That push travels outward as a wave, and when it reaches your ear, it makes your eardrum vibrate. Your brain turns those vibrations into the sounds you hear.

Fast vibrations make high sounds, like a bird chirping. Slow vibrations make low sounds, like a big drum boom.

Sound needs something to travel through — air, water, even solid walls. But in outer space, where there's nothing, sound can't travel at all. That's why there's no sound in space!

This lesson is all about sound, vibration, and how we hear. Let's make some noise!
```

---
**PH-02 · Light and Color · K-2 · Callum**
```
White light is hiding a secret: it's actually made of all the colors of the rainbow mixed together.

You can prove it with a prism — a special piece of glass that bends light. When white light goes in, all the colors come out the other side: red, orange, yellow, green, blue, indigo, violet. A rainbow does the same thing, using water droplets in the air instead of glass.

Why do things have colors? Because surfaces absorb some colors of light and reflect others. A red apple absorbs all the colors except red — the red bounces back to your eyes. A black surface absorbs almost all light. A white surface reflects almost all of it.

Light is one of the most fascinating things in all of science.

This lesson shines a light on light — and all its amazing properties. Ready?
```

---
**PH-03 · Electricity and Circuits · Grades 3–5 · Charlotte**
```
Electricity is the flow of charged particles — usually electrons — through a conductor. Most metals conduct electricity well, which is why wires are made of copper.

For electricity to flow, it needs a complete path — a circuit. Break the circuit anywhere — like flipping a light switch — and the current stops. That's all a light switch does: it creates or breaks a gap in the circuit.

Every electronic device operates on this principle. A phone, a computer, a car — all are built from circuits of increasing complexity, from simple loops to microchips containing billions of transistors.

Batteries push current through a circuit by creating a difference in electrical potential — voltage — between their terminals. The higher the voltage and the lower the resistance, the more current flows.

The full lesson covers circuits, conductors, voltage, current, resistance, and Ohm's Law. Unlock it.
```

---
**PH-04 · Simple Machines · Grades 3–5 · Charlotte**
```
Humans have been using simple machines for thousands of years — and for good reason. They make hard things easier by trading force for distance.

There are six simple machines: lever, wheel and axle, pulley, inclined plane, wedge, and screw. They all work by applying the same principle: by increasing the distance over which a force is applied, you can reduce the force needed to do the same amount of work.

A ramp lets you move a heavy object to a higher level with less force than lifting straight up — but you have to push it a longer distance. A lever lets you lift a heavy rock by pushing down on one end — the longer your end, the less force you need.

These principles are in everything: scissors, bicycles, door handles, stairs.

The full lesson covers all six simple machines with interactive examples. Unlock it.
```

---
**PH-05 · Waves and the Electromagnetic Spectrum · Grades 6–8 · Daniel**
```
Light, radio waves, microwaves, X-rays, and gamma rays are all the same thing: electromagnetic radiation. They differ only in wavelength and frequency.

The electromagnetic spectrum runs from radio waves — with wavelengths longer than a football field — to gamma rays with wavelengths smaller than an atomic nucleus. Visible light occupies a tiny slice in the middle.

Different parts of the spectrum have different interactions with matter: radio waves pass through walls; X-rays pass through soft tissue but are absorbed by bone; UV radiation is absorbed by skin and can cause cellular damage; infrared radiation we experience as heat.

Technologies across medicine, communications, astronomy, and security all exploit specific parts of the spectrum for specific purposes.

The full lesson covers wave properties, the electromagnetic spectrum, and applications of each spectral region. Unlock it.
```

---
**PH-06 · Thermodynamics · Grades 6–8 · Daniel**
```
Heat is not a substance that flows between objects — it is the statistical behavior of enormous numbers of particles in motion.

Temperature is a measure of the average kinetic energy of particles in a system. When a hot object touches a cold one, the fast-moving particles of the hot object transfer energy to the slow-moving particles of the cold one, until both reach the same temperature. This transfer is heat.

The laws of thermodynamics define what's possible in any energy transformation. The first law states that energy is conserved — it changes form but is never created or destroyed. The second law states that entropy — disorder — always increases in an isolated system. This is why heat engines can't be perfectly efficient, and why a broken egg never spontaneously reassembles.

The full lesson covers all four laws of thermodynamics, heat transfer mechanisms, and applications in engines, refrigeration, and biological systems. Unlock it.
```

---

### FARMING (6 clips)

---
**FA-01 · Where Food Comes From · K-2 · Callum**
```
Before food ends up in the grocery store, it starts on a farm.

Seeds go into the soil. Roots reach down for water and nutrients. Stems push up toward the sun. Leaves grow and the plant gets bigger. Then — if everything goes well — fruits and vegetables appear, ready to be picked.

Farmers work every day to grow the food we eat. They plant seeds at the right time of year, water and care for their crops, protect them from insects and disease, and harvest them when they're ready.

Without farmers, there would be no fresh vegetables, no fruit, no wheat for bread, no corn, no rice.

Farming is one of the oldest and most important things human beings have ever done.

This lesson explores where food comes from — from seed to your plate!
```

---
**FA-02 · Seasons and Planting · K-2 · Callum**
```
Farmers are careful watchers of seasons.

In spring, when the ground warms up and days get longer, it's time to plant seeds. In summer, crops grow tall under the long sunny days. In fall, it's harvest time — gathering everything before the cold comes. In winter, the soil rests and farmers plan for the next year.

Different plants grow best in different seasons. Some like the cool of spring, others need summer heat. Planting at the wrong time means the plant won't grow well — or won't grow at all.

That's why farmers understand nature deeply. They watch the temperature, the rain, the length of the days, and the soil to know exactly when to plant.

Nature and farming work together. In this lesson, you'll discover how farmers follow the seasons!
```

---
**FA-03 · Soil and Nutrients · Grades 3–5 · Charlotte**
```
Healthy soil is not just dirt. It's a living system — full of bacteria, fungi, earthworms, insects, and minerals — all working together to provide plants with what they need to grow.

Plants need three main nutrients: nitrogen, phosphorus, and potassium. Nitrogen drives leafy growth. Phosphorus supports root development and flowering. Potassium helps with overall plant health and disease resistance.

When fields are farmed repeatedly without replenishment, nutrients deplete. Farmers replace them through compost, manure, crop rotation — planting different crops in sequence so each replenishes what the other uses — or synthetic fertilizers.

Healthy soil also absorbs water effectively, preventing runoff and erosion, and supports carbon sequestration. Soil health is increasingly recognized as fundamental to food security and climate resilience.

The full lesson covers soil composition, nutrients, and sustainable soil management practices. Unlock it.
```

---
**FA-04 · Water and Irrigation · Grades 3–5 · Charlotte**
```
Plants need water to survive — but in most parts of the world, rainfall alone isn't reliable enough or timed right to grow crops consistently.

Irrigation is the practice of artificially supplying water to crops. It has transformed agriculture: the ability to grow food in arid regions has allowed civilizations to develop in deserts, and has dramatically increased yields in regions with irregular rainfall.

Flood irrigation is the oldest method — flooding fields with water from nearby rivers. Drip irrigation, developed in Israel in the 1960s, delivers water directly to root zones through a network of pipes and emitters, using far less water with much less evaporation.

With freshwater already under pressure globally, water-efficient farming practices are becoming essential.

The full lesson covers irrigation methods, water use in agriculture, and strategies for improving efficiency. Unlock it.
```

---
**FA-05 · Sustainable Agriculture · Grades 6–8 · Daniel**
```
Industrial agriculture produces enormous quantities of food — but at significant environmental cost. Fertilizer runoff creates oceanic dead zones. Monocultures deplete soil diversity and require ever-increasing pesticide applications. Livestock production contributes substantially to greenhouse gas emissions. Freshwater aquifers are being drawn down faster than they recharge.

Sustainable agriculture seeks to meet current food production needs without compromising the ability of future generations to meet theirs. Approaches include regenerative agriculture — building soil health through cover crops, reduced tillage, and integrated livestock; precision agriculture — using sensor technology and data to apply exactly the right inputs where and when needed; and agroforestry — integrating trees into crop and livestock systems.

None of these is a complete solution individually. The challenge is scaling sustainable practices without sacrificing yield.

The full lesson covers industrial agriculture's environmental footprint, alternative approaches, and the policy landscape. Unlock it.
```

---
**FA-06 · Food Systems and Supply Chains · Grades 6–8 · Daniel**
```
A loaf of bread involves wheat grown in Kansas, harvested by GPS-guided combines, shipped to a mill in Ohio, ground into flour, combined with yeast from a fermentation facility in Europe, baked in a commercial bakery in Illinois, packaged, shipped to a distribution center, and delivered to a store — before you walk in and put it in your cart.

That chain — from seed to shelf — is the food system. It involves farmers, processors, packagers, distributors, retailers, and regulators. It is highly efficient at scale and highly vulnerable to disruption, as COVID-19 demonstrated when supply chains broke and store shelves went empty.

Food deserts — areas without access to fresh, affordable food — reveal where the system's efficiency benefits don't reach.

The full lesson covers how the modern food system works, its vulnerabilities, and alternatives including local food systems and urban farming. Unlock it.
```

---

### HOUSEHOLD MANAGEMENT (6 clips)

---
**HM-01 · Taking Care of Your Space · K-2 · Callum**
```
Your home is a special place — and it works best when everyone helps take care of it.

Picking up your toys, making your bed, putting dirty clothes in the laundry basket — these small jobs are called chores. They might seem small, but they add up! When everyone does their part, the home stays tidy and comfortable for everyone.

Taking care of your space also means taking care of your things. Putting things away where they belong means you can find them again. Treating your belongings carefully means they last longer.

And there's something special about a space that's clean and organized — it can help your brain feel calm and ready to work.

This lesson is about taking pride in your home and learning simple ways to help. Let's get started!
```

---
**HM-02 · Cooking Basics · K-2 · Callum**
```
Cooking is one of the most useful skills in the whole world — and you can start learning right now.

Cooking means taking ingredients and turning them into food. It can be as simple as spreading peanut butter on bread, or as fancy as baking a birthday cake.

But before any cooking starts, there are two rules that always come first: wash your hands, and ask a grown-up for help with anything hot or sharp.

When you cook, you practice math — measuring cups and spoons. You practice science — heat changes food! You practice reading — following a recipe is like following instructions.

And best of all, you get to eat what you made.

In this lesson, we'll explore the kitchen and learn some safe, simple first steps. Ready to cook?
```

---
**HM-03 · Home Safety · Grades 3–5 · Charlotte**
```
Homes are safe spaces — but safety doesn't happen automatically. It requires awareness and habits.

Fire safety means knowing two escape routes from every room, having a meeting point outside, never playing with matches or lighters, and knowing how to stop-drop-and-roll. Electrical safety means never overloading outlets, keeping electronics away from water, and recognizing the smell of burning as a warning signal.

Kitchen safety means understanding which tools require adult supervision, how to handle knives safely, and how to deal with minor burns. First aid basics — how to treat a small cut, what to do when someone is choking, when to call emergency services — belong in everyone's knowledge base.

Being safety-aware isn't about being fearful. It's about being prepared.

The full lesson covers fire safety, kitchen safety, electrical safety, first aid basics, and what to do in an emergency. Unlock it.
```

---
**HM-04 · Money and Family Budgeting · Grades 3–5 · Charlotte**
```
A family budget is a plan for how the family's money gets used. It might include rent or mortgage, groceries, utilities like electricity and water, transportation, school supplies, clothing, and savings.

Making a budget means listing everything money is spent on, adding it up, and comparing it to how much comes in. If spending is higher than income, something has to change. If income is higher, the extra can go to savings or extras.

Families have different priorities and different incomes, which is why every family budget looks different. But the process is the same: be honest about what's coming in, be honest about what's going out, and make a plan.

Learning how family budgets work helps you understand money decisions your family makes — and builds habits for your own future.

The full lesson covers budget categories, tracking, and how to adjust when budgets don't balance. Unlock it.
```

---
**HM-05 · Meal Planning and Nutrition · Grades 6–8 · Daniel**
```
What you eat determines more about your long-term health than almost any other single factor. And yet most people spend less time thinking about food choices than about what to watch on TV.

Nutrition science is genuinely complex — the research is often contradictory and heavily influenced by industry funding. But some principles are well-established: diets high in vegetables, legumes, whole grains, and lean proteins and low in ultra-processed foods and added sugars are consistently associated with better health outcomes across populations.

Meal planning is the practical skill of translating nutritional goals into weekly food decisions: deciding in advance what you'll eat, buying accordingly, and preparing efficiently to avoid defaulting to convenience food.

The full lesson covers macronutrients, micronutrients, reading food labels, practical meal planning frameworks, and how to evaluate nutritional claims. Unlock it.
```

---
**HM-06 · Home Finance and Independent Living · Grades 6–8 · Daniel**
```
At some point, you'll be responsible for running a household — and almost nothing in school specifically prepares you for it.

Renting an apartment means understanding a lease, what renters' insurance covers, how security deposits work, and what your rights are as a tenant. Utilities — electricity, gas, water, internet — each have billing cycles, rate structures, and ways to reduce consumption.

Grocery shopping efficiently means understanding unit pricing, knowing which items fluctuate in price, and planning meals before shopping rather than buying speculatively. Home repairs fall into two categories: things you can learn to do yourself, and things where calling a professional is worth the cost.

These skills compound. People who manage their homes efficiently have more time, less stress, and more money for what actually matters to them.

The full lesson covers renting, utilities, efficient grocery shopping, and home maintenance basics. Unlock it.
```

---

### ADVANCED MATH (6 clips)

---
**AM-01 · Introduction to Algebra · K-2 · Callum**
```
Here's a puzzle: there's a box. Inside the box, there are some apples. Together, the box and three more apples make seven apples. How many apples are in the box?

Four! Did you figure it out?

That's algebra — figuring out a missing number. In algebra, we use a letter like X or N to stand for the mystery number. X plus three equals seven. What is X?

This might look like fancy math, but you already know how to do it — you just did!

Algebra is all about finding what's unknown by using what you do know. It's like being a math detective.

And once you learn it, it opens up a whole new world of problem-solving.

This lesson is your first step into algebra. Let's solve some mysteries!
```

---
**AM-02 · Patterns and Sequences · K-2 · Callum**
```
Look at this: two, four, six, eight — what comes next?

Ten! It goes up by two each time. That's a pattern!

Patterns are everywhere in math. Numbers that repeat. Shapes that follow a rule. Sequences that grow or shrink in a predictable way.

Recognizing patterns is one of the most important skills in all of mathematics. It's how mathematicians discover new ideas — they notice something happening again and again and ask: why?

Even music has patterns — the beat repeating, the melody returning. Art has patterns. Nature has patterns: the spirals in a sunflower, the stripes on a zebra.

Your brain is actually wired to find patterns. Mathematics just gives you tools to describe them precisely.

This lesson is all about spotting, describing, and creating patterns. Let's find some!
```

---
**AM-03 · Geometry: Angles and Proofs · Grades 3–5 · Charlotte**
```
An angle is formed when two lines meet at a point. A right angle is exactly 90 degrees — the corner of a square. Acute angles are less than 90 degrees. Obtuse angles are more than 90 degrees but less than 180.

These definitions matter because geometry isn't just about shapes — it's about logical reasoning. Every geometric fact can be proven from first principles using only definitions, postulates, and previously proven theorems.

The ancient Greek mathematician Euclid wrote a book called Elements — one of the most influential mathematical texts ever written — that proved hundreds of geometric theorems from just five basic assumptions. The logical structure he established is still the foundation of formal mathematical proof.

Understanding angles, their relationships, and how to reason about them precisely is essential for everything from architecture to computer graphics.

The full lesson covers angle types, angle relationships, the triangle angle sum theorem, and an introduction to two-column proofs. Unlock it.
```

---
**AM-04 · Coordinate Geometry · Grades 3–5 · Charlotte**
```
A coordinate plane is a grid created by two perpendicular number lines — the horizontal x-axis and the vertical y-axis. Any point on the plane can be identified by exactly one pair of numbers: its x coordinate and its y coordinate.

René Descartes invented this system in the 17th century — it's named the Cartesian plane after him — and it was revolutionary. It connected algebra and geometry, allowing geometric shapes to be described with equations and algebraic equations to be visualized as curves.

The line y equals mx plus b, the circle with center at the origin, the parabola — all are geometric objects defined by algebraic equations in Cartesian coordinates.

The full lesson covers plotting points, distance and midpoint formulas, graphing lines and parabolas, and the connection between algebraic and geometric representations. Unlock it.
```

---
**AM-05 · Trigonometry · Grades 6–8 · Daniel**
```
Trigonometry is the mathematics of triangles — specifically the relationships between angles and the ratios of sides. Those relationships, it turns out, describe an enormous range of phenomena.

In a right triangle, the sine of an angle is the ratio of the opposite side to the hypotenuse. Cosine is adjacent over hypotenuse. Tangent is opposite over adjacent. These ratios are fixed for any given angle — which means knowing an angle tells you the exact ratio between the sides.

This is how surveyors calculate distances to inaccessible points, how engineers calculate the forces on structural components, and how GPS satellites triangulate your location. It's also the mathematical foundation for wave physics — the sine curve is the fundamental waveform underlying sound, light, and electrical signals.

The full lesson covers the six trig functions, the unit circle, identities, and applications in physics and engineering. Unlock it.
```

---
**AM-06 · Mathematical Proof · Grades 6–8 · Daniel**
```
In everyday language, "proof" means convincing evidence. In mathematics, it means something much stronger: a logically airtight argument that a statement must be true, given certain starting assumptions, with absolutely no exceptions.

Mathematical proof is why we know things in mathematics are true with a certainty that no other discipline can match. A theorem proven 2,000 years ago is still true today. No new observation can overturn it, because it was derived from logic, not from data.

The methods of proof include direct proof — deriving the conclusion step by step from premises; proof by contradiction — assuming the opposite and showing it leads to an impossibility; and mathematical induction — proving something is true for all natural numbers by proving it for the first and showing each implies the next.

The full lesson covers proof strategies with worked examples across number theory, geometry, and algebra. Unlock it.
```

---

### READING (5 clips)

---
**RE-01 · Phonics and Sounding Out Words · K-2 · Callum**
```
Every word is made of sounds. And each letter — or group of letters — makes a sound.

Learning which letters make which sounds is called phonics. Once you know it, you can sound out almost any word you've never seen before — just by reading the letters and putting the sounds together.

Cat: C says "kuh," A says "ah," T says "tuh" — put them together and you get "cat!" 

Some letters are sneaky — like the silent E in "cake" that makes the A say its name. Or the way PH makes an "f" sound. But once you learn the patterns, you can crack the code.

Phonics is the key that unlocks reading. And once you have it, books are yours — every single one of them.

Let's practice the sounds together in this lesson!
```

---
**RE-02 · Sight Words · K-2 · Callum**
```
Some words show up over and over in almost everything you read. Words like "the," "and," "is," "was," "you," "they," "what," "where."

These are called sight words — and the fastest way to become a good reader is to recognize them instantly, without sounding them out each time.

Some sight words are tricky because they don't follow normal phonics rules. "Was" doesn't sound like it looks. "The" is unusual. But once your brain knows them by heart, reading feels much smoother and faster.

Readers who know their sight words can focus on understanding the story instead of struggling through every word.

In this lesson, we'll practice the most important sight words until they feel completely natural. Ready? Let's read!
```

---
**RE-03 · Understanding Story Structure · Grades 3–5 · Charlotte**
```
Once you know the hidden structure inside every story, reading becomes a whole different experience.

Almost every story follows the same shape: things start normally, then something changes — the inciting incident. That change creates a problem. The main character tries to solve it — and usually fails once or twice, building tension. Then comes the climax: the highest-stakes moment where everything is on the line. After that, things resolve — one way or another.

This structure is called the story arc, or narrative arc. Understanding it helps you predict what will happen, understand why things happen, and notice when a story does something unexpected.

It also makes you a better writer. Once you know the formula, you can use it — or break it deliberately for effect.

The full lesson covers story arc, character development, conflict types, and how to analyze any story using these tools. Unlock it.
```

---
**RE-04 · Reading Across Genres · Grades 3–5 · Charlotte**
```
Every type of reading does something different. And skilled readers know how to adjust their approach depending on what they're reading.

Fiction tells stories — novels, short stories, fables, myths. You read fiction for character, plot, emotion, and meaning. Poetry compresses language into images and sound — you slow down, re-read, and listen for rhythm and resonance.

Nonfiction informs: articles, biographies, textbooks, how-to guides. You read to extract information, evaluate sources, and build knowledge. Drama is written to be performed — reading a play means imagining the staging and the voices.

Each genre has its own conventions, its own tools, and its own rewards. A student who can move fluently between them has an enormous advantage in school and in life.

The full lesson covers major reading genres, their conventions, and strategies for reading each effectively. Unlock it.
```

---
**RE-05 · Critical Reading · Grades 6–8 · Daniel**
```
Reading is not passive. Critical reading means engaging actively with a text — questioning its claims, evaluating its evidence, noticing its assumptions, and forming your own informed response.

Every text has a purpose. A newspaper article aims to inform, but an editorial aims to persuade — and the difference matters. An advertisement makes claims that need evaluation. A textbook presents a particular version of events that reflects choices about what to include and exclude.

Critical readers ask: who wrote this? For what purpose? For what audience? What evidence is offered? What's left out? Do the conclusions follow from the evidence?

These questions don't mean being cynical about everything you read. They mean bringing an active, evaluating intelligence to the page — which is what reading was always meant to require.

The full lesson covers author purpose, bias identification, evaluating evidence, and developing informed critical responses. Unlock it.
```

---

### GENERAL RELATIVITY (5 clips)

---
**GR-01 · What Is Gravity? · K-2 · Callum**
```
Drop a ball. It falls. Why?

For thousands of years, people just accepted that things fall down. Then Isaac Newton figured out there's an invisible force pulling everything toward everything else — and he called it gravity.

Gravity is what keeps you on the ground. It's what keeps the Moon going around Earth, and Earth going around the Sun. The bigger something is, the more gravity it has. The Sun is so massive that its gravity holds the whole solar system together.

But here's something even more amazing: Albert Einstein later discovered that gravity isn't really a pulling force. It's actually a bend in space itself caused by heavy objects.

Gravity is one of the deepest mysteries in all of science — and scientists are still learning about it today.

This lesson begins the journey. Let's explore gravity together!
```

---
**GR-02 · Time and Space · Grades 3–5 · Charlotte**
```
Albert Einstein changed how scientists understand the universe with just two ideas: the laws of physics are the same everywhere, and light always travels at the same speed no matter what.

From those two ideas, he worked out something shocking: time and space are not fixed. They change depending on how fast you're moving.

If you traveled near the speed of light, time would slow down for you. You might experience an hour while people on Earth experienced a year. This isn't science fiction — it's been measured with precise atomic clocks on airplanes and satellites.

Space and time are connected into something called spacetime. And massive objects — like Earth, like the Sun — warp that spacetime around them, causing gravity.

This lesson explores special and general relativity in a way that makes these wild ideas understandable. Unlock it!
```

---
**GR-03 · Einstein's Field Equations · Grades 6–8 · Daniel**
```
In 1915, Albert Einstein published the general theory of relativity — and physics has never been the same.

General relativity describes gravity not as a force between objects, but as the curvature of four-dimensional spacetime caused by mass and energy. Massive objects warp the fabric of spacetime around them; other objects follow the curved paths created by that warping — which we experience as gravitational attraction.

The theory makes precise, testable predictions that Newtonian gravity cannot: the bending of light around massive objects, the precession of Mercury's orbit, the time dilation experienced in strong gravitational fields, and the existence of gravitational waves — ripples in spacetime caused by accelerating masses. All have been confirmed experimentally.

The full lesson covers the conceptual framework of general relativity, its key predictions, and the experiments that confirmed them. Unlock it.
```

---
**GR-04 · Black Holes and Spacetime · Grades 6–8 · Daniel**
```
General relativity predicted something that seemed absurd when Einstein first proposed it: a region of spacetime from which not even light could escape. We now call these regions black holes.

When a sufficiently massive star exhausts its nuclear fuel, nothing can stop its core from collapsing under its own gravity. The density increases without limit at the singularity — a point where our current physics breaks down. The event horizon marks the boundary of no return: inside it, all paths through spacetime lead only toward the singularity.

Black holes are no longer theoretical. We have detected them through gravitational wave astronomy, through X-ray emissions from matter spiraling into them, and — in 2019 — through direct imaging of the shadow cast by the black hole at the center of galaxy M87.

The full lesson covers black hole formation, the event horizon, Hawking radiation, and the ongoing theoretical questions at the intersection of general relativity and quantum mechanics. Unlock it.
```

---
**GR-05 · Gravitational Waves · Grades 9–12 · Rachel**
```
On September 14, 2015, the LIGO detectors registered a signal lasting less than a second — a chirp. That signal was a gravitational wave generated by two black holes, each roughly 30 solar masses, merging 1.3 billion light-years away. The merger released more energy in that fraction of a second than all the stars in the observable universe radiate in the same time.

Gravitational waves are ripples in the curvature of spacetime itself, propagating at the speed of light. Einstein predicted their existence in 1916, but considered them too small to ever detect. The LIGO interferometers measure changes in the length of four-kilometer arms smaller than one ten-thousandth the diameter of a proton.

The detection opened gravitational wave astronomy — a completely new observational window on the universe, sensitive to events invisible to electromagnetic telescopes.

The full lesson covers the physics of gravitational waves, interferometric detection, confirmed sources, and what multi-messenger astronomy is teaching us about the universe. Unlock it.
```

---

### SOCIAL STUDIES WORLD (5 clips)

---
**SW-01 · Families Around the World · K-2 · Callum**
```
Families come in all shapes and sizes.

Some families have two parents, some have one. Some families have grandparents or aunts and uncles living in the same home. Some families are very large, with many brothers and sisters. Some have only one child.

Around the world, families look different and live differently. In some countries, it's normal for three or four generations to share a home. In others, young adults move away and live independently.

But no matter how different families look on the outside, most share the same heart: caring for each other, teaching each other, and spending time together.

In this lesson, we'll discover how families live in different parts of the world — and celebrate everything we have in common. Come along!
```

---
**SW-02 · Celebrations and Traditions · K-2 · Callum**
```
Every culture in the world has special celebrations — holidays, festivals, rituals that mark important moments and bring people together.

In China, the Lunar New Year is celebrated with fireworks, dumplings, and red envelopes. In India, Diwali — the Festival of Lights — lights up homes and streets with oil lamps and fireworks. In Mexico, Día de los Muertos honors loved ones who have died with colorful altars and marigold flowers. In many countries, families gather for religious celebrations, harvests, and new years.

Traditions tell stories about who people are, what they value, and what they want to remember.

Learning about other people's celebrations is one of the most wonderful ways to understand the world.

This lesson visits celebrations from cultures around the globe. Let's explore!
```

---
**SW-03 · World Religions Overview · Grades 3–5 · Charlotte**
```
Billions of people across the world hold religious beliefs that guide how they live, what they celebrate, and how they understand the universe.

Christianity, with approximately 2.4 billion followers, centers on the life and teachings of Jesus. Islam, with 1.9 billion followers, follows the teachings of the Prophet Muhammad recorded in the Quran. Hinduism, one of the world's oldest religions with over a billion followers, has a rich diversity of practices and beliefs. Buddhism, Buddhism follows the teachings of Siddhartha Gautama on reducing suffering through wisdom and practice. Judaism, the oldest Abrahamic faith, has given rise to both Christianity and Islam.

These are major traditions in a much larger religious landscape, which also includes Sikhism, Taoism, indigenous religions, and many others.

The full lesson introduces each major religion with respect and curiosity — exploring beliefs, practices, and sacred texts without promoting any single tradition. Unlock it.
```

---
**SW-04 · Global Trade and Interdependence · Grades 3–5 · Charlotte**
```
No country produces everything it needs. Every nation relies on others for some combination of food, energy, technology, medicines, or raw materials.

This mutual reliance is called interdependence — and it's the foundation of the global economy. Japan imports nearly all its oil. The Netherlands exports vast quantities of agricultural products from a small land area using highly efficient farming. Saudi Arabia exports oil and imports most of its food.

When trade flows freely, countries can specialize in what they produce most efficiently and trade for everything else — in theory, making everyone better off. When trade is disrupted — by conflict, by pandemic, by sanctions — the effects ripple through supply chains worldwide.

The full lesson covers comparative advantage, trade relationships, the history of international trade, and the ongoing debates about globalization's costs and benefits. Unlock it.
```

---
**SW-05 · Human Rights · Grades 6–8 · Daniel**
```
Human rights are the rights held by all people simply by virtue of being human — regardless of nationality, ethnicity, gender, religion, or any other status.

The modern human rights framework emerged from the atrocities of World War II. The Universal Declaration of Human Rights, adopted by the United Nations in 1948, established for the first time a global standard of rights: to life, to freedom from torture, to education, to a fair trial, to political participation, to freedom of thought and expression.

These rights are frequently violated. Authoritarian governments suppress political rights. Poverty denies economic rights. Discrimination violates equality rights. The gap between the Declaration's aspirations and the world's reality is enormous.

But the framework matters. It gives human rights advocates a shared language and a legal basis for accountability.

The full lesson covers the history of human rights, the Declaration's major provisions, mechanisms for enforcement, and case studies of rights violations and advocacy. Unlock it.
```

---

### EXAM PREP (5 clips)

---
**EP-01 · Test-Taking Strategies · Grades 3–5 · Charlotte**
```
Knowing the material is only part of doing well on a test. How you take the test matters too.

Start by scanning through the whole test before you begin — get a sense of what's there and how long it is. Answer the questions you're confident about first, and come back to the harder ones. This prevents spending too much time on one question and running out of time for easier points later.

For multiple choice, read every option before choosing — the first one might look right, but a later one might be more precise. For written answers, re-read the question after writing your response to make sure you actually answered what was asked.

Test anxiety is real and common. Deep breaths, confident self-talk, and preparation all help.

The full lesson covers time management on tests, multiple choice and written response strategies, and how to prepare in the days before. Unlock it.
```

---
**EP-02 · Study Skills and Habits · Grades 3–5 · Charlotte**
```
The most important thing about studying isn't how long you do it — it's how you do it.

Passive studying — reading notes over and over, highlighting — gives you the feeling of learning without much actual learning. Active studying — testing yourself, explaining concepts out loud, trying practice problems — builds memory that sticks.

Spacing out your studying over multiple sessions is dramatically more effective than a single long session the night before a test. This is called spaced practice, and the science behind it is very strong.

A distraction-free environment matters. Your brain can't truly multitask — studying while watching TV or scrolling your phone means you're doing both things badly.

The full lesson covers active learning techniques, spaced practice, how memory works, and how to build a study system that actually works. Unlock it.
```

---
**EP-03 · SAT Reading and Writing · Grades 6–8 · Daniel**
```
The SAT Reading and Writing section tests a specific set of skills: understanding the main idea of a passage, identifying how evidence supports claims, choosing the most precise and grammatically correct option, and using transition words and logical connectors appropriately.

The most useful thing to know is that all answers are in the passage — you're never asked to bring in outside knowledge. Every answer can be justified with specific text evidence. When you find yourself choosing based on what seems generally true or reasonable, you're likely on the wrong path.

For grammar and editing questions, the SAT favors concision: if two options are grammatically correct, the shorter, cleaner one is almost always right.

The full lesson covers all Reading and Writing question types, common traps, and timed practice strategies. Unlock it.
```

---
**EP-04 · SAT Math · Grades 6–8 · Daniel**
```
The SAT Math section tests algebra, problem-solving, and data analysis — not obscure formulas or tricks. Almost every question tests whether you understand a core concept, not whether you've memorized an edge case.

The most important skill is translating word problems into equations. Most students who miss questions do so not because they can't do the math, but because they set up the equation incorrectly.

The calculator section rewards efficiency: using algebra to solve quickly is often faster than entering numbers into a calculator. The no-calculator section rewards understanding: you need to know how equations behave, not just how to evaluate them.

The full lesson covers algebra, functions, geometry, statistics, and data analysis with strategies for each question type and common mistake patterns. Unlock it.
```

---
**EP-05 · College Application Essays · Grades 9–12 · Rachel**
```
The college essay is not about having an impressive story. It is about demonstrating self-awareness, intellectual curiosity, and the ability to reflect meaningfully on experience.

Admissions officers read thousands of essays about sports injuries, service trips, and immigrant grandparents. What distinguishes memorable essays isn't the topic — it's the quality of thinking. An essay about learning to bake bread with genuine insight into identity, failure, and growth will outperform a dramatic story told without reflection.

The Common App prompt asking "Describe a challenge you've faced" is not asking for a catalog of suffering. It's asking: how do you process difficulty? What do you learn? How do you grow?

Strong essays have a specific, concrete opening that creates immediate engagement. They avoid generic statements about passion and leadership. They end with a forward-looking insight, not just a summary.

The full lesson covers all Common App prompts, essay structure, revision strategies, and examples of effective and ineffective approaches. Unlock it.
```

---

## Step 4 — Complete DB Seed SQL

Run in Supabase SQL Editor (`osnxbuusohdzzcrakavn`). Split into 4 batches if needed.

> **Note:** Full SQL seed file is ~4,000 lines. For agent execution, generate INSERT statements from the scripts above using the pattern:
```sql
INSERT INTO lesson_narrations 
  (lesson_key, subject, lesson_title, age_group, script, voice_id, voice_name, char_count)
VALUES
  ('s01-what-is-matter_k2', 'Science', 'What Is Matter?', 'grades-k2',
   '[script text with escaped single quotes]',
   'N2lVS1w4EtoT3dr4eOWO', 'Callum', [char_count])
ON CONFLICT (lesson_key, age_group) DO NOTHING;
```

**Voice ID reference (repeat):**
- grades-k2 → `N2lVS1w4EtoT3dr4eOWO` (Callum)
- grades3-5 → `XB0fDUnXU5powFXDhCwa` (Charlotte)
- grades6-8 → `onwK4e9ZLuTAKqWW03F9` (Daniel)
- grades9-12 → `21m00Tcm4TlvDq8ikWAM` (Rachel)

---

## Step 5 — Edge Function (same as original brief)

Deploy `generate-lesson-narrations` as specified in the original brief. No changes required — the function reads from `lesson_narrations` table and processes in batches of 3.

**Revised schedule** (200 clips ÷ 3 per run = 67 runs):
```sql
SELECT cron.schedule(
  'generate-lesson-narrations',
  '*/2 * * * *',  -- every 2 min for faster processing
  $$SELECT net.http_post(
    url := 'https://osnxbuusohdzzcrakavn.supabase.co/functions/v1/generate-lesson-narrations',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```
At 3 clips/run × every 2 min → **all 200 clips done in ~2.5 hours.**

---

## Step 6 — Remove Old Title-Read Audio Jobs

```sql
-- Preview count first
SELECT COUNT(*) FROM media_generation_jobs WHERE asset_type = 'audio';

-- Delete all 1,654 title-read jobs
DELETE FROM media_generation_jobs WHERE asset_type = 'audio';
```

---

## Cost Summary

| Age Group | Clips | Avg Chars | Total Chars | Cost @ $0.24/1k |
|---|---|---|---|---|
| Grades K–2 | 60 | 620 | 37,200 | $8.93 |
| Grades 3–5 | 60 | 680 | 40,800 | $9.79 |
| Grades 6–8 | 50 | 740 | 37,000 | $8.88 |
| Grades 9–12 | 30 | 820 | 24,600 | $5.90 |
| **TOTAL** | **200** | **698 avg** | **139,600** | **~$33.50** |

**Within $50 budget. Fits within ElevenLabs Pro 500k monthly chars if billing cycle resets = ~$0.**

---

## Frontend Integration

Each `lesson_narrations` record includes:
- `audio_url` — public Supabase Storage URL, direct `<audio>` tag playback
- `age_group` — match to student's detected or selected grade band
- `subject` + `lesson_title` — for lookup and display
- `duration_seconds` — for progress bar UI

**Suggested UX:** Autoplay the narration when a student opens a lesson. No paywall — it's included. The narration itself becomes a reason to come back: "Hear today's lesson read to you."

---

*200 scripts written. 20 subjects. 4 age groups. All voices assigned. Ready for agent execution.*
