import { describe, it, expect } from "vitest";
import { validateGraph } from "./validate.js";

const base = {
  version: 2,
  pages: [{ routeKey: "/donors", title: "Donor Records", personas: ["admin"] }],
  actions: [
    {
      id: "donors.create",
      route: "/donors",
      label: "Create",
      personas: ["admin"],
      effect: "write",
    },
  ],
};

describe("validateGraph", () => {
  it("returns ok for a valid graph", () => {
    const r = validateGraph(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.graph.actions[0]!.id).toBe("donors.create");
  });

  it("reports a schema error for malformed input", () => {
    const r = validateGraph({ version: 2, pages: "nope", actions: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]!.code).toBe("schema");
  });

  it("omits path (undefined, not empty string) for root-level schema errors", () => {
    const r = validateGraph(null);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const schemaErr = r.errors.find((e) => e.code === "schema");
      expect(schemaErr).toBeDefined();
      expect(schemaErr!.path).toBeUndefined();
    }
  });

  it("flags an action whose route has no page", () => {
    const bad = structuredClone(base);
    bad.actions[0]!.route = "/ghost";
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "unknown_action_route")).toBe(
        true,
      );
  });

  it("flags duplicate action ids", () => {
    const bad = structuredClone(base);
    bad.actions.push({ ...bad.actions[0]! });
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "duplicate_action_id")).toBe(true);
  });

  it("flags duplicate route keys", () => {
    const bad = structuredClone(base);
    bad.pages.push({ ...bad.pages[0]! });
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "duplicate_route_key")).toBe(true);
  });

  it("flags a transition whose via action is unknown", () => {
    const bad = structuredClone(base) as typeof base & {
      transitions: unknown[];
    };
    bad.transitions = [{ from: "/donors", to: "/donors", via: "nope" }];
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "unknown_transition_via")).toBe(
        true,
      );
  });

  it("flags a transition referencing an unknown page", () => {
    const bad = structuredClone(base) as typeof base & {
      transitions: unknown[];
    };
    bad.transitions = [{ from: "/donors", to: "/ghost", via: "donors.create" }];
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "unknown_transition_page")).toBe(
        true,
      );
  });

  it("flags a task referencing an unknown action", () => {
    const bad = structuredClone(base) as typeof base & { tasks: unknown[] };
    bad.tasks = [
      {
        id: "t1",
        title: "T",
        personas: ["admin"],
        sequence: ["nope"],
        source: "suggested",
      },
    ];
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "unknown_task_action")).toBe(true);
  });

  it("flags a field referencing an unknown page", () => {
    const bad = structuredClone(base) as typeof base & { fields: unknown[] };
    bad.fields = [{ label: "X", page: "/ghost", personas: ["admin"] }];
    const r = validateGraph(bad);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => e.code === "unknown_field_page")).toBe(true);
  });
});
