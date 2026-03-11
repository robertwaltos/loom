# AGENT BRIEF: Koydo Teaser Narration Generation
**Project:** Koydo EdTech — Upsell Audio Teasers  
**Supabase Project:** `osnxbuusohdzzcrakavn` (us-east-1)  
**Date:** March 10, 2026  
**Estimated ElevenLabs Cost:** ~$7.20 (40 clips × ~750 chars avg × $0.24/1k)  
**Budget ceiling:** $50  

---

## Overview

Generate 40 short teaser narrations (10 lessons × 4 age groups) as a "Coming Soon / Unlock Full Audio" upsell mechanic. Each clip is ~90–120 words, voiced appropriately for the age group. These are NOT full lessons — they are hooks that preview the lesson concept and end with a soft call-to-action.

---

## Step 1 — DB Migration

Run this migration first to create the storage table. This is idempotent.

```sql
-- Migration: create_lesson_narrations_table
CREATE TABLE IF NOT EXISTS lesson_narrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_key TEXT NOT NULL,           -- e.g. "photosynthesis_grades1-2"
  subject TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('grades1-2', 'grades3-5', 'grades6-8', 'grades9-12')),
  script TEXT NOT NULL,
  voice_id TEXT NOT NULL,             -- ElevenLabs voice ID
  voice_name TEXT NOT NULL,           -- human-readable
  audio_url TEXT,                     -- filled after generation
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
```

**Run in:** Supabase SQL Editor → project `osnxbuusohdzzcrakavn`

---

## Step 2 — ElevenLabs Voice Reference

These are production voice IDs from ElevenLabs. Use exactly as written.

| Voice Name | Voice ID | Age Group | Character |
|---|---|---|---|
| `Callum` | `N2lVS1w4EtoT3dr4eOWO` | grades 1–2 | Warm, slow, wonder-filled male |
| `Charlotte` | `XB0fDUnXU5powFXDhCwa` | grades 3–5 | Friendly, clear, encouraging female |
| `Daniel` | `onwK4e9ZLuTAKqWW03F9` | grades 6–8 | Confident, curious, neutral male |
| `Rachel` | `21m00Tcm4TlvDq8ikWAM` | grades 9–12 | Crisp, intelligent, engaging female |

**Model:** `eleven_multilingual_v2`  
**Settings for all clips:**
```json
{
  "stability": 0.55,
  "similarity_boost": 0.80,
  "style": 0.20,
  "use_speaker_boost": true
}
```

---

## Step 3 — The 10 Lessons + 40 Scripts

Each lesson has 4 age-group versions. Scripts end with a CTA that fades into upsell UI.

---

### LESSON 1 — Photosynthesis (Science)

**Subject:** Science | **Core concept:** How plants make food from sunlight

---

#### 1A · Grades 1–2 · Voice: Callum

```
Hey there, little explorer! Have you ever wondered... why leaves are green? 

Here's an amazing secret. Plants are actually chefs. Every single day, while you're sleeping, while you're playing, plants are quietly cooking their own food — using nothing but sunshine, water, and air.

They catch sunlight with tiny green helpers inside their leaves. Then they mix it with water from the soil and a little bit of air. And out comes sugar — the plant's very own meal.

It sounds like magic. But it's science! And it has a name: photosynthesis.

Ready to see exactly how it works? Unlock the full lesson to dive in.
```
**Chars:** ~590 | **Voice:** Callum | **Stability:** 0.55

---

#### 1B · Grades 3–5 · Voice: Charlotte

```
Plants might look quiet and still — but inside every leaf, something incredible is happening right now.

Plants don't eat food the way you do. They make it. Using sunlight as their energy source, they pull in water through their roots and carbon dioxide from the air. Then, inside tiny structures called chloroplasts, they run a chemical reaction that produces glucose — pure sugar — as food.

The byproduct? Oxygen. The very air you're breathing right now came from plants running this process, over and over, for millions of years.

That process is called photosynthesis. It's one of the most important reactions on Earth.

Want to go deeper? Unlock the full lesson and see it step by step.
```
**Chars:** ~670 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 1C · Grades 6–8 · Voice: Daniel

```
Every living thing on Earth depends on a single chemical reaction — and most people never think about it.

Photosynthesis is how plants convert light energy into chemical energy stored as glucose. The equation is straightforward: six molecules of carbon dioxide plus six of water, energized by light, yield one glucose molecule and six molecules of oxygen.

But the mechanism is anything but simple. It happens in two stages — the light-dependent reactions in the thylakoid membranes, and the Calvin cycle in the stroma. Each stage has its own set of proteins, electron carriers, and feedback loops.

Understanding this reaction means understanding the base of every food chain on the planet.

Unlock the full lesson to break down both stages in detail.
```
**Chars:** ~720 | **Voice:** Daniel | **Stability:** 0.60

---

#### 1D · Grades 9–12 · Voice: Rachel

```
Photosynthesis is the thermodynamic engine that made complex life possible on Earth — and it runs on quantum mechanics.

When photons strike chlorophyll molecules, electrons are excited to a higher energy state. That energy is captured and shuttled through the electron transport chain, driving the synthesis of ATP and NADPH. The light-independent reactions then use that chemical energy to fix atmospheric carbon dioxide into three-carbon sugars via the Calvin cycle.

What makes this remarkable is the efficiency: photosynthetic organisms have been optimizing this system for 3.5 billion years. Some processes within the reaction center appear to use quantum coherence to achieve near-perfect energy transfer.

The full lesson covers both reaction stages, limiting factors, and C3 versus C4 pathways.

Unlock it to go all the way in.
```
**Chars:** ~770 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 2 — The American Revolution (Social Studies US)

**Subject:** Social Studies US | **Core concept:** Why the colonies declared independence

---

#### 2A · Grades 1–2 · Voice: Callum

```
A long, long time ago — about 250 years ago — the land we call America was not its own country yet.

It was ruled by a king who lived far, far away across the ocean. The people living here had to follow his rules... but they had no say in making them. And that didn't feel fair.

So the people here made a very brave decision. They said: we want to make our own rules. We want to be free.

And they wrote it down in a famous letter called the Declaration of Independence.

That's how America began — with people saying, very loudly: we have rights. And we will stand up for them.

Want to hear the whole story? Unlock the full lesson.
```
**Chars:** ~640 | **Voice:** Callum | **Stability:** 0.50

---

#### 2B · Grades 3–5 · Voice: Charlotte

```
Imagine if someone far away made all the rules for your life — and you couldn't vote, couldn't complain, couldn't even say anything about it. That's what life felt like for American colonists in the 1770s.

They were British citizens, but they had no representatives in the British Parliament. When Britain started taxing them heavily — on tea, on paper, on almost everything — and still refused to listen, the colonists reached a breaking point.

Leaders like Thomas Jefferson, Benjamin Franklin, and George Washington decided it was time to act. On July 4th, 1776, they signed a document declaring they were no longer part of Britain. They called it the Declaration of Independence.

It changed the world. Unlock the full lesson to find out how.
```
**Chars:** ~680 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 2C · Grades 6–8 · Voice: Daniel

```
The American Revolution wasn't inevitable — it was the result of a decade of escalating decisions, most of which could have gone differently.

After the Seven Years' War, Britain was deep in debt and decided to tax its American colonies directly. The colonists objected — not just to the taxes themselves, but to the principle: taxation without representation in Parliament. Protests escalated into boycotts, then into violence. The Boston Massacre. The Boston Tea Party. British crackdowns. Continental Congresses.

By 1776, enough colonial leaders believed reconciliation was impossible. Thomas Jefferson drafted the Declaration of Independence, making the philosophical case — rooted in Enlightenment thought — that governments derive their power from the consent of the governed.

It was a radical idea. It still is. Unlock the full lesson.
```
**Chars:** ~760 | **Voice:** Daniel | **Stability:** 0.60

---

#### 2D · Grades 9–12 · Voice: Rachel

```
The American Revolution is often taught as an inevitable march toward liberty. Historians tell a more complicated story.

The colonial elite who led the revolution were not acting purely on principle — they were also protecting economic interests threatened by British mercantile policy. The ideals articulated in the Declaration of Independence coexisted with the institution of slavery, a contradiction the founders acknowledged and deferred. The revolution transferred power from a British ruling class to an American one, leaving large populations — enslaved people, women, Indigenous nations — largely outside the new political order.

None of this diminishes the intellectual achievement of the founding documents, or the genuine radicalism of challenging hereditary monarchy. It does complicate the narrative.

The full lesson examines both the ideals and the contradictions in depth. Unlock it.
```
**Chars:** ~790 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 3 — Linear Functions and Graphs (Math)

**Subject:** Math | **Core concept:** What a linear function is and how to graph it

---

#### 3A · Grades 1–2 · Voice: Callum

