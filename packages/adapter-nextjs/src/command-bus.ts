// Phase 3: Basic command bus for agentic execution (DRIVE)
// In real Next app, modals would subscribe here.

type BusListener = (actionId: string, prefill?: any) => void;
const listeners = new Set<BusListener>();

export function registerActionListener(fn: BusListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function openAction(actionId: string, prefill?: Record<string, unknown>) {
  // This would be called by handler when DRIVE
  listeners.forEach(fn => fn(actionId, prefill));
  // Also dispatch custom event for non-React
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wayfinder:open-action", { detail: { actionId, prefill } }));
  }
  console.log("[wayfinder command-bus] openAction", actionId, prefill);
}
