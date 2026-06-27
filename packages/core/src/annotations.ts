// Phase 3 annotation layer (progressive enhancement)
import type { Action, Task } from "./schema/index.js";

export type ActionAnnotation = Partial<Action> & {
  id: string;
  run?: (...args: unknown[]) => unknown;
};

export type TaskAnnotation = Partial<Task> & { id: string };

const registry: {
  actions: Record<string, ActionAnnotation>;
  tasks: Record<string, TaskAnnotation>;
} = { actions: {}, tasks: {} };

export function defineAction(config: ActionAnnotation): ActionAnnotation {
  registry.actions[config.id] = config;
  return config;
}

export function defineTask(config: TaskAnnotation): TaskAnnotation {
  registry.tasks[config.id] = config;
  return config;
}

export function getRegisteredAnnotations(): {
  actions: Record<string, ActionAnnotation>;
  tasks: Record<string, TaskAnnotation>;
} {
  return registry;
}

/** Reset registry — intended for tests only. */
export function _resetRegistry(): void {
  for (const key of Object.keys(registry.actions)) delete registry.actions[key];
  for (const key of Object.keys(registry.tasks)) delete registry.tasks[key];
}
