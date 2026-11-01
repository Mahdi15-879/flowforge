import { WorkflowOrchestratorService } from "./workflow-orchestrator.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { StepRunnerService } from "./step-runner.service";
import { HttpActionExecutorService } from "./http-action-executor.service";

describe("WorkflowOrchestratorService", () => {
  const config = {
    operation: "HTTP_REQUEST",
    url: "https://jsonplaceholder.typicode.com/todos/1",
    method: "GET",
  };

  const trigger = {
    id: "step-1",
    stepName: "Manual Trigger",
    stepType: "TRIGGER",
    position: 0,
    config: {},
  };

  const action = {
    id: "step-2",
    stepName: "Fetch Data",
    stepType: "ACTION",
    position: 1,
    config,
  };

  const nextAction = {
    ...action,
    id: "step-3",
    stepName: "Next Action",
    position: 2,
  };

  let orchestrator: WorkflowOrchestratorService;

  const prisma = {
    stepRun: {
      findMany: jest.fn(),
    },
  };

  const workflowRunner = {
    markRunAsRunning: jest.fn(),
    markRunAsSucceeded: jest.fn(),
    markRunAsFailed: jest.fn(),
  };

  const stepRunner = {
    markStepAsRunning: jest.fn(),
    markStepAsSucceeded: jest.fn(),
    markStepAsFailed: jest.fn(),
  };

  const httpExecutor = {
    execute: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    workflowRunner.markRunAsSucceeded.mockResolvedValue({
      id: "run-1",
      status: "SUCCEEDED",
    });

    orchestrator = new WorkflowOrchestratorService(
      prisma as unknown as PrismaService,
      workflowRunner as unknown as WorkflowRunnerService,
      stepRunner as unknown as StepRunnerService,
      httpExecutor as unknown as HttpActionExecutorService,
    );
  });

  it("executes trigger and HTTP action successfully", async () => {
    prisma.stepRun.findMany.mockResolvedValue([trigger, action]);

    httpExecutor.execute.mockResolvedValue({
      statusCode: 200,
      body: '{"ok":true}',
    });

    const result = await orchestrator.execute("run-1");

    expect(result.status).toBe("SUCCEEDED");

    expect(stepRunner.markStepAsSucceeded).toHaveBeenCalledWith("step-1", {
      triggered: true,
      mode: "MANUAL",
    });

    expect(stepRunner.markStepAsSucceeded).toHaveBeenCalledWith("step-2", {
      statusCode: 200,
      body: '{"ok":true}',
    });

    expect(workflowRunner.markRunAsSucceeded).toHaveBeenCalledWith("run-1");

    expect(workflowRunner.markRunAsFailed).not.toHaveBeenCalled();
  });

  it("marks step and workflow as failed on HTTP error", async () => {
    prisma.stepRun.findMany.mockResolvedValue([trigger, action]);

    httpExecutor.execute.mockRejectedValue(new Error("Network unavailable"));

    await expect(orchestrator.execute("run-1")).rejects.toThrow(
      "Network unavailable",
    );

    expect(stepRunner.markStepAsFailed).toHaveBeenCalledWith(
      "step-2",
      "Network unavailable",
    );

    expect(workflowRunner.markRunAsFailed).toHaveBeenCalledWith("run-1");

    expect(workflowRunner.markRunAsSucceeded).not.toHaveBeenCalled();
  });

  it("stops executing subsequent steps after a failure", async () => {
    prisma.stepRun.findMany.mockResolvedValue([trigger, action, nextAction]);

    httpExecutor.execute.mockResolvedValue({
      statusCode: 500,
      body: "Internal Server Error",
    });

    await expect(orchestrator.execute("run-1")).rejects.toThrow(
      "HTTP request failed with status 500",
    );

    expect(stepRunner.markStepAsRunning).not.toHaveBeenCalledWith("step-3");

    expect(httpExecutor.execute).toHaveBeenCalledTimes(1);

    expect(stepRunner.markStepAsFailed).toHaveBeenCalledWith(
      "step-2",
      "HTTP request failed with status 500",
    );

    expect(workflowRunner.markRunAsFailed).toHaveBeenCalledWith("run-1");
  });
});
