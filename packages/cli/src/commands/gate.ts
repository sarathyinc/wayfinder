import { discoverCommand } from "./discover.js";
import {
  loadGraph,
  computeGraphStructureHash,
  getRegisteredAnnotations,
} from "@wayfinder/core";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// Candidates for the host-provided annotations file, in priority order.
// Must match the list in compile.ts so gate and compile hash identically.
const ANNOTATION_CANDIDATES = [
  "assist-annotations.ts",
  "assist-annotations.js",
  "src/assist-annotations.ts",
  "src/assist-annotations.js",
];

async function loadAnnotationsFile(root: string): Promise<void> {
  const { pathToFileURL } = await import("node:url");

  for (const candidate of ANNOTATION_CANDIDATES) {
    const annotationsPath = resolve(root, candidate);
    if (!existsSync(annotationsPath)) continue;

    try {
      await import(pathToFileURL(annotationsPath).href);
    } catch {
      // Annotation file is optional — silently skip on load errors.
    }
    return; // only load the first match
  }
}

export async function gateCommand(dir = ".") {
  const root = dir;
  console.log("[assist] Running drift gate...");

  const manifest = await discoverCommand(root);
  const graphPath = join(root, "capability_graph.json");
  const cachePath = join(root, ".assist", "compile_cache.json");

  let graphJson: string;
  try {
    graphJson = readFileSync(graphPath, "utf8");
  } catch {
    throw new Error(
      "No capability_graph.json found. Run 'assist compile' first.",
    );
  }

  const loaded = loadGraph(graphJson);
  if (!loaded.ok) {
    throw new Error(`Graph load failed: ${JSON.stringify(loaded.errors)}`);
  }

  const cache = JSON.parse(readFileSync(cachePath, "utf8"));
  const currentHashes = new Set(manifest.routes.map((r) => r.sourceHash));
  let missing = 0;

  for (const h of currentHashes) {
    if (!cache.routes?.[h]) {
      missing++;
      console.error(`Missing compile for hash ${h}`);
    }
  }

  if (missing > 0) {
    throw new Error(`Drift detected: ${missing} routes not compiled.`);
  }

  // Derive structure hash from the current source manifest (not the committed graph)
  // so we detect when source files changed since last compile.
  const manifestActions = manifest.routes.map((r) => ({
    id: `${r.routeKey.replace(/\//g, ".")}.view`.replace(/^\./, ""),
    route: r.routeKey,
    personas: r.personas,
  }));

  // Load annotations (same as compileCommand) so that annotation-only action
  // IDs are included in the hash. Without this, gate always fails after any
  // defineAction({ id: "custom-action" }) that doesn't match a route.
  await loadAnnotationsFile(root);
  const { actions: annotatedActions } = getRegisteredAnnotations();

  // Build the actions list: start from route-derived actions, then apply any
  // annotation overrides (matching compile.ts annotation merge logic).
  const actions: Array<{
    id: string;
    route: string;
    label: string | Record<string, string>;
    personas: string[];
    effect: "navigate" | "open" | "write";
    params: any[];
    synonyms: (string | Record<string, string>)[];
    steps: (string | Record<string, string>)[];
    spotlight: string[];
    execution: any;
  }> = manifestActions.map((a) => ({
    id: a.id,
    route: a.route,
    label: a.route,
    personas: a.personas,
    effect: "navigate",
    params: [],
    synonyms: [] as (string | Record<string, string>)[],
    steps: [] as (string | Record<string, string>)[],
    spotlight: [],
    execution: null,
  }));

  for (const ann of Object.values(annotatedActions)) {
    const idx = actions.findIndex((a) => a.id === ann.id);
    const existing = idx !== -1 ? actions[idx] : undefined;
    if (idx !== -1 && existing !== undefined) {
      actions[idx] = {
        id: existing.id,
        route: existing.route,
        personas: existing.personas,
        label: ann.label ?? existing.label,
        steps: ann.steps ?? existing.steps,
        synonyms: ann.synonyms ?? existing.synonyms,
        spotlight: ann.spotlight ?? existing.spotlight,
        effect: (ann.effect ?? existing.effect) as any,
        params: ann.params ?? existing.params,
        execution:
          ann.execution !== undefined ? ann.execution : existing.execution,
      };
    }
  }

  const currentStructureHash = computeGraphStructureHash({
    version: 2,
    defaultLocale: "en",
    pages: [],
    actions,
    fields: [],
    transitions: manifest.transitions,
    tasks: [],
  });

  if (cache.tasks?.structureHash !== currentStructureHash) {
    throw new Error(
      `Drift detected: structure hash mismatch. Run 'assist compile' to regenerate tasks.`,
    );
  }

  console.log("Gate passed. No drift.");
}
