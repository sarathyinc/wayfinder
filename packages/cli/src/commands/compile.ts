import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createProvider } from "@wayfinder/providers";
import {
  loadGraph,
  computeGraphStructureHash,
  type CapabilityGraph,
  deriveAvailable,
} from "@wayfinder/core";
import { discoverCommand } from "./discover.js";

export async function compileCommand(
  dir = ".",
  options: { provider?: string } = {},
) {
  const root = dir;
  const providerName = (options.provider || "mock") as
    "mock" | "openai" | "anthropic" | "ollama";
  console.log(`[assist] Compiling with provider: ${providerName}`);

  const manifest = await discoverCommand(root);

  const provider = createProvider({ provider: providerName });

  const cachePath = join(root, ".assist", "compile_cache.json");
  let cache: any = { routes: {}, tasks: undefined };
  try {
    cache = JSON.parse(readFileSync(cachePath, "utf8"));
  } catch {}

  const pages: any[] = [];
  const actions: any[] = [];
  const fields: any[] = [];
  const transitions = manifest.transitions;

  for (const r of manifest.routes) {
    const cached = cache.routes?.[r.sourceHash];
    const available = deriveAvailable(r.routeKey, r.sourceBundle);

    if (cached) {
      // use cache
      pages.push({
        routeKey: r.routeKey,
        title: r.title || r.routeKey,
        personas: r.personas,
        available,
      });
      actions.push({
        id: `${r.routeKey}.view`,
        route: r.routeKey,
        label: r.title || "View",
        personas: r.personas,
        effect: "navigate",
        params: [],
        synonyms: [],
        steps: cached.steps || [],
        spotlight: [],
      });
      continue;
    }

    const compiled = await provider.compilePerRoute({
      routeKey: r.routeKey,
      source: r.sourceBundle,
      filePaths: r.filePaths,
    });
    cache.routes[r.sourceHash] = compiled;

    pages.push({
      routeKey: r.routeKey,
      title: r.title || r.routeKey,
      personas: r.personas,
      available,
    });
    actions.push({
      id: `${r.routeKey.replace(/\//g, ".")}.view`,
      route: r.routeKey,
      label: compiled.description || r.routeKey,
      personas: r.personas,
      effect: "navigate",
      params: [],
      synonyms: compiled.synonyms || [],
      steps: compiled.steps || [],
      spotlight: [],
    });
  }

  // Always run flow pass for Phase 2 (suggested tasks)
  const suggested = await provider.suggestTasks({
    actions: actions.map((a) => ({
      id: a.id,
      route: a.route,
      personas: a.personas,
    })),
    transitions,
    personas: ["user", "intake_admin", "admin"],
  });
  const tasks = suggested.map((s) => ({ ...s, source: "suggested" as const }));
  cache.tasks = { structureHash: "demo", tasks };

  const finalTasks =
    tasks.length > 0
      ? tasks
      : [
          {
            id: "first-donor-offer",
            title: "Log your first donor offer",
            personas: ["intake_admin"],
            goal: "Get a donor offer into the system",
            sequence:
              actions.length > 1
                ? [actions[0].id, actions[1]?.id || actions[0].id]
                : [],
            source: "suggested" as const,
            confidence: 0.7,
          },
        ];

  const graph: CapabilityGraph = {
    version: 2,
    defaultLocale: "en",
    pages,
    actions,
    fields,
    transitions,
    tasks: finalTasks,
  };

  mkdirSync(join(root, ".assist"), { recursive: true });
  writeFileSync(
    join(root, "capability_graph.json"),
    JSON.stringify(graph, null, 2) + "\n",
  );
  writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n");

  console.log(
    `[assist] Wrote capability_graph.json with ${actions.length} actions and ${finalTasks.length} tasks.`,
  );
}
