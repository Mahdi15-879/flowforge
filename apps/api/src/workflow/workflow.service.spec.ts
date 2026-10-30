import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";
import { WorkflowService } from "./workflow.service";

describe("WorkflowService", () => {
  let service: WorkflowService;

  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";
  const workflowId = "33333333-3333-4333-8333-333333333333";

  const workflow = {
    id: workflowId,
    name: "Daily Report",
    description: "Daily sales report",
    workspaceId,
    createdAt: new Date("2026-10-30T08:00:00.000Z"),
    updatedAt: new Date("2026-10-30T08:00:00.000Z"),
  };

  const prisma = {
    workflow: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const workspaceAccess = {
    requireMembership: jest.fn(),
    requireRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: WorkspaceAccessService,
          useValue: workspaceAccess,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);

    workspaceAccess.requireMembership.mockResolvedValue("MEMBER");
    workspaceAccess.requireRole.mockResolvedValue("OWNER");
  });

  it("creates a workflow for an authorized user", async () => {
    prisma.workflow.create.mockResolvedValue(workflow);

    const result = await service.create(userId, workspaceId, {
      name: "Daily Report",
      description: "Daily sales report",
    });

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(prisma.workflow.create).toHaveBeenCalledWith({
      data: {
        name: "Daily Report",
        description: "Daily sales report",
        workspaceId,
      },
    });

    expect(result.id).toBe(workflowId);
    expect(result.createdAt).toBe("2026-10-30T08:00:00.000Z");
  });

  it("uses null when description is omitted", async () => {
    prisma.workflow.create.mockResolvedValue(workflow);

    await service.create(userId, workspaceId, {
      name: "Daily Report",
    });

    expect(prisma.workflow.create).toHaveBeenCalledWith({
      data: {
        name: "Daily Report",
        description: null,
        workspaceId,
      },
    });
  });

  it("rejects creation without sufficient permissions", async () => {
    workspaceAccess.requireRole.mockRejectedValue(new ForbiddenException());

    await expect(
      service.create(userId, workspaceId, {
        name: "Daily Report",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.workflow.create).not.toHaveBeenCalled();
  });

  it("lists only workflows belonging to the workspace", async () => {
    prisma.workflow.findMany.mockResolvedValue([workflow]);

    const result = await service.findAll(userId, workspaceId);

    expect(workspaceAccess.requireMembership).toHaveBeenCalledWith(
      userId,
      workspaceId,
    );

    expect(prisma.workflow.findMany).toHaveBeenCalledWith({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(workflowId);
  });

  it("rejects listing for non-members", async () => {
    workspaceAccess.requireMembership.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(service.findAll(userId, workspaceId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.workflow.findMany).not.toHaveBeenCalled();
  });

  it("retrieves a workflow scoped to its workspace", async () => {
    prisma.workflow.findFirst.mockResolvedValue(workflow);

    const result = await service.findOne(userId, workspaceId, workflowId);

    expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
      where: { id: workflowId, workspaceId },
    });

    expect(result.id).toBe(workflowId);
  });

  it("returns 404 when the workflow is not in the workspace", async () => {
    prisma.workflow.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(userId, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates a workflow with workspace and role restrictions", async () => {
    prisma.workflow.updateMany.mockResolvedValue({ count: 1 });
    prisma.workflow.findFirst.mockResolvedValue({
      ...workflow,
      name: "Updated Report",
    });

    const result = await service.update(userId, workspaceId, workflowId, {
      name: "Updated Report",
    });

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(prisma.workflow.updateMany).toHaveBeenCalledWith({
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
      data: { name: "Updated Report" },
    });

    expect(result.name).toBe("Updated Report");
  });

  it("returns 404 when no workflow is updated", async () => {
    prisma.workflow.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update(userId, workspaceId, workflowId, {
        name: "Updated Report",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.workflow.findFirst).not.toHaveBeenCalled();
  });

  it("allows clearing the description with null", async () => {
    prisma.workflow.updateMany.mockResolvedValue({ count: 1 });
    prisma.workflow.findFirst.mockResolvedValue({
      ...workflow,
      description: null,
    });

    const result = await service.update(userId, workspaceId, workflowId, {
      description: null,
    });

    expect(prisma.workflow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { description: null },
      }),
    );

    expect(result.description).toBeNull();
  });

  it("deletes a workflow with workspace and role restrictions", async () => {
    prisma.workflow.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      service.remove(userId, workspaceId, workflowId),
    ).resolves.toBeUndefined();

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(prisma.workflow.deleteMany).toHaveBeenCalledWith({
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
  });

  it("returns 404 when no workflow is deleted", async () => {
    prisma.workflow.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.remove(userId, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
