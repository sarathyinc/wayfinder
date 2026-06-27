import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CapabilityGraphSchema } from "./index.js";

const schemaPath = fileURLToPath(
  new URL("../../schema/capability-graph.schema.json", import.meta.url),
);

describe("committed JSON Schema", () => {
  it("is byte-identical to a fresh emit (run `pnpm --filter @wayfinder/core schema:emit` if this fails)", () => {
    const committed = readFileSync(schemaPath, "utf8");
    const fresh =
      JSON.stringify(z.toJSONSchema(CapabilityGraphSchema), null, 2) + "\n";
    expect(committed).toBe(fresh);
  });
});
