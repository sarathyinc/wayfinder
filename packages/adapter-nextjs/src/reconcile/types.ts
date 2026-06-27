export interface ControlSnapshot {
  selector: string; // CSS selector or testid
  text?: string;
  role?: string; // button, link, input
  route: string;
}

export interface ReconcileResult {
  persona: string;
  missing: ReconcileFinding[]; // live snapshot with no matching graph action spotlight (warn only)
  orphaned: ReconcileFinding[]; // graph action with spotlight but no matching live control (warn only)
  staleSpotlight: ReconcileFinding[]; // graph action whose spotlight selectors are syntactically valid but unresolvable
}

export interface ReconcileFinding {
  id?: string; // action/field id from graph
  selector?: string; // from live snapshot
  route: string;
  message: string;
}
