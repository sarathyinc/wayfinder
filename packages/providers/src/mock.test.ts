import { describe, it, expect } from "vitest";
import { createMockProvider } from "./mock.js";

describe("MockProvider", () => {
  const provider = createMockProvider();

  it("implements CompileProvider", () => {
    expect(provider.name).toBe("mock");
    expect(typeof provider.compilePerRoute).toBe("function");
    expect(typeof provider.matchIntent).toBe("function");
  });

  it("matchIntent finds action by label", async () => {
    const res = await provider.matchIntent("log a new donor offer", {
      actions: [{ id: "donors.create", label: "Log a new donor offer", route: "/donors", effect: "write" }],
      fields: [],
    });
    expect(res.kind).toBe("app_action");
    expect(res.id).toBe("donors.create");
  });
});
