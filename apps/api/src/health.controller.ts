import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Application liveness check" })
  getHealth() {
    return this.health.getHealth();
  }

  @Get("database")
  @ApiOperation({ summary: "PostgreSQL connectivity check" })
  getDatabaseHealth() {
    return this.health.getDatabaseHealth();
  }
}
