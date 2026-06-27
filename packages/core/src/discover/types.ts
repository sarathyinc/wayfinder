import type { LocalizedText } from "../schema/index.js";

// ---------------------------------------------------------------------------
// Manifest (output of deterministic Stage 1 Discover)
// ---------------------------------------------------------------------------

export interface ManifestRoute {
  routeKey: string;
  personas: string[];
  title?: LocalizedText;
  sourceHash: string;
  sourceBundle: string; // redacted
  filePaths: string[];
}

export interface ManifestTransition {
  from: string;
  to: string;
  via: string; // action id
}

export interface Manifest {
  routes: ManifestRoute[];
  transitions: ManifestTransition[];
}

// ---------------------------------------------------------------------------
// Compile cache shapes (internal, committed alongside the graph)
// ---------------------------------------------------------------------------

export interface RouteCompileCache {
  [sourceHash: string]: {
    description: LocalizedText;
    steps: LocalizedText[];
    fields: Array<{ label: LocalizedText; tab?: string | null; synonyms?: LocalizedText[] }>;
    synonyms: LocalizedText[];
  };
}

export interface TaskStructureCache {
  structureHash: string;
  tasks: Array<{
    id: string;
    title: LocalizedText;
    personas: string[];
    goal?: LocalizedText;
    sequence: string[];
    source: "suggested" | "annotated";
    confidence?: number;
  }>;
}

export interface CompileCache {
  routes: RouteCompileCache;
  tasks?: TaskStructureCache;
}
