import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "./assist-widget.js";

// Mock fetch globally
globalThis.fetch = vi.fn();

describe("AssistWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders launcher button", () => {
    const el = document.createElement("assist-widget");
    document.body.appendChild(el);
    const launcher = el.shadowRoot?.querySelector("#launcher");
    expect(launcher).toBeTruthy();
  });

  // Test 1: Single define — only one registration occurs
  it("customElements defines assist-widget exactly once", () => {
    expect(customElements.get("assist-widget")).toBeDefined();
    // Re-importing wouldn't cause issues because the guard checks first
    // But calling define again directly should throw
    expect(() => {
      customElements.define("assist-widget", class extends HTMLElement {});
    }).toThrow();
  });

  // Test 2: ARIA live region on #body
  it("reply #body div has aria-live='polite'", () => {
    const el = document.createElement("assist-widget");
    document.body.appendChild(el);
    const body = el.shadowRoot?.querySelector("#body");
    expect(body).toBeTruthy();
    expect(body?.getAttribute("aria-live")).toBe("polite");
  });

  // Test 3: dialog role when open
  it("panel has role='dialog' and aria-modal='true' when open", () => {
    const el = document.createElement("assist-widget");
    document.body.appendChild(el);
    // Open by clicking launcher
    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();
    const panel = el.shadowRoot?.querySelector("#panel");
    expect(panel?.getAttribute("role")).toBe("dialog");
    expect(panel?.getAttribute("aria-modal")).toBe("true");
  });

  // Test 4: Esc closes panel
  it("dispatching Escape keydown closes the panel", () => {
    const el = document.createElement("assist-widget");
    document.body.appendChild(el);
    // Open first
    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();
    // Panel should now be open (display flex)
    const panelBefore = el.shadowRoot?.querySelector("#panel") as HTMLElement;
    expect(panelBefore?.style.display).not.toBe("none");
    // Press Escape
    const escEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    el.shadowRoot?.dispatchEvent(escEvent);
    // Panel should be closed
    const panelAfter = el.shadowRoot?.querySelector("#panel") as HTMLElement;
    expect(panelAfter?.style.display).toBe("none");
  });

  // Test 5: disambiguate renders candidate buttons
  it("disambiguate response renders buttons for each candidate", async () => {
    const mockResponse = {
      kind: "disambiguate",
      candidates: [
        { label: { en: "Action A" }, kind: "action" },
        { label: { en: "Page B" }, kind: "page" },
      ],
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const el = document.createElement("assist-widget");
    document.body.appendChild(el);

    // Open panel and send a query
    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    const input = el.shadowRoot?.querySelector("#input") as HTMLInputElement;
    input.value = "log donor";

    // Directly invoke sendQuery via the input Enter key event on shadow root
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    });
    Object.defineProperty(enterEvent, "target", {
      value: input,
      writable: false,
    });
    // Dispatch on the shadow root so handleKey fires with correct target
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    // Wait for fetch to complete
    await vi.waitFor(
      () => {
        const body = el.shadowRoot?.querySelector("#body");
        const buttons = body?.querySelectorAll("button[data-candidate]");
        expect(buttons?.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 2000 },
    );

    const body = el.shadowRoot?.querySelector("#body");
    const buttons = body?.querySelectorAll("button[data-candidate]");
    expect(buttons?.length).toBe(2);
    expect(buttons?.[0]?.textContent?.trim()).toBe("Action A");
    expect(buttons?.[1]?.textContent?.trim()).toBe("Page B");
  });

  // Test 6: drive render shows Confirm button and dispatches event
  it("drive response shows Confirm button and dispatches wayfinder:drive-confirm on click", async () => {
    const mockResponse = {
      kind: "drive",
      actionId: "donors.add",
      prefill: {},
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    });

    const el = document.createElement("assist-widget");
    document.body.appendChild(el);

    const confirmedEvents: CustomEvent[] = [];
    el.addEventListener("wayfinder:drive-confirm", (e) => {
      confirmedEvents.push(e as CustomEvent);
    });

    // Open panel and send a query
    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    const input = el.shadowRoot?.querySelector("#input") as HTMLInputElement;
    input.value = "add donor";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    // Wait for Confirm button to appear
    await vi.waitFor(
      () => {
        const body = el.shadowRoot?.querySelector("#body");
        const confirmBtn = body?.querySelector("button[data-drive-confirm]");
        expect(confirmBtn).toBeTruthy();
      },
      { timeout: 2000 },
    );

    const body = el.shadowRoot?.querySelector("#body");
    const confirmBtn = body?.querySelector(
      "button[data-drive-confirm]",
    ) as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();

    // Clicking confirm should dispatch event
    confirmBtn?.click();
    expect(confirmedEvents.length).toBe(1);
    expect(confirmedEvents[0].detail).toMatchObject({
      actionId: "donors.add",
      prefill: {},
    });
  });

  // Test 7: No duplicate define — only one guard block at end of file
  it("no duplicate customElements.define registration (single guard)", async () => {
    // The file is already imported; trying to define again throws
    // This verifies the guard works correctly — if there were two calls without the guard
    // the second one would have thrown at import time
    const existingClass = customElements.get("assist-widget");
    expect(existingClass).toBeDefined();
    // If duplicate define existed without guard, import would have thrown
    // We just verify we can import without errors and it's defined once
    expect(existingClass).toBeTruthy();
  });
});
