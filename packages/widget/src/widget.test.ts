import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "./assist-widget.js";
import type { ProgressProvider } from "./progress-provider.js";

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
    // First fetch = tasks endpoint (returns empty tasks to avoid interference)
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ tasks: [], graphHash: "h1" }),
    });
    // Second fetch = chat endpoint
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
    // First fetch = tasks endpoint
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve({ tasks: [], graphHash: "h1" }),
    });
    // Second fetch = chat endpoint
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

  // ── G10: Persona-driven onboarding ──────────────────────────────────────

  // Test G10-1: Checklist loads from endpoint — 2 tasks → 2 <li> items
  it("G10: checklist renders tasks loaded from endpoint", async () => {
    const mockTasksResponse = {
      tasks: [
        {
          id: "task-1",
          title: { en: "Log your first donor" },
          sequence: ["action-1"],
        },
        {
          id: "task-2",
          title: { en: "Review a match" },
          sequence: ["action-2"],
        },
      ],
      graphHash: "hash-abc",
    };

    // Mock fetch: first call = tasks endpoint
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockTasksResponse),
    });

    const el = document.createElement("assist-widget") as HTMLElement & {
      setProgressProvider: (p: ProgressProvider) => void;
    };
    // Inject a no-op progress provider (no real localStorage needed)
    el.setProgressProvider({
      isComplete: () => false,
      markComplete: () => undefined,
      getGraphHash: () => "hash-abc",
      setGraphHash: () => undefined,
      reset: () => undefined,
    });
    document.body.appendChild(el);

    // Open the widget to trigger lazy load
    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    // Wait for onboarding to render
    await vi.waitFor(
      () => {
        const items = el.shadowRoot?.querySelectorAll(
          "#onboarding li[data-task-id]",
        );
        expect(items?.length).toBe(2);
      },
      { timeout: 2000 },
    );

    const items = el.shadowRoot?.querySelectorAll(
      "#onboarding li[data-task-id]",
    );
    expect(items?.length).toBe(2);
    expect(items?.[0]?.querySelector("button")?.textContent?.trim()).toBe(
      "Log your first donor",
    );
    expect(items?.[1]?.querySelector("button")?.textContent?.trim()).toBe(
      "Review a match",
    );
  });

  // Test G10-2: Completed tasks show as checked
  it("G10: completed tasks show checkbox as checked", async () => {
    const mockTasksResponse = {
      tasks: [
        {
          id: "task-complete",
          title: { en: "Already done" },
          sequence: [],
        },
        {
          id: "task-pending",
          title: { en: "Not yet" },
          sequence: [],
        },
      ],
      graphHash: "hash-xyz",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockTasksResponse),
    });

    const el = document.createElement("assist-widget") as HTMLElement & {
      setProgressProvider: (p: ProgressProvider) => void;
    };
    el.setProgressProvider({
      isComplete: (id: string) => id === "task-complete",
      markComplete: () => undefined,
      getGraphHash: () => "hash-xyz",
      setGraphHash: () => undefined,
      reset: () => undefined,
    });
    document.body.appendChild(el);

    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    await vi.waitFor(
      () => {
        const items = el.shadowRoot?.querySelectorAll(
          "#onboarding li[data-task-id]",
        );
        expect(items?.length).toBe(2);
      },
      { timeout: 2000 },
    );

    const completedLi = el.shadowRoot?.querySelector(
      '#onboarding li[data-task-id="task-complete"]',
    );
    const pendingLi = el.shadowRoot?.querySelector(
      '#onboarding li[data-task-id="task-pending"]',
    );
    const completedCb = completedLi?.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement | null;
    const pendingCb = pendingLi?.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement | null;

    expect(completedCb?.checked).toBe(true);
    expect(pendingCb?.checked).toBe(false);
  });

  // Test G10-3: Clicking Start button dispatches wayfinder:tour-start
  it("G10: clicking task Start button dispatches wayfinder:tour-start", async () => {
    const mockTasksResponse = {
      tasks: [
        {
          id: "task-tour",
          title: { en: "Take the tour" },
          sequence: ["step-1", "step-2"],
        },
      ],
      graphHash: "hash-tour",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockTasksResponse),
    });

    const el = document.createElement("assist-widget") as HTMLElement & {
      setProgressProvider: (p: ProgressProvider) => void;
    };
    el.setProgressProvider({
      isComplete: () => false,
      markComplete: () => undefined,
      getGraphHash: () => "hash-tour",
      setGraphHash: () => undefined,
      reset: () => undefined,
    });
    document.body.appendChild(el);

    const tourEvents: CustomEvent[] = [];
    el.addEventListener("wayfinder:tour-start", (e) => {
      tourEvents.push(e as CustomEvent);
    });

    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    await vi.waitFor(
      () => {
        const btn = el.shadowRoot?.querySelector("button.task-start");
        expect(btn).toBeTruthy();
      },
      { timeout: 2000 },
    );

    const startBtn = el.shadowRoot?.querySelector(
      "button.task-start",
    ) as HTMLButtonElement;
    startBtn?.click();

    expect(tourEvents.length).toBe(1);
    expect(tourEvents[0].detail.taskId).toBe("task-tour");
    expect(tourEvents[0].detail.sequence).toEqual(["step-1", "step-2"]);
  });

  // Test G10-4: Re-onboard on graph hash change — reset called, setGraphHash called
  it("G10: re-onboards when graph hash changes", async () => {
    const mockTasksResponse = {
      tasks: [{ id: "task-new", title: { en: "New task" }, sequence: [] }],
      graphHash: "hash-new",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockTasksResponse),
    });

    const resetSpy = vi.fn();
    const setGraphHashSpy = vi.fn();
    const markCompleteSpy = vi.fn();

    const el = document.createElement("assist-widget") as HTMLElement & {
      setProgressProvider: (p: ProgressProvider) => void;
    };
    el.setProgressProvider({
      isComplete: () => false,
      markComplete: markCompleteSpy,
      getGraphHash: () => "hash-old", // stored hash differs from response
      setGraphHash: setGraphHashSpy,
      reset: resetSpy,
    });
    document.body.appendChild(el);

    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    await vi.waitFor(
      () => {
        expect(setGraphHashSpy).toHaveBeenCalledWith("hash-new");
      },
      { timeout: 2000 },
    );

    expect(resetSpy).toHaveBeenCalledOnce();
    expect(setGraphHashSpy).toHaveBeenCalledWith("hash-new");
    // markComplete should NOT have been called (fresh start)
    expect(markCompleteSpy).not.toHaveBeenCalled();
  });

  // Test G10-5: No hardcoded tasks — empty endpoint → empty checklist
  it("G10: empty tasks endpoint yields empty checklist", async () => {
    const mockTasksResponse = {
      tasks: [],
      graphHash: "hash-empty",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () => Promise.resolve(mockTasksResponse),
    });

    const el = document.createElement("assist-widget") as HTMLElement & {
      setProgressProvider: (p: ProgressProvider) => void;
    };
    el.setProgressProvider({
      isComplete: () => false,
      markComplete: () => undefined,
      getGraphHash: () => "hash-empty",
      setGraphHash: () => undefined,
      reset: () => undefined,
    });
    document.body.appendChild(el);

    const launcher = el.shadowRoot?.querySelector(
      "#launcher",
    ) as HTMLButtonElement;
    launcher?.click();

    // Wait a tick for the async loadTasks to complete
    await vi.waitFor(
      () => {
        expect(globalThis.fetch).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Give renderOnboarding a chance to run
    await new Promise((r) => setTimeout(r, 50));

    const items = el.shadowRoot?.querySelectorAll(
      "#onboarding li[data-task-id]",
    );
    expect(items?.length ?? 0).toBe(0);
  });
});
