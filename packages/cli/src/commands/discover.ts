import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { hashSource, redactSource, extractTransitionsFromSource, type Manifest } from "@wayfinder/core";

export async function discoverCommand(dir: string = ".") {
  const root = dir || ".";
  console.log(`[assist] Discovering routes in ${root}...`);

  const routes: any[] = [];
  const transitions: any[] = [];

  function walk(current: string, base = "") {
    const entries = readdirSync(current);
    for (const entry of entries) {
      const full = join(current, entry);
      const rel = join(base, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full, rel);
      } else if (entry.match(/page\.(tsx|ts|jsx|js)$/) && !entry.startsWith("_")) {
        const routeKey = "/" + rel.replace(/\/page\.(tsx|ts|jsx|js)$/, "").replace(/^app\/?/, "").replace(/\[([^\]]+)\]/g, "[$1]");
        const src = readFileSync(full, "utf8");
        const redacted = redactSource(full, src);
        const sourceHash = hashSource(redacted);
        const fileTransitions = extractTransitionsFromSource(src, routeKey);

        routes.push({
          routeKey: routeKey || "/",
          personas: ["user"], // default for zero-annotation
          sourceHash,
          sourceBundle: redacted.slice(0, 2000),
          filePaths: [relative(root, full)],
        });
        transitions.push(...fileTransitions);
      }
    }
  }

  try {
    walk(join(root, "app"));
  } catch (e) {
    console.warn("No app/ dir found or error walking:", (e as Error).message);
  }

  const manifest: Manifest = { routes, transitions: Array.from(new Set(transitions.map(t => JSON.stringify(t)))).map(s => JSON.parse(s)) };
  console.log(`Found ${routes.length} routes.`);
  console.dir(manifest, { depth: 1 });
  return manifest;
}
