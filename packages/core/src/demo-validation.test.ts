import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadGraph, matchDeterministic, filterGraphForPersonas } from "./index.js";

const demoGraphPath = fileURLToPath(new URL("../../../examples/nextjs-demo/capability_graph.json", import.meta.url));

describe("Demo graph validation (Phase 1 exit)", () => {
  it("loads the demo graph successfully", () => {
    const json = readFileSync(demoGraphPath, "utf8");
    const result = loadGraph(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.graph.actions.length).toBeGreaterThan(0);
    }
  });

  it("deterministic matcher finds donor action in demo graph", () => {
    const json = readFileSync(demoGraphPath, "utf8");
    const loaded = loadGraph(json);
    if (!loaded.ok) throw new Error("bad demo graph");
    const filtered = filterGraphForPersonas(loaded.graph, ["intake_admin"]);
    const res = matchDeterministic("log a new donor offer", filtered);
    expect(res).not.toBeNull();
    if (res && res.kind === "guide") {
      expect(res.actionId).toBe("donors.create");
    }
  });
});
