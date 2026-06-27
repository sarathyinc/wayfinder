export { MockProvider, createMockProvider } from "./mock.js";
export { OpenAIProvider, createOpenAIProvider } from "./openai.js";
export { AnthropicProvider, createAnthropicProvider } from "./anthropic.js";
export { OllamaProvider, createOllamaProvider } from "./ollama.js";

export type { CompileProvider } from "@wayfinder/core";

// Factory helper (v1: prefers real if key provided, else mock for zero friction)
import type { CompileProvider } from "@wayfinder/core";
import { MockProvider } from "./mock.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";

export interface ProviderConfig {
  provider: "mock" | "openai" | "anthropic" | "ollama";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function createProvider(config: ProviderConfig): CompileProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config.apiKey, config.model);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    case "ollama":
      return new OllamaProvider(config.baseUrl, config.model);
    default:
      return new MockProvider();
  }
}
