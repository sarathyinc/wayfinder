import type { Manifest, ManifestRoute, ManifestTransition } from "./types.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

export type { Manifest, ManifestRoute, ManifestTransition } from "./types.js";

/**
 * Very small deterministic source hasher.
 * Redaction must already have been applied to the content.
 */
export function hashSource(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

/**
 * Basic redaction helper (used by adapters before hashing).
 * Default rules: drop .env*, *secret*, *.key, and anything matching provided globs.
 */
export function redactSource(
  filePath: string,
  content: string,
  extraGlobs: string[] = [],
): string {
  const lower = filePath.toLowerCase();

  if (
    lower.includes(".env") ||
    lower.includes("secret") ||
    lower.endsWith(".key") ||
    extraGlobs.some((g) => lower.includes(g.toLowerCase()))
  ) {
    return `// [REDACTED: ${filePath}]`;
  }
  return content;
}

/**
 * Naive transition extractor (regex on source).
 * Real adapters should do proper AST walking.
 */
export function extractTransitionsFromSource(source: string, routeKey: string): ManifestTransition[] {
  const transitions: ManifestTransition[] = [];
  const hrefRe = /href=["'`]([^"'`]+)["'`]/g;
  const pushRe = /push\(["'`]([^"'`]+)["'`]\)/g;
  const routerRe = /router\.(push|replace)\(["'`]([^"'`]+)["'`]\)/g;

  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(source)) !== null) {
    const to = normalizeRoute(m[1]);
    if (to && to !== routeKey) {
      transitions.push({ from: routeKey, to, via: "static-link" });
    }
  }
  while ((m = pushRe.exec(source)) !== null) {
    const to = normalizeRoute(m[1]);
    if (to) transitions.push({ from: routeKey, to, via: "router-push" });
  }
  while ((m = routerRe.exec(source)) !== null) {
    const to = normalizeRoute(m[2]);
    if (to) transitions.push({ from: routeKey, to, via: "router-push" });
  }

  return transitions;
}

function normalizeRoute(r: string | undefined): string | undefined {
  if (!r) return undefined;
  const cleaned = (r.split("?")[0] ?? "").split("#")[0] ?? "";
  if (!cleaned) return undefined;
  return cleaned.startsWith("/") ? cleaned : "/" + cleaned;
}
