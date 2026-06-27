# Architecture

<img src="../logos/logo.svg" alt="Wayfinder" width="240" />

This document describes how Wayfinder is structured, both conceptually and in code.

## High-Level Flow

```
Your Source Code
      │
      ▼
┌─────────────────────┐
│   adapter.discover()│   ← deterministic
└─────────────────────┘
      │
      ▼
   manifest.json
      │
      ▼
┌─────────────────────┐
│   assist compile    │   ← LLM (cached by source hash)
└─────────────────────┘
      │
      ▼
capability_graph.json  +  compile_cache.json
      │
      ├──────────────────────┐
      ▼                      ▼
Runtime (server handler + persona filter)   Widget (proactive checklist + reactive chat + tour)
```

Reconciliation (Playwright harness) can be run against the live app + graph to produce coverage reports proving fidelity.

## The Three Main Stages

### 1. Discovery (Deterministic)

Performed by the framework adapter for a specific stack (e.g. `@wayfinder/adapter-nextjs`).

Responsibilities:
- Enumerate routes / pages
- Determine which personas can access each route (from your nav/RBAC config)
- Extract static transitions (links, `router.push`, etc.)
- Bundle relevant source for each route
- Compute stable `sourceHash` values

Output: `manifest.json`

No LLM calls happen here.

### 2. Compilation (LLM-powered, cached)

Run via the CLI (`assist compile`).

Two phases:

**2a. Per-route compilation**
- For every route whose `sourceHash` is not in the cache, send the (redacted) source to an LLM.
- Ask for: description, steps, relevant fields, synonyms.
- Store the result keyed by `sourceHash`.

**2b. Global flow pass**
- After per-route work, run one pass over the *graph structure* (actions + transitions + personas).
- Ask the LLM to propose sensible onboarding **tasks**.
- This is cached by structure hash, not per-route hash.

Only changed content is sent to the LLM. This is the main reason the system stays cheap and predictable.

Output:
- `capability_graph.json` (committed)
- `.assist/compile_cache.json` (usually committed)

### 3. Runtime

At runtime your application only consumes the committed graph.

Typical flow for a user message:

1. Server resolves the user’s personas from the session (never from the client).
2. The graph is filtered to only what those personas can see.
3. A deterministic matcher runs first (very fast, high precision).
4. If it can’t answer confidently, a small LLM call is made against the filtered candidates only.
5. The result is validated and returned as a typed response.

The widget is deliberately thin — it just renders the response and triggers navigation/highlighting.

## Key Components

| Component                  | Location                        | Responsibility |
|---------------------------|----------------------------------|----------------|
| Capability Graph Schema   | `@wayfinder/core`               | Zod schema + TypeScript types + JSON Schema |
| Graph Validation & Loading| `@wayfinder/core`               | `validateGraph`, `loadGraph`, referential integrity |
| Discover Primitives       | `@wayfinder/core` (src/discover)| Hashing, redaction helpers, basic transition extraction |
| Runtime Handler           | `@wayfinder/core`               | `handleAssistChat` + persona filtering + deterministic matcher |
| LLM Providers             | `@wayfinder/providers`          | OpenAI, Anthropic, Ollama, Mock |
| CLI                       | `@wayfinder/cli`                | `init`, `discover`, `compile`, `gate` |
| Widget                    | `@wayfinder/widget`             | `<assist-widget>` Web Component |
| Next.js Adapter           | `@wayfinder/adapter-nextjs`     | Next-specific discovery, React wrapper, command bus |

## The Capability Graph at Runtime

Your backend typically does something like:

```ts
import { loadGraph, handleAssistChat } from '@wayfinder/core';
import { createProvider } from '@wayfinder/providers';

const graph = loadGraph(
  readFileSync('./capability_graph.json', 'utf8')
).graph;

const provider = createProvider({ provider: 'mock' });

app.post('/assist/chat', async (req, res) => {
  const personas = getPersonasFromSession(req); // critical
  const response = await handleAssistChat(req.body, {
    graph,
    provider,
    getPersonas: () => personas,
  });
  res.json(response);
});
```

## Response Kinds

The runtime returns a discriminated union:

- `guide` — Show steps + optionally spotlight an element
- `navigate` — Navigate the user somewhere
- `field` — Point to a specific field on a page/tab
- `disambiguate` — Multiple good matches, ask user to choose
- `drive` — Attempt to perform an action (requires annotations + command bus)
- `refuse` — Off-topic, sensitive, or unknown

## Data Flow for Onboarding (Proactive)

1. On first login, resolve user’s persona(s).
2. Load the persona-filtered slice of the graph.
3. Find `tasks` that match the persona.
4. Render a checklist.
5. When user starts a task, the widget can walk the `sequence` of actions, using `navigate` + spotlighting.

## Agentic Execution Path (Optional)

When you use `defineAction()` with an `execution` descriptor:

- The graph carries information about how to invoke the action.
- The adapter can implement a command bus.
- High-confidence, non-write actions can trigger `drive` responses.

This path is deliberately more involved than pure guidance.

## Reconciliation (Trust Layer)

The Next.js adapter can run a Playwright-based reconciliation:

- Walk the live app as different personas.
- Compare actual UI elements against the graph.
- Produce coverage reports.
- Eventually gate on missing functionality.

This is what makes the claim “it knows your app” verifiable instead of aspirational.

## Security Boundaries

Wayfinder has several intentional hard boundaries:

- Persona filtering happens **before** any LLM sees data.
- The client never tells the server which persona it is.
- Write actions never auto-submit.
- Source is never sent at runtime (only the compiled graph + user query).
- LLM calls at runtime are limited to small candidate sets.

## Monorepo Layout

```
packages/
  core/                 # Framework-agnostic heart
  providers/            # LLM adapters
  cli/                  # Developer tooling
  widget/               # UI component (framework agnostic)
  adapter-nextjs/       # Production-ready Next.js integration
```

This structure makes it relatively straightforward to add adapters for other stacks later.

---

For a higher-level explanation of the ideas, see [Concepts](./concepts.md).