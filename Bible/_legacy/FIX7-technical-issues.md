# FIX 7: TECHNICAL ISSUE RESOLUTION — BUILD-SPEC & SCHEMA

> Addresses the three open items from the code/bible review:
> Issue A: Luminance unit mismatch (engine float vs. DB integer)
> Issue B: Two-repo architecture vs. current build
> Issue C: CCSS ELA standards not in RealWorldEntry schema
> Each issue gets a decision, rationale, and implementation spec.

---

## ISSUE A: LUMINANCE UNIT MISMATCH — RESOLVED

### Problem

The engine (`engine.ts`) works with luminance as a float in the range `0.0–1.0`. The database schema (`world_luminance` table in BUILD-SPEC v5) stores luminance as `integer CHECK (luminance BETWEEN 0 AND 100)`. No conversion layer exists. Writing engine state to Supabase would store `0.07` where the DB expects `7`, causing silent data corruption or CHECK constraint violations.

### Decision

**Add a `LuminanceAdapter` utility in the persistence layer.** The engine's internal 0.0–1.0 representation is correct for rendering (GPU shaders, material parameters, and lerp functions all expect normalized floats). The DB's 0–100 integer representation is correct for human readability, dashboard display, and avoiding floating-point comparison bugs in SQL. Both are right for their context. The adapter bridges them.

### Implementation

**File:** `src/persistence/luminance-adapter.ts`

```typescript
/**
 * LuminanceAdapter — converts between engine float (0.0–1.0) 
 * and database integer (0–100) representations.
 * 
 * Engine uses normalized float for:
 *   - Material parameter drives (UE5 scalar params)
 *   - Lerp/blend operations
 *   - Audio crossfade weights
 * 
 * Database uses integer 0–100 for:
 *   - Human-readable dashboard values
 *   - SQL range checks without float comparison issues
 *   - Parent-facing percentage display
 *   - Fading state thresholds (0/25/50/75/100)
 */

/** Engine float (0.0–1.0) → DB integer (0–100) */
export function luminanceToDb(engineValue: number): number {
  const clamped = Math.max(0, Math.min(1, engineValue));
  return Math.round(clamped * 100);
}

/** DB integer (0–100) → Engine float (0.0–1.0) */
export function luminanceFromDb(dbValue: number): number {
  const clamped = Math.max(0, Math.min(100, dbValue));
  return clamped / 100;
}

/**
 * Determine the Fading tier from a DB-scale luminance value.
 * Used for selecting asset variants, audio layers, and 
 * character behavior states.
 * 
 * Returns: 0 | 25 | 50 | 75 | 100
 * Thresholds: [0–12] → 0, [13–37] → 25, [38–62] → 50,
 *             [63–87] → 75, [88–100] → 100
 */
export function luminanceToFadingTier(
  dbValue: number
): 0 | 25 | 50 | 75 | 100 {
  if (dbValue <= 12) return 0;
  if (dbValue <= 37) return 25;
  if (dbValue <= 62) return 50;
  if (dbValue <= 87) return 75;
  return 100;
}
```

**Usage in persistence layer:**

```typescript
// WRITE: engine → DB
async function persistWorldLuminance(
  worldSlug: string,
  engineLuminance: number
): Promise<void> {
  const dbValue = luminanceToDb(engineLuminance);
  await supabase
    .from('world_luminance')
    .update({ luminance: dbValue, updated_at: new Date().toISOString() })
    .eq('world_slug', worldSlug);
}

// READ: DB → engine
async function loadWorldLuminance(
  worldSlug: string
): Promise<number> {
  const { data } = await supabase
    .from('world_luminance')
    .select('luminance')
    .eq('world_slug', worldSlug)
    .single();
  return luminanceFromDb(data?.luminance ?? 0);
}
```

**Test coverage required:**

