import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CreateWorkflowStepRequest,
  UpdateWorkflowStepRequest,
  ReorderWorkflowStepsRequest,
  WorkflowStepResponse,
  WorkflowStepResponseSchema,
} from "@flowforge/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";

@Injectable()
export class WorkflowStepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  private toResponse(step: {
    id: string;
    workflowId: string;
    name: string;
    type: "TRIGGER" | "ACTION";
    position: number;
    config: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowStepResponse {
    return WorkflowStepResponseSchema.parse({
      ...step,
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    });
  }

  private async requireWorkflow(
    workspaceId: string,
    workflowId: string,
  ): Promise<void> {
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
  }

  private async lockWorkflow(
    tx: Prisma.TransactionClient,
    workflowId: string,
  ): Promise<void> {
    await tx.$queryRaw<{ locked: string }[]>`
    SELECT
      pg_advisory_xact_lock(
        hashtextextended(${workflowId}, 0)
      )::text AS locked
  `;
  }

  async create(
    userId: string,
    workspaceId: string,
    workflowId: string,
    input: CreateWorkflowStepRequest,
  ): Promise<WorkflowStepResponse> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    return this.prisma.$transaction(
      async (tx) => {
        await this.lockWorkflow(tx, workflowId);

        const workflow = await tx.workflow.findFirst({
          where: {
            id: workflowId,
            workspaceId,
            workspace: {
              memberships: {
                some: {
                  userId,
                  role: { in: ["OWNER", "ADMIN"] },
                },
              },
            },
          },
          select: { id: true },
        });

        if (!workflow) {
          throw new NotFoundException("Workflow not found");
        }

        const count = await tx.workflowStep.count({
          where: { workflowId },
        });

        if (input.position !== count) {
          throw new BadRequestException(`New step position must be ${count}`);
        }

        const step = await tx.workflowStep.create({
          data: {
            workflowId,
            name: input.name,
            type: input.type,
            position: input.position,
            config: (input.config ?? {}) as Prisma.InputJsonObject,
          },
        });

        return this.toResponse(step);
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  async findAll(
    userId: string,
    workspaceId: string,
    workflowId: string,
  ): Promise<WorkflowStepResponse[]> {
    await this.workspaceAccess.requireMembership(userId, workspaceId);
    await this.requireWorkflow(workspaceId, workflowId);

    const steps = await this.prisma.workflowStep.findMany({
      where: { workflowId },
      orderBy: { position: "asc" },
    });

    return steps.map((step) => this.toResponse(step));
  }

  async findOne(
    userId: string,
    workspaceId: string,
    workflowId: string,
    stepId: string,
  ): Promise<WorkflowStepResponse> {
    await this.workspaceAccess.requireMembership(userId, workspaceId);
    await this.requireWorkflow(workspaceId, workflowId);

    const step = await this.prisma.workflowStep.findFirst({
      where: {
        id: stepId,
        workflowId,
      },
    });

    if (!step) {
      throw new NotFoundException("Workflow step not found");
    }

    return this.toResponse(step);
  }

  async update(
    userId: string,
    workspaceId: string,
    workflowId: string,
    stepId: string,
    input: UpdateWorkflowStepRequest,
  ): Promise<WorkflowStepResponse> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    await this.requireWorkflow(workspaceId, workflowId);

    const data: Prisma.WorkflowStepUpdateManyMutationInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.config !== undefined) {
      data.config = input.config as Prisma.InputJsonObject;
    }

    const result = await this.prisma.workflowStep.updateMany({
      where: {
        id: stepId,
        workflowId,
        workflow: {
          workspaceId,
          workspace: {
            memberships: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] },
              },
            },
          },
        },
      },
      data,
    });

    if (result.count === 0) {
      throw new NotFoundException("Workflow step not found");
    }

    const step = await this.prisma.workflowStep.findFirst({
      where: {
        id: stepId,
        workflowId,
        workflow: { workspaceId },
      },
    });

    if (!step) {
      throw new NotFoundException("Workflow step not found");
    }

    return this.toResponse(step);
  }

  async remove(
    userId: string,
    workspaceId: string,
    workflowId: string,
    stepId: string,
  ): Promise<void> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    await this.requireWorkflow(workspaceId, workflowId);

    await this.prisma.$transaction(
      async (tx) => {
        await this.lockWorkflow(tx, workflowId);

        const steps = await tx.workflowStep.findMany({
          where: {
            workflowId,
            workflow: {
              workspaceId,
              workspace: {
                memberships: {
                  some: {
                    userId,
                    role: { in: ["OWNER", "ADMIN"] },
                  },
                },
              },
            },
          },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });

        const target = steps.find((step) => step.id === stepId);

        if (!target) {
          throw new NotFoundException("Workflow step not found");
        }

        await tx.workflowStep.delete({
          where: { id: stepId },
        });

        const remaining = steps.filter((step) => step.id !== stepId);

        // Move positions to a temporary range to avoid unique conflicts.
        const offset =
          Math.max(0, ...steps.map((step) => step.position)) + steps.length + 1;

        for (const step of remaining) {
          await tx.workflowStep.update({
            where: { id: step.id },
            data: { position: step.position + offset },
          });
        }

        // Rebuild contiguous positions starting from zero.
        for (let index = 0; index < remaining.length; index++) {
          await tx.workflowStep.update({
            where: { id: remaining[index].id },
            data: { position: index },
          });
        }
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }

  async reorder(
    userId: string,
    workspaceId: string,
    workflowId: string,
    input: ReorderWorkflowStepsRequest,
  ): Promise<WorkflowStepResponse[]> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    await this.requireWorkflow(workspaceId, workflowId);

    return this.prisma.$transaction(
      async (tx) => {
        await this.lockWorkflow(tx, workflowId);

        const steps = await tx.workflowStep.findMany({
          where: {
            workflowId,
            workflow: {
              workspaceId,
              workspace: {
                memberships: {
                  some: {
                    userId,
                    role: { in: ["OWNER", "ADMIN"] },
                  },
                },
              },
            },
          },
          orderBy: { position: "asc" },
        });

        const existingIds = new Set(steps.map((step) => step.id));

        const requestedIds = new Set(input.stepIds);

        if (
          steps.length !== input.stepIds.length ||
          requestedIds.size !== input.stepIds.length ||
          input.stepIds.some((id) => !existingIds.has(id))
        ) {
          throw new BadRequestException(
            "Step IDs must exactly match the workflow steps",
          );
        }

        // Move all steps to unused temporary positions.
        const offset =
          Math.max(0, ...steps.map((step) => step.position)) + steps.length + 1;

        for (const step of steps) {
          await tx.workflowStep.update({
            where: { id: step.id },
            data: { position: step.position + offset },
          });
        }

        // Assign final positions according to the requested order.
        for (let index = 0; index < input.stepIds.length; index++) {
          await tx.workflowStep.update({
            where: { id: input.stepIds[index] },
            data: { position: index },
          });
        }

        const updatedSteps = await tx.workflowStep.findMany({
          where: {
            workflowId,
            workflow: {
              workspaceId,
            },
          },
          orderBy: { position: "asc" },
        });

        return updatedSteps.map((step) => this.toResponse(step));
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );
  }
}
