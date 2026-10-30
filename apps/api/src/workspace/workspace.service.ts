import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
  WorkspaceResponseSchema,
} from "@flowforge/contracts";
import { WorkspaceAccessService } from "./workspace-access.service";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  // Create a workspace and assign OWNER role to its creator
  async create(
    userId: string,
    input: CreateWorkspaceRequest,
  ): Promise<WorkspaceResponse> {
    try {
      const workspace = await this.prisma.workspace.create({
        data: {
          name: input.name,
          slug: input.slug,
          memberships: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
        },
      });

      return WorkspaceResponseSchema.parse({
        ...workspace,
        role: "OWNER",
        createdAt: workspace.createdAt.toISOString(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Workspace slug already exists");
      }

      throw error;
    }
  }

  // List only workspaces that the authenticated user belongs to
  async findMine(userId: string): Promise<WorkspaceResponse[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
      },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return memberships.map((membership) =>
      WorkspaceResponseSchema.parse({
        ...membership.workspace,
        role: membership.role,
        createdAt: membership.workspace.createdAt.toISOString(),
      }),
    );
  }

  async findOne(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceResponse> {
    const role = await this.workspaceAccess.requireMembership(
      userId,
      workspaceId,
    );

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    return WorkspaceResponseSchema.parse({
      ...workspace,
      role,
      createdAt: workspace.createdAt.toISOString(),
    });
  }

  async update(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceRequest,
  ): Promise<WorkspaceResponse> {
    const role = await this.workspaceAccess.requireRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const result = await this.prisma.workspace.updateMany({
      where: {
        id: workspaceId,
        memberships: {
          some: {
            userId,
            role: {
              in: ["OWNER", "ADMIN"],
            },
          },
        },
      },
      data: {
        name: input.name,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Workspace not found or access changed");
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    return WorkspaceResponseSchema.parse({
      ...workspace,
      role,
      createdAt: workspace.createdAt.toISOString(),
    });
  }
}
