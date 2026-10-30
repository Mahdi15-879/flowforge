import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkflowStepController } from "./workflow-step.controller";
import { WorkflowStepService } from "./workflow-step.service";

describe("WorkflowStepController", () => {
  let controller: WorkflowStepController;

  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";
  const workflowId = "33333333-3333-4333-8333-333333333333";
  const stepId = "44444444-4444-4444-8444-444444444444";

  const request = {
    user: { id: userId },
  };

  const step = {
    id: stepId,
    workflowId,
    name: "Daily Trigger",
    type: "TRIGGER",
    position: 0,
    config: { enabled: true },
    createdAt: "2026-10-30T08:00:00.000Z",
    updatedAt: "2026-10-30T08:00:00.000Z",
  };

  const workflowStepService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowStepController],
      providers: [
        {
          provide: WorkflowStepService,
          useValue: workflowStepService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<WorkflowStepController>(WorkflowStepController);
  });

  it("creates a step with valid input", async () => {
    workflowStepService.create.mockResolvedValue(step);

    const body = {
      name: "Daily Trigger",
      type: "TRIGGER",
      position: 0,
      config: { enabled: true },
    };

    const result = await controller.create(
      request,
      workspaceId,
      workflowId,
      body,
    );

    expect(workflowStepService.create).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      body,
    );

    expect(result.id).toBe(stepId);
    expect(result.name).toBe("Daily Trigger");
  });

  it("rejects a negative step position", async () => {
    await expect(
      controller.create(request, workspaceId, workflowId, {
        name: "Invalid Step",
        type: "ACTION",
        position: -1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.create).not.toHaveBeenCalled();
  });

  it("rejects an empty step name", async () => {
    await expect(
      controller.create(request, workspaceId, workflowId, {
        name: "   ",
        type: "ACTION",
        position: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.create).not.toHaveBeenCalled();
  });

  it("rejects unknown fields in create input", async () => {
    await expect(
      controller.create(request, workspaceId, workflowId, {
        name: "Valid Step",
        type: "ACTION",
        position: 0,
        unexpectedField: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.create).not.toHaveBeenCalled();
  });

  it("lists workflow steps for the authenticated user", async () => {
    workflowStepService.findAll.mockResolvedValue([step]);

    const result = await controller.findAll(request, workspaceId, workflowId);

    expect(workflowStepService.findAll).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(stepId);
  });

  it("retrieves a single workflow step", async () => {
    workflowStepService.findOne.mockResolvedValue(step);

    const result = await controller.findOne(
      request,
      workspaceId,
      workflowId,
      stepId,
    );

    expect(workflowStepService.findOne).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      stepId,
    );

    expect(result.id).toBe(stepId);
    expect(result.name).toBe("Daily Trigger");
  });

  it("updates a step with valid input", async () => {
    const updatedStep = {
      ...step,
      name: "Updated Trigger",
    };

    workflowStepService.update.mockResolvedValue(updatedStep);

    const body = {
      name: "Updated Trigger",
    };

    const result = await controller.update(
      request,
      workspaceId,
      workflowId,
      stepId,
      body,
    );

    expect(workflowStepService.update).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      stepId,
      body,
    );

    expect(result.name).toBe("Updated Trigger");
  });

  it("rejects an empty update body", async () => {
    await expect(
      controller.update(request, workspaceId, workflowId, stepId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.update).not.toHaveBeenCalled();
  });

  it("rejects changing a step position through update", async () => {
    await expect(
      controller.update(request, workspaceId, workflowId, stepId, {
        position: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.update).not.toHaveBeenCalled();
  });

  it("deletes a workflow step for the authenticated user", async () => {
    workflowStepService.remove.mockResolvedValue(undefined);

    const result = await controller.remove(
      request,
      workspaceId,
      workflowId,
      stepId,
    );

    expect(workflowStepService.remove).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      stepId,
    );

    expect(result).toBeUndefined();
    expect(workflowStepService.remove).toHaveBeenCalledTimes(1);
  });

  it("reorders workflow steps with valid IDs", async () => {
    const secondStepId = "55555555-5555-4555-8555-555555555555";

    const body = {
      stepIds: [secondStepId, stepId],
    };

    const reorderedSteps = [
      {
        ...step,
        id: secondStepId,
        name: "Send Email",
        type: "ACTION",
        position: 0,
      },
      {
        ...step,
        position: 1,
      },
    ];

    workflowStepService.reorder.mockResolvedValue(reorderedSteps);

    const result = await controller.reorder(
      request,
      workspaceId,
      workflowId,
      body,
    );

    expect(workflowStepService.reorder).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      body,
    );

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(secondStepId);
    expect(result[0].position).toBe(0);
    expect(result[1].id).toBe(stepId);
    expect(result[1].position).toBe(1);
  });

  it("rejects duplicate step IDs in reorder input", async () => {
    await expect(
      controller.reorder(request, workspaceId, workflowId, {
        stepIds: [stepId, stepId],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.reorder).not.toHaveBeenCalled();
  });

  it("rejects invalid UUIDs in reorder input", async () => {
    await expect(
      controller.reorder(request, workspaceId, workflowId, {
        stepIds: ["invalid-step-id"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowStepService.reorder).not.toHaveBeenCalled();
  });
});
