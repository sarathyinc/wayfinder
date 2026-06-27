import type { CapabilityGraph, Action, Field, LocalizedText } from "../schema/index.js";

// ---------------------------------------------------------------------------
// Public runtime contract (POST /assist/chat)
// ---------------------------------------------------------------------------

export interface AssistChatRequest {
  query: string;
  persona: string; // derived server-side from session, never trusted from client
  locale?: string;
  context?: {
    route?: string;
    // future: previousTurns, etc.
  };
}

export type AssistChatResponse =
  | { kind: "guide"; actionId: string; steps: LocalizedText[]; route: string; spotlight?: string[] }
  | { kind: "navigate"; route: string; spotlight?: string[] }
  | { kind: "field"; label: LocalizedText; page: string; tab?: string | null }
  | { kind: "disambiguate"; candidates: Array<{ id?: string; label: LocalizedText; page?: string; kind: "action" | "field" }> }
  | { kind: "drive"; actionId: string; prefill?: Record<string, unknown> }
  | { kind: "refuse"; reason: "off_topic" | "sensitive" | "unknown" };

// ---------------------------------------------------------------------------
// Persona filtering (security boundary — fail closed)
// ---------------------------------------------------------------------------

export function filterGraphForPersonas(
  graph: CapabilityGraph,
  personas: string[],
): CapabilityGraph {
  if (!personas || personas.length === 0) {
    // fail closed: return empty slice
    return {
      ...graph,
      pages: [],
      actions: [],
      fields: [],
      transitions: [],
      tasks: [],
    };
  }

  const allowed = new Set(personas);

  const pages = graph.pages.filter((p) =>
    p.personas.some((role) => allowed.has(role)),
  );

  const allowedRoutes = new Set(pages.map((p) => p.routeKey));

  const actions = graph.actions.filter(
    (a) =>
      allowedRoutes.has(a.route) &&
      a.personas.some((role) => allowed.has(role)),
  );

  const allowedActionIds = new Set(actions.map((a) => a.id));

  const fields = graph.fields.filter(
    (f) =>
      allowedRoutes.has(f.page) &&
      f.personas.some((role) => allowed.has(role)),
  );

  const transitions = graph.transitions.filter(
    (t) => allowedRoutes.has(t.from) && allowedRoutes.has(t.to),
  );

  const tasks = graph.tasks.filter((t) =>
    t.personas.some((role) => allowed.has(role)) &&
    t.sequence.every((id) => allowedActionIds.has(id)),
  );

  return {
    ...graph,
    pages,
    actions,
    fields,
    transitions,
    tasks,
  };
}

// ---------------------------------------------------------------------------
// Basic request/response helpers
// ---------------------------------------------------------------------------

export function isAssistChatRequest(x: unknown): x is AssistChatRequest {
  return (
    typeof x === "object" &&
    x !== null &&
    "query" in x &&
    typeof (x as any).query === "string" &&
    "persona" in x &&
    typeof (x as any).persona === "string"
  );
}
