import { describe, it, expect } from "vitest";
import { diff } from "./diff.js";
import type { CapabilityGraph } from "@wayfinder/core";
import type { ControlSnapshot } from "./types.js";

// Minimal graph factory for tests
function makeGraph(
  actions: Array<{
    id: string;
    route: string;
    personas: string[];
    spotlight: string[];
  }>,
): CapabilityGraph {
  return {
    version: 2,
    defaultLocale: "en",
    pages: [],
    actions: actions.map((a) => ({
      id: a.id,
      route: a.route,
      label: a.id,
      personas: a.personas,
      effect: "navigate" as const,
      params: [],
      synonyms: [],
      steps: [],
      spotlight: a.spotlight,
      execution: null,
    })),
    fields: [],
    transitions: [],
    tasks: [],
  };
}

describe("diff", () => {
  it("action with spotlight has a matching snapshot → not in missing or staleSpotlight", () => {
    const graph = makeGraph([
      {
        id: "dashboard.view",
        route: "/dashboard",
        personas: ["user"],
        spotlight: ["[data-testid='create-btn']"],
      },
    ]);
    const snapshots: ControlSnapshot[] = [
      {
        selector: "[data-testid='create-btn']",
        route: "/dashboard",
        role: "button",
      },
    ];

    const result = diff("user", snapshots, graph);

    expect(result.persona).toBe("user");
    expect(result.missing).toHaveLength(0);
    expect(result.staleSpotlight).toHaveLength(0);
  });

  it("action with spotlight has NO matching snapshot → in staleSpotlight (valid selector)", () => {
    const graph = makeGraph([
      {
        id: "dashboard.create",
        route: "/dashboard",
        personas: ["user"],
        spotlight: ["[data-testid='create-btn']"],
      },
    ]);
    const snapshots: ControlSnapshot[] = [
      // Different selector — no match
      { selector: "#other-btn", route: "/dashboard", role: "button" },
    ];

    const result = diff("user", snapshots, graph);

    // Selector is syntactically valid → goes to staleSpotlight
    expect(result.staleSpotlight).toHaveLength(1);
    expect(result.staleSpotlight[0]!.id).toBe("dashboard.create");
    expect(result.staleSpotlight[0]!.route).toBe("/dashboard");
    expect(result.missing).toHaveLength(0);
  });

  it("snapshot with no matching graph action → in orphaned", () => {
    const graph = makeGraph([
      {
        id: "dashboard.view",
        route: "/dashboard",
        personas: ["user"],
        spotlight: ["[data-testid='create-btn']"],
      },
    ]);
    // Both the catalogued control and an extra uncatalogued one
    const snapshots: ControlSnapshot[] = [
      {
        selector: "[data-testid='create-btn']",
        route: "/dashboard",
        role: "button",
      },
      {
        selector: "[data-testid='mystery-btn']",
        route: "/dashboard",
        role: "button",
      },
    ];

    const result = diff("user", snapshots, graph);

    expect(result.orphaned).toHaveLength(1);
    expect(result.orphaned[0]!.selector).toBe("[data-testid='mystery-btn']");
    expect(result.orphaned[0]!.route).toBe("/dashboard");
    // The matched action is fine
    expect(result.staleSpotlight).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
  });

  it("action with empty spotlight → not flagged (cannot reconcile without selectors)", () => {
    const graph = makeGraph([
      {
        id: "settings.save",
        route: "/settings",
        personas: ["user"],
        spotlight: [], // empty → skip
      },
    ]);
    const snapshots: ControlSnapshot[] = [];

    const result = diff("user", snapshots, graph);

    expect(result.missing).toHaveLength(0);
    expect(result.staleSpotlight).toHaveLength(0);
    expect(result.orphaned).toHaveLength(0);
  });

  it("actions for other personas are not evaluated", () => {
    const graph = makeGraph([
      {
        id: "admin.panel",
        route: "/admin",
        personas: ["admin"],
        spotlight: ["[data-testid='admin-btn']"],
      },
    ]);
    // persona 'user' sees no actions for /admin
    const result = diff("user", [], graph);

    expect(result.missing).toHaveLength(0);
    expect(result.staleSpotlight).toHaveLength(0);
    expect(result.orphaned).toHaveLength(0);
  });

  it("multiple personas can share a route — each sees only their actions", () => {
    const graph = makeGraph([
      {
        id: "shared.view",
        route: "/shared",
        personas: ["user", "admin"],
        spotlight: ["[data-testid='shared-btn']"],
      },
      {
        id: "admin.extra",
        route: "/shared",
        personas: ["admin"],
        spotlight: ["[data-testid='admin-only-btn']"],
      },
    ]);
    const snapshots: ControlSnapshot[] = [
      {
        selector: "[data-testid='shared-btn']",
        route: "/shared",
        role: "button",
      },
    ];

    const userResult = diff("user", snapshots, graph);
    expect(userResult.staleSpotlight).toHaveLength(0);
    expect(userResult.missing).toHaveLength(0);

    const adminResult = diff("admin", snapshots, graph);
    // admin.extra is unresolved → staleSpotlight
    expect(adminResult.staleSpotlight).toHaveLength(1);
    expect(adminResult.staleSpotlight[0]!.id).toBe("admin.extra");
  });
});
