<!-- AGENT-DOC-PROTOCOL:START -->
> Agent note: Follow `docs/build/DOCUMENTATION_PROTOCOL.md`. Keep canonical docs aligned to current truth, log material scope changes in `docs/build/BUILD_LOG.md`, preserve history in dated research and report files, and keep Omniview interop-first with Koydo as adapter `#1`, not the platform center.
<!-- AGENT-DOC-PROTOCOL:END -->
# Compensation Formula Matrix

Date: 2026-03-08
Status: Active policy
Scope: All personas in `docs/agents`

## Purpose
Create one enforceable compensation model where every persona is economically aligned to enterprise success.

No role is insulated from business outcomes.
If the company underperforms, all roles absorb downside.
If the company compounds sustainable revenue, all roles participate in upside.

## Core Principles
- Revenue quality over vanity growth.
- Margin and trust are co-equal constraints.
- Recurring revenue is the primary north star.
- Local optimization cannot override enterprise economics.
- Incentive rules must be explicit, measurable, and auditable.

## Definitions
- `TVP`: Target variable pay for the role (as currency amount).
- `S_company`: Company performance score (0.0 to 2.0).
- `S_cluster`: Cluster score for persona group (0.0 to 2.0).
- `S_role`: Persona scorecard result (0.0 to 2.0).
- `S_collab`: Collaboration and challenge quality score (0.0 to 2.0).
- `P_downside`: Downside penalty value (0.0 to 1.0).
- `Gate`: Eligibility gate (0 or 1) based on integrity and policy requirements.

## Primary Formula
`Variable_Payout = TVP * Gate * Clamp(0.0, 2.0, WeightedScore - P_downside)`

Where:
`WeightedScore = (Wc * S_company) + (Wg * S_cluster) + (Wr * S_role) + (Wk * S_collab)`

And:
`Wc + Wg + Wr + Wk = 1.0`

## Company Performance Score
`S_company = 0.30*RRG + 0.20*NRR + 0.15*CM + 0.15*CCE + 0.10*TRUST + 0.10*SHIP`

Metric normalization (recommended):
- `RRG`: recurring revenue growth index
- `NRR`: net revenue retention index
- `CM`: contribution margin index
- `CCE`: cash conversion efficiency index
- `TRUST`: complaints/refunds/dispute-adjusted trust index
- `SHIP`: release reliability and incident control index

Each index should be normalized to `0.0..2.0` with quarterly target tables.

## Cluster Weights
Use folder-based cluster assignment unless an explicit override exists.

### C0 Founder Orchestration (`00_founder`)
- Weights: `Wc=0.60, Wg=0.20, Wr=0.10, Wk=0.10`
- Focus: enterprise value compounding and survival risk

### C1 Executive Council (`01_executive_council`)
- Weights: `Wc=0.50, Wg=0.20, Wr=0.20, Wk=0.10`
- Focus: strategic revenue growth and capital efficiency

### C2 Product Intelligence (`02_product_intelligence`)
- Weights: `Wc=0.40, Wg=0.25, Wr=0.25, Wk=0.10`
- Focus: feature-to-revenue contribution and roadmap hit quality

### C3 Design Experience (`03_design_experience`)
- Weights: `Wc=0.35, Wg=0.25, Wr=0.30, Wk=0.10`
- Focus: conversion uplift with trust-safe UX quality

### C4 Platform Infrastructure (`04_platform_infrastructure`)
- Weights: `Wc=0.35, Wg=0.30, Wr=0.25, Wk=0.10`
- Focus: revenue loss prevention via reliability and throughput

### C5 Revenue Distribution (`05_revenue_distribution`)
- Weights: `Wc=0.30, Wg=0.35, Wr=0.25, Wk=0.10`
- Focus: recurring revenue, CAC payback quality, and retention

### C6 Governance and Risk (`06_governance_risk`)
- Weights: `Wc=0.30, Wg=0.25, Wr=0.25, Wk=0.20`
- Focus: risk-adjusted margin protection and regulatory safety

### C7 Social Intelligence (`07_social_intelligence`)
- Weights: `Wc=0.35, Wg=0.30, Wr=0.25, Wk=0.10`
- Focus: trust-weighted demand generation and reputation resilience

### C8 Psychology and Behavior (`08_psychology_behavior`)
- Weights: `Wc=0.35, Wg=0.30, Wr=0.25, Wk=0.10`
- Focus: retention lift and behavioral value delivery

### C9 Industry Specialists (`09_industry_specialists`)
- Weights: `Wc=0.35, Wg=0.30, Wr=0.25, Wk=0.10`
- Focus: vertical GMV or revenue expansion with strong margins

### C10 Crypto and Blockchain (`10_crypto_blockchain`)
- Weights: `Wc=0.35, Wg=0.30, Wr=0.25, Wk=0.10`
- Focus: protocol fee growth, treasury quality, and risk-adjusted yield

## Collaboration and Challenge Score (`S_collab`)
Measure:
- quality of challenge memo contribution
- responsiveness to cross-functional dependencies
- forecast accuracy accountability
- evidence quality in decision packages

Scoring scale:
- `0.0`: destructive behavior, no evidence, no ownership
- `1.0`: meets baseline collaboration and evidence standards
- `2.0`: consistently improves group decisions through high-quality challenge and execution

## Downside Penalties (`P_downside`)
Apply cumulatively unless a hard gate is triggered.

- `+0.10 to +0.25`: missed KPI commitments without corrective plan
- `+0.20 to +0.40`: repeated forecast variance beyond tolerance
- `+0.30 to +0.60`: trust harm (deceptive claims, paywall mismatch, policy violations)
- `+0.20 to +0.50`: preventable incident with direct revenue loss

## Hard Gates (`Gate`)
Set `Gate=0` when either condition is true:
- confirmed intentional misrepresentation of product capability or pricing
- severe compliance breach with unresolved remediation

Set `Gate=0.5` for quarter when:
- major preventable launch incident without documented containment within SLA

## Shared Downside Rules (Company-Level)
These rules enforce "succeed together, suffer together":

1. If quarterly recurring revenue growth is negative:
- apply `CompanyHaircut = 0.75` to all variable payouts.

2. If both NRR < 100 and contribution margin misses floor:
- apply `CompanyHaircut = 0.65` to all variable payouts.

3. If critical solvency threshold is breached (board-defined runway floor):
- apply `CompanyHaircut = 0.40` and freeze discretionary upside multipliers.

Final payout after company rule:
`Final_Payout = Variable_Payout * CompanyHaircut`

## Equity Alignment
Use rolling performance to adjust equity refresh units:

`Equity_Refresh = Base_Units * Clamp(0.5, 1.5, 0.70*S_company + 0.30*S_cluster)`

Additional constraints:
- no refresh uplift when trust or compliance hard gates are active
- repeated downside quarters require re-vesting review for leadership clusters

## Persona-Level Scorecard Requirements
Every persona must publish and track:
1. one primary revenue metric
2. one leading indicator
3. one risk guardrail metric
4. one forecast-vs-actual accuracy metric

## Governance Cadence
- Weekly: KPI tracking and variance review
- Monthly: payout-factor checkpoint (non-binding)
- Quarterly: formal scoring and payout determination
- Semiannual: metric recalibration and threshold review

## Appeals and Overrides
- Appeals require evidence package and executive council review.
- Overrides require written rationale and expiration date.
- No override may ignore hard gate rules.

## Implementation Rule
This matrix is mandatory for all persona-led decisions and role accountability.
Any persona document that conflicts with this matrix inherits this matrix as the controlling policy.

