# FIX 8: KOYDO WORLDS — COMMERCE & SIDE ECONOMY BIBLE

> **This document turns Koydo Worlds from a subscription app into an ecosystem.**
> The game is the core. The economy that surrounds it — merchandise, physical
> products, educational tools, gifts — is the amplifier.
> Every product deepens the child's connection to the world they're learning in.
> Every purchase is educational, not extractive.

---

## TABLE OF CONTENTS

1. Commerce Philosophy — Why This Isn't "Just Merch"
2. The Three Commerce Surfaces
3. Product Catalog — Complete
4. Merchandise Design System
5. The Kindler Journal (Physical Product — Deep Spec)
6. Character Plush Line
7. Educational Toy Line
8. Apparel & Accessories
9. Digital Goods & Downloads
10. Gift Card & Gifting System
11. Seasonal & Limited Collections
12. Shopify Integration Architecture
13. Parent Portal Commerce UX
14. Freemium-to-Commerce Pathways
15. Pricing Strategy & Margins
16. Fulfillment & Logistics
17. Metrics & Revenue Projections

---

## 1. COMMERCE PHILOSOPHY

### Rule: Every Product Teaches

This is not a merch store bolted onto a game. Every physical product extends the educational experience into the real world. A Baxter plush is not just a toy — it comes with a seed packet and a pollination activity card. A Frost Peaks poster is not just decoration — it's a labeled geological cross-section. The merchandise IS curriculum delivered in a different medium.

### Rule: The Parent Chooses, Never the Child

No in-game storefront is shown to children. Commerce surfaces exist only in:
1. The Parent Dashboard (authenticated parent-only space)
2. The public website (`shop.koydoworlds.com`)
3. The freemium upgrade flow (subscription, not merchandise)

Children never see prices, never see "buy" buttons, never experience purchase pressure. This is non-negotiable.

### Rule: Quality Over Quantity

Launch with 30-40 SKUs, not 300. Every product must be something a parent would WANT in their home — beautiful, durable, educational, and aligned with the game's aesthetic. No junk. No landfill. If it wouldn't look good on a shelf in a Studio Ghibli film, it doesn't ship.

### Rule: Margin Matters

Physical products are a secondary revenue stream. Target 50-65% gross margin. If a product can't hit 50% margin at reasonable volume, don't make it. The subscription is the primary business; commerce extends lifetime value and deepens engagement.

---

## 2. THE THREE COMMERCE SURFACES

### Surface 1: The Koydo Shop (Public Website)

**URL:** `shop.koydoworlds.com`
**Platform:** Shopify (hosted), themed to match Koydo Worlds visual identity
**Access:** Anyone. No account required to browse. Account required to purchase.
**Content:** Full product catalog, featured collections, gift cards, seasonal drops

**Design:** The shop should feel like walking into the Great Archive's gift shop — warm, curated, beautiful. Not an Amazon-style grid of products. Each product page tells the story of the world or character it's connected to.

### Surface 2: The Parent Portal Shop

**URL:** `worlds.koydo.com/parent/shop` (authenticated, within the parent dashboard)
**Platform:** Shopify Buy SDK embedded in the React parent dashboard
**Access:** Authenticated parents only. Personalized to their child's journey.
**Content:** Personalized recommendations based on child's most-visited worlds and favorite characters.

**Key Feature: Contextual Commerce**

The parent dashboard already shows which worlds the child visits most, which characters they interact with, and which subjects they've engaged with. The embedded shop uses this data to make relevant, non-intrusive suggestions:

```
┌─────────────────────────────────────────────────┐
│ PARENT DASHBOARD — WEEKLY REPORT                │
│                                                 │
│ This week, [Child] spent the most time in       │
│ Tideline Bay with Suki. They completed 3        │
│ entries about marine biology.                    │
│                                                 │
│ ┌───────────────────────────────────────┐       │
│ │ 📦 Extend the learning at home:       │       │
│ │                                       │       │
│ │ 🐙 Hachi the Octopus Plush     $24   │       │
│ │    Comes with marine biology          │       │
│ │    activity cards                     │       │
│ │                                       │       │
│ │ 🪸 Coral Reef Discovery Kit     $35   │       │
│ │    Build a model reef + guide         │       │
│ │                                       │       │
│ │ [Browse Tideline Bay Collection →]    │       │
│ └───────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

**Rules for contextual commerce:**
- Maximum 2 product suggestions per dashboard visit
- Suggestions appear BELOW the educational content, never above
- Suggestions are labeled "Extend the learning at home" — not "Buy" or "Shop"
- A dismiss button removes suggestions for 30 days
- No personalized ads. No behavioral tracking for commerce. Just: "Your child loves Tideline Bay → here's a Tideline Bay product."

### Surface 3: The Freemium-to-Commerce Bridge

**When:** A child on the free tier discovers something they love. The parent receives a notification.

**Commerce integration:** The notification includes both:
1. A subscription upgrade prompt (primary CTA)
2. A related physical product suggestion (secondary CTA)

Example:
```
[Child] just discovered the Fibonacci sequence in the 
Number Garden! Dottie helped them count sunflower petals.

🌻 Unlock all 50 worlds → Upgrade to Pathfinder ($12.99/mo)

🌻 Take the learning outside:
   Fibonacci Nature Walk Kit ($19.99)
   A magnifying glass, activity cards, and a field guide 
   to find Fibonacci patterns in your garden.
