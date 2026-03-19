# KOYDO WORLDS — Build Spec v5

> **This is not a design document. This is a construction manual.**
> v4 (CLAUDE.md) tells agents WHAT Koydo Worlds is.
> v5 tells agents HOW to build it, in what order, with what commands.
> A coding agent reads v4 for context and v5 for tasks.

> **Repo:** `loom-worlds` (forked from `loom`)
> **Engine:** UE5.6+ (C++ / Blueprints hybrid)
> **Backend:** Supabase (separate project from Koydo EdTech)
> **Parent Dashboard:** React/Next.js at worlds.koydo.com/parent
> **CI/CD:** GitHub Actions → UE build pipeline + Vercel (dashboard only)

---

## SPRINT 0 — FOUNDATION (Week 1)

### 0.1 Repository Setup

```bash
# Create the Loom engine repo (if not already existing)
gh repo create [org]/loom --private --description "The Loom — hyper-realistic game engine"

# Fork it for Koydo Worlds
gh repo fork [org]/loom --org [org] --fork-name loom-worlds

# Clone locally
git clone git@github.com:[org]/loom-worlds.git
cd loom-worlds
```

**Git LFS setup (mandatory for UE5):**
```bash
git lfs install
```

Create `.gitattributes`:
```
# UE5 binary assets
*.uasset filter=lfs diff=lfs merge=lfs -text
*.umap filter=lfs diff=lfs merge=lfs -text
*.uexp filter=lfs diff=lfs merge=lfs -text

# Media
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.mp4 filter=lfs diff=lfs merge=lfs -text

# 3D
*.fbx filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.gltf filter=lfs diff=lfs merge=lfs -text
*.glb filter=lfs diff=lfs merge=lfs -text

# Builds
*.exe filter=lfs diff=lfs merge=lfs -text
*.dll filter=lfs diff=lfs merge=lfs -text
*.so filter=lfs diff=lfs merge=lfs -text
*.dylib filter=lfs diff=lfs merge=lfs -text
*.ipa filter=lfs diff=lfs merge=lfs -text
*.apk filter=lfs diff=lfs merge=lfs -text
```

Create `.gitignore` (UE5 standard):
```
# UE5 generated
Binaries/
DerivedDataCache/
Intermediate/
Saved/
Build/

# IDE
.vs/
.idea/
*.sln
*.suo

# OS
.DS_Store
Thumbs.db

# Local config
*.local
.env
.env.*
```

**Enable One File Per Actor** in UE5 Project Settings → Editor → Use One File Per Actor = true.

### 0.2 UE5 Project Creation

1. Open Epic Games Launcher → Unreal Engine 5.6+
2. New Project → Games → Third Person (touch-friendly base)
3. **Project Settings:**
   - Target Hardware: **Mobile**
   - Quality Preset: **Scalable**
   - Blueprint & C++ hybrid
   - Starter Content: OFF
   - Raytracing: OFF (enable per-tier later)
4. Project Name: `KoydoWorlds`
5. Save to `loom-worlds/KoydoWorlds/`

**Critical project settings to change immediately:**

```
[Project Settings → Platforms → iOS]
  - Minimum iOS Version: 16.0
  - Enable Metal: true

[Project Settings → Platforms → Android]
  - Minimum SDK Version: 28 (Android 9)
  - Target SDK Version: 34
  - Enable Vulkan: true

[Project Settings → Engine → Rendering]
  - Mobile HDR: true
  - Mobile MSAA: 4x (Medium+), Off (Low)

[Project Settings → Engine → General Settings]
  - Use One File Per Actor: true
  - Enable World Partition: true (for streaming)
```

### 0.3 Supabase Project

1. Create new Supabase project: **koydo-worlds** (NOT in the existing Koydo org project)
2. Region: same as Koydo (us-east-1 if US users, or closest)
3. Database password: generate and store in 1Password/Vault
4. Note the project ID — used for all migrations below