```typescript
describe('LuminanceAdapter', () => {
  it('converts 0.0 to 0', () => {
    expect(luminanceToDb(0.0)).toBe(0);
  });
  it('converts 1.0 to 100', () => {
    expect(luminanceToDb(1.0)).toBe(100);
  });
  it('converts 0.07 to 7', () => {
    expect(luminanceToDb(0.07)).toBe(7);
  });
  it('clamps negative to 0', () => {
    expect(luminanceToDb(-0.1)).toBe(0);
  });
  it('clamps over-1 to 100', () => {
    expect(luminanceToDb(1.5)).toBe(100);
  });
  it('round-trips without drift', () => {
    for (let i = 0; i <= 100; i++) {
      expect(luminanceToDb(luminanceFromDb(i))).toBe(i);
    }
  });
  it('maps fading tiers correctly', () => {
    expect(luminanceToFadingTier(0)).toBe(0);
    expect(luminanceToFadingTier(12)).toBe(0);
    expect(luminanceToFadingTier(13)).toBe(25);
    expect(luminanceToFadingTier(50)).toBe(50);
    expect(luminanceToFadingTier(75)).toBe(75);
    expect(luminanceToFadingTier(100)).toBe(100);
  });
});
```

### PR Checklist Addition

Add to the BUILD-SPEC v5 PR checklist:

> **Luminance persistence:** Does this code read or write luminance? If yes, it MUST use `luminanceToDb()` / `luminanceFromDb()`. Direct numeric writes to the `world_luminance` table without the adapter are **REJECTED**.

---

## ISSUE B: TWO-REPO ARCHITECTURE — RESOLVED

### Problem

BUILD-SPEC v5 and all Bible documents reference `loom-worlds` as a fork of `loom`. The current development has been adding educational game code under a `universe/` directory directly in the `loom` engine repo. This is either an intentional decision (embed product in engine) or prototyping leakage (code in wrong repo before migration).

### Decision

**The `universe/` directory in `loom` is a PROTOTYPE scaffold. It migrates to `loom-worlds` before beta.**

### Rationale

1. **Engine contamination.** Product-specific code (characters, curriculum, COPPA compliance, Kindler progression) in the engine repo means The Concord inherits children's educational content in its dependency tree. This violates the fork separation documented since Bible v1.

2. **Build pipeline.** The engine should compile without any Koydo Worlds assets. If `universe/` is in `loom`, the engine CI must either exclude it (fragile) or build it (couples the products).

3. **Contributor confusion.** Future engine contributors (especially Concord team) will encounter educational content code and be unsure of its status, ownership, and modification rules.

4. **The architecture documents are correct.** Four bible versions and the build spec all describe the fork model. Changing to a monorepo approach would require rewriting every architecture document. The documents are right; the current code layout is temporary.

### Migration Plan

```
PHASE 1 (Pre-Beta): Create loom-worlds repo
─────────────────────────────────────────────
gh repo create [org]/loom-worlds --private
cd loom-worlds
git remote add upstream git@github.com:[org]/loom.git
git fetch upstream
git checkout -b main upstream/main

PHASE 2: Move universe/ directory
─────────────────────────────────
# In loom-worlds:
# The universe/ directory becomes the product root
# Engine code is inherited from upstream (loom)
# Product code lives here

PHASE 3: Clean loom repo
─────────────────────────
# In loom:
git rm -r universe/
# Add .gitignore entry: universe/
# Update CI to ensure engine compiles without universe/

PHASE 4: Set up upstream sync
─────────────────────────────
# In loom-worlds:
# Configure GitHub Actions to pull engine updates weekly
# PR template includes upstream-merge flag
```

### Interim Rules (Until Migration)

While `universe/` remains in `loom`:

1. **All `universe/` code is tagged** with `// PRODUCT: loom-worlds — migrate before beta` in the file header.
2. **No engine code imports from `universe/`.** The dependency arrow is one-way: `universe → engine`, never `engine → universe`.
3. **Engine PRs do not touch `universe/`.** Product PRs do not touch engine root.
4. **The migration is a Sprint 4 task** (Weeks 8-10, before Beta in Sprint 5).

