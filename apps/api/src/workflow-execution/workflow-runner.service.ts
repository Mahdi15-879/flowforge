import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkflowRunnerService {
  constructor(private readonly prisma: PrismaService) {}

  async markRunAsRunning(runId: string) {
    const result = await this.prisma.workflowRun.updateMany({
      where: {
        id: runId,
        status: "PENDING",
      },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existingRun = await this.prisma.workflowRun.findUnique({
        where: { id: runId },
        select: { id: true },
      });

      if (!existingRun) {
        throw new NotFoundException("Workflow run not found");
      }

      throw new ConflictException("Workflow run is not in PENDING status");
    }

    return this.prisma.workflowRun.findUniqueOrThrow({
      where: { id: runId },
    });
  }

  async markRunAsSucceeded(runId: string) {
    const result = await this.prisma.workflowRun.updateMany({
      where: {
        id: runId,
        status: "RUNNING",
      },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existingRun = await this.prisma.workflowRun.findUnique({
        where: { id: runId },
        select: { id: true },
      });

      if (!existingRun) {
        throw new NotFoundException("Workflow run not found");
      }

      throw new ConflictException("Workflow run is not in RUNNING status");
    }

    return this.prisma.workflowRun.findUniqueOrThrow({
      where: { id: runId },
    });
  }

  async markRunAsFailed(runId: string) {
    const result = await this.prisma.workflowRun.updateMany({
      where: {
        id: runId,
        status: "RUNNING",
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const existingRun = await this.prisma.workflowRun.findUnique({
        where: { id: runId },
        select: { id: true },
      });

      if (!existingRun) {
        throw new NotFoundException("Workflow run not found");
      }

      throw new ConflictException("Workflow run is not in RUNNING status");
    }

    return this.prisma.workflowRun.findUniqueOrThrow({
      where: { id: runId },
    });
  }
}
