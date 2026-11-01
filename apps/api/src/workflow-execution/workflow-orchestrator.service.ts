import { Injectable } from "@nestjs/common";
import { HttpRequestConfigSchema } from "@flowforge/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { StepRunnerService } from "./step-runner.service";
import { HttpActionExecutorService } from "./http-action-executor.service";

@Injectable()
export class WorkflowOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowRunner: WorkflowRunnerService,
    private readonly stepRunner: StepRunnerService,
    private readonly httpExecutor: HttpActionExecutorService,
  ) {}

  async execute(runId: string) {
    await this.workflowRunner.markRunAsRunning(runId);

    const steps = await this.prisma.stepRun.findMany({
      where: { workflowRunId: runId },
      orderBy: { position: "asc" },
    });

    try {
      for (const step of steps) {
        await this.stepRunner.markStepAsRunning(step.id);

        try {
          if (step.stepType === "TRIGGER" && step.position === 0) {
            await this.stepRunner.markStepAsSucceeded(step.id, {
              triggered: true,
              mode: "MANUAL",
            });

            continue;
          }

          if (step.stepType === "ACTION") {
            const config = HttpRequestConfigSchema.safeParse(step.config);

            if (!config.success) {
              throw new Error(
                `Unsupported action configuration: ${step.stepName}`,
              );
            }

            const result = await this.httpExecutor.execute(config.data);

            if (result.statusCode < 200 || result.statusCode >= 300) {
              throw new Error(
                `HTTP request failed with status ${result.statusCode}`,
              );
            }

            await this.stepRunner.markStepAsSucceeded(step.id, result);

            continue;
          }

          throw new Error(`Unsupported step execution: ${step.stepName}`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown step execution error";

          await this.stepRunner.markStepAsFailed(step.id, message);

          throw error;
        }
      }

      return await this.workflowRunner.markRunAsSucceeded(runId);
    } catch (error) {
      await this.workflowRunner.markRunAsFailed(runId);
      throw error;
    }
  }
}
