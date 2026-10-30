import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

describe("WorkflowController", () => {
  let controller: WorkflowController;

  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";
  const workflowId = "33333333-3333-4333-8333-333333333333";

  const request = { user: { id: userId } };

  const workflow = {
    id: workflowId,
    name: "Daily Report",
    description: "Daily sales report",
    workspaceId,
    createdAt: "2026-10-30T08:00:00.000Z",
    updatedAt: "2026-10-30T08:00:00.000Z",
  };

  const workflowService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: workflowService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<WorkflowController>(WorkflowController);
  });

  it("creates a workflow with valid input", async () => {
    workflowService.create.mockResolvedValue(workflow);

    const result = await controller.create(request, workspaceId, {
      name: "  Daily Report  ",
      description: "Daily sales report",
    });

    expect(workflowService.create).toHaveBeenCalledWith(userId, workspaceId, {
      name: "Daily Report",
      description: "Daily sales report",
    });

    expect(result).toEqual(workflow);
  });

  it("rejects a workflow name that is too short", async () => {
    await expect(
      controller.create(request, workspaceId, {
        name: "A",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowService.create).not.toHaveBeenCalled();
  });

  it("rejects extra fields during creation", async () => {
    await expect(
      controller.create(request, workspaceId, {
        name: "Daily Report",
        workspaceId: "another-workspace",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowService.create).not.toHaveBeenCalled();
  });

  it("rejects a description longer than 1000 characters", async () => {
    await expect(
      controller.create(request, workspaceId, {
        name: "Daily Report",
        description: "x".repeat(1001),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists workflows for the authenticated user", async () => {
    workflowService.findAll.mockResolvedValue([workflow]);

    const result = await controller.findAll(request, workspaceId);

    expect(workflowService.findAll).toHaveBeenCalledWith(userId, workspaceId);

    expect(result).toEqual([workflow]);
  });

  it("gets one workflow using both identifiers", async () => {
    workflowService.findOne.mockResolvedValue(workflow);

    const result = await controller.findOne(request, workspaceId, workflowId);

    expect(workflowService.findOne).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
    );

    expect(result).toEqual(workflow);
  });

  it("updates a workflow with valid input", async () => {
    workflowService.update.mockResolvedValue({
      ...workflow,
      name: "Updated Report",
    });

    const result = await controller.update(request, workspaceId, workflowId, {
      name: "  Updated Report  ",
    });

    expect(workflowService.update).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      { name: "Updated Report" },
    );

    expect(result.name).toBe("Updated Report");
  });

  it("rejects an empty update body", async () => {
    await expect(
      controller.update(request, workspaceId, workflowId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowService.update).not.toHaveBeenCalled();
  });

  it("rejects unauthorized fields during update", async () => {
    await expect(
      controller.update(request, workspaceId, workflowId, {
        name: "Updated Report",
        role: "OWNER",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workflowService.update).not.toHaveBeenCalled();
  });

  it("allows clearing a workflow description", async () => {
    workflowService.update.mockResolvedValue({
      ...workflow,
      description: null,
    });

    const result = await controller.update(request, workspaceId, workflowId, {
      description: null,
    });

    expect(workflowService.update).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
      { description: null },
    );

    expect(result.description).toBeNull();
  });

  it("deletes a workflow using both identifiers", async () => {
    workflowService.remove.mockResolvedValue(undefined);

    await expect(
      controller.remove(request, workspaceId, workflowId),
    ).resolves.toBeUndefined();

    expect(workflowService.remove).toHaveBeenCalledWith(
      userId,
      workspaceId,
      workflowId,
    );
  });

  it("propagates forbidden errors from the service", async () => {
    workflowService.remove.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.remove(request, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("propagates not-found errors from the service", async () => {
    workflowService.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      controller.findOne(request, workspaceId, workflowId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
