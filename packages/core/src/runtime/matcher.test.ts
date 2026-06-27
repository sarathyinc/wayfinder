import { describe, it, expect } from "vitest";
import { matchDeterministic } from "./matcher.js";
import type { CapabilityGraph } from "../schema/index.js";

const simpleGraph: CapabilityGraph = {
  version: 2,
  defaultLocale: "en",
  pages: [
    { routeKey: "/donors", title: "Donor Records", personas: ["intake_admin"], available: true },
  ],
  actions: [
    {
      id: "donors.create",
      route: "/donors",
      label: "Log a new donor offer",
      personas: ["intake_admin"],
      effect: "write",
      params: [],
      synonyms: ["add donor"],
      steps: ["Open Donor Records", "Click Create"],
      spotlight: ["donors-create-button"],
      execution: null,
    },
  ],
  fields: [],
  transitions: [],
  tasks: [],
};

describe("matchDeterministic", () => {
  it("matches action by label", () => {
    const res = matchDeterministic("log a new donor offer", simpleGraph);
    expect(res?.kind).toBe("guide");
    if (res?.kind === "guide") {
      expect(res.actionId).toBe("donors.create");
    }
  });

  it("matches by synonym", () => {
    const res = matchDeterministic("add donor", simpleGraph);
    expect(res?.kind).toBe("guide");
  });

  it("returns null for unknown query", () => {
    const res = matchDeterministic("completely unrelated thing", simpleGraph);
    expect(res).toBeNull();
  });
});
