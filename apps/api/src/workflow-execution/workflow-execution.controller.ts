import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkflowExecutionService } from "./workflow-execution.service";
import { WorkflowOrchestratorService } from "./workflow-orchestrator.service";

type AuthenticatedRequest = {
  user: { id: string };
};

@ApiTags("Workflow Executions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("workspaces/:workspaceId/workflows/:workflowId/runs")
export class WorkflowExecutionController {
  constructor(
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly orchestrator: WorkflowOrchestratorService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List recent workflow runs" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({
    status: 200,
    description: "The 20 most recent workflow runs",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @ApiResponse({
    status: 404,
    description: "Workspace or workflow not found",
  })
  async listRuns(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
  ) {
    return this.workflowExecutionService.listRuns(
      request.user.id,
      workspaceId,
      workflowId,
    );
  }

  @Get(":runId")
  @ApiOperation({ summary: "Get workflow run details and step results" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiParam({ name: "runId", type: String })
  @ApiResponse({
    status: 200,
    description: "Workflow run details with ordered step results",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @ApiResponse({
    status: 404,
    description: "Workflow run not found or access denied",
  })
  async getRun(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Param("runId") runId: string,
  ) {
    return this.workflowExecutionService.getRun(
      request.user.id,
      workspaceId,
      workflowId,
      runId,
    );
  }

  @Post()
  @ApiOperation({ summary: "Start a workflow run" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({
    status: 201,
    description: "Workflow run created with pending step snapshots",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid workflow structure",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @ApiResponse({
    status: 403,
    description: "Insufficient workspace permissions",
  })
  @ApiResponse({
    status: 404,
    description: "Workspace or workflow not found",
  })
  async startRun(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
  ) {
    const run = await this.workflowExecutionService.startRun(
      request.user.id,
      workspaceId,
      workflowId,
    );

    try {
      return await this.orchestrator.execute(run.id);
    } catch (error) {
      // The orchestrator persists the failure before throwing.
      // Return the run ID so its execution can be inspected.
      return {
        runId: run.id,
        status: "FAILED",
        error:
          error instanceof Error ? error.message : "Workflow execution failed",
      };
    }
  }
}