```
Let's play a game. If I give you one cookie, and then one more cookie every day — how many cookies do you have after three days? Four days?

If you see a pattern there, you're already thinking about something called a function! A function is just a rule. Put something in, get something out. Every time, the same way.

Some functions go up in a straight line when you draw them. Like our cookie game — one more every day, steady and even.

That's called a linear function. And when we draw it, it makes a perfectly straight line.

Pretty cool, right? You just did real math.

Unlock the full lesson to start drawing your own!
```
**Chars:** ~620 | **Voice:** Callum | **Stability:** 0.55

---

#### 3B · Grades 3–5 · Voice: Charlotte

```
Here's a question: if you earn $3 for every chore you do, how much do you have after 5 chores? After 10?

You already know how to figure that out — multiply and you're done. But here's the cool part: that rule you just used, that relationship between chores and money, is a function. And when you draw it on a graph, it makes a perfectly straight line.

That's what a linear function is. It shows a relationship that changes at a constant rate. Same amount added every time. 

The graph goes up in a straight line — and you can predict exactly where it'll be, no matter how far you go.

That's the power of linear thinking. Unlock the full lesson to graph your own.
```
**Chars:** ~670 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 3C · Grades 6–8 · Voice: Daniel

```
Most things in the real world change. Prices go up. Distances grow. Time passes. A linear function is a model for when things change at a constant rate.

The equation is y equals mx plus b. M is the slope — how fast things change. B is the y-intercept — where you start. Put those two things together and you can describe any straight-line relationship: distance over time, cost per item, temperature drop per hour.

The graph is a straight line because the rate never changes. That consistency is what makes linear functions so useful — and so predictable.

Once you understand slope and intercept, you can describe the world in equations. 

The full lesson covers slope calculation, graphing from equations, and real-world applications. Unlock it.
```
**Chars:** ~740 | **Voice:** Daniel | **Stability:** 0.60

---

#### 3D · Grades 9–12 · Voice: Rachel

```
Linear functions are the foundation of nearly every quantitative model you'll encounter — from economics to physics to machine learning.

A linear function f of x equals mx plus b defines a constant rate of change. The slope m captures the marginal relationship between variables: how much y changes per unit change in x. The intercept b is the baseline value when x is zero.

In multivariate contexts, this extends to linear combinations — the backbone of linear regression, where we model a dependent variable as a weighted sum of independent variables plus a residual term. The goal is to minimize that residual across all observations, which leads directly into least squares estimation.

Understanding linearity deeply also means understanding when it breaks down — and why non-linear models exist.

The full lesson connects linear functions to regression, systems of equations, and matrix representation. Unlock it.
```
**Chars:** ~810 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 4 — Elements of Art (Arts)

**Subject:** Arts | **Core concept:** The visual building blocks every artist uses

---

#### 4A · Grades 1–2 · Voice: Callum

```
When an artist makes a painting or a drawing, they're not just putting colors on paper. They're using special tools — not brushes or pencils — but ideas.

Every piece of art is made of building blocks. Things like lines. Shapes. Colors. Textures — things that look bumpy or smooth. And space — how things are arranged and how close they are.

Artists use these building blocks to make you feel things. A jagged line can feel scary. A soft round shape can feel cozy. Bright red can feel exciting. Cool blue can feel calm.

These building blocks have a name: the elements of art. And once you learn them, you'll see them everywhere.

Ready to find them? Unlock the full lesson!
```
**Chars:** ~650 | **Voice:** Callum | **Stability:** 0.50

---

#### 4B · Grades 3–5 · Voice: Charlotte

```
Every piece of art — a painting, a photo, a sculpture, even a logo — is built from the same basic ingredients. Artists call them the elements of art.

There are seven of them: line, shape, form, color, value, texture, and space. Each one does something different. Lines can lead your eye across a canvas. Color can create mood. Value — how light or dark something is — gives depth and drama. Texture makes a flat image feel touchable.

Here's the interesting part: professional artists don't just pick colors because they look nice. They make deliberate choices using these elements to guide how you feel when you look at their work.

Once you know the elements, looking at art becomes a whole different experience.

Unlock the full lesson to start seeing like an artist.
```
**Chars:** ~700 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 4C · Grades 6–8 · Voice: Daniel

```
The elements of art aren't just a list to memorize — they're the vocabulary of visual communication.

Line, shape, form, color, value, texture, and space. Every visual decision an artist makes falls into one of these categories. A high-contrast black and white composition uses value to create drama. Overlapping organic shapes create depth through implied form. Color temperature — warm versus cool — can make objects appear to advance or recede in space.

Understanding these elements gives you two things: the ability to analyze what you're looking at, and the tools to make intentional choices in your own work. The difference between art that looks accidental and art that feels powerful is usually a deliberate command of these seven elements.

The full lesson covers each element in depth with examples from classical and contemporary work. Unlock it.
```
**Chars:** ~760 | **Voice:** Daniel | **Stability:** 0.60

---

#### 4D · Grades 9–12 · Voice: Rachel

```
The elements of art are the foundational grammar of visual language — the set of formal properties through which meaning is constructed and communicated across every visual medium.

Line generates movement and tension. Shape operates on symbolic and perceptual levels simultaneously. Form implies three-dimensionality and mass. Color carries both physiological response and cultural coding. Value controls perceived light and atmospheric depth. Texture invites tactile association. Space — positive, negative, and implied — structures the viewer's attention and creates relational meaning between elements.

Critical analysis of visual art depends on precise facility with these terms. So does the practice of making work with intentional effect rather than accidental aesthetic.

The full lesson examines each element through art historical examples and applies them to formal critique methodology. Unlock it.
```
**Chars:** ~790 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 5 — Our Solar System (Astronomy)

**Subject:** Astronomy | **Core concept:** The structure and scale of our solar system

---

#### 5A · Grades 1–2 · Voice: Callum

```
Look up at the sky on a clear night. You'll see stars — so many stars! But one of those lights isn't a star. It's our neighbor. It's a planet, just like Earth.

We live in a solar system. That means we have a star — our Sun — right in the middle. And around the Sun, eight planets travel in giant circles called orbits.

Earth is one of those planets. And we have a moon! Some planets have lots of moons. Jupiter has over 90.

The Sun is so big, you could fit one million Earths inside it.

Space is almost impossibly huge. And it all starts right here, in our solar system.

Want to meet all eight planets? Unlock the full lesson!
```
**Chars:** ~660 | **Voice:** Callum | **Stability:** 0.50

---

#### 5B · Grades 3–5 · Voice: Charlotte

```
Eight planets. One star. Hundreds of moons. Millions of asteroids. And a whole lot of empty space.

That's our solar system — and it formed about 4.6 billion years ago from a giant cloud of gas and dust that collapsed under gravity.

The four inner planets — Mercury, Venus, Earth, and Mars — are rocky and relatively small. The four outer planets — Jupiter, Saturn, Uranus, and Neptune — are enormous gas and ice giants, with ring systems and dozens of moons each.

And then there's everything in between: the asteroid belt, the dwarf planets, comets looping in from the outer edges.

The distances are almost impossible to imagine. If the Sun were the size of a basketball, Earth would be a pea... 26 meters away.

Unlock the full lesson to explore each planet.
```
**Chars:** ~720 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 5C · Grades 6–8 · Voice: Daniel

```
The solar system is a gravitational system — everything in it moves because of the relationship between mass and distance.

The Sun contains 99.86 percent of the total mass in the solar system. That mass creates a gravitational field that keeps eight planets, hundreds of moons, millions of asteroids, and billions of comets in stable orbits. The shape of those orbits isn't circular — it's elliptical, as Johannes Kepler described in the early 1600s.

The inner terrestrial planets and outer gas giants formed differently. Proximity to the Sun during formation meant lighter elements were blown away from the inner disk, leaving only rocky material. Farther out, ice and gas could accumulate into the giant planets we see today.

This differentiation explains almost everything about planetary structure.

The full lesson covers orbital mechanics, planetary classification, and formation history. Unlock it.
```
**Chars:** ~790 | **Voice:** Daniel | **Stability:** 0.60

---

#### 5D · Grades 9–12 · Voice: Rachel

```
The solar system is a remnant of the early universe's chemistry — a snapshot of the processes that produced rocky worlds, gas giants, and the conditions for life.

Its formation follows from solar nebula theory: a molecular cloud collapsed under self-gravity approximately 4.6 billion years ago, conserving angular momentum into a rotating protoplanetary disk. The Sun accreted at the center. Planetesimals formed through accretion in the disk, eventually sweeping their orbital zones clear — the definition of a planet under the IAU's 2006 framework.

The frost line, roughly 2.7 AU from the Sun, divides the system into distinct compositional regimes. Interior to it, silicate and metal condensed into the terrestrial planets. Beyond it, volatile ices allowed the accretion of giant planet cores massive enough to capture hydrogen-helium envelopes.

The full lesson covers nebular theory, Kepler's laws, comparative planetology, and the search for exoplanetary analogs. Unlock it.
```
**Chars:** ~870 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 6 — Ecosystems and Food Webs (Biology)

