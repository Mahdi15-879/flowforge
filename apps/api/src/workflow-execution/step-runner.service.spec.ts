import { ConflictException, NotFoundException } from "@nestjs/common";
import { StepRunnerService } from "./step-runner.service";
import { PrismaService } from "../prisma/prisma.service";

describe("StepRunnerService", () => {
  const prisma = {
    stepRun: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  const service = new StepRunnerService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("markStepAsRunning", () => {
    it("transitions a pending step to RUNNING", async () => {
      const stepRunId = "step-run-1";
      const runningStep = {
        id: stepRunId,
        status: "RUNNING",
        startedAt: new Date(),
      };

      prisma.stepRun.updateMany.mockResolvedValue({ count: 1 });
      prisma.stepRun.findUniqueOrThrow.mockResolvedValue(runningStep);

      const result = await service.markStepAsRunning(stepRunId);

      expect(result).toEqual(runningStep);

      expect(prisma.stepRun.updateMany).toHaveBeenCalledWith({
        where: {
          id: stepRunId,
          status: "PENDING",
          workflowRun: {
            status: "RUNNING",
          },
        },
        data: {
          status: "RUNNING",
          startedAt: expect.any(Date),
        },
      });
    });

    it("rejects an invalid state transition with 409", async () => {
      prisma.stepRun.updateMany.mockResolvedValue({ count: 0 });
      prisma.stepRun.findUnique.mockResolvedValue({
        id: "step-run-1",
      });

      await expect(
        service.markStepAsRunning("step-run-1"),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.stepRun.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("returns 404 when the step run does not exist", async () => {
      prisma.stepRun.updateMany.mockResolvedValue({ count: 0 });
      prisma.stepRun.findUnique.mockResolvedValue(null);

      await expect(
        service.markStepAsRunning("missing-step"),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.stepRun.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe("markStepAsSucceeded", () => {
    it("marks a running step as SUCCEEDED and stores its output", async () => {
      const stepRunId = "step-run-1";
      const output = { statusCode: 200, message: "OK" };

      const succeededStep = {
        id: stepRunId,
        status: "SUCCEEDED",
        output,
        finishedAt: new Date(),
      };

      prisma.stepRun.updateMany.mockResolvedValue({ count: 1 });
      prisma.stepRun.findUniqueOrThrow.mockResolvedValue(succeededStep);

      const result = await service.markStepAsSucceeded(stepRunId, output);

      expect(result).toEqual(succeededStep);

      expect(prisma.stepRun.updateMany).toHaveBeenCalledWith({
        where: {
          id: stepRunId,
          status: "RUNNING",
          workflowRun: {
            status: "RUNNING",
          },
        },
        data: {
          status: "SUCCEEDED",
          output,
          finishedAt: expect.any(Date),
        },
      });
    });

    it("rejects an invalid state transition with 409", async () => {
      prisma.stepRun.updateMany.mockResolvedValue({ count: 0 });
      prisma.stepRun.findUnique.mockResolvedValue({
        id: "step-run-1",
      });

      await expect(
        service.markStepAsSucceeded("step-run-1", {}),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.stepRun.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("returns 404 when the step run does not exist", async () => {
      prisma.stepRun.updateMany.mockResolvedValue({ count: 0 });
      prisma.stepRun.findUnique.mockResolvedValue(null);

      await expect(
        service.markStepAsSucceeded("missing-step", {}),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.stepRun.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe("markStepAsFailed", () => {
    it("marks a running step as FAILED and stores its error", async () => {
      const stepRunId = "step-run-1";
      const error = "HTTP request failed";

      const failedStep = {
        id: stepRunId,
        status: "FAILED",
        error,
        finishedAt: new Date(),
      };

      prisma.stepRun.updateMany.mockResolvedValue({ count: 1 });
      prisma.stepRun.findUniqueOrThrow.mockResolvedValue(failedStep);

      const result = await service.markStepAsFailed(stepRunId, error);

      expect(result).toEqual(failedStep);

      expect(prisma.stepRun.updateMany).toHaveBeenCalledWith({
        where: {
          id: stepRunId,
          status: "RUNNING",
          workflowRun: {
            status: "RUNNING",
          },
        },
        data: {
          status: "FAILED",
          error,
          finishedAt: expect.any(Date),
        },
      });
    });

    it("rejects an invalid state transition with 409", async () => {
      prisma.stepRun.updateMany.mockResolvedValue({ count: 0 });
      prisma.stepRun.findUnique.mockResolvedValue({
        id: "step-run-1",
      });

      await expect(
        service.markStepAsFailed("step-run-1", "Test error"),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.stepRun.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("returns 404 when the step run does not exist", async () => {
      prisma.stepRun.updateMany.mockResolvedValue({ count: 0 });
      prisma.stepRun.findUnique.mockResolvedValue(null);

      await expect(
        service.markStepAsFailed("missing-step", "Test error"),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.stepRun.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });
});
