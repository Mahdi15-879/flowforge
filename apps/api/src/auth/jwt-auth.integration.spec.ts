import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JWT signature integration", () => {
  const secret = "integration-test-secret-at-least-32-characters";
  const jwt = new JwtService();

  const config = {
    get: jest.fn().mockReturnValue(secret),
  } as unknown as ConfigService;

  const guard = new JwtAuthGuard(jwt, config);

  function contextFor(token: string) {
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it("accepts a correctly signed JWT", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";

    const token = await jwt.signAsync(
      { sub: userId },
      {
        secret,
        algorithm: "HS256",
        expiresIn: 900,
      },
    );

    const { context, request } = contextFor(token);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty("user", { id: userId });
  });

  it("rejects a JWT signed with another secret", async () => {
    const token = await jwt.signAsync(
      { sub: "test-user" },
      {
        secret: "another-secret-at-least-32-characters-long",
        algorithm: "HS256",
        expiresIn: 900,
      },
    );

    const { context } = contextFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects an expired JWT", async () => {
    const token = await jwt.signAsync(
      { sub: "test-user" },
      {
        secret,
        algorithm: "HS256",
        expiresIn: -1,
      },
    );

    const { context } = contextFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects a JWT signed with the wrong algorithm", async () => {
    const token = await jwt.signAsync(
      { sub: "test-user" },
      {
        secret,
        algorithm: "HS384",
        expiresIn: 900,
      },
    );

    const { context } = contextFor(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
