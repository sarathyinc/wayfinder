import { discoverCommand } from "./discover.js";
import { loadGraph, computeGraphStructureHash } from "@wayfinder/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  const currentStructureHash = computeGraphStructureHash({
    version: 2,
    defaultLocale: "en",
    pages: [],
    actions: manifestActions.map((a) => ({
      id: a.id,
      route: a.route,
      label: a.route,
      personas: a.personas,
      effect: "navigate" as const,
      params: [],
      synonyms: [],
      steps: [],
      spotlight: [],
      execution: null,
    })),
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
