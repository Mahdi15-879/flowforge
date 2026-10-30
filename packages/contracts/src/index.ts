import { z } from "zod";
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("flowforge-api"),
  timestamp: z.iso.datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export * from "./auth";
export * from "./workspace";
export * from "./workflow";
export * from "./workflow-step";