```

The subscription is always the primary ask. The product is a secondary, non-pressuring addition. The parent can buy the kit WITHOUT upgrading the subscription — the commerce layer is independent.

---

## 3. PRODUCT CATALOG — COMPLETE

### Category Overview

| Category | SKU Count | Price Range | Margin Target | Launch Priority |
|----------|-----------|-------------|---------------|----------------|
| Character Plush | 10 | $22-34 | 60% | Phase 1 (Launch) |
| The Kindler Journal (Physical) | 3 | $24-39 | 55% | Phase 1 (Launch) |
| Educational Kits | 8 | $19-45 | 50% | Phase 1 (Launch) |
| Posters & Wall Art | 6 | $15-30 | 70% | Phase 1 (Launch) |
| Apparel | 5 | $22-35 | 55% | Phase 2 (Month 3) |
| Digital Downloads | 5 | $5-15 | 95% | Phase 1 (Launch) |
| Gift Cards | 4 | $25-150 | 100% (service) | Phase 1 (Launch) |
| Books | 3 | $16-25 | 50% | Phase 2 (Month 6) |
| Seasonal Collections | Variable | $15-45 | 55% | Rolling (quarterly) |
| **Total Launch SKUs** | **~35** | | | |

### Full SKU List

```
PHASE 1 — LAUNCH (Day 0)

PLUSH-001  Compass Plush (changes expression w/ tilt sensor)      $29.99
PLUSH-002  Baxter the Bee Plush (lab coat, compound eyes)         $27.99
PLUSH-003  Hachi the Octopus Plush (8 poseable tentacles)         $24.99
PLUSH-004  Old Rowan Mini Tree (desktop planter base)             $34.99
PLUSH-005  Cal Crystal Plush (color-changing fabric)              $26.99

JOURNAL-001  Kindler Journal: Explorer Edition (ages 5-7)         $24.99
JOURNAL-002  Kindler Journal: Pathfinder Edition (ages 8-10)      $29.99
JOURNAL-003  Kindler Journal: Family Edition (4 sections)         $39.99

