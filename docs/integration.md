# Integration Guide

<img src="../logos/logo.svg" alt="Wayfinder" width="240" />

This guide explains how to add Wayfinder to an existing SaaS application.

## Overview

Integrating Wayfinder typically involves four steps:

1. **Initialize** the project using the CLI.
2. **Discover + Compile** your application to generate the capability graph.
3. **Mount the widget** in your frontend.
4. **Expose a chat endpoint** in your backend.

The goal is to reach a state where running `assist compile` and restarting your app gives users an assistant that “already knows” your product.

## Step 1: Initialize

From your project root, run:

```bash
pnpm --filter @wayfinder/cli dev:assist -- init .
```

This will:
- Create a `.assist/` directory with basic configuration.
- Help you choose an LLM provider (mock is safest for initial testing).
- Optionally run an initial discover + compile.

> **Note:** The exact command may change once the package is published. Eventually it should be possible to run `npx @wayfinder/cli assist init`.

## Step 2: Generate the Capability Graph

Wayfinder works by analyzing your code and producing a `capability_graph.json` file.

Run:

```bash
pnpm --filter @wayfinder/cli dev:assist -- compile .
```

This performs two main phases:

- **Discover** (deterministic): Walks your routes/pages and extracts basic structure.
- **Compile** (LLM): Generates human-friendly labels, steps, synonyms, and suggested onboarding tasks.

The output artifacts are:
- `capability_graph.json` (committed — this is the source of truth at runtime)
- `.assist/compile_cache.json` (helps avoid re-compiling unchanged files)

### Important: Commit the Graph

You should commit `capability_graph.json` (and usually the cache) to your repository. This is intentional:

- The graph is the compiled “knowledge” of your app.
- CI can run the drift gate (`assist gate`) to ensure the graph is up to date when code changes.
- You can run `assist reconcile` (with the app running) to produce coverage reports that surface controls missing from the graph.

See [CLI Reference](./cli.md) and the design spec §13.

## Step 3: Add the Widget

### Using the Web Component (any framework)

```html
<script type="module">
  import '@wayfinder/widget';
</script>

<assist-widget></assist-widget>
```

### Using the React Wrapper (Next.js)

In your root layout (or a client component):

```tsx
import { AssistWidget } from '@wayfinder/adapter-nextjs/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <AssistWidget 
          endpoint="/api/assist/chat" 
          // Optional: point at a route that returns the persona's tasks + graphHash
          // tasksEndpoint="/api/assist/tasks" 
        />
      </body>
    </html>
  );
}
```

The widget supports `data-endpoint` and `data-tasks-endpoint` attributes when using the Web Component directly.

## Step 4: Create the Chat Endpoint

The widget needs a backend endpoint that implements the runtime contract.

### Next.js App Router Example (recommended)

Use the adapter helper — it handles session extraction and calls the core handler with the correct `(req, session, ctx)` signature:

```ts
// app/api/assist/chat/route.ts
import { createAssistHandler, defaultPersonaResolver } from "@wayfinder/adapter-nextjs";
import { createProvider } from "@wayfinder/providers";
import { loadGraph } from "@wayfinder/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const graph = loadGraph(
  readFileSync(join(process.cwd(), "capability_graph.json"), "utf8")
).graph;

const provider = createProvider({ provider: "mock" });

export const POST = createAssistHandler({
  graph,
  provider,
  getPersonas: (session) => {
    // Resolve from real auth. For demo/open use:
    if (!session) return ["intake_admin"];
    return defaultPersonaResolver(session);
  },
});
```

Direct use of `handleAssistChat(req, session, ctx)` is also supported for custom servers.

### Persona Resolution (Security)

Persona filtering is a **security boundary** (fail-closed). The handler derives personas server-side from the authenticated session. Client-supplied `persona` in the request body (if any) is ignored. If the resolver returns `[]` or throws, the user receives a refuse response and sees no capabilities.

Typical patterns:
- Read roles from your auth session / JWT.
- Map your internal roles to the personas defined in your capability graph.
- If you cannot determine personas, return an empty visible set (fail closed).

## Step 5: Run Compile in Your Workflow

### Local development

```bash
pnpm --filter @wayfinder/cli dev:assist -- compile .
```

### CI / PRs

Add a step that runs the gate:

```bash
pnpm --filter @wayfinder/cli dev:assist -- gate .
```

This fails if source changed but the graph was not recompiled.

### Production

You have two main options:

1. **Commit the graph** (recommended for most teams).
2. Run compile as part of your build or as a separate deployment step (if using real LLM providers).

## Optional: Enable Agentic Actions (Phase 3)

If you want the assistant to be able to *do* things (open modals, prefill forms), you can:

1. Use `defineAction()` in your code (see annotation layer).
2. Implement the command bus in your application (the Next.js adapter provides a basic one).

Agentic execution is deliberately **opt-in** and gated.

## Recommended Project Layout

```
your-saas/
├── capability_graph.json          # Committed
├── .assist/
│   └── compile_cache.json         # Usually committed
├── app/
│   └── api/assist/chat/route.ts   # Thin adapter
├── lib/
│   └── assist.ts                  # Graph loader + provider factory
└── components/
    └── AssistWidget.tsx
```

## Next Steps

- Read [Core Concepts](./concepts.md) to understand the data model.
- See [Architecture](./architecture.md) for the full pipeline.
- Check the [CLI Reference](./cli.md) for all available commands.

---

Have questions about a specific framework (Remix, Rails, Django, etc.)? The core is designed to be adapter-friendly — contributions are welcome.