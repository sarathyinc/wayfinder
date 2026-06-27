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

// Reconciliation harness (report mode)
export { diff } from "./reconcile/diff.js";
export { buildReport } from "./reconcile/report.js";
export { runReconciliation } from "./reconcile/harness.js";
export type {
  ControlSnapshot,
  ReconcileResult,
  ReconcileFinding,
} from "./reconcile/types.js";

// Providers are consumed via @wayfinder/providers at runtime (CLI/adapter host decides)

// Server-side progress hook — implement to persist completion server-side
export interface ServerProgressHook {
  getCompletedTasks(session: unknown): Promise<string[]>;
  markTaskComplete(session: unknown, taskId: string): Promise<void>;
}
