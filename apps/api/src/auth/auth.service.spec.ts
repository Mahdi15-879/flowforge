import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  const create = jest.fn();
  let service: AuthService;

  beforeEach(() => {
    create.mockReset();

    const prismaMock = {
      user: { create },
    } as unknown as PrismaService;

    service = new AuthService(prismaMock);
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
});
