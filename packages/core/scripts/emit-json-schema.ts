import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CapabilityGraphSchema } from "../src/schema/index.js";

const outDir = fileURLToPath(new URL("../schema/", import.meta.url));
const outPath = fileURLToPath(
  new URL("../schema/capability-graph.schema.json", import.meta.url),
);

mkdirSync(outDir, { recursive: true });
const json =
  JSON.stringify(z.toJSONSchema(CapabilityGraphSchema), null, 2) + "\n";
writeFileSync(outPath, json, "utf8");
console.log(`wrote ${outPath}`);
