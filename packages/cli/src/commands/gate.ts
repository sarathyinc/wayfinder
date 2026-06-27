import { discoverCommand } from "./discover.js";
import { loadGraph } from "@wayfinder/core";
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
    console.error("No capability_graph.json found. Run 'assist compile' first.");
    process.exit(1);
  }

  const loaded = loadGraph(graphJson);
  if (!loaded.ok) {
    console.error("Graph load failed:", loaded.errors);
    process.exit(1);
  }

  const cache = JSON.parse(readFileSync(cachePath, "utf8"));
  const currentHashes = new Set(manifest.routes.map(r => r.sourceHash));
  let missing = 0;

  for (const h of currentHashes) {
    if (!cache.routes?.[h]) {
      missing++;
      console.error(`Missing compile for hash ${h}`);
    }
  }

  if (missing > 0) {
    console.error(`Drift detected: ${missing} routes not compiled.`);
    process.exit(1);
  }

  console.log("Gate passed. No drift.");
}
