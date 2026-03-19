# AGENTS.md — The Concord (LOOM) Multi-Agent Development Protocol

**Following this protocol is mandatory. Violations cause lost work and merge conflicts.**

---

## The Five Laws

1. **Never work directly on `main`** — always use a worktree
2. **Pull before you start** — your first command is always `git pull origin main`
3. **Commit often** — every logical unit of work, minimum every 30 minutes
4. **Merge to main after every tranche** — don't hoard work in a branch
5. **Read before you write** — verify current code state before modifying anything

---

## Starting Any Task

```bash
# 1. Always start from current main
git checkout main
git pull origin main

# 2. Create your worktree
git worktree add worktrees/[task-slug] -b agent/[task-slug]
cd worktrees/[task-slug]

# 3. Read the files you'll touch before touching them
# 4. Start work
```

**Naming:** `worktrees/add-vol6-characters`, `worktrees/fix-portrait-retry`, etc.

---

## Commit Format

```
type(scope): brief description

Types: feat | fix | chore | docs | refactor | security | portrait | character
Scope: characters | portraits | scripts | bible | lore | ui | auth | deps

Examples:
  feat(characters): write Concord chars 481-500 inner circle
  portrait(generate): add retry logic for connection resets
  chore(cleanup): remove duplicate Vol2 bible files
  security(api): validate fal.ai webhook signatures
```

### Commit When You:
- Complete a logical unit (a character batch, a script fix, a doc update)
- Are about to switch focus
- Have worked 30+ minutes without committing
- Are about to do something risky

---

## Finishing a Tranche

```bash
# Stage specific files — never blindly add everything
git add docs/game-bible/CANONICAL_CHARACTER_BIBLE.md scripts/rewrite-and-generate.py
# or review:
git add -p

git commit -m "type(scope): description"

# Merge to main
git checkout main
git pull origin main
git merge agent/[task-slug] --no-ff -m "merge: [tranche description]"
git push origin main

# Clean up
git worktree remove worktrees/[task-slug]
git branch -d agent/[task-slug]
```

---

## Files With Special Rules

| File | Rule |
|------|------|
| `docs/game-bible/CANONICAL_CHARACTER_BIBLE.md` | Single source of truth — only edit with explicit character task |
| `docs/game-bible/The_Concord_Character_Bible_Vol1.md` | Vol1 special handling — do not delete |
| `docs/game-bible/The_Concord_Character_Visual_Manifest_Vol1.csv` | Used by scripts — do not delete |
| `pipelines/.env` | NEVER commit — secrets only |
| `scripts/rewrite-and-generate.py` | Changes affect ALL portrait generation — review carefully |

---

## Conflict Protocol

1. STOP — do not guess
2. Read both versions
3. Choose the version preserving more intentional work
4. Uncertain -> flag for human review
5. NEVER force-push main

---

## Coordination Between Agents

- Check `git worktree list` before starting — see who else is active
- Check `git log --oneline -3 [file]` before editing a file
- Never edit a file another active agent owns
- If you must edit the same file — commit to your branch, let merge resolve it

---

## Security Checklist (Before Every Commit)

- [ ] No API keys or secrets in any file
- [ ] No PII in logs or error output
- [ ] Input validation at system boundaries
- [ ] No new unreviewed dependencies
- [ ] fal.ai API key stays in pipelines/.env only

---

## What NEVER To Do

- NEVER `git push --force` to main
- NEVER `git add .` without reviewing
- NEVER commit `pipelines/.env` or any `.env` file
- NEVER run `rewrite-and-generate.py` without explicit user confirmation
- NEVER change the seeds (42/44) in the assignment functions
- NEVER delete The Architect's custom visual spec
- NEVER push to remote without explicit user instruction
- NEVER undo or overwrite another agent's committed work

---

## Repo Quick Reference

```
docs/
  game-bible/
    CANONICAL_CHARACTER_BIBLE.md  <- 500 characters, single source of truth
    The_Concord_Character_Bible_Vol1.md  <- Vol1 special handling
    The_Concord_Character_Visual_Manifest_Vol1.csv
  character-references/           <- portrait images ({id}-{slug}.jpg)
  character-manifest.json
  CHARACTER-DESIGN-BRIEF.md
scripts/
  canonicalize-characters.py      <- rewrite visual prompts
  rewrite-and-generate.py         <- generate portraits (destructive — confirm first)
pipelines/
  .env                            <- secrets (never commit)
CLAUDE.md                         <- instructions for Claude agents
AGENTS.md                         <- this file
```
