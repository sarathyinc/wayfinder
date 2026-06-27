# Remix Adapter

Skeleton + runtime handler for [Remix](https://remix.run) apps.

## Current Status

- Runtime handler: `createRemixAssistHandler({ graph, provider, getPersonas })` — compatible with Remix `action` functions.
- Session extraction: reads `session` cookie or `Authorization` header (same convention as Next.js adapter).
- Delegates to core `handleAssistChat` with server-resolved personas (client `persona` ignored).
- Has basic test coverage (`handler.test.ts`).
- Does **not** yet include a Remix-specific `discover` implementation or example app.

The handler can be used immediately for the chat endpoint once you produce a `capability_graph.json` (via core discovery or manual construction).

## Usage

```ts
// app/routes/api.assist.chat.ts (or your action route)
import { createRemixAssistHandler } from "@wayfinder/adapter-remix";
import { loadGraph } from "@wayfinder/core";
import { createProvider } from "@wayfinder/providers";

const graph = loadGraph(/* ... */).graph;
const provider = createProvider({ provider: "mock" });

export const action = createRemixAssistHandler({
  graph,
  provider,
  getPersonas: (session) => {
    // resolve from your Remix session / auth
    return ["user"];
  },
});
```

## What still needs work

- Remix route discovery (equivalent of `discoverNextjsRoutes`)
- Example Remix app in the repo
- Optional React wrapper / Web Component mounting guidance specific to Remix

See the [Integration Guide](../../docs/integration.md) and design spec for the adapter contract.

Contributions welcome!
