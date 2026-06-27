import type { CompileProvider, SourceBundle, PerRouteCompileResult, FlowPassInput, SuggestedTask, CandidateList, LLMMatchResult } from "@wayfinder/core";

export class AnthropicProvider implements CompileProvider {
  readonly name = "anthropic";
  constructor(private apiKey?: string) {}

  async compilePerRoute(bundle: SourceBundle): Promise<PerRouteCompileResult> {
    return this.mockCompile(bundle);
  }

  async suggestTasks(input: FlowPassInput): Promise<SuggestedTask[]> {
    return this.mockSuggest(input);
  }

  async matchIntent(query: string, candidates: CandidateList): Promise<LLMMatchResult> {
    return this.mockMatch(query, candidates);
  }

  private mockCompile(bundle: SourceBundle): PerRouteCompileResult {
    return {
      description: `Content for route ${bundle.routeKey}`,
      steps: ["Visit the page", "Interact"],
      fields: [],
      synonyms: [],
    };
  }

  private mockSuggest(input: FlowPassInput): SuggestedTask[] {
    return input.actions.length >= 2 ? [{
      id: `anthropic-flow`,
      title: "Anthropic suggested flow",
      personas: input.personas,
      sequence: input.actions.slice(0,2).map(a=>a.id),
      confidence: 0.6,
    }] : [];
  }

  private mockMatch(query: string, candidates: CandidateList): LLMMatchResult {
    // Reuse logic
    const q = query.toLowerCase();
    const found = candidates.actions.find(a => String(a.label).toLowerCase().includes(q));
    if (found) return { kind: "app_action", id: found.id };
    return { kind: "app_unknown" };
  }
}

export function createAnthropicProvider(apiKey?: string) { return new AnthropicProvider(apiKey); }
