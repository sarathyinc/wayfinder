import { describe, it, expect } from "vitest";
import { createAssistHandler } from "./handler.js";
import type {
  CapabilityGraph,
  CompileProvider,
  CandidateList,
  LLMMatchResult,
  SourceBundle,
  PerRouteCompileResult,
  FlowPassInput,
  SuggestedTask,
} from "@wayfinder/core";

// ---------------------------------------------------------------------------
// Minimal inline mock provider (no LLM needed for unit tests)
// ---------------------------------------------------------------------------

class InlineMockProvider implements CompileProvider {
  readonly name = "inline-mock";
  async compilePerRoute(_b: SourceBundle): Promise<PerRouteCompileResult> {
    return { description: "mock", steps: [], fields: [], synonyms: [] };
  }
  async suggestTasks(_i: FlowPassInput): Promise<SuggestedTask[]> {
    return [];
  }
  async matchIntent(_q: string, _c: CandidateList): Promise<LLMMatchResult> {
    return { kind: "off_topic" };
  }
}

// ---------------------------------------------------------------------------
// Minimal graph with one action/page visible to "admin" persona
// ---------------------------------------------------------------------------

const GRAPH: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [
    {
      routeKey: "/dashboard",
      title: "Dashboard",
      personas: ["admin"],
      available: true,
    },
  ],
  actions: [
    {
      id: "view-dashboard",
      route: "/dashboard",
      label: "View Dashboard",
      personas: ["admin"],
      effect: "navigate",
      params: [],
      synonyms: [],
      steps: ["Go to dashboard"],
      spotlight: [],
      execution: null,
    },
  ],
  fields: [],
  transitions: [],
  tasks: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/assist/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createAssistHandler", () => {
  it("ignores client-supplied persona in request body", async () => {
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      // getPersonas returns [] so the filtered graph is empty → refuse
      getPersonas: () => [],
    });

    const req = makeRequest({ query: "view dashboard", persona: "admin" });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { kind: string };
    // Even though the body claimed "admin", getPersonas returns [] → fail-closed refuse
    expect(data.kind).toBe("refuse");
  });

  it("returns fail-closed refuse when getPersonas throws", async () => {
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      getPersonas: () => {
        throw new Error("session unavailable");
      },
    });

    const req = makeRequest({ query: "view dashboard" });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { kind: string };
    expect(data.kind).toBe("refuse");
  });

  it("returns guide response for valid session + matching query", async () => {
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      // Deterministic match: query = "View Dashboard" matches action label
      getPersonas: () => ["admin"],
    });

    const req = makeRequest({ query: "View Dashboard" });
    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { kind: string; actionId?: string };
    // matchDeterministic should find it or LLM fallback → either guide or disambiguate
    expect(["guide", "disambiguate"]).toContain(data.kind);
  });

  it("extracts session from Authorization header", async () => {
    let capturedSession: unknown;
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      getPersonas: (session) => {
        capturedSession = session;
        return [];
      },
    });

    const req = new Request("http://localhost/api/assist/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer tok-abc123",
      },
      body: JSON.stringify({ query: "test" }),
    });
    await handler(req);
    expect(capturedSession).toEqual({ authorization: "Bearer tok-abc123" });
  });

  it("extracts session from session cookie", async () => {
    let capturedSession: unknown;
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      getPersonas: (session) => {
        capturedSession = session;
        return [];
      },
    });

    const req = new Request("http://localhost/api/assist/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=sess-xyz; other=value",
      },
      body: JSON.stringify({ query: "test" }),
    });
    await handler(req);
    expect(capturedSession).toEqual({ sessionCookie: "sess-xyz" });
  });

  it("returns 400 for malformed JSON", async () => {
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      getPersonas: () => ["admin"],
    });

    const req = new Request("http://localhost/api/assist/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing query field", async () => {
    const handler = createAssistHandler({
      graph: GRAPH,
      provider: new InlineMockProvider(),
      getPersonas: () => ["admin"],
    });

    const req = makeRequest({ message: "oops" });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });
});
