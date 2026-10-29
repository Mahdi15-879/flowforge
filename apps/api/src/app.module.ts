import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "./prisma/prisma.module";
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  imports: [PrismaModule],
})
export class AppModule {}
