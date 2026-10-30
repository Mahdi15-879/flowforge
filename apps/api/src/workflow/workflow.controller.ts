import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Delete,
  HttpCode,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  CreateWorkflowRequestSchema,
  UpdateWorkflowRequestSchema,
} from "@flowforge/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkflowService } from "./workflow.service";

type AuthenticatedRequest = {
  user: { id: string };
};

@ApiTags("Workflows")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("workspaces/:workspaceId/workflows")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: "Create a workflow" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", example: "Daily Report" },
        description: {
          type: "string",
          nullable: true,
          example: "Generate a daily report",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Workflow created" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Workspace not found" })
  async create(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateWorkflowRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.workflowService.create(
      request.user.id,
      workspaceId,
      parsed.data,
    );
  }

  @Get()
  @ApiOperation({ summary: "List workspace workflows" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiResponse({ status: 200, description: "Workflow list" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Workspace not found" })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workflowService.findAll(request.user.id, workspaceId);
  }

  @Get(":workflowId")
  @ApiOperation({ summary: "Get workflow details" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({ status: 200, description: "Workflow details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Workflow not found" })
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
  ) {
    return this.workflowService.findOne(
      request.user.id,
      workspaceId,
      workflowId,
    );
  }

  @Patch(":workflowId")
  @ApiOperation({ summary: "Update a workflow" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", example: "Updated Report" },
        description: {
          type: "string",
          nullable: true,
          example: "Updated description",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Workflow updated" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Workflow not found" })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateWorkflowRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.workflowService.update(
      request.user.id,
      workspaceId,
      workflowId,
      parsed.data,
    );
  }

  @Delete(":workflowId")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a workflow" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({
    status: 204,
    description: "Workflow deleted successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @ApiResponse({
    status: 403,
    description: "Insufficient permissions",
  })
  @ApiResponse({
    status: 404,
    description: "Workflow not found",
  })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
  ): Promise<void> {
    await this.workflowService.remove(request.user.id, workspaceId, workflowId);
  }
}
