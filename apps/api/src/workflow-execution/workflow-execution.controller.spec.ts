import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowExecutionController } from "./workflow-execution.controller";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

describe("WorkflowExecutionController", () => {
  let controller: WorkflowExecutionController;

  const executionService = {
    startRun: jest.fn(),
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

  it("starts a workflow run for the authenticated user", async () => {
    const request = {
      user: { id: "user-123" },
    };

    const workspaceId = "workspace-123";
    const workflowId = "workflow-123";

    const expectedRun = {
      id: "run-123",
      workflowId,
      status: "PENDING",
      stepRuns: [],
    };

    executionService.startRun.mockResolvedValue(expectedRun);

    const result = await controller.startRun(request, workspaceId, workflowId);

    expect(executionService.startRun).toHaveBeenCalledWith(
      "user-123",
      workspaceId,
      workflowId,
    );

    expect(executionService.startRun).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedRun);
  });
});
