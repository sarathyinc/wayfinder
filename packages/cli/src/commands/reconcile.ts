import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGraph } from "@wayfinder/core";
import type { ReconcileResult } from "@wayfinder/adapter-nextjs";

export async function reconcileCommand(
  dir = ".",
  options: { personas?: string; baseUrl?: string } = {},
) {
  const root = dir;
  const baseUrl = options.baseUrl ?? "http://localhost:3000";
  const personas = options.personas
    ? options.personas.split(",").map((p) => p.trim())
    : ["user"];

  console.log("[assist] Running reconciliation harness...");
  console.log(`[assist] Base URL: ${baseUrl}`);
  console.log(`[assist] Personas: ${personas.join(", ")}`);

  // Load the capability graph
  const graphPath = join(root, "capability_graph.json");
  let graphJson: string;
  try {
    graphJson = readFileSync(graphPath, "utf8");
  } catch {
    console.error(
      "[assist] No capability_graph.json found. Run 'assist compile' first.",
    );
    process.exit(1);
  }

  const loaded = loadGraph(graphJson);
  if (!loaded.ok) {
    console.error("[assist] Graph load failed:", loaded.errors);
    process.exit(1);
  }

  // Dynamically import the reconciliation harness (has Playwright peer dep)
  let runReconciliation: (typeof import("@wayfinder/adapter-nextjs"))["runReconciliation"];
  try {
    const mod = await import("@wayfinder/adapter-nextjs");
    runReconciliation = mod.runReconciliation;
    if (!runReconciliation) {
      throw new Error("runReconciliation not exported");
    }
  } catch (err) {
    console.error(
      "[assist] Failed to load reconciliation harness. Ensure @wayfinder/adapter-nextjs and playwright are installed.",
      err,
    );
    process.exit(1);
  }

  const { buildReport } = await import("@wayfinder/adapter-nextjs");

  const results = await runReconciliation({
    baseUrl,
    graph: loaded.graph,
    personas,
  });

  const report = buildReport(results);

  const jsonPath = join(root, "coverage-report.json");
  const mdPath = join(root, "coverage-report.md");

  writeFileSync(jsonPath, report.json + "\n");
  writeFileSync(mdPath, report.markdown + "\n");

  const totalMissing = results.reduce((n: number, r: ReconcileResult) => n + r.missing.length, 0);
  const totalStale = results.reduce((n: number, r: ReconcileResult) => n + r.staleSpotlight.length, 0);
  const totalOrphaned = results.reduce((n: number, r: ReconcileResult) => n + r.orphaned.length, 0);

  console.log("[assist] Reconciliation complete.");
  console.log(`[assist] Missing: ${totalMissing}`);
  console.log(`[assist] Stale spotlight: ${totalStale}`);
  console.log(`[assist] Orphaned (warn): ${totalOrphaned}`);
  console.log(`[assist] Report written to ${jsonPath} and ${mdPath}`);
}
