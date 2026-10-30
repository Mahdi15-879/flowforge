import { z } from "zod";

const WorkflowNameSchema = z
  .string()
  .trim()
  .min(2, "Workflow name must contain at least 2 characters")
  .max(100, "Workflow name must not exceed 100 characters");

const WorkflowDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Workflow description must not exceed 1000 characters")
  .nullable();

// POST /workspaces/:workspaceId/workflows
export const CreateWorkflowRequestSchema = z
  .object({
    name: WorkflowNameSchema,
    description: WorkflowDescriptionSchema.optional(),
  })
  .strict();

export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;

// PATCH /workspaces/:workspaceId/workflows/:workflowId
export const UpdateWorkflowRequestSchema = z
  .object({
    name: WorkflowNameSchema.optional(),
    description: WorkflowDescriptionSchema.optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowRequestSchema>;

// Shared API response
export const WorkflowResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  workspaceId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type WorkflowResponse = z.infer<typeof WorkflowResponseSchema>;
