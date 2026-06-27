import { describe, it, expect } from "vitest";
import { filterGraphForPersonas } from "./types.js";
import type { CapabilityGraph } from "../schema/index.js";

const graph: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [
    { routeKey: "/admin", title: "Admin", personas: ["admin"], available: true },
    { routeKey: "/donors", title: "Donors", personas: ["intake_admin", "admin"], available: true },
  ],
  actions: [
    { id: "admin.only", route: "/admin", label: "Admin action", personas: ["admin"], effect: "navigate", params: [], synonyms: [], steps: [], spotlight: [], execution: null },
    { id: "donors.create", route: "/donors", label: "Create", personas: ["intake_admin"], effect: "write", params: [], synonyms: [], steps: [], spotlight: [], execution: null },
  ],
  fields: [],
  transitions: [],
  tasks: [],
};

describe("filterGraphForPersonas", () => {
  it("fail-closed on empty personas", () => {
    const filtered = filterGraphForPersonas(graph, []);
    expect(filtered.pages).toHaveLength(0);
    expect(filtered.actions).toHaveLength(0);
  });

  it("filters to only allowed personas", () => {
    const filtered = filterGraphForPersonas(graph, ["intake_admin"]);
    expect(filtered.pages.map(p => p.routeKey)).toEqual(["/donors"]);
    expect(filtered.actions.map(a => a.id)).toEqual(["donors.create"]);
  });
});