KIT-001  Fibonacci Nature Walk Kit                                $19.99
KIT-002  Coral Reef Discovery Kit (model reef + guide)            $34.99
KIT-003  Simple Machines Builder Kit (Zara's Workshop)            $29.99
KIT-004  Circuit Starter Kit (Kofi's basics)                      $24.99
KIT-005  Weather Station Kit (Nimbus's instruments)               $27.99
KIT-006  Star Finder Kit (Riku's constellation guide)             $22.99

POSTER-001  Cloud Kingdom Map (labeled weather systems)           $18.99
POSTER-002  Tideline Bay Cross-Section (surface to trench)        $18.99
POSTER-003  The 50 Worlds Map (full universe)                     $24.99
POSTER-004  Frost Peaks Stratigraphy (geological layers)          $18.99
POSTER-005  Number Garden Fibonacci Spiral                        $15.99
POSTER-006  All 50 Characters Group Portrait                      $24.99

DIGITAL-001  Koydo Worlds Soundtrack (full album, MP3/FLAC)       $9.99
DIGITAL-002  Character Leitmotif Collection (50 tracks)           $7.99
DIGITAL-003  Printable Activity Pack: STEM (20 pages)             $5.99
DIGITAL-004  Printable Activity Pack: Language Arts (20 pages)    $5.99
DIGITAL-005  Printable Activity Pack: Financial Literacy (20 pp)  $5.99

GIFT-001  Gift Card: 3-Month Explorer                             $24.99
GIFT-002  Gift Card: 6-Month Pathfinder                           $69.99
GIFT-003  Gift Card: Annual Family                                $149.99
GIFT-004  Gift Card: Choose Your Amount ($25-$200)                Variable

PHASE 2 — MONTH 3+

PLUSH-006  Pixel Plush (partially translucent fabric)             $27.99
PLUSH-007  Dottie Chakravarti Doll (w/ tiny trowel + calculator)  $29.99
PLUSH-008  Zara Ngozi Action Figure (prosthetic hand, tools)      $27.99
PLUSH-009  Compass Night Light (glows, rotates compass rose)      $32.99
PLUSH-010  Atlas Bookend (stone-textured, map lines glow)         $34.99

APPAREL-001  "Every Lesson Is a World" T-Shirt (adult)            $28.99
APPAREL-002  "Every Lesson Is a World" T-Shirt (child)            $22.99
APPAREL-003  Kindler Hoodie (Spark emblem, glow-in-dark)          $35.99
APPAREL-004  Koydo Worlds Compass Enamel Pin                      $12.99
APPAREL-005  Character Enamel Pin Set (5-pack: Compass, Baxter,   $29.99
             Cal, Pixel, Hachi)

KIT-007  Rock & Mineral Collection (Mira's specimens)             $29.99
KIT-008  Seed Vault Kit (grow 5 heritage seeds, Baxter's garden)  $19.99

PHASE 3 — MONTH 6+

BOOK-001  "The Worlds Are Fading" — Illustrated Storybook         $24.99
           (Original story, Ghibli-style illustrations,
            introduces the universe for pre-readers)
BOOK-002  "50 Things Worth Knowing" — Fact Book                   $19.99
           (One entry per world, illustrated, ages 6-10)
BOOK-003  "Compass's Journey" — Chapter Book                      $16.99
           (Compass's origin story as a standalone novel, ages 8-12)
```

---

## 4. MERCHANDISE DESIGN SYSTEM

### Visual Identity for Products

All merchandise follows the Koydo Worlds visual language:

**Color palette:** Warm, saturated, Ghibli-adjacent. Primary: Deep forest green (#2D5F3F), warm gold (#D4A843), ocean blue (#2B6CB0). Secondary: Soft cream (#F5F0E1), terracotta (#C75B3A), twilight purple (#6B4D8E).

**Typography:** Product titles in the same font family as the game UI. Body text in a warm, readable serif. NO Comic Sans. NO "kiddie" fonts. The aesthetic treats children as intelligent — the typography should too.

**Illustration style:** Every product includes original illustration in the Ghibli/NatGeo game style. Not clip art. Not stock photography. Custom art that matches what children see in-game. The plush of Baxter should look like Baxter. The poster of Cloud Kingdom should be recognizable from the game.

**Packaging:** Minimal, recyclable, beautiful. Each product ships in a kraft box with a single Ghibli-style illustration on it. Inside: the product + a card with a real-world fact from the related world. The packaging IS content.

### Packaging Fact Cards

Every physical product includes a 4"×6" card with:
- Front: Character illustration + a quote from the guide
- Back: A real-world fact from the entry catalog + a home activity suggestion

Example (Baxter Plush card):
```
FRONT:
[Illustration of Baxter in lab coat, compound eyes sparkling]
"E-every flower has something to tell you, 
 if you l-look closely." — Baxter

BACK:
DID YOU KNOW?
Bees see ultraviolet patterns on flowers that are invisible 
to human eyes. These patterns act as "landing strips" 
guiding bees to the nectar.

TRY THIS AT HOME:
Take a magnifying glass to a garden. Count the petals on 
5 different flowers. Do any of the numbers match the 
Fibonacci sequence? (1, 1, 2, 3, 5, 8, 13, 21...)
```

---

## 5. THE KINDLER JOURNAL — PHYSICAL PRODUCT DEEP SPEC

### What It Is

A premium physical journal designed for children to document their Koydo Worlds journey AND their real-world learning. Half game companion, half field notebook, half creative writing journal.

### Three Editions

**Explorer Edition (Ages 5-7) — $24.99**
- 80 pages, hardcover, elastic closure
- Large format (8.5" × 11") for younger hands
- Pages: guided prompts with lots of drawing space
- Sections: "What I Saw Today" (draw), "What I Learned" (write/draw), "My Favorite Guide" (character page), "My Spark Level" (color-in tracker)
- Includes: sticker sheet (50 character stickers), 2 Fibonacci counting cards
- Paper: Thick, crayons/markers-friendly, no bleed-through

**Pathfinder Edition (Ages 8-10) — $29.99**
- 120 pages, hardcover, elastic closure, ribbon bookmark
- Standard format (6" × 9")
- Pages: mix of guided and freeform. Research prompts, experiment logs, creative writing starters, fact collection pages
- Sections: "Entry Log" (track completed entries), "Cross-World Connections" (draw links between subjects), "Unsolved Mysteries" (personal questions), "My Kindler Story" (creative writing)
- Includes: fold-out 50 Worlds Map poster, world completion checklist
- Paper: Dotted grid (good for both writing and drawing/charting)

**Family Edition — $39.99**
- 200 pages, hardcover, 4 ribbon bookmarks (one per child)
- Standard format (8" × 10")
- 4 tabbed sections (one per child profile, up to 4 children)
- Each section has: personal entry log, favorite character page, drawing space, writing prompts
- Shared section in the middle: "Family Discoveries" (things learned together)
- Includes: 4 sticker sheets, family activity cards (10), fold-out map

### Print-on-Demand vs. Inventory

**Phase 1 (Launch):** Print-on-demand via Lulu Direct or BookVault. Higher per-unit cost (~$8-12) but zero inventory risk. Ship within 5-7 business days.

**Phase 2 (once demand is validated):** Offset print run of 2,000-5,000 units. Per-unit cost drops to $4-6. Inventory stored at 3PL. Ship within 2-3 business days.

### The Journal ↔ App Connection

The physical journal is designed to complement, not duplicate, the in-app Kindler Journal:

| In-App Journal | Physical Journal |
|---------------|-----------------|
| Auto-generated from gameplay | Hand-written/drawn by child |
| Screenshots and system-generated art | Child's own illustrations |
| Standards tracking, metrics | Personal reflections, feelings |
| Digital, shareable as PDF | Physical, keep on shelf forever |

The two journals together create a complete learning portfolio: objective (app) + subjective (physical).

### Subscription Bundle

Offer a "Kindler's Complete" bundle:
- Annual Pathfinder subscription ($99.99)
- Physical Kindler Journal edition matching age tier ($24.99-29.99)
- Compass enamel pin ($12.99)
- **Bundle price: $119.99** (save ~$18-23)

The bundle increases average order value and creates a physical artifact that anchors the subscription relationship.

---

## 6. CHARACTER PLUSH LINE

### Design Principles

- **Accuracy:** The plush must be recognizable as the in-game character. Baxter's lab coat, Cal's crystal facets, Compass's shifting form — these must be present.
- **Quality:** Target the Jellycat/Squishable tier of plush quality. Soft, durable, machine-washable. $5-8 manufacturing cost to support $25-35 retail with 60% margin.
- **Educational element:** Every plush comes with a character card (front: illustration + quote; back: real-world fact + activity). The plush is the gateway to the learning.
- **Safety:** All materials CPSIA and EN-71 compliant. No small parts for age 3+. Embroidered eyes (no button eyes for under-3 safety, even though our target is 5-10).

### Launch Characters (Phase 1)

| Character | Key Design Features | Unique Element | Size |
|-----------|-------------------|----------------|------|
| Compass | Soft light-colored body, compass rose embroidered on chest | Tilt sensor: tip forward = "happy" expression, tip back = "curious" | 10" |
| Baxter | Gold-brown stripes, translucent wings (organza), tiny lab coat | Removable lab coat. Under it, anatomically inspired bee body. | 12" |
| Hachi | Blue-ringed octopus pattern, 8 poseable wire-core tentacles | Each tentacle has a different texture (learning through touch) | 8" |
| Old Rowan | Tree form, soft bark-textured fabric, moss accents | Desktop planter base — a real plant can grow from Rowan's "roots" | 10" |
| Cal | Crystal-faceted geometric plush, color-changing thermochromic fabric | Fabric shifts color with body heat (warm = blue/addition color) | 9" |

### Phase 2 Characters

| Character | Key Design Features | Unique Element |
|-----------|-------------------|----------------|
| Pixel | Partially translucent panels, pixel-pattern fabric | LED in chest pulses gently (battery, replaceable) |
| Dottie | Elderly Indian woman doll, geometric sari, gold glasses | Comes with tiny fabric sunflower with countable petals (13) |
| Zara | Young girl doll, braided hair with gear beads, prosthetic hand | Prosthetic hand is detachable and reattachable (teaching tool) |
| Compass Night Light | Compass form factor, warm LED, rotates slowly | Projects constellation pattern on ceiling |
| Atlas Bookend | Stone-textured, map lines in UV-reactive ink | Under blacklight, map lines glow (science of UV light) |

### Manufacturing

**Supplier:** Source from ICTI-certified factories (ethical manufacturing). China for initial runs; evaluate Vietnam/India for second source.

**MOQ:** 500 units per SKU for Phase 1. 1,000+ for Phase 2 (with proven demand).

**Lead time:** 60-90 days from order to warehouse.

**Quality control:** Pre-production sample approval. In-line inspection. Pre-shipment inspection. Third-party lab testing for CPSIA/EN-71.

---

## 7. EDUCATIONAL KIT LINE

### Kit Design Philosophy

Each kit turns a Koydo Worlds entry into a hands-on, real-world activity. The child learns it in-game, then does it for real. The gap between digital and physical learning closes.

### KIT-001: Fibonacci Nature Walk Kit — $19.99

**Contents:**
- Child-sized magnifying glass (real glass, not plastic)
- 20-page field guide: "Finding Fibonacci in Nature" (illustrated, Ghibli style)
- Counting worksheet pad (waterproof paper, 10 sheets)
- Pencil with golden ratio markings
- Drawstring bag (canvas, Number Garden illustration)

**Learning connection:** After completing the Fibonacci entry with Dottie, children go outside and find the same patterns in real flowers, pinecones, and shells.

**Home activity (from field guide):**
1. Find 5 different flowers. Count the petals on each.
2. Record the numbers. Do any match the Fibonacci sequence?
3. Find a pinecone. Count the spirals going clockwise. Count counterclockwise. Are both numbers in the sequence?
4. Draw your favorite natural Fibonacci pattern in the counting pad.

### KIT-002: Coral Reef Discovery Kit — $34.99

**Contents:**
- Reef model building set (non-toxic clay, 6 coral species molds)
- Marine species identification cards (20 cards, illustrated)
- Magnifying viewer for examining coral structure
- "Life on the Reef" guidebook (16 pages, Ghibli-style illustrations)
- Ocean conservation pledge card

**Learning connection:** After exploring Tideline Bay with Suki, children build a physical reef and learn species identification.

### KIT-003: Simple Machines Builder Kit — $29.99

**Contents:**
- Wooden lever, fulcrum, inclined plane, pulley, wheel-and-axle
- 10 engineering challenge cards ("Lift this weight using only a lever")
- Zara's Engineering Notebook (24 pages, blank + guided)
- Measuring tape
- Canvas tool pouch

**Learning connection:** After visiting Savanna Workshop, children build and test the same simple machines Zara uses.

### KIT-004: Circuit Starter Kit — $24.99

**Contents:**
- Battery pack (2×AA, safe enclosed housing)
- 6 LED lights (3 colors)
- Copper tape (conductive, safe for children)
- 10 circuit challenge cards ("Light up 2 LEDs using one battery")
- Kofi's Circuit Guide (16 pages)
- Insulator/conductor testing materials (rubber, metal, wood, plastic samples)

**Learning connection:** After wiring circuits in Circuit Marsh with Kofi, children build real circuits at home.

**Safety:** All electrical components are low-voltage (3V max). Battery housing is screwed shut (adult access only). Circuit challenge cards include safety rules on every card.

### KIT-005: Weather Station Kit — $27.99

**Contents:**
- Outdoor thermometer (analog, child-readable)
- Rain gauge (graduated cylinder, mountable)
- Wind vane (assembly required — simple, 4 pieces)
- Cloud identification chart (laminated, weatherproof)
- Weather journal (30-day tracking, Nimbus illustrations)
- Beaufort Scale pocket card

**Learning connection:** After learning about the Beaufort Scale and water cycle with Nimbus, children track their own local weather.

### KIT-006: Star Finder Kit — $22.99

**Contents:**
- Planisphere (adjustable star chart for child's latitude)
- Red-filtered flashlight (preserves night vision for stargazing)
- Constellation connection guide (20 constellations, stories from multiple cultures)
- Tactile star map card (raised dots — inspired by Riku's accessibility)
- Observation log (15 night sessions)

**Learning connection:** After visiting Starfall Observatory with Riku, children find real constellations. The tactile star map teaches that Riku's way of seeing is valid and powerful.

---

## 8. APPAREL & ACCESSORIES

### Design Rules

- **No garish logos.** The Koydo Worlds name appears small and elegant — on a sleeve tag, inside the collar, or as a subtle embroidered element. The DESIGN is the marketing, not a giant logo.
- **Wearable by adults too.** Parents wear the adult tees because they're genuinely good-looking, not because they're "fan merch."
- **Every apparel item has an educational Easter egg.** The Kindler Hoodie's glow-in-dark Spark emblem is a constellation map. The compass pin's needle actually points north (magnetized).

### Launch Apparel

**APPAREL-001/002: "Every Lesson Is a World" T-Shirt**
- Adult: $28.99 (S-XXL), 100% organic cotton, screen-printed
- Child: $22.99 (4-12), 100% organic cotton, screen-printed
- Design: Minimalist. Warm gold text on forest green shirt. Back: tiny Compass icon.

**APPAREL-003: Kindler Hoodie**
- $35.99 (child sizes 4-14)
- Spark emblem on chest (glow-in-dark ink — constellation map visible in dark)
- Inside hood: printed with the 50 world names in tiny text
- Colors: Deep green, ocean blue, warm gold

**APPAREL-004: Compass Enamel Pin**
- $12.99
- 1.25" hard enamel, dual-post backing
- Compass rose design with magnetized needle (actually functions as a compass)
- Retail-packaged on character card

**APPAREL-005: Character Enamel Pin Set (5-pack)**
- $29.99
- Compass, Baxter, Cal, Pixel, Hachi — the five non-human characters
- Each pin on its own character card with a fact
- Collectible display card that holds all 5

---

## 9. DIGITAL GOODS & DOWNLOADS

### Near-100% Margin Products

Digital goods are the highest-margin items in the catalog. They cost nothing to produce after initial creation and nothing to fulfill.

**DIGITAL-001: Koydo Worlds Soundtrack — $9.99**
- Full album: all 50 world ambient tracks + 8 character leitmotifs
- Formats: MP3 (320kbps) + FLAC (lossless)
- Cover art: Original illustration of the Great Archive
- Available on shop + Bandcamp + streaming (Spotify, Apple Music)
- The soundtrack is marketing: parents play it at home, children hear it, emotional connection reinforced

**DIGITAL-002: Character Leitmotif Collection — $7.99**
- All 50 character themes as individual tracks
- Each track: 1-2 minutes, full arrangement (not the 4-8 bar game version)
- Liner notes: character backstory snippet with each track
- Parents use these as "character playlists" during homeschool time

**DIGITAL-003/004/005: Printable Activity Packs — $5.99 each**
- 20 pages each (STEM, Language Arts, Financial Literacy)
- Beautifully designed, Ghibli-style illustrations
- Activities mapped to entries: "After completing the Fibonacci entry, try this worksheet"
- PDF format, unlimited prints per purchase
- Print at home on standard paper

### Free Digital Content (Marketing, Not Commerce)

Some digital content is given away free as a marketing asset:

- **Sample Activity Pack** (5 pages from each subject area) — free download with email capture
- **50 Worlds Coloring Pages** (line art of each world) — free download, shareable
- **"Meet the Guides" Character Cards** (printable) — free, social media shareable
- **Parent Guide: "How to Talk to Your Child About What They Learned Today"** — free PDF, email nurture sequence

---

## 10. GIFT CARD & GIFTING SYSTEM

### Why Gifting Is Critical

Grandparents are the #1 purchaser of children's educational products as gifts. Birthday, holiday, "just because." The gifting flow must be designed for grandparents: simple, clear, zero technical complexity.

### Gift Card Products

| SKU | Product | Price | Contains |
|-----|---------|-------|----------|
| GIFT-001 | 3-Month Explorer | $24.99 | 3 months Explorer subscription |
| GIFT-002 | 6-Month Pathfinder | $69.99 | 6 months Pathfinder subscription |
| GIFT-003 | Annual Family | $149.99 | 12 months Family subscription |
| GIFT-004 | Custom Amount | $25-200 | Store credit for shop + subscription |

### Physical Gift Cards

For holiday/birthday markets, offer physical gift cards:
- Premium card stock, Ghibli-style illustration
- Unique redemption code printed inside
- Ships in a small envelope with character art
- Available at `shop.koydoworlds.com` + eventually retail (Target, Amazon)
- **Cost:** $1.50 per card to produce/ship. 100% margin on the service value.

### Digital Gifting Flow (for Grandparents)

```
Step 1: grandparent visits shop.koydoworlds.com/gift
Step 2: selects gift type (subscription or store credit)
Step 3: enters grandchild's name + parent's email
Step 4: pays
Step 5: parent receives beautiful email:
  "Dear [Parent], [Grandparent] has given [Child] the gift of 
   50 worlds of learning! Activate your Koydo Worlds 
   subscription below."
Step 6: parent activates with one tap
```

**Critical UX requirements:**
- Grandparent never needs a Koydo account
- Payment via credit card or Apple Pay / Google Pay
- The email to the parent is BEAUTIFUL — custom illustration, child's name, warm message
- Activation is ONE TAP from the email — no account creation flow, no password
- Works on mobile (grandparents text the gift link from their phone)

### Gift Bundles (Holiday Season)

**The Kindler Starter Bundle — $79.99** (save ~$25)
- 6-month Pathfinder subscription
- Compass Plush
- Kindler Journal (age-appropriate edition)
- Ships in a premium gift box

**The Explorer's Gift Box — $49.99** (save ~$15)
- 3-month Explorer subscription
- One educational kit (customer's choice)
- Character enamel pin
- Gift box with handwritten-style card

**The Ultimate Kindler Collection — $199.99** (save ~$50)
- Annual Family subscription
- 2 character plushes (customer's choice)
- Family Kindler Journal
- Soundtrack album (digital)
- All 3 printable activity packs
- Premium gift box with all 50 world names printed inside the lid

---

## 11. SEASONAL & LIMITED COLLECTIONS

### Quarterly Drops

Each quarter, release 3-5 limited-edition products tied to the seasonal content calendar (defined in the Production Bible Part 6).

| Quarter | Theme | Products |
|---------|-------|----------|
| Q1 (Jan-Mar) | Inventor's Season | Limited-edition inventor biography cards (10-pack), blueprint poster set |
| Q2 (Apr-Jun) | Earth & Ocean Month | Ocean cleanup activity kit, seed bomb making kit, Earth Day poster |
| Q3 (Jul-Sep) | Explorer's Season | New geography field trip kit (tied to new map locations), explorer's notebook |
| Q4 (Oct-Dec) | Holiday / Great Restoration | Gift bundles, holiday character ornament set (5 characters), "The Worlds Are Fading" storybook special edition |

### Limited Edition Rules

- Announced 2 weeks before availability
- Available for 4-6 weeks or until sold out
- NO artificial scarcity for children. These are marketed to parents.
- Limited editions are NEVER advertised in-game to children
- Parent dashboard shows seasonal products in the shop section only

### Holiday Ornament Set (Q4 Special)

5 character ornaments: Compass (glowing star), Baxter (honeycomb), Cal (crystal), Old Rowan (tiny tree), Hachi (octopus)
- Material: Ceramic or resin, hand-painted style
- $39.99 for the set, $9.99 individual
- Each ornament has a QR code linking to the character's in-game backstory page
- Ships in a presentation box with the 5 characters illustrated on the lid

---

## 12. SHOPIFY INTEGRATION ARCHITECTURE

### Why Shopify

- Proven commerce platform, handles payment processing, inventory, shipping, taxes
- Shopify Buy SDK embeds natively into React parent dashboard
- Headless commerce: Shopify as backend, custom frontend in parent portal
- Shopify POS for potential retail/convention presence
- App ecosystem for email marketing (Klaviyo), reviews (Judge.me), analytics

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│ shop.koydoworlds.com│     │ worlds.koydo.com     │
│ (Shopify Storefront)│     │ /parent/shop          │
│                     │     │ (React + Shopify Buy  │
│ Full public shop    │     │  SDK, authenticated)  │
│ Browse, buy, gift   │     │                       │
│                     │     │ Personalized recs      │
│                     │     │ Contextual commerce    │
└────────┬────────────┘     └──────────┬───────────┘
         │                             │
         └──────────┬──────────────────┘
                    │
         ┌──────────▼──────────────┐
         │ Shopify Backend         │
         │ (Headless / Storefront  │
         │  API + Buy SDK)         │
         │                         │
         │ Products, inventory,    │
         │ orders, payments, tax,  │
         │ shipping, fulfillment   │
         └──────────┬──────────────┘
                    │
         ┌──────────▼──────────────┐
         │ Koydo Worlds Supabase   │
         │                         │
         │ merchandise_catalog     │
         │ (synced from Shopify)   │
         │                         │
         │ merchandise_orders      │
         │ (synced from Shopify)   │
         │                         │
         │ Links: parent_account → │
         │ shopify_customer_id     │
         └─────────────────────────┘
```

### Shopify ↔ Supabase Sync

A lightweight webhook listener syncs Shopify state to Supabase:

```typescript
// Shopify webhook → Supabase sync (Edge Function)

// Product sync (Shopify → Supabase)
// Trigger: shopify/product/create, shopify/product/update
async function syncProduct(shopifyProduct: ShopifyProduct) {
  await supabase.from('merchandise_catalog').upsert({
    shopify_product_id: shopifyProduct.id,
    sku: shopifyProduct.variants[0].sku,
    title: shopifyProduct.title,
    description: shopifyProduct.body_html,
    price_usd: parseFloat(shopifyProduct.variants[0].price),
    in_stock: shopifyProduct.variants[0].inventory_quantity > 0,
    image_urls: shopifyProduct.images.map(i => i.src),
    category: shopifyProduct.product_type,
    linked_world_slug: shopifyProduct.metafields
      ?.find(m => m.key === 'world_slug')?.value,
    linked_guide_name: shopifyProduct.metafields
      ?.find(m => m.key === 'guide_name')?.value,
    updated_at: new Date().toISOString()
  }, { onConflict: 'shopify_product_id' });
}

// Order sync (Shopify → Supabase)
// Trigger: shopify/orders/create, shopify/orders/updated
async function syncOrder(shopifyOrder: ShopifyOrder) {
  // Match Shopify customer to parent account
  const { data: parent } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('email', shopifyOrder.customer.email)
    .single();
    
  if (!parent) return; // Guest checkout — no link
  
  await supabase.from('merchandise_orders').upsert({
    shopify_order_id: String(shopifyOrder.id),
    parent_account_id: parent.id,
    total_usd: parseFloat(shopifyOrder.total_price),
    status: mapShopifyStatus(shopifyOrder.fulfillment_status),
    items: shopifyOrder.line_items.map(li => ({
      sku: li.sku,
      qty: li.quantity,
      price: parseFloat(li.price)
    })),
    updated_at: new Date().toISOString()
  }, { onConflict: 'shopify_order_id' });
}
```

### Shopify Metafields for Koydo

Each Shopify product carries custom metafields linking it to the game world:

| Metafield | Type | Example | Purpose |
|-----------|------|---------|---------|
| `world_slug` | string | `tideline-bay` | Links product to world for contextual commerce |
| `guide_name` | string | `Suki Tanaka-Reyes` | Links product to character |
| `learning_connection` | string | "After exploring coral reefs..." | Contextual copy for parent dashboard |
| `age_range` | string | `5-10` | Filter for age-appropriate recommendations |
| `included_activity` | string | "Build a model reef + species ID" | What the product teaches |

---

## 13. PARENT PORTAL COMMERCE UX

### Layout Within Parent Dashboard

Commerce is a TAB in the parent dashboard, not a separate site. It lives alongside Progress, Settings, and Reports.

```
┌─────────────────────────────────────────────────┐
│ worlds.koydo.com/parent                         │
│                                                 │
│ [Progress] [Reports] [Shop] [Settings]          │
│                                                 │
│ ┌─ SHOP TAB ──────────────────────────────────┐ │
│ │                                             │ │
│ │ ★ Recommended for [Child]                   │ │
│ │ Based on their love of Tideline Bay         │ │
│ │                                             │ │
│ │ [Hachi Plush]  [Reef Kit]  [Ocean Poster]   │ │
│ │  $24.99         $34.99      $18.99          │ │
│ │                                             │ │
│ │ ─────────────────────────────────────────── │ │
│ │                                             │ │
│ │ 🎁 Gift Subscriptions                       │ │
│ │ Perfect for grandparents & family           │ │
│ │                                             │ │
│ │ [3-Month]  [6-Month]  [Annual Family]       │ │
│ │  $24.99     $69.99     $149.99              │ │
│ │                                             │ │
│ │ ─────────────────────────────────────────── │ │
│ │                                             │ │
│ │ 📚 Collections                              │ │
│ │                                             │ │
│ │ [STEM Kits] [Character Plush] [Journals]    │ │
│ │ [Digital Downloads] [Apparel] [Seasonal]    │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Personalization Logic

The "Recommended for [Child]" section uses three signals:

1. **Most-visited world** (last 30 days) → show products linked to that world
2. **Most-interacted character** → show that character's plush/products
3. **Recently completed entry** → show the related educational kit

```typescript
async function getRecommendations(kindlerId: string): Promise<Product[]> {
  // Get top world by visit frequency (last 30 days)
  const { data: topWorld } = await supabase
    .from('kindler_progress')
    .select('world_slug, count(*)')
    .eq('kindler_id', kindlerId)
    .gte('created_at', thirtyDaysAgo)
    .group('world_slug')
    .order('count', { ascending: false })
    .limit(1)
    .single();
  
  // Get products linked to that world
  const { data: products } = await supabase
    .from('merchandise_catalog')
    .select('*')
    .eq('linked_world_slug', topWorld?.world_slug)
    .eq('in_stock', true)
    .order('featured', { ascending: false })
    .limit(3);
  
  return products ?? [];
}
```

### Checkout Flow

Checkout happens via Shopify Buy SDK embedded in the parent portal. The parent never leaves the dashboard.

```
[Add to Cart] → [Cart Drawer slides in from right] → 
[Checkout (Shopify Buy SDK)] → [Payment (Stripe via Shopify)] → 
[Confirmation in-dashboard] → [Order synced to Supabase]
```

---

## 14. FREEMIUM-TO-COMMERCE PATHWAYS

### The Freemium Funnel

```
FREE TIER (3 worlds, unlimited play)
    │
    ├─► Parent sees value in dashboard
    │       │
    │       ├─► SUBSCRIPTION UPGRADE (primary revenue)
    │       │       │
    │       │       └─► MERCHANDISE (LTV extension)
    │       │
    │       └─► MERCHANDISE ONLY (secondary path)
    │               │
    │               └─► "If you liked the kit, imagine 50 worlds"
    │                       │
    │                       └─► SUBSCRIPTION UPGRADE (delayed conversion)
    │
    └─► GIFT CARD (someone else pays)
            │
            └─► Redeemed → active subscriber → merchandise
```

### Path 1: Free → Subscription → Merch (Standard)

1. Child plays free tier. Loves it.
2. Parent upgrades to paid subscription.
3. After 30+ days of paid subscription, parent dashboard shows first contextual commerce suggestion.
4. Parent buys a related product (educational kit, plush, journal).
5. Physical product deepens engagement → lower churn.

**Timing rule:** No commerce suggestions for the first 30 days after subscription. Let the parent settle into the product before introducing commerce.

### Path 2: Free → Merch → Subscription (Inverted)

1. Child plays free tier. Loves Dottie and the Number Garden.
2. Parent isn't ready for subscription but buys the Fibonacci Nature Walk Kit ($19.99) as a lower-commitment purchase.
3. Child does the nature walk. Finds Fibonacci patterns in real flowers. Mind blown.
4. Kit includes a card: "Dottie has 49 more worlds of discovery waiting. Upgrade to Pathfinder and explore them all."
5. Parent upgrades.

**The physical product is the subscription's sales closer.** The child's real-world experience with the kit validates the digital experience and lowers the parent's resistance to the subscription.

### Path 3: Gift → Activation → Full Funnel

1. Grandparent buys a 6-month Pathfinder gift card for grandchild's birthday.
2. Parent activates. Child plays.
3. At month 5, parent sees renewal approaching. By now, they've seen the dashboard, the progress, the engagement.
4. Parent renews at full price — the gift converted a non-customer into a paying subscriber.
5. Commerce follows.

**Gift subscriptions are the highest-LTV acquisition channel** because the cost of acquisition is borne by someone else (the gift-giver) and the recipient converts at a higher rate than cold leads.

---

## 15. PRICING STRATEGY & MARGINS

### Cost Structure by Product Category

| Category | COGS per Unit | Shipping (avg) | Total Cost | Retail Price | Gross Margin |
|----------|-------------|----------------|-----------|-------------|-------------|
| Plush (Phase 1) | $6-8 | $4-6 | $10-14 | $25-35 | 57-64% |
| Plush (Phase 2, higher MOQ) | $4-6 | $4-6 | $8-12 | $25-35 | 63-71% |
| Kindler Journal (POD) | $8-12 | $3-5 | $11-17 | $25-40 | 56-64% |
| Kindler Journal (offset) | $4-6 | $3-5 | $7-11 | $25-40 | 69-78% |
| Educational Kit | $8-14 | $4-6 | $12-20 | $20-45 | 47-60% |
| Poster | $2-4 | $3-5 | $5-9 | $16-25 | 60-72% |
| Apparel (tee) | $6-9 | $3-5 | $9-14 | $23-29 | 50-61% |
| Apparel (hoodie) | $10-14 | $4-6 | $14-20 | $36 | 44-56% |
| Enamel pin | $1.50-2.50 | $2-3 | $3.50-5.50 | $13-30 | 73-82% |
| Digital download | $0 | $0 | $0 | $6-10 | ~100% |
| Gift card | $1.50 (physical) | $2 | $3.50 | Face value | ~100% |

### Free Shipping Threshold

**Free shipping on orders over $49.** This encourages cart-building:
- Plush ($28) + Kit ($20) = $48 → "Add $1 for free shipping" → adds enamel pin ($13) → $61 order
- Journal ($25) + Poster ($19) = $44 → "Add $5 for free shipping" → adds activity pack ($6) → $50 order

Average shipping cost absorbed: ~$5-7. Offset by the increased order value.

### Bundle Pricing

Bundles should feel like meaningful savings (15-25% off component prices) while maintaining >50% margin.

| Bundle | Components | Component Total | Bundle Price | Savings | Margin |
|--------|-----------|----------------|-------------|---------|--------|
| Kindler Starter | 6-mo sub + plush + journal | $125-135 | $79.99 | ~$50 | 52% |
| Explorer's Gift | 3-mo sub + kit + pin | $63-68 | $49.99 | ~$15 | 55% |
| Ultimate Collection | Annual fam + 2 plush + journal + digital | $265-280 | $199.99 | ~$70 | 50% |

---

## 16. FULFILLMENT & LOGISTICS

### Phase 1: Lean Operations

**Digital goods:** Instant delivery via email + Shopify download link. Zero fulfillment cost.

**Physical goods (US):** 
- Print-on-demand (journals, posters): Lulu Direct or Gooten. Ships in 5-7 business days.
- Plush & kits: Pre-stock at ShipBob or ShipStation 3PL. Ships in 2-4 business days.
- Enamel pins & small items: Self-fulfilled or Pirate Ship for discounted USPS rates.

**Physical goods (International):**
- Phase 1: US only. International customers can purchase digital goods.
- Phase 2 (Month 6+): Add Canada, UK, Australia via ShipBob international network.
- Phase 3 (Year 2): Full international via regional 3PL partners.

### Packaging Sustainability

- **All packaging recyclable or compostable.** No plastic clamshells. No styrofoam.
- **Boxes:** Kraft corrugated, custom-printed with Koydo Worlds art.
- **Void fill:** Recycled paper, not plastic air pillows.
- **Tape:** Paper tape with Koydo Worlds branding.
- **Include a note:** "This box is made from recycled materials. When you're done, it can be recycled again — or used as a drawing surface. Baxter would approve."

### Returns Policy

- **30-day no-questions-asked returns** on physical goods (unused condition).
- **Digital goods:** No refunds (instant delivery). Clearly communicated at purchase.
- **Gift cards:** Non-refundable but transferable.
- **Defective products:** Replace immediately, no return required. "Send us a photo, we'll send a new one."

---

## 17. METRICS & REVENUE PROJECTIONS

### Commerce KPIs

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Shop visitors/month | 2,000 | 8,000 | 30,000 |
| Conversion rate (shop) | 3% | 4% | 5% |
| Orders/month | 60 | 320 | 1,500 |
| Average order value | $38 | $42 | $45 |
| Commerce revenue/month | $2,280 | $13,440 | $67,500 |
| Commerce as % of total revenue | 6% | 8% | 9% |
| Gift card revenue/month | $1,000 | $5,000 | $20,000 |
| Parent portal commerce adoption | 5% of subscribers | 10% | 15% |

### Revenue by Channel

| Channel | Month 6 | Month 12 | Notes |
|---------|---------|----------|-------|
| Shopify storefront (public) | $6,000 | $30,000 | SEO + social + referral |
| Parent portal (embedded) | $4,500 | $25,000 | Contextual commerce |
| Gift cards | $2,500 | $10,000 | Seasonal peaks in Q4 |
| Convention/event sales | $440 | $2,500 | Physical booth presence |

### LTV Impact

A subscriber who also purchases merchandise has **30-40% higher LTV** than a subscription-only customer because:
1. Physical products create additional touchpoints (the plush on the shelf, the poster on the wall)
2. Each touchpoint reinforces the emotional connection to the subscription
3. Physical product purchasers churn at ~40% lower rates than subscription-only users
4. Gift card purchases bring in new subscribers at zero marketing cost

### Break-Even Analysis

| Item | Fixed Cost | Variable Cost/Unit | Break-Even (units) |
|------|-----------|-------------------|-------------------|
| Plush mold + first run | $8,000 | $8 | 320 units @ $25 retail |
| Journal design + POD setup | $2,000 | $12 | 77 units @ $25 retail |
| Kit design + first batch | $3,000 | $12 | 120 units @ $25 retail |
| Poster design + print run | $500 | $3 | 33 units @ $15 retail |
| Enamel pin die + run | $1,200 | $2 | 109 units @ $13 retail |

All products break even within 3-6 months at projected volumes. Digital goods are profitable from unit 1.

---

*Every product teaches. Every purchase deepens the connection. Every dollar
spent in the Koydo Worlds economy makes the child's learning world richer —
digitally and physically.*

*The worlds are fading. But the merchandise store is fully stocked.*

*— Koydo Worlds Commerce Bible • March 2026 • Confidential*
