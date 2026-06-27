import type { CompileProvider, SourceBundle, PerRouteCompileResult, FlowPassInput, SuggestedTask, CandidateList, LLMMatchResult } from "@wayfinder/core";
import OpenAI from "openai";

export class OpenAIProvider implements CompileProvider {
  readonly name = "openai";
  private client: OpenAI | null = null;

  constructor(apiKey?: string, model = "gpt-4o-mini") {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.model = model;
    }
  }
  private model = "gpt-4o-mini";

  async compilePerRoute(bundle: SourceBundle): Promise<PerRouteCompileResult> {
    if (!this.client) return this.mockCompile(bundle);
    // In real: call with JSON schema for structured output
    // For this impl, simulate
    return this.mockCompile(bundle);
  }

  async suggestTasks(input: FlowPassInput): Promise<SuggestedTask[]> {
    if (!this.client) return this.mockSuggest(input);
    return this.mockSuggest(input);
  }

  async matchIntent(query: string, candidates: CandidateList): Promise<LLMMatchResult> {
    if (!this.client) return this.mockMatch(query, candidates);
    return this.mockMatch(query, candidates);
  }

  private mockCompile(bundle: SourceBundle): PerRouteCompileResult {
    return {
      description: `Page for ${bundle.routeKey}`,
      steps: [`Navigate to ${bundle.routeKey}`, "Use the UI elements"],
      fields: [],
      synonyms: [],
    };
  }

  private mockSuggest(input: FlowPassInput): SuggestedTask[] {
    if (input.actions.length < 2) return [];
    return [{
      id: `flow-${input.personas[0] || "user"}`,
      title: "Complete primary flow",
      personas: input.personas,
      sequence: input.actions.slice(0, 3).map(a => a.id),
      confidence: 0.65,
    }];
  }

  private mockMatch(query: string, candidates: CandidateList): LLMMatchResult {
    const q = query.toLowerCase();
    for (const a of candidates.actions) {
      const l = (a.label as any).toLowerCase ? (a.label as any).toLowerCase() : String(a.label).toLowerCase();
      if (q.includes(l) || l.includes(q)) return { kind: "app_action", id: a.id, confidence: 0.9 };
    }
    for (const f of candidates.fields) {
      const l = String(f.label).toLowerCase();
      if (q.includes(l)) return { kind: "field_location", id: l, confidence: 0.85 };
    }
    return { kind: "app_unknown" };
  }
}

export function createOpenAIProvider(apiKey?: string) {
  return new OpenAIProvider(apiKey);
}
