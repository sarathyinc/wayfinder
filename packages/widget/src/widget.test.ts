import { describe, it, expect, beforeEach } from "vitest";
import "./assist-widget.js";

describe("AssistWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = `<assist-widget></assist-widget>`;
  });

  it("renders launcher button", () => {
    const el = document.querySelector("assist-widget");
    expect(el).toBeTruthy();
    const launcher = el?.shadowRoot?.querySelector("#launcher");
    expect(launcher).toBeTruthy();
  });
});