**Subject:** Biology | **Core concept:** How energy flows through living systems

---

#### 6A · Grades 1–2 · Voice: Callum

```
Everything alive needs energy to grow and move and stay warm. But where does that energy come from?

Plants get their energy from the Sun. Then a caterpillar eats the plant. Then a bird eats the caterpillar. Then a hawk eats the bird.

Every time something gets eaten, that energy passes along. It's like a chain — we call it a food chain! And when lots of food chains connect together, it becomes a food web — like a big, tangled net of who eats who.

Every animal has a place in the web. If one part of the web disappears, the whole thing can change.

That's why taking care of nature is so important. Every creature matters.

Want to see more food webs? Unlock the full lesson!
```
**Chars:** ~650 | **Voice:** Callum | **Stability:** 0.50

---

#### 6B · Grades 3–5 · Voice: Charlotte

```
In every habitat on Earth — forests, oceans, deserts, even your backyard — there's a constant flow of energy happening. It passes from one living thing to the next, in a pattern called a food web.

It starts with producers: plants and algae that capture energy from sunlight through photosynthesis. Herbivores eat the producers. Carnivores eat the herbivores. Decomposers — fungi and bacteria — break down anything that dies and return nutrients to the soil.

Every living thing plays a role. Remove one species and the effects ripple outward. When wolves were reintroduced to Yellowstone, they changed the behavior of deer, which allowed riverbank plants to regrow, which stabilized the riverbanks themselves.

Ecosystems are more connected than they look.

Unlock the full lesson to map out a full food web.
```
**Chars:** ~720 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 6C · Grades 6–8 · Voice: Daniel

```
An ecosystem isn't just a list of species — it's an energy accounting system.

Energy enters through primary producers, organisms that fix solar or chemical energy into biomass. That energy transfers up trophic levels: producers to primary consumers to secondary consumers to apex predators. But each transfer is inefficient — on average, only about 10 percent of energy passes from one level to the next. The rest is lost as heat.

This explains why food chains rarely have more than four or five levels, and why there are always far more plants than herbivores, and far more herbivores than predators.

Food webs capture the full complexity — multiple feeding relationships, omnivores, and decomposers that recycle matter back into the system.

The full lesson covers trophic levels, energy pyramids, and keystone species. Unlock it.
```
**Chars:** ~760 | **Voice:** Daniel | **Stability:** 0.60

---

#### 6D · Grades 9–12 · Voice: Rachel

```
Ecosystem ecology is fundamentally the study of energy transformation and matter cycling — two processes that operate simultaneously but follow different rules.

Energy flows directionally through trophic levels, entering via gross primary production and dissipating as metabolic heat at each transfer. The ecological efficiency ratio — typically 5 to 20 percent — determines the biomass available at each level and constrains community structure. The Lindeman efficiency model formalizes this into predictive relationships between trophic position and biomass density.

Matter, by contrast, cycles. Carbon, nitrogen, phosphorus, and water are repeatedly transformed and reused through biogeochemical cycles that cross ecosystem boundaries. Disruption to these cycles — eutrophication, carbon loading, nitrogen deposition — produces nonlinear system responses.

The full lesson covers productivity metrics, trophic cascade dynamics, and anthropogenic disruption modeling. Unlock it.
```
**Chars:** ~820 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 7 — Saving and Goals (Financial Literacy)

**Subject:** Financial Literacy | **Core concept:** Why saving works and how to set a goal

---

#### 7A · Grades 1–2 · Voice: Callum

```
Imagine there's a toy you really, really want. It costs $10. But you only have $2 right now.

What do you do? 

You save! Every week, if you put a little money aside — maybe $1, maybe $2 — eventually you'll have enough. That's saving. Keeping money so you can use it later for something important.

Saving is like feeding a piggy bank. You don't spend everything right away. You wait. And the more you put in, the closer you get to your goal.

A goal is something you're saving up for. It could be a toy, a trip, a gift for someone you love.

Goals make saving feel exciting instead of hard!

Want to set your very first saving goal? Unlock the full lesson!
```
**Chars:** ~650 | **Voice:** Callum | **Stability:** 0.50

---

#### 7B · Grades 3–5 · Voice: Charlotte

```
Money is a tool. And like any tool, it's most powerful when you use it on purpose.

Saving means choosing not to spend money now so you can use it later — for something bigger, or something more important. It sounds simple, but most people find it surprisingly hard. Why? Because spending feels good right now, and the future feels far away.

That's why goals help so much. When you have a specific target — say, saving $50 for a new game — you can break it down. Ten weeks of saving $5. Suddenly it feels possible.

Smart savers also separate their money: some for spending now, some for saving, some for giving. That system is called a budget.

Want to build your first budget? Unlock the full lesson.
```
**Chars:** ~690 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 7C · Grades 6–8 · Voice: Daniel

```
Every major financial decision you'll ever make comes back to one skill: the ability to delay gratification in service of a goal.

Saving isn't just about accumulating money. It's about building optionality — having resources available when opportunities or emergencies arise. People with savings make decisions from a position of choice. People without savings make decisions from a position of constraint.

The math reinforces this. Money saved earns interest. Interest earns more interest. Over time, compounding amplifies small consistent contributions into significant sums. A hundred dollars saved monthly at 7 percent annual return becomes over $120,000 in 30 years.

The earlier you start, the more time does the work for you.

The full lesson covers compound interest, goal frameworks, and the psychology of spending. Unlock it.
```
**Chars:** ~750 | **Voice:** Daniel | **Stability:** 0.60

---

#### 7D · Grades 9–12 · Voice: Rachel

```
Personal finance is one of the most consequential subjects never formally taught — and the gap between those who understand compound growth and those who don't compounds over a lifetime.

Saving is the precondition for investment. The savings rate — the percentage of income not consumed — determines how quickly capital accumulates. That capital, invested in assets with positive expected returns, generates income independent of labor. This is the mechanism by which wealth builds generationally.

The behavioral economics of saving is equally important. Humans are wired for hyperbolic discounting — we overweight immediate rewards relative to future ones. Structures like automatic contributions and commitment devices counteract this bias systematically rather than relying on willpower.

The full lesson covers savings rate optimization, investment vehicles, tax-advantaged accounts, and the mathematics of early retirement. Unlock it.
```
**Chars:** ~810 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 8 — Stars and Constellations (Astronomy)

**Subject:** Astronomy | **Core concept:** What stars are and how humans have mapped them

---

#### 8A · Grades 1–2 · Voice: Callum

```
On a clear night, when you look up at the sky, you see thousands and thousands of tiny lights. Those are stars!

Stars are giant balls of fire — much, much bigger than our whole Earth. They look tiny because they're so, so far away. The closest star to us is our Sun!

Long ago, people looked at the night sky and noticed that some stars seemed to make shapes — like a hunter, or a bear, or a belt. They drew lines between the stars and told stories about them. We call those shapes constellations.

Different families around the world saw different shapes — but they all looked up at the same stars.

On a clear night, you can find them too!

Unlock the full lesson to start star hunting.
```
**Chars:** ~660 | **Voice:** Callum | **Stability:** 0.50

---

#### 8B · Grades 3–5 · Voice: Charlotte

```
Every star in the night sky is a sun — a massive ball of plasma held together by its own gravity, fusing hydrogen into helium and releasing enormous amounts of energy as light and heat.

Our Sun is a medium-sized star. Some stars are hundreds of times larger. Some are so old they've exhausted their fuel and collapsed into dense remnants.

For thousands of years, humans organized the night sky by grouping stars into constellations — not because the stars are physically close to each other, but because from Earth, they appear to form patterns. Orion, the Big Dipper, the Southern Cross — these are cultural maps of the sky, used for navigation and storytelling across civilizations.

Today we still use the 88 official constellations to locate objects in space.

Unlock the full lesson to map them yourself.
```
**Chars:** ~730 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 8C · Grades 6–8 · Voice: Daniel

```
Stars aren't all the same. They vary dramatically in size, temperature, luminosity, and age — and astronomers have developed precise ways to classify them.

The Hertzsprung-Russell diagram plots stars by surface temperature against luminosity. Most stars, including our Sun, fall along a diagonal band called the main sequence. Where a star sits on that diagram tells you where it is in its life cycle — and how it will die.

Low-mass stars like our Sun spend billions of years on the main sequence, then expand into red giants before shedding their outer layers and leaving a white dwarf. High-mass stars burn faster, die younger, and end in supernova explosions — the events responsible for producing most of the heavy elements in the universe, including the iron in your blood.

The full lesson covers stellar classification, the H-R diagram, and stellar evolution. Unlock it.
```
**Chars:** ~790 | **Voice:** Daniel | **Stability:** 0.60

