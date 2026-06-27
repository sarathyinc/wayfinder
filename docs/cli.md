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

### `assist reconcile` (future / partial)

In the flagship Next.js adapter, there will be support for running reconciliation reports that compare the live UI against the graph.

Currently this is exposed more as a library capability than a first-class CLI command.

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

## Providers

Supported providers (via `@wayfinder/providers`):

- `mock` — No network calls, good for development and CI
- `ollama` — Local models (keyless)
- `openai`
- `anthropic`

You can switch providers between runs. The cache is keyed by source content, not by provider.

## Caching Behavior

Wayfinder uses two levels of caching:

- **Per-route cache**: keyed by the hash of the (redacted) source for that route.
- **Task cache**: keyed by the structure hash of the graph (actions + transitions + personas).

This means:
- Adding a new page only compiles that page.
- Changing navigation that affects many transitions may trigger a new flow pass for tasks.

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