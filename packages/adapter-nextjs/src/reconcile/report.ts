/**
 * Report builder for reconciliation results.
 *
 * No Playwright dependency — pure data transformation.
 */

import type { ReconcileResult, ReconcileFinding } from "./types.js";

export interface ReportOutput {
  json: string; // stable-sorted JSON
  markdown: string; // human-readable summary
}

/**
 * Build a coverage report from an array of per-persona ReconcileResults.
 */
export function buildReport(results: ReconcileResult[]): ReportOutput {
  // Stable sort by persona name for deterministic output
  const sorted = [...results].sort((a, b) =>
    a.persona.localeCompare(b.persona),
  );

  const json = JSON.stringify(sorted, null, 2);

  const markdown = buildMarkdown(sorted);

  return { json, markdown };
}

function buildMarkdown(results: ReconcileResult[]): string {
  const lines: string[] = [];

  lines.push("# Wayfinder Coverage Report");
  lines.push("");
  lines.push(
    `**Generated:** ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
  );
  lines.push(`**Personas:** ${results.length}`);
  lines.push("");

  const totalMissing = results.reduce((n, r) => n + r.missing.length, 0);
  const totalOrphaned = results.reduce((n, r) => n + r.orphaned.length, 0);
  const totalStale = results.reduce((n, r) => n + r.staleSpotlight.length, 0);

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Category | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Missing (live control not in graph) | ${totalMissing} |`);
  lines.push(`| Stale spotlight (unresolvable selector) | ${totalStale} |`);
  lines.push(`| Orphaned (graph entry, no live control) | ${totalOrphaned} |`);
  lines.push("");

  for (const result of results) {
    lines.push(`## Persona: \`${result.persona}\``);
    lines.push("");

    if (result.missing.length === 0 && result.staleSpotlight.length === 0) {
      lines.push("✅ No missing or stale controls.");
    } else {
      appendFindings(lines, "Missing controls", result.missing);
      appendFindings(lines, "Stale spotlight", result.staleSpotlight);
    }

    if (result.orphaned.length > 0) {
      appendFindings(lines, "Orphaned controls (warn only)", result.orphaned);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function appendFindings(
  lines: string[],
  heading: string,
  findings: ReconcileFinding[],
): void {
  if (findings.length === 0) return;

  lines.push(`### ${heading}`);
  lines.push("");
  for (const f of findings) {
    const id = f.id ? ` \`${f.id}\`` : "";
    const sel = f.selector ? ` selector: \`${f.selector}\`` : "";
    lines.push(`- **${f.route}**${id}${sel} — ${f.message}`);
  }
  lines.push("");
}
