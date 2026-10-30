import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";
import { WorkflowExecutionService } from "./workflow-execution.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

describe("WorkflowExecutionService", () => {
  let service: WorkflowExecutionService;

  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";
  const workflowId = "33333333-3333-4333-8333-333333333333";

  const steps = [
    {
      id: "44444444-4444-4444-8444-444444444444",
      workflowId,
      name: "Daily Schedule",
      type: "TRIGGER",
      position: 0,
      config: {
        operation: "SCHEDULE",
        cron: "0 9 * * *",
        timezone: "UTC",
      },
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      workflowId,
      name: "Call API",
      type: "ACTION",
      position: 1,
      config: {
        operation: "HTTP_REQUEST",
        url: "https://example.com/api",
        method: "GET",
      },
    },
  ];

  const tx = {
    workflow: {
      findFirst: jest.fn(),
    },
    workflowRun: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
  };

  const workspaceAccess = {
    requireRole: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    workspaceAccess.requireRole.mockResolvedValue("OWNER");

    tx.workflow.findFirst.mockResolvedValue({
      id: workflowId,
      workspaceId,
      steps,
    });

    tx.workflowRun.create.mockResolvedValue({
      id: "66666666-6666-4666-8666-666666666666",
      workflowId,
      status: "PENDING",
      stepRuns: [],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowExecutionService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: WorkspaceAccessService,
          useValue: workspaceAccess,
        },
      ],
    }).compile();

    service = module.get<WorkflowExecutionService>(WorkflowExecutionService);
  });

  it("creates a pending workflow run with step snapshots", async () => {
    const result = await service.startRun(userId, workspaceId, workflowId);

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(tx.workflow.findFirst).toHaveBeenCalledWith({
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

    expect(tx.workflowRun.create).toHaveBeenCalledWith({
      data: {
        workflowId,
        status: "PENDING",
        stepRuns: {
          create: steps.map((step) => ({
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            position: step.position,
            config: step.config,
            status: "PENDING",
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

    expect(result.status).toBe("PENDING");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects starting a workflow run by a MEMBER", async () => {
    workspaceAccess.requireRole.mockRejectedValue(
      new ForbiddenException("Insufficient workspace permissions"),
    );

    await expect(
      service.startRun(userId, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.workflow.findFirst).not.toHaveBeenCalled();
    expect(tx.workflowRun.create).not.toHaveBeenCalled();
  });

  it("returns 404 when workflow does not belong to the workspace", async () => {
    tx.workflow.findFirst.mockResolvedValue(null);

    await expect(
      service.startRun(userId, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.workflow.findFirst).toHaveBeenCalledWith({
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

    expect(tx.workflowRun.create).not.toHaveBeenCalled();
  });

  it("propagates a transaction failure when creating a workflow run", async () => {
    const databaseError = new Error("Database transaction failed");

    tx.workflowRun.create.mockRejectedValue(databaseError);

    await expect(
      service.startRun(userId, workspaceId, workflowId),
    ).rejects.toThrow("Database transaction failed");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.workflow.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.workflowRun.create).toHaveBeenCalledTimes(1);
  });

  it("rejects execution of a workflow without steps", async () => {
    tx.workflow.findFirst.mockResolvedValue({
      id: workflowId,
      workspaceId,
      steps: [],
    });

    await expect(
      service.startRun(userId, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workspaceAccess.requireRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      ["OWNER", "ADMIN"],
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.workflowRun.create).not.toHaveBeenCalled();
  });

  it("rejects a workflow that does not start with a trigger", async () => {
    tx.workflow.findFirst.mockResolvedValue({
      id: workflowId,
      workspaceId,
      steps: [
        {
          ...steps[1],
          position: 0,
        },
      ],
    });

    await expect(
      service.startRun(userId, workspaceId, workflowId),
    ).rejects.toThrow(
      new BadRequestException("Workflow must start with a trigger step"),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.workflowRun.create).not.toHaveBeenCalled();
  });

  it("rejects a workflow containing multiple trigger steps", async () => {
    tx.workflow.findFirst.mockResolvedValue({
      id: workflowId,
      workspaceId,
      steps: [
        steps[0],
        {
          ...steps[0],
          id: "77777777-7777-4777-8777-777777777777",
          name: "Second Trigger",
          position: 1,
        },
      ],
    });

    await expect(
      service.startRun(userId, workspaceId, workflowId),
    ).rejects.toThrow(
      new BadRequestException("Workflow cannot contain multiple trigger steps"),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.workflowRun.create).not.toHaveBeenCalled();
  });
});
