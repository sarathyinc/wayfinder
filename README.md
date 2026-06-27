<div align="center">
  <img src="logos/logo.svg" alt="Wayfinder logo" width="420" />
</div>

# Wayfinder

**An open-source framework that adds intelligent, zero-annotation AI assistance to any SaaS product.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/status-active-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

Wayfinder helps new users become productive in your application the moment they log in — without training videos, lengthy onboarding flows, or hand-authored help content.

It automatically understands your application’s structure (pages, actions, fields, and permissions) and delivers two complementary experiences:

- **Proactive onboarding** — Role-aware checklists and guided tours that walk users through their actual job on first login.
- **Reactive assistant** — A contextual chat widget that answers “How do I…?” questions by guiding users to the exact page, tab, and field — and can drive the UI when appropriate.

Everything is powered by a single **capability graph** that is automatically derived from your codebase.

## Why Wayfinder?

Most SaaS products still rely on:

- Static documentation
- Generic product tours
- Expensive customer success teams

Wayfinder flips this model. Instead of forcing users to learn your product, the product learns how to help the user — directly from the code you already write.

### Key Benefits

- ✅ **Zero annotation by default** — Add it to an existing codebase and it works.
- ✅ **Drift-proof** — If you ship a new page or field without recompiling, CI fails.
- ✅ **Proactive + Reactive** — One system handles both guided onboarding and on-demand help.
- ✅ **Works on the real UI** — Tours and guidance happen on your actual interface, not screenshots.
- ✅ **Secure by design** — Strict persona-based filtering, confidence gates, and a kill switch for agentic actions.
- ✅ **Framework-friendly** — JSON core + first-class Next.js support (more adapters coming).
- ✅ **Provider agnostic** — OpenAI, Anthropic, Ollama (local), or mock.

## Quick Start (Demo)

The fastest way to see it in action:

```bash
pnpm install
pnpm --filter @wayfinder/core build
cd examples/nextjs-demo
pnpm dev
```

Open http://localhost:3000 and try the floating chat widget.

Ask questions like:

- “How do I log a donor offer?”
- “Where do I enter terminal creatinine?”

## Adding Wayfinder to Your SaaS

Wayfinder is designed to be added to **existing** applications with minimal changes.

See the full guide:

→ **[Integration Guide →](./docs/integration.md)**

High-level steps:

1. Run the CLI to initialize: `pnpm --filter @wayfinder/cli dev:assist -- init .`
2. Run discovery + compile to generate the capability graph.
3. Mount the `<assist-widget>` (Web Component or React wrapper).
4. Add a thin API route that calls the runtime handler.
5. Commit the generated `capability_graph.json` (and cache).

## How It Works

```mermaid
graph TD
    A[Your Source Code] -->|adapter.discover| B[Manifest]
    B -->|assist compile| C[capability_graph.json]
    C --> D[Runtime Handler]
    C --> E[<assist-widget>]
    D -->|POST /assist/chat| F[Persona Filter + Matcher]
```

Wayfinder uses a three-stage pipeline:

1. **Discover** (deterministic) — Walks your routes, components, and RBAC to produce a manifest.
2. **Compile** (LLM-powered, cached) — Generates human-friendly descriptions, steps, and suggested onboarding sequences. Only changed files are recompiled thanks to source hashing.
3. **Runtime** — Serves a lightweight `POST /assist/chat` endpoint that combines deterministic matching with a small LLM call, always filtered by the user’s persona.

The result is a committed `capability_graph.json` that both the widget and your backend consume.

For a deeper explanation, see:

- [Concepts](./docs/concepts.md)
- [Architecture](./docs/architecture.md)

## Documentation

| Topic                      | Link                                                 |
| -------------------------- | ---------------------------------------------------- |
| Getting Started            | [docs/getting-started.md](./docs/getting-started.md) |
| Adding to Your Application | [docs/integration.md](./docs/integration.md)         |
| Core Concepts              | [docs/concepts.md](./docs/concepts.md)               |
| Architecture & Pipeline    | [docs/architecture.md](./docs/architecture.md)       |
| CLI Reference              | [docs/cli.md](./docs/cli.md)                         |
| FAQ                        | [docs/faq.md](./docs/faq.md)                         |
| Security & Privacy         | [docs/security.md](./docs/security.md)               |
| Roadmap                    | [ROADMAP.md](./ROADMAP.md)                           |
| Development & Contributing | [docs/development.md](./docs/development.md)         |

Full documentation lives in the [`docs/`](./docs) folder.

## Packages

This is a monorepo containing the following main packages:

| Package                     | Description                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@wayfinder/core`           | Core schema, graph validation, runtime contract, matcher, handler, annotations                           |
| `@wayfinder/cli`            | `assist` CLI (`init`, `discover`, `compile`, `gate`, `reconcile`)                                        |
| `@wayfinder/providers`      | LLM provider abstraction (OpenAI, Anthropic, Ollama, mock)                                               |
| `@wayfinder/widget`         | Framework-agnostic `<assist-widget>` Web Component (a11y, theming, tours)                                |
| `@wayfinder/adapter-nextjs` | Next.js adapter (App Router discover, `createAssistHandler`, React wrapper, command bus, reconciliation) |
| `@wayfinder/adapter-remix`  | Remix adapter skeleton (`createRemixAssistHandler`)                                                      |
| `@wayfinder/eslint-plugin`  | ESLint rule: warn on unregistered interactive controls                                                   |

Each package has its own README with more details.

## CI/CD Workflows

Wayfinder ships two GitHub Actions workflows:

### Drift Gate (`drift-gate.yml`) — key-free, runs on every PR

Runs `assist gate`. Verifies that every current source hash (and the graph structure hash for tasks) exists in the committed `compile_cache.json`. Requires no API keys or LLM provider. Fails if source changed without a deliberate recompile.

### Compile (`compile.yml`) — keyed, on-demand or nightly

Re-runs `assist compile` with a real provider key (as `WAYFINDER_PROVIDER_KEY` secret) and commits the regenerated `capability_graph.json` + cache back.

- Manual trigger via `workflow_dispatch` (optional `app_dir` input)
- Optional weekly schedule (Monday 02:00 UTC)

**Setup:** add your provider API key as a repository secret named `WAYFINDER_PROVIDER_KEY`.

See also [docs/cli.md](./docs/cli.md) for the gate vs. keyed-compile model.

## Current Status

Wayfinder core (Phase 1 + large parts of Phase 2/3) is implemented after gap-closure work against the design spec.

Key shipped capabilities:

- Zero-annotation discovery + LLM compile with source-hash + structure-hash caching
- Server-enforced persona filtering (fail-closed)
- Proactive onboarding driven by real `tasks` (suggested + annotated)
- Agentic `drive` behind `ASSIST_AGENTIC_ENABLED` kill-switch
- Reconciliation report mode + `assist reconcile`
- Scale guard and no-false-refusal semantics
- Full widget a11y + theming

Flagship is Next.js. Community adapters (Remix skeleton exists) and gate-mode reconciliation are next focus areas.

See [ROADMAP.md](./ROADMAP.md) for the detailed phase breakdown.

## License

MIT

---

**Wayfinder** — Make your SaaS instantly understandable.

---

<p align="center">
  <a href="https://github.com/sarathyinc/wayfinder/stargazers">
    <img src="https://img.shields.io/github/stars/sarathyinc/wayfinder?style=social" alt="GitHub stars">
  </a>
</p>

_If Wayfinder helps you, please consider starring the repo — it helps others discover it!_
