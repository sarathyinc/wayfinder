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

When using `DRIVE` responses (agent can perform actions):

- Requires explicit `defineAction` with execution descriptors
- High confidence threshold
- Write actions (`effect: "write"`) **never auto-submit**
- Behind `ASSIST_AGENTIC_ENABLED` kill switch
- Your existing permission checks still apply

## Recommended Practices

### For the Chat Endpoint

```ts
// Always resolve persona server-side
const personas = await getPersonasFromAuthSession(req);

// Never trust client input for persona
const response = await handleAssistChat(body, {
  graph,
  provider,
  getPersonas: () => personas,   // ← this is critical
});
```

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