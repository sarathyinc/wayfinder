import { NextRequest, NextResponse } from "next/server";
import { handleAssistChat, loadGraph } from "@wayfinder/core";
import { createProvider } from "@wayfinder/providers";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let graph: any;

function getGraph() {
  if (!graph) {
    try {
      const json = readFileSync(join(process.cwd(), "capability_graph.json"), "utf8");
      const loaded = loadGraph(json);
      if (loaded.ok) graph = loaded.graph;
    } catch {
      graph = { version: 2, defaultLocale: "en", pages: [], actions: [], fields: [], transitions: [], tasks: [] };
    }
  }
  return graph;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Use mock for demo (zero key). Change to openai etc with env in real.
  const provider = createProvider({ provider: "mock" });

  const res = await handleAssistChat(body, {
    graph: getGraph(),
    provider,
    getPersonas: () => ["intake_admin"], // mock session
  });

  return NextResponse.json(res);
}
