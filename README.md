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