**Initial schema migration:**
```sql
-- Sprint 0: Foundation tables

-- Kindler (player) profiles
CREATE TABLE kindler_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id uuid NOT NULL, -- links to parent auth
  display_name text NOT NULL,
  age_tier smallint NOT NULL CHECK (age_tier BETWEEN 1 AND 3), -- 1=5-6, 2=7-8, 3=9-10
  birth_year integer, -- for age calculations
  avatar_url text,
  spark_level integer NOT NULL DEFAULT 0,
  total_lessons_completed integer NOT NULL DEFAULT 0,
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- World state (The Fading)
CREATE TABLE world_luminance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_slug text NOT NULL UNIQUE, -- 'number-garden', 'story-tree', etc.
  world_name text NOT NULL,
  realm text NOT NULL CHECK (realm IN ('discovery', 'expression', 'exchange', 'crossroads')),
  luminance integer NOT NULL DEFAULT 0 CHECK (luminance BETWEEN 0 AND 100),
  guide_name text NOT NULL,
  guide_subject text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Progress tracking
CREATE TABLE kindler_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kindler_id uuid NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL, -- references real_world_entries
  world_slug text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score jsonb, -- flexible scoring per adventure type
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_kindler_progress_unique 
  ON kindler_progress(kindler_id, entry_id);

-- Spark history
CREATE TABLE kindler_spark_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kindler_id uuid NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL, -- positive or negative
  reason text NOT NULL, -- 'lesson_completed', 'world_restored', 'daily_decay', etc.
  world_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spark_log_kindler ON kindler_spark_log(kindler_id, created_at DESC);

-- Real world entries (content)
CREATE TABLE real_world_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'event', 'invention', 'discovery', 'person', 'place',
    'quote', 'artifact', 'expedition', 'natural_wonder',
    'cultural_milestone', 'scientific_principle'
  )),
  title text NOT NULL,
  year integer, -- negative for BCE
  year_display text,
  era text CHECK (era IN (
    'ancient', 'classical', 'medieval', 'renaissance',
    'enlightenment', 'industrial', 'modern', 'contemporary'
  )),
  description_child text NOT NULL, -- ages 5-7
  description_older text NOT NULL, -- ages 8-10
  description_parent text, -- parent dashboard
  real_people text[], -- historical figures
  quote text,
  quote_attribution text,
  geographic_lat numeric(10,7),
  geographic_lng numeric(10,7),
  geographic_name text,
  continent text,
  subject_tags text[] NOT NULL DEFAULT '{}',
  world_slug text NOT NULL, -- FK to world_luminance
  guide_name text NOT NULL,
  adventure_type text NOT NULL CHECK (adventure_type IN (
    'remembrance_wall', 'guided_expedition', 'artifact_hunt',
    'reenactment', 'field_trip', 'time_window', 'natural_exploration'
  )),
  difficulty_tier smallint NOT NULL DEFAULT 1 CHECK (difficulty_tier BETWEEN 1 AND 3),
  prerequisites uuid[] DEFAULT '{}',
  unlocks uuid[] DEFAULT '{}',
  fun_fact text NOT NULL,
  image_prompt text, -- for fal.ai generation
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_world ON real_world_entries(world_slug, status);
CREATE INDEX idx_entries_tier ON real_world_entries(difficulty_tier, status);

-- AI conversation sessions (ephemeral, COPPA-safe)
CREATE TABLE ai_conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kindler_id uuid NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  world_slug text NOT NULL,
  guide_name text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]', -- conversation history
  emotion_tags text[] DEFAULT '{}', -- for ACE animation
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  -- COPPA: auto-delete after 24 hours
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_sessions_expires ON ai_conversation_sessions(expires_at);

-- Session reports for parent dashboard
CREATE TABLE session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kindler_id uuid NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds integer NOT NULL DEFAULT 0,
  worlds_visited text[] DEFAULT '{}',
  entries_completed uuid[] DEFAULT '{}',
  spark_delta integer NOT NULL DEFAULT 0,
  summary_text text, -- AI-generated 2-3 sentence summary
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_kindler ON session_reports(kindler_id, session_date DESC);

-- Parent accounts
CREATE TABLE parent_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, -- references auth.users
  email text NOT NULL,
  display_name text,
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (
    subscription_tier IN ('free', 'explorer', 'kindler', 'family')
  ),
  subscription_status text NOT NULL DEFAULT 'active',
  max_daily_minutes integer NOT NULL DEFAULT 30,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Curriculum mapping
CREATE TABLE entry_curriculum_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  standard_code text NOT NULL, -- 'CCSS.MATH.CONTENT.3.OA.D.8' or 'NGSS.3-PS2-1'
  standard_framework text NOT NULL CHECK (standard_framework IN (
    'common_core_math', 'common_core_ela', 'ngss', 'state_financial_literacy'
  )),
  standard_description text NOT NULL,
  grade_band text, -- 'K-2', '3-5'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_curriculum_entry ON entry_curriculum_maps(entry_id);
CREATE INDEX idx_curriculum_standard ON entry_curriculum_maps(standard_code);

-- Enable RLS on all tables
ALTER TABLE kindler_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_luminance ENABLE ROW LEVEL SECURITY;
ALTER TABLE kindler_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE kindler_spark_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_world_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_curriculum_maps ENABLE ROW LEVEL SECURITY;

-- Public read for world state and published entries
CREATE POLICY world_luminance_read ON world_luminance FOR SELECT USING (true);
CREATE POLICY entries_read ON real_world_entries FOR SELECT USING (status = 'published');
CREATE POLICY curriculum_read ON entry_curriculum_maps FOR SELECT USING (true);
```

