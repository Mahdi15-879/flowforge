import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { assertIntegrationDatabase } from "./integration-db.guard";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { StepRunnerService } from "./step-runner.service";

describe("WorkflowExecutionService — PostgreSQL integration", () => {
  const prisma = new PrismaService();

  const workspaceAccess = new WorkspaceAccessService(prisma);
  const service = new WorkflowExecutionService(prisma, workspaceAccess);
  const runner = new WorkflowRunnerService(prisma);
  const stepRunner = new StepRunnerService(prisma);

  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Must pass before any test data is written.
    await assertIntegrationDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Only delete records created by this test.
    if (workspaceId) {
      await prisma.workspace.deleteMany({
        where: { id: workspaceId },
      });
    }

    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
  });

  it("creates a pending run with persisted step snapshots", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `integration-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Integration Test Workspace",
        slug: `integration-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Integration Test Workflow",
        workspaceId,
        steps: {
          create: [
            {
              name: "Start",
              type: "TRIGGER",
              position: 0,
              config: {},
            },
            {
              name: "HTTP Action",
              type: "ACTION",
              position: 1,
              config: {
                operation: "HTTP_REQUEST",
                url: "https://example.com",
                method: "GET",
              },
            },
          ],
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    expect(run.status).toBe("PENDING");
    expect(run.stepRuns).toHaveLength(2);

    const persisted = await prisma.workflowRun.findUnique({
      where: { id: run.id },
      include: {
        stepRuns: {
          orderBy: { position: "asc" },
        },
      },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe("PENDING");

    expect(
      persisted?.stepRuns.map((step) => ({
        name: step.stepName,
        type: step.stepType,
        position: step.position,
        status: step.status,
      })),
    ).toEqual([
      {
        name: "Start",
        type: "TRIGGER",
        position: 0,
        status: "PENDING",
      },
      {
        name: "HTTP Action",
        type: "ACTION",
        position: 1,
        status: "PENDING",
      },
    ]);

    expect(persisted?.stepRuns[1].config).toEqual({
      operation: "HTTP_REQUEST",
      url: "https://example.com",
      method: "GET",
    });
  });

  it("rolls back the transaction when step positions conflict", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `rollback-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Rollback Test Workspace",
        slug: `rollback-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Rollback Test Workflow",
        workspaceId,
      },
    });

    const runsBefore = await prisma.workflowRun.count({
      where: { workflowId: workflow.id },
    });

    await expect(
      prisma.$transaction(async (tx) => {
        return tx.workflowRun.create({
          data: {
            workflowId: workflow.id,
            status: "PENDING",
            stepRuns: {
              create: [
                {
                  stepName: "Trigger",
                  stepType: "TRIGGER",
                  position: 0,
                  config: {},
                },
                {
                  stepName: "Conflicting Action",
                  stepType: "ACTION",
                  position: 0,
                  config: {},
                },
              ],
            },
          },
        });
      }),
    ).rejects.toThrow();

    const runsAfter = await prisma.workflowRun.count({
      where: { workflowId: workflow.id },
    });

    expect(runsAfter).toBe(runsBefore);
  });

  it("forbids MEMBER from starting a workflow", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `member-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Member RBAC Test",
        slug: `member-rbac-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "MEMBER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Member Access Test Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    await expect(
      service.startRun(userId, workspaceId, workflow.id),
    ).rejects.toMatchObject({
      status: 403,
    });

    const runCount = await prisma.workflowRun.count({
      where: { workflowId: workflow.id },
    });

    expect(runCount).toBe(0);
  });

  it("returns 404 for a user outside the workspace", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `nonmember-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Nonmember RBAC Test",
        slug: `nonmember-rbac-${suffix}`,
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Private Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    await expect(
      service.startRun(userId, workspaceId, workflow.id),
    ).rejects.toMatchObject({
      status: 404,
    });

    const runCount = await prisma.workflowRun.count({
      where: { workflowId: workflow.id },
    });

    expect(runCount).toBe(0);
  });

  it("allows ADMIN to start a workflow", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `admin-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Admin RBAC Test",
        slug: `admin-rbac-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Admin Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    expect(run.status).toBe("PENDING");
    expect(run.stepRuns).toHaveLength(1);

    const persistedRun = await prisma.workflowRun.findUnique({
      where: { id: run.id },
    });

    expect(persistedRun?.workflowId).toBe(workflow.id);
    expect(persistedRun?.status).toBe("PENDING");
  });

  it("atomically starts a pending run and rejects a second start", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `runner-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Runner Integration Test",
        slug: `runner-test-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Runner Test Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    expect(run.status).toBe("PENDING");

    const startedRun = await runner.markRunAsRunning(run.id);

    expect(startedRun.status).toBe("RUNNING");
    expect(startedRun.startedAt).toBeInstanceOf(Date);

    const persistedRun = await prisma.workflowRun.findUniqueOrThrow({
      where: { id: run.id },
    });

    expect(persistedRun.status).toBe("RUNNING");
    expect(persistedRun.startedAt).not.toBeNull();

    await expect(runner.markRunAsRunning(run.id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("allows only one concurrent start for the same run", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `concurrent-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Concurrency Test",
        slug: `concurrency-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Concurrent Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    const results = await Promise.allSettled([
      runner.markRunAsRunning(run.id),
      runner.markRunAsRunning(run.id),
    ]);

    const succeeded = results.filter((result) => result.status === "fulfilled");

    const rejected = results.filter((result) => result.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    expect(rejected[0]).toMatchObject({
      status: "rejected",
      reason: {
        status: 409,
      },
    });

    const persistedRun = await prisma.workflowRun.findUniqueOrThrow({
      where: { id: run.id },
    });

    expect(persistedRun.status).toBe("RUNNING");
    expect(persistedRun.startedAt).not.toBeNull();
  });

  it("persists successful run completion", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `completion-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Completion Integration Test",
        slug: `completion-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Completion Test Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    await runner.markRunAsRunning(run.id);

    const completedRun = await runner.markRunAsSucceeded(run.id);

    expect(completedRun.status).toBe("SUCCEEDED");
    expect(completedRun.finishedAt).toBeInstanceOf(Date);

    const persistedRun = await prisma.workflowRun.findUniqueOrThrow({
      where: { id: run.id },
    });

    expect(persistedRun.status).toBe("SUCCEEDED");
    expect(persistedRun.startedAt).not.toBeNull();
    expect(persistedRun.finishedAt).not.toBeNull();

    await expect(runner.markRunAsSucceeded(run.id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("persists failed run completion", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `failure-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Failure Integration Test",
        slug: `failure-${suffix}`,
        memberships: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Failure Test Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    await runner.markRunAsRunning(run.id);

    const failedRun = await runner.markRunAsFailed(run.id);

    expect(failedRun.status).toBe("FAILED");
    expect(failedRun.finishedAt).toBeInstanceOf(Date);

    const persistedRun = await prisma.workflowRun.findUniqueOrThrow({
      where: { id: run.id },
    });

    expect(persistedRun.status).toBe("FAILED");
    expect(persistedRun.startedAt).not.toBeNull();
    expect(persistedRun.finishedAt).not.toBeNull();

    await expect(runner.markRunAsFailed(run.id)).rejects.toMatchObject({
      status: 409,
    });

    await expect(runner.markRunAsSucceeded(run.id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("persists step transition from PENDING to RUNNING", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `step-running-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Step Running Integration Test",
        slug: `step-running-${suffix}`,
        memberships: {
          create: { userId, role: "OWNER" },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Step Running Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    await runner.markRunAsRunning(run.id);

    const stepRunId = run.stepRuns[0].id;

    const runningStep = await stepRunner.markStepAsRunning(stepRunId);

    expect(runningStep.status).toBe("RUNNING");
    expect(runningStep.startedAt).toBeInstanceOf(Date);

    const persistedStep = await prisma.stepRun.findUniqueOrThrow({
      where: { id: stepRunId },
    });

    expect(persistedStep.status).toBe("RUNNING");
    expect(persistedStep.startedAt).not.toBeNull();
    expect(persistedStep.finishedAt).toBeNull();

    await expect(stepRunner.markStepAsRunning(stepRunId)).rejects.toMatchObject(
      { status: 409 },
    );
  });

  it("persists successful step completion with JSON output", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `step-success-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Step Success Integration Test",
        slug: `step-success-${suffix}`,
        memberships: {
          create: { userId, role: "OWNER" },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Step Success Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    await runner.markRunAsRunning(run.id);

    const stepRunId = run.stepRuns[0].id;

    await stepRunner.markStepAsRunning(stepRunId);

    const output = {
      statusCode: 200,
      message: "Step executed successfully",
      data: { count: 3 },
    };

    const succeededStep = await stepRunner.markStepAsSucceeded(
      stepRunId,
      output,
    );

    expect(succeededStep.status).toBe("SUCCEEDED");
    expect(succeededStep.output).toEqual(output);
    expect(succeededStep.finishedAt).toBeInstanceOf(Date);

    const persistedStep = await prisma.stepRun.findUniqueOrThrow({
      where: { id: stepRunId },
    });

    expect(persistedStep.status).toBe("SUCCEEDED");
    expect(persistedStep.output).toEqual(output);
    expect(persistedStep.startedAt).not.toBeNull();
    expect(persistedStep.finishedAt).not.toBeNull();
    expect(persistedStep.error).toBeNull();

    await expect(
      stepRunner.markStepAsSucceeded(stepRunId, output),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      stepRunner.markStepAsFailed(stepRunId, "Late failure"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("persists failed step completion with error message", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: `step-failure-${suffix}@example.test`,
      },
    });
    userId = user.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: "Step Failure Integration Test",
        slug: `step-failure-${suffix}`,
        memberships: {
          create: { userId, role: "OWNER" },
        },
      },
    });
    workspaceId = workspace.id;

    const workflow = await prisma.workflow.create({
      data: {
        name: "Step Failure Workflow",
        workspaceId,
        steps: {
          create: {
            name: "Start",
            type: "TRIGGER",
            position: 0,
            config: {},
          },
        },
      },
    });

    const run = await service.startRun(userId, workspaceId, workflow.id);

    await runner.markRunAsRunning(run.id);

    const stepRunId = run.stepRuns[0].id;

    await stepRunner.markStepAsRunning(stepRunId);

    const error = "HTTP request failed with status 500";

    const failedStep = await stepRunner.markStepAsFailed(stepRunId, error);

    expect(failedStep.status).toBe("FAILED");
    expect(failedStep.error).toBe(error);
    expect(failedStep.finishedAt).toBeInstanceOf(Date);

    const persistedStep = await prisma.stepRun.findUniqueOrThrow({
      where: { id: stepRunId },
    });

    expect(persistedStep.status).toBe("FAILED");
    expect(persistedStep.error).toBe(error);
    expect(persistedStep.output).toBeNull();
    expect(persistedStep.startedAt).not.toBeNull();
    expect(persistedStep.finishedAt).not.toBeNull();

    await expect(
      stepRunner.markStepAsFailed(stepRunId, error),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      stepRunner.markStepAsSucceeded(stepRunId, {}),
    ).rejects.toMatchObject({ status: 409 });
  });
});
