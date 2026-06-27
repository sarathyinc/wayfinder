# @wayfinder/core

<img src="../../logos/icon-128.png" alt="Wayfinder" width="64" style="vertical-align: middle;" />

The normative capability-graph schema and validation library for the Wayfinder AI-onboarding framework.

`@wayfinder/core` owns the single source of truth for the `CapabilityGraph` data model — the Zod schema that produces TypeScript types and a JSON Schema artifact — plus the `validateGraph` / `loadGraph` runtime that enforces both structural and referential integrity.

## Install

```bash
pnpm add @wayfinder/core
```

## Usage

```ts
import { loadGraph } from "@wayfinder/core";
import { readFileSync } from "node:fs";

const result = loadGraph(readFileSync("capability_graph.json", "utf8"));
if (!result.ok) {
  for (const e of result.errors) console.error(`[${e.code}] ${e.message}`);
  process.exit(1);
}
const graph = result.graph; // fully typed CapabilityGraph
```

## GraphErrorCode values

| Code                      | Meaning                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `schema`                  | The JSON did not parse or failed Zod validation                  |
| `duplicate_action_id`     | Two actions share the same `id`                                  |
| `duplicate_route_key`     | Two pages share the same `routeKey`                              |
| `unknown_action_route`    | An action's `route` does not match any page `routeKey`           |
| `unknown_transition_via`  | A transition's `via` does not match any action `id`              |
| `unknown_transition_page` | A transition's `from` or `to` does not match any page `routeKey` |
| `unknown_task_action`     | A task `sequence` entry does not match any action `id`           |
| `unknown_field_page`      | A field's `page` does not match any page `routeKey`              |

## JSON Schema

The machine-readable JSON Schema for `CapabilityGraph` is published as a package asset:

```
@wayfinder/core/schema/capability-graph.schema.json
```

It can be used with any JSON Schema validator or editor integration independently of the TypeScript runtime.
