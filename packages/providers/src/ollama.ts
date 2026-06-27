import type { CompileProvider, SourceBundle, PerRouteCompileResult, FlowPassInput, SuggestedTask, CandidateList, LLMMatchResult } from "@wayfinder/core";

export class OllamaProvider implements CompileProvider {
  readonly name = "ollama";
  constructor(private baseUrl = "http://localhost:11434", private model = "llama3.2") {}

  async compilePerRoute(bundle: SourceBundle): Promise<PerRouteCompileResult> {
    // Would call /api/generate with prompt + JSON schema
    // For now, mock
    return {
      description: `Ollama generated for ${bundle.routeKey}`,
      steps: ["Open page", "Perform action"],
      fields: [],
      synonyms: [],
    };
  }

  async suggestTasks(input: FlowPassInput): Promise<SuggestedTask[]> {
    return input.actions.length > 0 ? [{
      id: "ollama-suggested-task",
      title: "Ollama suggested onboarding",
      personas: input.personas,
      sequence: input.actions.slice(0, Math.min(3, input.actions.length)).map(a => a.id),
      confidence: 0.55,
    }] : [];
  }

  async matchIntent(query: string, candidates: CandidateList): Promise<LLMMatchResult> {
    const q = query.toLowerCase();
    for (const a of candidates.actions) {
      if (String(a.label).toLowerCase().includes(q)) {
        return { kind: "app_action", id: a.id, confidence: 0.75 };
      }
    }
    return { kind: "app_unknown" };
  }
}

export function createOllamaProvider(baseUrl?: string) {
  return new OllamaProvider(baseUrl);
}
