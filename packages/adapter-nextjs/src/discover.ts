// Next.js App Router discovery helper.
//
// Walks app/[route]/page.(ts|tsx|js|jsx) files under a given root directory
// and produces a Manifest by delegating to the core primitives:
//   - redactSource  — strips secrets before any processing
//   - hashSource    — content-addressed cache key
//   - extractTransitionsFromSource — regex-based link/router extraction
//
// This is intentionally a thin wrapper. The core helpers own the heavy
// lifting; this module only knows the Next.js App Router file convention
// (app/[route]/page.* → routeKey derived from the directory path).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, extname } from "node:path";
import {
  hashSource,
  redactSource,
  extractTransitionsFromSource,
} from "@wayfinder/core";
import type {
  Manifest,
  ManifestRoute,
  ManifestTransition,
} from "@wayfinder/core";

export type { Manifest, ManifestRoute, ManifestTransition };

const PAGE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const PAGE_FILE_STEM = "page";

/**
 * Walk the Next.js app/ directory under appDir and build a Manifest.
 *
 * @param appDir  Absolute path to the app/ directory (e.g. process.cwd() + "/app").
 * @param extraRedactGlobs  Additional glob patterns forwarded to redactSource.
 */
export function discoverNextjsRoutes(
  appDir: string,
  extraRedactGlobs: string[] = [],
): Manifest {
  const pageFiles = collectPageFiles(appDir);

  const routes: ManifestRoute[] = [];
  const allTransitions: ManifestTransition[] = [];

  for (const filePath of pageFiles) {
    const rawSource = tryReadFile(filePath);
    if (rawSource === null) continue;

    const routeKey = filePathToRouteKey(appDir, filePath);
    const redacted = redactSource(filePath, rawSource, extraRedactGlobs);
    const sourceHash = hashSource(redacted);
    const transitions = extractTransitionsFromSource(redacted, routeKey);

    routes.push({
      routeKey,
      personas: [], // populated by the compile step / annotations
      sourceHash,
      sourceBundle: redacted,
      filePaths: [filePath],
    });

    allTransitions.push(...transitions);
  }

  return { routes, transitions: deduplicateTransitions(allTransitions) };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Recursively collect all page.(ts|tsx|js|jsx) files under dir.
function collectPageFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        results.push(...collectPageFiles(fullPath));
      } else if (
        stat.isFile() &&
        PAGE_EXTENSIONS.has(extname(entry)) &&
        stemOf(entry) === PAGE_FILE_STEM
      ) {
        results.push(fullPath);
      }
    }
  } catch {
    // directory unreadable — return what we have
  }
  return results;
}

// Convert a page file path to a Next.js route key.
// Example: <appDir>/dashboard/page.tsx → /dashboard
// Example: <appDir>/page.tsx           → /
function filePathToRouteKey(appDir: string, filePath: string): string {
  const rel = relative(appDir, dirname(filePath));
  if (!rel || rel === ".") return "/";
  return "/" + rel.replace(/\\/g, "/");
}

function stemOf(filename: string): string {
  const ext = extname(filename);
  return ext ? filename.slice(0, -ext.length) : filename;
}

function tryReadFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function deduplicateTransitions(
  transitions: ManifestTransition[],
): ManifestTransition[] {
  const seen = new Set<string>();
  return transitions.filter((t) => {
    const key = `${t.from}→${t.to}→${t.via}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