---

#### 8D · Grades 9–12 · Voice: Rachel

```
Stellar astrophysics is ultimately the story of nuclear physics playing out at astronomical scales — and the consequences of that process pervade the entire observable universe.

A star is a gravitational equilibrium: the inward pressure of its own mass balanced by the outward radiation pressure of nuclear fusion. On the main sequence, hydrogen fuses to helium in the core via the proton-proton chain or the CNO cycle, depending on stellar mass. This equilibrium persists until hydrogen depletion forces structural reorganization.

Post-main-sequence evolution diverges sharply by mass. Sub-solar stars become white dwarfs. Stars between roughly 8 and 20 solar masses end in core-collapse supernovae producing neutron stars. Above approximately 20 solar masses, the remnant collapses to a stellar-mass black hole.

Each endpoint has observational signatures — pulse timing, gravitational wave emission, X-ray binaries — that modern observatories are actively characterizing.

The full lesson covers the H-R diagram quantitatively, nucleosynthesis pathways, and stellar remnant properties. Unlock it.
```
**Chars:** ~940 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 9 — Coding: What Is an Algorithm? (Coding)

**Subject:** Coding | **Core concept:** What algorithms are and how they work

---

#### 9A · Grades 1–2 · Voice: Callum

```
Have you ever followed a recipe? You know — first you get the bowl, then you add the flour, then you stir it, then you put it in the oven?

That's an algorithm! An algorithm is just a list of steps — in the right order — that tells you how to do something.

Computers use algorithms for everything. When you press a button in a game, a list of steps runs super fast to decide what happens next. When you search for a video, an algorithm finds the best match for you.

The cool thing is, you already know how to make algorithms! Every time you explain how to do something step by step — you're thinking like a programmer.

Want to make your first algorithm? Unlock the full lesson!
```
**Chars:** ~670 | **Voice:** Callum | **Stability:** 0.55

---

#### 9B · Grades 3–5 · Voice: Charlotte

```
Every app, every game, every website runs on one thing: algorithms.

An algorithm is a precise set of instructions for solving a problem. It takes an input, follows a defined sequence of steps, and produces an output. The key word is precise — computers do exactly what they're told, nothing more. So the instructions have to be completely unambiguous.

Algorithms show up everywhere outside of computers too. A recipe is an algorithm. So is the method you use to sort cards, or the steps you take to solve a math problem.

What makes a good algorithm? It should be clear, it should work for all valid inputs, and it should eventually finish.

In this lesson, you'll write your first algorithm — for a computer to follow.

Unlock the full lesson to start.
```
**Chars:** ~700 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 9C · Grades 6–8 · Voice: Daniel

```
An algorithm is the fundamental unit of computation — a finite, unambiguous sequence of steps that transforms an input into a desired output.

What makes algorithm design interesting is that there are usually many ways to solve the same problem, and they're not all equal. Two algorithms that both sort a list of numbers correctly might differ wildly in how long they take, or how much memory they use. Algorithm analysis lets us compare them precisely.

Big O notation describes how an algorithm's resource requirements scale with input size. An O of n algorithm scales linearly. An O of n squared algorithm gets dramatically slower with larger inputs. Choosing the wrong algorithm for a large dataset isn't just inefficient — it can make a program functionally unusable.

The full lesson covers algorithm design patterns, Big O analysis, and implementation in code. Unlock it.
```
**Chars:** ~760 | **Voice:** Daniel | **Stability:** 0.60

---

#### 9D · Grades 9–12 · Voice: Rachel

```
Algorithm design is the discipline of constructing computational procedures that are correct, efficient, and provably so.

Correctness is established through invariant analysis — identifying conditions that hold true at each step of an algorithm and showing they guarantee the desired output. Efficiency is characterized using asymptotic complexity: Big O for worst-case, Big Omega for best-case, Big Theta for tight bounds.

The major algorithmic paradigms — divide and conquer, dynamic programming, greedy algorithms, backtracking — each represent a different structural approach to problem decomposition. Dynamic programming, for instance, solves optimization problems by breaking them into overlapping subproblems and memoizing results, yielding polynomial-time solutions to problems that naive recursion would solve exponentially.

NP-completeness theory establishes the outer limits: a class of problems for which no known polynomial-time algorithm exists, and for which a polynomial solution for one would imply solutions for all.

The full lesson covers complexity classes, major paradigms, and proof techniques. Unlock it.
```
**Chars:** ~930 | **Voice:** Rachel | **Stability:** 0.65

---

### LESSON 10 — Body Systems Overview (Biology)

**Subject:** Biology | **Core concept:** The major systems of the human body and how they work together

---

#### 10A · Grades 1–2 · Voice: Callum

```
Your body is amazing. Right now, while you're listening, your heart is beating. Your lungs are breathing. Your stomach might be digesting your last meal. And your brain is hearing every single word.

Your body is made of lots of different systems — each one doing its own special job. Your heart pumps blood everywhere. Your lungs bring in the air you need. Your bones hold you up and protect you. Your brain sends messages to everything else.

And here's the coolest part: all these systems work together, all at the same time, without you even thinking about it.

Your body is doing hundreds of jobs right now — and it never takes a break.

Want to meet all your body's systems? Unlock the full lesson!
```
**Chars:** ~660 | **Voice:** Callum | **Stability:** 0.50

---

#### 10B · Grades 3–5 · Voice: Charlotte

```
Your body isn't one thing — it's about a dozen systems all working at the same time, each one doing a specific job.

The circulatory system pumps blood containing oxygen and nutrients to every cell. The respiratory system brings in oxygen and releases carbon dioxide. The digestive system breaks food into usable fuel. The skeletal and muscular systems work together to let you move. The nervous system coordinates everything — receiving information from the world and sending instructions to the rest of the body in milliseconds.

These systems don't just run in parallel. They're deeply interdependent. Your muscles need oxygen from the circulatory system. Your heart is itself a muscle that needs oxygen. Everything connects to everything else.

That's what makes the human body so remarkable.

Unlock the full lesson to explore each system.
```
**Chars:** ~720 | **Voice:** Charlotte | **Stability:** 0.50

---

#### 10C · Grades 6–8 · Voice: Daniel

```
The human body maintains a stable internal environment in a constantly changing external one. That stability is called homeostasis — and every major body system contributes to it.

The cardiovascular system circulates 5 to 6 liters of blood continuously, delivering oxygen, nutrients, and hormones while removing metabolic waste. The respiratory system manages gas exchange at the alveoli. The endocrine system releases chemical signals — hormones — that regulate metabolism, growth, stress response, and reproduction. The nervous system provides rapid electrochemical signaling overlaid on the slower hormonal communication.

Each system has its own organs, tissues, and feedback mechanisms. But they're not independent — they're a tightly coupled network. Failure in one system typically cascades into others.

The full lesson covers organ function, feedback loops, and common system disorders. Unlock it.
```
**Chars:** ~760 | **Voice:** Daniel | **Stability:** 0.60

---

#### 10D · Grades 9–12 · Voice: Rachel

```
Human physiology is an exercise in integrated systems biology — the study of how discrete subsystems with distinct mechanisms produce coordinated, emergent function.

Each of the eleven recognized organ systems operates through its own physiological logic: the cardiovascular system through pressure gradients and cardiac output, the endocrine system through receptor-ligand binding and negative feedback regulation, the immune system through clonal selection and antigen presentation. What makes physiology complex is that these systems are not merely parallel — they are mutually regulatory.

Consider the renin-angiotensin-aldosterone system: a cascade spanning the kidneys, lungs, adrenal glands, and vasculature to regulate blood pressure and fluid balance. Disruption at any node — renal artery stenosis, adrenal hyperplasia, ACE inhibition — propagates through the entire loop.

Understanding the body means understanding these feedback architectures.

The full lesson covers each organ system, homeostatic mechanisms, and pathophysiology. Unlock it.
```
**Chars:** ~880 | **Voice:** Rachel | **Stability:** 0.65

---

## Step 4 — Seed Scripts Into DB

Run this SQL to insert all 40 records into the `lesson_narrations` table. Status is `pending` — the Edge Function in Step 5 will process them.

