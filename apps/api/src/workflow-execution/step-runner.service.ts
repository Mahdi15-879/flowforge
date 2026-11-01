import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class StepRunnerService {
  constructor(private readonly prisma: PrismaService) {}

  async markStepAsRunning(stepRunId: string) {
    const result = await this.prisma.stepRun.updateMany({
      where: {
        id: stepRunId,
        status: "PENDING",
        workflowRun: {
          status: "RUNNING",
        },
      },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existingStep = await this.prisma.stepRun.findUnique({
        where: { id: stepRunId },
        select: { id: true },
      });

      if (!existingStep) {
        throw new NotFoundException("Step run not found");
      }

      throw new ConflictException("Step run cannot transition to RUNNING");
    }

    return this.prisma.stepRun.findUniqueOrThrow({
      where: { id: stepRunId },
    });
  }

  async markStepAsSucceeded(stepRunId: string, output: Prisma.InputJsonValue) {
    const result = await this.prisma.stepRun.updateMany({
      where: {
        id: stepRunId,
        status: "RUNNING",
        workflowRun: {
          status: "RUNNING",
        },
      },
      data: {
        status: "SUCCEEDED",
        output,
        finishedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existingStep = await this.prisma.stepRun.findUnique({
        where: { id: stepRunId },
        select: { id: true },
      });

      if (!existingStep) {
        throw new NotFoundException("Step run not found");
      }

      throw new ConflictException("Step run cannot transition to SUCCEEDED");
    }

    return this.prisma.stepRun.findUniqueOrThrow({
      where: { id: stepRunId },
    });
  }

  async markStepAsFailed(stepRunId: string, error: string) {
    const result = await this.prisma.stepRun.updateMany({
      where: {
        id: stepRunId,
        status: "RUNNING",
        workflowRun: {
          status: "RUNNING",
        },
      },
      data: {
        status: "FAILED",
        error,
        finishedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existingStep = await this.prisma.stepRun.findUnique({
        where: { id: stepRunId },
        select: { id: true },
      });

      if (!existingStep) {
        throw new NotFoundException("Step run not found");
      }

      throw new ConflictException("Step run cannot transition to FAILED");
    }

    return this.prisma.stepRun.findUniqueOrThrow({
      where: { id: stepRunId },
    });
  }
}
