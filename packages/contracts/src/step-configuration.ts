import { z } from "zod";
import { CronExpressionParser } from "cron-parser";

export const HttpRequestMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export const HttpRequestConfigSchema = z
  .object({
    operation: z.literal("HTTP_REQUEST"),
    url: z.url({
      protocol: /^https?$/,
    }),
    method: HttpRequestMethodSchema,
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
  })
  .strict();

export type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;

export const ScheduleTriggerConfigSchema = z
  .object({
    operation: z.literal("SCHEDULE"),

    cron: z
      .string()
      .trim()
      .regex(
        /^(\S+\s+){4}\S+$/,
        "Cron expression must contain exactly 5 fields",
      )
      .refine(
        (value) => {
          try {
            CronExpressionParser.parse(value);
            return true;
          } catch {
            return false;
          }
        },
        {
          message: "Invalid cron expression",
        },
      ),

    timezone: z
      .string()
      .trim()
      .min(1, "Timezone is required")
      .refine(
        (value) => {
          try {
            new Intl.DateTimeFormat("en-US", {
              timeZone: value,
            });
            return true;
          } catch {
            return false;
          }
        },
        {
          message: "Invalid timezone",
        },
      )
      .default("UTC"),
  })
  .strict();

export type ScheduleTriggerConfig = z.infer<typeof ScheduleTriggerConfigSchema>;
