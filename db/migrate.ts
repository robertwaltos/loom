#!/usr/bin/env node
/**
 * Loom DB migration runner
 * Usage:  npx tsx db/migrate.ts up
 *         npx tsx db/migrate.ts status
 *
 * Requires DATABASE_URL env var (standard Postgres connection string).
 * Shells out to `psql` — no pg npm package needed at runtime.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') throw new Error('DATABASE_URL environment variable is not set');
  return url;
}

/** Run a SQL string via psql and return captured stdout. */
function psqlQuery(sql: string): string {
  try {
    return execFileSync('psql', [dbUrl(), '--tuples-only', '--no-align', '-c', sql], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`psql query failed:\n${msg}`, { cause: err });
  }
}

/** Execute a .sql file via psql, streaming output to the terminal. */
function psqlFile(filePath: string): void {
  try {
    execFileSync('psql', [dbUrl(), '-f', filePath], {
      encoding: 'utf-8',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`psql failed on ${filePath}:\n${msg}`, { cause: err });
  }
}

// ---------------------------------------------------------------------------
// Migration tracking table
// ---------------------------------------------------------------------------

function ensureMigrationsTable(): void {
  psqlQuery(`
    CREATE TABLE IF NOT EXISTS loom_migrations (
      id         SERIAL      PRIMARY KEY,
      name       VARCHAR(256) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

function appliedMigrations(): Set<string> {
  const out = psqlQuery('SELECT name FROM loom_migrations ORDER BY id');
  return new Set(
    out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  );
}

function recordMigration(name: string): void {
  // Dollar-quoting avoids any quote-escaping concerns for filenames.
  psqlQuery(`INSERT INTO loom_migrations (name) VALUES ($$${name}$$)`);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdUp(): void {
  ensureMigrationsTable();
  const applied = appliedMigrations();
  const files = migrationFiles();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      process.stdout.write(`  skip   ${file}\n`);
      continue;
    }

    process.stdout.write(`  apply  ${file} … `);
    psqlFile(join(MIGRATIONS_DIR, file));
    recordMigration(file);
    process.stdout.write('done\n');
    count++;
  }

  const summary =
    count === 0
      ? '\nAll migrations already applied.\n'
      : `\nApplied ${String(count)} migration(s).\n`;
  process.stdout.write(summary);
}

function cmdStatus(): void {
  ensureMigrationsTable();
  const applied = appliedMigrations();
  const files = migrationFiles();

  if (files.length === 0) {
    process.stdout.write('No migration files found in db/migrations/\n');
    return;
  }

  const pending = files.filter((f) => !applied.has(f));
  const applied_count = String(files.length - pending.length);
  const total = String(files.length);
  process.stdout.write(`\nMigrations: ${applied_count}/${total} applied\n\n`);

  for (const file of files) {
    const mark = applied.has(file) ? '✓' : '○';
    process.stdout.write(`  ${mark}  ${file}\n`);
  }
  process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

const cmd: string | undefined = process.argv[2];

if (cmd === 'up') {
  cmdUp();
} else if (cmd === 'status') {
  cmdStatus();
} else {
  process.stderr.write('Usage: npx tsx db/migrate.ts <up|status>\n');
  process.exit(1);
}
