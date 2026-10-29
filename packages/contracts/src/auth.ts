import { z } from "zod";

export const RegisterRequestSchema = z
  .object({
    email: z.email().trim().toLowerCase(),

    password: z
      .string()
      .min(12, "Password must contain at least 12 characters")
      .max(128, "Password must not exceed 128 characters"),

    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(100, "Name must not exceed 100 characters")
      .optional(),
  })
  .strict();

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const PublicUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type PublicUser = z.infer<typeof PublicUserSchema>;
