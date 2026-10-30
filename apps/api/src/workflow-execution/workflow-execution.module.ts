import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkspaceModule } from "../workspace/workspace.module";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { WorkflowExecutionController } from "./workflow-execution.controller";

@Module({
  imports: [JwtModule.register({}), WorkspaceModule],
  providers: [WorkflowExecutionService, JwtAuthGuard],
  controllers: [WorkflowExecutionController],
})
export class WorkflowExecutionModule {}
