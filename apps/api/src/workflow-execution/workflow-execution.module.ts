import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkspaceModule } from "../workspace/workspace.module";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { WorkflowExecutionController } from "./workflow-execution.controller";
import { WorkflowRunnerService } from "./workflow-runner.service";
import { StepRunnerService } from "./step-runner.service";
import { WorkflowOrchestratorService } from "./workflow-orchestrator.service";

@Module({
  imports: [JwtModule.register({}), WorkspaceModule],
  providers: [
    WorkflowExecutionService,
    WorkflowRunnerService,
    StepRunnerService,
    WorkflowOrchestratorService,
    JwtAuthGuard,
  ],
  controllers: [WorkflowExecutionController],
})
export class WorkflowExecutionModule {}
