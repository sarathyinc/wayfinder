# Security & Privacy

This document covers the security model, privacy considerations, and recommended practices when using Wayfinder.

## Core Security Principles

### 1. Persona Filtering is a Security Boundary

Personas determine what a user is **allowed to know exists**.

- Filtering happens **server-side** using the authenticated session.
- The client never sends or controls the persona.
- If no personas can be determined, the user sees an empty graph (fail-closed).

This is fundamentally different from most AI chat interfaces that try to refuse via prompts after seeing all data.

### 2. Source Code Never Leaves at Runtime

- During `assist compile`, redacted source bundles may be sent to an LLM provider.
- At runtime, only the committed `capability_graph.json` + the user's natural language query are involved.
- The graph contains human-readable labels, steps, and metadata — **not** your source code.

### 3. Agentic Execution is Gated and Opt-in

When using `drive` responses (agent can perform actions):

- Requires explicit `defineAction` with an `execution` descriptor
- High confidence threshold (currently > 0.8) + `ASSIST_AGENTIC_ENABLED=1`
- Write actions (`effect: "write"`) **never auto-submit** (they prefill only)
- When the kill-switch is off (default), `drive` is suppressed and behavior is identical to `guide`
- Your existing permission checks in the app remain the final gate

See core handler and command-bus for details.

## Recommended Practices

### For the Chat Endpoint

Use the adapter helpers when possible (`createAssistHandler` / `createRemixAssistHandler`). They:

- Extract a lightweight session from cookie (`session=`) or `Authorization`
- Call your `getPersonas(session)` **server-side**
- Pass the result into `handleAssistChat(req, session, ctx)`

Client-supplied persona (if present) is ignored. Throwing or empty resolver → fail-closed refuse.

```ts
getPersonas: (session) => { ... }
```

### Verify "It Knows Your App"

Run `assist reconcile --personas <p>` (app must be running). The report identifies live controls missing from the graph and stale spotlights. This is the primary trust artifact (design spec §13).

### Redaction During Compile

The discover step should redact:
- `.env*` files
- Files containing secrets, keys, credentials
- Any user-configured globs

See `core/src/compile/redact.ts` and the CLI discovery implementation.

### Choosing an LLM Provider

| Provider   | Notes |
|------------|-------|
| `mock`     | Safest for development/CI. No data leaves |
| `ollama`   | Local. Best privacy. Quality trade-off |
| `openai`   | Sends source during compile only |
| `anthropic`| Same as above |

**Never** commit real API keys. Use environment variables or your secret manager only during deliberate compile steps.

### Rate Limiting & Abuse

The runtime chat endpoint should be:
- Authenticated
- Rate-limited per user
- Budgeted (max LLM calls per request)

A public `/assist/chat` without these protections can become an expensive proxy.

### Logging

- Do **not** log full user queries if they may contain sensitive data
- Never log raw model responses that could contain graph content + user context
- Prefer structured logging of response `kind` only

## Known Limitations / Considerations

- Auto-discovery quality depends on how conventional your routing and permission code is. Messy codebases may produce lower quality graphs.
- Suggested tasks (from the flow pass) are LLM-generated and can be imperfect. They are labeled `source: "suggested"`.
- The system is designed to refuse off-topic/sensitive queries, but LLM refusals are not 100% reliable. Combine with your own content filters if needed.

## Reporting Issues

See [SECURITY.md](../SECURITY.md) for how to report vulnerabilities responsibly.

## Comparison to Other Approaches

| Approach              | Wayfinder Behavior |
|-----------------------|--------------------|
| RAG over docs         | Graph is compiled from code, not docs |
| Computer-use agents   | Guidance-first; full puppeteering is optional fallback |
| Prompt-only assistants| Strong structural guarantees (persona filter, validation, graph) |

---

Wayfinder treats security as a first-class architectural concern rather than an afterthought. If you have feedback or find gaps, please open an issue.