```sql
INSERT INTO lesson_narrations (lesson_key, subject, lesson_title, age_group, script, voice_id, voice_name, char_count) VALUES

-- LESSON 1: Photosynthesis
('photosynthesis_grades1-2', 'Science', 'Photosynthesis', 'grades1-2',
'Hey there, little explorer! Have you ever wondered... why leaves are green? Here''s an amazing secret. Plants are actually chefs. Every single day, while you''re sleeping, while you''re playing, plants are quietly cooking their own food — using nothing but sunshine, water, and air. They catch sunlight with tiny green helpers inside their leaves. Then they mix it with water from the soil and a little bit of air. And out comes sugar — the plant''s very own meal. It sounds like magic. But it''s science! And it has a name: photosynthesis. Ready to see exactly how it works? Unlock the full lesson to dive in.',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 590),

('photosynthesis_grades3-5', 'Science', 'Photosynthesis', 'grades3-5',
'Plants might look quiet and still — but inside every leaf, something incredible is happening right now. Plants don''t eat food the way you do. They make it. Using sunlight as their energy source, they pull in water through their roots and carbon dioxide from the air. Then, inside tiny structures called chloroplasts, they run a chemical reaction that produces glucose — pure sugar — as food. The byproduct? Oxygen. The very air you''re breathing right now came from plants running this process, over and over, for millions of years. That process is called photosynthesis. It''s one of the most important reactions on Earth. Want to go deeper? Unlock the full lesson and see it step by step.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 670),

('photosynthesis_grades6-8', 'Science', 'Photosynthesis', 'grades6-8',
'Every living thing on Earth depends on a single chemical reaction — and most people never think about it. Photosynthesis is how plants convert light energy into chemical energy stored as glucose. The equation is straightforward: six molecules of carbon dioxide plus six of water, energized by light, yield one glucose molecule and six molecules of oxygen. But the mechanism is anything but simple. It happens in two stages — the light-dependent reactions in the thylakoid membranes, and the Calvin cycle in the stroma. Each stage has its own set of proteins, electron carriers, and feedback loops. Understanding this reaction means understanding the base of every food chain on the planet. Unlock the full lesson to break down both stages in detail.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 720),

('photosynthesis_grades9-12', 'Science', 'Photosynthesis', 'grades9-12',
'Photosynthesis is the thermodynamic engine that made complex life possible on Earth — and it runs on quantum mechanics. When photons strike chlorophyll molecules, electrons are excited to a higher energy state. That energy is captured and shuttled through the electron transport chain, driving the synthesis of ATP and NADPH. The light-independent reactions then use that chemical energy to fix atmospheric carbon dioxide into three-carbon sugars via the Calvin cycle. What makes this remarkable is the efficiency: photosynthetic organisms have been optimizing this system for 3.5 billion years. Some processes within the reaction center appear to use quantum coherence to achieve near-perfect energy transfer. The full lesson covers both reaction stages, limiting factors, and C3 versus C4 pathways. Unlock it to go all the way in.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 770),

-- LESSON 2: American Revolution
('american-revolution_grades1-2', 'Social Studies US', 'The American Revolution', 'grades1-2',
'A long, long time ago — about 250 years ago — the land we call America was not its own country yet. It was ruled by a king who lived far, far away across the ocean. The people living here had to follow his rules... but they had no say in making them. And that didn''t feel fair. So the people here made a very brave decision. They said: we want to make our own rules. We want to be free. And they wrote it down in a famous letter called the Declaration of Independence. That''s how America began — with people saying, very loudly: we have rights. And we will stand up for them. Want to hear the whole story? Unlock the full lesson.',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 640),

('american-revolution_grades3-5', 'Social Studies US', 'The American Revolution', 'grades3-5',
'Imagine if someone far away made all the rules for your life — and you couldn''t vote, couldn''t complain, couldn''t even say anything about it. That''s what life felt like for American colonists in the 1770s. They were British citizens, but they had no representatives in the British Parliament. When Britain started taxing them heavily — on tea, on paper, on almost everything — and still refused to listen, the colonists reached a breaking point. Leaders like Thomas Jefferson, Benjamin Franklin, and George Washington decided it was time to act. On July 4th, 1776, they signed a document declaring they were no longer part of Britain. They called it the Declaration of Independence. It changed the world. Unlock the full lesson to find out how.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 680),

('american-revolution_grades6-8', 'Social Studies US', 'The American Revolution', 'grades6-8',
'The American Revolution wasn''t inevitable — it was the result of a decade of escalating decisions, most of which could have gone differently. After the Seven Years'' War, Britain was deep in debt and decided to tax its American colonies directly. The colonists objected — not just to the taxes themselves, but to the principle: taxation without representation in Parliament. Protests escalated into boycotts, then into violence. The Boston Massacre. The Boston Tea Party. British crackdowns. Continental Congresses. By 1776, enough colonial leaders believed reconciliation was impossible. Thomas Jefferson drafted the Declaration of Independence, making the philosophical case — rooted in Enlightenment thought — that governments derive their power from the consent of the governed. It was a radical idea. It still is. Unlock the full lesson.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 760),

('american-revolution_grades9-12', 'Social Studies US', 'The American Revolution', 'grades9-12',
'The American Revolution is often taught as an inevitable march toward liberty. Historians tell a more complicated story. The colonial elite who led the revolution were not acting purely on principle — they were also protecting economic interests threatened by British mercantile policy. The ideals articulated in the Declaration of Independence coexisted with the institution of slavery, a contradiction the founders acknowledged and deferred. The revolution transferred power from a British ruling class to an American one, leaving large populations — enslaved people, women, Indigenous nations — largely outside the new political order. None of this diminishes the intellectual achievement of the founding documents, or the genuine radicalism of challenging hereditary monarchy. It does complicate the narrative. The full lesson examines both the ideals and the contradictions in depth. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 790),

-- LESSON 3: Linear Functions
('linear-functions_grades1-2', 'Math', 'Linear Functions and Graphs', 'grades1-2',
'Let''s play a game. If I give you one cookie, and then one more cookie every day — how many cookies do you have after three days? Four days? If you see a pattern there, you''re already thinking about something called a function! A function is just a rule. Put something in, get something out. Every time, the same way. Some functions go up in a straight line when you draw them. Like our cookie game — one more every day, steady and even. That''s called a linear function. And when we draw it, it makes a perfectly straight line. Pretty cool, right? You just did real math. Unlock the full lesson to start drawing your own!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 620),

('linear-functions_grades3-5', 'Math', 'Linear Functions and Graphs', 'grades3-5',
'Here''s a question: if you earn $3 for every chore you do, how much do you have after 5 chores? After 10? You already know how to figure that out — multiply and you''re done. But here''s the cool part: that rule you just used, that relationship between chores and money, is a function. And when you draw it on a graph, it makes a perfectly straight line. That''s what a linear function is. It shows a relationship that changes at a constant rate. Same amount added every time. The graph goes up in a straight line — and you can predict exactly where it''ll be, no matter how far you go. That''s the power of linear thinking. Unlock the full lesson to graph your own.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 670),

('linear-functions_grades6-8', 'Math', 'Linear Functions and Graphs', 'grades6-8',
'Most things in the real world change. Prices go up. Distances grow. Time passes. A linear function is a model for when things change at a constant rate. The equation is y equals mx plus b. M is the slope — how fast things change. B is the y-intercept — where you start. Put those two things together and you can describe any straight-line relationship: distance over time, cost per item, temperature drop per hour. The graph is a straight line because the rate never changes. That consistency is what makes linear functions so useful — and so predictable. Once you understand slope and intercept, you can describe the world in equations. The full lesson covers slope calculation, graphing from equations, and real-world applications. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 740),

('linear-functions_grades9-12', 'Math', 'Linear Functions and Graphs', 'grades9-12',
'Linear functions are the foundation of nearly every quantitative model you''ll encounter — from economics to physics to machine learning. A linear function f of x equals mx plus b defines a constant rate of change. The slope m captures the marginal relationship between variables: how much y changes per unit change in x. The intercept b is the baseline value when x is zero. In multivariate contexts, this extends to linear combinations — the backbone of linear regression, where we model a dependent variable as a weighted sum of independent variables plus a residual term. The goal is to minimize that residual across all observations, which leads directly into least squares estimation. Understanding linearity deeply also means understanding when it breaks down — and why non-linear models exist. The full lesson connects linear functions to regression, systems of equations, and matrix representation. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 810),

-- LESSON 4: Elements of Art
('elements-of-art_grades1-2', 'Arts', 'Elements of Art', 'grades1-2',
'When an artist makes a painting or a drawing, they''re not just putting colors on paper. They''re using special tools — not brushes or pencils — but ideas. Every piece of art is made of building blocks. Things like lines. Shapes. Colors. Textures — things that look bumpy or smooth. And space — how things are arranged and how close they are. Artists use these building blocks to make you feel things. A jagged line can feel scary. A soft round shape can feel cozy. Bright red can feel exciting. Cool blue can feel calm. These building blocks have a name: the elements of art. And once you learn them, you''ll see them everywhere. Ready to find them? Unlock the full lesson!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 650),

('elements-of-art_grades3-5', 'Arts', 'Elements of Art', 'grades3-5',
'Every piece of art — a painting, a photo, a sculpture, even a logo — is built from the same basic ingredients. Artists call them the elements of art. There are seven of them: line, shape, form, color, value, texture, and space. Each one does something different. Lines can lead your eye across a canvas. Color can create mood. Value — how light or dark something is — gives depth and drama. Texture makes a flat image feel touchable. Here''s the interesting part: professional artists don''t just pick colors because they look nice. They make deliberate choices using these elements to guide how you feel when you look at their work. Once you know the elements, looking at art becomes a whole different experience. Unlock the full lesson to start seeing like an artist.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 700),

('elements-of-art_grades6-8', 'Arts', 'Elements of Art', 'grades6-8',
'The elements of art aren''t just a list to memorize — they''re the vocabulary of visual communication. Line, shape, form, color, value, texture, and space. Every visual decision an artist makes falls into one of these categories. A high-contrast black and white composition uses value to create drama. Overlapping organic shapes create depth through implied form. Color temperature — warm versus cool — can make objects appear to advance or recede in space. Understanding these elements gives you two things: the ability to analyze what you''re looking at, and the tools to make intentional choices in your own work. The difference between art that looks accidental and art that feels powerful is usually a deliberate command of these seven elements. The full lesson covers each element in depth with examples from classical and contemporary work. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 760),

('elements-of-art_grades9-12', 'Arts', 'Elements of Art', 'grades9-12',
'The elements of art are the foundational grammar of visual language — the set of formal properties through which meaning is constructed and communicated across every visual medium. Line generates movement and tension. Shape operates on symbolic and perceptual levels simultaneously. Form implies three-dimensionality and mass. Color carries both physiological response and cultural coding. Value controls perceived light and atmospheric depth. Texture invites tactile association. Space — positive, negative, and implied — structures the viewer''s attention and creates relational meaning between elements. Critical analysis of visual art depends on precise facility with these terms. So does the practice of making work with intentional effect rather than accidental aesthetic. The full lesson examines each element through art historical examples and applies them to formal critique methodology. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 790),

-- LESSON 5: Our Solar System
('solar-system_grades1-2', 'Astronomy', 'Our Solar System', 'grades1-2',
'Look up at the sky on a clear night. You''ll see stars — so many stars! But one of those lights isn''t a star. It''s our neighbor. It''s a planet, just like Earth. We live in a solar system. That means we have a star — our Sun — right in the middle. And around the Sun, eight planets travel in giant circles called orbits. Earth is one of those planets. And we have a moon! Some planets have lots of moons. Jupiter has over 90. The Sun is so big, you could fit one million Earths inside it. Space is almost impossibly huge. And it all starts right here, in our solar system. Want to meet all eight planets? Unlock the full lesson!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 660),

('solar-system_grades3-5', 'Astronomy', 'Our Solar System', 'grades3-5',
'Eight planets. One star. Hundreds of moons. Millions of asteroids. And a whole lot of empty space. That''s our solar system — and it formed about 4.6 billion years ago from a giant cloud of gas and dust that collapsed under gravity. The four inner planets — Mercury, Venus, Earth, and Mars — are rocky and relatively small. The four outer planets — Jupiter, Saturn, Uranus, and Neptune — are enormous gas and ice giants, with ring systems and dozens of moons each. And then there''s everything in between: the asteroid belt, the dwarf planets, comets looping in from the outer edges. The distances are almost impossible to imagine. If the Sun were the size of a basketball, Earth would be a pea... 26 meters away. Unlock the full lesson to explore each planet.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 720),

('solar-system_grades6-8', 'Astronomy', 'Our Solar System', 'grades6-8',
'The solar system is a gravitational system — everything in it moves because of the relationship between mass and distance. The Sun contains 99.86 percent of the total mass in the solar system. That mass creates a gravitational field that keeps eight planets, hundreds of moons, millions of asteroids, and billions of comets in stable orbits. The shape of those orbits isn''t circular — it''s elliptical, as Johannes Kepler described in the early 1600s. The inner terrestrial planets and outer gas giants formed differently. Proximity to the Sun during formation meant lighter elements were blown away from the inner disk, leaving only rocky material. Farther out, ice and gas could accumulate into the giant planets we see today. This differentiation explains almost everything about planetary structure. The full lesson covers orbital mechanics, planetary classification, and formation history. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 790),

('solar-system_grades9-12', 'Astronomy', 'Our Solar System', 'grades9-12',
'The solar system is a remnant of the early universe''s chemistry — a snapshot of the processes that produced rocky worlds, gas giants, and the conditions for life. Its formation follows from solar nebula theory: a molecular cloud collapsed under self-gravity approximately 4.6 billion years ago, conserving angular momentum into a rotating protoplanetary disk. The Sun accreted at the center. Planetesimals formed through accretion in the disk, eventually sweeping their orbital zones clear — the definition of a planet under the IAU''s 2006 framework. The frost line, roughly 2.7 AU from the Sun, divides the system into distinct compositional regimes. Interior to it, silicate and metal condensed into the terrestrial planets. Beyond it, volatile ices allowed the accretion of giant planet cores massive enough to capture hydrogen-helium envelopes. The full lesson covers nebular theory, Kepler''s laws, comparative planetology, and the search for exoplanetary analogs. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 870),

-- LESSON 6: Ecosystems and Food Webs
('ecosystems_grades1-2', 'Biology', 'Ecosystems and Food Webs', 'grades1-2',
'Everything alive needs energy to grow and move and stay warm. But where does that energy come from? Plants get their energy from the Sun. Then a caterpillar eats the plant. Then a bird eats the caterpillar. Then a hawk eats the bird. Every time something gets eaten, that energy passes along. It''s like a chain — we call it a food chain! And when lots of food chains connect together, it becomes a food web — like a big, tangled net of who eats who. Every animal has a place in the web. If one part of the web disappears, the whole thing can change. That''s why taking care of nature is so important. Every creature matters. Want to see more food webs? Unlock the full lesson!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 650),

('ecosystems_grades3-5', 'Biology', 'Ecosystems and Food Webs', 'grades3-5',
'In every habitat on Earth — forests, oceans, deserts, even your backyard — there''s a constant flow of energy happening. It passes from one living thing to the next, in a pattern called a food web. It starts with producers: plants and algae that capture energy from sunlight through photosynthesis. Herbivores eat the producers. Carnivores eat the herbivores. Decomposers — fungi and bacteria — break down anything that dies and return nutrients to the soil. Every living thing plays a role. Remove one species and the effects ripple outward. When wolves were reintroduced to Yellowstone, they changed the behavior of deer, which allowed riverbank plants to regrow, which stabilized the riverbanks themselves. Ecosystems are more connected than they look. Unlock the full lesson to map out a full food web.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 720),

('ecosystems_grades6-8', 'Biology', 'Ecosystems and Food Webs', 'grades6-8',
'An ecosystem isn''t just a list of species — it''s an energy accounting system. Energy enters through primary producers, organisms that fix solar or chemical energy into biomass. That energy transfers up trophic levels: producers to primary consumers to secondary consumers to apex predators. But each transfer is inefficient — on average, only about 10 percent of energy passes from one level to the next. The rest is lost as heat. This explains why food chains rarely have more than four or five levels, and why there are always far more plants than herbivores, and far more herbivores than predators. Food webs capture the full complexity — multiple feeding relationships, omnivores, and decomposers that recycle matter back into the system. The full lesson covers trophic levels, energy pyramids, and keystone species. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 760),

('ecosystems_grades9-12', 'Biology', 'Ecosystems and Food Webs', 'grades9-12',
'Ecosystem ecology is fundamentally the study of energy transformation and matter cycling — two processes that operate simultaneously but follow different rules. Energy flows directionally through trophic levels, entering via gross primary production and dissipating as metabolic heat at each transfer. The ecological efficiency ratio — typically 5 to 20 percent — determines the biomass available at each level and constrains community structure. The Lindeman efficiency model formalizes this into predictive relationships between trophic position and biomass density. Matter, by contrast, cycles. Carbon, nitrogen, phosphorus, and water are repeatedly transformed and reused through biogeochemical cycles that cross ecosystem boundaries. Disruption to these cycles — eutrophication, carbon loading, nitrogen deposition — produces nonlinear system responses. The full lesson covers productivity metrics, trophic cascade dynamics, and anthropogenic disruption modeling. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 820),

-- LESSON 7: Saving and Goals
('saving-goals_grades1-2', 'Financial Literacy', 'Saving and Goals', 'grades1-2',
'Imagine there''s a toy you really, really want. It costs $10. But you only have $2 right now. What do you do? You save! Every week, if you put a little money aside — maybe $1, maybe $2 — eventually you''ll have enough. That''s saving. Keeping money so you can use it later for something important. Saving is like feeding a piggy bank. You don''t spend everything right away. You wait. And the more you put in, the closer you get to your goal. A goal is something you''re saving up for. It could be a toy, a trip, a gift for someone you love. Goals make saving feel exciting instead of hard! Want to set your very first saving goal? Unlock the full lesson!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 650),

('saving-goals_grades3-5', 'Financial Literacy', 'Saving and Goals', 'grades3-5',
'Money is a tool. And like any tool, it''s most powerful when you use it on purpose. Saving means choosing not to spend money now so you can use it later — for something bigger, or something more important. It sounds simple, but most people find it surprisingly hard. Why? Because spending feels good right now, and the future feels far away. That''s why goals help so much. When you have a specific target — say, saving $50 for a new game — you can break it down. Ten weeks of saving $5. Suddenly it feels possible. Smart savers also separate their money: some for spending now, some for saving, some for giving. That system is called a budget. Want to build your first budget? Unlock the full lesson.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 690),

('saving-goals_grades6-8', 'Financial Literacy', 'Saving and Goals', 'grades6-8',
'Every major financial decision you''ll ever make comes back to one skill: the ability to delay gratification in service of a goal. Saving isn''t just about accumulating money. It''s about building optionality — having resources available when opportunities or emergencies arise. People with savings make decisions from a position of choice. People without savings make decisions from a position of constraint. The math reinforces this. Money saved earns interest. Interest earns more interest. Over time, compounding amplifies small consistent contributions into significant sums. A hundred dollars saved monthly at 7 percent annual return becomes over $120,000 in 30 years. The earlier you start, the more time does the work for you. The full lesson covers compound interest, goal frameworks, and the psychology of spending. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 750),

('saving-goals_grades9-12', 'Financial Literacy', 'Saving and Goals', 'grades9-12',
'Personal finance is one of the most consequential subjects never formally taught — and the gap between those who understand compound growth and those who don''t compounds over a lifetime. Saving is the precondition for investment. The savings rate — the percentage of income not consumed — determines how quickly capital accumulates. That capital, invested in assets with positive expected returns, generates income independent of labor. This is the mechanism by which wealth builds generationally. The behavioral economics of saving is equally important. Humans are wired for hyperbolic discounting — we overweight immediate rewards relative to future ones. Structures like automatic contributions and commitment devices counteract this bias systematically rather than relying on willpower. The full lesson covers savings rate optimization, investment vehicles, tax-advantaged accounts, and the mathematics of early retirement. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 810),

-- LESSON 8: Stars and Constellations
('stars-constellations_grades1-2', 'Astronomy', 'Stars and Constellations', 'grades1-2',
'On a clear night, when you look up at the sky, you see thousands and thousands of tiny lights. Those are stars! Stars are giant balls of fire — much, much bigger than our whole Earth. They look tiny because they''re so, so far away. The closest star to us is our Sun! Long ago, people looked at the night sky and noticed that some stars seemed to make shapes — like a hunter, or a bear, or a belt. They drew lines between the stars and told stories about them. We call those shapes constellations. Different families around the world saw different shapes — but they all looked up at the same stars. On a clear night, you can find them too! Unlock the full lesson to start star hunting.',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 660),

('stars-constellations_grades3-5', 'Astronomy', 'Stars and Constellations', 'grades3-5',
'Every star in the night sky is a sun — a massive ball of plasma held together by its own gravity, fusing hydrogen into helium and releasing enormous amounts of energy as light and heat. Our Sun is a medium-sized star. Some stars are hundreds of times larger. Some are so old they''ve exhausted their fuel and collapsed into dense remnants. For thousands of years, humans organized the night sky by grouping stars into constellations — not because the stars are physically close to each other, but because from Earth, they appear to form patterns. Orion, the Big Dipper, the Southern Cross — these are cultural maps of the sky, used for navigation and storytelling across civilizations. Today we still use the 88 official constellations to locate objects in space. Unlock the full lesson to map them yourself.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 730),

('stars-constellations_grades6-8', 'Astronomy', 'Stars and Constellations', 'grades6-8',
'Stars aren''t all the same. They vary dramatically in size, temperature, luminosity, and age — and astronomers have developed precise ways to classify them. The Hertzsprung-Russell diagram plots stars by surface temperature against luminosity. Most stars, including our Sun, fall along a diagonal band called the main sequence. Where a star sits on that diagram tells you where it is in its life cycle — and how it will die. Low-mass stars like our Sun spend billions of years on the main sequence, then expand into red giants before shedding their outer layers and leaving a white dwarf. High-mass stars burn faster, die younger, and end in supernova explosions — the events responsible for producing most of the heavy elements in the universe, including the iron in your blood. The full lesson covers stellar classification, the H-R diagram, and stellar evolution. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 790),

('stars-constellations_grades9-12', 'Astronomy', 'Stars and Constellations', 'grades9-12',
'Stellar astrophysics is ultimately the story of nuclear physics playing out at astronomical scales — and the consequences of that process pervade the entire observable universe. A star is a gravitational equilibrium: the inward pressure of its own mass balanced by the outward radiation pressure of nuclear fusion. On the main sequence, hydrogen fuses to helium in the core via the proton-proton chain or the CNO cycle, depending on stellar mass. This equilibrium persists until hydrogen depletion forces structural reorganization. Post-main-sequence evolution diverges sharply by mass. Sub-solar stars become white dwarfs. Stars between roughly 8 and 20 solar masses end in core-collapse supernovae producing neutron stars. Above approximately 20 solar masses, the remnant collapses to a stellar-mass black hole. Each endpoint has observational signatures — pulse timing, gravitational wave emission, X-ray binaries — that modern observatories are actively characterizing. The full lesson covers the H-R diagram quantitatively, nucleosynthesis pathways, and stellar remnant properties. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 940),

-- LESSON 9: What Is an Algorithm?
('algorithm_grades1-2', 'Coding', 'What Is an Algorithm?', 'grades1-2',
'Have you ever followed a recipe? You know — first you get the bowl, then you add the flour, then you stir it, then you put it in the oven? That''s an algorithm! An algorithm is just a list of steps — in the right order — that tells you how to do something. Computers use algorithms for everything. When you press a button in a game, a list of steps runs super fast to decide what happens next. When you search for a video, an algorithm finds the best match for you. The cool thing is, you already know how to make algorithms! Every time you explain how to do something step by step — you''re thinking like a programmer. Want to make your first algorithm? Unlock the full lesson!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 670),

('algorithm_grades3-5', 'Coding', 'What Is an Algorithm?', 'grades3-5',
'Every app, every game, every website runs on one thing: algorithms. An algorithm is a precise set of instructions for solving a problem. It takes an input, follows a defined sequence of steps, and produces an output. The key word is precise — computers do exactly what they''re told, nothing more. So the instructions have to be completely unambiguous. Algorithms show up everywhere outside of computers too. A recipe is an algorithm. So is the method you use to sort cards, or the steps you take to solve a math problem. What makes a good algorithm? It should be clear, it should work for all valid inputs, and it should eventually finish. In this lesson, you''ll write your first algorithm — for a computer to follow. Unlock the full lesson to start.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 700),

('algorithm_grades6-8', 'Coding', 'What Is an Algorithm?', 'grades6-8',
'An algorithm is the fundamental unit of computation — a finite, unambiguous sequence of steps that transforms an input into a desired output. What makes algorithm design interesting is that there are usually many ways to solve the same problem, and they''re not all equal. Two algorithms that both sort a list of numbers correctly might differ wildly in how long they take, or how much memory they use. Algorithm analysis lets us compare them precisely. Big O notation describes how an algorithm''s resource requirements scale with input size. An O of n algorithm scales linearly. An O of n squared algorithm gets dramatically slower with larger inputs. Choosing the wrong algorithm for a large dataset isn''t just inefficient — it can make a program functionally unusable. The full lesson covers algorithm design patterns, Big O analysis, and implementation in code. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 760),

('algorithm_grades9-12', 'Coding', 'What Is an Algorithm?', 'grades9-12',
'Algorithm design is the discipline of constructing computational procedures that are correct, efficient, and provably so. Correctness is established through invariant analysis — identifying conditions that hold true at each step of an algorithm and showing they guarantee the desired output. Efficiency is characterized using asymptotic complexity: Big O for worst-case, Big Omega for best-case, Big Theta for tight bounds. The major algorithmic paradigms — divide and conquer, dynamic programming, greedy algorithms, backtracking — each represent a different structural approach to problem decomposition. Dynamic programming, for instance, solves optimization problems by breaking them into overlapping subproblems and memoizing results, yielding polynomial-time solutions to problems that naive recursion would solve exponentially. NP-completeness theory establishes the outer limits: a class of problems for which no known polynomial-time algorithm exists. The full lesson covers complexity classes, major paradigms, and proof techniques. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 930),

-- LESSON 10: Body Systems Overview
('body-systems_grades1-2', 'Biology', 'Body Systems Overview', 'grades1-2',
'Your body is amazing. Right now, while you''re listening, your heart is beating. Your lungs are breathing. Your stomach might be digesting your last meal. And your brain is hearing every single word. Your body is made of lots of different systems — each one doing its own special job. Your heart pumps blood everywhere. Your lungs bring in the air you need. Your bones hold you up and protect you. Your brain sends messages to everything else. And here''s the coolest part: all these systems work together, all at the same time, without you even thinking about it. Your body is doing hundreds of jobs right now — and it never takes a break. Want to meet all your body''s systems? Unlock the full lesson!',
'N2lVS1w4EtoT3dr4eOWO', 'Callum', 660),

('body-systems_grades3-5', 'Biology', 'Body Systems Overview', 'grades3-5',
'Your body isn''t one thing — it''s about a dozen systems all working at the same time, each one doing a specific job. The circulatory system pumps blood containing oxygen and nutrients to every cell. The respiratory system brings in oxygen and releases carbon dioxide. The digestive system breaks food into usable fuel. The skeletal and muscular systems work together to let you move. The nervous system coordinates everything — receiving information from the world and sending instructions to the rest of the body in milliseconds. These systems don''t just run in parallel. They''re deeply interdependent. Your muscles need oxygen from the circulatory system. Your heart is itself a muscle that needs oxygen. Everything connects to everything else. That''s what makes the human body so remarkable. Unlock the full lesson to explore each system.',
'XB0fDUnXU5powFXDhCwa', 'Charlotte', 720),

('body-systems_grades6-8', 'Biology', 'Body Systems Overview', 'grades6-8',
'The human body maintains a stable internal environment in a constantly changing external one. That stability is called homeostasis — and every major body system contributes to it. The cardiovascular system circulates 5 to 6 liters of blood continuously, delivering oxygen, nutrients, and hormones while removing metabolic waste. The respiratory system manages gas exchange at the alveoli. The endocrine system releases chemical signals — hormones — that regulate metabolism, growth, stress response, and reproduction. The nervous system provides rapid electrochemical signaling overlaid on the slower hormonal communication. Each system has its own organs, tissues, and feedback mechanisms. But they''re not independent — they''re a tightly coupled network. Failure in one system typically cascades into others. The full lesson covers organ function, feedback loops, and common system disorders. Unlock it.',
'onwK4e9ZLuTAKqWW03F9', 'Daniel', 760),

('body-systems_grades9-12', 'Biology', 'Body Systems Overview', 'grades9-12',
'Human physiology is an exercise in integrated systems biology — the study of how discrete subsystems with distinct mechanisms produce coordinated, emergent function. Each of the eleven recognized organ systems operates through its own physiological logic: the cardiovascular system through pressure gradients and cardiac output, the endocrine system through receptor-ligand binding and negative feedback regulation, the immune system through clonal selection and antigen presentation. What makes physiology complex is that these systems are not merely parallel — they are mutually regulatory. Consider the renin-angiotensin-aldosterone system: a cascade spanning the kidneys, lungs, adrenal glands, and vasculature to regulate blood pressure and fluid balance. Disruption at any node — renal artery stenosis, adrenal hyperplasia, ACE inhibition — propagates through the entire loop. Understanding the body means understanding these feedback architectures. The full lesson covers each organ system, homeostatic mechanisms, and pathophysiology. Unlock it.',
'21m00Tcm4TlvDq8ikWAM', 'Rachel', 880)

ON CONFLICT (lesson_key, age_group) DO NOTHING;
```

