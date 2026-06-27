/**
 * Diff logic for the reconciliation harness.
 *
 * No Playwright dependency — this is the pure, testable unit.
 * Compares a set of live ControlSnapshots against a persona's filtered
 * graph slice and produces a ReconcileResult.
 */

import type { CapabilityGraph } from "@wayfinder/core";
import type {
  ControlSnapshot,
  ReconcileResult,
  ReconcileFinding,
} from "./types.js";

/**
 * Returns the subset of actions in the graph that are accessible to `persona`.
 */
function filterActionsForPersona(graph: CapabilityGraph, persona: string) {
  return graph.actions.filter((a) => a.personas.includes(persona));
}

/**
 * Determine whether a selector string is syntactically valid (non-empty,
 * not obviously malformed).  This is intentionally lenient — we just
 * want to distinguish "has an entry" from "empty string".
 */
function looksLikeValidSelector(selector: string): boolean {
  return selector.trim().length > 0;
}

/**
 * Diff live control snapshots against a persona's graph slice.
 *
 * Categories:
 * - missing: action has spotlight entries but none resolve to a snapshot on
 *   that route (live UI may be broken or the control was removed)
 * - staleSpotlight: same condition as missing when the selector is syntactically
 *   valid — indicates the graph has data but the selector is unresolvable
 * - orphaned: snapshot on a route with no matching action spotlight (the control
 *   exists live but was never catalogued in the graph — warn only)
 */
export function diff(
  persona: string,
  snapshots: ControlSnapshot[],
  graph: CapabilityGraph,
): ReconcileResult {
  const actions = filterActionsForPersona(graph, persona);

  // Build a lookup: route → set of selectors seen in live snapshots
  const snapshotsByRoute = new Map<string, Set<string>>();
  for (const snap of snapshots) {
    if (!snapshotsByRoute.has(snap.route)) {
      snapshotsByRoute.set(snap.route, new Set());
    }
    snapshotsByRoute.get(snap.route)!.add(snap.selector);
  }

  // Build a set of all selectors covered by graph actions (for orphan detection)
  const coveredSelectors = new Set<string>();
  for (const action of actions) {
    for (const sel of action.spotlight) {
      coveredSelectors.add(`${action.route}::${sel}`);
    }
  }

  const missing: ReconcileFinding[] = [];
  const staleSpotlight: ReconcileFinding[] = [];

  for (const action of actions) {
    // Actions with empty spotlight cannot be reconciled — skip
    if (action.spotlight.length === 0) continue;

    const liveSelectors =
      snapshotsByRoute.get(action.route) ?? new Set<string>();
    const anyMatch = action.spotlight.some((sel) => liveSelectors.has(sel));

    if (!anyMatch) {
      // Does any spotlight entry look syntactically valid?
      const hasValidSelector = action.spotlight.some(looksLikeValidSelector);

      const finding: ReconcileFinding = {
        id: action.id,
        selector: action.spotlight[0],
        route: action.route,
        message: `Action "${action.id}" spotlight selectors [${action.spotlight.join(", ")}] not found in live snapshots for route "${action.route}"`,
      };

      if (hasValidSelector) {
        staleSpotlight.push(finding);
      } else {
        missing.push(finding);
      }
    }
  }

  // Orphaned: snapshots whose selector+route combo doesn't match any action spotlight
  const orphaned: ReconcileFinding[] = [];
  for (const snap of snapshots) {
    const key = `${snap.route}::${snap.selector}`;
    if (!coveredSelectors.has(key)) {
      orphaned.push({
        selector: snap.selector,
        route: snap.route,
        message: `Live control "${snap.selector}" on route "${snap.route}" has no matching graph action spotlight`,
      });
    }
  }

  return { persona, missing, orphaned, staleSpotlight };
}
