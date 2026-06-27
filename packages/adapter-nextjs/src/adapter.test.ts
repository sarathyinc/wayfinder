import { describe, it, expect } from "vitest";

describe("adapter-nextjs", () => {
  it("exports handler", async () => {
    const mod = await import("./index.js");
    expect(typeof mod.handleAssistChat).toBe("function");
  });
});
