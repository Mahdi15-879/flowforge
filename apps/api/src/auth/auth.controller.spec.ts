import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController (HTTP)", () => {
  let app: INestApplication;
  const register = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { register },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  beforeEach(() => {
    register.mockReset();
  });

  afterAll(async () => {
    await app?.close();
  });

  const validInput = {
    email: "Mahdi.Test@Example.com",
    password: "FlowForge2026!Secure",
    name: "Mahdi Test",
  };

  it("returns 201 for valid registration data", async () => {
    register.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "mahdi.test@example.com",
      name: "Mahdi Test",
      createdAt: "2026-10-29T12:00:00.000Z",
    });

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(validInput)
      .expect(201);

    expect(response.body.email).toBe("mahdi.test@example.com");
    expect(response.body).not.toHaveProperty("passwordHash");

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "mahdi.test@example.com",
      }),
    );
  });

  it("returns 400 for a short password", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        ...validInput,
        password: "12345",
      })
      .expect(400);

    expect(register).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        ...validInput,
        email: "not-an-email",
      })
      .expect(400);

    expect(register).not.toHaveBeenCalled();
  });

  it("returns 400 for unexpected input fields", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        ...validInput,
        role: "ADMIN",
      })
      .expect(400);

    expect(register).not.toHaveBeenCalled();
  });
});
