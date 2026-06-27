import { z } from "zod";

export const LocalizedTextSchema = z.union([
  z.string(),
  z
    .record(z.string(), z.string())
    .refine(
      (m) => Object.keys(m).length > 0,
      "locale map must have at least one entry",
    ),
]);

export const PersonaSchema = z.string().min(1);
export const EffectSchema = z.enum(["navigate", "open", "write"]);
export const ParamSourceSchema = z.enum(["form", "query", "path"]);
export const TaskSourceSchema = z.enum(["suggested", "annotated"]);

export const ParamSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  source: ParamSourceSchema,
});

export const ExecutionDescriptorSchema = z
  .object({
    navigate: z.string().min(1),
    open: z.string().min(1).optional(),
    tier: z.enum(["guidance", "command-bus", "url-state"]),
  })
  .nullable();

export const PageSchema = z.object({
  routeKey: z.string().min(1),
  title: LocalizedTextSchema,
  personas: z.array(PersonaSchema),
  description: LocalizedTextSchema.optional(),
  available: z.boolean().default(true),
});

export const ActionSchema = z.object({
  id: z.string().min(1),
  route: z.string().min(1),
  label: LocalizedTextSchema,
  personas: z.array(PersonaSchema),
  effect: EffectSchema,
  params: z.array(ParamSchema).default([]),
  synonyms: z.array(LocalizedTextSchema).default([]),
  steps: z.array(LocalizedTextSchema).default([]),
  spotlight: z.array(z.string()).default([]),
  execution: ExecutionDescriptorSchema.default(null),
});

export const FieldSchema = z.object({
  label: LocalizedTextSchema,
  page: z.string().min(1),
  tab: z.string().nullable().default(null),
  personas: z.array(PersonaSchema),
  synonyms: z.array(LocalizedTextSchema).default([]),
});

export const TransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  via: z.string().min(1),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: LocalizedTextSchema,
  personas: z.array(PersonaSchema),
  goal: LocalizedTextSchema.optional(),
  sequence: z.array(z.string().min(1)),
  source: TaskSourceSchema,
  confidence: z.number().min(0).max(1).optional(),
});

export const CapabilityGraphSchema = z.object({
  version: z.literal(2),
  defaultLocale: z.string().min(1).default("en"),
  pages: z.array(PageSchema),
  actions: z.array(ActionSchema),
  fields: z.array(FieldSchema).default([]),
  transitions: z.array(TransitionSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type ParamSource = z.infer<typeof ParamSourceSchema>;
export type TaskSource = z.infer<typeof TaskSourceSchema>;
export type Param = z.infer<typeof ParamSchema>;
export type ExecutionDescriptor = z.infer<typeof ExecutionDescriptorSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CapabilityGraph = z.infer<typeof CapabilityGraphSchema>;
