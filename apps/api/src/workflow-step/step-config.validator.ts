import { BadRequestException } from "@nestjs/common";
import {
  HttpRequestConfigSchema,
  ScheduleTriggerConfigSchema,
} from "@flowforge/contracts";

type StepType = "TRIGGER" | "ACTION";

export function validateStepConfig(
  type: StepType,
  config: Record<string, unknown>,
): Record<string, unknown> {
  // Preserve compatibility with existing unconfigured steps.
  if (Object.keys(config).length === 0) {
    return {};
  }

  const schema =
    type === "ACTION" ? HttpRequestConfigSchema : ScheduleTriggerConfigSchema;

  const result = schema.safeParse(config);

  if (!result.success) {
    throw new BadRequestException({
      message: "Invalid step configuration",
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return result.data;
}
