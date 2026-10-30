import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { StepRunnerService } from "./step-runner.service";

@Injectable()
export class WorkflowOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowRunner: WorkflowRunnerService,
    private readonly stepRunner: StepRunnerService,
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
          if (step.stepType !== "TRIGGER" || step.position !== 0) {
            throw new Error(`Unsupported step execution: ${step.stepName}`);
          }

          await this.stepRunner.markStepAsSucceeded(step.id, {
            triggered: true,
            mode: "MANUAL",
          });
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
