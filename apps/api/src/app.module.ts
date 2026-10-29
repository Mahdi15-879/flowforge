import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
