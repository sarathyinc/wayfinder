import { describe, it, expect } from "vitest";
import { CapabilityGraphSchema } from "./index.js";

const minimalValid = {
  version: 2,
  pages: [{ routeKey: "/donors", title: "Donor Records", personas: ["admin"] }],
  actions: [
    {
      id: "donors.create",
      route: "/donors",
      label: "Log a new donor offer",
      personas: ["admin"],
      effect: "write",
    },
  ],
};

describe("CapabilityGraphSchema", () => {
  it("accepts a minimal valid graph and applies defaults", () => {
    const parsed = CapabilityGraphSchema.parse(minimalValid);
    expect(parsed.defaultLocale).toBe("en");
    expect(parsed.fields).toEqual([]);
    expect(parsed.transitions).toEqual([]);
    expect(parsed.tasks).toEqual([]);
    expect(parsed.pages[0]!.available).toBe(true);
    expect(parsed.actions[0]!.params).toEqual([]);
    expect(parsed.actions[0]!.execution).toBeNull();
  });

  it("rejects an unknown effect", () => {
    const bad = structuredClone(minimalValid);
    (bad.actions[0] as { effect: string }).effect = "explode";
    expect(CapabilityGraphSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects version other than 2", () => {
    const bad = structuredClone(minimalValid);
    (bad as { version: number }).version = 1;
    expect(CapabilityGraphSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts localized text as a locale map", () => {
    const ok = structuredClone(minimalValid);
    (ok.pages[0] as { title: unknown }).title = {
      en: "Donor Records",
      es: "Registros",
    };
    expect(CapabilityGraphSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects an empty locale map as a title", () => {
    const bad = structuredClone(minimalValid);
    (bad.pages[0] as { title: unknown }).title = {};
    expect(CapabilityGraphSchema.safeParse(bad).success).toBe(false);
  });
});
