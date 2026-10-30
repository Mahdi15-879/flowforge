import { z } from "zod";

export const WorkflowStepTypeSchema = z.enum(["TRIGGER", "ACTION"]);

const StepNameSchema = z
  .string()
  .trim()
  .min(2, "Step name must contain at least 2 characters")
  .max(100, "Step name must not exceed 100 characters");

const StepPositionSchema = z.number().int().min(0);

const StepConfigSchema = z.record(z.string(), z.unknown());

export const CreateWorkflowStepRequestSchema = z
  .object({
    name: StepNameSchema,
    type: WorkflowStepTypeSchema,
    position: StepPositionSchema,
    config: StepConfigSchema.optional(),
  })
  .strict();

export type CreateWorkflowStepRequest = z.infer<
  typeof CreateWorkflowStepRequestSchema
>;

export const UpdateWorkflowStepRequestSchema = z
  .object({
    name: StepNameSchema.optional(),
    config: StepConfigSchema.optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.config !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateWorkflowStepRequest = z.infer<
  typeof UpdateWorkflowStepRequestSchema
>;

export const ReorderWorkflowStepsRequestSchema = z
  .object({
    stepIds: z.array(z.uuid()).min(1),
  })
  .strict()
  .refine((data) => new Set(data.stepIds).size === data.stepIds.length, {
    message: "Step IDs must be unique",
  });

export type ReorderWorkflowStepsRequest = z.infer<
  typeof ReorderWorkflowStepsRequestSchema
>;

export const WorkflowStepResponseSchema = z.object({
  id: z.uuid(),
  workflowId: z.uuid(),
  name: z.string(),
  type: WorkflowStepTypeSchema,
  position: z.number().int().min(0),
  config: StepConfigSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type WorkflowStepResponse = z.infer<typeof WorkflowStepResponseSchema>;
