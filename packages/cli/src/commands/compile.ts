import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createProvider } from "@wayfinder/providers";
import {
  loadGraph,
  computeGraphStructureHash,
  type CapabilityGraph,
  type CompileProvider,
  deriveAvailable,
} from "@wayfinder/core";
import { discoverCommand } from "./discover.js";

export async function compileCommand(
  dir = ".",
  options: { provider?: string; _provider?: CompileProvider } = {},
) {
  const root = dir;
  const providerName = (options.provider || "mock") as
    "mock" | "openai" | "anthropic" | "ollama";
  console.log(`[assist] Compiling with provider: ${providerName}`);

  const manifest = await discoverCommand(root);

  const provider: CompileProvider =
    options._provider ?? createProvider({ provider: providerName });

  const cachePath = join(root, ".assist", "compile_cache.json");
  let cache: {
    routes: Record<string, unknown>;
    tasks?: { structureHash: string; tasks: unknown[] };
  } = { routes: {}, tasks: undefined };
  try {
    cache = JSON.parse(readFileSync(cachePath, "utf8"));
  } catch {}

  const pages: CapabilityGraph["pages"] = [];
  const actions: CapabilityGraph["actions"] = [];
  const fields: CapabilityGraph["fields"] = [];
  const transitions = manifest.transitions;

  for (const r of manifest.routes) {
    const cached = cache.routes?.[r.sourceHash] as
      { steps?: string[] } | undefined;
    const available = deriveAvailable(r.routeKey, r.sourceBundle);

    const actionId = `${r.routeKey.replace(/\//g, ".")}.view`.replace(
      /^\./,
      "",
    );

    if (cached) {
      // use cache
      pages.push({
        routeKey: r.routeKey,
        title: r.title || r.routeKey,
        personas: r.personas,
        available,
      });
      actions.push({
        id: actionId,
        route: r.routeKey,
        label: r.title || "View",
        personas: r.personas,
        effect: "navigate",
        params: [],
        synonyms: [],
        steps: cached.steps || [],
        spotlight: [],
        execution: null,
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
      id: actionId,
      route: r.routeKey,
      label: compiled.description || r.routeKey,
      personas: r.personas,
      effect: "navigate",
      params: [],
      synonyms: compiled.synonyms || [],
      steps: compiled.steps || [],
      spotlight: [],
      execution: null,
    });
  }

  // Compute real structure hash from the built graph structure
  const structureHash = computeGraphStructureHash({
    version: 2,
    defaultLocale: "en",
    pages,
    actions,
    fields,
    transitions,
    tasks: [],
  });

  // Only re-run flow pass when structure has changed
  if (cache.tasks?.structureHash !== structureHash) {
    const suggested = await provider.suggestTasks({
      actions: actions.map((a) => ({
        id: a.id,
        route: a.route,
        personas: a.personas,
      })),
      transitions,
      personas: ["user", "intake_admin", "admin"],
    });
    cache.tasks = {
      structureHash,
      tasks: suggested.map((s) => ({ ...s, source: "suggested" as const })),
    };
  }

  const finalTasks = (cache.tasks?.tasks ?? []) as CapabilityGraph["tasks"];

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
