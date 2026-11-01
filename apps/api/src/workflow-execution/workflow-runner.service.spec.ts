import { ConflictException, NotFoundException } from "@nestjs/common";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { PrismaService } from "../prisma/prisma.service";

describe("WorkflowRunnerService", () => {
  const prisma = {
    workflowRun: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  const service = new WorkflowRunnerService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("transitions a PENDING run to RUNNING", async () => {
    const startedRun = {
      id: "run-1",
      status: "RUNNING",
      startedAt: new Date(),
    };

    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.workflowRun.findUniqueOrThrow.mockResolvedValue(startedRun);

    await expect(service.markRunAsRunning("run-1")).resolves.toEqual(
      startedRun,
    );

    expect(prisma.workflowRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        status: "PENDING",
      },
      data: {
        status: "RUNNING",
        startedAt: expect.any(Date),
      },
    });
  });

  it("rejects a run that has already started", async () => {
    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
    });

    await expect(service.markRunAsRunning("run-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("returns 404 when the run does not exist", async () => {
    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.workflowRun.findUnique.mockResolvedValue(null);

    await expect(
      service.markRunAsRunning("missing-run"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("transitions a RUNNING run to SUCCEEDED", async () => {
    const completedRun = {
      id: "run-1",
      status: "SUCCEEDED",
      finishedAt: new Date(),
    };

    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.workflowRun.findUniqueOrThrow.mockResolvedValue(completedRun);

    await expect(service.markRunAsSucceeded("run-1")).resolves.toEqual(
      completedRun,
    );

    expect(prisma.workflowRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        status: "RUNNING",
      },
      data: {
        status: "SUCCEEDED",
        finishedAt: expect.any(Date),
      },
    });
  });

  it("rejects completing a run that is not RUNNING", async () => {
    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
    });

    await expect(service.markRunAsSucceeded("run-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("returns 404 when completing a missing run", async () => {
    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.workflowRun.findUnique.mockResolvedValue(null);

    await expect(
      service.markRunAsSucceeded("missing-run"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("transitions a RUNNING run to FAILED", async () => {
    const failedRun = {
      id: "run-1",
      status: "FAILED",
      finishedAt: new Date(),
    };

    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.workflowRun.findUniqueOrThrow.mockResolvedValue(failedRun);

    await expect(service.markRunAsFailed("run-1")).resolves.toEqual(failedRun);

    expect(prisma.workflowRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        status: "RUNNING",
      },
      data: {
        status: "FAILED",
        finishedAt: expect.any(Date),
      },
    });
  });

  it("rejects failing a run that is not RUNNING", async () => {
    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
    });

    await expect(service.markRunAsFailed("run-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("returns 404 when failing a missing run", async () => {
    prisma.workflowRun.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.workflowRun.findUnique.mockResolvedValue(null);

    await expect(service.markRunAsFailed("missing-run")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
