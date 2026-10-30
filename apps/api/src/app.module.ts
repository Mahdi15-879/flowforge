import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { WorkflowStepModule } from "./workflow-step/workflow-step.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    AuthModule,
    WorkspaceModule,
    WorkflowModule,
    WorkflowStepModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