### 0.4 Seed the 50 Worlds

```sql
-- Seed all 50 worlds with initial luminance = 0 (fully Faded)
INSERT INTO world_luminance (world_slug, world_name, realm, luminance, guide_name, guide_subject) VALUES
  -- STEM
  ('cloud-kingdom', 'Cloud Kingdom', 'discovery', 0, 'Professor Nimbus', 'Earth Science / Weather'),
  ('savanna-workshop', 'Savanna Workshop', 'discovery', 0, 'Zara Ngozi', 'Engineering / Simple Machines'),
  ('tideline-bay', 'Tideline Bay', 'discovery', 0, 'Suki Tanaka-Reyes', 'Ocean Science / Biology'),
  ('meadow-lab', 'The Meadow Lab', 'discovery', 0, 'Baxter', 'Plant Biology / Ecology'),
  ('starfall-observatory', 'Starfall Observatory', 'discovery', 0, 'Riku Osei', 'Space Science / Astronomy'),
  ('number-garden', 'The Number Garden', 'discovery', 0, 'Dottie Chakravarti', 'Mathematics / Patterns'),
  ('calculation-caves', 'The Calculation Caves', 'discovery', 0, 'Cal', 'Arithmetic / Mental Math'),
  ('magnet-hills', 'The Magnet Hills', 'discovery', 0, 'Lena Sundstrom', 'Physics / Forces & Motion'),
  ('circuit-marsh', 'The Circuit Marsh', 'discovery', 0, 'Kofi Amponsah', 'Electricity / Circuits'),
  ('code-canyon', 'Code Canyon', 'discovery', 0, 'Pixel', 'Coding / Logic'),
  ('body-atlas', 'The Body Atlas', 'discovery', 0, 'Dr. Emeka Obi', 'Human Body / Health'),
  ('frost-peaks', 'The Frost Peaks', 'discovery', 0, 'Mira Petrov', 'Geology / Rocks & Minerals'),
  ('greenhouse-spiral', 'The Greenhouse Spiral', 'discovery', 0, 'Hugo Fontaine', 'Chemistry / Mixtures'),
  ('data-stream', 'The Data Stream', 'discovery', 0, 'Yuki', 'Data Science / Sorting & Graphing'),
  ('map-room', 'The Map Room', 'discovery', 0, 'Atlas', 'Geography / Maps & Navigation'),
  -- Language Arts
  ('story-tree', 'The Story Tree', 'expression', 0, 'Grandmother Anaya', 'Storytelling / Narrative'),
  ('rhyme-docks', 'The Rhyme Docks', 'expression', 0, 'Felix Barbosa', 'Poetry / Rhyme & Rhythm'),
  ('letter-forge', 'The Letter Forge', 'expression', 0, 'Amara Diallo', 'Phonics / Letter Recognition'),
  ('reading-reef', 'The Reading Reef', 'expression', 0, 'Oliver Marsh', 'Reading Comprehension'),
  ('grammar-bridge', 'The Grammar Bridge', 'expression', 0, 'Lila Johansson-Park', 'Grammar / Sentence Structure'),
  ('vocabulary-jungle', 'The Vocabulary Jungle', 'expression', 0, 'Kwame Asante', 'Vocabulary / Word Roots'),
  ('punctuation-station', 'The Punctuation Station', 'expression', 0, 'Rosie Chen', 'Punctuation / Writing Mechanics'),
  ('debate-arena', 'The Debate Arena', 'expression', 0, 'Theo Papadopoulos', 'Persuasive Writing'),
  ('diary-lighthouse', 'The Diary Lighthouse', 'expression', 0, 'Nadia Volkov', 'Creative Writing'),
  ('spelling-mines', 'The Spelling Mines', 'expression', 0, 'Benny Okafor-Williams', 'Spelling / Word Patterns'),
  ('translation-garden', 'The Translation Garden', 'expression', 0, 'Farah al-Rashid', 'Multilingual Awareness'),
  ('nonfiction-fleet', 'The Nonfiction Fleet', 'expression', 0, 'Captain Birch', 'Research Skills'),
  ('illustration-cove', 'The Illustration Cove', 'expression', 0, 'Ines Moreau', 'Visual Literacy'),
  ('folklore-bazaar', 'The Folklore Bazaar', 'expression', 0, 'Hassan Yilmaz', 'Folklore / Cultural Stories'),
  ('editing-tower', 'The Editing Tower', 'expression', 0, 'Wren Calloway', 'Editing / Revision'),
  -- Financial Literacy
  ('market-square', 'The Market Square', 'exchange', 0, 'Tía Carmen Herrera', 'Money Basics / Trade'),
  ('savings-vault', 'The Savings Vault', 'exchange', 0, 'Mr. Abernathy', 'Saving / Compound Interest'),
  ('budget-kitchen', 'The Budget Kitchen', 'exchange', 0, 'Priya Nair', 'Budgeting / Resource Allocation'),
  ('entrepreneur-workshop', 'The Entrepreneur''s Workshop', 'exchange', 0, 'Diego Montoya-Silva', 'Entrepreneurship'),
  ('sharing-meadow', 'The Sharing Meadow', 'exchange', 0, 'Auntie Bee', 'Giving / Community Economics'),
  ('investment-greenhouse', 'The Investment Greenhouse', 'exchange', 0, 'Jin-ho Park', 'Investing / Risk & Reward'),
  ('needs-wants-bridge', 'The Needs & Wants Bridge', 'exchange', 0, 'Nia Oduya', 'Smart Spending'),
  ('barter-docks', 'The Barter Docks', 'exchange', 0, 'Tomás Reyes', 'History of Money'),
  ('debt-glacier', 'The Debt Glacier', 'exchange', 0, 'Elsa Lindgren', 'Borrowing / Debt'),
  ('job-fair', 'The Job Fair', 'exchange', 0, 'Babatunde Afolabi', 'Earning / Careers'),
  ('charity-harbor', 'The Charity Harbor', 'exchange', 0, 'Mei-Lin Wu', 'Charitable Giving'),
  ('tax-office', 'The Tax Office', 'exchange', 0, 'Sam Worthington', 'Taxes / Public Services'),
  -- Crossroads
  ('great-archive', 'The Great Archive', 'crossroads', 50, 'The Librarian', 'Research & Inquiry'),
  ('workshop-crossroads', 'The Workshop Crossroads', 'crossroads', 50, 'Kenzo Nakamura-Osei', 'Design Thinking'),
  ('discovery-trail', 'The Discovery Trail', 'crossroads', 50, 'Solana Bright', 'Scientific Method'),
  ('thinking-grove', 'The Thinking Grove', 'crossroads', 50, 'Old Rowan', 'Ethics / Critical Thinking'),
  ('wellness-garden', 'The Wellness Garden', 'crossroads', 50, 'Hana Bergstrom', 'Social-Emotional Learning'),
  ('time-gallery', 'The Time Gallery', 'crossroads', 50, 'Rami al-Farsi', 'Historical Thinking'),
  ('music-meadow', 'The Music Meadow', 'crossroads', 50, 'Luna Esperanza', 'Music & Math Patterns'),
  ('everywhere', 'Everywhere', 'crossroads', 100, 'Compass', 'Navigation / Tutorial');
```

