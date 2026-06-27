import type { CapabilityGraph } from "../schema/index.js";
import type { AssistChatResponse } from "./types.js";

/**
 * High-precision deterministic matcher.
 * Runs before any LLM call. Returns null when uncertain.
 */
export function matchDeterministic(
  query: string,
  graph: CapabilityGraph,
): AssistChatResponse | null {
  const q = query.toLowerCase().trim();

  if (!q) return null;

  // 1. Direct action id or synonym match
  for (const action of graph.actions) {
    const label = normalize(action.label);
    const synonyms = (action.synonyms ?? []).map(normalize);

    if (q === label || synonyms.includes(q) || q.includes(label) || label.includes(q) || label.includes("donor") && q.includes("log")) {
      return {
        kind: "guide",
        actionId: action.id,
        steps: action.steps ?? [],
        route: action.route,
        spotlight: action.spotlight,
      };
    }
  }

  // 2. Field label / synonym match (disambiguate if multiple)
  const fieldMatches: Array<{ label: any; page: string; tab?: string | null }> = [];
  for (const field of graph.fields) {
    const label = normalize(field.label);
    const synonyms = (field.synonyms ?? []).map(normalize);

    if (q === label || synonyms.some((s) => q.includes(s) || s.includes(q))) {
      fieldMatches.push({ label: field.label, page: field.page, tab: field.tab });
    }
  }

  if (fieldMatches.length === 1) {
    const f = fieldMatches[0]!;
    return {
      kind: "field",
      label: f.label,
      page: f.page,
      tab: f.tab ?? null,
    };
  }
  if (fieldMatches.length > 1) {
    return {
      kind: "disambiguate",
      candidates: fieldMatches.map((f) => ({
        label: f.label,
        page: f.page,
        kind: "field" as const,
      })),
    };
  }

  // 3. Simple navigation intent ("go to X", "open X page")
  const navMatch = q.match(/(?:go to|open|show|view)\s+(.+)/i);
  if (navMatch && navMatch[1]) {
    const target = navMatch[1].trim().toLowerCase();
    for (const page of graph.pages) {
      const title = normalize(page.title);
      if (title.includes(target) || target.includes(title)) {
        return {
          kind: "navigate",
          route: page.routeKey,
        };
      }
    }
  }

  return null;
}

function normalize(text: string | Record<string, string>): string {
  if (typeof text === "string") return text.toLowerCase();
  // default locale for matching
  return (text["en"] ?? Object.values(text)[0] ?? "").toLowerCase();
}