### Build Spec v5 Amendment

Add to Sprint 4 tasks:

```
### 4.X Repository Migration
- [ ] Create loom-worlds repo (fork of loom)
- [ ] Move universe/ directory to loom-worlds product root
- [ ] Verify engine (loom) compiles without universe/
- [ ] Verify loom-worlds compiles with engine as upstream
- [ ] Update all CI/CD pipelines
- [ ] Update deployment targets (Vercel, app stores)
- [ ] Remove universe/ from loom repo
- [ ] Update CONTRIBUTING.md in both repos
```

---

## ISSUE C: CCSS ELA STANDARDS NOT IN SCHEMA — RESOLVED

### Problem

The `real_world_entries` table carries informal `subject_tags` (e.g., `["reading", "inference"]`) but no structured standards codes. FIX3 added CCSS ELA alignment to the curriculum map document, but the actual standard codes (e.g., `CCSS.ELA-LITERACY.RL.3.1`) are not persisted in the database. The parent dashboard and school-facing product need to report standards mastery, which requires queryable, normalized standards data.

### Decision

**Add a dedicated `entry_standards_alignment` junction table with a standards enum registry.** Do NOT overload `subject_tags` — tags are for discovery/search, standards are for compliance/reporting. They serve different purposes.

### Schema

```sql
-- Standards registry: canonical list of all supported standards
CREATE TABLE curriculum_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework text NOT NULL CHECK (framework IN (
    'CCSS_MATH', 'CCSS_ELA', 'NGSS', 'JUMPSTART', 
    'UK_NC', 'AUS_CURRICULUM'  -- future international
  )),
  code text NOT NULL UNIQUE,         -- 'CCSS.MATH.4.OA.C.5'
  short_code text NOT NULL,          -- '4.OA.C.5'
  description text NOT NULL,         -- 'Generate number patterns'
  grade_band text NOT NULL,          -- 'K', '1', '2', '3-5', '6-8'
  domain text,                       -- 'Operations & Algebraic Thinking'
  strand text,                       -- 'C. Generate and analyze patterns'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_standards_framework ON curriculum_standards(framework);
CREATE INDEX idx_standards_grade ON curriculum_standards(grade_band);

-- Junction: entries ↔ standards (M2M)
CREATE TABLE entry_standards_alignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  standard_id uuid NOT NULL REFERENCES curriculum_standards(id) ON DELETE CASCADE,
  alignment_strength text NOT NULL DEFAULT 'primary' 
    CHECK (alignment_strength IN ('primary', 'secondary', 'tangential')),
  -- primary: the entry directly teaches this standard
  -- secondary: the entry supports this standard as context
  -- tangential: the entry connects to this standard loosely
  notes text,  -- editorial note on how the entry maps
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_entry_standard_unique 
  ON entry_standards_alignment(entry_id, standard_id);
CREATE INDEX idx_alignment_entry ON entry_standards_alignment(entry_id);
CREATE INDEX idx_alignment_standard ON entry_standards_alignment(standard_id);
```

### Seed Data (Sample Standards)

