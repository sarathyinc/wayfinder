import { describe, it, expect } from "vitest";
import { CORE_VERSION } from "./index.js";

describe("core package", () => {
  it("exposes a version constant", () => {
    expect(CORE_VERSION).toBe("0.0.0");
  });
});