### 0.5 Folder Structure in UE5 Project

```
KoydoWorlds/
├── Content/
│   ├── KoydoWorlds/
│   │   ├── Core/                    ← Engine-level (candidates for upstream)
│   │   │   ├── SilfenWeave/         ← World transition system
│   │   │   ├── FabricLoader/        ← Plugin architecture
│   │   │   ├── StateSync/           ← World state management
│   │   │   └── AIConversation/      ← LLM + ACE framework
│   │   ├── Worlds/                  ← One folder per world (Fabric plugins)
│   │   │   ├── NumberGarden/
│   │   │   │   ├── Maps/
│   │   │   │   ├── Materials/
│   │   │   │   ├── Meshes/
│   │   │   │   ├── Textures/
│   │   │   │   ├── Blueprints/
│   │   │   │   ├── Audio/
│   │   │   │   └── FX/
│   │   │   ├── StoryTree/
│   │   │   ├── MarketSquare/
│   │   │   └── GreatArchive/        ← Hub/onboarding world
│   │   ├── Characters/
│   │   │   ├── MetaHumans/          ← MetaHuman assets
│   │   │   │   ├── Dottie/
│   │   │   │   ├── Anaya/
│   │   │   │   └── TiaCarmen/
│   │   │   └── Custom/              ← Non-MetaHuman characters
│   │   │       ├── Compass/
│   │   │       └── Cal/
│   │   ├── UI/
│   │   │   ├── HUD/
│   │   │   ├── Menus/
│   │   │   ├── SparkWidget/
│   │   │   └── QuizWidgets/
│   │   ├── Threadways/              ← Transition corridors between worlds
│   │   ├── PostProcess/             ← Ghibli/NatGeo look
│   │   ├── Audio/
│   │   │   ├── Music/               ← Per-world ambient tracks
│   │   │   ├── SFX/                 ← Achievement, UI, ambient
│   │   │   └── Leitmotifs/          ← Per-character themes
│   │   └── Shared/
│   │       ├── Materials/
│   │       ├── Textures/
│   │       └── Meshes/
├── Source/
│   ├── KoydoWorlds/
│   │   ├── Core/                    ← C++ engine-level code
│   │   │   ├── WorldStateManager.h/cpp
│   │   │   ├── SilfenWeaveTransition.h/cpp
│   │   │   ├── FabricPlugin.h/cpp
│   │   │   └── AIConversationManager.h/cpp
│   │   ├── Gameplay/
│   │   │   ├── KindlerCharacter.h/cpp
│   │   │   ├── SparkComponent.h/cpp
│   │   │   ├── FadingComponent.h/cpp
│   │   │   └── ThreadwayTrigger.h/cpp
│   │   └── UI/
│   │       ├── SparkHUD.h/cpp
│   │       └── QuizWidget.h/cpp
├── Platforms/
│   ├── iOS/
│   ├── Android/
│   └── Console/
├── Config/
│   ├── DefaultEngine.ini
│   ├── DefaultGame.ini
│   ├── DefaultInput.ini
│   └── DeviceProfiles/
│       ├── IOS_Low.ini
│       ├── IOS_Medium.ini
│       ├── IOS_High.ini
│       ├── Android_Low.ini
│       ├── Android_Medium.ini
│       └── Console_Ultra.ini
├── Docs/
│   ├── CLAUDE.md                    ← Bible v4 (agent context)
│   ├── BUILD-SPEC.md                ← This file (Bible v5)
│   └── CharacterBible/              ← v1 profiles
└── ParentDashboard/                 ← Separate Next.js app
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             ← Dashboard home
    │   │   ├── worlds/page.tsx      ← World map view
    │   │   ├── progress/page.tsx    ← Curriculum progress
    │   │   └── settings/page.tsx    ← Time controls
    │   └── lib/
    │       └── supabase.ts          ← Client init
    └── vercel.json
```

