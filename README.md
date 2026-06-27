# Wayfinder

AI Assist Framework for SaaS — drop-in, zero-annotation onboarding and reactive help.

See the design spec and plan in `temp/superpowers/`.

## Quick start (demo)

```bash
pnpm install
pnpm --filter @wayfinder/core build
cd examples/nextjs-demo
pnpm dev
```

Open http://localhost:3000 and use the floating chat widget.

Ask: "how do I log a donor offer?"

## Development

All packages:

- `pnpm --filter @wayfinder/core test`
- `pnpm --filter @wayfinder/cli dev:assist -- init .`

Full build: `pnpm build`

See the full implementation plan for phases.

## CI/CD Workflows

Wayfinder ships two GitHub Actions workflows:

### Drift Gate (`drift-gate.yml`) — key-free, runs on every PR

Checks that the committed `capability_graph.json` structure hash still matches
the current source. Requires no API keys. Fails if someone changes a route without
recompiling.

### Compile (`compile.yml`) — keyed, on-demand or nightly

Re-runs the full LLM-powered compile pipeline and commits the updated graph back.
Triggered manually via `workflow_dispatch` (with optional `app_dir` input) or on
a weekly schedule.

**Setup:** add your provider API key as a repository secret named
`WAYFINDER_PROVIDER_KEY`.
