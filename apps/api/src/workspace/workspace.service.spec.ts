import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "./workspace-access.service";

describe("WorkspaceService", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  const input = {
    name: "Mahdi Development",
    slug: "mahdi-development",
  };

  const createdAt = new Date("2026-10-29T12:00:00.000Z");

  const workspace = {
    id: "22222222-2222-4222-8222-222222222222",
    name: input.name,
    slug: input.slug,
    createdAt,
  };

  const createMock = jest.fn();

  let service: WorkspaceService;

  beforeEach(() => {
    jest.clearAllMocks();

    const prismaMock = {
      workspace: {
        create: createMock,
      },
    };

    service = new WorkspaceService(
      prismaMock as unknown as PrismaService,
      {
        requireMembership: jest.fn(),
      } as unknown as WorkspaceAccessService,
    );
  });

  it("creates a workspace and assigns OWNER membership", async () => {
    createMock.mockResolvedValue(workspace);

    const result = await service.create(userId, input);

    expect(createMock).toHaveBeenCalledTimes(1);

    expect(createMock).toHaveBeenCalledWith({
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

    expect(result).toEqual({
      ...workspace,
      role: "OWNER",
      createdAt: createdAt.toISOString(),
    });
  });

  it("returns ConflictException when slug already exists", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.19.3",
        meta: { target: ["slug"] },
      },
    );

    createMock.mockRejectedValue(prismaError);

    await expect(service.create(userId, input)).rejects.toThrow(
      ConflictException,
    );
  });

  it("does not hide unexpected database errors", async () => {
    const databaseError = new Error("Database connection failed");

    createMock.mockRejectedValue(databaseError);

    await expect(service.create(userId, input)).rejects.toBe(databaseError);
  });

  it("returns a workspace response with ISO date and OWNER role", async () => {
    createMock.mockResolvedValue(workspace);

    const result = await service.create(userId, input);

    expect(result.id).toBe(workspace.id);
    expect(result.name).toBe(input.name);
    expect(result.slug).toBe(input.slug);
    expect(result.role).toBe("OWNER");
    expect(result.createdAt).toBe("2026-10-29T12:00:00.000Z");
  });

  it("lists only memberships belonging to the authenticated user", async () => {
    const findManyMock = jest.fn().mockResolvedValue([
      {
        role: "OWNER",
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          createdAt,
        },
      },
    ]);

    const prismaMock = {
      membership: {
        findMany: findManyMock,
      },
    };

    const listService = new WorkspaceService(
      prismaMock as unknown as PrismaService,
      {
        requireMembership: jest.fn(),
      } as unknown as WorkspaceAccessService,
    );

    const result = await listService.findMine(userId);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId },
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
      orderBy: { createdAt: "desc" },
    });

    expect(result).toEqual([
      {
        ...workspace,
        role: "OWNER",
        createdAt: createdAt.toISOString(),
      },
    ]);
  });

  it("returns an empty array when user has no workspaces", async () => {
    const findManyMock = jest.fn().mockResolvedValue([]);

    const prismaMock = {
      membership: {
        findMany: findManyMock,
      },
    };

    const listService = new WorkspaceService(
      prismaMock as unknown as PrismaService,
      {
        requireMembership: jest.fn(),
      } as unknown as WorkspaceAccessService,
    );

    const result = await listService.findMine(userId);

    expect(result).toEqual([]);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
      }),
    );
  });

  it("returns workspace details for an authorized member", async () => {
    const requireMembershipMock = jest.fn().mockResolvedValue("OWNER");
    const findUniqueMock = jest.fn().mockResolvedValue(workspace);

    const prismaMock = {
      workspace: {
        findUnique: findUniqueMock,
      },
    };

    const accessMock = {
      requireMembership: requireMembershipMock,
    };

    const detailService = new WorkspaceService(
      prismaMock as unknown as PrismaService,
      accessMock as unknown as WorkspaceAccessService,
    );

    const result = await detailService.findOne(userId, workspace.id);

    expect(requireMembershipMock).toHaveBeenCalledWith(userId, workspace.id);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: workspace.id },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    expect(result).toEqual({
      ...workspace,
      role: "OWNER",
      createdAt: createdAt.toISOString(),
    });
  });

  it("does not query workspace details when membership is missing", async () => {
    const requireMembershipMock = jest
      .fn()
      .mockRejectedValue(new NotFoundException("Workspace not found"));

    const findUniqueMock = jest.fn();

    const detailService = new WorkspaceService(
      {
        workspace: {
          findUnique: findUniqueMock,
        },
      } as unknown as PrismaService,
      {
        requireMembership: requireMembershipMock,
      } as unknown as WorkspaceAccessService,
    );

    await expect(detailService.findOne(userId, workspace.id)).rejects.toThrow(
      NotFoundException,
    );

    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 when workspace no longer exists", async () => {
    const detailService = new WorkspaceService(
      {
        workspace: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaService,
      {
        requireMembership: jest.fn().mockResolvedValue("OWNER"),
      } as unknown as WorkspaceAccessService,
    );

    await expect(detailService.findOne(userId, workspace.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe("update", () => {
    const updateInput = {
      name: "Mahdi Development Updated",
    };

    const updatedWorkspace = {
      ...workspace,
      name: updateInput.name,
    };

    const makeUpdateService = (
      role: "OWNER" | "ADMIN" | "MEMBER",
      updateCount = 1,
    ) => {
      const requireRoleMock = jest.fn().mockResolvedValue(role);
      const updateManyMock = jest.fn().mockResolvedValue({
        count: updateCount,
      });
      const findUniqueMock = jest.fn().mockResolvedValue(updatedWorkspace);

      const service = new WorkspaceService(
        {
          workspace: {
            updateMany: updateManyMock,
            findUnique: findUniqueMock,
          },
        } as unknown as PrismaService,
        {
          requireRole: requireRoleMock,
        } as unknown as WorkspaceAccessService,
      );

      return {
        service,
        requireRoleMock,
        updateManyMock,
        findUniqueMock,
      };
    };

    it("allows OWNER to update a workspace", async () => {
      const mocks = makeUpdateService("OWNER");

      const result = await mocks.service.update(
        userId,
        workspace.id,
        updateInput,
      );

      expect(mocks.requireRoleMock).toHaveBeenCalledWith(userId, workspace.id, [
        "OWNER",
        "ADMIN",
      ]);

      expect(mocks.updateManyMock).toHaveBeenCalledWith({
        where: {
          id: workspace.id,
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
          name: updateInput.name,
        },
      });

      expect(result).toEqual({
        ...updatedWorkspace,
        role: "OWNER",
        createdAt: createdAt.toISOString(),
      });
    });

    it("allows ADMIN to update a workspace", async () => {
      const mocks = makeUpdateService("ADMIN");

      const result = await mocks.service.update(
        userId,
        workspace.id,
        updateInput,
      );

      expect(result.role).toBe("ADMIN");
      expect(result.name).toBe(updateInput.name);
      expect(mocks.updateManyMock).toHaveBeenCalledTimes(1);
    });

    it("rejects MEMBER without modifying the database", async () => {
      const mocks = makeUpdateService("MEMBER");

      mocks.requireRoleMock.mockRejectedValue(
        new ForbiddenException("Insufficient workspace permissions"),
      );

      await expect(
        mocks.service.update(userId, workspace.id, updateInput),
      ).rejects.toThrow(ForbiddenException);

      expect(mocks.updateManyMock).not.toHaveBeenCalled();
      expect(mocks.findUniqueMock).not.toHaveBeenCalled();
    });

    it("rejects update when permissions change before the database write", async () => {
      const mocks = makeUpdateService("OWNER", 0);

      await expect(
        mocks.service.update(userId, workspace.id, updateInput),
      ).rejects.toThrow(NotFoundException);

      expect(mocks.updateManyMock).toHaveBeenCalledTimes(1);
      expect(mocks.findUniqueMock).not.toHaveBeenCalled();
    });
  });
});
