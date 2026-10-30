import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
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
  CreateWorkflowStepRequestSchema,
  ReorderWorkflowStepsRequestSchema,
  UpdateWorkflowStepRequestSchema,
} from "@flowforge/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkflowStepService } from "./workflow-step.service";

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@ApiTags("Workflow Steps")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("workspaces/:workspaceId/workflows/:workflowId/steps")
export class WorkflowStepController {
  constructor(private readonly workflowStepService: WorkflowStepService) {}

  @Post()
  @ApiOperation({ summary: "Create a workflow step" })
  @ApiBody({
    required: true,
    schema: {
      type: "object",
      required: ["name", "type", "position"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          example: "Schedule Trigger",
        },
        type: {
          type: "string",
          enum: ["TRIGGER", "ACTION"],
          example: "TRIGGER",
        },
        position: {
          type: "integer",
          minimum: 0,
          example: 0,
        },
        config: {
          type: "object",
          additionalProperties: true,
          example: {
            schedule: "0 9 * * *",
            timezone: "Europe/Berlin",
          },
        },
      },
    },
  })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({ status: 201, description: "Step created" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Workflow not found" })
  async create(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateWorkflowStepRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.workflowStepService.create(
      request.user.id,
      workspaceId,
      workflowId,
      parsed.data,
    );
  }

  @Get()
  @ApiOperation({ summary: "List workflow steps" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({ status: 200, description: "Workflow steps" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Workflow not found" })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
  ) {
    return this.workflowStepService.findAll(
      request.user.id,
      workspaceId,
      workflowId,
    );
  }

  @Patch("reorder")
  @ApiOperation({ summary: "Reorder workflow steps" })
  @ApiBody({
    required: true,
    schema: {
      type: "object",
      required: ["stepIds"],
      additionalProperties: false,
      properties: {
        stepIds: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: {
            type: "string",
            format: "uuid",
          },
          example: [
            "11111111-1111-4111-8111-111111111111",
            "22222222-2222-4222-8222-222222222222",
          ],
        },
      },
    },
  })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiResponse({ status: 200, description: "Steps reordered" })
  @ApiResponse({ status: 400, description: "Invalid step order" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Workflow not found" })
  async reorder(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Body() body: unknown,
  ) {
    const parsed = ReorderWorkflowStepsRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.workflowStepService.reorder(
      request.user.id,
      workspaceId,
      workflowId,
      parsed.data,
    );
  }

  @Get(":stepId")
  @ApiOperation({ summary: "Get a workflow step" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiParam({ name: "stepId", type: String })
  @ApiResponse({ status: 200, description: "Workflow step" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Step not found" })
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Param("stepId") stepId: string,
  ) {
    return this.workflowStepService.findOne(
      request.user.id,
      workspaceId,
      workflowId,
      stepId,
    );
  }

  @Patch(":stepId")
  @ApiOperation({ summary: "Update a workflow step" })
  @ApiBody({
    required: true,
    schema: {
      type: "object",
      minProperties: 1,
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          example: "Updated Step",
        },
        config: {
          type: "object",
          additionalProperties: true,
          example: {
            enabled: true,
          },
        },
      },
    },
  })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiParam({ name: "stepId", type: String })
  @ApiResponse({ status: 200, description: "Step updated" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Step not found" })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Param("stepId") stepId: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateWorkflowStepRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.workflowStepService.update(
      request.user.id,
      workspaceId,
      workflowId,
      stepId,
      parsed.data,
    );
  }

  @Delete(":stepId")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a workflow step" })
  @ApiParam({ name: "workspaceId", type: String })
  @ApiParam({ name: "workflowId", type: String })
  @ApiParam({ name: "stepId", type: String })
  @ApiResponse({ status: 204, description: "Step deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Step not found" })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Param("workflowId") workflowId: string,
    @Param("stepId") stepId: string,
  ): Promise<void> {
    await this.workflowStepService.remove(
      request.user.id,
      workspaceId,
      workflowId,
      stepId,
    );
  }
}