```sql
INSERT INTO curriculum_standards (framework, code, short_code, description, grade_band, domain, strand) VALUES
-- CCSS Math
('CCSS_MATH', 'CCSS.MATH.K.CC.A.1', 'K.CC.A.1', 'Count to 100 by ones and tens', 'K', 'Counting & Cardinality', 'A. Know number names and count sequence'),
('CCSS_MATH', 'CCSS.MATH.1.OA.A.1', '1.OA.A.1', 'Add and subtract within 20', '1', 'Operations & Algebraic Thinking', 'A. Represent and solve problems'),
('CCSS_MATH', 'CCSS.MATH.3.NF.A.1', '3.NF.A.1', 'Understand fractions as parts of a whole', '3', 'Number & Operations—Fractions', 'A. Develop understanding of fractions'),
('CCSS_MATH', 'CCSS.MATH.4.OA.C.5', '4.OA.C.5', 'Generate a number or shape pattern that follows a given rule', '4', 'Operations & Algebraic Thinking', 'C. Generate and analyze patterns'),
-- CCSS ELA
('CCSS_ELA', 'CCSS.ELA-LITERACY.RL.K.1', 'RL.K.1', 'Ask and answer questions about key details in text', 'K', 'Reading: Literature', 'Key Ideas and Details'),
('CCSS_ELA', 'CCSS.ELA-LITERACY.RL.2.2', 'RL.2.2', 'Recount stories, determine central message or lesson', '2', 'Reading: Literature', 'Key Ideas and Details'),
('CCSS_ELA', 'CCSS.ELA-LITERACY.RI.3.1', 'RI.3.1', 'Ask and answer questions referring explicitly to text as basis', '3', 'Reading: Informational Text', 'Key Ideas and Details'),
('CCSS_ELA', 'CCSS.ELA-LITERACY.W.3.5', 'W.3.5', 'Develop and strengthen writing through planning, revising, editing', '3', 'Writing', 'Production and Distribution'),
('CCSS_ELA', 'CCSS.ELA-LITERACY.L.4.4', 'L.4.4', 'Determine meaning of unknown words using Greek/Latin affixes and roots', '4', 'Language', 'Vocabulary Acquisition and Use'),
('CCSS_ELA', 'CCSS.ELA-LITERACY.SL.2.1', 'SL.2.1', 'Participate in collaborative conversations, build on others talk', '2', 'Speaking & Listening', 'Comprehension and Collaboration'),
-- NGSS
('NGSS', 'NGSS.K-PS2-1', 'K-PS2-1', 'Plan and conduct an investigation of effects of different forces', 'K', 'Physical Sciences', 'Motion and Stability'),
('NGSS', 'NGSS.K-ESS2-1', 'K-ESS2-1', 'Use and share observations of local weather conditions', 'K', 'Earth and Space Sciences', 'Earth Systems'),
('NGSS', 'NGSS.2-ESS1-1', '2-ESS1-1', 'Use information from observations of sun, moon, and stars', '2', 'Earth and Space Sciences', 'Earth Place in Universe'),
('NGSS', 'NGSS.4-PS3-2', '4-PS3-2', 'Make observations to provide evidence of energy transfer', '4', 'Physical Sciences', 'Energy'),
('NGSS', 'NGSS.5-ESS1-1', '5-ESS1-1', 'Support argument about star brightness vs distance', '5', 'Earth and Space Sciences', 'Earth Place in Universe'),
-- Jump$tart Financial Literacy
('JUMPSTART', 'JS.EARNING.1', 'EARNING.1', 'Understand that people earn income by working', 'K-2', 'Earning Income', null),
('JUMPSTART', 'JS.SPENDING.1', 'SPENDING.1', 'Identify the difference between needs and wants', 'K-2', 'Spending', null),
('JUMPSTART', 'JS.SAVING.1', 'SAVING.1', 'Understand that saving means not spending now to spend later', 'K-2', 'Saving', null),
('JUMPSTART', 'JS.INVESTING.1', 'INVESTING.1', 'Understand that investing means putting money to use to earn more money', '3-5', 'Investing', null),
('JUMPSTART', 'JS.CREDIT.1', 'CREDIT.1', 'Understand that borrowing means using something with a promise to return it', '3-5', 'Managing Credit', null);
```

### Sample Alignment Insert

```sql
-- Link "Fibonacci and the Rabbit Problem" to CCSS.MATH.4.OA.C.5
INSERT INTO entry_standards_alignment (entry_id, standard_id, alignment_strength, notes)
SELECT 
  e.id,
  s.id,
  'primary',
  'Dottie walks children through the Fibonacci sequence as a number pattern generated by a rule (add previous two). Direct mapping to pattern generation standard.'
FROM real_world_entries e, curriculum_standards s
WHERE e.title = 'Fibonacci and the Rabbit Problem'
  AND s.code = 'CCSS.MATH.4.OA.C.5';
```