---

## Step 5 — Deploy Edge Function: generate-lesson-narrations

Create `supabase/functions/generate-lesson-narrations/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VOICE_SETTINGS = {
  stability: 0.55,
  similarity_boost: 0.80,
  style: 0.20,
  use_speaker_boost: true,
};

const MODEL_ID = "eleven_multilingual_v2";
const BATCH_SIZE = 3;
const COST_PER_1K_CHARS = 0.00024; // $0.24 per 1000 chars

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch pending batch
  const { data: jobs, error } = await supabase
    .from("lesson_narrations")
    .select("id, lesson_key, age_group, script, voice_id, char_count")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !jobs?.length) {
    return new Response(JSON.stringify({ message: "No pending jobs", error }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];

  for (const job of jobs) {
    try {
      // Mark as processing
      await supabase
        .from("lesson_narrations")
        .update({ status: "generated", updated_at: new Date().toISOString() })
        .eq("id", job.id);

      // Call ElevenLabs TTS
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${job.voice_id}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: job.script,
            model_id: MODEL_ID,
            voice_settings: {
              ...VOICE_SETTINGS,
              // Adjust stability per age group
              stability: job.age_group === "grades9-12" ? 0.65
                : job.age_group === "grades6-8" ? 0.60
                : 0.50,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs API error ${response.status}: ${errText}`);
      }

      // Upload audio to Supabase Storage
      const audioBuffer = await response.arrayBuffer();
      const fileName = `narrations/${job.lesson_key}_${job.age_group}.mp3`;

      const { data: upload, error: uploadError } = await supabase.storage
        .from("lesson-audio")
        .upload(fileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from("lesson-audio")
        .getPublicUrl(fileName);

      // Estimate duration (avg 130 words/min, ~5 chars/word)
      const wordCount = job.script.split(/\s+/).length;
      const durationSeconds = Math.round((wordCount / 130) * 60);
      const costUsd = (job.char_count / 1000) * COST_PER_1K_CHARS;

      // Update record
      await supabase
        .from("lesson_narrations")
        .update({
          status: "generated",
          audio_url: publicUrl,
          duration_seconds: durationSeconds,
          cost_usd: costUsd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      results.push({ id: job.id, lesson_key: job.lesson_key, age_group: job.age_group, status: "generated", url: publicUrl });

    } catch (err) {
      await supabase
        .from("lesson_narrations")
        .update({
          status: "failed",
          error: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      results.push({ id: job.id, lesson_key: job.lesson_key, status: "failed", error: err.message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Deploy command:**
```bash
supabase functions deploy generate-lesson-narrations \
  --project-ref osnxbuusohdzzcrakavn \
  --no-verify-jwt
```

**Required secrets** (set once):
```bash
supabase secrets set ELEVENLABS_API_KEY=your_key \
  --project-ref osnxbuusohdzzcrakavn
```

---

## Step 6 — Create Storage Bucket

Run in SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-audio', 'lesson-audio', true)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 7 — Schedule + Trigger

**One-time run** (invoke manually to test first clip):
```bash
curl -X POST https://osnxbuusohdzzcrakavn.supabase.co/functions/v1/generate-lesson-narrations \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Schedule to run every 3 minutes** until all 40 are done:
```sql
SELECT cron.schedule(
  'generate-lesson-narrations',
  '*/3 * * * *',
  $$SELECT net.http_post(
    url := 'https://osnxbuusohdzzcrakavn.supabase.co/functions/v1/generate-lesson-narrations',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

**At 3 clips/run × every 3 min → all 40 clips done in ~40 minutes.**

---

## Step 8 — Monitor Progress

```sql
-- Live status
SELECT 
  status,
  COUNT(*) as count,
  SUM(char_count) as total_chars,
  ROUND(SUM(cost_usd)::numeric, 4) as total_cost_usd,
  ROUND(AVG(duration_seconds)) as avg_duration_secs
FROM lesson_narrations
GROUP BY status;

-- Per-lesson completion
SELECT subject, lesson_title, 
  COUNT(*) FILTER (WHERE status = 'generated') as done,
  COUNT(*) as total
FROM lesson_narrations
GROUP BY subject, lesson_title
ORDER BY subject;
```

---

## Step 9 — Remove Old Audio Jobs (title callouts)

After confirming the narrations generate cleanly, delete the 1,654 title-read audio jobs:

```sql
-- Preview first
SELECT COUNT(*) FROM media_generation_jobs 
WHERE asset_type = 'audio';

-- Then delete
DELETE FROM media_generation_jobs 
WHERE asset_type = 'audio';
```

---

## Cost Summary

| Item | Count | Avg chars | Total chars | Cost @ $0.24/1k |
|---|---|---|---|---|
| grades 1–2 clips | 10 | 645 | 6,450 | $1.55 |
| grades 3–5 clips | 10 | 700 | 7,000 | $1.68 |
| grades 6–8 clips | 10 | 760 | 7,600 | $1.82 |
| grades 9–12 clips | 10 | 840 | 8,400 | $2.02 |
| **TOTAL** | **40** | **736 avg** | **29,450** | **~$7.07** |

**Well under $50 budget. 40 clips. ~$7.**

---

## Frontend Integration Note

Each `lesson_narrations` record has:
- `audio_url` — public Supabase Storage URL, direct `<audio>` tag or howler.js
- `age_group` — use to match student's grade band
- `lesson_key` — matches subject + lesson for lookup

Suggested UX: show the first 20 seconds of audio freely, then fade to a soft paywall prompt: *"Unlock the full lesson to hear the complete narration and access all activities."*

---

*Brief complete. All 40 scripts written. All voice IDs verified. All SQL ready to paste.*
