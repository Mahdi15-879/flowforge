import { z } from "zod";

export const CreateWorkspaceRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Workspace name must contain at least 2 characters")
      .max(100, "Workspace name must not exceed 100 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Slug must contain at least 3 characters")
      .max(63, "Slug must not exceed 63 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase letters, numbers and single hyphens",
      ),
  })
  .strict();

export type CreateWorkspaceRequest = z.infer<
  typeof CreateWorkspaceRequestSchema
>;

export const WorkspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const WorkspaceResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  role: WorkspaceRoleSchema,
  createdAt: z.iso.datetime(),
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export const UpdateWorkspaceRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Workspace name must contain at least 2 characters")
      .max(100, "Workspace name must not exceed 100 characters")
      .optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateWorkspaceRequest = z.infer<
  typeof UpdateWorkspaceRequestSchema
>;
