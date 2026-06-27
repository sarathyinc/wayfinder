export interface ControlSnapshot {
  selector: string; // CSS selector or testid
  text?: string;
  role?: string; // button, link, input
  route: string;
}

export interface ReconcileResult {
  persona: string;
  missing: ReconcileFinding[]; // live control not in graph
  orphaned: ReconcileFinding[]; // graph entry, no live control (warn only)
  staleSpotlight: ReconcileFinding[]; // spotlight target that doesn't resolve
}

export interface ReconcileFinding {
  id?: string; // action/field id from graph
  selector?: string; // from live snapshot
  route: string;
  message: string;
}
