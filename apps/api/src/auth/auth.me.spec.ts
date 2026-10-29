import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("GET /auth/me (HTTP)", () => {
  let app: INestApplication;

  const verifyAsync = jest.fn();
  const getMe = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        JwtAuthGuard,
        {
          provide: AuthService,
          useValue: { getMe },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue("test-secret-at-least-32-characters-long"),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => {
    verifyAsync.mockReset();
    getMe.mockReset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("returns 401 without a token", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);

    expect(getMe).not.toHaveBeenCalled();
  });

  it("returns 200 with a valid token", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    verifyAsync.mockResolvedValue({ sub: userId });

    getMe.mockResolvedValue({
      id: userId,
      email: "mahdi.test@example.com",
      name: "Mahdi Test",
      createdAt: "2026-10-29T12:00:00.000Z",
    });

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid.jwt.token")
      .expect(200);

    expect(response.body.email).toBe("mahdi.test@example.com");

    expect(response.body).not.toHaveProperty("passwordHash");

    expect(getMe).toHaveBeenCalledWith(userId);
  });

  it("returns 401 with an invalid token", async () => {
    verifyAsync.mockRejectedValue(new Error("invalid signature"));

    await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token")
      .expect(401);

    expect(getMe).not.toHaveBeenCalled();
  });
});
