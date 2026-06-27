# Wayfinder Roadmap

This document outlines the current status and planned work for Wayfinder.

> **Note**: Dates are approximate. This is a living document.

## Vision (from Design Spec)

Every SaaS product should have an AI Assist that lets brand-new users become productive the moment they first log in — with **zero annotation** by default and strong guarantees against drift.

Two surfaces, one brain:
- **Proactive onboarding**
- **Reactive assistant**

## Current Status (as of 2026-06-27)

**Phase 1 — "It knows your app"** — ✅ Complete
- Core schema + runtime contract + matcher + handler (`handleAssistChat`)
- Server-side persona resolution + fail-closed filtering (session threaded, client persona ignored)
- CLI (init, discover, compile, gate, reconcile)
- Providers (mock + OpenAI/Anthropic/Ollama)
- Widget (Web Component with a11y, theming, all response kinds)
- Next.js adapter (`createAssistHandler`, discover, React wrapper, command bus)
- Reconciliation harness (report mode) + `diff` / `buildReport` / `runReconciliation`
- Working demo with committed capability graph containing suggested tasks
- Source-hash caching (per-route + structure hash for tasks) + drift gate
- `deriveAvailable` + `Page.available`
- Scale guard (`maxInlineCandidates`)
- Documentation overhaul

**Phase 2 — "It onboards you"** — ✅ Largely complete
- Real flow pass with structure-hash caching; tasks emitted as `source: "suggested"`
- Persona-driven checklist rendered from graph `tasks`
- `ProgressProvider` (localStorage default) + `ServerProgressHook` interface; re-onboarding on graph hash change
- Tour start events (`wayfinder:tour-start`) with sequence; progress marks on `tour-complete`
- Widget gracefully falls back when no tasks endpoint is provided

**Phase 3 — "It does it for you"** — 🟡 Substantial implementation
- Annotation layer fully wired: `defineAction`/`defineTask` via `assist-annotations.{ts,js}` files, merged last (win over LLM), `source: "annotated"`
- Command bus skeleton (`openAction` / `registerActionListener`)
- `drive` responses + `ASSIST_AGENTIC_ENABLED` kill-switch (default **off**; when off, behavior == guide)
- `effect: "write"` never auto-submits (prefill only)
- ESLint plugin (`no-unregistered-action`) — opt-in
- Reconciliation report mode complete; gate mode still future
- Full parity tests and production agentic usage still maturing

**Phase 4+ — Ecosystem** — 🟡 Early but started
- Next.js adapter is mature (flagship)
- Remix adapter skeleton exists with real `createRemixAssistHandler` + tests (more surface area welcome)
- Runtime scale guard (`maxInlineCandidates`) in place; full embedding/BM25 pre-shortlist is Phase 4
- Per-locale i18n not started (schema is locale-ready)
- Analytics/eval harness missing
- Community adapters (Rails, etc.) not started

## Planned Milestones

### v0.2.0 — Polish & Adoption (Target: Q3 2026)

- [x] Real proactive onboarding (checklist + progress + tour-start events + re-onboard on graph change)
- [ ] Full spotlight/tour driver implementation walking real DOM selectors from graph
- [ ] Full command bus + examples of agentic `drive` actions in the demo (behind kill-switch)
- [ ] Demo tasks endpoint (`/api/assist/tasks`) for plug-and-play proactive
- [ ] Better error messages and debugging experience in CLI
- [ ] Publish initial packages to npm (`@wayfinder/*`)
- [ ] Reconciliation gate mode (fail CI on `missing` / `stale_spotlight`)
- [ ] Add visual assets (logo, demo GIF/video) to README

### v0.3.0 — Multi-Stack & Maturity (Target: Q4 2026)

- [ ] Expand Remix adapter surface (discover, widget wrapper, example)
- [ ] Basic embedding / candidate pre-filtering for large apps (beyond `maxInlineCandidates` guard)
- [ ] ESLint rule examples + docs for hot-path enforcement
- [ ] Proper release process + changelogs + provenance for published packages
- [ ] Per-locale compilation support (schema already locale-ready)

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

**Phase status reflects implementation after gap-closure work (see `temp/superpowers/plans/gaps.md`).**
