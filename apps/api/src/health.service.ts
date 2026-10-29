import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  HealthResponseSchema,
  type HealthResponse,
} from "@flowforge/contracts";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthResponse {
    return HealthResponseSchema.parse({
      status: "ok",
      service: "flowforge-api",
      timestamp: new Date().toISOString(),
    });
  }

  async getDatabaseHealth(): Promise<{
    status: string;
    database: string;
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        database: "connected",
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "disconnected",
      });
    }
  }
}
