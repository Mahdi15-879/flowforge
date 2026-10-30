import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { WorkspaceRole } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "./workspace-access.service";

describe("WorkspaceAccessService", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";

  const findUniqueMock = jest.fn();

  let service: WorkspaceAccessService;

  beforeEach(() => {
    jest.resetAllMocks();

    const prismaMock = {
      membership: {
        findUnique: findUniqueMock,
      },
    };

    service = new WorkspaceAccessService(
      prismaMock as unknown as PrismaService,
    );
  });

  it("returns OWNER role for workspace owner", async () => {
    findUniqueMock.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });

    const role = await service.requireMembership(userId, workspaceId);

    expect(role).toBe(WorkspaceRole.OWNER);

    expect(findUniqueMock).toHaveBeenCalledWith({
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
  });

  it("returns ADMIN role for workspace admin", async () => {
    findUniqueMock.mockResolvedValue({
      role: WorkspaceRole.ADMIN,
    });

    const role = await service.requireMembership(userId, workspaceId);

    expect(role).toBe(WorkspaceRole.ADMIN);
  });

  it("returns MEMBER role for workspace member", async () => {
    findUniqueMock.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });

    const role = await service.requireMembership(userId, workspaceId);

    expect(role).toBe(WorkspaceRole.MEMBER);
  });

  it("returns 404 when user is not a workspace member", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      service.requireMembership(userId, workspaceId),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns 403 when MEMBER requests an ADMIN operation", async () => {
    findUniqueMock.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });

    await expect(
      service.requireRole(userId, workspaceId, [
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
      ]),
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows ADMIN to perform an ADMIN operation", async () => {
    findUniqueMock.mockResolvedValue({
      role: WorkspaceRole.ADMIN,
    });

    const role = await service.requireRole(userId, workspaceId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    expect(role).toBe(WorkspaceRole.ADMIN);
  });
});