---

## SPRINT 1 — THE FIRST WORLD (Weeks 2–3)

### Goal: A child can walk into the Number Garden, talk to Dottie, learn about Fibonacci, see the world brighten, and walk out.

### 1.1 Build the Great Archive (Hub)

This is the onboarding world — the first thing every child sees.

**Level design:**
- A vast, dimly lit library. Towering shelves. Dust motes in shafts of light.
- Central atrium with The Librarian standing at a reading podium.
- Three Threadway portals glowing faintly: one green (STEM), one amber (Language), one copper (Finance).
- Compass appears as a warm glow at the child's side.

**Tasks:**
- [ ] Create `Content/KoydoWorlds/Worlds/GreatArchive/Maps/GreatArchive_Main.umap`
- [ ] Block out the space (BSP → static mesh)
- [ ] Apply the Ghibli post-process stack (warm color grading, soft outlines)
- [ ] Place The Librarian (temporary mannequin until MetaHuman is ready)
- [ ] Place three Threadway trigger volumes (one per Realm)
- [ ] Implement Compass as a following particle effect with a gentle audio cue
- [ ] Wire TTS for Librarian's greeting dialogue (temporary audio, replaced by ACE later)

### 1.2 Build the Number Garden (First Fabric)

**Level design:**
- Outdoor garden with Fibonacci spirals in flower beds.
- Central area: Dottie stands beside a large sunflower.
- Ambient: marimba + music box, mathematical rhythms.
- The Fading state controls: when luminance = 0, flowers are gray/wilted, music is sparse. At luminance = 100, full color, rich orchestration.

