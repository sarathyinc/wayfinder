// Phase 3: Basic command bus for agentic execution (DRIVE)
// In real Next app, modals would subscribe here.

type BusListener = (
  actionId: string,
  prefill?: Record<string, unknown>,
) => void;
const listeners = new Set<BusListener>();

export function registerActionListener(fn: BusListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function openAction(
  actionId: string,
  prefill?: Record<string, unknown>,
): void {
  const agenticEnabled =
    typeof process !== "undefined" &&
    process.env.ASSIST_AGENTIC_ENABLED === "1";
  if (!agenticEnabled) {
    return; // kill-switch is off
  }
  // This would be called by handler when DRIVE
  listeners.forEach((fn) => fn(actionId, prefill));
  // Also dispatch custom event for non-React
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wayfinder:open-action", {
        detail: { actionId, prefill },
      }),
    );
  }
  console.log("[wayfinder command-bus] openAction", actionId, prefill);
}
