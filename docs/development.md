# Development Guide

This guide is for contributors and people working inside the Wayfinder monorepo.

## Repository Overview

Wayfinder is a pnpm + Turborepo monorepo.

```
packages/
  core/                 # Framework core (schema, runtime, handler, matcher, annotations)
  providers/            # LLM provider implementations
  cli/                  # The `assist` command line tool (init/discover/compile/gate/reconcile)
  widget/               # <assist-widget> Web Component (a11y, theming, proactive)
  adapter-nextjs/       # Next.js integration (handler, discover, reconcile, React wrapper)
  eslint-plugin/        # no-unregistered-action rule

adapters/
  remix/                # Remix skeleton (createRemixAssistHandler + tests)

examples/
  nextjs-demo/          # Reference implementation

docs/                   # Documentation (what you're reading)
```

## Getting the Project Running

```bash
pnpm install

# Build the core (many things depend on it)
pnpm --filter @wayfinder/core build

# Run all tests
pnpm test

# Typecheck everything
pnpm typecheck

# Build all packages
pnpm build
```

## Running the Demo

```bash
cd examples/nextjs-demo
pnpm dev
```

The demo is configured to consume the local workspace packages.

## Common Development Commands

| Task                              | Command |
|-----------------------------------|--------|
| Build everything                  | `pnpm build` |
| Test everything                   | `pnpm test` |
| Typecheck                         | `pnpm typecheck` |
| Run CLI in dev mode               | `pnpm --filter @wayfinder/cli dev:assist -- <command>` |
| Work on a specific package        | `pnpm --filter @wayfinder/core ...` |
| Run only core tests               | `pnpm --filter @wayfinder/core test` |
| Recompile the demo graph          | `pnpm --filter @wayfinder/cli dev:assist -- compile examples/nextjs-demo` |

## Package Responsibilities

- **`@wayfinder/core`** — This is the heart of the system. Try to keep it free of framework-specific code.
- **`@wayfinder/providers`** — Thin wrappers around LLM SDKs + a good mock.
- **`@wayfinder/cli`** — Developer experience tooling. Keep it relatively lightweight.
- **`@wayfinder/widget`** — Should remain a pure Web Component with minimal dependencies.
- **`@wayfinder/adapter-nextjs`** — The most “production” code. This is where real framework integration lives (discovery, command bus, React interop, reconciliation).

## Branding and Logo Assets

The official logos are in the `logos/` directory:

- `logo.svg` — Primary horizontal lockup ("Code Lines to Chat" concept)
- `icon.svg` — Icon-only version (for favicons, avatars)
- Various PNG exports (512, 256, 192, 180, 128, 32, 16)
- `favicon.svg`, `favicon-*.png`, `apple-touch-icon.png`, `android-chrome-*.png`

When updating the logo:
- Regenerate PNGs using `rsvg-convert` (see package scripts or manual).
- Update references in `README.md` and `docs/`.
- Ensure the design continues to represent **intelligent, zero-annotation AI chat** (code → chat bubble → emergent guidance path).

## Making Changes to the Graph Schema

The schema lives in `@wayfinder/core/src/schema/graph.ts`.

When you change it:

1. Update the Zod schema + inferred types.
2. Update `validateGraph` if referential integrity rules change.
3. Run `pnpm --filter @wayfinder/core schema:emit` to update the committed JSON Schema.
4. Make sure all tests still pass (especially the byte-identical schema test).

## The Compile Cache

Be careful when changing hashing or redaction logic. It can invalidate caches for everyone.

When you intentionally change the format of compiled output, consider bumping the cache invalidation strategy or documenting a “nuke the cache” step.

## Testing Strategy

- Unit tests for core logic live next to the code (`*.test.ts`).
- The demo acts as an integration test surface.
- The `gate` command is itself a test that the committed graph matches current source.

When adding new LLM behavior, prefer adding it behind the mock provider first so tests remain deterministic.

## Documentation

Documentation lives in the `docs/` folder and is linked from the root `README.md`.

When you add a significant feature, please:
- Update or add a doc in `docs/`
- Make sure the root README still gives a good overview

## Release Process (Future)

For now the project is developed in the monorepo. When we are ready to publish:

- Packages will be published under the `@wayfinder/*` scope.
- The `assist` binary will come from `@wayfinder/cli`.
- We will likely provide a better `npx` experience.

## Code Style & Conventions

- TypeScript strict mode.
- Prefer clear naming over cleverness.
- Keep security-sensitive logic (persona filtering, validation, redaction) easy to audit.
- The runtime should never send source code to an LLM — only the compiled graph + user queries.

## Where to Start Contributing

Good first areas:

- Improve route discovery for more complex Next.js patterns (parallel routes, intercepting routes, etc.).
- Add better transition extraction (AST-based instead of regex).
- Improve the quality of the mock provider’s responses.
- Add a real lightweight reconciliation report that doesn’t require Playwright.
- Write more end-to-end tests against the demo.

## Questions?

Feel free to open issues or discussions. The design thinking is reflected throughout the documentation in this folder.