**Tasks:**
- [ ] Create `Content/KoydoWorlds/Worlds/NumberGarden/Maps/NumberGarden_Main.umap`
- [ ] Model Fibonacci spiral flower beds (or find/generate assets)
- [ ] Create `FadingMaterialParameter` — a global scalar that drives color saturation across all materials in the world. Bound to `world_luminance` value from Supabase.
- [ ] Place Dottie (MetaHuman or temp mannequin)
- [ ] Place 4 Remembrance Wall locations for the first entries (Fibonacci, Zero, Hypatia, Ada Lovelace)
- [ ] Create interaction trigger: child taps sunflower → counting mini-game begins
- [ ] Wire luminance increase: completing a lesson adds +5 to the world's luminance
- [ ] Create Threadway back to Great Archive

### 1.3 The Fading System (C++ / Blueprint)

**WorldStateManager.h:**
```cpp
// Core engine class — candidate for upstream merge to loom
UCLASS()
class KOYDOWORLDS_API UWorldStateManager : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    // Fetch luminance for a world from Supabase
    UFUNCTION(BlueprintCallable)
    void FetchWorldLuminance(const FString& WorldSlug);

    // Update luminance after lesson completion
    UFUNCTION(BlueprintCallable)
    void IncreaseLuminance(const FString& WorldSlug, int32 Delta);

    // Get current cached luminance
    UFUNCTION(BlueprintPure)
    int32 GetLuminance(const FString& WorldSlug) const;

    // Delegate for UI/material updates
    UPROPERTY(BlueprintAssignable)
    FOnLuminanceChanged OnLuminanceChanged;

private:
    TMap<FString, int32> CachedLuminance;
};
```

**Supabase integration:**
- Use UE5's HTTP module to call Supabase REST API
- Endpoint: `GET /rest/v1/world_luminance?world_slug=eq.{slug}`
- Update: `PATCH /rest/v1/world_luminance?world_slug=eq.{slug}` with `{"luminance": new_value}`
- Auth: use Supabase anon key for reads, service role key for writes (writes go through Edge Function for validation)

### 1.4 The Threadway (Silfen Weave Prototype)

**This is engine-level code — PR upstream to loom when stable.**

