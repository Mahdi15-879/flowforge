import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async startRun(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.findFirst({
        where: {
          id: workflowId,
          workspaceId,
        },
        include: {
          steps: {
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      if (!workflow) {
        throw new NotFoundException("Workflow not found");
      }

      if (workflow.steps.length === 0) {
        throw new BadRequestException(
          "Cannot execute a workflow without steps",
        );
      }

      if (workflow.steps[0].type !== "TRIGGER") {
        throw new BadRequestException(
          "Workflow must start with a trigger step",
        );
      }

      if (workflow.steps.slice(1).some((step) => step.type === "TRIGGER")) {
        throw new BadRequestException(
          "Workflow cannot contain multiple trigger steps",
        );
      }

      const run = await tx.workflowRun.create({
        data: {
          workflowId,
          status: "PENDING",
          stepRuns: {
            create: workflow.steps.map((step) => ({
              stepId: step.id,
              stepName: step.name,
              stepType: step.type,
              position: step.position,
              config: step.config as Prisma.InputJsonValue,
              status: "PENDING" as const,
            })),
          },
        },
        include: {
          stepRuns: {
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      return run;
    });
  }

  async listRuns(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return this.prisma.workflowRun.findMany({
      where: {
        workflowId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        workflowId: true,
        status: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        _count: {
          select: {
            stepRuns: true,
          },
        },
      },
    });
  }

  async getRun(
    userId: string,
    workspaceId: string,
    workflowId: string,
    runId: string,
  ) {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const run = await this.prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflowId,
        workflow: {
          workspaceId,
        },
      },
      select: {
        id: true,
        workflowId: true,
        status: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        stepRuns: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            stepId: true,
            stepName: true,
            stepType: true,
            position: true,
            status: true,
            output: true,
            error: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException("Workflow run not found");
    }

    return run;
  }
}
