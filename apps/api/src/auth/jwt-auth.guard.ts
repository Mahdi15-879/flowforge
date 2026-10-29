import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { getJwtSecret } from "./jwt.config";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException("Missing access token");
    }

    const [scheme, token, extra] = authorization.split(" ");

    if (scheme !== "Bearer" || !token || extra) {
      throw new UnauthorizedException("Invalid authorization header");
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
      }>(token, {
        secret: getJwtSecret(this.config),
        algorithms: ["HS256"],
      });

      if (!payload || typeof payload.sub !== "string" || !payload.sub) {
        throw new UnauthorizedException("Invalid access token");
      }

      request.user = { id: payload.sub };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
