import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createProvider } from "@wayfinder/providers";
import {
  loadGraph,
  computeGraphStructureHash,
  type CapabilityGraph,
  type CompileProvider,
  deriveAvailable,
  getRegisteredAnnotations,
} from "@wayfinder/core";
import { discoverCommand } from "./discover.js";

// Candidates for the host-provided annotations file, in priority order.
const ANNOTATION_CANDIDATES = [
  "assist-annotations.ts",
  "assist-annotations.js",
  "src/assist-annotations.ts",
  "src/assist-annotations.js",
];

/**
 * Locate and execute the project's annotation file (if any) so that
 * defineAction / defineTask calls populate the in-process registry.
 *
 * We use a plain dynamic import() so the loaded module shares the same module
 * realm as the CLI process (and vitest in tests). The `pathToFileURL` form
 * avoids platform-specific path issues with dynamic import on Windows/ESM.
 */
async function loadAnnotationsFile(root: string): Promise<void> {
  const { pathToFileURL } = await import("node:url");

  for (const candidate of ANNOTATION_CANDIDATES) {
    const annotationsPath = resolve(root, candidate);
    if (!existsSync(annotationsPath)) continue;

    try {
      await import(pathToFileURL(annotationsPath).href);
    } catch (err) {
      console.warn(
        `[wayfinder] Warning: failed to load annotations file "${annotationsPath}": ${err}`,
      );
      return;
    }
    return; // only load the first match
  }
}

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

  // Stash suggested tasks before annotation merge; the cache invalidation check
  // uses a temporary hash so we can re-run suggestTasks when routes change.
  const preAnnotationHash = computeGraphStructureHash({
    version: 2,
    defaultLocale: "en",
    pages,
    actions,
    fields,
    transitions,
    tasks: [],
  });

  // Only re-run flow pass when structure has changed
  if (cache.tasks?.structureHash !== preAnnotationHash) {
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
      structureHash: preAnnotationHash,
      tasks: suggested.map((s) => ({ ...s, source: "suggested" as const })),
    };
  }

  const finalTasks = (cache.tasks?.tasks ?? []) as CapabilityGraph["tasks"];

  // ---------------------------------------------------------------------------
  // Annotation merge (G7): load annotations file and apply overrides last
  // ---------------------------------------------------------------------------
  await loadAnnotationsFile(root);
  const { actions: annotatedActions, tasks: annotatedTasks } =
    getRegisteredAnnotations();

  // Apply action annotation overrides
  for (const ann of Object.values(annotatedActions)) {
    const idx = actions.findIndex((a) => a.id === ann.id);
    const existing = idx !== -1 ? actions[idx] : undefined;
    if (idx !== -1 && existing !== undefined) {
      // Rebuild the action with annotation fields taking precedence.
      actions[idx] = {
        id: existing.id,
        route: existing.route,
        personas: existing.personas,
        label: ann.label ?? existing.label,
        steps: ann.steps ?? existing.steps,
        synonyms: ann.synonyms ?? existing.synonyms,
        spotlight: ann.spotlight ?? existing.spotlight,
        effect: ann.effect ?? existing.effect,
        params: ann.params ?? existing.params,
        execution:
          ann.execution !== undefined ? ann.execution : existing.execution,
      };
    }
  }

  // Apply task annotation overrides (annotated wins; add if missing)
  const mergedTasks: CapabilityGraph["tasks"] = finalTasks.filter(
    (t) => !(t.id in annotatedTasks),
  );
  for (const ann of Object.values(annotatedTasks)) {
    mergedTasks.push({
      id: ann.id,
      title: ann.title ?? ann.id,
      personas: ann.personas ?? [],
      goal: ann.goal,
      sequence: ann.sequence ?? [],
      source: "annotated" as const,
      confidence: ann.confidence,
    });
  }

  // Compute the final structure hash AFTER annotation merge so that gate.ts
  // (which also computes the hash post-annotation) stays in sync.
  const structureHash = computeGraphStructureHash({
    version: 2,
    defaultLocale: "en",
    pages,
    actions,
    fields,
    transitions,
    tasks: [],
  });
  // Update the cached hash to the post-annotation value.
  if (cache.tasks) {
    cache.tasks.structureHash = structureHash;
  }

  const graph: CapabilityGraph = {
    version: 2,
    defaultLocale: "en",
    pages,
    actions,
    fields,
    transitions,
    tasks: mergedTasks,
  };

  mkdirSync(join(root, ".assist"), { recursive: true });
  writeFileSync(
    join(root, "capability_graph.json"),
    JSON.stringify(graph, null, 2) + "\n",
  );
  writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n");

  console.log(
    `[assist] Wrote capability_graph.json with ${actions.length} actions and ${mergedTasks.length} tasks.`,
  );
}
