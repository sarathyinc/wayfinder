# Wayfinder Roadmap

This document outlines the current status and planned work for Wayfinder.

> **Note**: Dates are approximate. This is a living document.

## Vision (from Design Spec)

Every SaaS product should have an AI Assist that lets brand-new users become productive the moment they first log in — with **zero annotation** by default and strong guarantees against drift.

Two surfaces, one brain:
- **Proactive onboarding**
- **Reactive assistant**

## Current Status (as of 2026-06-27)

**Phase 1 — "It knows your app"** — ✅ Largely complete
- Core schema + runtime contract + matcher + handler
- CLI (init, discover, compile, gate)
- Providers (mock + OpenAI/Anthropic/Ollama)
- Widget (functional Web Component)
- Next.js adapter (discover + React wrapper + command bus foundations)
- Working demo with committed capability graph
- Source-hash caching + drift gate
- Documentation overhaul

**Phase 2 — "It onboards you"** — 🟡 Partially implemented
- Flow pass for suggested tasks (via providers + compile)
- Basic proactive checklist in widget
- Progress provider stub
- Full guided tours need more polish

**Phase 3 — "It does it for you"** — 🟡 Foundations in place
- Annotation layer (`defineAction` / `defineTask`)
- Command bus skeleton
- DRIVE responses + safety gates
- Full agentic execution + ESLint rule + gate-mode reconciliation still needed

**Phase 4+ — Ecosystem** — 🔴 Early
- Only Next.js adapter is mature
- No community adapters yet
- Scale (embedding pre-shortlist) not implemented
- Per-locale i18n not started
- Analytics/eval harness missing

## Planned Milestones

### v0.2.0 — Polish & Adoption (Target: Q3 2026)

- [ ] Improve proactive onboarding experience (real tours with spotlight)
- [ ] Full command bus + examples of agentic actions in the demo
- [ ] Better error messages and debugging experience in CLI
- [ ] Publish initial packages to npm (`@wayfinder/*`)
- [ ] More realistic end-to-end tests (including reconciliation stub)
- [ ] Add visual assets (logo, demo GIF/video) to README

### v0.3.0 — Multi-Stack & Maturity (Target: Q4 2026)

- [ ] Remix adapter (or SvelteKit)
- [ ] Basic embedding / candidate pre-filtering for large apps
- [ ] Reconciliation in gate mode (Playwright-based, opt-in)
- [ ] ESLint rule for missing annotations on hot paths
- [ ] Proper release process + changelogs

### Future (Post v1)

- [ ] Community adapters (Rails, Django, etc.)
- [ ] Per-locale compilation support
- [ ] Analytics / evaluation harness
- [ ] Hosted trial or one-click demo (non-goal per spec, but community interest)
- [ ] Official documentation site (beyond GitHub docs/)

## How to Help

See [CONTRIBUTING.md](CONTRIBUTING.md) and open issues labeled `good first issue` or `help wanted`.

Priority areas right now:
- Non-Next.js adapter examples
- Improving discovery quality on real-world codebases
- Documentation examples and visuals
- Test coverage for edge cases (large graphs, many personas, etc.)

---

Last updated: 2026-06-27
See the [concepts](./docs/concepts.md) and [architecture](./docs/architecture.md) for details on the vision.
