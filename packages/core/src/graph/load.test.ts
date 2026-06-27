import { describe, it, expect } from "vitest";
import { loadGraph } from "./load.js";

const valid = JSON.stringify({
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
});

describe("loadGraph", () => {
  it("parses and validates valid JSON", () => {
    const r = loadGraph(valid);
    expect(r.ok).toBe(true);
  });

  it("returns a schema error on invalid JSON instead of throwing", () => {
    const r = loadGraph("{ not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]!.code).toBe("schema");
  });
});
