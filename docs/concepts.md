# Core Concepts

This document explains the fundamental ideas behind Wayfinder.

## The Capability Graph

At the heart of Wayfinder is the **capability graph** — a structured JSON representation of what users can do in your application.

It contains:

- **Pages** — Routes or screens in your app, along with which personas can see them.
- **Actions** — Things users can do (e.g., “Create donor”, “Export report”).
- **Fields** — Important data entry points (“Terminal Creatinine”, “Invoice amount”).
- **Transitions** — How users move between pages (e.g., Inbox → Create Donor).
- **Tasks** — Suggested or annotated sequences of actions for proactive onboarding (`source: "suggested"` or `"annotated"`).

Example (simplified):

```json
{
  "pages": [
    { "routeKey": "/donors", "title": "Donor Records", "personas": ["intake_admin"] }
  ],
  "actions": [
    {
      "id": "donors.create",
      "route": "/donors",
      "label": "Log a new donor offer",
      "personas": ["intake_admin"],
      "effect": "write",
      "steps": ["Open Donor Records", "Click Create", "Fill form", "Save"]
    }
  ],
  "fields": [...],
  "transitions": [...],
  "tasks": [...]
}
```

### Why a Graph?

Traditional help systems are just bags of articles or videos. A graph lets the system understand:

- What the user can see (persona filtering)
- Where things live (page + tab + field)
- Reasonable sequences of work (tasks)
- Safe vs unsafe operations (effect: navigate | open | write)

## Zero-Annotation Default

Wayfinder’s design philosophy is **auto-discovery first**.

You should be able to drop Wayfinder into a codebase and get useful results without wrapping every button or annotating every route.

There are two ways knowledge enters the graph:

1. **Auto-discovery** (default) — The `discover` step walks your routes, forms, and navigation configuration. `deriveAvailable` marks pages behind obvious feature flags or `_`-prefixed routes as `available: false`.
2. **Annotations** (optional, progressive enhancement) — Using `defineAction()` and `defineTask()` (via an `assist-annotations.*` file) for higher fidelity and agentic behavior on important flows. Annotations are merged **last** and win.

Reconciliation (`assist reconcile`) compares the live UI per persona against the graph to surface gaps.

## Compile Pipeline

The graph is not generated at runtime. It goes through a deliberate compile step:

### 1. Discover (Deterministic)

- Enumerates pages/routes
- Extracts basic persona visibility
- Pulls out static transitions (links, router calls)
- Produces a `manifest.json` with source hashes

No LLM is involved.

### 2. Compile (LLM + Caching)

Two sub-stages:

- **Per-route compilation**: For each changed route, an LLM generates descriptions, steps, field information, and synonyms.
- **Global flow pass**: After per-route work, a second LLM pass looks at actions + transitions across the app and proposes onboarding **tasks**.

Because of source hashing:
- Unchanged routes are never re-sent to the LLM.
- CI only needs to check that the current source hashes exist in the cache (`assist gate`).

This is what makes the system “drift-proof”.

## Runtime Behavior

At runtime, your application only needs to:

1. Load the committed `capability_graph.json`.
2. Expose a `POST /assist/chat` endpoint.
3. Mount the widget.

When a user sends a message:

1. **Persona filter** is applied first (security boundary).
2. **Deterministic matcher** tries to answer immediately (exact matches, synonyms, simple navigation).
3. If uncertain, a small **LLM call** is made against only the allowed candidates.
4. The response is validated and returned as one of several kinds:
   - `guide`
   - `navigate`
   - `field`
   - `disambiguate`
   - `drive`
   - `refuse`

## Proactive vs Reactive

Wayfinder deliberately supports both modes from the same graph.

### Proactive (Onboarding)

- On first login, the system looks at the user’s persona.
- It presents “do this first” tasks.
- Clicking a task can start a guided tour that highlights real UI elements.

### Reactive (Assistant)

- User opens the chat widget at any time.
- They ask natural questions.
- The system guides them (or drives the UI).

The same underlying data powers both experiences.

## Personas and Safety

**Personas** are the primary security mechanism.

- Every page, action, and field declares which personas can see it.
- At runtime, the user’s actual roles (resolved server-side) are used to filter the graph.
- If filtering fails or returns nothing, the user sees almost nothing (fail closed).

This is different from most chatbots, which tend to show everything and then try to refuse at the prompt level.

## Agentic Execution (Optional)

Actions can optionally declare an `execution` handler.

When present and the confidence is high enough, the assistant can move beyond “tell the user what to do” and actually perform actions (open a modal with prefilled data, navigate with context, etc.).

This is **always**:
- Gated behind confidence checks
- Never auto-submits write actions
- Behind a kill switch (`ASSIST_AGENTIC_ENABLED`)

## Reconciliation

One of the most important (and unique) ideas in Wayfinder is **reconciliation**.

The system can walk your live application (using Playwright in the Next.js adapter) and compare what actually exists in the UI against what’s in the capability graph.

This gives you:
- Confidence that “it knows your app”
- Early detection when you ship UI that the assistant doesn’t understand
- A path from “report mode” to “CI gate mode”

---

These concepts are implemented across the packages in this monorepo. See [Architecture](./architecture.md) for the concrete pipeline and component breakdown.