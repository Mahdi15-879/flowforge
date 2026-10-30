import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WorkspaceRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceRole> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException("Workspace not found");
    }

    return membership.role;
  }

  async requireRole(
    userId: string,
    workspaceId: string,
    allowedRoles: WorkspaceRole[],
  ): Promise<WorkspaceRole> {
    const role = await this.requireMembership(userId, workspaceId);

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException("Insufficient workspace permissions");
    }

    return role;
  }
}
