<!-- AGENT-DOC-PROTOCOL:START -->
> Agent note: Follow `docs/development/DOCUMENTATION_PROTOCOL.md`. Keep canonical docs aligned to current truth, verify platform claims against code before concluding system state, log material documentation-policy changes in `docs/development/BUILD_LOG.md`, and align or clearly mark supporting docs when assumptions change.
<!-- AGENT-DOC-PROTOCOL:END -->
# AI Company Brain
This repository contains a structured persona library.

Reusable execution briefs and handoff prompts now live in `docs/prompts/`.
Use `docs/agents/` for persona frameworks, routing rules, and role definitions.

---
**CRITICAL MANDATE:** Documentation files (e.g., Markdown reports, READMEs, plans, and strategy notes) can become stale. All personas and agents MUST verify findings directly against the ACTUAL CODE, configuration, and runtime-relevant implementation in the repository (using search and file reads) before concluding an issue exists, making a plan, or giving final signoff. NEVER rely on repo documentation as the source of truth when the code can be inspected.

