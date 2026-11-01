import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowExecutionController } from "./workflow-execution.controller";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { WorkflowOrchestratorService } from "./workflow-orchestrator.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

describe("WorkflowExecutionController", () => {
  let controller: WorkflowExecutionController;

  const executionService = {
    startRun: jest.fn(),
  };

  const orchestrator = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowExecutionController],
      providers: [
        {
          provide: WorkflowExecutionService,
          useValue: executionService,
        },
        {
          provide: WorkflowOrchestratorService,
          useValue: orchestrator,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<WorkflowExecutionController>(
      WorkflowExecutionController,
    );
  });

  it("creates and executes a workflow run for the authenticated user", async () => {
    const request = {
      user: { id: "user-123" },
    };

    const workspaceId = "workspace-123";
    const workflowId = "workflow-123";

    const pendingRun = {
      id: "run-123",
      workflowId,
      status: "PENDING",
      stepRuns: [],
    };

    const completedRun = {
      id: "run-123",
      workflowId,
      status: "SUCCEEDED",
    };

    executionService.startRun.mockResolvedValue(pendingRun);
    orchestrator.execute.mockResolvedValue(completedRun);

    const result = await controller.startRun(request, workspaceId, workflowId);

    expect(executionService.startRun).toHaveBeenCalledWith(
      "user-123",
      workspaceId,
      workflowId,
    );

    expect(orchestrator.execute).toHaveBeenCalledWith("run-123");
    expect(orchestrator.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(completedRun);
  });
});
