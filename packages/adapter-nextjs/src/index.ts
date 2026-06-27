export { handleAssistChat } from "@wayfinder/core";
export { openAction, registerActionListener } from "./command-bus.js";
export type { AssistChatRequest, AssistChatResponse } from "@wayfinder/core";

// Flagship endpoint helper
export { createAssistHandler } from "./handler.js";
export type { CreateAssistHandlerOptions } from "./handler.js";

// Default server-side persona resolver
export { defaultPersonaResolver } from "./persona.js";

// Next.js App Router discovery
export { discoverNextjsRoutes } from "./discover.js";
export type {
  Manifest,
  ManifestRoute,
  ManifestTransition,
} from "./discover.js";

// Providers are consumed via @wayfinder/providers at runtime (CLI/adapter host decides)
