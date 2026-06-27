export const CORE_VERSION = "0.0.0";

export * from "./schema/index.js";
export * from "./graph/validate.js";
export * from "./graph/load.js";

// New Phase 1 runtime + compile surface
export * from "./providers/types.js";
export * from "./discover/types.js";
export * from "./discover/index.js";
export * from "./runtime/types.js";
export { matchDeterministic } from "./runtime/matcher.js";
export { handleAssistChat } from "./runtime/handler.js";

// compile utilities
export { hashString, computeGraphStructureHash } from "./compile/hash.js";
export { defineAction, defineTask, getRegisteredAnnotations } from "./annotations.js";
