# CLI Reference

The Wayfinder CLI (`assist`) is the main developer tool for working with the framework.

## Installation (Current Development State)

While the package is not yet published, you typically run it from the monorepo:

```bash
pnpm --filter @wayfinder/cli dev:assist -- <command>
```

Once published, the intended usage will be:

```bash
npx @wayfinder/cli assist <command>
# or after global install
assist <command>
```

The binary name is `assist`.

## Commands

### `assist init [dir]`

Initializes Wayfinder in a project.

```bash
assist init .
assist init ./my-app --provider mock
```

What it does:
- Creates `.assist/config.json`
- Helps choose a provider
- Can optionally run an initial `discover` + `compile`

### `assist discover [dir]`

Runs the deterministic discovery step only.

Useful for debugging what the system sees in your codebase.

Output is a manifest of routes, personas, and source hashes.

### `assist compile [dir]`

The main command.

- Runs discovery
- Compiles changed routes using the configured LLM provider
- Runs the global flow pass for suggested tasks
- Writes `capability_graph.json` and updates the cache

Examples:

```bash
assist compile
assist compile . --provider openai
```

This is the command you will run locally and in CI (via a dispatch or scheduled job when using real providers).

### `assist gate [dir]`

A purely deterministic check.

It verifies that every current source hash from discovery exists in the committed compile cache.

If anything is missing, it fails with a message like:

> source changed; run 'assist compile' and commit

This command requires **no LLM key** and is safe (and fast) to run on every pull request.

### `assist reconcile [dir]`

Runs the reconciliation harness (report mode) against a running application.

```bash
assist reconcile .
assist reconcile . --base-url http://localhost:3000 --personas intake_admin,admin
```

What it does:
- Loads `capability_graph.json`
- For each persona, uses Playwright (via `@wayfinder/adapter-nextjs`) to walk routes and snapshot actionable controls
- Diffs against the persona-filtered graph slice
- Writes `coverage-report.json` and `coverage-report.md`

Findings:
- `missing` — live control not present in the graph (actionable)
- `stale_spotlight` — `spotlight` selector in graph does not resolve on the page
- `orphaned` — graph entry with no corresponding live control (warning only)

**Requirements:** Playwright and `@wayfinder/adapter-nextjs` must be available. The app must be running at `--base-url`.

This is the mechanism that makes "it knows your app" verifiable (see design spec §13). Gate mode (CI-failing on `missing`) is planned for a future milestone.

## Configuration

The CLI looks for configuration in `.assist/config.json` (relative to the target directory).

Example:

```json
{
  "provider": "mock",
  "adapter": "nextjs"
}
```

For real providers you will usually pass the provider via environment variables or flags rather than committing keys.

## Annotations (Progressive Enhancement)

For higher fidelity or agentic execution on important paths, create an annotations file next to your project root (or in `src/`):

- `assist-annotations.ts` (or `.js`)
- `src/assist-annotations.ts` (or `.js`)

Inside it:

```ts
import { defineAction, defineTask } from "@wayfinder/core";

defineAction({
  id: "donors.create",
  route: "/donors",
  label: "Log a new donor offer",
  effect: "write",
  personas: ["intake_admin", "admin"],
  steps: ["Open Donor Records", "Click Create", "Fill form", "Save"],
  spotlight: ["[data-testid='donors-create-button']"],
  // execution descriptor + run() for agentic drive (Phase 3)
});

defineTask({
  id: "first-donor-offer",
  title: "Log your first donor offer",
  personas: ["intake_admin"],
  sequence: ["inbox.view", "donors.create"],
});
```

During `assist compile` (and `assist gate` for hash consistency) the CLI loads the first matching file, executes the `define*` calls to populate the registry, and **merges last** — annotated values override LLM-generated ones for the same `id`, and tasks receive `source: "annotated"`.

See the design spec §7 and core `annotations.ts`.

## Providers

Supported providers (via `@wayfinder/providers`):

- `mock` — No network calls, good for development and CI
- `ollama` — Local models (keyless)
- `openai`
- `anthropic`

You can switch providers between runs. The cache is keyed by source content, not by provider.

## Caching Behavior

Wayfinder uses source-hash caching so the LLM is only invoked for what changed:

- **Per-route cache** (in `.assist/compile_cache.json`): keyed by `sourceHash` of the redacted source bundle for a route. Unchanged routes reuse prior LLM output.
- **Task / flow-pass cache**: keyed by a **graph structure hash** (`computeGraphStructureHash`) computed over sorted actions + transitions + personas (after annotation merge). The flow pass (`suggestTasks`) only runs when this hash changes.

The drift gate (`assist gate`) asserts that every current route hash **and** the current structure hash are present in the cache. No LLM runs in the gate.

See design spec §6 for the rationale (LLM nondeterminism makes naive `git diff` on regenerated output unsafe).

## Common Workflows

### Local development

```bash
assist compile
```

Run this whenever you significantly change UI structure.

### Pull request checks

```bash
assist gate
```

Add this to CI. It will fail the build if the graph is out of date.

### Trust / coverage checks (local)

```bash
# Start your app
pnpm dev

# In another terminal
assist reconcile . --base-url http://localhost:3000 --personas intake_admin
```

Produces `coverage-report.md` and `.json`. Use to find pages/controls the graph is missing.

Reconciliation gate mode (blocking CI) is on the roadmap.

### Using a real provider safely

Never run real LLM providers in regular PR CI.

Recommended pattern:

- Use `mock` in normal CI + `assist gate`
- Use a real provider only via `workflow_dispatch`, on a schedule, or on specific branches with secrets.

## Tips

- Start with the `mock` provider. It is surprisingly effective for getting the shape of the system working.
- The quality of discovery (and therefore the graph) depends heavily on how clean and conventional your routing + permission code is.
- You can (and should) use `defineAction` and `defineTask` on your most important flows even if you rely on auto-discovery everywhere else.

## Related Commands in the Demo

In `examples/nextjs-demo/package.json` you may see scripts like:

```json
{
  "assist:compile": "pnpm --filter @wayfinder/cli run dev:assist -- compile ."
}
```

These are just convenience wrappers for the monorepo development workflow.