import type { CapabilityGraph } from "../schema/index.js";
import type { CompileProvider } from "../providers/types.js";
import type { AssistChatRequest, AssistChatResponse } from "./types.js";
import { filterGraphForPersonas } from "./types.js";
import { matchDeterministic } from "./matcher.js";

export interface HandleAssistContext {
  graph: CapabilityGraph;
  provider: CompileProvider;
  /**
   * Must be resolved from the authenticated session on the server.
   * Never trust the client.
   */
  getPersonas(session: unknown): string[];
}

export async function handleAssistChat(
  req: AssistChatRequest,
  ctx: HandleAssistContext,
): Promise<AssistChatResponse> {
  // 1. Persona filter (fail-closed security boundary)
  const personas = ctx.getPersonas({}); // in real usage this receives the session
  const filtered = filterGraphForPersonas(ctx.graph, personas);

  if (filtered.actions.length === 0 && filtered.fields.length === 0) {
    return { kind: "refuse", reason: "unknown" };
  }

  // 2. Deterministic matcher (fast path, no LLM)
  const det = matchDeterministic(req.query, filtered);
  if (det) {
    return det as AssistChatResponse;
  }

  // 3. LLM fallback (only on filtered candidates)
  const candidates = {
    actions: filtered.actions.map((a) => ({
      id: a.id,
      label: a.label,
      route: a.route,
      effect: a.effect,
    })),
    fields: filtered.fields.map((f) => ({
      label: f.label,
      page: f.page,
      tab: f.tab,
    })),
  };

  try {
    const llm = await ctx.provider.matchIntent(req.query, candidates);

    if (llm.kind === "app_action" && llm.id) {
      const action = filtered.actions.find((a) => a.id === llm.id);
      if (action) {
        return {
          kind: "guide",
          actionId: action.id,
          steps: action.steps ?? [],
          route: action.route,
          spotlight: action.spotlight,
        };
      }
    }

    if (llm.kind === "field_location" && llm.id) {
      const field = filtered.fields.find((f) => normalize(f.label) === normalize(llm.id!));
      if (field) {
        return {
          kind: "field",
          label: field.label,
          page: field.page,
          tab: field.tab,
        };
      }
    }

    if (llm.kind === "off_topic" || llm.kind === "sensitive") {
      return { kind: "refuse", reason: llm.kind === "off_topic" ? "off_topic" : "sensitive" };
    }

    // Phase 3 example: for high confidence non-write, could drive
    if (llm.kind === "app_action" && llm.id && llm.confidence && llm.confidence > 0.8) {
      const action = filtered.actions.find(a => a.id === llm.id);
      if (action && action.effect !== "write") {
        return { kind: "drive", actionId: action.id, prefill: {} };
      }
    }
  } catch {
    // provider failure → graceful refusal instead of leaking errors
  }

  return { kind: "refuse", reason: "unknown" };
}

function normalize(t: string | Record<string, string>): string {
  if (typeof t === "string") return t.toLowerCase();
  return (t.en ?? Object.values(t)[0] ?? "").toLowerCase();
}
