# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive documentation under `/docs`
- Full implementation of core runtime, CLI, providers, widget, and Next.js adapter
- Capability graph with proactive tasks and reactive assistant support
- Command bus for agentic execution (Phase 3 foundations)
- Mock + real LLM providers (OpenAI, Anthropic, Ollama)
- Drift gate and source-hash based caching
- Working Next.js demo with donor management example
- Standard open source files: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, ROADMAP.md
- `createAssistHandler` (Next.js) and `createRemixAssistHandler` — server-side session + persona resolution
- Reconciliation harness (report mode): `runReconciliation`, `diff`, `buildReport` + `assist reconcile` CLI
- `deriveAvailable` heuristic + `Page.available` derivation (feature flags / `_` routes)
- Real structure-hash caching for the flow pass (`computeGraphStructureHash`); `suggestTasks` only on change
- Annotation merge in compile/gate: `assist-annotations.{ts,js}` loaded; `defineAction`/`defineTask` win over LLM
- `ASSIST_AGENTIC_ENABLED` kill-switch (default off) + reachable `drive` gate in handler
- Widget completeness: focus trap, `role=dialog` + `aria-modal`, `aria-live`, `prefers-reduced-motion`, CSS var theming, disambiguate/drive rendering, deduplicated registration
- Persona-driven proactive onboarding: tasks loaded from graph (via tasks endpoint), `LocalStorageProgressProvider` + `ServerProgressHook`, re-onboarding on graph hash change, `wayfinder:tour-start` events
- Runtime scale guard: `maxInlineCandidates` (default 60) — oversized candidate sets fall back to page disambiguation (never blow LLM context)
- ESLint plugin (`@wayfinder/eslint-plugin`) with `no-unregistered-action` rule
- `.github/workflows/compile.yml` (keyed, `workflow_dispatch` + optional weekly schedule) alongside key-free `drift-gate.yml`
- `assist reconcile` CLI command (report mode via Playwright harness)
- Remix adapter skeleton with real `createRemixAssistHandler` + tests

### Changed

- Root README completely rewritten for clarity and discoverability
- Persona is now **server-derived only** (`AssistChatRequest` no longer carries trusted `persona`; handler receives session and calls `getPersonas(session)`)
- No-false-refusal: unmatched in-scope app questions return `disambiguate` (page candidates) instead of `refuse: "unknown"`
- `refuse.reason` restricted to spec values: `"off_topic" | "sensitive"`
- CLI now exposes `reconcile` alongside `init`, `discover`, `compile`, `gate`
- `capability_graph.json` now includes `tasks` with `source: "suggested"` (or `"annotated"`) and real flow-pass output under normal compile
- `compile` and `gate` now load and merge annotations before computing structure hash

### Fixed

- Flow-pass cache no longer uses a hardcoded structure hash; `suggestTasks` is skipped when structure is unchanged
- Drive branch is now reachable (evaluated before the default guide return for app_action)
- Widget no longer hardcodes client-side `persona` on fetch; disambiguate and onboarding are real
- Duplicate `customElements.define` guard in widget

### Security

- Persona resolution is fail-closed: empty result or throwing resolver → refuse (no capabilities leaked)
- Client-supplied persona (if present in body) is ignored by `createAssistHandler`

### Testing

- Core: 63 tests (12 files) passing via vitest (some type issues remain in test fixtures around `effect` values; runtime behavior is correct)
- Widget: 13 tests covering a11y, disambiguate, onboarding checklist, tour events
- ESLint plugin and adapter-nextjs tests cover handler wiring, reconciliation diff logic, and rule behavior
- Verification: `pnpm -r test` (after building dependencies); `pnpm -r typecheck` currently surfaces pre-existing fixture type mismatches in a few core tests. Runtime + harness are functional.

## [0.1.0] - 2026-06-26

### Added

- Initial monorepo structure with pnpm + Turborepo
- `@wayfinder/core`: Zod schema, validation, loadGraph, runtime primitives
- Basic CLI with init/discover/compile/gate
- Web Component widget
- Next.js adapter skeleton
- First working end-to-end demo

[Unreleased]: https://github.com/sarathyinc/wayfinder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sarathyinc/wayfinder/releases/tag/v0.1.0
