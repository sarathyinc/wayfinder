import {
  CapabilityGraphSchema,
  type CapabilityGraph,
} from "../schema/index.js";

export type GraphErrorCode =
  | "schema"
  | "duplicate_action_id"
  | "duplicate_route_key"
  | "unknown_action_route"
  | "unknown_transition_via"
  | "unknown_transition_page"
  | "unknown_task_action"
  | "unknown_field_page";

export interface GraphError {
  code: GraphErrorCode;
  message: string;
  path?: string;
}

export type ValidateResult =
  | { ok: true; graph: CapabilityGraph }
  | { ok: false; errors: GraphError[] };

export function validateGraph(input: unknown): ValidateResult {
  const parsed = CapabilityGraphSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({
        code: "schema" as const,
        message: i.message,
        path: i.path.length ? i.path.join(".") : undefined,
      })),
    };
  }

  const graph = parsed.data;
  const errors: GraphError[] = [];

  const routeKeys = new Set<string>();
  for (const page of graph.pages) {
    if (routeKeys.has(page.routeKey)) {
      errors.push({
        code: "duplicate_route_key",
        message: `duplicate page routeKey: ${page.routeKey}`,
        path: page.routeKey,
      });
    }
    routeKeys.add(page.routeKey);
  }

  const actionIds = new Set<string>();
  for (const action of graph.actions) {
    if (actionIds.has(action.id)) {
      errors.push({
        code: "duplicate_action_id",
        message: `duplicate action id: ${action.id}`,
        path: action.id,
      });
    }
    actionIds.add(action.id);
    if (!routeKeys.has(action.route)) {
      errors.push({
        code: "unknown_action_route",
        message: `action ${action.id} references unknown route ${action.route}`,
        path: action.id,
      });
    }
  }

  for (const t of graph.transitions) {
    if (!actionIds.has(t.via)) {
      errors.push({
        code: "unknown_transition_via",
        message: `transition references unknown action ${t.via}`,
        path: `${t.from}->${t.to}`,
      });
    }
    for (const ref of [t.from, t.to]) {
      if (!routeKeys.has(ref)) {
        errors.push({
          code: "unknown_transition_page",
          message: `transition references unknown page ${ref}`,
          path: `${t.from}->${t.to}`,
        });
      }
    }
  }

  for (const task of graph.tasks) {
    for (const actionId of task.sequence) {
      if (!actionIds.has(actionId)) {
        errors.push({
          code: "unknown_task_action",
          message: `task ${task.id} references unknown action ${actionId}`,
          path: task.id,
        });
      }
    }
  }

  for (const field of graph.fields) {
    if (!routeKeys.has(field.page)) {
      errors.push({
        code: "unknown_field_page",
        message: `field on unknown page ${field.page}`,
        path: field.page,
      });
    }
  }

  return errors.length === 0 ? { ok: true, graph } : { ok: false, errors };
}
