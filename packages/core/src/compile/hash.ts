import { createHash } from "node:crypto";
import type { CapabilityGraph } from "../schema/index.js";

export function hashString(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 16);
}

/**
 * Stable structure hash used for the global flow-pass cache key.
 * Changes when the set of actions, transitions, or personas materially changes.
 */
export function computeGraphStructureHash(graph: CapabilityGraph): string {
  const actionIds = graph.actions.map((a) => a.id).sort();
  const transitions = graph.transitions
    .map((t) => `${t.from}->${t.to}@${t.via}`)
    .sort();
  const personaSets = new Set<string>();

  for (const p of graph.pages) p.personas.forEach((r) => personaSets.add(r));
  for (const a of graph.actions) a.personas.forEach((r) => personaSets.add(r));
  for (const f of graph.fields) f.personas.forEach((r) => personaSets.add(r));
  for (const t of graph.tasks) t.personas.forEach((r) => personaSets.add(r));

  const personas = Array.from(personaSets).sort();

  const payload = JSON.stringify({ actionIds, transitions, personas });
  return hashString(payload);
}
