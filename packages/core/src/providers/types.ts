import type { CapabilityGraph, LocalizedText } from "../schema/index.js";

// ---------------------------------------------------------------------------
// LLM Provider abstraction (used by CLI compile and runtime chat handler)
// ---------------------------------------------------------------------------

export interface SourceBundle {
  routeKey: string;
  source: string; // redacted, bounded source for this route
  filePaths: string[];
}

export interface PerRouteCompileResult {
  description: LocalizedText;
  steps: LocalizedText[];
  fields: Array<{ label: LocalizedText; tab?: string | null; synonyms?: LocalizedText[] }>;
  synonyms: LocalizedText[];
}

export interface CandidateList {
  actions: Array<{ id: string; label: LocalizedText; route: string; effect: string }>;
  fields: Array<{ label: LocalizedText; page: string; tab?: string | null }>;
}

export interface LLMMatchResult {
  kind: "app_action" | "field_location" | "app_unknown" | "off_topic" | "sensitive";
  id?: string; // action id or canonical field label
  confidence?: number;
}

export interface FlowPassInput {
  actions: Array<{ id: string; route: string; personas: string[] }>;
  transitions: Array<{ from: string; to: string; via: string }>;
  personas: string[];
}

export interface SuggestedTask {
  id: string;
  title: LocalizedText;
  personas: string[];
  goal?: LocalizedText;
  sequence: string[];
  confidence?: number;
}

/**
 * Provider interface implemented by openai / anthropic / ollama packages.
 * The core only depends on the interface.
 */
export interface CompileProvider {
  readonly name: string;

  /**
   * Per-route text extraction (Stage 2a). Temperature 0 + structured output expected.
   */
  compilePerRoute(bundle: SourceBundle): Promise<PerRouteCompileResult>;

  /**
   * Global flow pass for suggested tasks (Stage 2b). Called when structure hash changes.
   */
  suggestTasks(input: FlowPassInput): Promise<SuggestedTask[]>;

  /**
   * LLM fallback matcher (only ever sees persona-filtered candidates).
   */
  matchIntent(query: string, candidates: CandidateList): Promise<LLMMatchResult>;
}
