import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadGraph, validateGraph, CapabilityGraphSchema } from "./index.js";

const examplePath = fileURLToPath(
  new URL("../examples/capability_graph.example.json", import.meta.url),
);

describe("public API", () => {
  it("re-exports the core surface", () => {
    expect(typeof loadGraph).toBe("function");
    expect(typeof validateGraph).toBe("function");
    expect(CapabilityGraphSchema).toBeDefined();
  });

  it("validates the shipped example graph", () => {
    const r = loadGraph(readFileSync(examplePath, "utf8"));
    expect(r.ok).toBe(true);
  });
});
