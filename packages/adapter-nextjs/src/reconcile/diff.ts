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
 * Build a set of routeKeys that are marked available:false in the graph.
 * Actions on these routes are expected-absent and should not generate
 * orphaned/staleSpotlight findings.
 */
function buildUnavailableRoutes(graph: CapabilityGraph): Set<string> {
  const unavailable = new Set<string>();
  for (const page of graph.pages) {
    if (!page.available) {
      unavailable.add(page.routeKey);
    }
  }
  return unavailable;
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
 * - missing: live snapshot whose selector+route combo doesn't match any
 *   graph action spotlight (the control exists live but was never catalogued
 *   — warn only)
 * - orphaned: graph action with non-empty spotlight selectors where none of
 *   the selectors match any live snapshot on that route (live UI may be
 *   broken or the control was removed — warn only)
 * - staleSpotlight: graph action whose spotlight selectors are syntactically
 *   valid but don't resolve to any live control (selector is stale/broken)
 */
export function diff(
  persona: string,
  snapshots: ControlSnapshot[],
  graph: CapabilityGraph,
): ReconcileResult {
  const actions = filterActionsForPersona(graph, persona);
  const unavailableRoutes = buildUnavailableRoutes(graph);

  // Build a lookup: route → set of selectors seen in live snapshots
  const snapshotsByRoute = new Map<string, Set<string>>();
  for (const snap of snapshots) {
    if (!snapshotsByRoute.has(snap.route)) {
      snapshotsByRoute.set(snap.route, new Set());
    }
    snapshotsByRoute.get(snap.route)!.add(snap.selector);
  }

  // Build a set of all selectors covered by graph actions on *available* routes
  // (for standard missing detection)
  const coveredSelectors = new Set<string>();
  for (const action of actions) {
    if (unavailableRoutes.has(action.route)) continue;
    for (const sel of action.spotlight) {
      coveredSelectors.add(`${action.route}::${sel}`);
    }
  }

  const orphaned: ReconcileFinding[] = [];
  const staleSpotlight: ReconcileFinding[] = [];

  for (const action of actions) {
    // Actions with empty spotlight cannot be reconciled — skip
    if (action.spotlight.length === 0) continue;

    // Routes marked available:false are expected to have no live controls —
    // do NOT flag their actions as orphaned or staleSpotlight.
    if (unavailableRoutes.has(action.route)) continue;

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
        orphaned.push(finding);
      }
    }
  }

  // Missing: snapshots whose selector+route combo doesn't match any action spotlight.
  // Special case: if a live snapshot's route is marked available:false in the graph,
  // flag it with a note — a control was found live on a supposedly-unavailable route.
  const missing: ReconcileFinding[] = [];
  for (const snap of snapshots) {
    if (unavailableRoutes.has(snap.route)) {
      missing.push({
        selector: snap.selector,
        route: snap.route,
        message: `Live control "${snap.selector}" on route "${snap.route}" found but route is marked available:false in graph`,
      });
      continue;
    }
    const key = `${snap.route}::${snap.selector}`;
    if (!coveredSelectors.has(key)) {
      missing.push({
        selector: snap.selector,
        route: snap.route,
        message: `Live control "${snap.selector}" on route "${snap.route}" has no matching graph action spotlight`,
      });
    }
  }

  return { persona, missing, orphaned, staleSpotlight };
}
