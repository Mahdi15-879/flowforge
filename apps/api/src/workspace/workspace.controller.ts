import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  Patch,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import {
  CreateWorkspaceRequestSchema,
  UpdateWorkspaceRequestSchema,
} from "@flowforge/contracts";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WorkspaceService } from "./workspace.service";

@ApiTags("Workspaces")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // POST /api/v1/workspaces
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new workspace",
  })
  @ApiResponse({
    status: 201,
    description: "Workspace created",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @ApiResponse({
    status: 409,
    description: "Workspace slug already exists",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "slug"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          example: "Mahdi Development",
        },
        slug: {
          type: "string",
          minLength: 3,
          maxLength: 63,
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          example: "mahdi-development",
        },
      },
    },
  })
  async create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = CreateWorkspaceRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid workspace data",
        errors: parsed.error.flatten(),
      });
    }

    return this.workspaceService.create(request.user.id, parsed.data);
  }

  // GET /api/v1/workspaces
  @Get()
  @ApiOperation({
    summary: "List workspaces of the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "List of workspaces with membership roles",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async findMine(@Req() request: AuthenticatedRequest) {
    return this.workspaceService.findMine(request.user.id);
  }

  // GET /api/v1/workspaces/:workspaceId
  @Get(":workspaceId")
  @ApiOperation({
    summary: "Get a workspace by ID",
  })
  @ApiResponse({
    status: 200,
    description: "Workspace details",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  @ApiResponse({
    status: 404,
    description: "Workspace not found or access denied",
  })
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.workspaceService.findOne(request.user.id, workspaceId);
  }

  // PATCH /api/v1/workspaces/:workspaceId
  @Patch(":workspaceId")
  @ApiOperation({
    summary: "Update workspace name (OWNER or ADMIN)",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          minLength: 2,
          maxLength: 100,
          example: "Mahdi Development Updated",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Workspace updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid workspace data",
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
    description: "Workspace not found or access denied",
  })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateWorkspaceRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid workspace update data",
        errors: parsed.error.flatten(),
      });
    }

    return this.workspaceService.update(
      request.user.id,
      workspaceId,
      parsed.data,
    );
  }
}
