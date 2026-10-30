import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkspaceModule } from "../workspace/workspace.module";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [JwtModule.register({}), WorkspaceModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, JwtAuthGuard],
})
export class WorkflowModule {}
