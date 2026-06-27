export class AssistWidget extends HTMLElement {
  private shadow: ShadowRoot;
  private open = false;
  private messages: Array<{role: string, content: string}> = [];
  private endpoint = "/api/assist/chat";

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    if (this.getAttribute("data-endpoint")) {
      this.endpoint = this.getAttribute("data-endpoint")!;
    }
    this.render();
  }

  connectedCallback() {
    this.shadow.addEventListener("click", this.handleClick as any);
    this.shadow.addEventListener("keydown", this.handleKey as any);
  }

  private handleClick = (e: Event) => {
    const target = (e.target as HTMLElement);
    if (target.id === "launcher") {
      this.open = !this.open;
      this.render();
    } else if (target.id === "send") {
      this.sendQuery();
    }
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLInputElement).id === "input") {
      this.sendQuery();
    }
  };

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
        body: JSON.stringify({ query: q, persona: "intake_admin", context: { route: location.pathname } })
      });
      const data = await res.json();
      let reply = "";
      if (data.kind === "guide") reply = `Guide: ${data.steps?.join(" → ") || data.actionId}`;
      else if (data.kind === "navigate") reply = `Navigate to ${data.route}`;
      else if (data.kind === "field") reply = `Field: ${data.label} on ${data.page}`;
      else if (data.kind === "disambiguate") reply = "Multiple matches. Please clarify.";
      else if (data.kind === "refuse") reply = `Refused: ${data.reason}`;
      else reply = JSON.stringify(data);
      this.messages.push({ role: "assistant", content: reply });
    } catch (e) {
      this.messages.push({ role: "assistant", content: "Error contacting assistant." });
    }
    this.renderMessages();
  }

  private renderMessages() {
    const body = this.shadow.querySelector("#body");
    if (!body) return;
    body.innerHTML = this.messages.map(m => `<div><b>${m.role}:</b> ${m.content}</div>`).join("");
  }

  private render() {
    const proactive = this.open ? `
      <div style="padding:8px;border-bottom:1px solid #eee;font-size:12px;background:#f9f9f9;">
        <strong>Onboarding (Phase 2):</strong><br/>
        <label><input type="checkbox" checked disabled> Log your first donor offer</label><br/>
        <button onclick="this.closest('assist-widget').shadowRoot.querySelector('#input').value='how do I log a donor offer?'; this.closest('assist-widget').shadowRoot.querySelector('#send').click();" style="font-size:10px;">Start tour</button>
      </div>` : '';
    this.shadow.innerHTML = `
      <style>
        :host { font-family: system-ui, sans-serif; }
        #launcher { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 999px; background: #111; color: white; border: none; font-size: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; z-index: 9999; }
        #panel { position: fixed; bottom: 90px; right: 20px; width: 340px; height: 460px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: ${this.open ? "flex" : "none"}; flex-direction: column; z-index: 9999; overflow: hidden; }
        .header { padding: 12px; background: #111; color: white; font-weight: 600; }
        #body { padding: 12px; flex: 1; overflow: auto; font-size: 14px; }
        .footer { padding: 8px; border-top: 1px solid #eee; display: flex; gap: 8px; }
        input { flex: 1; padding: 8px; }
        button { padding: 8px 12px; }
      </style>
      <button id="launcher">💬</button>
      <div id="panel">
        <div class="header">Wayfinder Assist</div>
        ${proactive}
        <div id="body"></div>
        <div class="footer">
          <input id="input" placeholder="How do I log a donor offer?" />
          <button id="send">Send</button>
        </div>
      </div>
    `;
    this.renderMessages();
  }
}

if (!customElements.get("assist-widget")) {
  customElements.define("assist-widget", AssistWidget);
}

if (!customElements.get("assist-widget")) {
  customElements.define("assist-widget", AssistWidget);
}
