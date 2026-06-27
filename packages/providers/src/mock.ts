import type {
  CompileProvider,
  SourceBundle,
  PerRouteCompileResult,
  FlowPassInput,
  SuggestedTask,
  CandidateList,
  LLMMatchResult,
} from "@wayfinder/core";

export class MockProvider implements CompileProvider {
  readonly name = "mock";

  async compilePerRoute(bundle: SourceBundle): Promise<PerRouteCompileResult> {
    // Simple deterministic mock for zero-annotation demo
    const route = bundle.routeKey;
    return {
      description: `Mock description for ${route}`,
      steps: [`Open ${route}`, "Interact with controls"],
      fields: [],
      synonyms: [],
    };
  }

  async suggestTasks(input: FlowPassInput): Promise<SuggestedTask[]> {
    // Enhanced for full demo: always suggest if actions present (Phase 2)
    if (input.actions.length === 0) return [];
    return [{
      id: `suggested-flow-${input.personas[0] || "user"}`,
      title: "Complete basic flow",
      personas: input.personas.length ? input.personas : ["user"],
      sequence: input.actions.slice(0, Math.min(2, input.actions.length)).map(a => a.id),
      confidence: 0.7,
    }];
  }

  async matchIntent(query: string, candidates: CandidateList): Promise<LLMMatchResult> {
    const q = query.toLowerCase();
    for (const a of candidates.actions) {
      const labelRaw = typeof a.label === "string" ? a.label : Object.values(a.label)[0] || "";
      const label = String(labelRaw).toLowerCase();
      if (q.includes(label) || label.includes(q)) {
        return { kind: "app_action", id: a.id, confidence: 0.85 };
      }
    }
    for (const f of candidates.fields) {
      const labelRaw = typeof f.label === "string" ? f.label : Object.values(f.label)[0] || "";
      const label = String(labelRaw).toLowerCase();
      if (q.includes(label) || label.includes(q)) {
        return { kind: "field_location", id: label, confidence: 0.8 };
      }
    }
    if (q.includes("weather") || q.includes("hello")) {
      return { kind: "off_topic" };
    }
    return { kind: "app_unknown" };
  }
}

export const createMockProvider = () => new MockProvider();