### Parent Dashboard Query

```sql
-- "What standards did my child cover this week?"
SELECT 
  cs.framework,
  cs.short_code,
  cs.description,
  cs.domain,
  esa.alignment_strength,
  rwe.title as entry_title,
  kp.completed_at
FROM kindler_progress kp
JOIN real_world_entries rwe ON kp.entry_id = rwe.id
JOIN entry_standards_alignment esa ON rwe.id = esa.entry_id
JOIN curriculum_standards cs ON esa.standard_id = cs.id
WHERE kp.kindler_id = '{kindler_uuid}'
  AND kp.completed_at >= now() - interval '7 days'
  AND kp.status = 'completed'
ORDER BY cs.framework, cs.grade_band, cs.short_code;
```

### Migration Timing

This schema is **not required for MVP** (Sprint 1-3). The `subject_tags` array handles informal discovery for now. The standards schema should be created and populated during **Sprint 4** (world expansion), before the parent dashboard goes into polish mode in Sprint 5. The school-facing product (post-launch) requires it for district conversations.

### Updated RealWorldEntry JSON (FIX6 Amendment)

The JSON seed in FIX6 does NOT change. Standards alignment lives in the junction table, not in the entry record itself. The entry's `subject_tags` remain informal. After entries are seeded, a separate seed script populates `entry_standards_alignment` from the curriculum map in FIX3/Appendix F.

---

## ADDITIONAL: SUPABASE SCHEMA CHANGELOG

```sql
-- Migration: 003_standards_alignment.sql
-- Run AFTER 001_foundation.sql and 002_real_world_entries.sql

-- Standards registry
CREATE TABLE curriculum_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework text NOT NULL CHECK (framework IN (
    'CCSS_MATH', 'CCSS_ELA', 'NGSS', 'JUMPSTART',
    'UK_NC', 'AUS_CURRICULUM'
  )),
  code text NOT NULL UNIQUE,
  short_code text NOT NULL,
  description text NOT NULL,
  grade_band text NOT NULL,
  domain text,
  strand text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_standards_framework ON curriculum_standards(framework);
CREATE INDEX idx_standards_grade ON curriculum_standards(grade_band);

-- Entry ↔ Standard junction
CREATE TABLE entry_standards_alignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  standard_id uuid NOT NULL REFERENCES curriculum_standards(id) ON DELETE CASCADE,
  alignment_strength text NOT NULL DEFAULT 'primary'
    CHECK (alignment_strength IN ('primary', 'secondary', 'tangential')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_entry_standard_unique 
  ON entry_standards_alignment(entry_id, standard_id);
CREATE INDEX idx_alignment_entry ON entry_standards_alignment(entry_id);
CREATE INDEX idx_alignment_standard ON entry_standards_alignment(standard_id);

-- Commerce tables (see FIX8 Commerce Bible)
-- Added here for migration ordering

CREATE TABLE merchandise_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'plush', 'book', 'journal', 'apparel', 'toy', 
    'poster', 'bundle', 'digital', 'gift_card'
  )),
  linked_world_slug text,
  linked_guide_name text,
  price_usd numeric(8,2) NOT NULL,
  cost_usd numeric(8,2),
  weight_oz numeric(6,1),
  image_urls text[] NOT NULL DEFAULT '{}',
  shopify_product_id text,
  in_stock boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  age_range text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE merchandise_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id uuid NOT NULL REFERENCES parent_accounts(id),
  shopify_order_id text,
  total_usd numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),
  items jsonb NOT NULL, -- [{sku, qty, price}]
  shipping_address jsonb,
  tracking_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_merch_orders_parent ON merchandise_orders(parent_account_id);
CREATE INDEX idx_merch_catalog_world ON merchandise_catalog(linked_world_slug);
```

---

*FIX 7 complete. Three technical issues resolved with implementation specs.*
*All code patterns include test requirements.*
*Migration SQL ready for sequential execution.*
