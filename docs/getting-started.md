# Getting Started

<img src="../logos/logo.svg" alt="Wayfinder" width="240" />

This guide will help you understand Wayfinder and get the demo running quickly.

## What is Wayfinder?

Wayfinder is a framework that adds AI-powered assistance to SaaS products with minimal developer effort.

Instead of writing documentation or building custom tours, you run a CLI that **analyzes your application** and generates a structured **capability graph**. This graph powers:

- **Proactive onboarding** — Personalized checklists and guided tours for new users based on their role.
- **Reactive help** — A chat widget that can answer questions like “Where do I enter X?” or “How do I do Y?” and guide (or drive) the user to the right place in the UI.

The system is designed around three core ideas:

1. **Zero-annotation by default** — It should work without you decorating every component.
2. **Drift-proof** — If you add a new page or field and don’t recompile, the system will complain.
3. **Real UI, not screenshots** — Guidance happens on your actual interface.

## Prerequisites

- Node.js 18+
- pnpm (recommended workspace manager)

## Try the Demo

The easiest way to experience Wayfinder is to run the included Next.js demo.

```bash
# From the root of the monorepo
pnpm install

# Build the core (required before running the demo)
pnpm --filter @wayfinder/core build

# Start the demo
cd examples/nextjs-demo
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You should see a floating chat button. Try asking:

- “How do I log a donor offer?”
- “Where is the terminal creatinine field?”

The assistant will respond using the capability graph generated for the demo.

## What Just Happened?

Behind the scenes, the following occurred:

1. A deterministic **discover** step walked the demo’s routes and components.
2. A **compile** step (using a mock LLM provider) generated descriptions, steps, and suggested tasks.
3. The resulting `capability_graph.json` was committed and is served at runtime.
4. The `<assist-widget>` (a Web Component) talks to a small API route that uses the runtime matcher + handler from `@wayfinder/core`.

This same flow is what you would run against *your* application.

## Next Steps

- Read the [Integration Guide](./integration.md) to learn how to add Wayfinder to a real SaaS app.
- Explore the [Concepts](./concepts.md) to understand the capability graph model.
- Look at the [Architecture](./architecture.md) for a deeper technical overview.

## Project Structure (High Level)

```
packages/
  core/              # Schema, runtime, graph validation
  cli/               # `assist` command line tool
  providers/         # OpenAI, Anthropic, Ollama, and mock providers
  widget/            # Framework-agnostic <assist-widget> Web Component
  adapter-nextjs/    # Next.js integration (discover, React wrapper, etc.)

examples/nextjs-demo/   # Reference implementation
```

---

Ready to integrate Wayfinder into your own product? Continue with the [Integration Guide](./integration.md).