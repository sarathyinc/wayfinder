import { describe, it, expect } from "vitest";
import { computeGraphStructureHash } from "./hash.js";
import type { CapabilityGraph } from "../schema/index.js";

const base: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [{ routeKey: "/a", title: "A", personas: ["user"], available: true }],
  actions: [{ id: "a.do", route: "/a", label: "Do", personas: ["user"], effect: "navigate", params: [], synonyms: [], steps: [], spotlight: [], execution: null }],
  fields: [],
  transitions: [],
  tasks: [],
};

describe("computeGraphStructureHash", () => {
  it("changes when actions change", () => {
    const h1 = computeGraphStructureHash(base);
    const g2 = structuredClone(base);
    g2.actions[0]!.id = "a.other";
    const h2 = computeGraphStructureHash(g2);
    expect(h1).not.toBe(h2);
  });

  it("stable for same structure", () => {
    const h1 = computeGraphStructureHash(base);
    const h2 = computeGraphStructureHash(structuredClone(base));
    expect(h1).toBe(h2);
  });
});