The Threadway between Great Archive and Number Garden:
- Trigger volume at the Archive's STEM portal
- On overlap: begin streaming Number Garden level
- Crossfade: visual (color shift from library amber to garden green), audio (library ambience → marimba), geometry (Archive shelves morph into garden hedges via World Partition streaming)
- No loading screen. The child walks continuously.

**Implementation:** Use UE5's **Level Streaming** with **World Partition**:
- Each world is a streaming level
- Threadway corridor is a small level that loads both adjacent worlds
- When child enters Threadway: begin loading destination, unload origin when out of view
- Material crossfade driven by player position within the Threadway corridor

### 1.5 First AI Conversation

**Minimum viable conversation:**
1. Child approaches Dottie → interaction trigger fires
2. System prompt assembled: Dottie's personality + Number Garden entries + child's age tier
3. Dottie greets the child (LLM generates greeting, TTS converts to audio)
4. Child can tap response options (Tier 1) or type/speak (Tier 3)
5. Dottie responds with emotion tag → drives facial animation (or text overlay for MVP)
6. After 3-5 exchanges, Dottie guides child to first activity

**For Sprint 1 MVP:** Skip NVIDIA ACE. Use pre-recorded audio with text overlay. The LLM conversation happens, but facial animation is placeholder. ACE integration comes in Sprint 3.

---

## SPRINT 2 — TWO MORE WORLDS + PARENT DASHBOARD (Weeks 4–5)

### 2.1 The Story Tree (Language Arts World)
- [ ] Level: Ancient tree with glowing story-orbs. Warm amber lighting.
- [ ] Character: Grandmother Anaya (MetaHuman, elderly Navajo-Puebloan)
- [ ] Entries: Gilgamesh, Scheherazade, Gutenberg, Rosetta Stone
- [ ] Threadway: connects to Great Archive (Expression portal)

### 2.2 The Market Square (Financial Literacy World)
- [ ] Level: Bustling outdoor market. Terracotta and copper tones. Steel drum music.
- [ ] Character: Tía Carmen Herrera (MetaHuman, Mexican-Guatemalan)
- [ ] Entries: Lydian Coin, Silk Road
- [ ] Threadway: connects to Great Archive (Exchange portal)

### 2.3 Cross-World Threadway
- [ ] Build direct Threadway from Number Garden → Music Meadow (math↔music connection)
- [ ] This tests the Silfen Weave with worlds that aren't adjacent in the hub

### 2.4 Parent Dashboard MVP
- [ ] Create `ParentDashboard/` as a Next.js project
- [ ] Deploy to Vercel under Team Koydo (separate project from main Koydo app)
- [ ] Auth: Supabase Auth (separate from Koydo EdTech auth)
- [ ] Pages: World Map, Progress, Settings
- [ ] Wire to `session_reports`, `kindler_progress`, `world_luminance` tables
- [ ] Deploy to `worlds.koydo.com/parent` (or `parent.koydoworlds.com`)

---

## SPRINT 3 — AI + AUDIO + POLISH (Weeks 6–7)

### 3.1 NVIDIA ACE Integration
- [ ] Install ACE UE5 plugin
- [ ] Wire Audio2Face-3D to MetaHuman rig
- [ ] Test: Dottie's face moves when AI speaks
- [ ] Set up emotion tag → facial preset mapping

### 3.2 Character Leitmotifs
- [ ] Commission or generate 4-8 bar themes for Dottie, Anaya, Tía Carmen, Compass, Librarian
- [ ] Implement leitmotif trigger: plays when character enters view
- [ ] Implement world ambient music with Fading-responsive dynamics

### 3.3 Spark HUD
- [ ] Design Spark UI widget: small warm glow in corner, grows/shrinks
- [ ] Wire to `kindler_spark_log` — real-time updates
- [ ] Achievement flash: world restoration moment (bell tone + light bloom)

### 3.4 Quiz System
- [ ] Build quiz widget framework (supports all 7 adventure types)
- [ ] Tier 1: picture-tap quizzes
- [ ] Tier 2: multiple choice text
- [ ] Tier 3: open response (LLM-graded)
- [ ] Wire quiz completion → luminance increase + spark delta

