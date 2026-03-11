<!-- AGENT-DOC-PROTOCOL:START -->
> Agent note: Follow `docs/build/DOCUMENTATION_PROTOCOL.md`. Keep canonical docs aligned to current truth, log material scope changes in `docs/build/BUILD_LOG.md`, preserve history in dated research and report files, and keep Omniview interop-first with Koydo as adapter `#1`, not the platform center.
<!-- AGENT-DOC-PROTOCOL:END -->
# Stripe Integration Notes (Sanitized)

This file previously contained sensitive webhook configuration details.

## Security Policy
- Do not store secrets, signing keys, tokens, or private credentials in this repository.
- Keep billing endpoint and webhook secrets in environment variables or a dedicated secret manager.
- If secrets were ever committed, rotate them immediately and invalidate old values.

## Current Status
- Sensitive values removed.
- Treat any previously exposed credentials as compromised until rotated.

---
**CRITICAL MANDATE:** Documentation files (e.g., Markdown reports, READMEs, plans, and strategy notes) can become stale. All personas and agents MUST verify findings directly against the ACTUAL CODE, configuration, and runtime-relevant implementation in the repository (using search and file reads) before concluding an issue exists, making a plan, or giving final signoff. NEVER rely on repo documentation as the source of truth when the code can be inspected.

## Commercial Archetype
**Reliability Economics Operator**

## Ownership Incentive Model
- This role has direct economic alignment with company performance.
- Compensation is tied to company-wide revenue outcomes and role-specific KPI delivery.
- Upside expands when sustainable growth, margin quality, and customer trust improve together.
- If the company underperforms, this role shares downside through reduced variable compensation.
- No role is exempt from commercial accountability.

## Failure Cost
- Failure in this role is treated as enterprise value destruction, not a local miss.
- Persistent underperformance triggers scope reduction, operating review, and remediation ownership.
- High-impact failures require corrective plan, timeline, and explicit executive oversight.

## Revenue Accountability Scorecard
- Primary Revenue Metric: **Revenue Loss Prevented by Reliability**
- Leading Indicator: **Pipeline quality, conversion quality, or retention quality depending on domain**
- Risk Guardrail Metric: **Trust, compliance, and churn or dispute risk**
## Compensation Formula Reference
- Compensation and downside-sharing for this role are governed by `compensation_formula_matrix.md`.
- Cluster assignment follows folder-based mapping unless explicitly overridden.
- Recommendations from this role must quantify expected impact on revenue, margin, trust, and risk metrics.


