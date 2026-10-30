import {
  INestApplication,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import request from "supertest";
import { WorkflowExecutionController } from "./workflow-execution.controller";
import { WorkflowExecutionService } from "./workflow-execution.service";

describe("WorkflowExecution HTTP", () => {
  let app: INestApplication;

  const executionService = {
    startRun: jest.fn(),
  };

  const testJwtSecret = "flowforge-http-test-secret-2026-minimum-32-characters";

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: testJwtSecret,
            }),
          ],
        }),
        JwtModule.register({}),
      ],
      controllers: [WorkflowExecutionController],
      providers: [
        {
          provide: WorkflowExecutionService,
          useValue: executionService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when JWT is missing", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/workspaces/workspace-123/workflows/workflow-123/runs")
      .expect(401);

    expect(executionService.startRun).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated user lacks permission", async () => {
    const jwt = app.get(JwtService);

    const token = await jwt.signAsync(
      { sub: "member-user-123" },
      {
        secret: testJwtSecret,
        algorithm: "HS256",
        expiresIn: "15m",
      },
    );

    executionService.startRun.mockRejectedValue(
      new ForbiddenException("Insufficient workspace permissions"),
    );

    await request(app.getHttpServer())
      .post("/api/v1/workspaces/workspace-123/workflows/workflow-123/runs")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(executionService.startRun).toHaveBeenCalledWith(
      "member-user-123",
      "workspace-123",
      "workflow-123",
    );
  });

  it("returns 404 when workflow is not found", async () => {
    const jwt = app.get(JwtService);

    const token = await jwt.signAsync(
      { sub: "owner-user-123" },
      {
        secret: testJwtSecret,
        algorithm: "HS256",
        expiresIn: "15m",
      },
    );

    executionService.startRun.mockRejectedValue(
      new NotFoundException("Workflow not found"),
    );

    await request(app.getHttpServer())
      .post("/api/v1/workspaces/workspace-123/workflows/missing-workflow/runs")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(executionService.startRun).toHaveBeenCalledWith(
      "owner-user-123",
      "workspace-123",
      "missing-workflow",
    );
  });

  it("returns 201 when a workflow run is created", async () => {
    const jwt = app.get(JwtService);

    const token = await jwt.signAsync(
      { sub: "owner-user-123" },
      {
        secret: testJwtSecret,
        algorithm: "HS256",
        expiresIn: "15m",
      },
    );

    const expectedRun = {
      id: "run-123",
      workflowId: "workflow-123",
      status: "PENDING",
      stepRuns: [
        {
          id: "step-run-123",
          stepName: "Daily Schedule",
          stepType: "TRIGGER",
          position: 0,
          status: "PENDING",
        },
      ],
    };

    executionService.startRun.mockResolvedValue(expectedRun);

    const response = await request(app.getHttpServer())
      .post("/api/v1/workspaces/workspace-123/workflows/workflow-123/runs")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(response.body).toEqual(expectedRun);

    expect(executionService.startRun).toHaveBeenCalledWith(
      "owner-user-123",
      "workspace-123",
      "workflow-123",
    );

    expect(executionService.startRun).toHaveBeenCalledTimes(1);
  });
});
