import { describe, it, expect } from "vitest";
import { handleAssistChat } from "./handler.js";
import type { CapabilityGraph } from "../schema/index.js";
import type { CompileProvider } from "../providers/types.js";

const mockGraph: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [
    {
      routeKey: "/donors",
      title: "Donor Records",
      personas: ["intake_admin"],
      available: true,
    },
  ],
  actions: [
    {
      id: "donors.create",
      route: "/donors",
      label: "Log a new donor offer",
      personas: ["intake_admin"],
      effect: "write",
      params: [],
      synonyms: [],
      steps: ["Go to Donors", "Click create"],
      spotlight: [],
      execution: null,
    },
    {
      id: "donors.view",
      route: "/donors",
      label: "View donor list",
      personas: ["intake_admin"],
      effect: "navigate",
      params: [],
      synonyms: [],
      steps: ["Go to Donors"],
      spotlight: [],
      execution: { navigate: "/donors", tier: "command-bus" },
    },
  ],
  fields: [
    {
      label: "Terminal Creatinine",
      page: "/donors",
      tab: "Labs",
      personas: ["intake_admin"],
      synonyms: [],
    },
  ],
  transitions: [],
  tasks: [],
};

const mockProvider: CompileProvider = {
  name: "mock",
  async compilePerRoute() {
    throw new Error("not used");
  },
  async suggestTasks() {
    return [];
  },
  async matchIntent(query: string) {
    if (query.toLowerCase().includes("creatinine")) {
      return { kind: "field_location", id: "Terminal Creatinine" };
    }
    return { kind: "app_unknown" };
  },
};

