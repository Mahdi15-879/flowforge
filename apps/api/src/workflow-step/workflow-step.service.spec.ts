import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";
import { WorkflowStepService } from "./workflow-step.service";

describe("WorkflowStepService", () => {
  let service: WorkflowStepService;

  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";
  const workflowId = "33333333-3333-4333-8333-333333333333";
  const stepId = "44444444-4444-4444-8444-444444444444";

  const step = {
    id: stepId,
    workflowId,
    name: "Daily Trigger",
    type: "TRIGGER" as const,
    position: 0,
    config: { enabled: true },
    createdAt: new Date("2026-10-30T08:00:00.000Z"),
    updatedAt: new Date("2026-10-30T08:00:00.000Z"),
  };

  const tx = {
    $queryRaw: jest.fn(),
    workflow: {
      findFirst: jest.fn(),
    },
    workflowStep: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
    workflow: {
      findFirst: jest.fn(),
    },
    workflowStep: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const workspaceAccess = {
    requireMembership: jest.fn(),
    requireRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    tx.$queryRaw.mockResolvedValue([{ locked: "" }]);
    tx.workflow.findFirst.mockResolvedValue({ id: workflowId });

    workspaceAccess.requireMembership.mockResolvedValue("MEMBER");
    workspaceAccess.requireRole.mockResolvedValue("OWNER");

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowStepService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: WorkspaceAccessService,
          useValue: workspaceAccess,
        },
      ],
    }).compile();

    service = module.get<WorkflowStepService>(WorkflowStepService);
  });

  it("creates a step for an authorized OWNER", async () => {
    tx.workflowStep.count.mockResolvedValue(0);
    tx.workflowStep.create.mockResolvedValue(step);

    const result = await service.create(userId, workspaceId, workflowId, {
      name: "Daily Trigger",
      type: "TRIGGER",
      position: 0,
      config: {},
    });

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(tx.workflowStep.create).toHaveBeenCalledWith({
      data: {
        workflowId,
        name: "Daily Trigger",
        type: "TRIGGER",
        position: 0,
        config: {},
      },
    });

    expect(result.id).toBe(stepId);
    expect(result.position).toBe(0);
    expect(result.createdAt).toBe("2026-10-30T08:00:00.000Z");

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("creates an HTTP_REQUEST action with valid configuration", async () => {
    tx.workflowStep.count.mockResolvedValue(0);

    const config = {
      operation: "HTTP_REQUEST",
      url: "https://example.com/api",
      method: "POST",
    };

    tx.workflowStep.create.mockImplementation(async ({ data }) => ({
      ...step,
      name: data.name,
      type: data.type,
      config: data.config,
    }));

    const result = await service.create(userId, workspaceId, workflowId, {
      name: "Call External API",
      type: "ACTION",
      position: 0,
      config,
    });

    expect(tx.workflowStep.create).toHaveBeenCalledWith({
      data: {
        workflowId,
        name: "Call External API",
        type: "ACTION",
        position: 0,
        config,
      },
    });

    expect(result.config).toEqual(config);
  });

  it("creates a SCHEDULE trigger with default UTC timezone", async () => {
    tx.workflowStep.count.mockResolvedValue(0);

    tx.workflowStep.create.mockImplementation(async ({ data }) => ({
      ...step,
      name: data.name,
      type: data.type,
      config: data.config,
    }));

    const result = await service.create(userId, workspaceId, workflowId, {
      name: "Daily Schedule",
      type: "TRIGGER",
      position: 0,
      config: {
        operation: "SCHEDULE",
        cron: "0 9 * * *",
      },
    });

    expect(tx.workflowStep.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        config: {
          operation: "SCHEDULE",
          cron: "0 9 * * *",
          timezone: "UTC",
        },
      }),
    });

    expect(result.config).toEqual({
      operation: "SCHEDULE",
      cron: "0 9 * * *",
      timezone: "UTC",
    });
  });

  it("rejects invalid configuration without inserting a step", async () => {
    tx.workflowStep.count.mockResolvedValue(0);

    await expect(
      service.create(userId, workspaceId, workflowId, {
        name: "Invalid Action",
        type: "ACTION",
        position: 0,
        config: {
          operation: "SCHEDULE",
          cron: "0 9 * * *",
          timezone: "UTC",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.workflowStep.create).not.toHaveBeenCalled();
  });

  it("rejects creation by a MEMBER", async () => {
    workspaceAccess.requireRole.mockRejectedValue(
      new ForbiddenException("Insufficient workspace permissions"),
    );

    await expect(
      service.create(userId, workspaceId, workflowId, {
        name: "Unauthorized Step",
        type: "ACTION",
        position: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.workflowStep.create).not.toHaveBeenCalled();
  });

  it("rejects a non-append position", async () => {
    tx.workflowStep.count.mockResolvedValue(2);

    await expect(
      service.create(userId, workspaceId, workflowId, {
        name: "Invalid Position",
        type: "ACTION",
        position: 1,
      }),
    ).rejects.toThrow(new BadRequestException("New step position must be 2"));

    expect(tx.workflowStep.create).not.toHaveBeenCalled();
  });

  it("lists workflow steps for a workspace member", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });
    prisma.workflowStep.findMany.mockResolvedValue([step]);

    const result = await service.findAll(userId, workspaceId, workflowId);

    expect(workspaceAccess.requireMembership).toHaveBeenCalledWith(
      userId,
      workspaceId,
    );

    expect(prisma.workflowStep.findMany).toHaveBeenCalledWith({
      where: { workflowId },
      orderBy: { position: "asc" },
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(stepId);
  });

  it("rejects listing steps for non-members", async () => {
    workspaceAccess.requireMembership.mockRejectedValue(
      new NotFoundException("Workspace not found"),
    );

    await expect(
      service.findAll(userId, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.workflowStep.findMany).not.toHaveBeenCalled();
  });

  it("retrieves a single workflow step", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });
    prisma.workflowStep.findFirst.mockResolvedValue(step);

    const result = await service.findOne(
      userId,
      workspaceId,
      workflowId,
      stepId,
    );

    expect(prisma.workflowStep.findFirst).toHaveBeenCalledWith({
      where: {
        id: stepId,
        workflowId,
      },
    });

    expect(result.id).toBe(stepId);
    expect(result.name).toBe("Daily Trigger");
  });

  it("returns 404 when a workflow step does not exist", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });
    prisma.workflowStep.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(userId, workspaceId, workflowId, stepId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates a step for an authorized OWNER", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });
    prisma.workflowStep.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.workflowStep.findFirst.mockResolvedValue({
      ...step,
      name: "Updated Trigger",
    });

    const result = await service.update(
      userId,
      workspaceId,
      workflowId,
      stepId,
      { name: "Updated Trigger" },
    );

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(prisma.workflowStep.updateMany).toHaveBeenCalledWith({
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
      data: { name: "Updated Trigger" },
    });

    expect(result.name).toBe("Updated Trigger");
  });

  it("rejects updating a step by a MEMBER", async () => {
    workspaceAccess.requireRole.mockRejectedValue(
      new ForbiddenException("Insufficient workspace permissions"),
    );

    await expect(
      service.update(userId, workspaceId, workflowId, stepId, {
        name: "Unauthorized Update",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.workflowStep.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when no step is updated", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });
    prisma.workflowStep.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.update(userId, workspaceId, workflowId, stepId, {
        name: "Updated Trigger",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.workflowStep.findFirst).not.toHaveBeenCalled();
  });

  it("updates step config without changing its name", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    prisma.workflowStep.findFirst
      .mockResolvedValueOnce({ type: "TRIGGER" })
      .mockResolvedValueOnce({
        ...step,
        config: {
          operation: "SCHEDULE",
          cron: "0 9 * * *",
          timezone: "UTC",
        },
      });

    prisma.workflowStep.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.update(
      userId,
      workspaceId,
      workflowId,
      stepId,
      {
        config: {
          operation: "SCHEDULE",
          cron: "0 9 * * *",
        },
      },
    );

    expect(prisma.workflowStep.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          config: {
            operation: "SCHEDULE",
            cron: "0 9 * * *",
            timezone: "UTC",
          },
        },
      }),
    );

    expect(result.config).toEqual({
      operation: "SCHEDULE",
      cron: "0 9 * * *",
      timezone: "UTC",
    });

    expect(result.name).toBe("Daily Trigger");
  });

  it("rejects invalid config updates without modifying the database", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    prisma.workflowStep.findFirst.mockResolvedValue({
      type: "ACTION",
    });

    await expect(
      service.update(userId, workspaceId, workflowId, stepId, {
        config: {
          operation: "SCHEDULE",
          cron: "0 9 * * *",
          timezone: "UTC",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.workflowStep.findFirst).toHaveBeenCalledWith({
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
      select: {
        type: true,
      },
    });

    expect(prisma.workflowStep.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when updating config of a missing or inaccessible step", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    prisma.workflowStep.findFirst.mockResolvedValue(null);

    await expect(
      service.update(userId, workspaceId, workflowId, stepId, {
        config: {
          operation: "HTTP_REQUEST",
          url: "https://example.com/api",
          method: "GET",
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.workflowStep.findFirst).toHaveBeenCalledWith({
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
      select: {
        type: true,
      },
    });

    expect(prisma.workflowStep.updateMany).not.toHaveBeenCalled();
  });

  it("deletes a step and rebuilds contiguous positions", async () => {
    const secondStepId = "55555555-5555-4555-8555-555555555555";
    const thirdStepId = "66666666-6666-4666-8666-666666666666";

    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    tx.workflowStep.findMany.mockResolvedValue([
      { id: stepId, position: 0 },
      { id: secondStepId, position: 1 },
      { id: thirdStepId, position: 2 },
    ]);

    tx.workflowStep.delete.mockResolvedValue({
      id: secondStepId,
    });

    tx.workflowStep.update.mockResolvedValue({});

    await expect(
      service.remove(userId, workspaceId, workflowId, secondStepId),
    ).resolves.toBeUndefined();

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(tx.workflowStep.delete).toHaveBeenCalledWith({
      where: { id: secondStepId },
    });

    expect(tx.workflowStep.update).toHaveBeenCalledTimes(4);

    expect(tx.workflowStep.update).toHaveBeenNthCalledWith(3, {
      where: { id: stepId },
      data: { position: 0 },
    });

    expect(tx.workflowStep.update).toHaveBeenNthCalledWith(4, {
      where: { id: thirdStepId },
      data: { position: 1 },
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects deleting a step by a MEMBER", async () => {
    workspaceAccess.requireRole.mockRejectedValue(
      new ForbiddenException("Insufficient workspace permissions"),
    );

    await expect(
      service.remove(userId, workspaceId, workflowId, stepId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.workflowStep.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when deleting a missing step", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    tx.workflowStep.findMany.mockResolvedValue([{ id: stepId, position: 0 }]);

    await expect(
      service.remove(
        userId,
        workspaceId,
        workflowId,
        "77777777-7777-4777-8777-777777777777",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.workflowStep.delete).not.toHaveBeenCalled();
    expect(tx.workflowStep.update).not.toHaveBeenCalled();
  });

  it("reorders steps using temporary positions", async () => {
    const secondStepId = "55555555-5555-4555-8555-555555555555";

    const secondStep = {
      ...step,
      id: secondStepId,
      name: "Send Email",
      type: "ACTION" as const,
      position: 1,
    };

    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    tx.workflowStep.findMany
      .mockResolvedValueOnce([step, secondStep])
      .mockResolvedValueOnce([
        { ...secondStep, position: 0 },
        { ...step, position: 1 },
      ]);

    tx.workflowStep.update.mockResolvedValue({});

    const result = await service.reorder(userId, workspaceId, workflowId, {
      stepIds: [secondStepId, stepId],
    });

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(tx.workflowStep.update).toHaveBeenCalledTimes(4);

    // Temporary positions: offset = 1 + 2 + 1 = 4
    expect(tx.workflowStep.update).toHaveBeenNthCalledWith(1, {
      where: { id: stepId },
      data: { position: 4 },
    });

    expect(tx.workflowStep.update).toHaveBeenNthCalledWith(2, {
      where: { id: secondStepId },
      data: { position: 5 },
    });

    expect(tx.workflowStep.update).toHaveBeenNthCalledWith(3, {
      where: { id: secondStepId },
      data: { position: 0 },
    });

    expect(tx.workflowStep.update).toHaveBeenNthCalledWith(4, {
      where: { id: stepId },
      data: { position: 1 },
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(secondStepId);
    expect(result[0].position).toBe(0);
    expect(result[1].id).toBe(stepId);
    expect(result[1].position).toBe(1);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects reordering by a MEMBER", async () => {
    workspaceAccess.requireRole.mockRejectedValue(
      new ForbiddenException("Insufficient workspace permissions"),
    );

    await expect(
      service.reorder(userId, workspaceId, workflowId, {
        stepIds: [stepId],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate step IDs during reorder", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    tx.workflowStep.findMany.mockResolvedValue([
      step,
      {
        ...step,
        id: "55555555-5555-4555-8555-555555555555",
        position: 1,
      },
    ]);

    await expect(
      service.reorder(userId, workspaceId, workflowId, {
        stepIds: [stepId, stepId],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.workflowStep.update).not.toHaveBeenCalled();
  });

  it("rejects reorder when a step ID is missing", async () => {
    prisma.workflow.findFirst.mockResolvedValue({
      id: workflowId,
    });

    tx.workflowStep.findMany.mockResolvedValue([
      step,
      {
        ...step,
        id: "55555555-5555-4555-8555-555555555555",
        position: 1,
      },
    ]);

    await expect(
      service.reorder(userId, workspaceId, workflowId, {
        stepIds: [stepId],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.workflowStep.update).not.toHaveBeenCalled();
  });
});
