import { describe, it, expect, vi } from "vitest";
import { createRemixAssistHandler } from "./handler.js";
import type { CapabilityGraph, CompileProvider } from "@wayfinder/core";

const mockGraph: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [
    {
      routeKey: "/donors",
      title: { en: "Donors" },
      personas: ["admin"],
      available: true,
    },
  ],
  actions: [
    {
      id: "donors.view",
      label: { en: "View Donors" },
      route: "/donors",
      personas: ["admin"],
      steps: [],
      effect: "navigate",
      params: [],
      synonyms: [],
      spotlight: [],
      execution: null,
    },
  ],
  fields: [],
  transitions: [],
  tasks: [],
};

const mockProvider: CompileProvider = {
  name: "mock",
  matchIntent: vi
    .fn()
    .mockResolvedValue({
      kind: "app_action",
      id: "donors.view",
      confidence: 0.9,
    }),
  compilePerRoute: vi.fn(),
  suggestTasks: vi.fn().mockResolvedValue([]),
};

describe("createRemixAssistHandler", () => {
  it("returns 405 for non-POST requests", async () => {
    const handler = createRemixAssistHandler({
      graph: mockGraph,
      provider: mockProvider,
      getPersonas: () => ["admin"],
    });
    const res = await handler({
      request: new Request("http://localhost/assist/chat", { method: "GET" }),
    });
    expect(res.status).toBe(405);
  });

  it("returns 400 for invalid JSON", async () => {
    const handler = createRemixAssistHandler({
      graph: mockGraph,
      provider: mockProvider,
      getPersonas: () => ["admin"],
    });
    const res = await handler({
      request: new Request("http://localhost/assist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("processes a valid request and returns a response", async () => {
    const handler = createRemixAssistHandler({
      graph: mockGraph,
      provider: mockProvider,
      getPersonas: () => ["admin"],
    });
    const res = await handler({
      request: new Request("http://localhost/assist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "view donors",
          context: { route: "/donors" },
        }),
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect([
      "guide",
      "navigate",
      "field",
      "disambiguate",
      "refuse",
      "drive",
    ]).toContain(data.kind);
  });

  it("extracts session from Cookie header", async () => {
    const getPersonas = vi.fn().mockReturnValue(["admin"]);
    const handler = createRemixAssistHandler({
      graph: mockGraph,
      provider: mockProvider,
      getPersonas,
    });
    await handler({
      request: new Request("http://localhost/assist/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=abc123; other=x",
        },
        body: JSON.stringify({
          query: "view donors",
          context: { route: "/donors" },
        }),
      }),
    });
    expect(getPersonas).toHaveBeenCalledWith({ sessionCookie: "abc123" });
  });
});