---

## SPRINT 4 — EXPAND TO 9 WORLDS (Weeks 8–10)

Expand to 3 worlds per Realm (9 total + hub):

**STEM:** Number Garden ✓, Starfall Observatory, Circuit Marsh
**Language:** Story Tree ✓, Letter Forge, Folklore Bazaar
**Finance:** Market Square ✓, Savings Vault, Entrepreneur's Workshop

Each world requires:
- [ ] Level design + art (biome kit, lighting, props)
- [ ] MetaHuman character (or concept art → MetaHuman pipeline)
- [ ] 4+ real-world entries seeded with content from v4
- [ ] Threadway connections
- [ ] AI conversation wired
- [ ] Audio (ambient + leitmotif)
- [ ] Fading visuals responding to luminance

---

## SPRINT 5 — BETA (Weeks 11–12)

### 5.1 COPPA Audit
- [ ] Verify no PII in AI sessions
- [ ] Verify auto-delete cron for expired sessions
- [ ] Verify parental gate
- [ ] Document data flow for COPPA compliance

### 5.2 Device Testing
- [ ] Test on iPhone 11 (Low tier) — verify 30fps
- [ ] Test on iPhone 15 Pro (High tier) — verify 60fps
- [ ] Test on iPad Pro M2 (High tier) — verify 60fps
- [ ] Test on Samsung Galaxy A-series (Low tier) — verify 30fps

### 5.3 Beta Invite
- [ ] Recruit 50 families from Koydo user base
- [ ] TestFlight (iOS) + Internal Testing (Android)
- [ ] Parent survey after 2 weeks
- [ ] Child session data analysis (session length, return rate, world preference)

### 5.4 Revenue System
- [ ] Implement subscription tiers: Free (1 world), Explorer ($4.99/mo, 15 worlds), Kindler ($9.99/mo, all 50), Family ($14.99/mo, 4 children)
- [ ] Wire Stripe (web), Apple IAP (iOS), Google Play Billing (Android)
- [ ] Revenue events → `revenue_events` table (already created in Koydo Supabase, create equivalent in loom-worlds Supabase)
- [ ] Epic royalty ledger auto-populates quarterly

---

## DEPENDENCIES & API KEYS NEEDED

| Service | Purpose | Key Name | When Needed |
|---------|---------|----------|-------------|
| Supabase | Backend DB + Auth | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Sprint 0 |
| fal.ai | Character concept art + media | `FAL_API_KEY` | Sprint 1 (art generation) |
| Anthropic | AI character conversations | `ANTHROPIC_API_KEY` | Sprint 1 (conversations) |
| ElevenLabs | Text-to-speech for characters | `ELEVENLABS_API_KEY` | Sprint 1 (audio) |
| NVIDIA ACE | Facial animation | ACE SDK license | Sprint 3 |
| Stripe | Web subscriptions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Sprint 5 |
| Apple | iOS IAP | App Store Connect credentials | Sprint 5 |
| Google Play | Android billing | Play Console credentials | Sprint 5 |
| Epic Games | UE5 license + royalty reporting | Epic Games account | Sprint 0 (project creation) |

---

## ACCEPTANCE CRITERIA

**Sprint 0 is done when:**
- Repo exists, UE5 project compiles for iOS + Android, Supabase project has all tables, 50 worlds seeded

**Sprint 1 is done when:**
- A child can: launch app → arrive in Great Archive → walk through Threadway → enter Number Garden → talk to Dottie → complete a Fibonacci counting activity → see the garden bloom → walk back

**Sprint 2 is done when:**
- 3 worlds functional, parent dashboard shows progress, cross-world Threadway works

**Sprint 3 is done when:**
- Characters have facial animation during conversation, music responds to Fading, Spark HUD works

**Sprint 4 is done when:**
- 9 worlds + hub, all with content, characters, and audio

**Sprint 5 is done when:**
- 50 families beta testing, subscription payments working, COPPA audit passed

---

*Build the world. Keep the light on.*

*— Koydo Worlds Build Spec v5 • March 2026*
