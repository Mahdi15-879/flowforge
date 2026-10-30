import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkspaceModule } from "../workspace/workspace.module";
import { WorkflowStepController } from "./workflow-step.controller";
import { WorkflowStepService } from "./workflow-step.service";

@Module({
  imports: [JwtModule.register({}), WorkspaceModule],
  controllers: [WorkflowStepController],
  providers: [WorkflowStepService, JwtAuthGuard],
})
export class WorkflowStepModule {}
