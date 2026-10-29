import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

describe("AuthService", () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const signAsync = jest.fn();
  let service: AuthService;

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
    signAsync.mockReset();

    const prismaMock = {
      user: {
        create,
        findUnique,
      },
    } as unknown as PrismaService;

    const jwtMock = {
      signAsync,
    } as unknown as JwtService;

    const configMock = {
      get: jest.fn().mockReturnValue("test-secret-at-least-32-characters-long"),
    } as unknown as ConfigService;

    service = new AuthService(prismaMock, jwtMock, configMock);
  });

  const input = {
    email: "mahdi.test@example.com",
    password: "FlowForge2026!Secure",
    name: "Mahdi Test",
  };

  it("hashes the password and returns a public user", async () => {
    const createdAt = new Date("2026-10-29T12:00:00.000Z");

    create.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: input.email,
      name: input.name,
      createdAt,
    });

    const result = await service.register(input);

    expect(result.email).toBe(input.email);
    expect(result.name).toBe(input.name);
    expect(result.createdAt).toBe(createdAt.toISOString());

    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");

    const args = create.mock.calls[0][0];
    const hash = args.data.passwordHash as string;

    expect(hash).not.toBe(input.password);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(hash, input.password)).toBe(true);

    expect(args.select.passwordHash).toBeUndefined();
  });

  it("returns 409 when the email already exists", async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.19.3",
      },
    );

    create.mockRejectedValue(error);

    await expect(service.register(input)).rejects.toThrow(ConflictException);
  });

  it("propagates unexpected database errors", async () => {
    create.mockRejectedValue(new Error("Database unavailable"));

    await expect(service.register(input)).rejects.toThrow(
      "Database unavailable",
    );
  });

  describe("login", () => {
    const loginInput = {
      email: "mahdi.test@example.com",
      password: "FlowForge2026!Secure",
    };

    const userId = "550e8400-e29b-41d4-a716-446655440000";

    it("returns a JWT and public user for valid credentials", async () => {
      const passwordHash = await argon2.hash(loginInput.password);

      findUnique.mockResolvedValue({
        id: userId,
        email: loginInput.email,
        name: "Mahdi Test",
        passwordHash,
        createdAt: new Date("2026-10-29T12:00:00.000Z"),
      });

      signAsync.mockResolvedValue("test.jwt.token");

      const result = await service.login(loginInput);

      expect(result.accessToken).toBe("test.jwt.token");
      expect(result.tokenType).toBe("Bearer");
      expect(result.expiresIn).toBe(900);

      expect(result.user.id).toBe(userId);
      expect(result.user.email).toBe(loginInput.email);
      expect(result.user).not.toHaveProperty("passwordHash");

      expect(signAsync).toHaveBeenCalledWith(
        { sub: userId },
        expect.objectContaining({
          algorithm: "HS256",
          expiresIn: 900,
        }),
      );
    });

    it("rejects an incorrect password", async () => {
      const passwordHash = await argon2.hash("CorrectPassword2026!");

      findUnique.mockResolvedValue({
        id: userId,
        email: loginInput.email,
        name: "Mahdi Test",
        passwordHash,
        createdAt: new Date(),
      });

      await expect(service.login(loginInput)).rejects.toThrow(
        "Invalid email or password",
      );

      expect(signAsync).not.toHaveBeenCalled();
    });

    it("rejects an unknown email", async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow(
        "Invalid email or password",
      );

      expect(signAsync).not.toHaveBeenCalled();
    });

    it("rejects an account without a password", async () => {
      findUnique.mockResolvedValue({
        id: userId,
        email: loginInput.email,
        name: null,
        passwordHash: null,
        createdAt: new Date(),
      });

      await expect(service.login(loginInput)).rejects.toThrow(
        "Invalid email or password",
      );

      expect(signAsync).not.toHaveBeenCalled();
    });
  });
});
