// Phase 3 annotation layer (progressive enhancement)
import type { Action, Task } from "./schema/index.js";

const registry: { actions: Record<string, any>; tasks: Record<string, any> } = { actions: {}, tasks: {} };

export function defineAction(config: Partial<Action> & { id: string; run?: Function }) {
  registry.actions[config.id] = config;
  return config;
}

export function defineTask(config: Partial<Task> & { id: string }) {
  registry.tasks[config.id] = config;
  return config;
}

export function getRegisteredAnnotations() {
  return registry;
}
