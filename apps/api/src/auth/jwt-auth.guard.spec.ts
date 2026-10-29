import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  const verifyAsync = jest.fn();

  const jwtMock = {
    verifyAsync,
  } as unknown as JwtService;

  const configMock = {
    get: jest.fn().mockReturnValue("test-secret-at-least-32-characters-long"),
  } as unknown as ConfigService;

  const guard = new JwtAuthGuard(jwtMock, configMock);

  function createContext(authorization?: string) {
    const request = {
      headers: authorization ? { authorization } : {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  beforeEach(() => {
    verifyAsync.mockReset();
  });

  it("rejects requests without a token", async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it("rejects malformed authorization headers", async () => {
    const { context } = createContext("Basic invalid-token");

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it("accepts a valid JWT and attaches the user", async () => {
    const { context, request } = createContext("Bearer valid.jwt.token");

    verifyAsync.mockResolvedValue({
      sub: "550e8400-e29b-41d4-a716-446655440000",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(verifyAsync).toHaveBeenCalledWith(
      "valid.jwt.token",
      expect.objectContaining({
        algorithms: ["HS256"],
      }),
    );

    expect(request).toHaveProperty("user", {
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("rejects invalid or expired JWTs", async () => {
    const { context } = createContext("Bearer expired.jwt.token");

    verifyAsync.mockRejectedValue(new Error("jwt expired"));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects tokens without a valid subject", async () => {
    const { context } = createContext("Bearer missing.subject.token");

    verifyAsync.mockResolvedValue({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
