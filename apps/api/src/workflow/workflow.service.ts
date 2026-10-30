import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowResponse,
  WorkflowResponseSchema,
} from "@flowforge/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  private toResponse(workflow: {
    id: string;
    name: string;
    description: string | null;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowResponse {
    return WorkflowResponseSchema.parse({
      ...workflow,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    });
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateWorkflowRequest,
  ): Promise<WorkflowResponse> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const workflow = await this.prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        workspaceId,
      },
    });

    return this.toResponse(workflow);
  }

  async findAll(
    userId: string,
    workspaceId: string,
  ): Promise<WorkflowResponse[]> {
    await this.workspaceAccess.requireMembership(userId, workspaceId);

    const workflows = await this.prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return workflows.map((workflow) => this.toResponse(workflow));
  }

  async findOne(
    userId: string,
    workspaceId: string,
    workflowId: string,
  ): Promise<WorkflowResponse> {
    await this.workspaceAccess.requireMembership(userId, workspaceId);

    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId,
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return this.toResponse(workflow);
  }

  async update(
    userId: string,
    workspaceId: string,
    workflowId: string,
    input: UpdateWorkflowRequest,
  ): Promise<WorkflowResponse> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const data: Prisma.WorkflowUpdateManyMutationInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.description !== undefined) {
      data.description = input.description;
    }

    const result = await this.prisma.workflow.updateMany({
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
      data,
    });

    if (result.count === 0) {
      throw new NotFoundException("Workflow not found");
    }

    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId,
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return this.toResponse(workflow);
  }

  async remove(
    userId: string,
    workspaceId: string,
    workflowId: string,
  ): Promise<void> {
    await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const result = await this.prisma.workflow.deleteMany({
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
    });

    if (result.count === 0) {
      throw new NotFoundException("Workflow not found");
    }
  }
}
