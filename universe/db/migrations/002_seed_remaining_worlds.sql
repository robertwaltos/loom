-- =============================================================================
-- Migration 002: Seed world_luminance for all remaining 41 worlds
-- =============================================================================
-- The first 9 worlds were seeded in migration 001_initial.sql:
--   number-garden, story-tree, market-square, great-archive, cloud-kingdom,
--   savanna-workshop, starfall-observatory, rhyme-docks, letter-forge
--
-- This migration adds the remaining 41 worlds so the fading engine can track
-- luminance for all 50 worlds from day one.
--
-- All new rows start at: luminance=0.65, stage='glowing', last_restored_at=0,
-- total_kindlers_contributed=0, active_kindler_count=0
-- =============================================================================

insert into public.world_luminance (world_id, luminance, stage, last_restored_at, total_kindlers_contributed, active_kindler_count)
values
  -- Discovery realm
  ('barter-docks',             0.65, 'glowing', 0, 0, 0),
  ('body-atlas',               0.65, 'glowing', 0, 0, 0),
  ('circuit-marsh',            0.65, 'glowing', 0, 0, 0),
  ('calculation-caves',        0.65, 'glowing', 0, 0, 0),
  ('code-canyon',              0.65, 'glowing', 0, 0, 0),
  ('data-stream',              0.65, 'glowing', 0, 0, 0),
  ('discovery-trail',          0.65, 'glowing', 0, 0, 0),
  ('frost-peaks',              0.65, 'glowing', 0, 0, 0),
  ('greenhouse-spiral',        0.65, 'glowing', 0, 0, 0),
  ('magnet-hills',             0.65, 'glowing', 0, 0, 0),
  ('map-room',                 0.65, 'glowing', 0, 0, 0),
  ('meadow-lab',               0.65, 'glowing', 0, 0, 0),
  ('music-meadow',             0.65, 'glowing', 0, 0, 0),
  ('tideline-bay',             0.65, 'glowing', 0, 0, 0),
  ('time-gallery',             0.65, 'glowing', 0, 0, 0),
  -- Expression realm
  ('diary-lighthouse',         0.65, 'glowing', 0, 0, 0),
  ('editing-tower',            0.65, 'glowing', 0, 0, 0),
  ('folklore-bazaar',          0.65, 'glowing', 0, 0, 0),
  ('grammar-bridge',           0.65, 'glowing', 0, 0, 0),
  ('illustration-cove',        0.65, 'glowing', 0, 0, 0),
  ('nonfiction-fleet',         0.65, 'glowing', 0, 0, 0),
  ('punctuation-station',      0.65, 'glowing', 0, 0, 0),
  ('reading-reef',             0.65, 'glowing', 0, 0, 0),
  ('spelling-mines',           0.65, 'glowing', 0, 0, 0),
  ('translation-garden',       0.65, 'glowing', 0, 0, 0),
  ('vocabulary-jungle',        0.65, 'glowing', 0, 0, 0),
  -- Exchange realm
  ('budget-kitchen',           0.65, 'glowing', 0, 0, 0),
  ('charity-harbor',           0.65, 'glowing', 0, 0, 0),
  ('debt-glacier',             0.65, 'glowing', 0, 0, 0),
  ('entrepreneur-workshop',    0.65, 'glowing', 0, 0, 0),
  ('investment-greenhouse',    0.65, 'glowing', 0, 0, 0),
  ('job-fair',                 0.65, 'glowing', 0, 0, 0),
  ('needs-wants-bridge',       0.65, 'glowing', 0, 0, 0),
  ('savings-vault',            0.65, 'glowing', 0, 0, 0),
  ('sharing-meadow',           0.65, 'glowing', 0, 0, 0),
  ('tax-office',               0.65, 'glowing', 0, 0, 0),
  -- Crossroads realm
  ('debate-arena',             0.65, 'glowing', 0, 0, 0),
  ('everywhere',               0.65, 'glowing', 0, 0, 0),
  ('thinking-grove',           0.65, 'glowing', 0, 0, 0),
  ('wellness-garden',          0.65, 'glowing', 0, 0, 0),
  ('workshop-crossroads',      0.65, 'glowing', 0, 0, 0)
on conflict (world_id) do nothing;

-- =============================================================================
-- End of Migration 002
-- =============================================================================
