import { Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkflowExecutionService } from "./workflow-execution.service";

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
  ) {}

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
    return this.workflowExecutionService.startRun(
      request.user.id,
      workspaceId,
      workflowId,
    );
  }
}
