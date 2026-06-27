export * from "../discover/types.js"; // Manifest + cache shapes live here for now

export interface CompileOptions {
  provider: import("../providers/types.js").CompileProvider;
  redactGlobs?: string[];
}
