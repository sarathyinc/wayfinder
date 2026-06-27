# Frequently Asked Questions (FAQ)

## General

### What is Wayfinder?

Wayfinder is an open-source framework that adds AI-powered assistance to SaaS applications. It automatically derives a "capability graph" from your codebase and uses it to power both proactive onboarding and a reactive chat assistant.

### How is this different from a generic chatbot?

- It only knows *your* application (derived from code)
- It respects user personas/permissions by default
- It guides (and optionally drives) the actual UI
- It is designed to be drift-proof

### Do I need to annotate my entire codebase?

No. Wayfinder works with zero annotations by default through static discovery. Annotations (`defineAction` / `defineTask`) are optional for higher fidelity and agentic behavior on important flows.

## Technical

### What frameworks are supported?

- **Flagship**: Next.js (App Router) — full adapter including discovery, handler, reconciliation, React wrapper.
- **Remix**: Runtime handler skeleton (`createRemixAssistHandler`) + tests. Discovery not yet implemented.
- Others: Community adapters planned. The core is stack-agnostic JSON + documented adapter interface.

### Does it require an LLM key?

- For development and the demo: No (uses the `mock` provider)
- For higher quality output: Yes (OpenAI, Anthropic, or local Ollama)
- The LLM is **never** called in PR CI or the production build (only at deliberate compile time and at the runtime chat endpoint).

### How do I keep the graph up to date?

Run `assist compile` (or equivalent) when you change significant UI. Use `assist gate` in CI to fail builds when the graph is stale.

### Is the capability graph committed?

Yes. `capability_graph.json` is a committed artifact. This is intentional for drift detection and simplicity.

## Security & Privacy

### How is user data protected?

- Persona filtering happens server-side before any LLM sees candidates
- Source code is only sent during `compile` (never at runtime)
- Write actions never auto-submit
- You control the provider and can use local models (Ollama)

See [Security & Privacy](./security.md) for more details.

### Can the assistant perform actions on behalf of users?

Only when you explicitly enable it with annotations + the command bus, and only for high-confidence, non-write actions (by default).

## Adoption

### How do I add this to my existing SaaS?

See the [Integration Guide](./integration.md).

Typical path:
1. `assist init`
2. `assist compile`
3. Mount the widget
4. Add a thin `/assist/chat` route
5. Commit the graph

### Can I use this in production today?

The core ideas are implemented and the Next.js path is usable. However, we recommend treating it as early-stage software and testing thoroughly.

### Will there be hosted version?

Per the design spec, **no**. This is a self-hosted library/framework.

## Development

### How do I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md) and [Development Guide](./development.md).

---

Didn't find your question? Open an issue or discussion on GitHub.
