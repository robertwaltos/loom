# Prompt Index

Use this file when you need the fastest route to the right prompt.

## Best Prompt For X

| Need | Best Prompt | Path |
|---|---|---|
| Full portfolio launch-readiness review | All-Surface Launch Readiness Orchestrator | `docs/prompts/orchestration/all-surface-launch-readiness-orchestrator.md` |
| Main app launch program lead | Main App Launch Team Lead Orchestrator | `docs/prompts/orchestration/main-app-launch-team-lead-orchestrator.md` |
| Main app revenue and launch truth audit | Main App Launch Readiness Revenue Orchestrator | `docs/prompts/orchestration/main-app-launch-readiness-revenue-orchestrator.md` |
| Founder strategy session | Founder Executive Council Strategy Session | `docs/prompts/orchestration/founder-executive-council-strategy-session.md` |
| Spinout or new venture decision | Venture Spinout Thesis Market And Naming Orchestrator | `docs/prompts/orchestration/venture-spinout-thesis-market-and-naming-orchestrator.md` |
| UI/UX critique | UI/UX Audit And Redesign Review Team | `docs/prompts/audit/ui-ux-audit-and-redesign-review-team.md` |
| UI/UX design and implementation | UI/UX Concept And Implementation Creation Team | `docs/prompts/creation/ui-ux-concept-and-implementation-creation-team.md` |
| SEO technical review | SEO Technical And Content Audit Team | `docs/prompts/audit/seo-technical-and-content-audit-team.md` |
| SEO landing pages and briefs | SEO Content Brief And Landing Page Creation Team | `docs/prompts/creation/seo-content-brief-and-landing-page-creation-team.md` |
| App store release readiness | App Store Submission Readiness And Release Ops Team | `docs/prompts/audit/app-store-submission-readiness-and-release-ops-team.md` |
| App store copy and screenshot planning | App Store Listing Copy Creative And Asset Brief | `docs/prompts/creation/app-store-listing-copy-creative-and-asset-brief.md` |
| Marketing strategy and pricing story | Marketing Positioning Pricing And Launch Strategy Team | `docs/prompts/strategy/marketing-positioning-pricing-and-launch-strategy-team.md` |
| Launch campaign production | Launch Campaign Creative Production Team | `docs/prompts/creation/launch-campaign-creative-production-team.md` |
| Marketing research sweep | Marketing Research Global Launch Agent | `docs/prompts/strategy/marketing-research-global-launch-agent.md` |
| Billing and paywall review | Billing Paywall Entitlement And Conversion Audit Team | `docs/prompts/audit/billing-paywall-entitlement-and-conversion-audit-team.md` |
| Security, privacy, trust, compliance review | Security Privacy Trust And Compliance Audit Team | `docs/prompts/audit/security-privacy-trust-and-compliance-audit-team.md` |
| Local build, CI, deployment gate | Release Quality Local Build And Deployment Gate Team | `docs/prompts/audit/release-quality-local-build-and-deployment-gate-team.md` |
| Analytics and observability review | Analytics Observability And Growth Instrumentation Audit Team | `docs/prompts/audit/analytics-observability-and-growth-instrumentation-audit-team.md` |
| Support burden and ops readiness | Customer Support Ops And Escalation Readiness Team | `docs/prompts/audit/customer-support-ops-and-escalation-readiness-team.md` |
| Content and curriculum quality | Curriculum Content And Learning Experience Quality Team | `docs/prompts/audit/curriculum-content-and-learning-experience-quality-team.md` |
| Microapp launch order | Microapp Portfolio Launch Sequencing Team | `docs/prompts/audit/microapp-portfolio-launch-sequencing-team.md` |
| Finance planning and unit economics | Finance Planning Capital And Unit Economics Team | `docs/prompts/strategy/finance-planning-capital-and-unit-economics-team.md` |
| Partnerships and channels | Partnerships Channel And Business Development Team | `docs/prompts/strategy/partnerships-channel-and-business-development-team.md` |
| Investor updates and diligence | Investor Reporting Board And Diligence Team | `docs/prompts/strategy/investor-reporting-board-and-diligence-team.md` |
| M&A and corp-dev analysis | Mergers Acquisitions And Corporate Development Team | `docs/prompts/strategy/mergers-acquisitions-and-corporate-development-team.md` |
| PR, launch comms, crisis readiness | PR Communications Launch And Crisis Team | `docs/prompts/strategy/pr-communications-launch-and-crisis-team.md` |
| International expansion and localization | Localization And International Launch Team | `docs/prompts/strategy/localization-and-international-launch-team.md` |
| Influencer, creator, and social partner motion | Community Creator And Influencer Growth Team | `docs/prompts/strategy/community-creator-and-influencer-growth-team.md` |
| Narration batch brief, 40 upsell clips | Lesson Teaser Narrations Upsell 40 Clip Brief | `docs/prompts/content-production/lesson-teaser-narrations-upsell-40-clip-brief.md` |
| Narration batch brief, 200 included previews | Lesson Teaser Narrations Included Preview 200 Clip Brief | `docs/prompts/content-production/lesson-teaser-narrations-included-preview-200-clip-brief.md` |

## Suggested Command Pattern

```text
Use `docs/prompts/audit/ui-ux-audit-and-redesign-review-team.md`.
Execute from `xxx.md`.
Return the final report in Markdown.
```

## Rules
- If the task is inspection-heavy, start in `audit/`.
- If the task is deliverable or asset creation, start in `creation/`.
- If the task is launch orchestration or portfolio-level review, start in `orchestration/`.
- If the task is market, finance, investor, or business-development strategy, start in `strategy/`.
- If the task is narration or media generation workflow, start in `content-production/`.
