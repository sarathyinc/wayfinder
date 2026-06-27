import type { CapabilityGraph, Page } from "../schema/index.js";
import type { CompileProvider } from "../providers/types.js";
import type { AssistChatRequest, AssistChatResponse } from "./types.js";
import { filterGraphForPersonas } from "./types.js";
import { matchDeterministic } from "./matcher.js";

const DEFAULT_MAX_INLINE = 60;

export interface HandleAssistContext {
  graph: CapabilityGraph;
  provider: CompileProvider;
  /**
   * Must be resolved from the authenticated session on the server.
   * Never trust the client.
   */
  getPersonas(session: unknown): string[];
  /**
   * Maximum number of filtered actions to pass inline to the LLM.
   * When `filtered.actions.length` exceeds this value, the handler skips
   * the LLM call and returns a page-level disambiguation instead.
   * Defaults to DEFAULT_MAX_INLINE (60).
   */
  maxInlineCandidates?: number;
}

export async function handleAssistChat(
  req: AssistChatRequest,
  session: unknown,
  ctx: HandleAssistContext,
): Promise<AssistChatResponse> {
  // 1. Persona filter (fail-closed security boundary)
  const personas = ctx.getPersonas(session);
  const filtered = filterGraphForPersonas(ctx.graph, personas);

  if (filtered.actions.length === 0 && filtered.fields.length === 0) {
    return { kind: "refuse", reason: "off_topic" };
  }

  // 2. Scale threshold guard (G11): skip LLM when candidate set is too large
  const maxInline = ctx.maxInlineCandidates ?? DEFAULT_MAX_INLINE;
  if (filtered.actions.length > maxInline) {
    const uniquePages = [
      ...new Set(filtered.actions.map((a) => a.route)),
    ].sort();
    return {
      kind: "disambiguate",
      candidates: uniquePages.map((page) => ({
        label: { en: page },
        page,
        kind: "page" as const,
      })),
    };
  }

  // 3. Deterministic matcher (fast path, no LLM)
  const det = matchDeterministic(req.query, filtered);
  if (det) {
    return det as AssistChatResponse;
  }

  // 4. LLM fallback (only on filtered candidates)
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
        // Drive gate: only when flag on + execution hook exists + not a write + high confidence
        const agenticEnabled = process.env.ASSIST_AGENTIC_ENABLED === "1";
        if (
          agenticEnabled &&
          action.execution !== null &&
          action.effect !== "write" &&
          llm.confidence !== undefined &&
          llm.confidence > 0.8
        ) {
          return { kind: "drive", actionId: action.id, prefill: {} };
        }
        // Default: guide (flag off, write effect, low confidence, or no execution hook)
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
      const field = filtered.fields.find(
        (f) => normalize(f.label) === normalize(llm.id!),
      );
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
      return {
        kind: "refuse",
        reason: llm.kind === "off_topic" ? "off_topic" : "sensitive",
      };
    }
  } catch {
    // provider failure → fall through to name-the-page disambiguate
  }

  // G2: in-scope but unmatched → name the page (never refuse a real app question)
  return buildNameThePageResponse(filtered.pages);
}

function normalize(t: string | Record<string, string>): string {
  if (typeof t === "string") return t.toLowerCase();
  return (t.en ?? Object.values(t)[0] ?? "").toLowerCase();
}

const MAX_PAGE_CANDIDATES = 5;

function buildNameThePageResponse(pages: Page[]): AssistChatResponse {
  const candidates = pages.slice(0, MAX_PAGE_CANDIDATES).map((p) => ({
    kind: "page" as const,
    label: p.title,
    page: p.routeKey,
  }));
  return { kind: "disambiguate", candidates };
}
