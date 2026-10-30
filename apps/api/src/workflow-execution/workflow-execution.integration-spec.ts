import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { WorkspaceAccessService } from "../workspace/workspace-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { assertIntegrationDatabase } from "./integration-db.guard";

describe("WorkflowExecutionService — PostgreSQL integration", () => {
  const prisma = new PrismaService();

  const workspaceAccess = new WorkspaceAccessService(prisma);
  const service = new WorkflowExecutionService(prisma, workspaceAccess);

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
});
