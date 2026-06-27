import { describe, it, expect } from "vitest";
import { handleAssistChat } from "./handler.js";
import type { CapabilityGraph } from "../schema/index.js";
import type { CompileProvider } from "../providers/types.js";

const mockGraph: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [{ routeKey: "/donors", title: "Donor Records", personas: ["intake_admin"], available: true }],
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
  ],
  fields: [{ label: "Terminal Creatinine", page: "/donors", tab: "Labs", personas: ["intake_admin"], synonyms: [] }],
  transitions: [],
  tasks: [],
};

const mockProvider: CompileProvider = {
  name: "mock",
  async compilePerRoute() { throw new Error("not used"); },
  async suggestTasks() { return []; },
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
      { query: "how do I log donor", persona: "unknown_role" },
      { graph: mockGraph, provider: mockProvider, getPersonas: () => [] }
    );
    expect(res.kind).toBe("refuse");
  });

  it("falls back to LLM matcher for field", async () => {
    const res = await handleAssistChat(
      { query: "where is terminal creatinine", persona: "intake_admin" },
      { graph: mockGraph, provider: mockProvider, getPersonas: () => ["intake_admin"] }
    );
    expect(res.kind).toBe("field");
  });

  it("refuses off topic via LLM", async () => {
    const provider: CompileProvider = {
      ...mockProvider,
      async matchIntent() { return { kind: "off_topic" }; },
    };
    const res = await handleAssistChat(
      { query: "what is the weather", persona: "intake_admin" },
      { graph: mockGraph, provider, getPersonas: () => ["intake_admin"] }
    );
    expect(res.kind).toBe("refuse");
    if (res.kind === "refuse") expect(res.reason).toBe("off_topic");
  });
});
