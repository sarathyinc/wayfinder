import { loadGraph } from "@wayfinder/core";
import {
  createAssistHandler,
  defaultPersonaResolver,
} from "@wayfinder/adapter-nextjs";
import { createProvider } from "@wayfinder/providers";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedGraph: ReturnType<typeof loadGraph>["graph"] | null = null;

function getGraph() {
  if (!cachedGraph) {
    try {
      const json = readFileSync(
        join(process.cwd(), "capability_graph.json"),
        "utf8",
      );
      const loaded = loadGraph(json);
      if (loaded.ok) cachedGraph = loaded.graph;
    } catch {
      // Fall back to empty graph so the demo server starts cleanly
      cachedGraph = {
        version: 2,
        defaultLocale: "en",
        pages: [],
        actions: [],
        fields: [],
        transitions: [],
        tasks: [],
      };
    }
  }
  return cachedGraph!;
}

const provider = createProvider({ provider: "mock" });

/**
 * Session extraction is handled by createAssistHandler (cookie/Authorization
 * header). Replace `defaultPersonaResolver` with your own resolver — e.g. one
 * that reads from iron-session, Clerk, or your JWT — to enforce real roles.
 *
 * For the demo we use defaultPersonaResolver which maps any authenticated
 * session to ["user"]. Set data-persona on the widget or adapt the resolver
 * to return role-specific strings for your app.
 */
export const POST = createAssistHandler({
  graph: getGraph(),
  provider,
  getPersonas: (session) => {
    // Demo: treat any session as having the "intake_admin" role so the demo
    // graph (which uses that persona) remains visible. Real apps should use
    // their own session lookup here instead.
    if (session === null || session === undefined) {
      return ["intake_admin"]; // open demo — no auth required
    }
    const resolved = defaultPersonaResolver(session);
    return resolved.length > 0 ? resolved : ["intake_admin"];
  },
});
