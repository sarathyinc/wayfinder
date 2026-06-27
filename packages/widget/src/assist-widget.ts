import {
  LocalStorageProgressProvider,
  type ProgressProvider,
} from "./progress-provider.js";

type LocalizedText = Record<string, string>;

type DisambiguateCandidate = {
  id?: string;
  label: LocalizedText;
  page?: string;
  kind: "action" | "field" | "page";
};

type AssistResponse =
  | { kind: "guide"; steps?: string[]; actionId?: string }
  | { kind: "navigate"; route: string }
  | { kind: "field"; label: string; page: string }
  | { kind: "disambiguate"; candidates: DisambiguateCandidate[] }
  | { kind: "drive"; actionId: string; prefill: Record<string, string> }
  | { kind: "refuse"; reason: string };

interface OnboardingTask {
  id: string;
  title: LocalizedText;
  goal?: LocalizedText;
  sequence: string[];
  graphHash?: string;
}

interface TasksResponse {
  tasks: OnboardingTask[];
  graphHash: string;
}

function localizedLabel(label: LocalizedText): string {
  return label.en ?? Object.values(label)[0] ?? "?";
}

export class AssistWidget extends HTMLElement {
  private shadow: ShadowRoot;
  private open = false;
  private messages: Array<{ role: string; content: string }> = [];
  private endpoint = "/api/assist/chat";
  private tasksEndpoint = "/api/assist/tasks";
  // Pending drive action waiting for user confirmation
  private pendingDrive: {
    actionId: string;
    prefill: Record<string, string>;
  } | null = null;
  // Onboarding state — loaded lazily on first open
  private tasks: OnboardingTask[] | null = null;
  private progressProvider: ProgressProvider =
    new LocalStorageProgressProvider();

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    if (this.getAttribute("data-endpoint")) {
      this.endpoint = this.getAttribute("data-endpoint")!;
    }
    if (this.getAttribute("data-tasks-endpoint")) {
      this.tasksEndpoint = this.getAttribute("data-tasks-endpoint")!;
    }
    this.render();
  }

  connectedCallback() {
    this.shadow.addEventListener("click", this.handleClick as EventListener);
    this.shadow.addEventListener("keydown", this.handleKey as EventListener);
    document.addEventListener("keydown", this.handleDocKey as EventListener);
    this.addEventListener(
      "wayfinder:tour-complete",
      this.handleTourComplete as EventListener,
    );
  }

  disconnectedCallback() {
    this.shadow.removeEventListener("click", this.handleClick as EventListener);
    this.shadow.removeEventListener("keydown", this.handleKey as EventListener);
    document.removeEventListener("keydown", this.handleDocKey as EventListener);
    this.removeEventListener(
      "wayfinder:tour-complete",
      this.handleTourComplete as EventListener,
    );
  }

  /** Allow tests/host to inject a custom ProgressProvider */
  setProgressProvider(provider: ProgressProvider): void {
    this.progressProvider = provider;
  }

  private handleTourComplete = (e: Event) => {
    const detail = (e as CustomEvent<{ taskId: string }>).detail;
    if (detail?.taskId) {
      this.progressProvider.markComplete(detail.taskId);
      this.renderOnboarding();
    }
  };

  private async loadTasks(): Promise<void> {
    if (this.tasks !== null) return; // already loaded
    try {
      const res = await fetch(this.tasksEndpoint);
      const data = (await res.json()) as TasksResponse;
      // Re-onboard when graph hash changes
      const storedHash = this.progressProvider.getGraphHash();
      if (storedHash !== data.graphHash) {
        this.progressProvider.reset();
        this.progressProvider.setGraphHash(data.graphHash);
      }
      this.tasks = data.tasks;
    } catch {
      this.tasks = [];
    }
    this.renderOnboarding();
  }

  private renderOnboarding(): void {
    const container = this.shadow.querySelector("#onboarding");
    if (!container) return;
    // Clear previous content safely
    container.innerHTML = "";

    if (!this.tasks || this.tasks.length === 0) return;

    const heading = document.createElement("strong");
    heading.textContent = "Get started";
    container.appendChild(heading);

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.padding = "0";
    ul.style.margin = "4px 0 0 0";

    for (const task of this.tasks) {
      const li = document.createElement("li");
      li.dataset.taskId = task.id;
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "6px";
      li.style.marginBottom = "4px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = true;
      if (this.progressProvider.isComplete(task.id)) {
        checkbox.checked = true;
      }

      const btn = document.createElement("button");
      btn.className = "task-start";
      btn.dataset.taskId = task.id;
      btn.textContent = localizedLabel(task.title);

      li.appendChild(checkbox);
      li.appendChild(btn);
      ul.appendChild(li);
    }

    container.appendChild(ul);
  }

  private handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.id === "launcher") {
      this.open = !this.open;
      this.render();
      if (this.open) {
        this.focusFirst();
        // Lazy-load tasks on first open
        void this.loadTasks();
      }
    } else if (target.id === "send") {
      this.sendQuery();
    } else if (
      target.classList.contains("task-start") &&
      target.dataset.taskId !== undefined
    ) {
      // Tour start — find the task and dispatch event
      const taskId = target.dataset.taskId;
      const task = this.tasks?.find((t) => t.id === taskId);
      if (task) {
        this.dispatchEvent(
          new CustomEvent("wayfinder:tour-start", {
            detail: { taskId: task.id, sequence: task.sequence },
            bubbles: true,
            composed: true,
          }),
        );
      }
    } else if (target.dataset.candidate !== undefined) {
      // Disambiguate candidate clicked — populate input and auto-send
      const input = this.shadow.querySelector("#input") as HTMLInputElement;
      if (input) {
        input.value = target.textContent?.trim() ?? "";
        this.sendQuery();
      }
    } else if (target.dataset.driveConfirm !== undefined) {
      // Drive confirm button clicked
      if (this.pendingDrive) {
        this.dispatchEvent(
          new CustomEvent("wayfinder:drive-confirm", {
            detail: {
              actionId: this.pendingDrive.actionId,
              prefill: this.pendingDrive.prefill,
            },
            bubbles: true,
            composed: true,
          }),
        );
        this.pendingDrive = null;
        this.renderMessages();
      }
    } else if (target.dataset.driveCancel !== undefined) {
      // Drive cancel button clicked — dismiss preview
      this.pendingDrive = null;
      this.renderMessages();
    }
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLInputElement).id === "input") {
      this.sendQuery();
    } else if (e.key === "Escape" && this.open) {
      this.open = false;
      this.render();
    } else if (e.key === "Tab" && this.open) {
      this.trapFocus(e);
    }
  };

  // Also handle Escape at document level so it works when focus is outside shadow
  private handleDocKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.open) {
      this.open = false;
      this.render();
    }
  };

  private focusFirst() {
    // Defer until after render
    requestAnimationFrame(() => {
      const focusable = this.getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    });
  }

  private getFocusableElements(): HTMLElement[] {
    const panel = this.shadow.querySelector("#panel");
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
  }

  private trapFocus(e: KeyboardEvent) {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.shadow.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  private async sendQuery() {
    const input = this.shadow.querySelector("#input") as HTMLInputElement;
    const q = input.value.trim();
    if (!q) return;
    this.messages.push({ role: "user", content: q });
    input.value = "";
    this.renderMessages();
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          context: { route: location.pathname },
        }),
      });
      const data = (await res.json()) as AssistResponse;

      if (data.kind === "guide") {
        const text = `Guide: ${data.steps?.join(" → ") || data.actionId}`;
        this.messages.push({ role: "assistant", content: text });
      } else if (data.kind === "navigate") {
        this.messages.push({
          role: "assistant",
          content: `Navigate to ${data.route}`,
        });
      } else if (data.kind === "field") {
        this.messages.push({
          role: "assistant",
          content: `Field: ${data.label} on ${data.page}`,
        });
      } else if (data.kind === "disambiguate") {
        // Render candidates as buttons — handled in renderMessages
        this.messages.push({
          role: "assistant",
          content: `__disambiguate__:${JSON.stringify(data.candidates)}`,
        });
      } else if (data.kind === "drive") {
        // Store pending drive action — never auto-confirm
        this.pendingDrive = { actionId: data.actionId, prefill: data.prefill };
        this.messages.push({
          role: "assistant",
          content: `__drive__:${JSON.stringify({ actionId: data.actionId, prefill: data.prefill })}`,
        });
      } else if (data.kind === "refuse") {
        this.messages.push({
          role: "assistant",
          content: `Refused: ${data.reason}`,
        });
      } else {
        this.messages.push({
          role: "assistant",
          content: JSON.stringify(data),
        });
      }
    } catch (_e) {
      this.messages.push({
        role: "assistant",
        content: "Error contacting assistant.",
      });
    }
    this.renderMessages();
  }

  private renderMessages() {
    const body = this.shadow.querySelector("#body");
    if (!body) return;
    // Clear safely
    body.innerHTML = "";

    for (const m of this.messages) {
      if (m.role === "assistant" && m.content.startsWith("__disambiguate__:")) {
        // Render candidate buttons
        const candidates = JSON.parse(
          m.content.slice("__disambiguate__:".length),
        ) as DisambiguateCandidate[];
        const wrapper = document.createElement("div");
        const label = document.createElement("b");
        label.textContent = "assistant:";
        wrapper.appendChild(label);
        wrapper.appendChild(
          document.createTextNode(" Multiple matches — please clarify:"),
        );
        wrapper.appendChild(document.createElement("br"));
        for (const c of candidates) {
          const btn = document.createElement("button");
          btn.dataset.candidate = c.id ?? c.kind;
          btn.textContent = localizedLabel(c.label);
          wrapper.appendChild(btn);
        }
        body.appendChild(wrapper);
      } else if (m.role === "assistant" && m.content.startsWith("__drive__:")) {
        // Render drive preview with Confirm + Cancel
        const driveData = JSON.parse(m.content.slice("__drive__:".length)) as {
          actionId: string;
          prefill: Record<string, string>;
        };
        const wrapper = document.createElement("div");
        const label = document.createElement("b");
        label.textContent = "assistant:";
        wrapper.appendChild(label);
        wrapper.appendChild(
          document.createTextNode(` Action: ${driveData.actionId}`),
        );

        const prefillEntries = Object.entries(driveData.prefill);
        if (prefillEntries.length > 0) {
          const dl = document.createElement("dl");
          for (const [k, v] of prefillEntries) {
            const dt = document.createElement("dt");
            dt.textContent = k;
            const dd = document.createElement("dd");
            dd.textContent = v;
            dl.appendChild(dt);
            dl.appendChild(dd);
          }
          wrapper.appendChild(dl);
        }

        // Only show Confirm/Cancel if this is still the pending drive
        if (
          this.pendingDrive &&
          this.pendingDrive.actionId === driveData.actionId
        ) {
          const confirmBtn = document.createElement("button");
          confirmBtn.dataset.driveConfirm = driveData.actionId;
          confirmBtn.textContent = "Confirm";
          const cancelBtn = document.createElement("button");
          cancelBtn.dataset.driveCancel = driveData.actionId;
          cancelBtn.textContent = "Cancel";
          wrapper.appendChild(confirmBtn);
          wrapper.appendChild(cancelBtn);
        }

        body.appendChild(wrapper);
      } else {
        const div = document.createElement("div");
        const bold = document.createElement("b");
        bold.textContent = `${m.role}:`;
        div.appendChild(bold);
        div.appendChild(document.createTextNode(` ${m.content}`));
        body.appendChild(div);
      }
    }
  }

  private render() {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      this.classList.add("reduce-motion");
    } else {
      this.classList.remove("reduce-motion");
    }

    const panelDisplay = this.open ? "flex" : "none";

    this.shadow.innerHTML = `
      <style>
        :host {
          font-family: system-ui, sans-serif;
          --assist-primary: #111;
          --assist-bg: #ffffff;
          --assist-fg: #000000;
          --assist-border: #dddddd;
        }
        #launcher {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          background: var(--assist-primary);
          color: var(--assist-bg);
          border: none;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          z-index: 9999;
        }
        #panel {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 340px;
          height: 460px;
          background: var(--assist-bg);
          border: 1px solid var(--assist-border);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          display: ${panelDisplay};
          flex-direction: column;
          z-index: 9999;
          overflow: hidden;
        }
        :host(:not(.reduce-motion)) #panel[style*="flex"] {
          animation: slide-in 0.2s ease;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .header {
          padding: 12px;
          background: var(--assist-primary);
          color: var(--assist-bg);
          font-weight: 600;
        }
        #onboarding {
          padding: 8px;
          border-bottom: 1px solid var(--assist-border);
          font-size: 12px;
          background: var(--assist-bg);
        }
        #body {
          padding: 12px;
          flex: 1;
          overflow: auto;
          font-size: 14px;
          color: var(--assist-fg);
        }
        .footer {
          padding: 8px;
          border-top: 1px solid var(--assist-border);
          display: flex;
          gap: 8px;
        }
        input { flex: 1; padding: 8px; }
        button { padding: 8px 12px; cursor: pointer; }
        [data-candidate] { margin: 2px; }
        [data-drive-confirm] { background: var(--assist-primary); color: var(--assist-bg); border: none; margin: 2px; }
        [data-drive-cancel] { margin: 2px; }
        .task-start { font-size: 12px; padding: 2px 6px; }
      </style>
      <button id="launcher" aria-label="Open Wayfinder Assist">💬</button>
      <div
        id="panel"
        ${this.open ? 'role="dialog" aria-modal="true" aria-label="Wayfinder Assist"' : ""}
        style="display:${panelDisplay};"
      >
        <div class="header">Wayfinder Assist</div>
        <div id="onboarding"></div>
        <div id="body" aria-live="polite"></div>
        <div class="footer">
          <input id="input" placeholder="How do I log a donor offer?" />
          <button id="send">Send</button>
        </div>
      </div>
    `;
    this.renderMessages();
    // Re-populate onboarding from cached tasks (if already loaded)
    if (this.tasks !== null) {
      this.renderOnboarding();
    }
  }
}

if (!customElements.get("assist-widget")) {
  customElements.define("assist-widget", AssistWidget);
}