describe("handleAssistChat", () => {
  it("uses persona filter (fail closed)", async () => {
    const res = await handleAssistChat(
      { query: "how do I log donor" },
      {},
      { graph: mockGraph, provider: mockProvider, getPersonas: () => [] },
    );
    expect(res.kind).toBe("refuse");
  });

  it("falls back to LLM matcher for field", async () => {
    const res = await handleAssistChat(
      { query: "where is terminal creatinine" },
      {},
      {
        graph: mockGraph,
        provider: mockProvider,
        getPersonas: () => ["intake_admin"],
      },
    );
    expect(res.kind).toBe("field");
  });

  it("refuses off topic via LLM", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "off_topic" };
      },
    };
    const res = await handleAssistChat(
      { query: "what is the weather" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("refuse");
    if (res.kind === "refuse") expect(res.reason).toBe("off_topic");
  });

  it("passes session object through to getPersonas", async () => {
    const session = { userId: "abc123", role: "intake_admin" };
    let capturedSession: unknown;
    const res = await handleAssistChat(
      { query: "how do I log donor" },
      session,
      {
        graph: mockGraph,
        provider: mockProvider,
        getPersonas: (s) => {
          capturedSession = s;
          return ["intake_admin"];
        },
      },
    );
    expect(capturedSession).toBe(session);
  });

  it("client-supplied persona field is absent and cannot change visible set", async () => {
    // The request type no longer has a 'persona' field.
    // Even if a caller tries to sneak one in, getPersonas must use the session.
    let sessionUsed: unknown;
    const req = { query: "how do I log donor" };
    // Verify the type does not accept 'persona' as a known field
    // (TypeScript enforcement; at runtime we just verify session is what drives personas)
    const res = await handleAssistChat(
      req,
      { userId: "trusted" },
      {
        graph: mockGraph,
        provider: mockProvider,
        getPersonas: (s) => {
          sessionUsed = s;
          return [];
        },
      },
    );
    expect(res.kind).toBe("refuse");
    expect(sessionUsed).toEqual({ userId: "trusted" });
  });

  it("empty persona list (fail-closed) yields refuse", async () => {
    const res = await handleAssistChat({ query: "log a donor" }, null, {
      graph: mockGraph,
      provider: mockProvider,
      getPersonas: () => [],
    });
    expect(res.kind).toBe("refuse");
  });

  // G2: in-scope but unmatched → disambiguate with page candidates, never refuse
  it("in-scope unmatched app_unknown → disambiguate with page candidates", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "app_unknown" };
      },
    };
    const res = await handleAssistChat(
      { query: "do something unrecognized" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("disambiguate");
    if (res.kind === "disambiguate") {
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates[0]?.kind).toBe("page");
    }
  });

  it("in-scope unmatched app_action (no match found) → disambiguate not refuse", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "app_action", id: "nonexistent.action" };
      },
    };
    const res = await handleAssistChat(
      { query: "delete everything" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("disambiguate");
    if (res.kind === "disambiguate") {
      expect(res.candidates.every((c) => c.kind === "page")).toBe(true);
    }
  });

  it("in-scope unmatched field_location (no match found) → disambiguate not refuse", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "field_location", id: "Nonexistent Field" };
      },
    };
    const res = await handleAssistChat(
      { query: "where is something unknown" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("disambiguate");
    if (res.kind === "disambiguate") {
      expect(res.candidates.every((c) => c.kind === "page")).toBe(true);
    }
  });

  it("off_topic LLM classification → refuse with reason off_topic", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "off_topic" };
      },
    };
    const res = await handleAssistChat(
      { query: "who won the world cup" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("refuse");
    if (res.kind === "refuse") expect(res.reason).toBe("off_topic");
  });

  it("sensitive LLM classification → refuse with reason sensitive", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "sensitive" };
      },
    };
    const res = await handleAssistChat(
      { query: "patient ssn lookup" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("refuse");
    if (res.kind === "refuse") expect(res.reason).toBe("sensitive");
  });

  it("provider failure (throws) → disambiguate with page candidates, not refuse", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        throw new Error("network timeout");
      },
    };
    const res = await handleAssistChat(
      { query: "do something unrecognized" },
      {},
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] },
    );
    expect(res.kind).toBe("disambiguate");
    if (res.kind === "disambiguate") {
      expect(res.candidates[0]?.kind).toBe("page");
    }
  });

  // G11: scale threshold
  describe("scale threshold (G11)", () => {
    function makeActions(n: number): CapabilityGraph["actions"] {
      return Array.from({ length: n }, (_, i) => ({
        id: `action-${i}`,
        label: { en: `Action ${i}` },
        route: `/page-${Math.floor(i / 5)}`,
        steps: [],
        effect: "read" as const,
        execution: null,
        available: true,
        spotlight: null,
        personas: ["intake_admin"],
        params: [],
        synonyms: [],
      }));
    }

    function makePages(routes: string[]): CapabilityGraph["pages"] {
      return routes.map((r) => ({
        routeKey: r,
        title: r,
        personas: ["intake_admin"],
        available: true,
      }));
    }

    it("below threshold (5 actions) → LLM is called", async () => {
      const actions = makeActions(5);
      const uniqueRoutes = [...new Set(actions.map((a) => a.route))];
      let llmCalled = false;
      const provider: CompileProvider = {
        ...mockProvider,
        async matchIntent() {
          llmCalled = true;
          return { kind: "off_topic" };
        },
      };
      const graph: CapabilityGraph = {
        ...mockGraph,
        pages: makePages(uniqueRoutes),
        actions,
        fields: [],
      };
      await handleAssistChat(
        { query: "do something" },
        {},
        { graph, provider, getPersonas: () => ["intake_admin"] },
      );
      expect(llmCalled).toBe(true);
    });

    it("at threshold exactly 60 → LLM is called", async () => {
      const actions = makeActions(60);
      const uniqueRoutes = [...new Set(actions.map((a) => a.route))];
      let llmCalled = false;
      const provider: CompileProvider = {
        ...mockProvider,
        async matchIntent() {
          llmCalled = true;
          return { kind: "off_topic" };
        },
      };
      const graph: CapabilityGraph = {
        ...mockGraph,
        pages: makePages(uniqueRoutes),
        actions,
        fields: [],
      };
      await handleAssistChat(
        { query: "do something" },
        {},
        { graph, provider, getPersonas: () => ["intake_admin"] },
      );
      expect(llmCalled).toBe(true);
    });

    it("above threshold (61 actions) → disambiguate returned; LLM NOT called", async () => {
      const actions = makeActions(61);
      const uniqueRoutes = [...new Set(actions.map((a) => a.route))];
      let llmCalled = false;
      const provider: CompileProvider = {
        ...mockProvider,
        async matchIntent() {
          llmCalled = true;
          return { kind: "off_topic" };
        },
      };
      const graph: CapabilityGraph = {
        ...mockGraph,
        pages: makePages(uniqueRoutes),
        actions,
        fields: [],
      };
      const res = await handleAssistChat(
        { query: "do something" },
        {},
        { graph, provider, getPersonas: () => ["intake_admin"] },
      );
      expect(llmCalled).toBe(false);
      expect(res.kind).toBe("disambiguate");
      if (res.kind === "disambiguate") {
        expect(res.candidates.every((c) => c.kind === "page")).toBe(true);
      }
    });

    it("custom threshold (maxInlineCandidates: 3), 4 actions → disambiguate; LLM NOT called", async () => {
      const actions = makeActions(4);
      const uniqueRoutes = [...new Set(actions.map((a) => a.route))];
      let llmCalled = false;
      const provider: CompileProvider = {
        ...mockProvider,
        async matchIntent() {
          llmCalled = true;
          return { kind: "off_topic" };
        },
      };
      const graph: CapabilityGraph = {
        ...mockGraph,
        pages: makePages(uniqueRoutes),
        actions,
        fields: [],
      };
      const res = await handleAssistChat(
        { query: "do something" },
        {},
        {
          graph,
          provider,
          getPersonas: () => ["intake_admin"],
          maxInlineCandidates: 3,
        },
      );
      expect(llmCalled).toBe(false);
      expect(res.kind).toBe("disambiguate");
    });

    it("pages are deduplicated and sorted — 10 actions across 3 routes → 3 unique pages in alphabetical order", async () => {
      // Explicitly build actions with known, non-sequential routes
      const actions: CapabilityGraph["actions"] = [
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `a-${i}`,
          label: { en: `A ${i}` },
          route: "/route-c",
          steps: [],
          effect: "read" as const,
          execution: null,
          available: true,
          spotlight: null,
          personas: ["intake_admin"],
          params: [],
          synonyms: [],
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `b-${i}`,
          label: { en: `B ${i}` },
          route: "/route-a",
          steps: [],
          effect: "read" as const,
          execution: null,
          available: true,
          spotlight: null,
          personas: ["intake_admin"],
          params: [],
          synonyms: [],
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `c-${i}`,
          label: { en: `C ${i}` },
          route: "/route-b",
          steps: [],
          effect: "read" as const,
          execution: null,
          available: true,
          spotlight: null,
          personas: ["intake_admin"],
          params: [],
          synonyms: [],
        })),
      ];
      const graph: CapabilityGraph = {
        ...mockGraph,
        pages: makePages(["/route-a", "/route-b", "/route-c"]),
        actions,
        fields: [],
      };
      const res = await handleAssistChat(
        { query: "do something" },
        {},
        {
          graph,
          provider: mockProvider,
          getPersonas: () => ["intake_admin"],
          maxInlineCandidates: 3,
        },
      );
      expect(res.kind).toBe("disambiguate");
      if (res.kind === "disambiguate") {
        expect(res.candidates).toHaveLength(3);
        expect(res.candidates.map((c) => c.page)).toEqual([
          "/route-a",
          "/route-b",
          "/route-c",
        ]);
        expect(res.candidates.every((c) => c.kind === "page")).toBe(true);
      }
    });
  });

  // G8: ASSIST_AGENTIC_ENABLED kill-switch
  describe("agentic kill-switch (G8)", () => {
    const driveProvider: CompileProvider = {
      ...mockProvider,
      async matchIntent() {
        return { kind: "app_action", id: "donors.view", confidence: 0.95 };
      },
    };

    it("flag OFF: high-confidence non-write action with execution → guide (not drive)", async () => {
      delete process.env.ASSIST_AGENTIC_ENABLED;
      const res = await handleAssistChat(
        { query: "show donors" },
        {},
        {
          graph: mockGraph,
          provider: driveProvider,
          getPersonas: () => ["intake_admin"],
        },
      );
      expect(res.kind).toBe("guide");
      if (res.kind === "guide") {
        expect(res.actionId).toBe("donors.view");
      }
    });

    it("flag ON: high-confidence non-write action with non-null execution → drive", async () => {
      process.env.ASSIST_AGENTIC_ENABLED = "1";
      try {
        const res = await handleAssistChat(
          { query: "show donors" },
          {},
          {
            graph: mockGraph,
            provider: driveProvider,
            getPersonas: () => ["intake_admin"],
          },
        );
        expect(res.kind).toBe("drive");
        if (res.kind === "drive") {
          expect(res.actionId).toBe("donors.view");
          expect(res.prefill).toEqual({});
        }
      } finally {
        delete process.env.ASSIST_AGENTIC_ENABLED;
      }
    });

    it("flag ON: high-confidence WRITE action → guide (never auto-submit)", async () => {
      process.env.ASSIST_AGENTIC_ENABLED = "1";
      const writeProvider: CompileProvider = {
        ...mockProvider,
        async matchIntent() {
          return { kind: "app_action", id: "donors.create", confidence: 0.95 };
        },
      };
      try {
        const res = await handleAssistChat(
          { query: "log a new donor" },
          {},
          {
            graph: mockGraph,
            provider: writeProvider,
            getPersonas: () => ["intake_admin"],
          },
        );
        expect(res.kind).toBe("guide");
        if (res.kind === "guide") {
          expect(res.actionId).toBe("donors.create");
        }
      } finally {
        delete process.env.ASSIST_AGENTIC_ENABLED;
      }
    });

    it("flag OFF snapshot: result is byte-identical to navigate+guide (same actionId, steps, route)", async () => {
      delete process.env.ASSIST_AGENTIC_ENABLED;
      const res = await handleAssistChat(
        { query: "show donors" },
        {},
        {
          graph: mockGraph,
          provider: driveProvider,
          getPersonas: () => ["intake_admin"],
        },
      );
      expect(res.kind).toBe("guide");
      if (res.kind === "guide") {
        expect(res.actionId).toBe("donors.view");
        expect(res.steps).toEqual(["Go to Donors"]);
        expect(res.route).toBe("/donors");
      }
    });
  });
});
